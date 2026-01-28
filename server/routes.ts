import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { authMiddleware, SESSION_COOKIE_NAME } from "./auth";
import { v4 as uuidv4 } from "uuid";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ========================================
  // EXISTING PUBLIC ROUTES
  // ========================================
  
  app.get(api.deals.list.path, async (req, res) => {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const sort = req.query.sort as string | undefined;
    const deals = await storage.getDeals(search, category, sort);
    res.json(deals);
  });

  app.get(api.deals.get.path, async (req, res) => {
    const deal = await storage.getDeal(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    res.json(deal);
  });

  app.post(api.waitlist.submit.path, async (req, res) => {
    try {
      const input = api.waitlist.submit.input.parse(req.body);
      await storage.createWaitlistEntry(input);
      res.status(201).json({ success: true, message: "Joined waitlist successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.hotelInquiries.submit.path, async (req, res) => {
    try {
      const input = api.hotelInquiries.submit.input.parse(req.body);
      await storage.createHotelInquiry(input);
      res.status(201).json({ success: true, message: "Inquiry submitted successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post("/api/verify-partner", (req, res) => {
    const { password } = req.body;
    const partnerPassword = process.env.PARTNER_ACCESS_PASSWORD;
    
    if (!partnerPassword) {
      return res.status(500).json({ valid: false, message: "Partner access not configured" });
    }
    
    const valid = password === partnerPassword;
    res.json({ valid });
  });

  // ========================================
  // AUTH ROUTES
  // ========================================
  
  const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  const registerSchema = loginSchema.extend({
    name: z.string().optional(),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      
      const existingOwner = await storage.getOwnerByEmail(email);
      if (existingOwner) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const owner = await storage.createOwner(email, password, name);
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
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const owner = await storage.verifyPassword(email, password);
      if (!owner) {
        return res.status(401).json({ message: "Invalid email or password" });
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
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      await storage.deleteSession(sessionId);
    }
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const owner = req.owner!;
    res.json({ 
      id: owner.id, 
      email: owner.email, 
      name: owner.name 
    });
  });

  // ========================================
  // OWNER HOTEL ROUTES (Protected)
  // ========================================
  
  const hotelSchema = z.object({
    chainName: z.string().optional(),
    name: z.string().min(1, "Hotel name is required"),
    description: z.string().optional(),
    address: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().optional(),
    country: z.string().default("Australia"),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    starRating: z.number().min(1).max(5).default(3),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    contactEmail: z.string().email().optional(),
  });

  app.get("/api/owner/hotels", authMiddleware, async (req, res) => {
    const hotels = await storage.getOwnerHotels(req.owner!.id);
    res.json(hotels);
  });

  app.post("/api/owner/hotels", authMiddleware, async (req, res) => {
    try {
      const data = hotelSchema.parse(req.body);
      const hotel = await storage.createHotel({
        id: uuidv4(),
        ownerId: req.owner!.id,
        ...data,
        isActive: true,
      });
      res.status(201).json(hotel);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get("/api/owner/hotels/:hotelId", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    res.json(hotel);
  });

  app.put("/api/owner/hotels/:hotelId", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    try {
      const data = hotelSchema.partial().parse(req.body);
      const updated = await storage.updateHotel(req.params.hotelId, data);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete("/api/owner/hotels/:hotelId", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    await storage.deactivateHotel(req.params.hotelId);
    res.json({ success: true, message: "Hotel deactivated" });
  });

  // ========================================
  // ROOM TYPE ROUTES (Protected)
  // ========================================
  
  const roomTypeSchema = z.object({
    name: z.string().min(1, "Room type name is required"),
    inventory: z.number().min(1).default(1),
  });

  app.get("/api/owner/hotels/:hotelId/room-types", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    const roomTypes = await storage.getHotelRoomTypes(req.params.hotelId);
    res.json(roomTypes);
  });

  app.post("/api/owner/hotels/:hotelId/room-types", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    try {
      const data = roomTypeSchema.parse(req.body);
      const roomType = await storage.createRoomType({
        id: uuidv4(),
        hotelId: req.params.hotelId,
        ...data,
      });
      res.status(201).json(roomType);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put("/api/owner/room-types/:roomTypeId", authMiddleware, async (req, res) => {
    // Verify ownership through hotel
    const roomTypes = await storage.getHotelRoomTypes(req.params.roomTypeId);
    // Get the room type first
    const allRoomTypes = await Promise.all(
      (await storage.getOwnerHotels(req.owner!.id)).map(h => storage.getHotelRoomTypes(h.id))
    );
    const ownerRoomTypes = allRoomTypes.flat();
    const roomType = ownerRoomTypes.find(rt => rt.id === req.params.roomTypeId);
    
    if (!roomType) {
      return res.status(404).json({ message: "Room type not found" });
    }
    
    try {
      const data = roomTypeSchema.partial().parse(req.body);
      const updated = await storage.updateRoomType(req.params.roomTypeId, data);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete("/api/owner/room-types/:roomTypeId", authMiddleware, async (req, res) => {
    const allRoomTypes = await Promise.all(
      (await storage.getOwnerHotels(req.owner!.id)).map(h => storage.getHotelRoomTypes(h.id))
    );
    const ownerRoomTypes = allRoomTypes.flat();
    const roomType = ownerRoomTypes.find(rt => rt.id === req.params.roomTypeId);
    
    if (!roomType) {
      return res.status(404).json({ message: "Room type not found" });
    }
    
    await storage.deleteRoomType(req.params.roomTypeId);
    res.json({ success: true });
  });

  // ========================================
  // AVAILABILITY ROUTES (Protected)
  // ========================================
  
  const availabilitySchema = z.object({
    available: z.number().min(0),
    barRate: z.number().min(0),
    minStay: z.number().min(1).default(1),
    closedToArrival: z.boolean().default(false),
  });

  const bulkAvailabilitySchema = availabilitySchema.extend({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  app.get("/api/owner/room-types/:roomTypeId/availability", authMiddleware, async (req, res) => {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: "start and end query params required" });
    }
    
    const availability = await storage.getAvailability(
      req.params.roomTypeId,
      start as string,
      end as string
    );
    res.json(availability);
  });

  app.put("/api/owner/room-types/:roomTypeId/availability/bulk", authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, ...data } = bulkAvailabilitySchema.parse(req.body);
      await storage.bulkUpdateAvailability(req.params.roomTypeId, startDate, endDate, data);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put("/api/owner/room-types/:roomTypeId/availability/:date", authMiddleware, async (req, res) => {
    try {
      const data = availabilitySchema.parse(req.body);
      const availability = await storage.upsertAvailability({
        id: uuidv4(),
        roomTypeId: req.params.roomTypeId,
        date: req.params.date,
        ...data,
      });
      res.json(availability);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // ========================================
  // ORPHAN NIGHT DETECTION & DEAL PUBLISHING (Protected)
  // ========================================
  
  app.post("/api/owner/hotels/:hotelId/deals/generate-orphans", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    const roomTypes = await storage.getHotelRoomTypes(req.params.hotelId);
    const candidates: any[] = [];
    
    // Generate date range for next 30 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);
    
    const startStr = today.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    for (const roomType of roomTypes) {
      const availability = await storage.getAvailability(roomType.id, startStr, endStr);
      
      // Sort by date
      availability.sort((a, b) => a.date.localeCompare(b.date));
      
      for (let i = 0; i < availability.length; i++) {
        const day = availability[i];
        if (day.available <= 0) continue;
        
        const prev = availability[i - 1];
        const next = availability[i + 1];
        
        let isOrphan = false;
        let reason = "";
        let suggestedDiscount = 25;
        
        // True 1-night gap: blocked on both sides
        if (prev && next && prev.available <= 0 && next.available <= 0) {
          isOrphan = true;
          reason = "1-night gap between bookings";
          suggestedDiscount = 35;
        }
        // Min stay restriction creates orphan
        else if (day.minStay > 1) {
          isOrphan = true;
          reason = `Min stay restriction (${day.minStay} nights) blocks short stays`;
          suggestedDiscount = 30;
        }
        // Closed to arrival
        else if (day.closedToArrival) {
          isOrphan = true;
          reason = "Closed to arrival restriction";
          suggestedDiscount = 25;
        }
        
        if (isOrphan) {
          candidates.push({
            id: uuidv4(),
            hotelId: hotel.id,
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            date: day.date,
            barRate: day.barRate,
            available: day.available,
            reason,
            suggestedDiscountPercent: suggestedDiscount,
          });
        }
      }
    }
    
    res.json(candidates);
  });

  const publishDealSchema = z.object({
    deals: z.array(z.object({
      roomTypeId: z.string(),
      date: z.string(),
      barRate: z.number(),
      dealPrice: z.number(),
      discountPercent: z.number(),
      reason: z.string().optional(),
    })),
  });

  app.post("/api/owner/hotels/:hotelId/deals/publish", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    try {
      const { deals } = publishDealSchema.parse(req.body);
      const createdDeals: any[] = [];
      
      for (const deal of deals) {
        const created = await storage.createPublishedDeal({
          id: uuidv4(),
          hotelId: hotel.id,
          roomTypeId: deal.roomTypeId,
          date: deal.date,
          barRate: deal.barRate,
          dealPrice: deal.dealPrice,
          discountPercent: deal.discountPercent,
          reason: deal.reason,
          status: "PUBLISHED",
        });
        createdDeals.push(created);
      }
      
      res.status(201).json({ success: true, deals: createdDeals });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get("/api/owner/hotels/:hotelId/deals", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    const deals = await storage.getHotelDeals(req.params.hotelId);
    res.json(deals);
  });

  app.post("/api/owner/hotels/:hotelId/deals/unpublish", authMiddleware, async (req, res) => {
    const hotel = await storage.getHotel(req.params.hotelId);
    if (!hotel || hotel.ownerId !== req.owner!.id) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    const { dealIds } = req.body;
    if (!Array.isArray(dealIds)) {
      return res.status(400).json({ message: "dealIds array required" });
    }
    
    await storage.unpublishDeals(dealIds);
    res.json({ success: true });
  });

  // ========================================
  // PUBLIC API ROUTES (Consumer)
  // ========================================
  
  app.get("/api/public/hotels", async (req, res) => {
    const hotels = await storage.getPublicHotels();
    res.json(hotels);
  });

  app.get("/api/public/hotels/:hotelId", async (req, res) => {
    const hotel = await storage.getPublicHotel(req.params.hotelId);
    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }
    
    const roomTypes = await storage.getHotelRoomTypes(hotel.id);
    res.json({ ...hotel, roomTypes });
  });

  app.get("/api/public/hotels/:hotelId/deal-dates", async (req, res) => {
    const { start, end } = req.query;
    const deals = await storage.getPublicDealsByHotel(
      req.params.hotelId,
      start as string,
      end as string
    );
    res.json(deals);
  });

  app.get("/api/public/deals", async (req, res) => {
    const groupedDeals = await storage.getPublicDealsGrouped();
    res.json(groupedDeals);
  });

  return httpServer;
}
