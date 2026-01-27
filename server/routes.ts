import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  return httpServer;
}
