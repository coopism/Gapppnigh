import { Router } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { insertAutoListingRuleSchema } from "@shared/schema";

const router = Router();

// Extend Express Request type
import type { HotelOwner } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      ownerId?: string;
      ownerData?: HotelOwner;
    }
  }
}

// Middleware to verify owner session
async function requireOwnerAuth(req: any, res: any, next: any) {
  const sessionId = req.cookies?.owner_session;
  
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const owner = await storage.getSessionOwner(sessionId);
  if (!owner) {
    return res.status(401).json({ error: "Invalid session" });
  }
  
  req.ownerId = owner.id;
  req.ownerData = owner;
  next();
}

// ========================================
// AUTO LISTING RULES ROUTES
// ========================================

// Get auto listing rule for a hotel
router.get("/api/owner/hotels/:hotelId/auto-listing-rule", requireOwnerAuth, async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    // Verify hotel belongs to owner
    const hotel = await storage.getHotel(hotelId);
    if (!hotel || hotel.ownerId !== req.ownerId) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    
    const rule = await storage.getAutoListingRule(hotelId);
    res.json(rule || null);
  } catch (error) {
    console.error("Error fetching auto listing rule:", error);
    res.status(500).json({ error: "Failed to fetch auto listing rule" });
  }
});

// Create or update auto listing rule
router.post("/api/owner/hotels/:hotelId/auto-listing-rule", requireOwnerAuth, async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    // Verify hotel belongs to owner
    const hotel = await storage.getHotel(hotelId);
    if (!hotel || hotel.ownerId !== req.ownerId) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    
    // Validate request body
    const ruleData = insertAutoListingRuleSchema.parse({
      id: uuidv4(),
      hotelId,
      ...req.body,
    });
    
    const rule = await storage.upsertAutoListingRule(ruleData);
    res.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid rule data", details: error.errors });
    }
    console.error("Error upserting auto listing rule:", error);
    res.status(500).json({ error: "Failed to save auto listing rule" });
  }
});

// Delete auto listing rule
router.delete("/api/owner/hotels/:hotelId/auto-listing-rule", requireOwnerAuth, async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    // Verify hotel belongs to owner
    const hotel = await storage.getHotel(hotelId);
    if (!hotel || hotel.ownerId !== req.ownerId) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    
    await storage.deleteAutoListingRule(hotelId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting auto listing rule:", error);
    res.status(500).json({ error: "Failed to delete auto listing rule" });
  }
});

export default router;
