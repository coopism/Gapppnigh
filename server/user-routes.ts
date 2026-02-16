import type { Express, Response, Request } from "express";
import { z } from "zod";
import {
  createUser,
  getUserByEmail,
  verifyPassword,
  createSession,
  revokeSession,
  revokeAllUserSessions,
  createEmailToken,
  verifyEmailToken,
  markTokenUsed,
  verifyUserEmail,
  updateUserPassword,
  updateUserName,
  softDeleteUser,
  generateCsrfToken,
  userAuthMiddleware,
  optionalUserAuthMiddleware,
  setSessionCookie,
  clearSessionCookie,
  setCsrfCookie,
  logSecurityEvent,
  findOrCreateOAuthUser,
  USER_SESSION_COOKIE,
  CSRF_COOKIE,
} from "./user-auth";
import { signupSchema, loginSchema, passwordSchema, bookings, userAlertPreferences, hotelReviews, propertyBookings } from "@shared/schema";
import { sendVerificationEmail, sendPasswordResetEmail } from "./user-email";
import { db } from "./db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import * as rewards from "./rewards";

// Rate limiting stores (in-memory for MVP)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const verifyResendAttempts = new Map<string, { count: number; resetAt: number }>();

const LOGIN_RATE_LIMIT = { maxAttempts: 10, windowMs: 60 * 1000 }; // 10 per minute
const RESET_RATE_LIMIT = { maxAttempts: 3, windowMs: 60 * 60 * 1000 }; // 3 per hour
const VERIFY_RESEND_RATE_LIMIT = { maxAttempts: 3, windowMs: 60 * 60 * 1000 }; // 3 per hour

function checkRateLimit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: { maxAttempts: number; windowMs: number }
): boolean {
  const now = Date.now();
  const record = store.get(key);
  
  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  
  if (record.count >= limit.maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
}

function getClientIP(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() 
    || req.socket.remoteAddress 
    || "unknown";
}

function sendError(res: Response, status: number, message: string, field?: string) {
  res.status(status).json({ message, field });
}

export function registerUserAuthRoutes(app: Express) {
  
  // ========================================
  // CSRF TOKEN ENDPOINT
  // ========================================
  
  app.get("/api/auth/csrf", (req, res) => {
    const existingToken = req.cookies?.[CSRF_COOKIE];
    const token = existingToken || generateCsrfToken();
    
    if (!existingToken) {
      setCsrfCookie(res, token);
    }
    
    res.json({ csrfToken: token });
  });
  
  // ========================================
  // USER SIGNUP
  // ========================================
  
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const input = signupSchema.parse(req.body);
      const ip = getClientIP(req);
      
      // Check if email already exists
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        logSecurityEvent("signup_duplicate_email", { email: input.email, ip });
        return sendError(res, 400, "An account with this email already exists", "email");
      }
      
      // Create user
      const user = await createUser(input.email, input.password, input.name, input.phone);
      logSecurityEvent("signup_success", { userId: user.id, email: user.email, ip });
      
      // Link any guest bookings made with this email to the new account
      try {
        const linked = await db.update(propertyBookings)
          .set({ userId: user.id })
          .where(and(
            eq(propertyBookings.guestEmail, user.email),
            isNull(propertyBookings.userId)
          ));
        if (linked.rowCount && linked.rowCount > 0) {
          logSecurityEvent("guest_bookings_linked", { userId: user.id, email: user.email, count: linked.rowCount });
        }
      } catch (linkErr) {
        console.error("Failed to link guest bookings:", linkErr);
      }
      
      // Generate 6-digit OTP code and send via email
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verifyToken = await createEmailToken(user.id, "verify_email", otpCode);
      await sendVerificationEmail(user.email, verifyToken, user.name);
      
      // Create session
      const sessionToken = await createSession(
        user.id, 
        false, 
        req.headers["user-agent"],
        ip
      );
      setSessionCookie(res, sessionToken, false);
      
      // Set CSRF token
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);
      
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          emailVerified: !!user.emailVerifiedAt,
        },
        csrfToken,
        requiresOtp: true,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join("."));
      }
      console.error("Signup error:", err);
      sendError(res, 500, "Failed to create account");
    }
  });
  
  // ========================================
  // USER LOGIN
  // ========================================
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const input = loginSchema.parse(req.body);
      const ip = getClientIP(req);
      
      // Rate limiting
      if (!checkRateLimit(loginAttempts, ip, LOGIN_RATE_LIMIT)) {
        logSecurityEvent("login_rate_limited", { email: input.email, ip });
        return sendError(res, 429, "Too many login attempts. Please try again later.");
      }
      
      // Verify credentials
      const user = await verifyPassword(input.email, input.password);
      
      if (!user) {
        logSecurityEvent("login_failed", { email: input.email, ip });
        return sendError(res, 401, "Invalid email or password");
      }
      
      logSecurityEvent("login_success", { userId: user.id, email: user.email, ip });
      
      // Revoke old session if exists
      const oldSession = req.cookies?.[USER_SESSION_COOKIE];
      if (oldSession) {
        await revokeSession(oldSession);
      }
      
      // Create new session
      const sessionToken = await createSession(
        user.id,
        input.rememberMe,
        req.headers["user-agent"],
        ip
      );
      setSessionCookie(res, sessionToken, input.rememberMe);
      
      // Set CSRF token
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: !!user.emailVerifiedAt,
        },
        csrfToken,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return sendError(res, 400, err.errors[0].message, err.errors[0].path.join("."));
      }
      console.error("Login error:", err);
      sendError(res, 500, "Failed to log in");
    }
  });
  
  // ========================================
  // USER LOGOUT
  // ========================================
  
  app.post("/api/auth/logout", async (req, res) => {
    const sessionToken = req.cookies?.[USER_SESSION_COOKIE];
    
    if (sessionToken) {
      await revokeSession(sessionToken);
      logSecurityEvent("logout", { ip: getClientIP(req) });
    }
    
    clearSessionCookie(res);
    res.json({ success: true });
  });
  
  // ========================================
  // GET CURRENT USER
  // ========================================
  
  app.get("/api/auth/me", optionalUserAuthMiddleware, (req, res) => {
    if (!req.user) {
      return res.json({ user: null });
    }
    
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        emailVerified: !!req.user.emailVerifiedAt,
      },
    });
  });
  
  // ========================================
  // EMAIL VERIFICATION
  // ========================================
  
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== "string") {
        return sendError(res, 400, "Invalid verification token");
      }
      
      const user = await verifyEmailToken(token, "verify_email");
      
      if (!user) {
        return sendError(res, 400, "Invalid or expired verification token");
      }
      
      await verifyUserEmail(user.id);
      await markTokenUsed(token);
      
      logSecurityEvent("email_verified", { userId: user.id, email: user.email });
      
      res.json({ success: true, message: "Email verified successfully" });
    } catch (err) {
      console.error("Email verification error:", err);
      sendError(res, 500, "Failed to verify email");
    }
  });
  
  app.post("/api/auth/resend-verification", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const ip = getClientIP(req);
      
      if (user.emailVerifiedAt) {
        return sendError(res, 400, "Email is already verified");
      }
      
      // Rate limiting
      const key = `${user.id}:${ip}`;
      if (!checkRateLimit(verifyResendAttempts, key, VERIFY_RESEND_RATE_LIMIT)) {
        logSecurityEvent("verify_resend_rate_limited", { userId: user.id, ip });
        return sendError(res, 429, "Too many resend attempts. Please try again later.");
      }
      
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verifyToken = await createEmailToken(user.id, "verify_email", otpCode);
      await sendVerificationEmail(user.email, verifyToken, user.name);
      
      logSecurityEvent("verify_email_resent", { userId: user.id, email: user.email, ip });
      
      res.json({ success: true, message: "Verification code sent" });
    } catch (err) {
      console.error("Resend verification error:", err);
      sendError(res, 500, "Failed to resend verification email");
    }
  });
  
  // ========================================
  // PASSWORD RESET
  // ========================================
  
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const ip = getClientIP(req);
      
      if (!email || typeof email !== "string") {
        return sendError(res, 400, "Email is required");
      }
      
      // Rate limiting (by IP and email)
      const ipKey = `ip:${ip}`;
      const emailKey = `email:${email.toLowerCase()}`;
      
      if (!checkRateLimit(resetAttempts, ipKey, RESET_RATE_LIMIT) ||
          !checkRateLimit(resetAttempts, emailKey, RESET_RATE_LIMIT)) {
        logSecurityEvent("password_reset_rate_limited", { email, ip });
        // Return generic success to not reveal if email exists
        return res.json({ success: true, message: "If an account exists, a reset email has been sent" });
      }
      
      const user = await getUserByEmail(email);
      
      // Always return success to not reveal if email exists
      if (user) {
        const resetToken = await createEmailToken(user.id, "reset_password");
        await sendPasswordResetEmail(user.email, resetToken, user.name);
        logSecurityEvent("password_reset_requested", { userId: user.id, email: user.email, ip });
      } else {
        logSecurityEvent("password_reset_unknown_email", { email, ip });
      }
      
      res.json({ success: true, message: "If an account exists, a reset email has been sent" });
    } catch (err) {
      console.error("Forgot password error:", err);
      // Return success even on error to not reveal information
      res.json({ success: true, message: "If an account exists, a reset email has been sent" });
    }
  });
  
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || typeof token !== "string") {
        return sendError(res, 400, "Invalid reset token");
      }
      
      // Validate password
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        return sendError(res, 400, passwordResult.error.errors[0].message, "password");
      }
      
      const user = await verifyEmailToken(token, "reset_password");
      
      if (!user) {
        return sendError(res, 400, "Invalid or expired reset token");
      }
      
      await updateUserPassword(user.id, password);
      await markTokenUsed(token);
      
      // Revoke all sessions for security
      await revokeAllUserSessions(user.id);
      
      logSecurityEvent("password_reset_completed", { userId: user.id, email: user.email });
      
      res.json({ success: true, message: "Password reset successfully. Please log in." });
    } catch (err) {
      console.error("Reset password error:", err);
      sendError(res, 500, "Failed to reset password");
    }
  });
  
  // ========================================
  // ACCOUNT MANAGEMENT
  // ========================================
  
  app.put("/api/auth/profile", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { name } = req.body;
      
      if (name !== undefined) {
        if (typeof name !== "string" || name.length > 100) {
          return sendError(res, 400, "Invalid name", "name");
        }
        await updateUserName(user.id, name.trim());
      }
      
      res.json({ success: true, message: "Profile updated" });
    } catch (err) {
      console.error("Update profile error:", err);
      sendError(res, 500, "Failed to update profile");
    }
  });
  
  app.put("/api/auth/password", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const verified = await verifyPassword(user.email, currentPassword);
      if (!verified) {
        return sendError(res, 400, "Current password is incorrect", "currentPassword");
      }
      
      // Validate new password
      const passwordResult = passwordSchema.safeParse(newPassword);
      if (!passwordResult.success) {
        return sendError(res, 400, passwordResult.error.errors[0].message, "newPassword");
      }
      
      await updateUserPassword(user.id, newPassword);
      
      logSecurityEvent("password_changed", { userId: user.id, email: user.email });
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      sendError(res, 500, "Failed to change password");
    }
  });
  
  app.post("/api/auth/logout-all", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      
      await revokeAllUserSessions(user.id);
      clearSessionCookie(res);
      
      logSecurityEvent("logout_all_devices", { userId: user.id, email: user.email });
      
      res.json({ success: true, message: "Logged out of all devices" });
    } catch (err) {
      console.error("Logout all error:", err);
      sendError(res, 500, "Failed to log out of all devices");
    }
  });
  
  app.delete("/api/auth/account", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { password } = req.body;
      
      // Verify password before deletion
      const verified = await verifyPassword(user.email, password);
      if (!verified) {
        return sendError(res, 400, "Password is incorrect", "password");
      }
      
      await softDeleteUser(user.id);
      clearSessionCookie(res);
      
      logSecurityEvent("account_deleted", { userId: user.id, email: user.email });
      
      res.json({ success: true, message: "Account deleted" });
    } catch (err) {
      console.error("Delete account error:", err);
      sendError(res, 500, "Failed to delete account");
    }
  });
  
  // ========================================
  // USER BOOKINGS
  // ========================================
  
  app.get("/api/auth/bookings", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      
      const userBookings = await db.select()
        .from(bookings)
        .where(eq(bookings.userId, user.id))
        .orderBy(desc(bookings.createdAt));
      
      res.json({ bookings: userBookings });
    } catch (err) {
      console.error("Get bookings error:", err);
      sendError(res, 500, "Failed to get bookings");
    }
  });
  
  app.get("/api/auth/bookings/:id", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const bookingId = req.params.id as string;
      
      const [booking] = await db.select()
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.userId, user.id)
        ))
        .limit(1);
      
      if (!booking) {
        return sendError(res, 404, "Booking not found");
      }
      
      res.json({ booking });
    } catch (err) {
      console.error("Get booking error:", err);
      sendError(res, 500, "Failed to get booking");
    }
  });
  
  // ========================================
  // DEAL ALERTS
  // ========================================
  
  app.get("/api/auth/alerts", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      
      const [prefs] = await db.select()
        .from(userAlertPreferences)
        .where(eq(userAlertPreferences.userId, user.id))
        .limit(1);
      
      res.json({
        preferences: prefs || {
          preferredCity: null,
          maxPrice: null,
          alertFrequency: "daily",
          isEnabled: false,
        },
      });
    } catch (err) {
      console.error("Get alerts error:", err);
      sendError(res, 500, "Failed to get alert preferences");
    }
  });
  
  app.put("/api/auth/alerts", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { preferredCity, maxPrice, alertFrequency, isEnabled } = req.body;
      
      // Validate inputs
      if (alertFrequency && !["daily", "instant"].includes(alertFrequency)) {
        return sendError(res, 400, "Invalid alert frequency", "alertFrequency");
      }
      
      if (maxPrice !== undefined && maxPrice !== null && (typeof maxPrice !== "number" || maxPrice < 0)) {
        return sendError(res, 400, "Invalid max price", "maxPrice");
      }
      
      // Check if preferences exist
      const [existing] = await db.select()
        .from(userAlertPreferences)
        .where(eq(userAlertPreferences.userId, user.id))
        .limit(1);
      
      if (existing) {
        await db.update(userAlertPreferences)
          .set({
            preferredCity: preferredCity ?? existing.preferredCity,
            maxPrice: maxPrice ?? existing.maxPrice,
            alertFrequency: alertFrequency ?? existing.alertFrequency,
            isEnabled: isEnabled ?? existing.isEnabled,
            updatedAt: new Date(),
          })
          .where(eq(userAlertPreferences.userId, user.id));
      } else {
        await db.insert(userAlertPreferences).values({
          id: uuidv4(),
          userId: user.id,
          preferredCity: preferredCity || null,
          maxPrice: maxPrice || null,
          alertFrequency: alertFrequency || "daily",
          isEnabled: isEnabled ?? true,
        });
      }
      
      res.json({ success: true, message: "Alert preferences updated" });
    } catch (err) {
      console.error("Update alerts error:", err);
      sendError(res, 500, "Failed to update alert preferences");
    }
  });

  // ========================================
  // REWARDS SYSTEM
  // ========================================
  
  // Get user rewards data
  app.get("/api/auth/rewards", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      
      let userRewards = await storage.getUserRewards(user.id);
      
      // Create rewards account if it doesn't exist
      if (!userRewards) {
        userRewards = await storage.createUserRewards({
          id: uuidv4(),
          userId: user.id,
          totalPointsEarned: 0,
          currentPoints: 0,
          creditBalance: 0,
          tier: "Bronze",
        });
      }
      
      // Get next tier info
      const nextTierInfo = rewards.getNextTierInfo(userRewards.tier, userRewards.totalPointsEarned);
      
      res.json({
        rewards: {
          ...userRewards,
          nextTier: nextTierInfo.nextTier,
          pointsToNextTier: nextTierInfo.pointsNeeded,
        },
      });
    } catch (err) {
      console.error("Get rewards error:", err);
      sendError(res, 500, "Failed to get rewards data");
    }
  });
  
  // Get rewards transactions history
  app.get("/api/auth/rewards/transactions", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const transactions = await storage.getRewardsTransactions(user.id);
      res.json({ transactions });
    } catch (err) {
      console.error("Get transactions error:", err);
      sendError(res, 500, "Failed to get transactions");
    }
  });
  
  // Convert points to credit
  app.post("/api/auth/rewards/convert", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { points } = req.body;
      
      if (!points || typeof points !== "number" || points < 100) {
        return sendError(res, 400, "Minimum 100 points required to convert", "points");
      }
      
      const result = await rewards.convertPointsToCredit(storage, user.id, points);
      
      if (!result.success) {
        return sendError(res, 400, result.message || "Conversion failed");
      }
      
      res.json({ 
        success: true, 
        message: result.message,
        creditAdded: result.creditAdded,
      });
    } catch (err) {
      console.error("Convert points error:", err);
      sendError(res, 500, "Failed to convert points");
    }
  });
  
  // Apply promo code
  app.post("/api/auth/promo-code", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { code } = req.body;
      
      if (!code || typeof code !== "string") {
        return sendError(res, 400, "Promo code is required", "code");
      }
      
      const result = await rewards.applyPromoCode(storage, user.id, code.toUpperCase());
      
      if (!result.success) {
        return sendError(res, 400, result.message || "Invalid promo code");
      }
      
      res.json({
        success: true,
        message: result.message,
        promoCode: result.promoCode,
      });
    } catch (err) {
      console.error("Apply promo code error:", err);
      sendError(res, 500, "Failed to apply promo code");
    }
  });
  
  // Submit hotel review
  app.post("/api/auth/reviews", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const { bookingId, rating, comment } = req.body;
      
      // Validate inputs
      if (!bookingId || typeof bookingId !== "string") {
        return sendError(res, 400, "Booking ID is required", "bookingId");
      }
      
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        return sendError(res, 400, "Rating must be between 1 and 5", "rating");
      }
      
      if (!comment || typeof comment !== "string" || comment.trim().length < 10) {
        return sendError(res, 400, "Review must be at least 10 characters", "comment");
      }
      
      // Verify booking exists and belongs to user
      const [booking] = await db.select()
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          eq(bookings.userId, user.id)
        ))
        .limit(1);
      
      if (!booking) {
        return sendError(res, 404, "Booking not found");
      }
      
      // Check if review already submitted
      if (booking.reviewSubmitted) {
        return sendError(res, 400, "Review already submitted for this booking");
      }
      
      // Create review
      const review = await storage.createHotelReview({
        id: uuidv4(),
        userId: user.id,
        bookingId: booking.id,
        hotelName: booking.hotelName,
        rating,
        comment: comment.trim(),
        isVerified: true,
      });
      
      // Award review points
      const pointsResult = await rewards.awardReviewPoints(
        storage,
        user.id,
        review.id,
        booking.hotelName
      );
      
      // Mark booking as reviewed
      await storage.markBookingReviewSubmitted(bookingId);
      
      res.json({
        success: true,
        message: `Review submitted! You earned ${pointsResult.pointsAwarded} points!`,
        review,
        pointsAwarded: pointsResult.pointsAwarded,
      });
    } catch (err) {
      console.error("Submit review error:", err);
      sendError(res, 500, "Failed to submit review");
    }
  });
  
  // Get user reviews
  app.get("/api/auth/reviews", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const reviews = await storage.getUserReviews(user.id);
      res.json({ reviews });
    } catch (err) {
      console.error("Get reviews error:", err);
      sendError(res, 500, "Failed to get reviews");
    }
  });

  // ========================================
  // SAVED LISTINGS
  // ========================================

  // Get all saved item IDs (for checking save state on cards)
  app.get("/api/auth/saved/ids", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const [propertyIds, dealIds] = await Promise.all([
        storage.getUserSavedPropertyIds(user.id),
        storage.getUserSavedDealIds(user.id),
      ]);
      res.json({ propertyIds, dealIds });
    } catch (err) {
      console.error("Get saved IDs error:", err);
      sendError(res, 500, "Failed to get saved IDs");
    }
  });

  // Get all saved listings with full data
  app.get("/api/auth/saved", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const savedItems = await storage.getUserSavedListings(user.id);
      res.json({ saved: savedItems });
    } catch (err) {
      console.error("Get saved listings error:", err);
      sendError(res, 500, "Failed to get saved listings");
    }
  });

  // Save a property
  app.post("/api/auth/saved/property/:propertyId", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const propertyId = req.params.propertyId as string;
      const saved = await storage.saveProperty(user.id, propertyId);
      res.json({ saved, message: "Property saved" });
    } catch (err) {
      console.error("Save property error:", err);
      sendError(res, 500, "Failed to save property");
    }
  });

  // Unsave a property
  app.delete("/api/auth/saved/property/:propertyId", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const propertyId = req.params.propertyId as string;
      await storage.unsaveProperty(user.id, propertyId);
      res.json({ message: "Property removed from saved" });
    } catch (err) {
      console.error("Unsave property error:", err);
      sendError(res, 500, "Failed to unsave property");
    }
  });

  // Save a deal
  app.post("/api/auth/saved/deal/:dealId", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const dealId = req.params.dealId as string;
      const saved = await storage.saveDeal(user.id, dealId);
      res.json({ saved, message: "Deal saved" });
    } catch (err) {
      console.error("Save deal error:", err);
      sendError(res, 500, "Failed to save deal");
    }
  });

  // Unsave a deal
  app.delete("/api/auth/saved/deal/:dealId", userAuthMiddleware, async (req, res) => {
    try {
      const user = req.user!;
      const dealId = req.params.dealId as string;
      await storage.unsaveDeal(user.id, dealId);
      res.json({ message: "Deal removed from saved" });
    } catch (err) {
      console.error("Unsave deal error:", err);
      sendError(res, 500, "Failed to unsave deal");
    }
  });

  // ========================================
  // OAUTH AUTHENTICATION
  // ========================================
  
  // Google OAuth callback - receives token from frontend
  app.post("/api/auth/oauth/google", async (req, res) => {
    try {
      console.log('[OAuth] Received Google OAuth request');
      const { credential, redirectUrl } = req.body;
      
      if (!credential) {
        console.error('[OAuth] Missing credential');
        return sendError(res, 400, "Missing Google credential");
      }
      
      // Decode and verify Google JWT token
      // In production, you should verify with Google's public keys
      const parts = credential.split(".");
      if (parts.length !== 3) {
        console.error('[OAuth] Invalid credential format');
        return sendError(res, 400, "Invalid Google credential format");
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      console.log('[OAuth] Decoded payload:', { email: payload.email, sub: payload.sub, name: payload.name });
      
      if (!payload.email || !payload.sub) {
        console.error('[OAuth] Invalid token payload');
        return sendError(res, 400, "Invalid Google token payload");
      }
      
      // Verify token hasn't expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.error('[OAuth] Token expired');
        return sendError(res, 400, "Google token has expired");
      }
      
      console.log('[OAuth] Finding or creating user...');
      const user = await findOrCreateOAuthUser(
        "google",
        payload.sub,
        payload.email,
        payload.name
      );
      console.log('[OAuth] User found/created:', user.id);
      
      console.log('[OAuth] Creating session...');
      const sessionToken = await createSession(
        user.id,
        true, // Remember me for OAuth
        req.headers["user-agent"],
        req.ip
      );
      console.log('[OAuth] Session created');
      
      setSessionCookie(res, sessionToken, true);
      
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);
      
      logSecurityEvent("oauth_login", { userId: user.id, provider: "google", ip: req.ip });
      
      console.log('[OAuth] Sending success response, redirectUrl:', redirectUrl || "/account");
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: !!user.emailVerifiedAt,
        },
        redirectUrl: redirectUrl || "/account"
      });
    } catch (err) {
      console.error("Google OAuth error:", err);
      sendError(res, 500, "OAuth authentication failed");
    }
  });
  
  // Apple OAuth callback - receives token from frontend
  app.post("/api/auth/oauth/apple", async (req, res) => {
    try {
      const { idToken, user: appleUser, redirectUrl } = req.body;
      
      if (!idToken) {
        return sendError(res, 400, "Missing Apple ID token");
      }
      
      // Decode Apple JWT token
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        return sendError(res, 400, "Invalid Apple ID token format");
      }
      
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      
      if (!payload.email && !payload.sub) {
        return sendError(res, 400, "Invalid Apple token payload");
      }
      
      // Verify token hasn't expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return sendError(res, 400, "Apple token has expired");
      }
      
      // Apple only provides email on first sign-in, use the user object if available
      const email = payload.email || appleUser?.email;
      const name = appleUser?.name ? `${appleUser.name.firstName || ""} ${appleUser.name.lastName || ""}`.trim() : undefined;
      
      if (!email) {
        return sendError(res, 400, "Email is required for Apple Sign In");
      }
      
      const user = await findOrCreateOAuthUser(
        "apple",
        payload.sub,
        email,
        name
      );
      
      const sessionToken = await createSession(
        user.id,
        true, // Remember me for OAuth
        req.headers["user-agent"],
        req.ip
      );
      
      setSessionCookie(res, sessionToken, true);
      
      const csrfToken = generateCsrfToken();
      setCsrfCookie(res, csrfToken);
      
      logSecurityEvent("oauth_login", { userId: user.id, provider: "apple", ip: req.ip });
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: !!user.emailVerifiedAt,
        },
        redirectUrl: redirectUrl || "/account"
      });
    } catch (err) {
      console.error("Apple OAuth error:", err);
      sendError(res, 500, "OAuth authentication failed");
    }
  });
}
