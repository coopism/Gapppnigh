import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const stores: { [key: string]: RateLimitStore } = {};

/**
 * Creates a rate limiting middleware
 * @param name - Unique name for this rate limiter
 * @param maxAttempts - Maximum attempts allowed within the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(name: string, maxAttempts: number, windowMs: number) {
  if (!stores[name]) {
    stores[name] = {};
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const store = stores[name];
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      for (const key in store) {
        if (store[key].resetTime < now) {
          delete store[key];
        }
      }
    }

    // Check if IP exists in store
    if (!store[ip] || store[ip].resetTime < now) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Increment count
    store[ip].count++;

    // Check if over limit
    if (store[ip].count > maxAttempts) {
      const retryAfter = Math.ceil((store[ip].resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: true,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit("auth", 5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const bookingRateLimit = rateLimit("booking", 10, 60 * 60 * 1000); // 10 bookings per hour
export const paymentRateLimit = rateLimit("payment", 30, 60 * 60 * 1000); // 30 payment intents per hour
export const apiRateLimit = rateLimit("api", 100, 60 * 1000); // 100 requests per minute
