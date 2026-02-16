import type { Express, Response } from "express";
import type { Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { authMiddleware, SESSION_COOKIE_NAME } from "./auth";
import { v4 as uuidv4 } from "uuid";
import { sendBookingConfirmationEmail, sendHotelInquiryNotification, sendWaitlistNotification } from "./email";
import { authRateLimit, bookingRateLimit, paymentRateLimit } from "./rate-limit";
import { createPaymentIntent, confirmPaymentSuccess, isStripeConfigured } from "./stripe";
import { registerUserAuthRoutes } from "./user-routes";
import { optionalUserAuthMiddleware } from "./user-auth";
import ownerRoutes from "./owner-routes";
import { registerAdminRoutes } from "./admin-routes";
import { registerAdminOpsRoutes } from "./admin-ops-routes";
import { db } from "./db";
import { supportTickets } from "@shared/schema";
import hostRoutes from "./host-routes";
import listingRoutes from "./listing-routes";
import propertyRoutes from "./property-routes";

// ========================================
// IN-MEMORY DEAL HOLDS (5 minute reservation)
// ========================================

interface DealHold {
  dealId: string;
  sessionId: string;
  expiresAt: Date;
}

const dealHolds = new Map<string, DealHold>(); // dealId -> hold
const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Fix #14: Periodic cleanup to prevent memory leak
setInterval(() => {
  cleanupExpiredHolds();
}, 60 * 1000); // Run every minute

function cleanupExpiredHolds() {
  const now = new Date();
  dealHolds.forEach((hold, dealId) => {
    if (hold.expiresAt < now) {
      dealHolds.delete(dealId);
    }
  });
}

function createDealHold(dealId: string, sessionId: string): boolean {
  cleanupExpiredHolds();
  
  const existingHold = dealHolds.get(dealId);
  if (existingHold && existingHold.sessionId !== sessionId && existingHold.expiresAt > new Date()) {
    return false; // Deal is held by someone else
  }
  
  dealHolds.set(dealId, {
    dealId,
    sessionId,
    expiresAt: new Date(Date.now() + HOLD_DURATION_MS),
  });
  return true;
}

function isDealHeld(dealId: string, excludeSessionId?: string): boolean {
  cleanupExpiredHolds();
  const hold = dealHolds.get(dealId);
  if (!hold) return false;
  if (excludeSessionId && hold.sessionId === excludeSessionId) return false;
  return hold.expiresAt > new Date();
}

function releaseDealHold(dealId: string) {
  dealHolds.delete(dealId);
}

function getHeldDealIds(excludeSessionId?: string): Set<string> {
  cleanupExpiredHolds();
  const heldIds = new Set<string>();
  const now = new Date();
  dealHolds.forEach((hold, dealId) => {
    if (excludeSessionId && hold.sessionId === excludeSessionId) return;
    if (hold.expiresAt > now) {
      heldIds.add(dealId);
    }
  });
  return heldIds;
}

// ========================================
// ERROR HANDLING UTILITIES
// ========================================

const MAX_STRING_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 20;

function sendError(res: Response, status: number, message: string, field?: string) {
  res.status(status).json({ error: true, message, field });
}

function sanitizeString(input: string | string[] | undefined | null, maxLength: number = MAX_STRING_LENGTH): string {
  if (!input) return "";
  const str = Array.isArray(input) ? input[0] : input;
  return String(str || "").trim().slice(0, maxLength);
}

function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  if (error instanceof Error) {
    console.error(`[${timestamp}] ${context}:`, error.message);
  } else {
    console.error(`[${timestamp}] ${context}:`, error);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========================================
  // USER AUTHENTICATION ROUTES
  // ========================================
  registerUserAuthRoutes(app);

  // Serve uploaded photos statically
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  // ========================================
  // OWNER ROUTES (Auto-listing rules, etc.)
  // ========================================
  app.use(ownerRoutes);
  
  // ========================================
  // ADMIN ROUTES (Obfuscated path for security)
  // ========================================
  registerAdminRoutes(app);
  registerAdminOpsRoutes(app);
  
  // ========================================
  // PUBLIC CONTACT / SUPPORT REQUEST
  // ========================================

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, subject, message, category } = req.body;
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "Name, email, subject, and message are required" });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      await db.insert(supportTickets).values({
        id: uuidv4(),
        userId: null,
        subject: `[Contact] ${subject}`,
        category: category || "other",
        priority: "medium",
        status: "open",
        messages: [{
          sender: `${name} (${email})`,
          message,
          timestamp: new Date().toISOString(),
          isInternal: false,
        }],
      });

      res.json({ success: true, message: "Your message has been sent. We'll get back to you soon!" });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ message: "Failed to submit your request. Please try again." });
    }
  });

  // ========================================
  // EXISTING PUBLIC ROUTES
  // ========================================
  
  app.get(api.deals.list.path, async (req, res) => {
    try {
      const search = sanitizeString(req.query.search as string | undefined, MAX_NAME_LENGTH);
      const category = sanitizeString(req.query.category as string | undefined, MAX_NAME_LENGTH);
      const sort = sanitizeString(req.query.sort as string | undefined, 20);
      const startDate = sanitizeString(req.query.startDate as string | undefined, 10);
      const endDate = sanitizeString(req.query.endDate as string | undefined, 10);
      const nightsStr = sanitizeString(req.query.nights as string | undefined, 2);
      const minGuestsStr = sanitizeString(req.query.minGuests as string | undefined, 2);
      const sessionId = req.ip || "unknown";
      
      let deals = await storage.getDeals(search || undefined, category || undefined, sort || undefined);
      
      // Filter out deals held by other users
      const heldDealIds = getHeldDealIds(sessionId);
      deals = deals.filter(deal => !heldDealIds.has(deal.id));
      
      // Filter by date range
      if (startDate) {
        deals = deals.filter(deal => deal.checkInDate >= startDate);
      }
      if (endDate) {
        deals = deals.filter(deal => deal.checkInDate <= endDate);
      }
      
      // Filter by number of nights
      if (nightsStr) {
        const nights = parseInt(nightsStr, 10);
        if (!isNaN(nights) && nights > 0) {
          deals = deals.filter(deal => deal.nights === nights);
        }
      }
      
      // Filter by minimum guests (room capacity)
      if (minGuestsStr) {
        const minGuests = parseInt(minGuestsStr, 10);
        if (!isNaN(minGuests) && minGuests > 0) {
          deals = deals.filter(deal => (deal.maxGuests || 2) >= minGuests);
        }
      }
      
      res.json(deals);
    } catch (err) {
      logError("GET /api/deals", err);
      sendError(res, 500, "Failed to fetch deals");
    }
  });

  app.get(api.deals.get.path, async (req, res) => {
    try {
      const id = sanitizeString(req.params.id, 100);
      if (!id) {
        return sendError(res, 400, "Deal ID is required", "id");
      }
      const deal = await storage.getDeal(id);
      if (!deal) {
        return sendError(res, 404, "Deal not found");
      }
      res.json(deal);
    } catch (err) {
      logError("GET /api/deals/:id", err);
      sendError(res, 500, "Failed to fetch deal");
    }
  });

  app.post(api.waitlist.submit.path, async (req, res) => {
    try {
      const input = api.waitlist.submit.input.parse(req.body);
      const sanitizedInput = {
        ...input,
        email: sanitizeString(input.email, MAX_EMAIL_LENGTH).toLowerCase(),
        preferredCity: input.preferredCity ? sanitizeString(input.preferredCity, MAX_NAME_LENGTH) : undefined,
      };
      await storage.createWaitlistEntry(sanitizedInput);
      
      // Send notification email (don't await - fire and forget)
      sendWaitlistNotification(sanitizedInput).catch(err => 
        console.error('Failed to send waitlist notification:', err)
      );
      
      res.status(201).json({ success: true, message: "Joined waitlist successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/waitlist", err);
      sendError(res, 500, "Failed to join waitlist");
    }
  });

  app.post(api.hotelInquiries.submit.path, async (req, res) => {
    try {
      const input = api.hotelInquiries.submit.input.parse(req.body);
      const sanitizedInput = {
        ...input,
        hotelName: sanitizeString(input.hotelName, MAX_NAME_LENGTH),
        city: sanitizeString(input.city, MAX_NAME_LENGTH),
        contactEmail: sanitizeString(input.contactEmail, MAX_EMAIL_LENGTH).toLowerCase(),
        gapNightsPerWeek: sanitizeString(input.gapNightsPerWeek, 50),
      };
      await storage.createHotelInquiry(sanitizedInput);
      
      // Send notification email (don't await - fire and forget)
      sendHotelInquiryNotification(sanitizedInput).catch(err => 
        console.error('Failed to send hotel inquiry notification:', err)
      );
      
      res.status(201).json({ success: true, message: "Inquiry submitted successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/hotel-inquiries", err);
      sendError(res, 500, "Failed to submit inquiry");
    }
  });

  app.post("/api/verify-partner", (req, res) => {
    try {
      const { password } = req.body;
      const partnerPassword = process.env.PARTNER_ACCESS_PASSWORD;
      
      if (!partnerPassword) {
        return sendError(res, 500, "Partner access not configured");
      }
      
      if (!password || typeof password !== "string") {
        return sendError(res, 400, "Password is required", "password");
      }
      
      const valid = password === partnerPassword;
      res.json({ valid });
    } catch (err) {
      logError("POST /api/verify-partner", err);
      sendError(res, 500, "Failed to verify partner access");
    }
  });

  // ========================================
  // AUTH ROUTES
  // ========================================
  
  const loginSchema = z.object({
    email: z.string().email("Invalid email address").max(MAX_EMAIL_LENGTH),
    password: z.string().min(6, "Password must be at least 6 characters").max(128),
  });

  const registerSchema = loginSchema.extend({
    name: z.string().max(MAX_NAME_LENGTH).optional(),
  });

  app.post("/api/auth/register", authRateLimit, async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      
      const sanitizedEmail = sanitizeString(email, MAX_EMAIL_LENGTH).toLowerCase();
      const sanitizedName = name ? sanitizeString(name, MAX_NAME_LENGTH) : undefined;
      
      const existingOwner = await storage.getOwnerByEmail(sanitizedEmail);
      if (existingOwner) {
        return sendError(res, 400, "Email already registered", "email");
      }
      
      const owner = await storage.createOwner(sanitizedEmail, password, sanitizedName);
      if (!owner) {
        return sendError(res, 500, "Failed to create account");
      }
      
      const sessionId = await storage.createSession(owner.id);
      
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      res.status(201).json({ 
        success: true, 
        owner: { id: owner.id, email: owner.email, name: owner.name } 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/auth/register", err);
      sendError(res, 500, "Failed to register");
    }
  });

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const sanitizedEmail = sanitizeString(email, MAX_EMAIL_LENGTH).toLowerCase();
      
      const owner = await storage.verifyPassword(sanitizedEmail, password);
      if (!owner) {
        return sendError(res, 401, "Invalid email or password");
      }
      
      const sessionId = await storage.createSession(owner.id);
      
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      
      res.json({ 
        success: true, 
        owner: { id: owner.id, email: owner.email, name: owner.name } 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/auth/login", err);
      sendError(res, 500, "Failed to login");
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      res.clearCookie(SESSION_COOKIE_NAME);
      res.json({ success: true });
    } catch (err) {
      logError("POST /api/auth/logout", err);
      res.clearCookie(SESSION_COOKIE_NAME);
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      res.json({ 
        id: owner.id, 
        email: owner.email, 
        name: owner.name 
      });
    } catch (err) {
      logError("GET /api/auth/me", err);
      sendError(res, 500, "Failed to fetch user info");
    }
  });

  // ========================================
  // OWNER HOTEL ROUTES (Protected)
  // ========================================
  
  const hotelSchema = z.object({
    chainName: z.string().max(MAX_NAME_LENGTH).optional(),
    name: z.string().min(1, "Hotel name is required").max(MAX_NAME_LENGTH),
    description: z.string().max(MAX_STRING_LENGTH).optional(),
    address: z.string().max(500).optional(),
    city: z.string().min(1, "City is required").max(MAX_NAME_LENGTH),
    state: z.string().max(MAX_NAME_LENGTH).optional(),
    country: z.string().max(MAX_NAME_LENGTH).default("Australia"),
    latitude: z.string().max(50).optional(),
    longitude: z.string().max(50).optional(),
    starRating: z.number().min(1).max(5).default(3),
    amenities: z.array(z.string().max(100)).max(50).optional(),
    images: z.array(z.string().max(500)).max(20).optional(),
    contactEmail: z.string().email().max(MAX_EMAIL_LENGTH).optional(),
  });

  app.get("/api/owner/hotels", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      const hotels = await storage.getOwnerHotels(owner.id);
      res.json(hotels);
    } catch (err) {
      logError("GET /api/owner/hotels", err);
      sendError(res, 500, "Failed to fetch hotels");
    }
  });

  app.post("/api/owner/hotels", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const data = hotelSchema.parse(req.body);
      const sanitizedData = {
        ...data,
        name: sanitizeString(data.name, MAX_NAME_LENGTH),
        chainName: data.chainName ? sanitizeString(data.chainName, MAX_NAME_LENGTH) : undefined,
        description: data.description ? sanitizeString(data.description, MAX_STRING_LENGTH) : undefined,
        address: data.address ? sanitizeString(data.address, 500) : undefined,
        city: sanitizeString(data.city, MAX_NAME_LENGTH),
        state: data.state ? sanitizeString(data.state, MAX_NAME_LENGTH) : undefined,
        country: sanitizeString(data.country, MAX_NAME_LENGTH),
        contactEmail: data.contactEmail ? sanitizeString(data.contactEmail, MAX_EMAIL_LENGTH).toLowerCase() : undefined,
      };
      
      const hotel = await storage.createHotel({
        id: uuidv4(),
        ownerId: owner.id,
        ...sanitizedData,
        isActive: true,
      });
      res.status(201).json(hotel);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/owner/hotels", err);
      sendError(res, 500, "Failed to create hotel");
    }
  });

  app.get("/api/owner/hotels/:hotelId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      res.json(hotel);
    } catch (err) {
      logError("GET /api/owner/hotels/:hotelId", err);
      sendError(res, 500, "Failed to fetch hotel");
    }
  });

  app.put("/api/owner/hotels/:hotelId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const data = hotelSchema.partial().parse(req.body);
      const sanitizedData: Record<string, unknown> = {};
      
      if (data.name !== undefined) sanitizedData.name = sanitizeString(data.name, MAX_NAME_LENGTH);
      if (data.chainName !== undefined) sanitizedData.chainName = sanitizeString(data.chainName, MAX_NAME_LENGTH);
      if (data.description !== undefined) sanitizedData.description = sanitizeString(data.description, MAX_STRING_LENGTH);
      if (data.address !== undefined) sanitizedData.address = sanitizeString(data.address, 500);
      if (data.city !== undefined) sanitizedData.city = sanitizeString(data.city, MAX_NAME_LENGTH);
      if (data.state !== undefined) sanitizedData.state = sanitizeString(data.state, MAX_NAME_LENGTH);
      if (data.country !== undefined) sanitizedData.country = sanitizeString(data.country, MAX_NAME_LENGTH);
      if (data.contactEmail !== undefined) sanitizedData.contactEmail = sanitizeString(data.contactEmail, MAX_EMAIL_LENGTH).toLowerCase();
      if (data.latitude !== undefined) sanitizedData.latitude = data.latitude;
      if (data.longitude !== undefined) sanitizedData.longitude = data.longitude;
      if (data.starRating !== undefined) sanitizedData.starRating = data.starRating;
      if (data.amenities !== undefined) sanitizedData.amenities = data.amenities;
      if (data.images !== undefined) sanitizedData.images = data.images;
      
      const updated = await storage.updateHotel(hotelId, sanitizedData);
      if (!updated) {
        return sendError(res, 404, "Hotel not found");
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("PUT /api/owner/hotels/:hotelId", err);
      sendError(res, 500, "Failed to update hotel");
    }
  });

  app.delete("/api/owner/hotels/:hotelId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      await storage.deactivateHotel(hotelId);
      res.json({ success: true, message: "Hotel deactivated" });
    } catch (err) {
      logError("DELETE /api/owner/hotels/:hotelId", err);
      sendError(res, 500, "Failed to deactivate hotel");
    }
  });

  // ========================================
  // ROOM TYPE ROUTES (Protected)
  // ========================================
  
  const roomTypeSchema = z.object({
    name: z.string().min(1, "Room type name is required").max(MAX_NAME_LENGTH),
    inventory: z.number().min(1).max(10000).default(1),
  });

  app.get("/api/owner/hotels/:hotelId/room-types", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const roomTypes = await storage.getHotelRoomTypes(hotelId);
      res.json(roomTypes);
    } catch (err) {
      logError("GET /api/owner/hotels/:hotelId/room-types", err);
      sendError(res, 500, "Failed to fetch room types");
    }
  });

  app.post("/api/owner/hotels/:hotelId/room-types", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const data = roomTypeSchema.parse(req.body);
      const sanitizedData = {
        ...data,
        name: sanitizeString(data.name, MAX_NAME_LENGTH),
      };
      
      const roomType = await storage.createRoomType({
        id: uuidv4(),
        hotelId: hotelId,
        ...sanitizedData,
      });
      res.status(201).json(roomType);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/owner/hotels/:hotelId/room-types", err);
      sendError(res, 500, "Failed to create room type");
    }
  });

  app.put("/api/owner/room-types/:roomTypeId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const roomTypeId = sanitizeString(req.params.roomTypeId, 100);
      if (!roomTypeId) {
        return sendError(res, 400, "Room type ID is required", "roomTypeId");
      }
      
      const allRoomTypes = await Promise.all(
        (await storage.getOwnerHotels(owner.id)).map(h => storage.getHotelRoomTypes(h.id))
      );
      const ownerRoomTypes = allRoomTypes.flat();
      const roomType = ownerRoomTypes.find(rt => rt.id === roomTypeId);
      
      if (!roomType) {
        return sendError(res, 404, "Room type not found");
      }
      
      const data = roomTypeSchema.partial().parse(req.body);
      const sanitizedData: Record<string, unknown> = {};
      if (data.name !== undefined) sanitizedData.name = sanitizeString(data.name, MAX_NAME_LENGTH);
      if (data.inventory !== undefined) sanitizedData.inventory = data.inventory;
      
      const updated = await storage.updateRoomType(roomTypeId, sanitizedData);
      if (!updated) {
        return sendError(res, 404, "Room type not found");
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("PUT /api/owner/room-types/:roomTypeId", err);
      sendError(res, 500, "Failed to update room type");
    }
  });

  app.delete("/api/owner/room-types/:roomTypeId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const roomTypeId = sanitizeString(req.params.roomTypeId, 100);
      if (!roomTypeId) {
        return sendError(res, 400, "Room type ID is required", "roomTypeId");
      }
      
      const allRoomTypes = await Promise.all(
        (await storage.getOwnerHotels(owner.id)).map(h => storage.getHotelRoomTypes(h.id))
      );
      const ownerRoomTypes = allRoomTypes.flat();
      const roomType = ownerRoomTypes.find(rt => rt.id === roomTypeId);
      
      if (!roomType) {
        return sendError(res, 404, "Room type not found");
      }
      
      await storage.deleteRoomType(roomTypeId);
      res.json({ success: true });
    } catch (err) {
      logError("DELETE /api/owner/room-types/:roomTypeId", err);
      sendError(res, 500, "Failed to delete room type");
    }
  });

  // ========================================
  // AVAILABILITY ROUTES (Protected)
  // ========================================
  
  const availabilitySchema = z.object({
    available: z.number().min(0).max(10000),
    barRate: z.number().min(0).max(100000),
    minStay: z.number().min(1).max(365).default(1),
    closedToArrival: z.boolean().default(false),
  });

  const bulkAvailabilitySchema = availabilitySchema.extend({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  });

  app.get("/api/owner/room-types/:roomTypeId/availability", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const roomTypeId = sanitizeString(req.params.roomTypeId, 100);
      const start = sanitizeString(req.query.start as string, 10);
      const end = sanitizeString(req.query.end as string, 10);
      
      if (!start || !end) {
        return sendError(res, 400, "start and end query params required");
      }
      
      const availability = await storage.getAvailability(roomTypeId, start, end);
      res.json(availability);
    } catch (err) {
      logError("GET /api/owner/room-types/:roomTypeId/availability", err);
      sendError(res, 500, "Failed to fetch availability");
    }
  });

  app.put("/api/owner/room-types/:roomTypeId/availability/bulk", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const roomTypeId = sanitizeString(req.params.roomTypeId, 100);
      if (!roomTypeId) {
        return sendError(res, 400, "Room type ID is required", "roomTypeId");
      }
      
      const { startDate, endDate, ...data } = bulkAvailabilitySchema.parse(req.body);
      await storage.bulkUpdateAvailability(roomTypeId, startDate, endDate, data);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("PUT /api/owner/room-types/:roomTypeId/availability/bulk", err);
      sendError(res, 500, "Failed to update availability");
    }
  });

  app.put("/api/owner/room-types/:roomTypeId/availability/:date", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const roomTypeId = sanitizeString(req.params.roomTypeId, 100);
      const date = sanitizeString(req.params.date, 10);
      
      if (!roomTypeId) {
        return sendError(res, 400, "Room type ID is required", "roomTypeId");
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendError(res, 400, "Invalid date format", "date");
      }
      
      const data = availabilitySchema.parse(req.body);
      const availability = await storage.upsertAvailability({
        id: uuidv4(),
        roomTypeId: roomTypeId,
        date: date,
        ...data,
      });
      res.json(availability);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("PUT /api/owner/room-types/:roomTypeId/availability/:date", err);
      sendError(res, 500, "Failed to update availability");
    }
  });

  // ========================================
  // ORPHAN NIGHT DETECTION & DEAL PUBLISHING (Protected)
  // ========================================
  
  app.post("/api/owner/hotels/:hotelId/deals/generate-orphans", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const roomTypes = await storage.getHotelRoomTypes(hotelId);
      const candidates: any[] = [];
      
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);
      
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);
      
      const startStr = today.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const existingDeals = await storage.getHotelDeals(hotelId);
      const publishedDealKeys = new Set(
        existingDeals.map(d => `${d.roomTypeId}_${d.date}`)
      );
      
      for (const roomType of roomTypes) {
        const availability = await storage.getAvailability(roomType.id, startStr, endStr);
        
        availability.sort((a, b) => a.date.localeCompare(b.date));
        
        const processedIndices = new Set<number>();
        
        for (let i = 0; i < availability.length; i++) {
          if (processedIndices.has(i)) continue;
          
          const day = availability[i];
          if (!day || day.available <= 0) continue;
          
          const prev = i > 0 ? availability[i - 1] : null;
          const prevUnavailable = !prev || prev.available <= 0;
          
          if (!prevUnavailable) continue;
          
          let gapDuration = 1;
          let gapEndIndex = i;
          let totalBarRate = day.barRate;
          let minAvailable = day.available;
          
          for (let j = i + 1; j < availability.length; j++) {
            const nextDay = availability[j];
            if (!nextDay || nextDay.available <= 0) break;
            
            gapDuration++;
            gapEndIndex = j;
            totalBarRate += nextDay.barRate;
            minAvailable = Math.min(minAvailable, nextDay.available);
            processedIndices.add(j);
          }
          
          const afterGap = gapEndIndex + 1 < availability.length ? availability[gapEndIndex + 1] : null;
          const afterGapUnavailable = !afterGap || afterGap.available <= 0;
          
          if (!afterGapUnavailable) continue;
          
          let hasExistingDeal = false;
          for (let k = i; k <= gapEndIndex; k++) {
            const avail = availability[k];
            if (avail) {
              const dealKey = `${roomType.id}_${avail.date}`;
              if (publishedDealKeys.has(dealKey)) {
                hasExistingDeal = true;
                break;
              }
            }
          }
          if (hasExistingDeal) continue;
          
          let reason = "";
          let suggestedDiscount = 25;
          
          if (gapDuration === 1) {
            reason = "1-night gap: isolated night between bookings";
            suggestedDiscount = 35;
          } else if (gapDuration === 2) {
            reason = "2-night gap: short window between bookings";
            suggestedDiscount = 30;
          } else {
            reason = `${gapDuration}-night gap: window between bookings`;
            suggestedDiscount = 25;
          }
          
          const avgBarRate = Math.round(totalBarRate / gapDuration);
          const gapStartDate = availability[i]?.date;
          const gapEndDateStr = availability[gapEndIndex]?.date;
          
          if (gapStartDate && gapEndDateStr) {
            candidates.push({
              id: uuidv4(),
              hotelId: hotel.id,
              roomTypeId: roomType.id,
              roomTypeName: roomType.name,
              date: gapStartDate,
              gapStartDate,
              gapEndDate: gapEndDateStr,
              gapDuration,
              barRate: avgBarRate,
              available: minAvailable,
              qtyToSell: 1,
              reason,
              suggestedDiscountPercent: suggestedDiscount,
            });
          }
          
          processedIndices.add(i);
        }
      }
      
      res.json(candidates);
    } catch (err) {
      logError("POST /api/owner/hotels/:hotelId/deals/generate-orphans", err);
      sendError(res, 500, "Failed to generate orphan nights");
    }
  });

  const publishDealSchema = z.object({
    deals: z.array(z.object({
      roomTypeId: z.string().max(100),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      barRate: z.number().min(0).max(100000),
      dealPrice: z.number().min(0).max(100000),
      discountPercent: z.number().min(0).max(100),
      reason: z.string().max(500).optional(),
    })).max(100),
  });

  app.post("/api/owner/hotels/:hotelId/deals/publish", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const hotelRoomTypes = await storage.getHotelRoomTypes(hotel.id);
      const roomTypeMap = new Map(hotelRoomTypes.map(rt => [rt.id, rt]));
      
      const { deals: dealsToPublish } = publishDealSchema.parse(req.body);
      const createdDeals: any[] = [];
      
      for (const deal of dealsToPublish) {
        const publishedDealId = uuidv4();
        
        const created = await storage.createPublishedDeal({
          id: publishedDealId,
          hotelId: hotel.id,
          roomTypeId: deal.roomTypeId,
          date: deal.date,
          barRate: deal.barRate,
          dealPrice: deal.dealPrice,
          discountPercent: deal.discountPercent,
          reason: deal.reason ? sanitizeString(deal.reason, 500) : undefined,
          status: "PUBLISHED",
        });
        createdDeals.push(created);
        
        const roomType = roomTypeMap.get(deal.roomTypeId);
        const checkInDate = deal.date;
        const checkOutDate = new Date(deal.date);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        
        const consumerDealId = `portal_${publishedDealId.substring(0, 8)}`;
        
        await storage.createDeal({
          id: consumerDealId,
          hotelName: hotel.name,
          location: `${hotel.city}, ${hotel.country}`,
          stars: hotel.starRating,
          rating: "4.5",
          reviewCount: 0,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          nights: 1,
          roomType: roomType?.name || "Standard Room",
          imageUrl: hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
          normalPrice: deal.barRate,
          dealPrice: deal.dealPrice,
          currency: "AUD",
          dealScore: Math.round(deal.discountPercent * 2.5),
          categoryTags: ["All Deals", "Gap Night"],
          cancellation: "Non-refundable",
          whyCheap: deal.reason || "Gap night: 1-night orphan slot between longer bookings.",
          latitude: hotel.latitude || null,
          longitude: hotel.longitude || null,
          amenities: hotel.amenities || [],
          nearbyHighlight: null,
        });
      }
      
      res.status(201).json({ success: true, deals: createdDeals });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/owner/hotels/:hotelId/deals/publish", err);
      sendError(res, 500, "Failed to publish deals");
    }
  });

  app.get("/api/owner/hotels/:hotelId/deals", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const deals = await storage.getHotelDeals(hotelId);
      res.json(deals);
    } catch (err) {
      logError("GET /api/owner/hotels/:hotelId/deals", err);
      sendError(res, 500, "Failed to fetch deals");
    }
  });

  app.post("/api/owner/hotels/:hotelId/deals/unpublish", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const { dealIds } = req.body;
      if (!Array.isArray(dealIds)) {
        return sendError(res, 400, "dealIds array required", "dealIds");
      }
      
      if (dealIds.length > 100) {
        return sendError(res, 400, "Maximum 100 deals can be unpublished at once");
      }
      
      const sanitizedIds = dealIds.map(id => sanitizeString(String(id), 100)).filter(Boolean);
      await storage.unpublishDeals(sanitizedIds);
      res.json({ success: true });
    } catch (err) {
      logError("POST /api/owner/hotels/:hotelId/deals/unpublish", err);
      sendError(res, 500, "Failed to unpublish deals");
    }
  });

  const updateDealSchema = z.object({
    dealPrice: z.number().min(0).max(100000).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  });

  app.patch("/api/owner/hotels/:hotelId/deals/:dealId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      const dealId = sanitizeString(req.params.dealId, 100);
      
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      if (!dealId) {
        return sendError(res, 400, "Deal ID is required", "dealId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const updates = updateDealSchema.parse(req.body);
      const updated = await storage.updatePublishedDeal(dealId, updates);
      if (!updated) {
        return sendError(res, 404, "Deal not found");
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, "Invalid data", err.errors[0].path.join('.'));
      }
      logError("PATCH /api/owner/hotels/:hotelId/deals/:dealId", err);
      sendError(res, 500, "Failed to update deal");
    }
  });

  app.delete("/api/owner/hotels/:hotelId/deals/:dealId", authMiddleware, async (req, res) => {
    try {
      const owner = req.owner;
      if (!owner) {
        return sendError(res, 401, "Not authenticated");
      }
      
      const hotelId = sanitizeString(req.params.hotelId, 100);
      const dealId = sanitizeString(req.params.dealId, 100);
      
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      if (!dealId) {
        return sendError(res, 400, "Deal ID is required", "dealId");
      }
      
      const hotel = await storage.getHotel(hotelId);
      if (!hotel || hotel.ownerId !== owner.id) {
        return sendError(res, 404, "Hotel not found");
      }
      
      await storage.deletePublishedDeal(dealId);
      
      const consumerDealId = `portal_${dealId.substring(0, 8)}`;
      try {
        await storage.deleteDeal(consumerDealId);
      } catch (e) {
        // Consumer deal may not exist, ignore error
      }
      
      res.json({ success: true });
    } catch (err) {
      logError("DELETE /api/owner/hotels/:hotelId/deals/:dealId", err);
      sendError(res, 500, "Failed to delete deal");
    }
  });

  // ========================================
  // PUBLIC API ROUTES (Consumer)
  // ========================================
  
  app.get("/api/public/hotels", async (req, res) => {
    try {
      const hotels = await storage.getPublicHotels();
      res.json(hotels);
    } catch (err) {
      logError("GET /api/public/hotels", err);
      sendError(res, 500, "Failed to fetch hotels");
    }
  });

  app.get("/api/public/hotels/:hotelId", async (req, res) => {
    try {
      const hotelId = sanitizeString(req.params.hotelId, 100);
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const hotel = await storage.getPublicHotel(hotelId);
      if (!hotel) {
        return sendError(res, 404, "Hotel not found");
      }
      
      const roomTypes = await storage.getHotelRoomTypes(hotel.id);
      res.json({ ...hotel, roomTypes });
    } catch (err) {
      logError("GET /api/public/hotels/:hotelId", err);
      sendError(res, 500, "Failed to fetch hotel");
    }
  });

  app.get("/api/public/hotels/:hotelId/deal-dates", async (req, res) => {
    try {
      const hotelId = sanitizeString(req.params.hotelId, 100);
      const start = sanitizeString(req.query.start as string, 10);
      const end = sanitizeString(req.query.end as string, 10);
      
      if (!hotelId) {
        return sendError(res, 400, "Hotel ID is required", "hotelId");
      }
      
      const deals = await storage.getPublicDealsByHotel(hotelId, start || undefined, end || undefined);
      res.json(deals);
    } catch (err) {
      logError("GET /api/public/hotels/:hotelId/deal-dates", err);
      sendError(res, 500, "Failed to fetch deal dates");
    }
  });

  app.get("/api/public/deals", async (req, res) => {
    try {
      const groupedDeals = await storage.getPublicDealsGrouped();
      res.json(groupedDeals);
    } catch (err) {
      logError("GET /api/public/deals", err);
      sendError(res, 500, "Failed to fetch deals");
    }
  });

  // ========================================
  // STRIPE PAYMENT ROUTES
  // ========================================

  app.get("/api/stripe/config", (req, res) => {
    res.json({
      configured: isStripeConfigured(),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    });
  });

  const createPaymentIntentSchema = z.object({
    amount: z.number().min(100).max(100000000), // Min $1, Max $1M in cents
    currency: z.string().max(3).default("aud"),
    dealId: z.string().max(100),
    hotelName: z.string().max(MAX_NAME_LENGTH),
    guestEmail: z.string().email().max(MAX_EMAIL_LENGTH),
  });

  app.post("/api/stripe/create-payment-intent", paymentRateLimit, async (req, res) => {
    try {
      if (!isStripeConfigured()) {
        return sendError(res, 503, "Payment processing not configured");
      }

      const data = createPaymentIntentSchema.parse(req.body);
      const sessionId = req.ip || "unknown";
      
      // Check if deal is already booked
      const isBooked = await storage.isDealBooked(data.dealId);
      if (isBooked) {
        return sendError(res, 409, "This deal has already been booked");
      }
      
      // Try to create/extend hold for this deal
      const holdCreated = createDealHold(data.dealId, sessionId);
      if (!holdCreated) {
        return sendError(res, 409, "This deal is currently being booked by another user. Please try again in a few minutes.");
      }
      
      const paymentIntent = await createPaymentIntent(
        data.amount,
        data.currency,
        {
          dealId: data.dealId,
          hotelName: data.hotelName,
          guestEmail: data.guestEmail,
        }
      );

      if (!paymentIntent) {
        releaseDealHold(data.dealId); // Release hold on failure
        return sendError(res, 500, "Failed to create payment intent");
      }

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/stripe/create-payment-intent", err);
      sendError(res, 500, "Failed to create payment intent");
    }
  });

  // ========================================
  // BOOKING ROUTES
  // ========================================
  
  const bookingSchema = z.object({
    dealId: z.string().max(100),
    hotelName: z.string().max(MAX_NAME_LENGTH),
    roomType: z.string().max(MAX_NAME_LENGTH),
    checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nights: z.number().min(1).max(365),
    guestFirstName: z.string().min(1).max(MAX_NAME_LENGTH),
    guestLastName: z.string().min(1).max(MAX_NAME_LENGTH),
    guestEmail: z.string().email().max(MAX_EMAIL_LENGTH),
    guestPhone: z.string().min(8).max(MAX_PHONE_LENGTH),
    guestCountryCode: z.string().max(10).default("+61"),
    specialRequests: z.string().max(MAX_STRING_LENGTH).optional(),
    totalPrice: z.number().min(0).max(1000000),
    currency: z.string().max(10).default("$"),
    paymentIntentId: z.string().max(100).optional(),
  });

  app.post("/api/bookings", bookingRateLimit, optionalUserAuthMiddleware, async (req, res) => {
    try {
      const data = bookingSchema.parse(req.body);
      
      // Get user ID if logged in
      const userId = req.user?.id || null;
      
      const sanitizedData = {
        ...data,
        userId,
        dealId: sanitizeString(data.dealId, 100),
        hotelName: sanitizeString(data.hotelName, MAX_NAME_LENGTH),
        roomType: sanitizeString(data.roomType, MAX_NAME_LENGTH),
        guestFirstName: sanitizeString(data.guestFirstName, MAX_NAME_LENGTH),
        guestLastName: sanitizeString(data.guestLastName, MAX_NAME_LENGTH),
        guestEmail: sanitizeString(data.guestEmail, MAX_EMAIL_LENGTH).toLowerCase(),
        guestPhone: sanitizeString(data.guestPhone, MAX_PHONE_LENGTH),
        guestCountryCode: sanitizeString(data.guestCountryCode, 10),
        specialRequests: data.specialRequests ? sanitizeString(data.specialRequests, MAX_STRING_LENGTH) : undefined,
        currency: sanitizeString(data.currency, 10),
        paymentIntentId: data.paymentIntentId ? sanitizeString(data.paymentIntentId, 100) : undefined,
      };
      
      // Verify payment if Stripe is configured and paymentIntentId provided
      if (isStripeConfigured() && sanitizedData.paymentIntentId) {
        const paymentSuccess = await confirmPaymentSuccess(sanitizedData.paymentIntentId);
        if (!paymentSuccess) {
          return sendError(res, 400, "Payment not completed. Please complete payment first.", "payment");
        }
      }
      
      const isBooked = await storage.isDealBooked(sanitizedData.dealId);
      if (isBooked) {
        return sendError(res, 400, "This deal has already been booked", "dealId");
      }
      
      const bookingId = `GN${Date.now()}`;
      
      const booking = await storage.createBooking({
        id: bookingId,
        ...sanitizedData,
        status: "CONFIRMED",
        emailSent: false,
      });
      
      // Release the hold after successful booking
      releaseDealHold(sanitizedData.dealId);
      
      sendBookingConfirmationEmail(booking)
        .then(async (sent) => {
          if (sent) {
            await storage.updateBookingEmailSent(bookingId);
            console.log(`Confirmation email sent for booking ${bookingId}`);
          }
        })
        .catch((err) => {
          logError(`Email send failed for booking ${bookingId}`, err);
        });
      
      res.status(201).json({ 
        success: true, 
        booking,
        message: "Booking confirmed successfully"
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join('.'));
      }
      logError("POST /api/bookings", err);
      sendError(res, 500, "Failed to create booking");
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const id = sanitizeString(req.params.id, 100);
      if (!id) {
        return sendError(res, 400, "Booking ID is required", "id");
      }
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return sendError(res, 404, "Booking not found");
      }
      res.json(booking);
    } catch (err) {
      logError("GET /api/bookings/:id", err);
      sendError(res, 500, "Failed to fetch booking");
    }
  });

  app.get("/api/deals/:dealId/booked", async (req, res) => {
    try {
      const dealId = sanitizeString(req.params.dealId, 100);
      if (!dealId) {
        return sendError(res, 400, "Deal ID is required", "dealId");
      }
      
      const isBooked = await storage.isDealBooked(dealId);
      res.json({ booked: isBooked });
    } catch (err) {
      logError("GET /api/deals/:dealId/booked", err);
      sendError(res, 500, "Failed to check booking status");
    }
  });

  // Hold a deal when entering booking page (5 minute reservation)
  app.post("/api/deals/:dealId/hold", async (req, res) => {
    try {
      const dealId = sanitizeString(req.params.dealId, 100);
      if (!dealId) {
        return sendError(res, 400, "Deal ID is required", "dealId");
      }
      
      const sessionId = req.ip || "unknown";
      
      // Check if already booked
      const isBooked = await storage.isDealBooked(dealId);
      if (isBooked) {
        return sendError(res, 409, "This deal has already been booked");
      }
      
      // Try to create hold
      const holdCreated = createDealHold(dealId, sessionId);
      if (!holdCreated) {
        return sendError(res, 409, "This deal is currently being booked by another user");
      }
      
      res.json({ 
        success: true, 
        message: "Deal held for 5 minutes",
        expiresIn: HOLD_DURATION_MS / 1000 
      });
    } catch (err) {
      logError("POST /api/deals/:dealId/hold", err);
      sendError(res, 500, "Failed to hold deal");
    }
  });

  // Release a hold (e.g., when user leaves booking page)
  app.delete("/api/deals/:dealId/hold", async (req, res) => {
    try {
      const dealId = sanitizeString(req.params.dealId, 100);
      if (!dealId) {
        return sendError(res, 400, "Deal ID is required", "dealId");
      }
      
      releaseDealHold(dealId);
      res.json({ success: true });
    } catch (err) {
      logError("DELETE /api/deals/:dealId/hold", err);
      sendError(res, 500, "Failed to release hold");
    }
  });

  // Check deal availability (booked or held by others)
  app.get("/api/deals/:dealId/availability", async (req, res) => {
    try {
      const dealId = sanitizeString(req.params.dealId, 100);
      if (!dealId) {
        return sendError(res, 400, "Deal ID is required", "dealId");
      }
      
      const sessionId = req.ip || "unknown";
      const isBooked = await storage.isDealBooked(dealId);
      const isHeldByOther = isDealHeld(dealId, sessionId);
      
      res.json({ 
        available: !isBooked && !isHeldByOther,
        booked: isBooked,
        heldByOther: isHeldByOther
      });
    } catch (err) {
      logError("GET /api/deals/:dealId/availability", err);
      sendError(res, 500, "Failed to check availability");
    }
  });

  // Register host routes (AirBnB-style hosts)
  app.use(hostRoutes);

  // Register listing wizard routes (draft listings, iCal sync, gap night detection)
  app.use(listingRoutes);

  // Register property routes (public listings, booking, Q&A, ID verification)
  // Apply optional user auth so req.user is available for authenticated endpoints
  app.use(optionalUserAuthMiddleware, propertyRoutes);

  return httpServer;
}
