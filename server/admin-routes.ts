import { Router, type Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { adminUsers, adminSessions, adminActivityLogs, users, bookings, deals, hotels, hotelReviews, promoCodes } from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count, ilike, or } from "drizzle-orm";
import { LOG_RETENTION_DAYS } from "./config";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Obfuscated admin route prefix - not easily guessable
const ADMIN_PREFIX = "/api/x9k2p7m4";

function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

// Admin authentication middleware
async function adminAuthMiddleware(req: Request, res: Response, next: Function) {
  const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE];

  if (!sessionToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.id, sessionToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      res.clearCookie(ADMIN_SESSION_COOKIE);
      return res.status(401).json({ message: "Session expired" });
    }

    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, session.adminId))
      .limit(1);

    if (!admin || !admin.isActive) {
      return res.status(403).json({ message: "Access denied" });
    }

    (req as any).admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
}

// Log admin activity
async function logAdminActivity(
  adminId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: any,
  ipAddress: string
) {
  try {
    await db.insert(adminActivityLogs).values({
      id: uuidv4(),
      adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error("Failed to log admin activity:", error);
  }
}

export function registerAdminRoutes(app: Router) {
  // ========================================
  // ADMIN AUTHENTICATION
  // ========================================

  // Admin login
  app.post(`${ADMIN_PREFIX}/login`, async (req, res) => {
    try {
      const { email, password } = req.body;
      const ip = getClientIP(req);

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const [admin] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, email))
        .limit(1);

      if (!admin || !admin.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION);

      await db.insert(adminSessions).values({
        id: sessionToken,
        adminId: admin.id,
        expiresAt,
        ipAddress: ip,
        userAgent: req.headers["user-agent"] || null,
      });

      // Update last login
      await db
        .update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, admin.id));

      // Log activity
      await logAdminActivity(admin.id, "admin_login", null, null, { email }, ip);

      res.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: ADMIN_SESSION_DURATION,
      });

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout
  app.post(`${ADMIN_PREFIX}/logout`, adminAuthMiddleware, async (req, res) => {
    const sessionToken = req.cookies?.[ADMIN_SESSION_COOKIE];
    const admin = (req as any).admin;

    if (sessionToken) {
      await db.delete(adminSessions).where(eq(adminSessions.id, sessionToken));
      await logAdminActivity(admin.id, "admin_logout", null, null, {}, getClientIP(req));
    }

    res.clearCookie(ADMIN_SESSION_COOKIE);
    res.json({ success: true });
  });

  // Get current admin
  app.get(`${ADMIN_PREFIX}/me`, adminAuthMiddleware, (req, res) => {
    const admin = (req as any).admin;
    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  });

  // ========================================
  // DASHBOARD STATISTICS
  // ========================================

  app.get(`${ADMIN_PREFIX}/stats/overview`, adminAuthMiddleware, async (req, res) => {
    try {
      const admin = (req as any).admin;

      // Get comprehensive statistics
      const [totalUsers] = await db.select({ count: count() }).from(users);
      const [totalBookings] = await db.select({ count: count() }).from(bookings);
      const [totalDeals] = await db.select({ count: count() }).from(deals);
      const [totalHotels] = await db.select({ count: count() }).from(hotels);
      const [totalReviews] = await db.select({ count: count() }).from(hotelReviews);

      // Revenue statistics
      const [revenueData] = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
          avgBookingValue: sql<number>`COALESCE(AVG(${bookings.totalPrice}), 0)`,
        })
        .from(bookings)
        .where(eq(bookings.status, "CONFIRMED"));

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo));

      const [recentBookings] = await db
        .select({ count: count() })
        .from(bookings)
        .where(gte(bookings.createdAt, thirtyDaysAgo));

      // Top cities
      const topCities = await db
        .select({
          city: bookings.hotelCity,
          count: count(),
        })
        .from(bookings)
        .groupBy(bookings.hotelCity)
        .orderBy(desc(count()))
        .limit(10);

      await logAdminActivity(admin.id, "view_dashboard", null, null, {}, getClientIP(req));

      res.json({
        overview: {
          totalUsers: totalUsers.count,
          totalBookings: totalBookings.count,
          totalDeals: totalDeals.count,
          totalHotels: totalHotels.count,
          totalReviews: totalReviews.count,
          totalRevenue: Math.floor(revenueData.totalRevenue / 100), // Convert cents to dollars
          avgBookingValue: Math.floor(revenueData.avgBookingValue / 100),
          recentUsers: recentUsers.count,
          recentBookings: recentBookings.count,
        },
        topCities: topCities.filter(c => c.city).map(c => ({
          city: c.city,
          bookings: c.count,
        })),
      });
    } catch (error) {
      console.error("Stats overview error:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Revenue analytics
  app.get(`${ADMIN_PREFIX}/stats/revenue`, adminAuthMiddleware, async (req, res) => {
    try {
      const { period = "30d" } = req.query;
      let daysAgo = 30;

      if (period === "7d") daysAgo = 7;
      else if (period === "90d") daysAgo = 90;
      else if (period === "365d") daysAgo = 365;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const dailyRevenue = await db
        .select({
          date: sql<string>`DATE(${bookings.createdAt})`,
          revenue: sql<number>`SUM(${bookings.totalPrice})`,
          bookings: count(),
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "CONFIRMED"),
            gte(bookings.createdAt, startDate)
          )
        )
        .groupBy(sql`DATE(${bookings.createdAt})`)
        .orderBy(sql`DATE(${bookings.createdAt})`);

      res.json({
        dailyRevenue: dailyRevenue.map(d => ({
          date: d.date,
          revenue: Math.floor(d.revenue / 100),
          bookings: d.bookings,
        })),
      });
    } catch (error) {
      console.error("Revenue stats error:", error);
      res.status(500).json({ message: "Failed to fetch revenue statistics" });
    }
  });

  // ========================================
  // USER MANAGEMENT
  // ========================================

  app.get(`${ADMIN_PREFIX}/users`, adminAuthMiddleware, async (req, res) => {
    try {
      const { page = "1", limit = "50", search = "" } = req.query;
      // Cap limit to prevent abuse (max 100 per request)
      const requestedLimit = parseInt(limit as string);
      const validatedLimit = Math.min(Math.max(requestedLimit, 1), 100);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      let query = db.select().from(users);

      if (search) {
        // Sanitize search input to prevent SQL injection
        const sanitizedSearch = search.replace(/[%_\\]/g, "\\$&");
        query = query.where(
          or(
            ilike(users.email, `%${sanitizedSearch}%`),
            ilike(users.name, `%${sanitizedSearch}%`)
          )
        );
      }

      const allUsers = await query
        .orderBy(desc(users.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(users);

      res.json({
        users: allUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          emailVerified: u.emailVerified,
          createdAt: u.createdAt,
        })),
        total: totalCount.count,
        page: validatedPage,
        limit: validatedLimit,
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get(`${ADMIN_PREFIX}/users/:userId`, adminAuthMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's bookings
      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.userId, userId))
        .orderBy(desc(bookings.createdAt));

      // Get user's reviews
      const userReviews = await db
        .select()
        .from(hotelReviews)
        .where(eq(hotelReviews.userId, userId))
        .orderBy(desc(hotelReviews.createdAt));

      // Get user's rewards
      const userRewards = await storage.getUserRewards(userId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          googleId: user.googleId,
          appleId: user.appleId,
          createdAt: user.createdAt,
        },
        bookings: userBookings,
        reviews: userReviews,
        rewards: userRewards,
      });
    } catch (error) {
      console.error("Get user details error:", error);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // ========================================
  // BOOKING MANAGEMENT
  // ========================================

  app.get(`${ADMIN_PREFIX}/bookings`, adminAuthMiddleware, async (req, res) => {
    try {
      const { page = "1", limit = "50", status = "" } = req.query;
      // Cap limit to prevent abuse (max 100 per request)
      const requestedLimit = parseInt(limit as string);
      const validatedLimit = Math.min(Math.max(requestedLimit, 1), 100);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      let query = db.select().from(bookings);

      if (status) {
        query = query.where(eq(bookings.status, status as string));
      }

      const allBookings = await query
        .orderBy(desc(bookings.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(bookings);

      res.json({
        bookings: allBookings,
        total: totalCount.count,
        page: validatedPage,
        limit: validatedLimit,
      });
    } catch (error) {
      console.error("Get bookings error:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // ========================================
  // PROMO CODE MANAGEMENT
  // ========================================

  app.get(`${ADMIN_PREFIX}/promo-codes`, adminAuthMiddleware, async (req, res) => {
    try {
      const codes = await db
        .select()
        .from(promoCodes)
        .orderBy(desc(promoCodes.createdAt));

      res.json({ promoCodes: codes });
    } catch (error) {
      console.error("Get promo codes error:", error);
      res.status(500).json({ message: "Failed to fetch promo codes" });
    }
  });

  app.post(`${ADMIN_PREFIX}/promo-codes`, adminAuthMiddleware, async (req, res) => {
    try {
      const admin = (req as any).admin;
      const { code, type, value, description, maxUses, expiresAt } = req.body;

      if (!code || !type || value === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fix #32: Check for duplicate promo codes
      const normalizedCode = code.toUpperCase().trim();
      const [existingCode] = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, normalizedCode))
        .limit(1);

      if (existingCode) {
        return res.status(409).json({ message: "Promo code already exists" });
      }

      const newCode = {
        id: uuidv4(),
        code: normalizedCode,
        type,
        value,
        description: description || null,
        maxUses: maxUses || null,
        currentUses: 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      };

      await db.insert(promoCodes).values(newCode);

      await logAdminActivity(
        admin.id,
        "promo_code_created",
        "promo_code",
        newCode.id,
        { code: newCode.code, type, value },
        getClientIP(req)
      );

      res.json({ promoCode: newCode });
    } catch (error) {
      console.error("Create promo code error:", error);
      res.status(500).json({ message: "Failed to create promo code" });
    }
  });

  app.delete(`${ADMIN_PREFIX}/promo-codes/:codeId`, adminAuthMiddleware, async (req, res) => {
    try {
      const admin = (req as any).admin;
      const codeId = req.params.codeId as string;

      await db.delete(promoCodes).where(eq(promoCodes.id, codeId));

      await logAdminActivity(
        admin.id,
        "promo_code_deleted",
        "promo_code",
        codeId,
        {},
        getClientIP(req)
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Delete promo code error:", error);
      res.status(500).json({ message: "Failed to delete promo code" });
    }
  });

  // ========================================
  // ACTIVITY LOGS
  // ========================================

  app.get(`${ADMIN_PREFIX}/activity-logs`, adminAuthMiddleware, async (req, res) => {
    try {
      const { page = "1", limit = "100" } = req.query;
      // Fix #33: Cap limit to prevent abuse (max 500 records per request)
      const requestedLimit = parseInt(limit as string);
      const validatedLimit = Math.min(Math.max(requestedLimit, 1), 500);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      const logs = await db
        .select()
        .from(adminActivityLogs)
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(adminActivityLogs);

      res.json({
        logs,
        total: totalCount.count,
        page: validatedPage,
        limit: validatedLimit,
        totalPages: Math.ceil(totalCount.count / validatedLimit),
      });
    } catch (error) {
      console.error("Get activity logs error:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // ========================================
  // SYSTEM HEALTH
  // ========================================

  app.get(`${ADMIN_PREFIX}/system/health`, adminAuthMiddleware, async (req, res) => {
    try {
      // Database connection check
      const dbHealthy = await db.select({ count: count() }).from(users).then(() => true).catch(() => false);

      // Get system metrics
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      res.json({
        status: dbHealthy ? "healthy" : "degraded",
        uptime: Math.floor(uptime),
        memory: {
          heapUsed: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
          rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
        },
        database: dbHealthy ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("System health check error:", error);
      res.status(500).json({ message: "Health check failed" });
    }
  });

  // Fix #34: Activity Log Retention - Cleanup old logs
  app.post(`${ADMIN_PREFIX}/system/cleanup-logs`, adminAuthMiddleware, async (req, res) => {
    try {
      const admin = (req as any).admin;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
      const deleted = await db
        .delete(adminActivityLogs)
        .where(lte(adminActivityLogs.createdAt, cutoffDate))
        .returning();
      await logAdminActivity(
        admin.id,
        "cleanup_logs",
        "system",
        null,
        { deletedCount: deleted.length, retentionDays: LOG_RETENTION_DAYS },
        getClientIP(req)
      );
      res.json({
        message: `Cleaned up ${deleted.length} old activity logs`,
        deletedCount: deleted.length,
        retentionDays: LOG_RETENTION_DAYS,
      });
    } catch (error) {
      console.error("Cleanup logs error:", error);
      res.status(500).json({ message: "Failed to cleanup logs" });
    }
  });

  console.log(`[ADMIN] Admin routes registered at ${ADMIN_PREFIX}`);
}
