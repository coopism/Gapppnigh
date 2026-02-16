import { Router, type Request, Response } from "express";
import { db } from "./db";
import { v4 as uuidv4 } from "uuid";
import {
  adminUsers, adminSessions, adminActivityLogs, users, bookings, deals, hotels, promoCodes,
  featureFlags, siteConfig, supportTickets, cmsCityPages, cmsBanners, cmsStaticPages,
  notificationTemplates, notificationLogs, properties, propertyBookings, propertyAvailability, airbnbHosts
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count, ilike, or, asc, ne } from "drizzle-orm";

const ADMIN_PREFIX = "/api/x9k2p7m4";

// ========================================
// RBAC PERMISSION SYSTEM
// ========================================

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["*"], // All permissions
  admin: [
    "view_dashboard", "manage_deals", "manage_properties", "manage_inventory",
    "manage_users", "ban_users", "manage_bookings", "cancel_refund",
    "view_payments", "manage_promos", "issue_credits", "manage_content",
    "send_notifications", "manage_support", "feature_flags", "view_audit_logs",
  ],
  support: [
    "view_dashboard", "manage_users_limited", "manage_bookings",
    "issue_credits", "manage_support", "view_audit_logs",
  ],
  finance: [
    "view_dashboard", "cancel_refund", "view_payments", "process_payouts",
    "issue_credits", "view_audit_logs",
  ],
  content_manager: [
    "view_dashboard", "manage_content", "send_notifications", "view_audit_logs",
  ],
  readonly: ["view_dashboard", "view_audit_logs"],
};

export function hasPermission(admin: any, permission: string): boolean {
  // Default to "admin" role if role is null/undefined/empty (legacy users created before role column)
  const effectiveRole = admin.role && ROLE_PERMISSIONS[admin.role] ? admin.role : "admin";
  const rolePerms = ROLE_PERMISSIONS[effectiveRole] || [];
  if (rolePerms.includes("*")) return true;
  if (rolePerms.includes(permission)) return true;
  // Check granular permission overrides
  if (admin.permissions && admin.permissions.includes(permission)) return true;
  return false;
}

function requirePermission(permission: string) {
  return (req: Request, res: Response, next: Function) => {
    const admin = (req as any).admin;
    if (!admin) return res.status(401).json({ message: "Unauthorized" });
    if (!hasPermission(admin, permission)) {
      console.warn(`[RBAC] Permission denied: admin=${admin.email}, role=${admin.role}, needed=${permission}`);
      return res.status(403).json({ message: `Permission denied: ${permission}` });
    }
    next();
  };
}

// Admin auth middleware (duplicated for standalone registration)
async function adminAuth(req: Request, res: Response, next: Function) {
  const sessionToken = req.cookies?.["admin_session"];
  if (!sessionToken) return res.status(401).json({ message: "Unauthorized" });

  try {
    const [session] = await db.select().from(adminSessions)
      .where(eq(adminSessions.id, sessionToken)).limit(1);
    if (!session || new Date(session.expiresAt) < new Date()) {
      res.clearCookie("admin_session");
      return res.status(401).json({ message: "Session expired" });
    }
    const [admin] = await db.select().from(adminUsers)
      .where(eq(adminUsers.id, session.adminId)).limit(1);
    if (!admin || !admin.isActive) return res.status(403).json({ message: "Access denied" });
    (req as any).admin = admin;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
}

function getIP(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

async function auditLog(
  adminId: string, action: string, module: string,
  targetType: string | null, targetId: string | null,
  details: any, ip: string,
  beforeSnapshot?: any, afterSnapshot?: any
) {
  try {
    await db.insert(adminActivityLogs).values({
      id: uuidv4(), adminId, action, module, targetType, targetId,
      details, beforeSnapshot: beforeSnapshot || null,
      afterSnapshot: afterSnapshot || null, ipAddress: ip,
    });
  } catch (e) { console.error("Audit log error:", e); }
}

// ========================================
// REGISTER ALL OPS ROUTES
// ========================================

export function registerAdminOpsRoutes(app: Router) {

  // ========================================
  // A) ENHANCED DASHBOARD STATS
  // ========================================

  app.get(`${ADMIN_PREFIX}/stats/enhanced`, adminAuth, async (req, res) => {
    try {
      const { period = "30" } = req.query;
      const daysAgo = parseInt(period as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Core metrics
      const [totalUsersCount] = await db.select({ count: count() }).from(users);
      const [totalPropertiesCount] = await db.select({ count: count() }).from(properties);
      const [activePropertiesCount] = await db.select({ count: count() }).from(properties)
        .where(eq(properties.status, "approved"));
      const [pendingPropertiesCount] = await db.select({ count: count() }).from(properties)
        .where(eq(properties.status, "pending_approval"));

      // Property bookings
      const [totalPropBookings] = await db.select({ count: count() }).from(propertyBookings);
      const [recentPropBookings] = await db.select({ count: count() }).from(propertyBookings)
        .where(gte(propertyBookings.createdAt, startDate));
      const [propRevenue] = await db.select({
        total: sql<number>`COALESCE(SUM(${propertyBookings.totalPrice}), 0)`,
      }).from(propertyBookings).where(eq(propertyBookings.status, "confirmed"));

      // Cancellations
      const [cancelledBookings] = await db.select({ count: count() }).from(propertyBookings)
        .where(and(eq(propertyBookings.status, "cancelled"), gte(propertyBookings.createdAt, startDate)));

      // New users in period
      const [newUsers] = await db.select({ count: count() }).from(users)
        .where(gte(users.createdAt, startDate));

      // Open support tickets
      const [openTickets] = await db.select({ count: count() }).from(supportTickets)
        .where(eq(supportTickets.status, "open"));

      // Top cities by property bookings
      const topCities = await db.select({
        city: properties.city,
        bookings: count(),
      }).from(propertyBookings)
        .innerJoin(properties, eq(propertyBookings.propertyId, properties.id))
        .groupBy(properties.city)
        .orderBy(desc(count()))
        .limit(10);

      // Daily revenue chart data
      const dailyRevenue = await db.select({
        date: sql<string>`DATE(${propertyBookings.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${propertyBookings.totalPrice}), 0)`,
        bookings: count(),
      }).from(propertyBookings)
        .where(gte(propertyBookings.createdAt, startDate))
        .groupBy(sql`DATE(${propertyBookings.createdAt})`)
        .orderBy(sql`DATE(${propertyBookings.createdAt})`);

      // Daily signups chart data
      const dailySignups = await db.select({
        date: sql<string>`DATE(${users.createdAt})`,
        signups: count(),
      }).from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`);

      // Alerts: things needing action
      const alerts: { type: string; message: string; count: number; link: string }[] = [];
      if (pendingPropertiesCount.count > 0) {
        alerts.push({ type: "warning", message: "Properties pending approval", count: pendingPropertiesCount.count, link: "/admin/properties?status=pending_approval" });
      }
      if (openTickets.count > 0) {
        alerts.push({ type: "info", message: "Open support tickets", count: openTickets.count, link: "/admin/support" });
      }
      if (cancelledBookings.count > 0) {
        alerts.push({ type: "error", message: `Cancellations in last ${daysAgo} days`, count: cancelledBookings.count, link: "/admin/bookings?status=cancelled" });
      }

      res.json({
        metrics: {
          totalUsers: totalUsersCount.count,
          newUsers: newUsers.count,
          totalProperties: totalPropertiesCount.count,
          activeProperties: activePropertiesCount.count,
          pendingProperties: pendingPropertiesCount.count,
          totalBookings: totalPropBookings.count,
          recentBookings: recentPropBookings.count,
          totalRevenue: Math.floor(Number(propRevenue.total) / 100),
          cancellations: cancelledBookings.count,
          openTickets: openTickets.count,
        },
        topCities: topCities.map(c => ({ city: c.city, bookings: c.bookings })),
        dailyRevenue: dailyRevenue.map(d => ({ date: d.date, revenue: Math.floor(Number(d.revenue) / 100), bookings: d.bookings })),
        dailySignups: dailySignups.map(d => ({ date: d.date, signups: d.signups })),
        alerts,
      });
    } catch (error) {
      console.error("Enhanced stats error:", error);
      res.status(500).json({ message: "Failed to fetch enhanced stats" });
    }
  });

  // ========================================
  // B) PROPERTIES MANAGEMENT
  // ========================================

  app.get(`${ADMIN_PREFIX}/properties`, adminAuth, requirePermission("manage_properties"), async (req, res) => {
    try {
      const { page = "1", limit = "50", status = "", search = "", city = "" } = req.query;
      const validatedLimit = Math.min(Math.max(parseInt(limit as string), 1), 100);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      const conditions: any[] = [];
      if (status) conditions.push(eq(properties.status, status as string));
      if (city) conditions.push(eq(properties.city, city as string));
      if (search) {
        conditions.push(or(
          ilike(properties.title, `%${search as string}%`),
          ilike(properties.city, `%${search as string}%`)
        ));
      }

      const allProperties = await db.select({
        id: properties.id,
        title: properties.title,
        city: properties.city,
        state: properties.state,
        status: properties.status,
        propertyType: properties.propertyType,
        baseNightlyRate: properties.baseNightlyRate,
        hostId: properties.hostId,
        isActive: properties.isActive,
        createdAt: properties.createdAt,
      }).from(properties)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(properties.createdAt))
        .limit(validatedLimit)
        .offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(properties)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({ properties: allProperties, total: totalCount.count, page: validatedPage, limit: validatedLimit });
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Get single property with full details + host info
  app.get(`${ADMIN_PREFIX}/properties/:propertyId`, adminAuth, requirePermission("manage_properties"), async (req, res) => {
    try {
      const propertyId = req.params.propertyId as string;
      const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
      if (!property) return res.status(404).json({ message: "Property not found" });

      // Get host info
      let host = null;
      try {
        const [h] = await db.select({
          id: airbnbHosts.id,
          name: airbnbHosts.name,
          email: airbnbHosts.email,
          phone: airbnbHosts.phone,
          isSuperhost: airbnbHosts.isSuperhost,
          isActive: airbnbHosts.isActive,
          createdAt: airbnbHosts.createdAt,
        }).from(airbnbHosts).where(eq(airbnbHosts.id, property.hostId)).limit(1);
        host = h || null;
      } catch {}

      res.json({ property, host });
    } catch (error) {
      console.error("Get property detail error:", error);
      res.status(500).json({ message: "Failed to fetch property details" });
    }
  });

  // Approve/Reject/Suspend property
  app.patch(`${ADMIN_PREFIX}/properties/:propertyId/status`, adminAuth, requirePermission("manage_properties"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const propertyId = req.params.propertyId as string;
      const { status: newStatus, reason } = req.body;

      if (!["approved", "rejected", "suspended", "pending_approval"].includes(newStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const [before] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
      if (!before) return res.status(404).json({ message: "Property not found" });

      const updateData: any = { status: newStatus };
      if (newStatus === "approved") {
        updateData.approvedAt = new Date();
        updateData.approvedBy = admin.id;
        updateData.isActive = true;
      }
      if (newStatus === "rejected") {
        updateData.rejectionReason = reason || null;
        updateData.isActive = false;
      }
      if (newStatus === "suspended") {
        updateData.isActive = false;
      }

      await db.update(properties).set(updateData).where(eq(properties.id, propertyId));

      await auditLog(admin.id, `property_${newStatus}`, "properties", "property", propertyId,
        { reason }, getIP(req), { status: before.status }, { status: newStatus });

      res.json({ success: true, message: `Property ${newStatus}` });
    } catch (error) {
      console.error("Update property status error:", error);
      res.status(500).json({ message: "Failed to update property status" });
    }
  });

  // ========================================
  // C) INVENTORY / AVAILABILITY
  // ========================================

  app.get(`${ADMIN_PREFIX}/inventory/:propertyId`, adminAuth, requirePermission("manage_inventory"), async (req, res) => {
    try {
      const propertyId = req.params.propertyId as string;
      const { month } = req.query; // YYYY-MM format

      let dateConditions: any[] = [eq(propertyAvailability.propertyId, propertyId as string)];
      if (month) {
        dateConditions.push(sql`${propertyAvailability.date} LIKE ${`${month as string}%`}`);
      }

      const availability = await db.select().from(propertyAvailability)
        .where(and(...dateConditions))
        .orderBy(asc(propertyAvailability.date));

      res.json({ availability });
    } catch (error) {
      console.error("Get inventory error:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Update availability for a specific date
  app.patch(`${ADMIN_PREFIX}/inventory/:propertyId/:date`, adminAuth, requirePermission("manage_inventory"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const propertyId = req.params.propertyId as string;
      const date = req.params.date as string;
      const { isAvailable, isGapNight, nightlyRate, gapNightDiscount } = req.body;

      const [existing] = await db.select().from(propertyAvailability)
        .where(and(eq(propertyAvailability.propertyId, propertyId), eq(propertyAvailability.date, date)))
        .limit(1);

      if (existing) {
        const updateData: any = {};
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
        if (isGapNight !== undefined) updateData.isGapNight = isGapNight;
        if (nightlyRate !== undefined) updateData.nightlyRate = nightlyRate;
        if (gapNightDiscount !== undefined) updateData.gapNightDiscount = gapNightDiscount;

        await db.update(propertyAvailability).set(updateData)
          .where(eq(propertyAvailability.id, existing.id));

        await auditLog(admin.id, "inventory_updated", "inventory", "availability", existing.id,
          { propertyId, date, changes: updateData }, getIP(req), existing, { ...existing, ...updateData });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Update inventory error:", error);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  // ========================================
  // D) HOSTS MANAGEMENT
  // ========================================

  app.get(`${ADMIN_PREFIX}/hosts`, adminAuth, requirePermission("manage_properties"), async (req, res) => {
    try {
      const { page = "1", limit = "50", search = "" } = req.query;
      const validatedLimit = Math.min(Math.max(parseInt(limit as string), 1), 100);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      const searchCondition = search
        ? or(ilike(airbnbHosts.email, `%${search as string}%`), ilike(airbnbHosts.name, `%${search as string}%`))
        : undefined;

      const allHosts = await db.select().from(airbnbHosts)
        .where(searchCondition)
        .orderBy(desc(airbnbHosts.createdAt))
        .limit(validatedLimit).offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(airbnbHosts);

      res.json({ hosts: allHosts, total: totalCount.count, page: validatedPage, limit: validatedLimit });
    } catch (error) {
      console.error("Get hosts error:", error);
      res.status(500).json({ message: "Failed to fetch hosts" });
    }
  });

  // ========================================
  // E) ENHANCED BOOKINGS (Property Bookings)
  // ========================================

  app.get(`${ADMIN_PREFIX}/property-bookings`, adminAuth, requirePermission("manage_bookings"), async (req, res) => {
    try {
      const { page = "1", limit = "50", status = "", search = "", city = "" } = req.query;
      const validatedLimit = Math.min(Math.max(parseInt(limit as string), 1), 100);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      const conditions: any[] = [];
      if (status) conditions.push(eq(propertyBookings.status, status as string));

      const allBookings = await db.select().from(propertyBookings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(propertyBookings.createdAt))
        .limit(validatedLimit).offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(propertyBookings)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({ bookings: allBookings, total: totalCount.count, page: validatedPage, limit: validatedLimit });
    } catch (error) {
      console.error("Get property bookings error:", error);
      res.status(500).json({ message: "Failed to fetch property bookings" });
    }
  });

  // Cancel booking + add note
  app.patch(`${ADMIN_PREFIX}/property-bookings/:bookingId/cancel`, adminAuth, requirePermission("cancel_refund"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const bookingId = req.params.bookingId as string;
      const { reason } = req.body;

      const [before] = await db.select().from(propertyBookings).where(eq(propertyBookings.id, bookingId)).limit(1);
      if (!before) return res.status(404).json({ message: "Booking not found" });

      await db.update(propertyBookings).set({
        status: "cancelled",
        specialRequests: before.specialRequests ? `${before.specialRequests}\n[Admin Cancel] ${reason || ''}` : `[Admin Cancel] ${reason || ''}`,
      }).where(eq(propertyBookings.id, bookingId));

      await auditLog(admin.id, "booking_cancelled", "bookings", "property_booking", bookingId,
        { reason }, getIP(req), { status: before.status }, { status: "cancelled" });

      res.json({ success: true, message: "Booking cancelled" });
    } catch (error) {
      console.error("Cancel booking error:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // Add internal note to booking
  app.patch(`${ADMIN_PREFIX}/property-bookings/:bookingId/note`, adminAuth, requirePermission("manage_bookings"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const bookingId = req.params.bookingId as string;
      const { note } = req.body;

      const [booking] = await db.select().from(propertyBookings).where(eq(propertyBookings.id, bookingId)).limit(1);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const existingNotes = booking.specialRequests || "";
      const newNotes = existingNotes
        ? `${existingNotes}\n[${new Date().toISOString()}] ${admin.name}: ${note}`
        : `[${new Date().toISOString()}] ${admin.name}: ${note}`;

      await db.update(propertyBookings).set({ specialRequests: newNotes }).where(eq(propertyBookings.id, bookingId));

      await auditLog(admin.id, "booking_note_added", "bookings", "property_booking", bookingId,
        { note }, getIP(req));

      res.json({ success: true });
    } catch (error) {
      console.error("Add booking note error:", error);
      res.status(500).json({ message: "Failed to add note" });
    }
  });

  // ========================================
  // G) USER ACTIONS (suspend, ban, notes, credits)
  // ========================================

  app.patch(`${ADMIN_PREFIX}/users/:userId/status`, adminAuth, requirePermission("ban_users"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const userId = req.params.userId as string;
      const { status: newStatus, reason } = req.body;

      if (!["active", "suspended", "banned"].includes(newStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!before) return res.status(404).json({ message: "User not found" });

      const updateData: any = { status: newStatus };
      if (newStatus === "suspended" || newStatus === "banned") {
        updateData.suspendedAt = new Date();
        updateData.suspendedBy = admin.id;
        updateData.suspensionReason = reason || null;
      } else {
        updateData.suspendedAt = null;
        updateData.suspendedBy = null;
        updateData.suspensionReason = null;
      }

      await db.update(users).set(updateData).where(eq(users.id, userId));

      await auditLog(admin.id, `user_${newStatus}`, "users", "user", userId,
        { reason }, getIP(req), { status: before.status }, { status: newStatus });

      res.json({ success: true, message: `User ${newStatus}` });
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Update user fraud risk
  app.patch(`${ADMIN_PREFIX}/users/:userId/fraud-risk`, adminAuth, requirePermission("ban_users"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const userId = req.params.userId as string;
      const { fraudRisk } = req.body;

      if (!["none", "low", "medium", "high"].includes(fraudRisk)) {
        return res.status(400).json({ message: "Invalid fraud risk level" });
      }

      const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!before) return res.status(404).json({ message: "User not found" });

      await db.update(users).set({ fraudRisk }).where(eq(users.id, userId));

      await auditLog(admin.id, "user_fraud_risk_updated", "users", "user", userId,
        { fraudRisk }, getIP(req), { fraudRisk: before.fraudRisk }, { fraudRisk });

      res.json({ success: true });
    } catch (error) {
      console.error("Update fraud risk error:", error);
      res.status(500).json({ message: "Failed to update fraud risk" });
    }
  });

  // Add admin note to user
  app.patch(`${ADMIN_PREFIX}/users/:userId/notes`, adminAuth, requirePermission("manage_users"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const userId = req.params.userId as string;
      const { note } = req.body;

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return res.status(404).json({ message: "User not found" });

      const existing = user.adminNotes || "";
      const newNotes = existing
        ? `${existing}\n[${new Date().toISOString()}] ${admin.name}: ${note}`
        : `[${new Date().toISOString()}] ${admin.name}: ${note}`;

      await db.update(users).set({ adminNotes: newNotes }).where(eq(users.id, userId));

      await auditLog(admin.id, "user_note_added", "users", "user", userId, { note }, getIP(req));

      res.json({ success: true });
    } catch (error) {
      console.error("Add user note error:", error);
      res.status(500).json({ message: "Failed to add note" });
    }
  });

  // ========================================
  // H) ENHANCED PROMO CODES
  // ========================================

  app.patch(`${ADMIN_PREFIX}/promo-codes/:codeId`, adminAuth, requirePermission("manage_promos"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const codeId = req.params.codeId as string;
      const updates = req.body;

      const [before] = await db.select().from(promoCodes).where(eq(promoCodes.id, codeId)).limit(1);
      if (!before) return res.status(404).json({ message: "Promo code not found" });

      await db.update(promoCodes).set(updates).where(eq(promoCodes.id, codeId));

      await auditLog(admin.id, "promo_code_updated", "promotions", "promo_code", codeId,
        updates, getIP(req), before, { ...before, ...updates });

      res.json({ success: true });
    } catch (error) {
      console.error("Update promo code error:", error);
      res.status(500).json({ message: "Failed to update promo code" });
    }
  });

  // ========================================
  // I) CMS - CITY PAGES
  // ========================================

  app.get(`${ADMIN_PREFIX}/cms/cities`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const cities = await db.select().from(cmsCityPages).orderBy(asc(cmsCityPages.city));
      res.json({ cities });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch city pages" });
    }
  });

  app.post(`${ADMIN_PREFIX}/cms/cities`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const data = req.body;

      const newCity = {
        id: uuidv4(),
        city: data.city,
        state: data.state || null,
        heroTitle: data.heroTitle || null,
        heroSubtitle: data.heroSubtitle || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        featuredPropertyIds: data.featuredPropertyIds || [],
        faqs: data.faqs || [],
        isPublished: data.isPublished || false,
        updatedBy: admin.id,
      };

      await db.insert(cmsCityPages).values(newCity);
      await auditLog(admin.id, "city_page_created", "content", "cms_city_page", newCity.id, { city: data.city }, getIP(req));

      res.json({ cityPage: newCity });
    } catch (error) {
      console.error("Create city page error:", error);
      res.status(500).json({ message: "Failed to create city page" });
    }
  });

  app.patch(`${ADMIN_PREFIX}/cms/cities/:cityId`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const cityId = req.params.cityId as string;
      const updates = { ...req.body, updatedBy: admin.id, updatedAt: new Date() };

      const [before] = await db.select().from(cmsCityPages).where(eq(cmsCityPages.id, cityId)).limit(1);
      if (!before) return res.status(404).json({ message: "City page not found" });

      await db.update(cmsCityPages).set(updates).where(eq(cmsCityPages.id, cityId));
      await auditLog(admin.id, "city_page_updated", "content", "cms_city_page", cityId, updates, getIP(req), before, { ...before, ...updates });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update city page" });
    }
  });

  // ========================================
  // I) CMS - BANNERS
  // ========================================

  app.get(`${ADMIN_PREFIX}/cms/banners`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const banners = await db.select().from(cmsBanners).orderBy(desc(cmsBanners.priority));
      res.json({ banners });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  app.post(`${ADMIN_PREFIX}/cms/banners`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const data = req.body;

      const newBanner = {
        id: uuidv4(),
        title: data.title,
        message: data.message,
        type: data.type || "info",
        placement: data.placement || "global",
        cityFilter: data.cityFilter || [],
        bgColor: data.bgColor || null,
        textColor: data.textColor || null,
        linkUrl: data.linkUrl || null,
        linkText: data.linkText || null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive !== false,
        priority: data.priority || 0,
        createdBy: admin.id,
      };

      await db.insert(cmsBanners).values(newBanner);
      await auditLog(admin.id, "banner_created", "content", "cms_banner", newBanner.id, { title: data.title }, getIP(req));

      res.json({ banner: newBanner });
    } catch (error) {
      res.status(500).json({ message: "Failed to create banner" });
    }
  });

  app.patch(`${ADMIN_PREFIX}/cms/banners/:bannerId`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const bannerId = req.params.bannerId as string;
      const updates = { ...req.body, updatedAt: new Date() };

      await db.update(cmsBanners).set(updates).where(eq(cmsBanners.id, bannerId));
      await auditLog(admin.id, "banner_updated", "content", "cms_banner", bannerId, updates, getIP(req));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  app.delete(`${ADMIN_PREFIX}/cms/banners/:bannerId`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const bannerId = req.params.bannerId as string;

      await db.delete(cmsBanners).where(eq(cmsBanners.id, bannerId));
      await auditLog(admin.id, "banner_deleted", "content", "cms_banner", bannerId, {}, getIP(req));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  // ========================================
  // I) CMS - STATIC PAGES
  // ========================================

  app.get(`${ADMIN_PREFIX}/cms/pages`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const pages = await db.select().from(cmsStaticPages).orderBy(asc(cmsStaticPages.slug));
      res.json({ pages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch static pages" });
    }
  });

  app.post(`${ADMIN_PREFIX}/cms/pages`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const data = req.body;

      const newPage = {
        id: uuidv4(),
        slug: data.slug,
        title: data.title,
        content: data.content || "",
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        lastEditedBy: admin.id,
      };

      await db.insert(cmsStaticPages).values(newPage);
      await auditLog(admin.id, "static_page_created", "content", "cms_static_page", newPage.id, { slug: data.slug }, getIP(req));

      res.json({ page: newPage });
    } catch (error) {
      res.status(500).json({ message: "Failed to create static page" });
    }
  });

  app.patch(`${ADMIN_PREFIX}/cms/pages/:pageId`, adminAuth, requirePermission("manage_content"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const pageId = req.params.pageId as string;
      const updates = { ...req.body, lastEditedBy: admin.id, updatedAt: new Date() };

      const [before] = await db.select().from(cmsStaticPages).where(eq(cmsStaticPages.id, pageId)).limit(1);
      await db.update(cmsStaticPages).set(updates).where(eq(cmsStaticPages.id, pageId));
      await auditLog(admin.id, "static_page_updated", "content", "cms_static_page", pageId, updates, getIP(req), before, { ...before, ...updates });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update static page" });
    }
  });

  // ========================================
  // J) NOTIFICATION TEMPLATES
  // ========================================

  app.get(`${ADMIN_PREFIX}/notifications/templates`, adminAuth, requirePermission("send_notifications"), async (req, res) => {
    try {
      const templates = await db.select().from(notificationTemplates).orderBy(desc(notificationTemplates.createdAt));
      res.json({ templates });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post(`${ADMIN_PREFIX}/notifications/templates`, adminAuth, requirePermission("send_notifications"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const data = req.body;

      const template = {
        id: uuidv4(),
        name: data.name,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
        category: data.category || "marketing",
        createdBy: admin.id,
      };

      await db.insert(notificationTemplates).values(template);
      await auditLog(admin.id, "template_created", "notifications", "notification_template", template.id, { name: data.name }, getIP(req));

      res.json({ template });
    } catch (error) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Notification delivery logs
  app.get(`${ADMIN_PREFIX}/notifications/logs`, adminAuth, requirePermission("send_notifications"), async (req, res) => {
    try {
      const { page = "1", limit = "50" } = req.query;
      const validatedLimit = Math.min(Math.max(parseInt(limit as string), 1), 100);
      const offset = (Math.max(parseInt(page as string), 1) - 1) * validatedLimit;

      const logs = await db.select().from(notificationLogs)
        .orderBy(desc(notificationLogs.createdAt))
        .limit(validatedLimit).offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(notificationLogs);

      res.json({ logs, total: totalCount.count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notification logs" });
    }
  });

  // ========================================
  // K) SUPPORT TICKETS
  // ========================================

  app.get(`${ADMIN_PREFIX}/support/tickets`, adminAuth, requirePermission("manage_support"), async (req, res) => {
    try {
      const { page = "1", limit = "50", status = "", priority = "", category = "" } = req.query;
      const validatedLimit = Math.min(Math.max(parseInt(limit as string), 1), 100);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      const conditions: any[] = [];
      if (status) conditions.push(eq(supportTickets.status, status as string));
      if (priority) conditions.push(eq(supportTickets.priority, priority as string));
      if (category) conditions.push(eq(supportTickets.category, category as string));

      const tickets = await db.select().from(supportTickets)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(supportTickets.createdAt))
        .limit(validatedLimit).offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(supportTickets)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({ tickets, total: totalCount.count, page: validatedPage, limit: validatedLimit });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.post(`${ADMIN_PREFIX}/support/tickets`, adminAuth, requirePermission("manage_support"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const data = req.body;

      const ticket = {
        id: uuidv4(),
        userId: data.userId || null,
        bookingId: data.bookingId || null,
        subject: data.subject,
        category: data.category || "other",
        priority: data.priority || "medium",
        status: "open" as const,
        assignedTo: data.assignedTo || admin.id,
        messages: data.initialMessage ? [{ sender: admin.name, message: data.initialMessage, timestamp: new Date().toISOString(), isInternal: false }] : [],
      };

      await db.insert(supportTickets).values(ticket);
      await auditLog(admin.id, "ticket_created", "support", "support_ticket", ticket.id, { subject: data.subject }, getIP(req));

      res.json({ ticket });
    } catch (error) {
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Reply to ticket
  app.post(`${ADMIN_PREFIX}/support/tickets/:ticketId/reply`, adminAuth, requirePermission("manage_support"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const ticketId = req.params.ticketId as string;
      const { message, isInternal } = req.body;

      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      const messages = (ticket.messages as any[]) || [];
      messages.push({
        sender: admin.name,
        message,
        timestamp: new Date().toISOString(),
        isInternal: isInternal || false,
      });

      await db.update(supportTickets).set({
        messages,
        status: "in_progress",
        updatedAt: new Date(),
      }).where(eq(supportTickets.id, ticketId));

      await auditLog(admin.id, "ticket_reply", "support", "support_ticket", ticketId, { isInternal }, getIP(req));

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reply to ticket" });
    }
  });

  // Update ticket status/priority/assignment
  app.patch(`${ADMIN_PREFIX}/support/tickets/:ticketId`, adminAuth, requirePermission("manage_support"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const ticketId = req.params.ticketId as string;
      const updates: any = { ...req.body, updatedAt: new Date() };
      if (updates.status === "resolved") updates.resolvedAt = new Date();

      const [before] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
      if (!before) return res.status(404).json({ message: "Ticket not found" });

      await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticketId));
      await auditLog(admin.id, "ticket_updated", "support", "support_ticket", ticketId, updates, getIP(req),
        { status: before.status, priority: before.priority }, { ...updates });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // ========================================
  // L) FEATURE FLAGS
  // ========================================

  app.get(`${ADMIN_PREFIX}/feature-flags`, adminAuth, requirePermission("feature_flags"), async (req, res) => {
    try {
      const flags = await db.select().from(featureFlags).orderBy(asc(featureFlags.key));
      res.json({ flags });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.post(`${ADMIN_PREFIX}/feature-flags`, adminAuth, requirePermission("feature_flags"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const { key, label, description, enabled, category } = req.body;

      const flag = {
        id: uuidv4(),
        key,
        label,
        description: description || null,
        enabled: enabled || false,
        category: category || "feature",
        updatedBy: admin.id,
      };

      await db.insert(featureFlags).values(flag);
      await auditLog(admin.id, "feature_flag_created", "system", "feature_flag", flag.id, { key, enabled }, getIP(req));

      res.json({ flag });
    } catch (error) {
      res.status(500).json({ message: "Failed to create feature flag" });
    }
  });

  app.patch(`${ADMIN_PREFIX}/feature-flags/:flagId`, adminAuth, requirePermission("feature_flags"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const flagId = req.params.flagId as string;
      const { enabled, label, description } = req.body;

      const [before] = await db.select().from(featureFlags).where(eq(featureFlags.id, flagId)).limit(1);
      if (!before) return res.status(404).json({ message: "Feature flag not found" });

      const updates: any = { updatedBy: admin.id, updatedAt: new Date() };
      if (enabled !== undefined) updates.enabled = enabled;
      if (label !== undefined) updates.label = label;
      if (description !== undefined) updates.description = description;

      await db.update(featureFlags).set(updates).where(eq(featureFlags.id, flagId));
      await auditLog(admin.id, "feature_flag_updated", "system", "feature_flag", flagId,
        { enabled }, getIP(req), { enabled: before.enabled }, { enabled: updates.enabled ?? before.enabled });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update feature flag" });
    }
  });

  // ========================================
  // L) SITE CONFIGURATION
  // ========================================

  app.get(`${ADMIN_PREFIX}/site-config`, adminAuth, requirePermission("view_dashboard"), async (req, res) => {
    try {
      const config = await db.select().from(siteConfig).orderBy(asc(siteConfig.category), asc(siteConfig.key));
      res.json({ config });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site config" });
    }
  });

  app.post(`${ADMIN_PREFIX}/site-config`, adminAuth, requirePermission("feature_flags"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const { key, value, valueType, label, description, category } = req.body;

      const configItem = {
        id: uuidv4(),
        key, value: String(value), valueType: valueType || "string",
        label, description: description || null,
        category: category || "general",
        updatedBy: admin.id,
      };

      await db.insert(siteConfig).values(configItem);
      await auditLog(admin.id, "site_config_created", "system", "site_config", configItem.id, { key, value }, getIP(req));

      res.json({ config: configItem });
    } catch (error) {
      res.status(500).json({ message: "Failed to create config" });
    }
  });

  app.patch(`${ADMIN_PREFIX}/site-config/:configId`, adminAuth, requirePermission("feature_flags"), async (req, res) => {
    try {
      const admin = (req as any).admin;
      const configId = req.params.configId as string;
      const { value } = req.body;

      const [before] = await db.select().from(siteConfig).where(eq(siteConfig.id, configId)).limit(1);
      if (!before) return res.status(404).json({ message: "Config not found" });

      await db.update(siteConfig).set({ value: String(value), updatedBy: admin.id, updatedAt: new Date() })
        .where(eq(siteConfig.id, configId));

      await auditLog(admin.id, "site_config_updated", "system", "site_config", configId,
        { key: before.key, value }, getIP(req), { value: before.value }, { value: String(value) });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update config" });
    }
  });

  // ========================================
  // L) ADMIN USERS MANAGEMENT (RBAC)
  // ========================================

  app.get(`${ADMIN_PREFIX}/admin-users`, adminAuth, async (req, res) => {
    try {
      const admin = (req as any).admin;
      if (admin.role !== "owner") return res.status(403).json({ message: "Owner access required" });

      const admins = await db.select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
      }).from(adminUsers).orderBy(desc(adminUsers.createdAt));

      res.json({ admins });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.patch(`${ADMIN_PREFIX}/admin-users/:adminId/role`, adminAuth, async (req, res) => {
    try {
      const admin = (req as any).admin;
      if (admin.role !== "owner") return res.status(403).json({ message: "Owner access required" });

      const targetId = req.params.adminId as string;
      const { role } = req.body;

      if (!["owner", "admin", "support", "finance", "content_manager", "readonly"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const [before] = await db.select().from(adminUsers).where(eq(adminUsers.id, targetId)).limit(1);
      if (!before) return res.status(404).json({ message: "Admin user not found" });

      await db.update(adminUsers).set({ role, updatedAt: new Date() }).where(eq(adminUsers.id, targetId));
      await auditLog(admin.id, "admin_role_changed", "system", "admin_user", targetId,
        { role }, getIP(req), { role: before.role }, { role });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to update admin role" });
    }
  });

  // ========================================
  // M) ENHANCED AUDIT LOGS
  // ========================================

  app.get(`${ADMIN_PREFIX}/audit-logs`, adminAuth, requirePermission("view_audit_logs"), async (req, res) => {
    try {
      const { page = "1", limit = "100", module = "", adminId = "", action = "" } = req.query;
      const validatedLimit = Math.min(Math.max(parseInt(limit as string), 1), 500);
      const validatedPage = Math.max(parseInt(page as string), 1);
      const offset = (validatedPage - 1) * validatedLimit;

      const conditions: any[] = [];
      if (module) conditions.push(eq(adminActivityLogs.module, module as string));
      if (adminId) conditions.push(eq(adminActivityLogs.adminId, adminId as string));
      if (action) conditions.push(eq(adminActivityLogs.action, action as string));

      const logs = await db.select({
        id: adminActivityLogs.id,
        adminId: adminActivityLogs.adminId,
        action: adminActivityLogs.action,
        module: adminActivityLogs.module,
        targetType: adminActivityLogs.targetType,
        targetId: adminActivityLogs.targetId,
        details: adminActivityLogs.details,
        beforeSnapshot: adminActivityLogs.beforeSnapshot,
        afterSnapshot: adminActivityLogs.afterSnapshot,
        ipAddress: adminActivityLogs.ipAddress,
        createdAt: adminActivityLogs.createdAt,
      }).from(adminActivityLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(validatedLimit).offset(offset);

      const [totalCount] = await db.select({ count: count() }).from(adminActivityLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get admin names for display
      const adminIdSet: Record<string, boolean> = {};
      logs.forEach(l => { adminIdSet[l.adminId] = true; });
      const adminNames: Record<string, string> = {};
      if (Object.keys(adminIdSet).length > 0) {
        const admins = await db.select({ id: adminUsers.id, name: adminUsers.name }).from(adminUsers);
        admins.forEach(a => { adminNames[a.id] = a.name; });
      }

      res.json({
        logs: logs.map(l => ({ ...l, adminName: adminNames[l.adminId] || "Unknown" })),
        total: totalCount.count,
        page: validatedPage,
        limit: validatedLimit,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ========================================
  // RBAC INFO ENDPOINT
  // ========================================

  app.get(`${ADMIN_PREFIX}/rbac/permissions`, adminAuth, async (req, res) => {
    const admin = (req as any).admin;
    res.json({
      role: admin.role,
      permissions: ROLE_PERMISSIONS[admin.role] || [],
      allRoles: Object.keys(ROLE_PERMISSIONS),
    });
  });

  console.log(`[ADMIN-OPS] Extended admin routes registered at ${ADMIN_PREFIX}`);
}
