import type { Request, Response, NextFunction } from "express";
import { RATE_LIMITS } from "./config";

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

// Pre-configured rate limiters using config constants (Fix #21)
export const authRateLimit = rateLimit("auth", RATE_LIMITS.AUTH_ATTEMPTS, RATE_LIMITS.AUTH_WINDOW_MS);
export const bookingRateLimit = rateLimit("booking", RATE_LIMITS.BOOKING_ATTEMPTS, RATE_LIMITS.BOOKING_WINDOW_MS);
export const paymentRateLimit = rateLimit("payment", RATE_LIMITS.PAYMENT_ATTEMPTS, RATE_LIMITS.PAYMENT_WINDOW_MS);
export const apiRateLimit = rateLimit("api", RATE_LIMITS.API_ATTEMPTS, RATE_LIMITS.API_WINDOW_MS);
export const uploadRateLimit = rateLimit("upload", RATE_LIMITS.UPLOAD_ATTEMPTS, RATE_LIMITS.UPLOAD_WINDOW_MS);

// Fix #38: UTC Date Helper Functions
export function getUTCDate(): Date {
  return new Date();
}

export function toUTCDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getUTCToday(): string {
  return toUTCDateString(getUTCDate());
}

// Fix #39: Email retry wrapper
export async function sendEmailWithRetry(
  emailFn: () => Promise<void>,
  maxRetries: number = 3,
  delayMs: number = 5000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await emailFn();
      return true;
    } catch (error) {
      console.error(`Email attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}
