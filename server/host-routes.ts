import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { 
  airbnbHosts, hostSessions, properties, propertyPhotos, 
  propertyAvailability, propertyBookings, propertyQA, propertyReviews,
  users, userIdVerifications
} from "@shared/schema";
import { eq, and, desc, gte, lte, count, sql, asc, or, ilike } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { z } from "zod";

const router = Router();
const HOST_SESSION_COOKIE = "host_session";
const SESSION_DURATION_HOURS = 48;

// ========================================
// HOST AUTH MIDDLEWARE
// ========================================

interface HostRequest extends Request {
  hostId?: string;
  hostData?: any;
}

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

// ========================================
// HOST AUTHENTICATION
// ========================================

const hostSignupSchema = z.object({
  email: z.string().email().transform(e => e.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
});

const hostLoginSchema = z.object({
  email: z.string().email().transform(e => e.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

// Register
router.post("/api/host/register", async (req: Request, res: Response) => {
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
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
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
      sameSite: "lax",
      maxAge: SESSION_DURATION_HOURS * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      host: {
        id: host.id,
        email: host.email,
        name: host.name,
      },
    });
  } catch (error) {
    console.error("Host register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/api/host/login", async (req: Request, res: Response) => {
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

    const valid = await bcrypt.compare(password, host.passwordHash);
    if (!valid) {
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
      sameSite: "lax",
      maxAge: SESSION_DURATION_HOURS * 60 * 60 * 1000,
      path: "/",
    });

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
        isSuperhost: host.isSuperhost,
      },
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
      isSuperhost: host.isSuperhost,
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

    res.json({ properties: hostProperties });
  } catch (error) {
    console.error("Get properties error:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Get single property
router.get("/api/host/properties/:propertyId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;

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

// Create property
router.post("/api/host/properties", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const {
      title, description, propertyType, category, address, city, state, country, postcode,
      latitude, longitude, maxGuests, bedrooms, beds, bathrooms, amenities,
      houseRules, checkInInstructions, checkInTime, checkOutTime,
      cancellationPolicy, baseNightlyRate, cleaningFee, minNights, maxNights,
      instantBook, selfCheckIn, petFriendly, smokingAllowed, nearbyHighlight,
      images, coverImage,
    } = req.body;

    if (!title || !description || !address || !city || !baseNightlyRate) {
      return res.status(400).json({ error: "Missing required fields: title, description, address, city, baseNightlyRate" });
    }

    const propertyId = uuidv4();

    const [property] = await db
      .insert(properties)
      .values({
        id: propertyId,
        hostId: req.hostId!,
        title,
        description,
        propertyType: propertyType || "entire_place",
        category: category || "apartment",
        address,
        city,
        state: state || null,
        country: country || "Australia",
        postcode: postcode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        maxGuests: maxGuests || 2,
        bedrooms: bedrooms || 1,
        beds: beds || 1,
        bathrooms: bathrooms || "1",
        amenities: amenities || [],
        houseRules: houseRules || null,
        checkInInstructions: checkInInstructions || null,
        checkInTime: checkInTime || "15:00",
        checkOutTime: checkOutTime || "10:00",
        cancellationPolicy: cancellationPolicy || "moderate",
        baseNightlyRate,
        cleaningFee: cleaningFee || 0,
        serviceFee: 0,
        minNights: minNights || 1,
        maxNights: maxNights || 30,
        instantBook: instantBook || false,
        selfCheckIn: selfCheckIn || false,
        petFriendly: petFriendly || false,
        smokingAllowed: smokingAllowed || false,
        nearbyHighlight: nearbyHighlight || null,
        images: images || [],
        coverImage: coverImage || null,
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

// Update property
router.put("/api/host/properties/:propertyId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

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
        allowedFields[field] = req.body[field];
      }
    }

    allowedFields.updatedAt = new Date();

    const [updated] = await db
      .update(properties)
      .set(allowedFields)
      .where(eq(properties.id, propertyId))
      .returning();

    res.json({ property: updated });
  } catch (error) {
    console.error("Update property error:", error);
    res.status(500).json({ error: "Failed to update property" });
  }
});

// Delete (archive) property
router.delete("/api/host/properties/:propertyId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    await db
      .update(properties)
      .set({ status: "archived", isActive: false, updatedAt: new Date() })
      .where(eq(properties.id, propertyId));

    res.json({ message: "Property archived" });
  } catch (error) {
    console.error("Delete property error:", error);
    res.status(500).json({ error: "Failed to archive property" });
  }
});

// ========================================
// PROPERTY PHOTOS
// ========================================

router.post("/api/host/properties/:propertyId/photos", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const { url, caption, isCover } = req.body;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Get current max sort order
    const photos = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId));

    const maxOrder = photos.length > 0 ? Math.max(...photos.map(p => p.sortOrder)) : -1;

    const [photo] = await db
      .insert(propertyPhotos)
      .values({
        id: uuidv4(),
        propertyId,
        url,
        caption: caption || null,
        sortOrder: maxOrder + 1,
        isCover: isCover || false,
      })
      .returning();

    // If this is set as cover, update property coverImage
    if (isCover) {
      await db.update(properties).set({ coverImage: url, updatedAt: new Date() }).where(eq(properties.id, propertyId));
    }

    res.json({ photo });
  } catch (error) {
    console.error("Add photo error:", error);
    res.status(500).json({ error: "Failed to add photo" });
  }
});

router.delete("/api/host/properties/:propertyId/photos/:photoId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const photoId = req.params.photoId as string;

    const [existing] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    await db.delete(propertyPhotos).where(and(
      eq(propertyPhotos.id, photoId),
      eq(propertyPhotos.propertyId, propertyId)
    ));

    res.json({ message: "Photo deleted" });
  } catch (error) {
    console.error("Delete photo error:", error);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

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

// Set availability (bulk upsert)
router.post("/api/host/properties/:propertyId/availability", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
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
// BOOKING MANAGEMENT (HOST SIDE)
// ========================================

// Get all bookings for host
router.get("/api/host/bookings", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const { status } = req.query;

    let bookingsList;
    if (status) {
      bookingsList = await db
        .select()
        .from(propertyBookings)
        .where(and(
          eq(propertyBookings.hostId, req.hostId!),
          eq(propertyBookings.status, status as string)
        ))
        .orderBy(desc(propertyBookings.createdAt));
    } else {
      bookingsList = await db
        .select()
        .from(propertyBookings)
        .where(eq(propertyBookings.hostId, req.hostId!))
        .orderBy(desc(propertyBookings.createdAt));
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
          propertyTitle: property?.title || "Unknown",
          propertyCoverImage: property?.coverImage || null,
          guestName: user?.name || `${booking.guestFirstName} ${booking.guestLastName}`,
          guestAccountEmail: user?.email || booking.guestEmail,
          idVerified: verification?.status === "verified",
        };
      })
    );

    res.json({ bookings: enriched });
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
      booking,
      property,
      guest: {
        ...user,
        firstName: booking.guestFirstName,
        lastName: booking.guestLastName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
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

    // Capture the payment via Stripe
    if (booking.stripePaymentIntentId) {
      try {
        const { stripe } = await import("./stripe");
        if (stripe) {
          await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
        }
      } catch (stripeError) {
        console.error("Stripe capture error:", stripeError);
        // Update status to payment failed
        await db
          .update(propertyBookings)
          .set({ status: "PAYMENT_FAILED", updatedAt: new Date() })
          .where(eq(propertyBookings.id, bookingId));
        return res.status(500).json({ error: "Payment capture failed. The guest's card may have been declined." });
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

    // TODO: Send decline notification email to guest

    res.json({ booking: updated, message: "Booking declined" });
  } catch (error) {
    console.error("Decline booking error:", error);
    res.status(500).json({ error: "Failed to decline booking" });
  }
});

// ========================================
// Q&A MANAGEMENT (HOST SIDE)
// ========================================

// Get unanswered questions
router.get("/api/host/qa", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    // Get all properties for this host
    const hostProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.hostId, req.hostId!));

    const propertyIds = hostProperties.map(p => p.id);

    if (propertyIds.length === 0) {
      return res.json({ questions: [] });
    }

    const questions = await db
      .select()
      .from(propertyQA)
      .where(sql`${propertyQA.propertyId} IN (${sql.join(propertyIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(propertyQA.createdAt));

    // Enrich with property titles and user info
    const enriched = await Promise.all(
      questions.map(async (q) => {
        const [property] = await db
          .select({ title: properties.title })
          .from(properties)
          .where(eq(properties.id, q.propertyId))
          .limit(1);

        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, q.userId))
          .limit(1);

        return {
          ...q,
          propertyTitle: property?.title || "Unknown",
          userName: user?.name || "Anonymous",
        };
      })
    );

    res.json({ questions: enriched });
  } catch (error) {
    console.error("Get Q&A error:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
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
// RESPOND TO REVIEWS
// ========================================

router.post("/api/host/reviews/:reviewId/respond", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const reviewId = req.params.reviewId as string;
    const { response } = req.body;

    if (!response || response.trim().length === 0) {
      return res.status(400).json({ error: "Response is required" });
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
      .set({ hostResponse: response.trim(), hostRespondedAt: new Date() })
      .where(eq(propertyReviews.id, reviewId))
      .returning();

    res.json({ review: updated });
  } catch (error) {
    console.error("Respond to review error:", error);
    res.status(500).json({ error: "Failed to respond to review" });
  }
});

export default router;
