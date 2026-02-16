import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, userSessions, emailTokens, type User } from "@shared/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Constants
const SALT_ROUNDS = 12;
const SESSION_DURATION_DEFAULT = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_DURATION_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days
const VERIFY_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export const USER_SESSION_COOKIE = "gn_user_session";
export const CSRF_COOKIE = "gn_csrf_token";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      csrfToken?: string;
    }
  }
}

// Generate secure random token
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// Hash a token for storage (don't store raw tokens)
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ========================================
// USER CRUD OPERATIONS
// ========================================

export async function createUser(email: string, password: string, name?: string, phone?: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = uuidv4();
  
  const [user] = await db.insert(users).values({
    id,
    email: email.trim().toLowerCase(),
    passwordHash,
    name: name || null,
    phone: phone || null,
  }).returning();
  
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select()
    .from(users)
    .where(and(
      eq(users.email, email.trim().toLowerCase()),
      isNull(users.deletedAt)
    ))
    .limit(1);
  
  return user || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select()
    .from(users)
    .where(and(
      eq(users.id, id),
      isNull(users.deletedAt)
    ))
    .limit(1);
  
  return user || null;
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await db.update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserPhone(userId: string, phone: string | null): Promise<void> {
  await db.update(users)
    .set({ phone, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function verifyUserEmail(userId: string): Promise<void> {
  await db.update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function softDeleteUser(userId: string): Promise<void> {
  await db.update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
  
  // Revoke all sessions
  await revokeAllUserSessions(userId);
}

// ========================================
// OAUTH SUPPORT
// ========================================

export async function findOrCreateOAuthUser(
  provider: "google" | "apple",
  providerId: string,
  email: string,
  name?: string
): Promise<User> {
  // First check if user exists by email
  const existingUser = await getUserByEmail(email);
  
  if (existingUser) {
    // Update OAuth provider info if not already set
    if (provider === "google" && !existingUser.googleId) {
      await db.update(users)
        .set({ googleId: providerId, updatedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    } else if (provider === "apple" && !existingUser.appleId) {
      await db.update(users)
        .set({ appleId: providerId, updatedAt: new Date() })
        .where(eq(users.id, existingUser.id));
    }
    
    // Mark email as verified since OAuth providers verify emails
    if (!existingUser.emailVerifiedAt) {
      await verifyUserEmail(existingUser.id);
    }
    
    return existingUser;
  }
  
  // Create new user with OAuth
  const id = uuidv4();
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);
  
  const [user] = await db.insert(users).values({
    id,
    email: email.trim().toLowerCase(),
    passwordHash,
    name: name || null,
    googleId: provider === "google" ? providerId : null,
    appleId: provider === "apple" ? providerId : null,
    emailVerifiedAt: new Date(), // OAuth emails are pre-verified
  }).returning();
  
  return user;
}

export async function getUserByOAuthId(
  provider: "google" | "apple",
  providerId: string
): Promise<User | null> {
  const field = provider === "google" ? users.googleId : users.appleId;
  
  const [user] = await db.select()
    .from(users)
    .where(and(
      eq(field, providerId),
      isNull(users.deletedAt)
    ))
    .limit(1);
  
  return user || null;
}

// ========================================
// SESSION MANAGEMENT
// ========================================

export async function createSession(
  userId: string, 
  rememberMe: boolean = false,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const sessionToken = generateToken(32);
  const sessionHash = hashToken(sessionToken);
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + (rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT));
  
  await db.insert(userSessions).values({
    id,
    userId,
    sessionHash,
    expiresAt,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
  });
  
  return sessionToken;
}

export async function getSessionUser(sessionToken: string): Promise<User | null> {
  const sessionHash = hashToken(sessionToken);
  
  const [session] = await db.select()
    .from(userSessions)
    .where(and(
      eq(userSessions.sessionHash, sessionHash),
      isNull(userSessions.revokedAt),
      gt(userSessions.expiresAt, new Date())
    ))
    .limit(1);
  
  if (!session) return null;
  
  return getUserById(session.userId);
}

export async function revokeSession(sessionToken: string): Promise<void> {
  const sessionHash = hashToken(sessionToken);
  await db.update(userSessions)
    .set({ revokedAt: new Date() })
    .where(eq(userSessions.sessionHash, sessionHash));
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(userSessions.userId, userId),
      isNull(userSessions.revokedAt)
    ));
}

// ========================================
// EMAIL TOKENS (Verification & Reset)
// ========================================

export async function createEmailToken(userId: string, type: "verify_email" | "reset_password", otpCode?: string): Promise<string> {
  const token = otpCode || generateToken(32);
  const tokenHash = hashToken(token);
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + (type === "verify_email" ? VERIFY_TOKEN_EXPIRY : RESET_TOKEN_EXPIRY));
  
  // Invalidate any existing tokens of this type for this user
  await db.update(emailTokens)
    .set({ usedAt: new Date() })
    .where(and(
      eq(emailTokens.userId, userId),
      eq(emailTokens.type, type),
      isNull(emailTokens.usedAt)
    ));
  
  await db.insert(emailTokens).values({
    id,
    userId,
    tokenHash,
    type,
    expiresAt,
  });
  
  return token;
}

export async function verifyEmailToken(token: string, type: "verify_email" | "reset_password"): Promise<User | null> {
  const tokenHash = hashToken(token);
  
  const [emailToken] = await db.select()
    .from(emailTokens)
    .where(and(
      eq(emailTokens.tokenHash, tokenHash),
      eq(emailTokens.type, type),
      isNull(emailTokens.usedAt),
      gt(emailTokens.expiresAt, new Date())
    ))
    .limit(1);
  
  if (!emailToken) return null;
  
  const user = await getUserById(emailToken.userId);
  return user;
}

export async function markTokenUsed(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.update(emailTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailTokens.tokenHash, tokenHash));
}

// ========================================
// CSRF PROTECTION
// ========================================

export function generateCsrfToken(): string {
  return generateToken(32);
}

export function verifyCsrfToken(token: string, cookieToken: string): boolean {
  if (!token || !cookieToken) return false;
  return timingSafeEqual(token, cookieToken);
}

// ========================================
// MIDDLEWARE
// ========================================

export async function userAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.[USER_SESSION_COOKIE];
  
  if (!sessionToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  const user = await getSessionUser(sessionToken);
  
  if (!user) {
    res.clearCookie(USER_SESSION_COOKIE);
    return res.status(401).json({ message: "Session expired" });
  }
  
  req.user = user;
  next();
}

export async function optionalUserAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.[USER_SESSION_COOKIE];
  
  if (sessionToken) {
    const user = await getSessionUser(sessionToken);
    if (user) {
      req.user = user;
    }
  }
  
  next();
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  
  const csrfCookie = req.cookies?.[CSRF_COOKIE];
  const csrfHeader = req.headers["x-csrf-token"] as string;
  
  if (!csrfCookie || !csrfHeader || !verifyCsrfToken(csrfHeader, csrfCookie)) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  
  next();
}

// ========================================
// COOKIE HELPERS
// ========================================

export function setSessionCookie(res: Response, token: string, rememberMe: boolean = false) {
  const maxAge = rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT;
  res.cookie(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(USER_SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function setCsrfCookie(res: Response, token: string) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // Needs to be readable by JS to send in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  });
}

// ========================================
// AUDIT LOGGING
// ========================================

export function logSecurityEvent(event: string, details: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = { ...details };
  
  // Never log passwords
  delete sanitizedDetails.password;
  delete sanitizedDetails.passwordHash;
  delete sanitizedDetails.newPassword;
  delete sanitizedDetails.currentPassword;
  
  console.log(`[SECURITY] ${timestamp} | ${event}`, JSON.stringify(sanitizedDetails));
}
