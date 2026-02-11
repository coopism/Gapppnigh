import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

// Generate CSRF token
export function generateCsrfToken(): string {
  return uuidv4();
}

// Middleware to set CSRF cookie
export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[CSRF_COOKIE_NAME];
  
  if (!token) {
    token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be accessible by JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  
  (req as any).csrfToken = token;
  next();
}

// Middleware to validate CSRF token on state-changing operations
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for specific exempt routes (e.g., webhooks)
  const exemptPaths = ["/api/webhook", "/api/stripe/webhook"];
  if (exemptPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()];
  
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: "CSRF token validation failed",
      message: "Invalid or missing CSRF token",
    });
  }
  
  next();
}
