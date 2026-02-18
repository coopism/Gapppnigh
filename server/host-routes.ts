import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { decryptPIIOrNull } from "./crypto-utils";
import { csrfMiddleware, generateCsrfToken, setCsrfCookie, CSRF_COOKIE } from "./user-auth";
import { db } from "./db";
import { isValidUUID, validateUUIDParam } from "./validation";
import { authRateLimit, bookingRateLimit, uploadRateLimit } from "./rate-limit";
import { 
  airbnbHosts, hostSessions, properties, propertyPhotos, 
  propertyAvailability, propertyBookings, propertyQA, propertyReviews,
  users, userIdVerifications, gapNightRules, icalConnections,
  conversations, messages
} from "@shared/schema";
import { eq, and, desc, gte, lte, count, sql, asc, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

router.use(csrfMiddleware);

// XSS sanitization helper - prevents script injection
function sanitizeInput(input: string | undefined | null): string | null {
  if (!input) return null;
  // Remove script tags and event handlers
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

// Photo upload config
const uploadsDir = path.join(process.cwd(), "uploads", "properties");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".tiff", ".tif", ".bmp", ".heic", ".heif"];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/tiff", "image/bmp", "image/heic", "image/heif"];
    if (allowed.includes(ext) || allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPG, PNG, WebP, AVIF, GIF, TIFF, HEIC)"));
    }
  },
});
const HOST_SESSION_COOKIE = "host_session";
const SESSION_DURATION_HOURS = 48;

// ========================================
// HOST AUTH MIDDLEWARE
// ========================================

interface HostRequest extends Request {
  hostId?: string;
  hostData?: any;
}

// Host auth middleware with email verification check (Fix #18)
async function requireHostAuth(req: HostRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[HOST_SESSION_COOKIE];
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const [session] = await db
      .select()
      .from(hostSessions)
      .where(eq(hostSessions.id, sessionId))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const [host] = await db
      .select()
      .from(airbnbHosts)
      .where(eq(airbnbHosts.id, session.hostId))
      .limit(1);

    if (!host || !host.isActive) {
      return res.status(401).json({ error: "Account disabled" });
    }

    req.hostId = host.id;
    req.hostData = host;
    next();
  } catch (error) {
    console.error("Host auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

// Middleware to require email verification for sensitive operations
async function requireVerifiedHost(req: HostRequest, res: Response, next: NextFunction) {
  const host = req.hostData;
  if (!host) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  // Check if email is verified (Fix #18)
  if (!host.emailVerified) {
    return res.status(403).json({ 
      error: "Email verification required",
      message: "Please verify your email address before performing this operation"
    });
  }
  
  next();
}

// ========================================
// HOST AUTHENTICATION
// ========================================

const AUS_PHONE_REGEX = /^(04\d{2}\s?\d{3}\s?\d{3}|\+614\d{8})$/;

const hostSignupSchema = z.object({
  email: z.string().email().transform(e => e.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().refine(v => !v || AUS_PHONE_REGEX.test(v.replace(/\s/g, "")), {
    message: "Phone must be a valid Australian mobile number (04XX XXX XXX)",
  }),
});

const hostLoginSchema = z.object({
  email: z.string().email().transform(e => e.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

// Register with rate limiting
router.post("/api/host/register", authRateLimit, async (req: Request, res: Response) => {
  try {
    const parsed = hostSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { email, password, name, phone } = parsed.data;

    const [existing] = await db
      .select()
      .from(airbnbHosts)
      .where(eq(airbnbHosts.email, email))
      .limit(1);

    if (existing) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, existing.passwordHash || "");
      return res.status(409).json({ error: "Host already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const hostId = uuidv4();

    const [host] = await db
      .insert(airbnbHosts)
      .values({
        id: hostId,
        email,
        passwordHash,
        name,
        phone: phone || null,
      })
      .returning();

    // Send verification email
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
      const { sendVerificationEmail } = await import("./user-email");
      await sendVerificationEmail(host.email, otpCode, host.name);
      // Invalidate old tokens then store hashed OTP
      await db.execute(
        sql`UPDATE email_tokens SET used_at = NOW() WHERE user_id = ${'host:' + host.id} AND type = ${'host_verify_email'} AND used_at IS NULL`
      );
      await db.execute(
        sql`INSERT INTO email_tokens (id, user_id, token_hash, type, expires_at, created_at)
            VALUES (${uuidv4()}, ${'host:' + host.id}, ${otpHash}, ${'host_verify_email'}, ${new Date(Date.now() + 24 * 60 * 60 * 1000)}, NOW())`
      );
    } catch (emailErr) {
      console.error("Host verification email failed:", emailErr);
    }

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await db.insert(hostSessions).values({
      id: sessionId,
      hostId: host.id,
      expiresAt,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });

    res.cookie(HOST_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_DURATION_HOURS * 60 * 60 * 1000,
      path: "/",
    });

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json({
      host: {
        id: host.id,
        email: host.email,
        name: host.name,
        emailVerified: false,
        requiresEmailVerification: true,
      },
      csrfToken,
    });
  } catch (error: any) {
    console.error("Host register error:", error?.message || error);
    console.error("Host register stack:", error?.stack);
    console.error("Host register detail:", JSON.stringify({ code: error?.code, detail: error?.detail, constraint: error?.constraint }));
    res.status(500).json({ error: "Registration failed", detail: error?.message });
  }
});

// Host email verification endpoint
router.post("/api/host/verify-email", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Verification code required" });

    const codeHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');
    const result = await db.execute(
      sql`SELECT * FROM email_tokens WHERE user_id = ${'host:' + req.hostId} AND token_hash = ${codeHash} AND type = ${'host_verify_email'} AND used_at IS NULL AND expires_at > NOW() LIMIT 1`
    );
    const rows = (result as any).rows || [];
    if (!rows.length) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    await db.update(airbnbHosts)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(airbnbHosts.id, req.hostId!));

    await db.execute(
      sql`UPDATE email_tokens SET used_at = NOW() WHERE user_id = ${'host:' + req.hostId} AND type = ${'host_verify_email'} AND used_at IS NULL`
    );

    res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Host email verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Resend host verification email
router.post("/api/host/resend-verification", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const [host] = await db.select().from(airbnbHosts).where(eq(airbnbHosts.id, req.hostId!)).limit(1);
    if (!host) return res.status(404).json({ error: "Host not found" });
    if (host.emailVerifiedAt) return res.status(400).json({ error: "Email already verified" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const { sendVerificationEmail } = await import("./user-email");
    await sendVerificationEmail(host.email, otpCode, host.name);
    await db.execute(
      sql`UPDATE email_tokens SET used_at = NOW() WHERE user_id = ${'host:' + host.id} AND type = ${'host_verify_email'} AND used_at IS NULL`
    );
    await db.execute(
      sql`INSERT INTO email_tokens (id, user_id, token_hash, type, expires_at, created_at)
          VALUES (${uuidv4()}, ${'host:' + host.id}, ${otpHash}, ${'host_verify_email'}, ${new Date(Date.now() + 24 * 60 * 60 * 1000)}, NOW())`
    );

    res.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Resend host verification error:", error);
    res.status(500).json({ error: "Failed to resend" });
  }
});

// Login with rate limiting
router.post("/api/host/login", authRateLimit, async (req: Request, res: Response) => {
  try {
    const parsed = hostLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { email, password } = parsed.data;

    const [host] = await db
      .select()
      .from(airbnbHosts)
      .where(eq(airbnbHosts.email, email))
      .limit(1);

    if (!host) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!host.isActive) {
      return res.status(403).json({ error: "Account has been suspended" });
    }

    // Always perform bcrypt comparison to prevent timing attacks
    const validPassword = await bcrypt.compare(password, host.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await db.insert(hostSessions).values({
      id: sessionId,
      hostId: host.id,
      expiresAt,
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });

    res.cookie(HOST_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_DURATION_HOURS * 60 * 60 * 1000,
      path: "/",
    });

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json({
      host: {
        id: host.id,
        email: host.email,
        name: host.name,
        phone: host.phone,
        bio: host.bio,
        profilePhoto: host.profilePhoto,
        averageResponseTime: host.averageResponseTime,
        responseRate: host.responseRate,
      },
      csrfToken,
    });
  } catch (error) {
    console.error("Host login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout
router.post("/api/host/logout", async (req: Request, res: Response) => {
  const sessionId = req.cookies?.[HOST_SESSION_COOKIE];
  if (sessionId) {
    await db.delete(hostSessions).where(eq(hostSessions.id, sessionId)).catch(() => {});
  }
  res.clearCookie(HOST_SESSION_COOKIE, { path: "/" });
  res.json({ message: "Logged out" });
});

// Get current host session
router.get("/api/host/me", requireHostAuth, async (req: HostRequest, res: Response) => {
  const host = req.hostData;
  res.json({
    host: {
      id: host.id,
      email: host.email,
      name: host.name,
      phone: host.phone,
      bio: host.bio,
      profilePhoto: host.profilePhoto,
      averageResponseTime: host.averageResponseTime,
      responseRate: host.responseRate,
      idVerified: host.idVerified || false,
      idVerifiedAt: host.idVerifiedAt,
      createdAt: host.createdAt,
    },
  });
});

// Update host profile
router.put("/api/host/profile", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const { name, phone, bio, profilePhoto } = req.body;
    
    const [updated] = await db
      .update(airbnbHosts)
      .set({
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(profilePhoto !== undefined && { profilePhoto }),
        updatedAt: new Date(),
      })
      .where(eq(airbnbHosts.id, req.hostId!))
      .returning();

    res.json({ host: updated });
  } catch (error) {
    console.error("Update host profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ========================================
// HOST ID VERIFICATION (Stripe Identity)
// ========================================

router.post("/api/host/verify-identity", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const hostId = req.hostId!;
    const host = req.hostData!;

    if (host.idVerified) {
      return res.json({ status: "verified", message: "ID already verified" });
    }

    const { stripe } = await import("./stripe");
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const returnUrl = req.body?.returnUrl || req.headers.referer || "https://www.gapnight.com/host/dashboard";

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { hostId, type: "host" },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: returnUrl,
    });

    await db.update(airbnbHosts).set({
      stripeVerificationSessionId: verificationSession.id,
      updatedAt: new Date(),
    }).where(eq(airbnbHosts.id, hostId));

    res.json({
      url: verificationSession.url,
      sessionId: verificationSession.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Host verify-identity error:", error);
    res.status(500).json({ error: "Failed to create verification session" });
  }
});

router.get("/api/host/verify-identity/status", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const host = req.hostData!;

    if (host.idVerified) {
      return res.json({ status: "verified", verifiedAt: host.idVerifiedAt });
    }

    if (!host.stripeVerificationSessionId) {
      return res.json({ status: "unverified" });
    }

    const { stripe } = await import("./stripe");
    if (!stripe) {
      return res.json({ status: "pending" });
    }

    const session = await stripe.identity.verificationSessions.retrieve(host.stripeVerificationSessionId);

    if (session.status === "verified") {
      await db.update(airbnbHosts).set({
        idVerified: true,
        idVerifiedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(airbnbHosts.id, host.id));

      return res.json({ status: "verified", verifiedAt: new Date() });
    } else if (session.status === "requires_input" || session.last_error) {
      return res.json({ status: "failed", reason: session.last_error?.reason || "Verification failed" });
    }

    return res.json({ status: "pending" });
  } catch (error) {
    console.error("Host verify-identity status error:", error);
    res.status(500).json({ error: "Failed to check verification status" });
  }
});

// ========================================
// HOST ONBOARDING (New host first-property wizard)
// ========================================

// Upload photos during onboarding (reuses same storage)
router.post("/api/host/onboarding/photos", requireHostAuth, uploadRateLimit, photoUpload.array("photos", 10), async (req: HostRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      return res.status(400).json({ error: "No photos uploaded" });
    }
    const urls = files.map(f => `/uploads/properties/${f.filename}`);
    res.json({ urls });
  } catch (error) {
    console.error("Onboarding photo upload error:", error);
    res.status(500).json({ error: "Failed to upload photos" });
  }
});

// Publish property from onboarding wizard
router.post("/api/host/onboarding/publish", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const hostId = req.hostId!;
    const {
      propertyType, category, title, description, photos,
      address, city, state, postcode,
      maxGuests, bedrooms, beds, bathrooms, amenities,
      weekdayPrice, weekendPrice, holidayPrice, cleaningFee,
      instantBook, gapDiscounts,
      icalUrl, autoList,
    } = req.body;

    // Validate required fields
    if (!title?.trim() || !description?.trim() || !address?.trim() || !city?.trim()) {
      return res.status(400).json({ error: "Missing required fields (title, description, address, city)" });
    }
    if (!weekdayPrice || weekdayPrice < 100) {
      return res.status(400).json({ error: "Weekday price must be at least $1" });
    }

    const propertyId = uuidv4();

    // Create the property
    const [property] = await db.insert(properties).values({
      id: propertyId,
      hostId,
      title: sanitizeInput(title) || title,
      description: sanitizeInput(description) || description,
      propertyType: propertyType || "entire_place",
      category: category || "apartment",
      address: sanitizeInput(address) || address,
      city: sanitizeInput(city) || city,
      state: sanitizeInput(state) || null,
      country: "Australia",
      postcode: postcode || null,
      maxGuests: maxGuests || 2,
      bedrooms: bedrooms || 1,
      beds: beds || 1,
      bathrooms: String(bathrooms || "1"),
      amenities: amenities || [],
      baseNightlyRate: weekdayPrice, // weekday as base rate (in cents)
      cleaningFee: cleaningFee || 0,
      instantBook: instantBook || false,
      coverImage: photos?.[0] || null,
      images: photos || [],
      status: "pending_approval",
    }).returning();

    // Insert property photos
    if (photos?.length) {
      for (let i = 0; i < photos.length; i++) {
        await db.insert(propertyPhotos).values({
          id: uuidv4(),
          propertyId,
          url: photos[i],
          sortOrder: i,
          isCover: i === 0,
        });
      }
    }

    // Create gap night rules with tiered discounts
    const gd = gapDiscounts || { gap3: 35, gap7: 30, gap31: 25, gapOver31: 20 };
    await db.insert(gapNightRules).values({
      id: uuidv4(),
      hostId,
      propertyId,
      baseNightlyRate: weekdayPrice,
      gapNightDiscount: gd.gap31 || 25, // default discount stored
      weekdayMultiplier: "1.0",
      weekendMultiplier: weekendPrice && weekdayPrice ? String((weekendPrice / weekdayPrice).toFixed(2)) : "1.0",
      manualApproval: !instantBook,
      autoPublish: false,
    });

    // Connect Airbnb iCal if provided
    if (icalUrl?.trim()) {
      await db.insert(icalConnections).values({
        id: uuidv4(),
        hostId,
        propertyId,
        icalUrl: icalUrl.trim(),
        label: "Airbnb",
        status: "pending",
      });
    }

    // Set auto-publish on gap night rules if requested
    if (autoList) {
      await db.update(gapNightRules)
        .set({ autoPublish: true })
        .where(and(eq(gapNightRules.hostId, hostId), eq(gapNightRules.propertyId, propertyId)));
    }

    res.json({
      property,
      message: "Property listed and submitted for review!",
      propertyId,
    });
  } catch (error) {
    console.error("Onboarding publish error:", error);
    res.status(500).json({ error: "Failed to publish property" });
  }
});

// ========================================
// PROPERTY MANAGEMENT
// ========================================

// Get all host properties
router.get("/api/host/properties", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const hostProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.hostId, req.hostId!))
      .orderBy(desc(properties.createdAt));

    // Fetch gap night rules for all properties
    const rules = await db
      .select()
      .from(gapNightRules)
      .where(eq(gapNightRules.hostId, req.hostId!));

    const rulesMap = new Map(rules.map(r => [r.propertyId, r]));

    const enriched = hostProperties.map(p => ({
      ...p,
      gapNightRule: rulesMap.get(p.id) || null,
    }));

    res.json({ properties: enriched });
  } catch (error) {
    console.error("Get properties error:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Get single property
router.get("/api/host/properties/:propertyId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = validateUUIDParam(req.params.propertyId as string, res);
    if (!propertyId) return;

    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Get photos
    const photos = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId))
      .orderBy(asc(propertyPhotos.sortOrder));

    // Get availability
    const avail = await db
      .select()
      .from(propertyAvailability)
      .where(and(
        eq(propertyAvailability.propertyId, propertyId),
        gte(propertyAvailability.date, new Date().toISOString().split("T")[0])
      ))
      .orderBy(asc(propertyAvailability.date));

    // Get Q&A
    const qa = await db
      .select()
      .from(propertyQA)
      .where(eq(propertyQA.propertyId, propertyId))
      .orderBy(desc(propertyQA.createdAt));

    // Get reviews
    const reviews = await db
      .select()
      .from(propertyReviews)
      .where(eq(propertyReviews.propertyId, propertyId))
      .orderBy(desc(propertyReviews.createdAt));

    res.json({ property, photos, availability: avail, qa, reviews });
  } catch (error) {
    console.error("Get property error:", error);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

// Create property with XSS-sanitized inputs and email verification check
router.post("/api/host/properties", requireHostAuth, requireVerifiedHost, async (req: HostRequest, res: Response) => {
  try {
    const {
      title, description, propertyType, category, address, city, state, country, postcode,
      latitude, longitude, maxGuests, bedrooms, beds, bathrooms, amenities,
      houseRules, checkInInstructions, checkInTime, checkOutTime,
      cancellationPolicy, baseNightlyRate, cleaningFee, minNights, maxNights,
      instantBook, selfCheckIn, petFriendly, smokingAllowed, nearbyHighlight,
      images, coverImage,
    } = req.body;

    // Validate required fields
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedAddress = sanitizeInput(address);
    const sanitizedCity = sanitizeInput(city);

    if (!sanitizedTitle || !sanitizedDescription || !sanitizedAddress || !sanitizedCity || !baseNightlyRate) {
      return res.status(400).json({ error: "Missing required fields: title, description, address, city, baseNightlyRate" });
    }

    // Validate field lengths to prevent abuse
    if (sanitizedTitle.length > 200) {
      return res.status(400).json({ error: "Title must be less than 200 characters" });
    }
    if (sanitizedDescription.length > 5000) {
      return res.status(400).json({ error: "Description must be less than 5000 characters" });
    }
    if (sanitizedAddress.length > 500) {
      return res.status(400).json({ error: "Address must be less than 500 characters" });
    }

    const propertyId = uuidv4();

    const [property] = await db
      .insert(properties)
      .values({
        id: propertyId,
        hostId: req.hostId!,
        title: sanitizedTitle,
        description: sanitizedDescription,
        propertyType: propertyType || "entire_place",
        category: category || "apartment",
        address: sanitizedAddress,
        city: sanitizedCity,
        state: sanitizeInput(state),
        country: sanitizeInput(country) || "Australia",
        postcode: sanitizeInput(postcode),
        latitude: latitude || null,
        longitude: longitude || null,
        maxGuests: Math.min(Math.max(maxGuests || 2, 1), 100),
        bedrooms: Math.min(Math.max(bedrooms || 1, 0), 50),
        beds: Math.min(Math.max(beds || 1, 1), 100),
        bathrooms: bathrooms || "1",
        amenities: Array.isArray(amenities) ? amenities.slice(0, 50) : [],
        houseRules: sanitizeInput(houseRules),
        checkInInstructions: sanitizeInput(checkInInstructions),
        checkInTime: checkInTime || "15:00",
        checkOutTime: checkOutTime || "10:00",
        cancellationPolicy: cancellationPolicy || "moderate",
        baseNightlyRate: Math.max(baseNightlyRate, 100), // Minimum $1/night (in cents)
        cleaningFee: Math.max(cleaningFee || 0, 0),
        serviceFee: 0,
        minNights: Math.min(Math.max(minNights || 1, 1), 365),
        maxNights: maxNights ? Math.min(Math.max(maxNights, 1), 365) : 30,
        instantBook: instantBook || false,
        selfCheckIn: selfCheckIn || false,
        petFriendly: petFriendly || false,
        smokingAllowed: smokingAllowed || false,
        nearbyHighlight: sanitizeInput(nearbyHighlight),
        images: Array.isArray(images) ? images.slice(0, 50) : [],
        coverImage: sanitizeInput(coverImage),
        status: "pending_approval",
      })
      .returning();

    // Send notification email to admin
    try {
      const { sendPropertyApprovalEmail } = await import("./email");
      await sendPropertyApprovalEmail(property, req.hostData);
    } catch (emailError) {
      console.error("Failed to send property approval email:", emailError);
    }

    res.json({ property, message: "Property submitted for approval. You'll be notified once it's reviewed." });
  } catch (error) {
    console.error("Create property error:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

// Update property with XSS-sanitized inputs
router.put("/api/host/properties/:propertyId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = validateUUIDParam(req.params.propertyId as string, res);
    if (!propertyId) return;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Fields that need XSS sanitization
    const textFields = [
      "title", "description", "address", "city", "state", "country", 
      "postcode", "houseRules", "checkInInstructions", "nearbyHighlight"
    ];
    
    const allowedFields: Record<string, any> = {};
    const updateableFields = [
      "title", "description", "propertyType", "category", "address", "city", 
      "state", "country", "postcode", "latitude", "longitude", "maxGuests",
      "bedrooms", "beds", "bathrooms", "amenities", "houseRules", 
      "checkInInstructions", "checkInTime", "checkOutTime", "cancellationPolicy",
      "baseNightlyRate", "cleaningFee", "minNights", "maxNights", "instantBook",
      "selfCheckIn", "petFriendly", "smokingAllowed", "nearbyHighlight",
      "images", "coverImage",
    ];

    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        // Fix #43: XSS sanitize text fields
        if (textFields.includes(field) && typeof req.body[field] === "string") {
          allowedFields[field] = sanitizeInput(req.body[field]);
        } else {
          allowedFields[field] = req.body[field];
        }
      }
    }

    // Validate field lengths
    if (allowedFields.title && allowedFields.title.length > 200) {
      return res.status(400).json({ error: "Title must be less than 200 characters" });
    }
    if (allowedFields.description && allowedFields.description.length > 5000) {
      return res.status(400).json({ error: "Description must be less than 5000 characters" });
    }

    allowedFields.updatedAt = new Date();

    const [updated] = await db
      .update(properties)
      .set(allowedFields)
      .where(eq(properties.id, propertyId))
      .returning();

    // Also update gap night rules if provided
    if (req.body.gapNightRule) {
      const gnr = req.body.gapNightRule;
      const gnrFields: Record<string, any> = {};
      const gnrAllowed = ["checkInTime", "checkOutTime", "minNotice", "prepBuffer", "gapNightDiscount", "weekdayMultiplier", "weekendMultiplier", "manualApproval", "autoPublish"];
      for (const f of gnrAllowed) {
        if (gnr[f] !== undefined) gnrFields[f] = gnr[f];
      }
      if (Object.keys(gnrFields).length > 0) {
        gnrFields.updatedAt = new Date();
        const [existingRule] = await db.select().from(gapNightRules)
          .where(and(eq(gapNightRules.hostId, req.hostId!), eq(gapNightRules.propertyId, propertyId)))
          .limit(1);
        if (existingRule) {
          await db.update(gapNightRules).set(gnrFields)
            .where(eq(gapNightRules.id, existingRule.id));
        } else {
          await db.insert(gapNightRules).values({
            id: uuidv4(),
            hostId: req.hostId!,
            propertyId,
            ...gnrFields,
          });
        }
      }
    }

    res.json({ property: updated });
  } catch (error) {
    console.error("Update property error:", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

// Delete (archive) property with orphaned photos cleanup
router.delete("/api/host/properties/:propertyId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = validateUUIDParam(req.params.propertyId as string, res);
    if (!propertyId) return;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Fix #27: Cleanup orphaned photos before archiving property
    const photosToDelete = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId));

    for (const photo of photosToDelete) {
      if (photo.url && photo.url.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), photo.url);
        const uploadsDir = path.join(process.cwd(), "uploads");
        const resolvedPath = path.resolve(filePath);
        const resolvedUploadsDir = path.resolve(uploadsDir);
        
        if (resolvedPath.startsWith(resolvedUploadsDir) && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete photo file ${filePath}:`, err);
          }
        }
      }
    }

    // Delete photo records from database
    await db.delete(propertyPhotos).where(eq(propertyPhotos.propertyId, propertyId));

    await db
      .update(properties)
      .set({ status: "archived", isActive: false, updatedAt: new Date() })
      .where(eq(properties.id, propertyId));

    res.json({ message: "Property archived and photos cleaned up" });
  } catch (error) {
    console.error("Delete property error:", error);
    res.status(500).json({ error: "Failed to archive property" });
  }
});

// ========================================
// PROPERTY PHOTOS (JSON-based route removed - multer file upload route below handles this)
// ========================================

// ========================================
// AVAILABILITY MANAGEMENT
// ========================================

// Get availability for a property
router.get("/api/host/properties/:propertyId/availability", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const { startDate, endDate } = req.query;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    const conditions = [eq(propertyAvailability.propertyId, propertyId)];
    if (startDate) {
      conditions.push(gte(propertyAvailability.date, startDate as string));
    }
    if (endDate) {
      conditions.push(lte(propertyAvailability.date, endDate as string));
    }

    const avail = await db
      .select()
      .from(propertyAvailability)
      .where(and(...conditions))
      .orderBy(asc(propertyAvailability.date));
    res.json({ availability: avail });
  } catch (error) {
    console.error("Get availability error:", error);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// Set availability (bulk upsert) with date validation
router.post("/api/host/properties/:propertyId/availability", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = validateUUIDParam(req.params.propertyId as string, res);
    if (!propertyId) return;
    
    const { dates } = req.body; // Array of { date, isAvailable, isGapNight, nightlyRate, gapNightDiscount, notes }

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Dates array is required" });
    }

    // Fix #25: Validate date format and range
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const entry of dates) {
      if (!entry.date || !dateRegex.test(entry.date)) {
        return res.status(400).json({ error: `Invalid date format: ${entry.date}. Expected YYYY-MM-DD` });
      }
      
      const entryDate = new Date(entry.date);
      if (isNaN(entryDate.getTime())) {
        return res.status(400).json({ error: `Invalid date: ${entry.date}` });
      }
      
      // Optional: Prevent setting availability for past dates
      if (entryDate < today) {
        return res.status(400).json({ error: `Cannot set availability for past date: ${entry.date}` });
      }
    }

    const results = [];

    for (const entry of dates) {
      const { date, isAvailable, isGapNight, nightlyRate, gapNightDiscount, notes } = entry;

      if (!date) continue;

      // Check if availability exists for this date
      const [existingAvail] = await db
        .select()
        .from(propertyAvailability)
        .where(and(
          eq(propertyAvailability.propertyId, propertyId),
          eq(propertyAvailability.date, date)
        ))
        .limit(1);

      if (existingAvail) {
        // Update
        const [updated] = await db
          .update(propertyAvailability)
          .set({
            isAvailable: isAvailable !== undefined ? isAvailable : existingAvail.isAvailable,
            isGapNight: isGapNight !== undefined ? isGapNight : existingAvail.isGapNight,
            nightlyRate: nightlyRate !== undefined ? nightlyRate : existingAvail.nightlyRate,
            gapNightDiscount: gapNightDiscount !== undefined ? gapNightDiscount : existingAvail.gapNightDiscount,
            notes: notes !== undefined ? notes : existingAvail.notes,
            updatedAt: new Date(),
          })
          .where(eq(propertyAvailability.id, existingAvail.id))
          .returning();
        results.push(updated);
      } else {
        // Insert
        const [created] = await db
          .insert(propertyAvailability)
          .values({
            id: uuidv4(),
            propertyId,
            date,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            isGapNight: isGapNight || false,
            nightlyRate: nightlyRate || existing.baseNightlyRate,
            gapNightDiscount: gapNightDiscount || 0,
            notes: notes || null,
          })
          .returning();
        results.push(created);
      }
    }

    res.json({ availability: results, message: `${results.length} dates updated` });
  } catch (error) {
    console.error("Set availability error:", error);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// Delete availability entry
router.delete("/api/host/properties/:propertyId/availability/:availId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const availId = req.params.availId as string;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    await db.delete(propertyAvailability).where(and(
      eq(propertyAvailability.id, availId),
      eq(propertyAvailability.propertyId, propertyId)
    ));

    res.json({ message: "Availability entry deleted" });
  } catch (error) {
    console.error("Delete availability error:", error);
    res.status(500).json({ error: "Failed to delete availability" });
  }
});

// ========================================
// PHOTO UPLOAD
// ========================================

// Upload photos for a property with rate limiting
router.post("/api/host/properties/:propertyId/photos", requireHostAuth, uploadRateLimit, photoUpload.array("photos", 10), async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;

    // Verify property belongs to host
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Get current max sort order
    const existing = await db
      .select({ sortOrder: propertyPhotos.sortOrder })
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId))
      .orderBy(desc(propertyPhotos.sortOrder))
      .limit(1);

    let nextSort = (existing[0]?.sortOrder || 0) + 1;

    const inserted = [];
    for (const file of files) {
      const url = `/uploads/properties/${file.filename}`;
      const isCover = nextSort === 1 && !property.coverImage;

      const [photo] = await db
        .insert(propertyPhotos)
        .values({
          id: uuidv4(),
          propertyId,
          url,
          caption: null,
          isCover,
          sortOrder: nextSort++,
        })
        .returning();

      // Set as cover image if first photo and no cover exists
      if (isCover) {
        await db.update(properties)
          .set({ coverImage: url })
          .where(eq(properties.id, propertyId));
      }

      inserted.push(photo);
    }

    res.json({ photos: inserted, message: `${inserted.length} photo(s) uploaded` });
  } catch (error) {
    console.error("Photo upload error:", error);
    res.status(500).json({ error: "Failed to upload photos" });
  }
});

// Get photos for a property
router.get("/api/host/properties/:propertyId/photos", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;

    // CRITICAL: Verify host owns this property before returning photos
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized to access this property" });
    }

    const photos = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId))
      .orderBy(asc(propertyPhotos.sortOrder));

    res.json({ photos });
  } catch (error) {
    console.error("Get photos error:", error);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

// Delete a photo
router.delete("/api/host/properties/:propertyId/photos/:photoId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const photoId = req.params.photoId as string;

    // Verify property belongs to host
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [photo] = await db
      .select()
      .from(propertyPhotos)
      .where(and(eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, propertyId)))
      .limit(1);

    if (!photo) {
      return res.status(404).json({ error: "Photo not found" });
    }

    // Delete file from disk - prevent path traversal attacks
    if (photo.url && photo.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), photo.url);
      // Verify the resolved path is within the uploads directory
      const uploadsDir = path.join(process.cwd(), "uploads");
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(uploadsDir);
      
      if (resolvedPath.startsWith(resolvedUploadsDir) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.delete(propertyPhotos).where(eq(propertyPhotos.id, photoId));

    // If this was the cover image, update property
    if (property.coverImage === photo.url) {
      const [nextPhoto] = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.propertyId, propertyId))
        .orderBy(asc(propertyPhotos.sortOrder))
        .limit(1);

      await db.update(properties)
        .set({ coverImage: nextPhoto?.url || null })
        .where(eq(properties.id, propertyId));
    }

    res.json({ message: "Photo deleted" });
  } catch (error) {
    console.error("Delete photo error:", error);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

// Set cover photo
router.put("/api/host/properties/:propertyId/photos/:photoId/cover", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const photoId = req.params.photoId as string;

    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) return res.status(403).json({ error: "Not authorized" });

    // Unset all covers
    await db.update(propertyPhotos)
      .set({ isCover: false })
      .where(eq(propertyPhotos.propertyId, propertyId));

    // Set new cover
    const [photo] = await db.update(propertyPhotos)
      .set({ isCover: true })
      .where(and(eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, propertyId)))
      .returning();

    if (photo) {
      await db.update(properties)
        .set({ coverImage: photo.url })
        .where(eq(properties.id, propertyId));
    }

    res.json({ message: "Cover photo updated" });
  } catch (error) {
    console.error("Set cover error:", error);
    res.status(500).json({ error: "Failed to set cover photo" });
  }
});

// ========================================
// BOOKING MANAGEMENT (HOST SIDE)
// ========================================

// Get all bookings for host with pagination
router.get("/api/host/bookings", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const { status, page = "1", limit = "50" } = req.query;

    // Validate and cap pagination params
    const validatedPage = Math.max(parseInt(page as string) || 1, 1);
    const requestedLimit = parseInt(limit as string) || 50;
    const validatedLimit = Math.min(Math.max(requestedLimit, 1), 100);
    const offset = (validatedPage - 1) * validatedLimit;

    let bookingsList;
    let totalCount;

    if (status) {
      bookingsList = await db
        .select()
        .from(propertyBookings)
        .where(and(
          eq(propertyBookings.hostId, req.hostId!),
          eq(propertyBookings.status, status as string)
        ))
        .orderBy(desc(propertyBookings.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      const [countResult] = await db
        .select({ count: count() })
        .from(propertyBookings)
        .where(and(
          eq(propertyBookings.hostId, req.hostId!),
          eq(propertyBookings.status, status as string)
        ));
      totalCount = countResult.count;
    } else {
      bookingsList = await db
        .select()
        .from(propertyBookings)
        .where(eq(propertyBookings.hostId, req.hostId!))
        .orderBy(desc(propertyBookings.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      const [countResult2] = await db
        .select({ count: count() })
        .from(propertyBookings)
        .where(eq(propertyBookings.hostId, req.hostId!));
      totalCount = countResult2.count;
    }

    // Enrich with property names and guest info
    const enriched = await Promise.all(
      bookingsList.map(async (booking) => {
        const [property] = await db
          .select({ title: properties.title, coverImage: properties.coverImage })
          .from(properties)
          .where(eq(properties.id, booking.propertyId))
          .limit(1);

        const [user] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, booking.userId))
          .limit(1);

        // Check guest ID verification status
        const [verification] = await db
          .select()
          .from(userIdVerifications)
          .where(eq(userIdVerifications.userId, booking.userId))
          .limit(1);

        return {
          ...booking,
          guestEmail: decryptPIIOrNull(booking.guestEmail) ?? booking.guestEmail,
          guestPhone: decryptPIIOrNull(booking.guestPhone) ?? booking.guestPhone,
          propertyTitle: property?.title || "Unknown",
          propertyCoverImage: property?.coverImage || null,
          guestName: user?.name || `${booking.guestFirstName} ${booking.guestLastName}`,
          guestAccountEmail: user?.email || (decryptPIIOrNull(booking.guestEmail) ?? booking.guestEmail),
          idVerified: verification?.status === "verified",
        };
      })
    );

    res.json({
      bookings: enriched,
      total: totalCount,
      page: validatedPage,
      limit: validatedLimit,
      totalPages: Math.ceil(totalCount / validatedLimit),
    });
  } catch (error) {
    console.error("Get host bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get single booking detail
router.get("/api/host/bookings/:bookingId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;

    const [booking] = await db
      .select()
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.id, bookingId),
        eq(propertyBookings.hostId, req.hostId!)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, booking.userId))
      .limit(1);

    const [verification] = await db
      .select()
      .from(userIdVerifications)
      .where(eq(userIdVerifications.userId, booking.userId))
      .limit(1);

    // Get user's past bookings count for trust score
    const [pastBookings] = await db
      .select({ count: count() })
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.userId, booking.userId),
        eq(propertyBookings.status, "COMPLETED")
      ));

    res.json({
      booking: {
        ...booking,
        guestEmail: decryptPIIOrNull(booking.guestEmail) ?? booking.guestEmail,
        guestPhone: decryptPIIOrNull(booking.guestPhone) ?? booking.guestPhone,
      },
      property,
      guest: {
        ...user,
        firstName: booking.guestFirstName,
        lastName: booking.guestLastName,
        email: decryptPIIOrNull(booking.guestEmail) ?? booking.guestEmail,
        phone: decryptPIIOrNull(booking.guestPhone) ?? booking.guestPhone,
        idVerified: verification?.status === "verified",
        pastCompletedBookings: pastBookings?.count || 0,
        memberSince: user?.createdAt,
      },
    });
  } catch (error) {
    console.error("Get booking detail error:", error);
    res.status(500).json({ error: "Failed to fetch booking details" });
  }
});

// Approve booking
router.post("/api/host/bookings/:bookingId/approve", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;

    const [booking] = await db
      .select()
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.id, bookingId),
        eq(propertyBookings.hostId, req.hostId!),
        eq(propertyBookings.status, "PENDING_APPROVAL")
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or already processed" });
    }

    // Payment was already confirmed by the frontend's StripePaymentForm at booking time.
    // Verify the PaymentIntent status with Stripe if available
    if (booking.stripePaymentIntentId) {
      try {
        const { stripe } = await import("./stripe");
        if (stripe) {
          const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
          if (pi.status === "requires_capture") {
            // Legacy manual capture flow - capture it now
            await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
          } else if (pi.status !== "succeeded") {
            await db
              .update(propertyBookings)
              .set({ status: "PAYMENT_FAILED", updatedAt: new Date() })
              .where(eq(propertyBookings.id, bookingId));
            // Send payment failed email to guest
            try {
              const [prop] = await db.select().from(properties).where(eq(properties.id, booking.propertyId)).limit(1);
              const { sendPaymentFailedEmail } = await import("./email");
              await sendPaymentFailedEmail(booking, prop);
            } catch (e) { console.error("Failed to send payment failed email:", e); }
            return res.status(500).json({ error: `Payment not completed. Status: ${pi.status}` });
          }
        }
      } catch (stripeError) {
        console.error("Stripe verification error:", stripeError);
        await db
          .update(propertyBookings)
          .set({ status: "PAYMENT_FAILED", updatedAt: new Date() })
          .where(eq(propertyBookings.id, bookingId));
        // Send payment failed email to guest
        try {
          const [prop] = await db.select().from(properties).where(eq(properties.id, booking.propertyId)).limit(1);
          const { sendPaymentFailedEmail } = await import("./email");
          await sendPaymentFailedEmail(booking, prop);
        } catch (e) { console.error("Failed to send payment failed email:", e); }
        return res.status(500).json({ error: "Payment verification failed. The guest's card may have been declined." });
      }
    }

    const [updated] = await db
      .update(propertyBookings)
      .set({
        status: "CONFIRMED",
        hostDecisionAt: new Date(),
        paymentCapturedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(propertyBookings.id, bookingId))
      .returning();

    // Send confirmation email to guest
    try {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, booking.propertyId))
        .limit(1);

      const { sendPropertyBookingConfirmationEmail } = await import("./email");
      await sendPropertyBookingConfirmationEmail(updated, property, req.hostData);
    } catch (emailError) {
      console.error("Failed to send booking confirmation email:", emailError);
    }

    res.json({ booking: updated, message: "Booking approved and payment captured" });
  } catch (error) {
    console.error("Approve booking error:", error);
    res.status(500).json({ error: "Failed to approve booking" });
  }
});

// Decline booking
router.post("/api/host/bookings/:bookingId/decline", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const { reason } = req.body;

    const [booking] = await db
      .select()
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.id, bookingId),
        eq(propertyBookings.hostId, req.hostId!),
        eq(propertyBookings.status, "PENDING_APPROVAL")
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or already processed" });
    }

    // Cancel the payment hold via Stripe
    if (booking.stripePaymentIntentId) {
      try {
        const { stripe } = await import("./stripe");
        if (stripe) {
          await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);
        }
      } catch (stripeError) {
        console.error("Stripe cancel error:", stripeError);
      }
    }

    const [updated] = await db
      .update(propertyBookings)
      .set({
        status: "DECLINED",
        hostDecisionAt: new Date(),
        hostDeclineReason: reason || "Host declined the booking request",
        updatedAt: new Date(),
      })
      .where(eq(propertyBookings.id, bookingId))
      .returning();

    // Send decline notification email to guest
    try {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, booking.propertyId))
        .limit(1);
      const { sendBookingDeclinedEmail } = await import("./email");
      await sendBookingDeclinedEmail(updated, property, reason);
    } catch (emailError) {
      console.error("Failed to send decline email:", emailError);
    }

    res.json({ booking: updated, message: "Booking declined" });
  } catch (error) {
    console.error("Decline booking error:", error);
    res.status(500).json({ error: "Failed to decline booking" });
  }
});

// ========================================
// HOST CANCELLATION
// ========================================
router.post("/api/host/bookings/:bookingId/cancel", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const { reason } = req.body;

    const [booking] = await db
      .select()
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.id, bookingId),
        eq(propertyBookings.hostId, req.hostId!)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const cancellableStatuses = ["PENDING_APPROVAL", "APPROVED", "CONFIRMED"];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking with status: ${booking.status}` });
    }

    // Cancel/refund Stripe payment
    if (booking.stripePaymentIntentId) {
      try {
        const { stripe } = await import("./stripe");
        if (stripe) {
          const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
          if (pi.status === "requires_capture") {
            await stripe.paymentIntents.cancel(booking.stripePaymentIntentId);
          } else if (pi.status === "succeeded") {
            await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
          }
        }
      } catch (stripeError) {
        console.error("Stripe cancel/refund error:", stripeError);
      }
    }

    const [updated] = await db
      .update(propertyBookings)
      .set({
        status: "CANCELLED_BY_HOST",
        hostDeclineReason: reason || "Host cancelled the booking",
        hostDecisionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(propertyBookings.id, bookingId))
      .returning();

    // Re-open availability dates
    try {
      const checkIn = new Date(booking.checkInDate + "T00:00:00");
      const checkOut = new Date(booking.checkOutDate + "T00:00:00");
      const dates: string[] = [];
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
      if (dates.length > 0) {
        await db.update(propertyAvailability)
          .set({ isAvailable: true })
          .where(and(
            eq(propertyAvailability.propertyId, booking.propertyId),
            inArray(propertyAvailability.date, dates)
          ));
      }
    } catch (availError) {
      console.error("Failed to re-open availability:", availError);
    }

    // Send cancellation email to guest
    try {
      const [property] = await db.select().from(properties).where(eq(properties.id, booking.propertyId)).limit(1);
      const { sendBookingCancelledByHostEmail } = await import("./email");
      await sendBookingCancelledByHostEmail(updated, property, reason);
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
    }

    res.json({ booking: updated, message: "Booking cancelled — guest will receive a full refund" });
  } catch (error) {
    console.error("Host cancel booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ========================================
// HOST-INITIATED MESSAGING FROM BOOKING
// ========================================
router.post("/api/host/bookings/:bookingId/message", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [booking] = await db
      .select()
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.id, bookingId),
        eq(propertyBookings.hostId, req.hostId!)
      ))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!booking.userId) {
      return res.status(400).json({ error: "No guest user linked to this booking" });
    }

    // Check if conversation already exists for this host+guest+property
    let [existing] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.guestId, booking.userId),
        eq(conversations.hostId, req.hostId!),
        eq(conversations.propertyId, booking.propertyId)
      ))
      .limit(1);

    let convoId: string;
    if (existing) {
      convoId = existing.id;
    } else {
      convoId = uuidv4();
      await db.insert(conversations).values({
        id: convoId,
        guestId: booking.userId,
        hostId: req.hostId!,
        propertyId: booking.propertyId,
        bookingId: bookingId,
        subject: `Booking ${bookingId}`,
        lastMessageAt: new Date(),
        guestUnread: 1,
      });
    }

    // Insert the message
    const msgId = uuidv4();
    await db.insert(messages).values({
      id: msgId,
      conversationId: convoId,
      senderId: req.hostId!,
      senderType: "host",
      content: message.trim().slice(0, 2000),
    });

    // Update conversation
    await db.update(conversations).set({
      lastMessageAt: new Date(),
      guestUnread: sql`${conversations.guestUnread} + 1`,
    }).where(eq(conversations.id, convoId));

    res.json({ conversationId: convoId, messageId: msgId, message: "Message sent to guest" });
  } catch (error) {
    console.error("Host message guest error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ========================================
// Q&A MANAGEMENT (HOST SIDE)
// ========================================

// Get unanswered questions
router.get("/api/host/qa", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    // Validate host owns all these properties first (security check)
    const hostProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.hostId, req.hostId!));

    const hostPropertyIds = new Set(hostProperties.map(p => p.id));
    const propertyIdList = Array.from(hostPropertyIds);

    if (propertyIdList.length === 0) {
      return res.json({ questions: [] });
    }

    // Use parameterized inArray instead of raw SQL
    const questions = await db
      .select()
      .from(propertyQA)
      .where(inArray(propertyQA.propertyId, propertyIdList as string[]))
      .orderBy(desc(propertyQA.createdAt));

    // Enrich with property titles and user info
    const enriched = await Promise.all(
      questions.map(async (q) => {
        const [property] = await db
          .select({ title: properties.title })
          .from(properties)
          .where(eq(properties.id, q.propertyId))
          .limit(1);

        let userName = "Host FAQ";
        if (q.userId) {
          const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, q.userId))
            .limit(1);
          userName = user?.name || "Anonymous";
        }

        return {
          ...q,
          propertyTitle: property?.title || "Unknown",
          userName,
        };
      })
    );

    res.json({ questions: enriched });
  } catch (error) {
    console.error("Get Q&A error:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// Publish a host FAQ (host creates a Q&A pair for their listing)
router.post("/api/host/properties/:propertyId/faq", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const { question, answer } = req.body;

    // Sanitize FAQ inputs to prevent XSS
    const sanitizedQuestion = sanitizeInput(question);
    const sanitizedAnswer = sanitizeInput(answer);

    if (!sanitizedQuestion || sanitizedQuestion.trim().length < 5) {
      return res.status(400).json({ error: "Question must be at least 5 characters" });
    }
    if (!sanitizedAnswer || sanitizedAnswer.trim().length < 2) {
      return res.status(400).json({ error: "Answer is required" });
    }

    // Verify property belongs to this host
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [faq] = await db
      .insert(propertyQA)
      .values({
        id: uuidv4(),
        propertyId,
        userId: null,
        question: sanitizedQuestion.trim(),
        answer: sanitizedAnswer.trim(),
        answeredAt: new Date(),
        isPublic: true,
        isHostFaq: true,
      })
      .returning();

    res.json({ faq, message: "FAQ published to listing" });
  } catch (error) {
    console.error("Publish FAQ error:", error);
    res.status(500).json({ error: "Failed to publish FAQ" });
  }
});

// Delete a host FAQ
router.delete("/api/host/qa/:questionId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const questionId = req.params.questionId as string;

    const [question] = await db
      .select()
      .from(propertyQA)
      .where(eq(propertyQA.id, questionId))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: "Not found" });
    }

    // Verify it belongs to host's property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, question.propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.delete(propertyQA).where(eq(propertyQA.id, questionId));
    res.json({ message: "Deleted" });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

// Answer a question
router.post("/api/host/qa/:questionId/answer", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const questionId = req.params.questionId as string;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ error: "Answer is required" });
    }

    // Verify the question belongs to one of host's properties
    const [question] = await db
      .select()
      .from(propertyQA)
      .where(eq(propertyQA.id, questionId))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, question.propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [updated] = await db
      .update(propertyQA)
      .set({ answer: answer.trim(), answeredAt: new Date() })
      .where(eq(propertyQA.id, questionId))
      .returning();

    // Send email notification to the guest who asked the question
    if (question.userId) {
      try {
        const [questioner] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, question.userId))
          .limit(1);
        if (questioner?.email) {
          const { sendQAAnsweredEmail } = await import("./email");
          await sendQAAnsweredEmail(updated, property, questioner.email);
        }
      } catch (emailError) {
        console.error("Failed to send Q&A answered email:", emailError);
      }
    }

    res.json({ question: updated });
  } catch (error) {
    console.error("Answer Q&A error:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

// ========================================
// HOST DASHBOARD STATS
// ========================================

router.get("/api/host/stats", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const [totalProperties] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(eq(properties.hostId, req.hostId!), eq(properties.isActive, true)));

    const [totalBookings] = await db
      .select({ count: count() })
      .from(propertyBookings)
      .where(eq(propertyBookings.hostId, req.hostId!));

    const [pendingBookings] = await db
      .select({ count: count() })
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.hostId, req.hostId!),
        eq(propertyBookings.status, "PENDING_APPROVAL")
      ));

    const [confirmedBookings] = await db
      .select({ count: count() })
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.hostId, req.hostId!),
        eq(propertyBookings.status, "CONFIRMED")
      ));

    const [totalRevenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${propertyBookings.totalPrice}), 0)` })
      .from(propertyBookings)
      .where(and(
        eq(propertyBookings.hostId, req.hostId!),
        or(
          eq(propertyBookings.status, "CONFIRMED"),
          eq(propertyBookings.status, "COMPLETED")
        )
      ));

    const [unansweredQA] = await db
      .select({ count: count() })
      .from(propertyQA)
      .innerJoin(properties, eq(propertyQA.propertyId, properties.id))
      .where(and(
        eq(properties.hostId, req.hostId!),
        sql`${propertyQA.answer} IS NULL`
      ));

    res.json({
      stats: {
        totalProperties: totalProperties.count,
        totalBookings: totalBookings.count,
        pendingBookings: pendingBookings.count,
        confirmedBookings: confirmedBookings.count,
        totalRevenue: Math.floor(Number(totalRevenue.total) / 100),
        unansweredQuestions: unansweredQA.count,
      },
    });
  } catch (error) {
    console.error("Host stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ========================================
// HOST EARNINGS BREAKDOWN
// ========================================

router.get("/api/host/earnings", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    // Monthly revenue for last 12 months
    const monthlyRevenue = await db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as bookings,
        COALESCE(SUM(total_price), 0) as gross_revenue,
        COALESCE(SUM(service_fee), 0) as platform_fees,
        COALESCE(SUM(total_price - service_fee), 0) as net_earnings
      FROM property_bookings
      WHERE host_id = ${req.hostId!}
        AND status IN ('CONFIRMED', 'COMPLETED')
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `);

    // Per-property revenue
    const propertyRevenue = await db.execute(sql`
      SELECT
        p.id, p.title, p.cover_image,
        COUNT(pb.id) as bookings,
        COALESCE(SUM(pb.total_price), 0) as gross_revenue,
        COALESCE(SUM(pb.service_fee), 0) as platform_fees
      FROM properties p
      LEFT JOIN property_bookings pb ON pb.property_id = p.id
        AND pb.status IN ('CONFIRMED', 'COMPLETED')
      WHERE p.host_id = ${req.hostId!} AND p.is_active = true
      GROUP BY p.id, p.title, p.cover_image
      ORDER BY gross_revenue DESC
    `);

    // Totals
    const totalsResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(total_price), 0) as total_gross,
        COALESCE(SUM(service_fee), 0) as total_fees,
        COALESCE(SUM(total_price - service_fee), 0) as total_net,
        COUNT(*) as total_bookings
      FROM property_bookings
      WHERE host_id = ${req.hostId!}
        AND status IN ('CONFIRMED', 'COMPLETED')
    `);
    const totals = (totalsResult.rows || [])[0] as any;

    // This month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(total_price), 0) as gross,
        COALESCE(SUM(service_fee), 0) as fees,
        COUNT(*) as bookings
      FROM property_bookings
      WHERE host_id = ${req.hostId!}
        AND status IN ('CONFIRMED', 'COMPLETED')
        AND TO_CHAR(created_at, 'YYYY-MM') = ${thisMonth}
    `);
    const thisMonthData = (thisMonthResult.rows || [])[0] as any;

    res.json({
      monthly: monthlyRevenue.rows || [],
      byProperty: (propertyRevenue.rows || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        coverImage: r.cover_image,
        bookings: Number(r.bookings),
        grossRevenue: Number(r.gross_revenue) / 100,
        platformFees: Number(r.platform_fees) / 100,
        netEarnings: (Number(r.gross_revenue) - Number(r.platform_fees)) / 100,
      })),
      totals: {
        grossRevenue: Number((totals as any)?.total_gross || 0) / 100,
        platformFees: Number((totals as any)?.total_fees || 0) / 100,
        netEarnings: Number((totals as any)?.total_net || 0) / 100,
        totalBookings: Number((totals as any)?.total_bookings || 0),
      },
      thisMonth: {
        gross: Number((thisMonthData as any)?.gross || 0) / 100,
        fees: Number((thisMonthData as any)?.fees || 0) / 100,
        bookings: Number((thisMonthData as any)?.bookings || 0),
      },
    });
  } catch (error) {
    console.error("Host earnings error:", error);
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

// ========================================
// HOST REVIEWS
// ========================================

router.get("/api/host/reviews", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const hostProperties = await db
      .select({ id: properties.id, title: properties.title })
      .from(properties)
      .where(eq(properties.hostId, req.hostId!));

    if (hostProperties.length === 0) {
      return res.json({ reviews: [] });
    }

    const propIds = hostProperties.map(p => p.id);
    const propMap = new Map(hostProperties.map(p => [p.id, p.title]));

    const reviews = await db
      .select()
      .from(propertyReviews)
      .where(inArray(propertyReviews.propertyId, propIds))
      .orderBy(desc(propertyReviews.createdAt));

    const enriched = await Promise.all(
      reviews.map(async (r) => {
        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, r.userId))
          .limit(1);
        return {
          ...r,
          guestName: user?.name || "Guest",
          propertyTitle: propMap.get(r.propertyId) || "Property",
        };
      })
    );

    res.json({ reviews: enriched });
  } catch (error) {
    console.error("Get host reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// RESPOND TO REVIEWS

router.post("/api/host/reviews/:reviewId/respond", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const reviewId = req.params.reviewId as string;
    const { response } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ error: "Response is required" });
    }

    // Sanitize response to prevent XSS
    const sanitizedResponse = sanitizeInput(response);
    if (!sanitizedResponse) {
      return res.status(400).json({ error: "Invalid response content" });
    }

    const [review] = await db
      .select()
      .from(propertyReviews)
      .where(eq(propertyReviews.id, reviewId))
      .limit(1);

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Verify ownership
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, review.propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [updated] = await db
      .update(propertyReviews)
      .set({ hostResponse: sanitizedResponse.trim(), hostRespondedAt: new Date() })
      .where(eq(propertyReviews.id, reviewId))
      .returning();

    res.json({ review: updated });
  } catch (error) {
    console.error("Respond to review error:", error);
    res.status(500).json({ error: "Failed to respond to review" });
  }
});

// ========================================
// ADDRESS LOOKUP PROXY (Nominatim)
// ========================================

router.get("/api/address-search", async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 3) {
      return res.json([]);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=au&limit=5&q=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "GapNight/1.0 (https://gapnight.com)",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Address search unavailable" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Address search proxy error:", error);
    res.status(500).json({ error: "Address search failed" });
  }
});

// ========================================
// iCAL EXPORT TOKEN + MANUAL SYNC
// ========================================

// GET /api/host/properties/:id/ical-export
// Returns the export URL for the property's .ics feed.
// Auto-generates a token if one doesn't exist yet.
router.get("/api/host/properties/:id/ical-export", requireHostAuth, async (req: HostRequest, res: Response) => {
  const propertyId = req.params.id as string;
  if (!propertyId) return res.status(400).json({ error: "Property ID required" });

  try {
    const [property] = await db
      .select({ id: properties.id, hostId: properties.hostId, icalExportToken: properties.icalExportToken, title: properties.title })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) return res.status(404).json({ error: "Property not found" });

    let token = property.icalExportToken;

    // Auto-generate token if missing
    if (!token) {
      const { randomBytes } = await import("crypto");
      token = randomBytes(32).toString("hex"); // 64-char hex
      await db
        .update(properties)
        .set({ icalExportToken: token, updatedAt: new Date() })
        .where(eq(properties.id, propertyId));
    }

    const baseUrl = process.env.BASE_URL || "https://gapnight.com.au";
    const exportUrl = `${baseUrl}/api/calendar/${propertyId}/${token}/calendar.ics`;

    res.json({ exportUrl, token });
  } catch (err) {
    console.error("iCal export token error:", err);
    res.status(500).json({ error: "Failed to get export URL" });
  }
});

// POST /api/host/properties/:id/ical-export/regenerate
// Regenerates the export token (invalidates the old URL).
router.post("/api/host/properties/:id/ical-export/regenerate", requireHostAuth, async (req: HostRequest, res: Response) => {
  const propertyId = req.params.id as string;
  if (!propertyId) return res.status(400).json({ error: "Property ID required" });

  try {
    const [property] = await db
      .select({ id: properties.id, hostId: properties.hostId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) return res.status(404).json({ error: "Property not found" });

    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");

    await db
      .update(properties)
      .set({ icalExportToken: token, updatedAt: new Date() })
      .where(eq(properties.id, propertyId));

    const baseUrl = process.env.BASE_URL || "https://gapnight.com.au";
    const exportUrl = `${baseUrl}/api/calendar/${propertyId}/${token}/calendar.ics`;

    res.json({ exportUrl, token, message: "Export URL regenerated. Update this link in Airbnb/Stayz." });
  } catch (err) {
    console.error("iCal regenerate token error:", err);
    res.status(500).json({ error: "Failed to regenerate export URL" });
  }
});

// POST /api/host/properties/:id/ical-sync
// Manually triggers an iCal import sync for all connected calendars on this property.
router.post("/api/host/properties/:id/ical-sync", requireHostAuth, async (req: HostRequest, res: Response) => {
  const propertyId = req.params.id as string;
  if (!propertyId) return res.status(400).json({ error: "Property ID required" });

  try {
    // Verify ownership
    const [property] = await db
      .select({ id: properties.id, hostId: properties.hostId })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!property) return res.status(404).json({ error: "Property not found" });

    const { syncPropertyICalConnections } = await import("./ical-sync");
    const summary = await syncPropertyICalConnections(propertyId);

    res.json({
      message: summary.total === 0
        ? "No calendar connections found for this property."
        : `Sync complete: ${summary.succeeded}/${summary.total} calendar(s) synced successfully.`,
      ...summary,
    });
  } catch (err) {
    console.error("iCal manual sync error:", err);
    res.status(500).json({ error: "Failed to sync calendars" });
  }
});

export default router;

