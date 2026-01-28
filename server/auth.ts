import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { HotelOwner } from "@shared/schema";

export const SESSION_COOKIE_NAME = "gn_owner_session";

declare global {
  namespace Express {
    interface Request {
      owner?: HotelOwner;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  
  if (!sessionId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const owner = await storage.getSessionOwner(sessionId);
  
  if (!owner) {
    res.clearCookie(SESSION_COOKIE_NAME);
    return res.status(401).json({ message: "Session expired" });
  }
  
  req.owner = owner;
  next();
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  
  if (sessionId) {
    const owner = await storage.getSessionOwner(sessionId);
    if (owner) {
      req.owner = owner;
    }
  }
  
  next();
}
