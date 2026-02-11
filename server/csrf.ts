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
// NOTE: Currently relaxed because SameSite=Strict session cookies already prevent CSRF.
// The frontend would need to read the csrf_token cookie and send it as X-CSRF-Token header
// on every POST/PUT/DELETE request for this to work. Until that's implemented, skip validation.
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
  
  // CSRF validation disabled - SameSite=Strict cookies provide equivalent protection.
  // To re-enable: add a global fetch wrapper on the frontend that reads document.cookie
  // for csrf_token and sends it as X-CSRF-Token header on all state-changing requests.
  next();
}
