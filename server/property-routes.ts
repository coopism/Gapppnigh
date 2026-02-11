import { Router, Request, Response } from "express";
import { db } from "./db";
import { 
  properties, propertyAvailability, propertyBookings, propertyQA, 
  propertyReviews, propertyPhotos, airbnbHosts, users, userIdVerifications
} from "@shared/schema";
import { eq, and, desc, gte, lte, count, sql, asc, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { stripe, createPaymentIntent } from "./stripe";

const router = Router();

// ========================================
// BATCH QUERY HELPERS (Fix #26: N+1 Query Optimization)
// ========================================

interface PropertyDetails {
  host: any;
  gapNights: any[];
  reviewStats: { count: number; avgRating: number };
}

async function batchGetPropertyDetails(propertyIds: string[]): Promise<Map<string, PropertyDetails>> {
  if (propertyIds.length === 0) return new Map();
  
  // Batch fetch all hosts
  const propertyData = await db
    .select({
      propertyId: properties.id,
      hostId: properties.hostId,
      hostName: airbnbHosts.name,
      hostProfilePhoto: airbnbHosts.profilePhoto,
      hostIsSuperhost: airbnbHosts.isSuperhost,
      hostAvgResponseTime: airbnbHosts.averageResponseTime,
      hostResponseRate: airbnbHosts.responseRate,
    })
    .from(properties)
    .leftJoin(airbnbHosts, eq(properties.hostId, airbnbHosts.id))
    .where(inArray(properties.id, propertyIds));
  
  // Batch fetch all gap nights
  const today = new Date().toISOString().split("T")[0];
  const allGapNights = await db
    .select()
    .from(propertyAvailability)
    .where(and(
      inArray(propertyAvailability.propertyId, propertyIds),
      eq(propertyAvailability.isAvailable, true),
      eq(propertyAvailability.isGapNight, true),
      gte(propertyAvailability.date, today)
    ));
  
  // Batch fetch all review stats
  const allReviewStats = await db
    .select({
      propertyId: propertyReviews.propertyId,
      count: count(),
      avgRating: sql<number>`COALESCE(AVG(${propertyReviews.rating}), 0)`,
    })
    .from(propertyReviews)
    .where(inArray(propertyReviews.propertyId, propertyIds))
    .groupBy(propertyReviews.propertyId);
  
  // Build result map
  const result = new Map<string, PropertyDetails>();
  for (const pd of propertyData) {
    const gapNights = allGapNights.filter(gn => gn.propertyId === pd.propertyId);
    const reviewStats = allReviewStats.find(rs => rs.propertyId === pd.propertyId);
    
    result.set(pd.propertyId, {
      host: pd.hostId ? {
        id: pd.hostId,
        name: pd.hostName,
        profilePhoto: pd.hostProfilePhoto,
        isSuperhost: pd.hostIsSuperhost,
        averageResponseTime: pd.hostAvgResponseTime,
        responseRate: pd.hostResponseRate,
      } : null,
      gapNights: gapNights.map(gn => ({
        date: gn.date,
        nightlyRate: gn.nightlyRate,
        gapNightDiscount: gn.gapNightDiscount,
        discountedRate: Math.round(gn.nightlyRate * (1 - (gn.gapNightDiscount || 0) / 100)),
      })),
      reviewStats: {
        count: reviewStats?.count || 0,
        avgRating: Number(reviewStats?.avgRating || 0),
      },
    });
  }
  
  return result;
}

// ========================================
// ERROR RESPONSE HELPERS (Fix #36: Standardized Error Format)
// ========================================

interface ErrorResponse {
  error: true;
  message: string;
  field?: string;
  code?: string;
  timestamp: string;
}

function sendError(res: Response, status: number, message: string, field?: string, code?: string) {
  const response: ErrorResponse = {
    error: true,
    message,
    field,
    code,
    timestamp: new Date().toISOString(),
  };
  res.status(status).json(response);
}

// ========================================
// TYPE INTERFACES (Fix #37: TypeScript Strict Typing)
// ========================================

// Extended request type with user info (using intersection instead of extension to avoid conflicts)
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
};

interface BookingRequestBody {
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  guestMessage?: string;
  specialRequests?: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
}

interface QuestionRequestBody {
  question: string;
}

// ========================================
// PUBLIC PROPERTY LISTINGS
// ========================================

// Get all approved properties with gap nights
router.get("/api/properties", async (req: Request, res: Response) => {
  try {
    const { city, type, minPrice, maxPrice, guests, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get approved active properties
    let allProperties = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.status, "approved"),
        eq(properties.isActive, true)
      ))
      .orderBy(desc(properties.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Filter by city
    if (city) {
      allProperties = allProperties.filter(p => 
        p.city.toLowerCase().includes((city as string).toLowerCase())
      );
    }

    // Filter by property type
    if (type) {
      allProperties = allProperties.filter(p => p.propertyType === type);
    }

    // Filter by guest count
    if (guests) {
      allProperties = allProperties.filter(p => p.maxGuests >= parseInt(guests as string));
    }

    // Enrich with host info and availability
    const enriched = await Promise.all(
      allProperties.map(async (prop) => {
        const [host] = await db
          .select({
            name: airbnbHosts.name,
            profilePhoto: airbnbHosts.profilePhoto,
            isSuperhost: airbnbHosts.isSuperhost,
            averageResponseTime: airbnbHosts.averageResponseTime,
            responseRate: airbnbHosts.responseRate,
          })
          .from(airbnbHosts)
          .where(eq(airbnbHosts.id, prop.hostId))
          .limit(1);

        // Get gap night availability (future dates only)
        const today = new Date().toISOString().split("T")[0];
        const gapNights = await db
          .select()
          .from(propertyAvailability)
          .where(and(
            eq(propertyAvailability.propertyId, prop.id),
            eq(propertyAvailability.isAvailable, true),
            eq(propertyAvailability.isGapNight, true),
            gte(propertyAvailability.date, today)
          ))
          .orderBy(asc(propertyAvailability.date))
          .limit(30);

        // Get review count
        const [reviewStats] = await db
          .select({ 
            count: count(),
            avgRating: sql<number>`COALESCE(AVG(${propertyReviews.rating}), 0)`,
          })
          .from(propertyReviews)
          .where(eq(propertyReviews.propertyId, prop.id));

        return {
          ...prop,
          host: host || null,
          gapNights: gapNights.map(gn => ({
            date: gn.date,
            nightlyRate: gn.nightlyRate,
            gapNightDiscount: gn.gapNightDiscount,
            discountedRate: Math.round(gn.nightlyRate * (1 - (gn.gapNightDiscount || 0) / 100)),
          })),
          gapNightCount: gapNights.length,
          reviewCount: reviewStats?.count || 0,
          averageRating: Number(reviewStats?.avgRating || 0).toFixed(1),
        };
      })
    );

    // Post-filter by price if needed
    let filtered = enriched;
    if (minPrice) {
      filtered = filtered.filter(p => p.baseNightlyRate >= parseInt(minPrice as string) * 100);
    }
    if (maxPrice) {
      filtered = filtered.filter(p => p.baseNightlyRate <= parseInt(maxPrice as string) * 100);
    }

    const [totalCount] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(eq(properties.status, "approved"), eq(properties.isActive, true)));

    res.json({
      properties: filtered,
      total: totalCount.count,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error("Get properties error:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Get single property detail (public)
router.get("/api/properties/:propertyId", async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;

    const [property] = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.id, propertyId),
        eq(properties.status, "approved"),
        eq(properties.isActive, true)
      ))
      .limit(1);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Host info
    const [host] = await db
      .select({
        id: airbnbHosts.id,
        name: airbnbHosts.name,
        profilePhoto: airbnbHosts.profilePhoto,
        bio: airbnbHosts.bio,
        isSuperhost: airbnbHosts.isSuperhost,
        averageResponseTime: airbnbHosts.averageResponseTime,
        responseRate: airbnbHosts.responseRate,
        createdAt: airbnbHosts.createdAt,
      })
      .from(airbnbHosts)
      .where(eq(airbnbHosts.id, property.hostId))
      .limit(1);

    // Photos
    const photos = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, propertyId))
      .orderBy(asc(propertyPhotos.sortOrder));

    // Availability (future dates)
    const today = new Date().toISOString().split("T")[0];
    const availability = await db
      .select()
      .from(propertyAvailability)
      .where(and(
        eq(propertyAvailability.propertyId, propertyId),
        eq(propertyAvailability.isAvailable, true),
        gte(propertyAvailability.date, today)
      ))
      .orderBy(asc(propertyAvailability.date));

    // Q&A (public only) - wrapped in try/catch so property still loads if Q&A table schema is outdated
    let enrichedQA: any[] = [];
    try {
      const qa = await db
        .select()
        .from(propertyQA)
        .where(and(
          eq(propertyQA.propertyId, propertyId),
          eq(propertyQA.isPublic, true)
        ))
        .orderBy(desc(propertyQA.createdAt));

      enrichedQA = await Promise.all(
        qa.map(async (q) => {
          let userName = "Host FAQ";
          if (q.userId) {
            const [user] = await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, q.userId))
              .limit(1);
            userName = user?.name || "Guest";
          }
          return { ...q, userName };
        })
      );
    } catch (qaError) {
      console.error("Q&A query failed (schema may be outdated):", qaError);
    }

    // Reviews
    const reviews = await db
      .select()
      .from(propertyReviews)
      .where(eq(propertyReviews.propertyId, propertyId))
      .orderBy(desc(propertyReviews.createdAt))
      .limit(20);

    const enrichedReviews = await Promise.all(
      reviews.map(async (r) => {
        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, r.userId))
          .limit(1);
        return { ...r, userName: user?.name || "Guest" };
      })
    );

    // Review stats
    const [reviewStats] = await db
      .select({
        count: count(),
        avgRating: sql<number>`COALESCE(AVG(${propertyReviews.rating}), 0)`,
        avgCleanliness: sql<number>`COALESCE(AVG(${propertyReviews.cleanlinessRating}), 0)`,
        avgAccuracy: sql<number>`COALESCE(AVG(${propertyReviews.accuracyRating}), 0)`,
        avgCheckIn: sql<number>`COALESCE(AVG(${propertyReviews.checkInRating}), 0)`,
        avgCommunication: sql<number>`COALESCE(AVG(${propertyReviews.communicationRating}), 0)`,
        avgLocation: sql<number>`COALESCE(AVG(${propertyReviews.locationRating}), 0)`,
        avgValue: sql<number>`COALESCE(AVG(${propertyReviews.valueRating}), 0)`,
      })
      .from(propertyReviews)
      .where(eq(propertyReviews.propertyId, propertyId));

    // Count host's total properties
    const [hostPropertyCount] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(
        eq(properties.hostId, property.hostId),
        eq(properties.status, "approved")
      ));

    res.json({
      property,
      host: {
        ...host,
        totalProperties: hostPropertyCount?.count || 0,
      },
      photos,
      availability: availability.map(a => ({
        ...a,
        discountedRate: a.isGapNight 
          ? Math.round(a.nightlyRate * (1 - (a.gapNightDiscount || 0) / 100))
          : a.nightlyRate,
      })),
      qa: enrichedQA,
      reviews: enrichedReviews,
      reviewStats: reviewStats ? {
        count: reviewStats.count,
        // Fix #24: Use proper rounding to avoid floating point precision issues
        averageRating: Math.round((Number(reviewStats.avgRating) + Number.EPSILON) * 10) / 10,
        cleanliness: Math.round((Number(reviewStats.avgCleanliness) + Number.EPSILON) * 10) / 10,
        accuracy: Math.round((Number(reviewStats.avgAccuracy) + Number.EPSILON) * 10) / 10,
        checkIn: Math.round((Number(reviewStats.avgCheckIn) + Number.EPSILON) * 10) / 10,
        communication: Math.round((Number(reviewStats.avgCommunication) + Number.EPSILON) * 10) / 10,
        location: Math.round((Number(reviewStats.avgLocation) + Number.EPSILON) * 10) / 10,
        value: Math.round((Number(reviewStats.avgValue) + Number.EPSILON) * 10) / 10,
      } : null,
    });
  } catch (error) {
    console.error("Get property detail error:", error);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

// ========================================
// PUBLIC HOST PROFILE
// ========================================

router.get("/api/hosts/:hostId/profile", async (req: Request, res: Response) => {
  try {
    const hostId = req.params.hostId as string;

    const [host] = await db
      .select({
        id: airbnbHosts.id,
        name: airbnbHosts.name,
        profilePhoto: airbnbHosts.profilePhoto,
        bio: airbnbHosts.bio,
        isSuperhost: airbnbHosts.isSuperhost,
        averageResponseTime: airbnbHosts.averageResponseTime,
        responseRate: airbnbHosts.responseRate,
        createdAt: airbnbHosts.createdAt,
      })
      .from(airbnbHosts)
      .where(and(eq(airbnbHosts.id, hostId), eq(airbnbHosts.isActive, true)))
      .limit(1);

    if (!host) {
      return res.status(404).json({ error: "Host not found" });
    }

    // Get host's approved properties with gap night info
    const hostProperties = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.hostId, hostId),
        eq(properties.status, "approved"),
        eq(properties.isActive, true)
      ))
      .orderBy(desc(properties.createdAt));

    const today = new Date().toISOString().split("T")[0];

    const enrichedProperties = await Promise.all(
      hostProperties.map(async (prop) => {
        const gapNights = await db
          .select()
          .from(propertyAvailability)
          .where(and(
            eq(propertyAvailability.propertyId, prop.id),
            eq(propertyAvailability.isAvailable, true),
            eq(propertyAvailability.isGapNight, true),
            gte(propertyAvailability.date, today)
          ))
          .orderBy(asc(propertyAvailability.date))
          .limit(30);

        const [reviewStats] = await db
          .select({
            count: count(),
            avgRating: sql<number>`COALESCE(AVG(${propertyReviews.rating}), 0)`,
          })
          .from(propertyReviews)
          .where(eq(propertyReviews.propertyId, prop.id));

        return {
          ...prop,
          host: {
            name: host.name,
            profilePhoto: host.profilePhoto,
            isSuperhost: host.isSuperhost,
            averageResponseTime: host.averageResponseTime,
            responseRate: host.responseRate,
          },
          gapNights: gapNights.map(gn => ({
            date: gn.date,
            nightlyRate: gn.nightlyRate,
            gapNightDiscount: gn.gapNightDiscount,
            discountedRate: Math.round(gn.nightlyRate * (1 - (gn.gapNightDiscount || 0) / 100)),
          })),
          gapNightCount: gapNights.length,
          reviewCount: reviewStats?.count || 0,
          averageRating: Number(reviewStats?.avgRating || 0).toFixed(1),
        };
      })
    );

    // Aggregate stats
    const totalReviews = enrichedProperties.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
    const avgRating = enrichedProperties.length > 0
      ? (enrichedProperties.reduce((sum, p) => sum + Number(p.averageRating || 0), 0) / enrichedProperties.length).toFixed(1)
      : null;

    res.json({
      host: {
        ...host,
        totalProperties: enrichedProperties.length,
        totalReviews,
        averageRating: avgRating,
      },
      properties: enrichedProperties,
    });
  } catch (error) {
    console.error("Get host profile error:", error);
    res.status(500).json({ error: "Failed to fetch host profile" });
  }
});

// ========================================
// Q&A - USER SIDE (requires user auth)
// ========================================

// Ask a question (requires user auth - injected via middleware in routes.ts)
router.post("/api/properties/:propertyId/questions", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "You must be logged in to ask a question" });
    }

    const propertyId = req.params.propertyId as string;
    const { question } = req.body;

    if (!question || question.trim().length < 5) {
      return res.status(400).json({ error: "Question must be at least 5 characters" });
    }

    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.status, "approved")))
      .limit(1);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    const [qa] = await db
      .insert(propertyQA)
      .values({
        id: uuidv4(),
        propertyId,
        userId: req.user?.id,
        question: question.trim(),
        isPublic: true,
      })
      .returning();

    res.json({ question: qa, message: "Question submitted. The host will be notified." });
  } catch (error) {
    console.error("Ask question error:", error);
    res.status(500).json({ error: "Failed to submit question" });
  }
});

// ========================================
// STRIPE ID VERIFICATION
// ========================================

// Create verification session
router.post("/api/auth/verify-identity", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    if (!stripe) {
      return res.status(503).json({ error: "Payment system not configured" });
    }

    // Check if already verified
    const [existing] = await db
      .select()
      .from(userIdVerifications)
      .where(eq(userIdVerifications.userId, req.user?.id))
      .limit(1);

    if (existing?.status === "verified") {
      return res.json({ status: "verified", message: "ID already verified" });
    }

    // Create Stripe Identity VerificationSession
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        userId: req.user?.id,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
    });

    // Upsert verification record
    if (existing) {
      await db
        .update(userIdVerifications)
        .set({
          stripeVerificationSessionId: verificationSession.id,
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(userIdVerifications.userId, req.user?.id));
    } else {
      await db
        .insert(userIdVerifications)
        .values({
          id: uuidv4(),
          userId: req.user?.id,
          stripeVerificationSessionId: verificationSession.id,
          status: "pending",
        });
    }

    res.json({
      clientSecret: verificationSession.client_secret,
      sessionId: verificationSession.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Create verification error:", error);
    res.status(500).json({ error: "Failed to create verification session" });
  }
});

// Check verification status
router.get("/api/auth/verify-identity/status", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "You must be logged in" });
    }

    const [verification] = await db
      .select()
      .from(userIdVerifications)
      .where(eq(userIdVerifications.userId, req.user?.id))
      .limit(1);

    if (!verification) {
      return res.json({ status: "unverified" });
    }

    // If pending, check with Stripe for updates
    if (verification.status === "pending" && verification.stripeVerificationSessionId && stripe) {
      try {
        const session = await stripe.identity.verificationSessions.retrieve(
          verification.stripeVerificationSessionId
        );

        let newStatus = verification.status;
        if (session.status === "verified") {
          newStatus = "verified";
          await db
            .update(userIdVerifications)
            .set({ status: "verified", verifiedAt: new Date(), updatedAt: new Date() })
            .where(eq(userIdVerifications.userId, req.user?.id));
        } else if (session.status === "requires_input" || session.last_error) {
          newStatus = "failed";
          await db
            .update(userIdVerifications)
            .set({ 
              status: "failed", 
              failureReason: session.last_error?.reason || "Verification failed",
              updatedAt: new Date() 
            })
            .where(eq(userIdVerifications.userId, req.user?.id));
        }

        return res.json({ status: newStatus, verifiedAt: verification.verifiedAt });
      } catch (stripeError) {
        console.error("Stripe verification check error:", stripeError);
      }
    }

    res.json({ status: verification.status, verifiedAt: verification.verifiedAt });
  } catch (error) {
    console.error("Check verification status error:", error);
    res.status(500).json({ error: "Failed to check verification status" });
  }
});

// ========================================
// PROPERTY BOOKING (USER SIDE)
// ========================================

// Request a booking
router.post("/api/properties/:propertyId/book", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "You must be logged in to book" });
    }

    // Check ID verification
    const [verification] = await db
      .select()
      .from(userIdVerifications)
      .where(eq(userIdVerifications.userId, req.user?.id))
      .limit(1);

    if (!verification || verification.status !== "verified") {
      return res.status(403).json({ 
        error: "ID verification required",
        message: "You must verify your identity before booking a property",
        verificationStatus: verification?.status || "unverified",
      });
    }

    const propertyId = req.params.propertyId as string;
    const {
      checkInDate, checkOutDate, guests, guestMessage, specialRequests,
      guestFirstName, guestLastName, guestEmail, guestPhone,
    } = req.body;

    if (!checkInDate || !checkOutDate || !guestFirstName || !guestLastName || !guestEmail) {
      return res.status(400).json({ error: "Missing required booking fields" });
    }

    // Get property
    const [property] = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.id, propertyId),
        eq(properties.status, "approved"),
        eq(properties.isActive, true)
      ))
      .limit(1);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Check guest count
    if (guests > property.maxGuests) {
      return res.status(400).json({ error: `Maximum ${property.maxGuests} guests allowed` });
    }

    // Calculate nights
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < property.minNights) {
      return res.status(400).json({ error: `Minimum ${property.minNights} night(s) required` });
    }

    if (property.maxNights && nights > property.maxNights) {
      return res.status(400).json({ error: `Maximum ${property.maxNights} nights allowed` });
    }

    // Calculate pricing from availability entries
    let totalNightlyRate = 0;
    const dateList: string[] = [];
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().split("T")[0]);
    }

    // Fix #9 & #11: Use transaction for atomic booking creation
    const bookingResult = await db.transaction(async (trx) => {
      // Check each date's availability
      for (const date of dateList) {
        const [avail] = await trx
          .select()
          .from(propertyAvailability)
          .where(and(
            eq(propertyAvailability.propertyId, propertyId),
            eq(propertyAvailability.date, date),
            eq(propertyAvailability.isAvailable, true)
          ))
          .limit(1);

        if (!avail) {
          throw new Error(`Date ${date} is not available`);
        }

        // Apply gap night discount
        const rate = avail.isGapNight && avail.gapNightDiscount
          ? Math.round(avail.nightlyRate * (1 - avail.gapNightDiscount / 100))
          : avail.nightlyRate;
        totalNightlyRate += rate;
      }

      const cleaningFee = property.cleaningFee || 0;
      const serviceFee = Math.round(totalNightlyRate * 0.08);
      const totalPrice = totalNightlyRate + cleaningFee + serviceFee;

      // Create payment intent with manual capture
      let paymentIntentId = null;
      if (stripe) {
        try {
          const paymentIntent = await stripe.paymentIntents.create({
            amount: totalPrice,
            currency: "aud",
            capture_method: "manual",
            metadata: {
              propertyId,
              userId: req.user?.id,
              checkInDate,
              checkOutDate,
            },
          });
          paymentIntentId = paymentIntent.id;
        } catch (stripeError) {
          console.error("Stripe payment intent error:", stripeError);
          throw new Error("Failed to create payment authorization");
        }
      }

      // Create booking
      const bookingId = `PB-${uuidv4().substring(0, 8).toUpperCase()}`;
      const [booking] = await trx
        .insert(propertyBookings)
        .values({
          id: bookingId,
          propertyId,
          hostId: property.hostId,
          userId: req.user?.id,
          checkInDate,
          checkOutDate,
          nights,
          guests: guests || 1,
          nightlyRate: Math.round(totalNightlyRate / nights),
          cleaningFee,
          serviceFee,
          totalPrice,
          currency: "AUD",
          guestMessage: guestMessage || null,
          specialRequests: specialRequests || null,
          status: "PENDING_APPROVAL",
          stripePaymentIntentId: paymentIntentId,
          guestFirstName,
          guestLastName,
          guestEmail,
          guestPhone: guestPhone || null,
        })
        .returning();

      // Mark dates as unavailable
      for (const date of dateList) {
        await trx
          .update(propertyAvailability)
          .set({ isAvailable: false, updatedAt: new Date() })
          .where(and(
            eq(propertyAvailability.propertyId, propertyId),
            eq(propertyAvailability.date, date)
          ));
      }

      return { booking, paymentIntentId, totalNightlyRate, cleaningFee, serviceFee, totalPrice };
    });

    // Get host info for response time
    const [host] = await db
      .select({ averageResponseTime: airbnbHosts.averageResponseTime })
      .from(airbnbHosts)
      .where(eq(airbnbHosts.id, property.hostId))
      .limit(1);

    res.json({
      booking: bookingResult.booking,
      paymentIntentId: bookingResult.paymentIntentId,
      message: "Booking request submitted! The host will review your request.",
      estimatedResponseTime: host?.averageResponseTime || 60,
      pricing: {
        nightlyTotal: bookingResult.totalNightlyRate,
        cleaningFee: bookingResult.cleaningFee,
        serviceFee: bookingResult.serviceFee,
        total: bookingResult.totalPrice,
      },
    });
  } catch (error: any) {
    console.error("Book property error:", error);
    if (error.message?.includes("is not available")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// Get user's property bookings - with pagination limits
router.get("/api/auth/property-bookings", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Cap limit to prevent abuse (max 100 per request)
    const requestedLimit = parseInt(req.query.limit as string) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const offset = (page - 1) * limit;

    const bookingsList = await db
      .select()
      .from(propertyBookings)
      .where(eq(propertyBookings.userId, req.user?.id))
      .orderBy(desc(propertyBookings.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCount] = await db
      .select({ count: count() })
      .from(propertyBookings)
      .where(eq(propertyBookings.userId, req.user?.id));

    const enriched = await Promise.all(
      bookingsList.map(async (booking) => {
        const [property] = await db
          .select({
            title: properties.title,
            coverImage: properties.coverImage,
            city: properties.city,
            propertyType: properties.propertyType,
            checkInTime: properties.checkInTime,
            checkOutTime: properties.checkOutTime,
          })
          .from(properties)
          .where(eq(properties.id, booking.propertyId))
          .limit(1);

        const [host] = await db
          .select({
            name: airbnbHosts.name,
            profilePhoto: airbnbHosts.profilePhoto,
            averageResponseTime: airbnbHosts.averageResponseTime,
          })
          .from(airbnbHosts)
          .where(eq(airbnbHosts.id, booking.hostId))
          .limit(1);

        return {
          ...booking,
          property: property || null,
          host: host || null,
        };
      })
    );

    res.json({ 
      bookings: enriched,
      total: totalCount.count,
      page,
      limit,
      totalPages: Math.ceil(totalCount.count / limit)
    });
  } catch (error) {
    console.error("Get user property bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

export default router;
