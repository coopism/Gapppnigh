import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { 
  airbnbHosts, hostSessions, properties, propertyPhotos,
  propertyAvailability, draftListings, icalConnections, gapNightRules
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const HOST_SESSION_COOKIE = "host_session";

// ========================================
// HOST AUTH MIDDLEWARE (shared)
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

// Photo upload config for drafts
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg, .jpeg, .png, .webp files are allowed"));
    }
  },
});

// ========================================
// DRAFT LISTING CRUD
// ========================================

// Create a new draft (Step 0)
router.post("/api/host/drafts", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const draftId = uuidv4();
    const [draft] = await db
      .insert(draftListings)
      .values({
        id: draftId,
        hostId: req.hostId!,
        currentStep: 0,
        status: "draft",
        lastSavedAt: new Date(),
      })
      .returning();

    res.json({ draft, message: "Draft created" });
  } catch (error) {
    console.error("Create draft error:", error);
    res.status(500).json({ error: "Failed to create draft" });
  }
});

// Get all drafts for host
router.get("/api/host/drafts", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const drafts = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.hostId, req.hostId!), eq(draftListings.status, "draft")))
      .orderBy(desc(draftListings.updatedAt));

    res.json({ drafts });
  } catch (error) {
    console.error("Get drafts error:", error);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get single draft
router.get("/api/host/drafts/:draftId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const draftId = req.params.draftId as string;
    const [draft] = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.id, draftId), eq(draftListings.hostId, req.hostId!)))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Get iCal connections for this draft
    const connections = await db
      .select()
      .from(icalConnections)
      .where(eq(icalConnections.draftId, draft.id))
      .orderBy(desc(icalConnections.createdAt));

    res.json({ draft, icalConnections: connections });
  } catch (error) {
    console.error("Get draft error:", error);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

// Autosave draft (PATCH - partial update)
router.patch("/api/host/drafts/:draftId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const draftId = req.params.draftId as string;
    const [existing] = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.id, draftId), eq(draftListings.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Only allow updating draft fields
    const allowedFields = [
      "currentStep", "airbnbUrl", "title", "description", "propertyType", "category",
      "address", "city", "state", "country", "postcode", "latitude", "longitude",
      "maxGuests", "bedrooms", "beds", "bathrooms", "amenities", "houseRules",
      "checkInTime", "checkOutTime", "minNotice", "prepBuffer", "baseNightlyRate",
      "cleaningFee", "gapNightDiscount", "weekdayMultiplier", "weekendMultiplier",
      "manualApproval", "autoPublish", "selfCheckIn", "petFriendly", "smokingAllowed",
      "nearbyHighlight", "checkInInstructions", "coverImage", "images",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    updates.lastSavedAt = new Date();
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(draftListings)
      .set(updates)
      .where(eq(draftListings.id, draftId))
      .returning();

    res.json({ draft: updated, savedAt: updates.lastSavedAt });
  } catch (error) {
    console.error("Autosave draft error:", error);
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// Delete draft
router.delete("/api/host/drafts/:draftId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const draftId = req.params.draftId as string;
    const [existing] = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.id, draftId), eq(draftListings.hostId, req.hostId!)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Delete associated iCal connections
    await db.delete(icalConnections).where(eq(icalConnections.draftId, draftId));
    // Delete associated gap night rules
    await db.delete(gapNightRules).where(eq(gapNightRules.draftId, draftId));
    // Delete the draft
    await db.delete(draftListings).where(eq(draftListings.id, draftId));

    res.json({ message: "Draft deleted" });
  } catch (error) {
    console.error("Delete draft error:", error);
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

// Upload photos for a draft
router.post("/api/host/drafts/:draftId/photos", requireHostAuth, photoUpload.array("photos", 10), async (req: HostRequest, res: Response) => {
  try {
    const draftId = req.params.draftId as string;
    const [draft] = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.id, draftId), eq(draftListings.hostId, req.hostId!)))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const urls = files.map(f => `/uploads/properties/${f.filename}`);
    const existingImages = draft.images || [];
    const allImages = [...existingImages, ...urls];
    const coverImage = draft.coverImage || urls[0];

    const [updated] = await db
      .update(draftListings)
      .set({ images: allImages, coverImage, lastSavedAt: new Date(), updatedAt: new Date() })
      .where(eq(draftListings.id, draftId))
      .returning();

    res.json({ draft: updated, uploadedUrls: urls, message: `${urls.length} photo(s) uploaded` });
  } catch (error) {
    console.error("Draft photo upload error:", error);
    res.status(500).json({ error: "Failed to upload photos" });
  }
});

// ========================================
// iCAL SYNC
// ========================================

// Helper: Parse iCal data and extract blocked date ranges
function parseICalData(icalText: string): { events: Array<{ start: string; end: string; summary: string }>; error?: string } {
  try {
    const events: Array<{ start: string; end: string; summary: string }> = [];
    
    if (!icalText.includes("BEGIN:VCALENDAR")) {
      return { events: [], error: "Invalid iCal format: not a valid calendar file" };
    }

    const eventBlocks = icalText.split("BEGIN:VEVENT");
    
    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i].split("END:VEVENT")[0];
      
      let dtstart = "";
      let dtend = "";
      let summary = "Blocked";

      const lines = block.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith("DTSTART")) {
          const val = line.split(":").pop()?.trim() || "";
          // Handle both DATE and DATETIME formats
          if (val.length === 8) {
            dtstart = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
          } else if (val.length >= 15) {
            dtstart = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
          }
        }
        if (line.startsWith("DTEND")) {
          const val = line.split(":").pop()?.trim() || "";
          if (val.length === 8) {
            dtend = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
          } else if (val.length >= 15) {
            dtend = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
          }
        }
        if (line.startsWith("SUMMARY")) {
          summary = line.split(":").slice(1).join(":").trim() || "Blocked";
        }
      }

      if (dtstart && dtend) {
        events.push({ start: dtstart, end: dtend, summary });
      }
    }

    return { events };
  } catch (error) {
    return { events: [], error: "Failed to parse iCal data" };
  }
}

// Helper: Detect gap nights from blocked date ranges
function detectGapNights(events: Array<{ start: string; end: string; summary: string }>): Array<{ date: string; gapSize: number }> {
  if (events.length < 2) return [];

  // Sort events by start date
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const gapNights: Array<{ date: string; gapSize: number }> = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = new Date(sorted[i].end);
    const nextStart = new Date(sorted[i + 1].start);

    // Calculate gap in days
    const gapDays = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));

    // Detect 1-night and 2-night gaps
    if (gapDays >= 1 && gapDays <= 2) {
      for (let d = 0; d < gapDays; d++) {
        const gapDate = new Date(currentEnd);
        gapDate.setDate(gapDate.getDate() + d);
        const dateStr = gapDate.toISOString().split("T")[0];
        gapNights.push({ date: dateStr, gapSize: gapDays });
      }
    }
  }

  return gapNights;
}

// Test iCal link
router.post("/api/host/drafts/:draftId/ical/test", requireHostAuth, async (req: HostRequest, res: Response) => {
  const _draftId = req.params.draftId as string;
  try {
    const { icalUrl } = req.body;

    if (!icalUrl || typeof icalUrl !== "string") {
      return res.status(400).json({ error: "iCal URL is required" });
    }

    // Validate URL format
    try {
      new URL(icalUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Check it looks like an iCal URL
    if (!icalUrl.includes(".ics") && !icalUrl.includes("ical") && !icalUrl.includes("calendar")) {
      return res.status(400).json({ 
        error: "This doesn't look like an iCal URL. It should end in .ics or contain 'ical' in the path.",
        help: "In Airbnb: Go to Calendar → Availability settings → Export calendar → Copy the link"
      });
    }

    // Fetch the iCal data
    let icalText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(icalUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "GapNight/1.0 Calendar Sync",
          "Accept": "text/calendar, text/plain, */*",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          return res.status(400).json({ 
            error: "Access denied. The calendar link may have expired or is not public.",
            help: "Try generating a new export link from your Airbnb calendar settings."
          });
        }
        return res.status(400).json({ 
          error: `Failed to fetch calendar (HTTP ${response.status})`,
          help: "Make sure the link is correct and publicly accessible."
        });
      }

      const contentType = response.headers.get("content-type") || "";
      icalText = await response.text();

      if (!icalText.includes("BEGIN:VCALENDAR") && !contentType.includes("text/calendar")) {
        return res.status(400).json({ 
          error: "The URL did not return valid calendar data.",
          help: "Make sure you're using the iCal export link, not a regular Airbnb page URL."
        });
      }
    } catch (fetchError: any) {
      if (fetchError.name === "AbortError") {
        return res.status(400).json({ error: "Request timed out. The calendar server took too long to respond." });
      }
      return res.status(400).json({ 
        error: "Could not reach the calendar URL. Check your internet connection and the URL.",
        help: "Make sure the URL is correct and the calendar is publicly accessible."
      });
    }

    // Parse the iCal data
    const { events, error: parseError } = parseICalData(icalText);
    if (parseError) {
      return res.status(400).json({ error: parseError });
    }

    // Detect gap nights
    const gapNights = detectGapNights(events);

    res.json({
      valid: true,
      eventsCount: events.length,
      blockedRanges: events.slice(0, 50), // Limit response size
      detectedGapNights: gapNights,
      message: `Found ${events.length} blocked period(s) and ${gapNights.length} potential gap night(s)`,
    });
  } catch (error) {
    console.error("Test iCal error:", error);
    res.status(500).json({ error: "Failed to test iCal link" });
  }
});

// Connect iCal (save + sync)
router.post("/api/host/drafts/:draftId/ical/connect", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const draftId = req.params.draftId as string;
    const { icalUrl, label } = req.body;

    const [draft] = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.id, draftId), eq(draftListings.hostId, req.hostId!)))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    if (!icalUrl) {
      return res.status(400).json({ error: "iCal URL is required" });
    }

    // Fetch and parse
    let icalText: string;
    let events: Array<{ start: string; end: string; summary: string }> = [];
    let gapNights: Array<{ date: string; gapSize: number }> = [];
    let syncStatus = "connected";
    let lastError: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(icalUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "GapNight/1.0 Calendar Sync", "Accept": "text/calendar, text/plain, */*" },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        syncStatus = "error";
        lastError = `HTTP ${response.status}: Could not fetch calendar`;
      } else {
        icalText = await response.text();
        const parsed = parseICalData(icalText!);
        if (parsed.error) {
          syncStatus = "error";
          lastError = parsed.error;
        } else {
          events = parsed.events;
          gapNights = detectGapNights(events);
        }
      }
    } catch (fetchError: any) {
      syncStatus = "error";
      lastError = fetchError.name === "AbortError" ? "Request timed out" : "Could not reach calendar URL";
    }

    const connectionId = uuidv4();
    const [connection] = await db
      .insert(icalConnections)
      .values({
        id: connectionId,
        hostId: req.hostId!,
        draftId: draft.id,
        icalUrl,
        label: label || "Airbnb",
        status: syncStatus,
        lastSyncAt: syncStatus === "connected" ? new Date() : null,
        lastError,
        syncIntervalMinutes: 30,
        blockedDates: events,
        detectedGapNights: gapNights,
      })
      .returning();

    res.json({ 
      connection, 
      blockedDates: events,
      detectedGapNights: gapNights,
      message: syncStatus === "connected" 
        ? `Connected! Found ${events.length} blocked period(s) and ${gapNights.length} gap night(s)`
        : `Connection saved with error: ${lastError}`
    });
  } catch (error) {
    console.error("Connect iCal error:", error);
    res.status(500).json({ error: "Failed to connect iCal" });
  }
});

// Manual sync (re-fetch iCal data)
router.post("/api/host/ical/:connectionId/sync", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const connectionId = req.params.connectionId as string;
    const [connection] = await db
      .select()
      .from(icalConnections)
      .where(and(eq(icalConnections.id, connectionId), eq(icalConnections.hostId, req.hostId!)))
      .limit(1);

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    let syncStatus = "connected";
    let lastError: string | null = null;
    let events: Array<{ start: string; end: string; summary: string }> = [];
    let gapNights: Array<{ date: string; gapSize: number }> = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(connection.icalUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "GapNight/1.0 Calendar Sync", "Accept": "text/calendar, text/plain, */*" },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        syncStatus = "error";
        lastError = `HTTP ${response.status}: Could not fetch calendar`;
      } else {
        const icalText = await response.text();
        const parsed = parseICalData(icalText);
        if (parsed.error) {
          syncStatus = "error";
          lastError = parsed.error;
        } else {
          events = parsed.events;
          gapNights = detectGapNights(events);
        }
      }
    } catch (fetchError: any) {
      syncStatus = "error";
      lastError = fetchError.name === "AbortError" ? "Request timed out" : "Could not reach calendar URL";
    }

    const [updated] = await db
      .update(icalConnections)
      .set({
        status: syncStatus,
        lastSyncAt: syncStatus === "connected" ? new Date() : connection.lastSyncAt,
        lastError,
        blockedDates: events,
        detectedGapNights: gapNights,
        updatedAt: new Date(),
      })
      .where(eq(icalConnections.id, connection.id))
      .returning();

    res.json({ connection: updated, blockedDates: events, detectedGapNights: gapNights });
  } catch (error) {
    console.error("Sync iCal error:", error);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
});

// Delete iCal connection
router.delete("/api/host/ical/:connectionId", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const connectionId = req.params.connectionId as string;
    await db.delete(icalConnections).where(
      and(eq(icalConnections.id, connectionId), eq(icalConnections.hostId, req.hostId!))
    );
    res.json({ message: "Connection removed" });
  } catch (error) {
    console.error("Delete iCal error:", error);
    res.status(500).json({ error: "Failed to remove connection" });
  }
});

// ========================================
// PUBLISH DRAFT → PROPERTY
// ========================================

router.post("/api/host/drafts/:draftId/publish", requireHostAuth, async (req: HostRequest, res: Response) => {
  try {
    const draftId = req.params.draftId as string;
    const [draft] = await db
      .select()
      .from(draftListings)
      .where(and(eq(draftListings.id, draftId), eq(draftListings.hostId, req.hostId!)))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Validate required fields
    if (!draft.title || !draft.city || !draft.baseNightlyRate) {
      return res.status(400).json({ 
        error: "Missing required fields",
        missing: [
          !draft.title && "title",
          !draft.city && "city", 
          !draft.baseNightlyRate && "baseNightlyRate",
        ].filter(Boolean)
      });
    }

    const propertyId = uuidv4();

    // Create the actual property
    const [property] = await db
      .insert(properties)
      .values({
        id: propertyId,
        hostId: req.hostId!,
        title: draft.title,
        description: draft.description || "",
        propertyType: draft.propertyType || "entire_place",
        category: draft.category || "apartment",
        address: draft.address || "",
        city: draft.city,
        state: draft.state,
        country: draft.country || "Australia",
        postcode: draft.postcode,
        latitude: draft.latitude,
        longitude: draft.longitude,
        maxGuests: draft.maxGuests || 2,
        bedrooms: draft.bedrooms || 1,
        beds: draft.beds || 1,
        bathrooms: draft.bathrooms || "1",
        amenities: draft.amenities || [],
        houseRules: draft.houseRules,
        checkInInstructions: draft.checkInInstructions,
        checkInTime: draft.checkInTime || "15:00",
        checkOutTime: draft.checkOutTime || "10:00",
        cancellationPolicy: "moderate",
        baseNightlyRate: draft.baseNightlyRate,
        cleaningFee: draft.cleaningFee || 0,
        serviceFee: 0,
        minNights: 1,
        maxNights: 30,
        instantBook: false,
        selfCheckIn: draft.selfCheckIn || false,
        petFriendly: draft.petFriendly || false,
        smokingAllowed: draft.smokingAllowed || false,
        nearbyHighlight: draft.nearbyHighlight,
        images: draft.images || [],
        coverImage: draft.coverImage,
        status: "pending_approval",
      })
      .returning();

    // Create photos from draft images
    if (draft.images && draft.images.length > 0) {
      for (let i = 0; i < draft.images.length; i++) {
        await db.insert(propertyPhotos).values({
          id: uuidv4(),
          propertyId,
          url: draft.images[i],
          sortOrder: i,
          isCover: draft.images[i] === draft.coverImage,
        });
      }
    }

    // Move iCal connections to property
    await db
      .update(icalConnections)
      .set({ propertyId, updatedAt: new Date() })
      .where(eq(icalConnections.draftId, draft.id));

    // Create gap night rules for property
    if (draft.baseNightlyRate) {
      await db.insert(gapNightRules).values({
        id: uuidv4(),
        hostId: req.hostId!,
        propertyId,
        draftId: draft.id,
        checkInTime: draft.checkInTime || "15:00",
        checkOutTime: draft.checkOutTime || "10:00",
        minNotice: draft.minNotice || 1,
        prepBuffer: draft.prepBuffer || false,
        baseNightlyRate: draft.baseNightlyRate,
        gapNightDiscount: draft.gapNightDiscount || 30,
        weekdayMultiplier: draft.weekdayMultiplier || "1.0",
        weekendMultiplier: draft.weekendMultiplier || "1.0",
        manualApproval: draft.manualApproval !== false,
        autoPublish: draft.autoPublish || false,
      });
    }

    // Mark draft as published
    await db
      .update(draftListings)
      .set({ status: "published", publishedPropertyId: propertyId, updatedAt: new Date() })
      .where(eq(draftListings.id, draft.id));

    // Send notification email to admin
    try {
      const { sendPropertyApprovalEmail } = await import("./email");
      await sendPropertyApprovalEmail(property, req.hostData);
    } catch (emailError) {
      console.error("Failed to send property approval email:", emailError);
    }

    res.json({ 
      property, 
      message: "Property published and submitted for review!",
      nextActions: [
        "Add a second calendar (Booking.com, etc.)",
        "Upload more photos",
        "Enable auto-suggest gap nights",
      ]
    });
  } catch (error) {
    console.error("Publish draft error:", error);
    res.status(500).json({ error: "Failed to publish listing" });
  }
});

export default router;
