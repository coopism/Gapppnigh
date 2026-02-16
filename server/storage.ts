import { 
  deals, waitlist, hotelInquiries, hotelOwners, hotels, roomTypes, availability, publishedDeals, ownerSessions, bookings, autoListingRules,
  userRewards, rewardsTransactions, hotelReviews, promoCodes, promoCodeUsage, savedListings,
  type Deal, type InsertDeal, type InsertWaitlist, type InsertHotelInquiry, 
  type HotelOwner, type InsertHotelOwner, type HotelProfile, type InsertHotel,
  type RoomTypeRecord, type InsertRoomType, type AvailabilityRecord, type InsertAvailability,
  type PublishedDeal, type InsertPublishedDeal, type OwnerSession,
  type Booking, type InsertBooking, type AutoListingRule, type InsertAutoListingRule
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface IStorage {
  // Existing methods
  getDeals(search?: string, category?: string, sort?: string): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createWaitlistEntry(entry: InsertWaitlist): Promise<void>;
  createHotelInquiry(inquiry: InsertHotelInquiry): Promise<void>;
  
  // Auth methods
  createOwner(email: string, password: string, name?: string): Promise<HotelOwner>;
  getOwnerByEmail(email: string): Promise<HotelOwner | undefined>;
  verifyPassword(email: string, password: string): Promise<HotelOwner | null>;
  createSession(ownerId: string): Promise<string>;
  getSessionOwner(sessionId: string): Promise<HotelOwner | null>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Hotel methods
  getOwnerHotels(ownerId: string): Promise<HotelProfile[]>;
  getHotel(hotelId: string): Promise<HotelProfile | undefined>;
  createHotel(data: InsertHotel): Promise<HotelProfile>;
  updateHotel(hotelId: string, data: Partial<InsertHotel>): Promise<HotelProfile | undefined>;
  deactivateHotel(hotelId: string): Promise<void>;
  
  // Room type methods
  getHotelRoomTypes(hotelId: string): Promise<RoomTypeRecord[]>;
  createRoomType(data: InsertRoomType): Promise<RoomTypeRecord>;
  updateRoomType(roomTypeId: string, data: Partial<InsertRoomType>): Promise<RoomTypeRecord | undefined>;
  deleteRoomType(roomTypeId: string): Promise<void>;
  
  // Availability methods
  getAvailability(roomTypeId: string, startDate: string, endDate: string): Promise<AvailabilityRecord[]>;
  upsertAvailability(data: InsertAvailability): Promise<AvailabilityRecord>;
  bulkUpdateAvailability(roomTypeId: string, startDate: string, endDate: string, data: Partial<InsertAvailability>): Promise<void>;
  
  // Published deals methods
  getHotelDeals(hotelId: string): Promise<PublishedDeal[]>;
  createPublishedDeal(data: InsertPublishedDeal): Promise<PublishedDeal>;
  updatePublishedDeal(dealId: string, data: Partial<InsertPublishedDeal>): Promise<PublishedDeal | undefined>;
  deletePublishedDeal(dealId: string): Promise<void>;
  publishDeals(dealIds: string[]): Promise<void>;
  unpublishDeals(dealIds: string[]): Promise<void>;
  
  // Public API methods
  getPublicHotels(): Promise<HotelProfile[]>;
  getPublicHotel(hotelId: string): Promise<HotelProfile | undefined>;
  getPublicDealsByHotel(hotelId: string, startDate?: string, endDate?: string): Promise<PublishedDeal[]>;
  getPublicDealsGrouped(): Promise<any[]>;
  
  // Booking methods
  createBooking(data: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByDealId(dealId: string): Promise<Booking[]>;
  isDealBooked(dealId: string): Promise<boolean>;
  updateBookingEmailSent(id: string): Promise<void>;
  getAllBookings(): Promise<Booking[]>;
  
  // Consumer deal methods
  createDeal(data: InsertDeal): Promise<Deal>;
  deleteDeal(dealId: string): Promise<void>;
  updateDeal(dealId: string, data: Partial<InsertDeal>): Promise<Deal | undefined>;
  
  // Auto listing rules methods
  getAutoListingRule(hotelId: string): Promise<AutoListingRule | undefined>;
  upsertAutoListingRule(data: InsertAutoListingRule): Promise<AutoListingRule>;
  deleteAutoListingRule(hotelId: string): Promise<void>;
  
  // Rewards system methods
  getUserRewards(userId: string): Promise<any | undefined>;
  createUserRewards(data: any): Promise<any>;
  updateUserRewards(userId: string, data: Partial<any>): Promise<void>;
  createRewardsTransaction(data: any): Promise<any>;
  getRewardsTransactions(userId: string): Promise<any[]>;
  createHotelReview(data: any): Promise<any>;
  getUserReviews(userId: string): Promise<any[]>;
  getPromoCodeByCode(code: string): Promise<any | undefined>;
  hasUserUsedPromoCode(userId: string, promoCodeId: string): Promise<boolean>;
  createPromoCodeUsage(data: any): Promise<any>;
  incrementPromoCodeUsage(promoCodeId: string): Promise<void>;
  getUserBookings(userId: string): Promise<Booking[]>;
  markBookingPointsAwarded(bookingId: string): Promise<void>;
  markBookingReviewSubmitted(bookingId: string): Promise<void>;
  
  // Saved listings methods
  saveProperty(userId: string, propertyId: string): Promise<any>;
  unsaveProperty(userId: string, propertyId: string): Promise<void>;
  saveDeal(userId: string, dealId: string): Promise<any>;
  unsaveDeal(userId: string, dealId: string): Promise<void>;
  getUserSavedListings(userId: string): Promise<any[]>;
  isPropertySaved(userId: string, propertyId: string): Promise<boolean>;
  isDealSaved(userId: string, dealId: string): Promise<boolean>;
  getUserSavedPropertyIds(userId: string): Promise<string[]>;
  getUserSavedDealIds(userId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  
  // ========================================
  // EXISTING METHODS (Deals, Waitlist, Inquiries)
  // ========================================
  
  async getDeals(search?: string, category?: string, sort?: string): Promise<Deal[]> {
    // Legacy hotel deals disabled — platform is stays-only now.
    // Keeping code below intact for potential future use.
    return [];

    let results = await db.select().from(deals);
    
    // Filter out booked deals
    const allBookings = await this.getAllBookings();
    const bookedDealIds = new Set(
      allBookings
        .filter(b => b.status === "CONFIRMED")
        .map(b => b.dealId)
    );
    results = results.filter(deal => !bookedDealIds.has(deal.id));
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      results = results.filter(deal => 
        deal.location.toLowerCase().includes(lowerSearch) || 
        deal.hotelName.toLowerCase().includes(lowerSearch)
      );
    }

    if (category && category !== "All Deals") {
      results = results.filter(deal => deal.categoryTags.includes(category));
    }

    if (sort) {
      switch (sort) {
        case "cheapest":
          results.sort((a, b) => a.dealPrice - b.dealPrice);
          break;
        case "discount":
          results.sort((a, b) => {
            const discountA = (a.normalPrice - a.dealPrice) / a.normalPrice;
            const discountB = (b.normalPrice - b.dealPrice) / b.normalPrice;
            return discountB - discountA;
          });
          break;
        case "rating":
          results.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
          break;
        case "best":
        default:
          results.sort((a, b) => b.dealScore - a.dealScore);
          break;
      }
    }

    return results;
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    // Legacy hotel deals disabled — platform is stays-only now.
    return undefined;

    const result = await db.select().from(deals).where(eq(deals.id, id));
    return result[0];
  }

  async createWaitlistEntry(entry: InsertWaitlist): Promise<void> {
    await db.insert(waitlist).values(entry);
  }

  async createHotelInquiry(inquiry: InsertHotelInquiry): Promise<void> {
    await db.insert(hotelInquiries).values(inquiry);
  }

  // ========================================
  // AUTH METHODS
  // ========================================
  
  async createOwner(email: string, password: string, name?: string): Promise<HotelOwner> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    
    const [owner] = await db.insert(hotelOwners).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      name,
    }).returning();
    
    return owner;
  }

  async getOwnerByEmail(email: string): Promise<HotelOwner | undefined> {
    const result = await db.select().from(hotelOwners).where(eq(hotelOwners.email, email.toLowerCase()));
    return result[0];
  }

  async verifyPassword(email: string, password: string): Promise<HotelOwner | null> {
    const owner = await this.getOwnerByEmail(email);
    if (!owner) return null;
    
    const valid = await bcrypt.compare(password, owner.passwordHash);
    return valid ? owner : null;
  }

  async createSession(ownerId: string): Promise<string> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    
    await db.insert(ownerSessions).values({
      id: sessionId,
      ownerId,
      expiresAt,
    });
    
    return sessionId;
  }

  async getSessionOwner(sessionId: string): Promise<HotelOwner | null> {
    const result = await db
      .select()
      .from(ownerSessions)
      .innerJoin(hotelOwners, eq(ownerSessions.ownerId, hotelOwners.id))
      .where(and(
        eq(ownerSessions.id, sessionId),
        gte(ownerSessions.expiresAt, new Date())
      ));
    
    if (result.length === 0) return null;
    return result[0].hotel_owners;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(ownerSessions).where(eq(ownerSessions.id, sessionId));
  }

  // ========================================
  // HOTEL METHODS
  // ========================================
  
  async getOwnerHotels(ownerId: string): Promise<HotelProfile[]> {
    return await db.select().from(hotels).where(eq(hotels.ownerId, ownerId));
  }

  async getHotel(hotelId: string): Promise<HotelProfile | undefined> {
    const result = await db.select().from(hotels).where(eq(hotels.id, hotelId));
    return result[0];
  }

  async createHotel(data: InsertHotel): Promise<HotelProfile> {
    const id = data.id || uuidv4();
    const [hotel] = await db.insert(hotels).values({ ...data, id }).returning();
    return hotel;
  }

  async updateHotel(hotelId: string, data: Partial<InsertHotel>): Promise<HotelProfile | undefined> {
    const [hotel] = await db
      .update(hotels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(hotels.id, hotelId))
      .returning();
    return hotel;
  }

  async deactivateHotel(hotelId: string): Promise<void> {
    await db.update(hotels).set({ isActive: false, updatedAt: new Date() }).where(eq(hotels.id, hotelId));
    // Also unpublish all deals for this hotel
    await db.update(publishedDeals).set({ status: "DRAFT", updatedAt: new Date() }).where(eq(publishedDeals.hotelId, hotelId));
  }

  // ========================================
  // ROOM TYPE METHODS
  // ========================================
  
  async getHotelRoomTypes(hotelId: string): Promise<RoomTypeRecord[]> {
    return await db.select().from(roomTypes).where(eq(roomTypes.hotelId, hotelId));
  }

  async createRoomType(data: InsertRoomType): Promise<RoomTypeRecord> {
    const id = data.id || uuidv4();
    const [roomType] = await db.insert(roomTypes).values({ ...data, id }).returning();
    return roomType;
  }

  async updateRoomType(roomTypeId: string, data: Partial<InsertRoomType>): Promise<RoomTypeRecord | undefined> {
    const [roomType] = await db
      .update(roomTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roomTypes.id, roomTypeId))
      .returning();
    return roomType;
  }

  async deleteRoomType(roomTypeId: string): Promise<void> {
    // Delete associated availability first
    await db.delete(availability).where(eq(availability.roomTypeId, roomTypeId));
    // Delete associated published deals
    await db.delete(publishedDeals).where(eq(publishedDeals.roomTypeId, roomTypeId));
    // Delete the room type
    await db.delete(roomTypes).where(eq(roomTypes.id, roomTypeId));
  }

  // ========================================
  // AVAILABILITY METHODS
  // ========================================
  
  async getAvailability(roomTypeId: string, startDate: string, endDate: string): Promise<AvailabilityRecord[]> {
    return await db
      .select()
      .from(availability)
      .where(and(
        eq(availability.roomTypeId, roomTypeId),
        gte(availability.date, startDate),
        lte(availability.date, endDate)
      ));
  }

  async upsertAvailability(data: InsertAvailability): Promise<AvailabilityRecord> {
    const id = data.id || uuidv4();
    
    // Check if exists
    const existing = await db
      .select()
      .from(availability)
      .where(and(
        eq(availability.roomTypeId, data.roomTypeId),
        eq(availability.date, data.date)
      ));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(availability)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(availability.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(availability).values({ ...data, id }).returning();
    return created;
  }

  async bulkUpdateAvailability(roomTypeId: string, startDate: string, endDate: string, data: Partial<InsertAvailability>): Promise<void> {
    // Generate dates in range
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    for (const date of dates) {
      await this.upsertAvailability({
        id: uuidv4(),
        roomTypeId,
        date,
        available: data.available ?? 0,
        barRate: data.barRate ?? 100,
        minStay: data.minStay ?? 1,
        closedToArrival: data.closedToArrival ?? false,
      });
    }
  }

  // ========================================
  // PUBLISHED DEALS METHODS
  // ========================================
  
  async getHotelDeals(hotelId: string): Promise<PublishedDeal[]> {
    return await db.select().from(publishedDeals).where(eq(publishedDeals.hotelId, hotelId));
  }

  async createPublishedDeal(data: InsertPublishedDeal): Promise<PublishedDeal> {
    const id = data.id || uuidv4();
    const [deal] = await db.insert(publishedDeals).values({ ...data, id }).returning();
    return deal;
  }

  async updatePublishedDeal(dealId: string, data: Partial<InsertPublishedDeal>): Promise<PublishedDeal | undefined> {
    const [deal] = await db
      .update(publishedDeals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(publishedDeals.id, dealId))
      .returning();
    return deal;
  }

  async deletePublishedDeal(dealId: string): Promise<void> {
    await db.delete(publishedDeals).where(eq(publishedDeals.id, dealId));
  }

  async publishDeals(dealIds: string[]): Promise<void> {
    if (dealIds.length === 0) return;
    await db
      .update(publishedDeals)
      .set({ status: "PUBLISHED", updatedAt: new Date() })
      .where(inArray(publishedDeals.id, dealIds));
  }

  async unpublishDeals(dealIds: string[]): Promise<void> {
    if (dealIds.length === 0) return;
    await db
      .update(publishedDeals)
      .set({ status: "DRAFT", updatedAt: new Date() })
      .where(inArray(publishedDeals.id, dealIds));
  }

  // ========================================
  // PUBLIC API METHODS
  // ========================================
  
  async getPublicHotels(): Promise<HotelProfile[]> {
    return await db.select().from(hotels).where(eq(hotels.isActive, true));
  }

  async getPublicHotel(hotelId: string): Promise<HotelProfile | undefined> {
    const result = await db
      .select()
      .from(hotels)
      .where(and(eq(hotels.id, hotelId), eq(hotels.isActive, true)));
    return result[0];
  }

  async getPublicDealsByHotel(hotelId: string, startDate?: string, endDate?: string): Promise<PublishedDeal[]> {
    let query = db
      .select()
      .from(publishedDeals)
      .where(and(
        eq(publishedDeals.hotelId, hotelId),
        eq(publishedDeals.status, "PUBLISHED")
      ));
    
    const results = await query;
    
    // Filter by date if provided
    if (startDate || endDate) {
      return results.filter(deal => {
        if (startDate && deal.date < startDate) return false;
        if (endDate && deal.date > endDate) return false;
        return true;
      });
    }
    
    return results;
  }

  async getPublicDealsGrouped(): Promise<any[]> {
    // Get all active hotels with published deals
    const hotelsWithDeals = await db
      .select({
        hotel: hotels,
      })
      .from(hotels)
      .where(eq(hotels.isActive, true));
    
    const result = [];
    
    for (const { hotel } of hotelsWithDeals) {
      const hotelDeals = await db
        .select()
        .from(publishedDeals)
        .where(and(
          eq(publishedDeals.hotelId, hotel.id),
          eq(publishedDeals.status, "PUBLISHED")
        ));
      
      if (hotelDeals.length === 0) continue;
      
      const minPrice = Math.min(...hotelDeals.map(d => d.dealPrice));
      const maxDiscount = Math.max(...hotelDeals.map(d => d.discountPercent));
      const sortedDeals = hotelDeals.sort((a, b) => a.date.localeCompare(b.date));
      const nextAvailableDate = sortedDeals[0]?.date;
      
      result.push({
        hotel,
        minPrice,
        maxDiscount,
        nextAvailableDate,
        dealDateCount: hotelDeals.length,
        coverImage: hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      });
    }
    
    return result;
  }

  // ========================================
  // BOOKING METHODS
  // ========================================
  
  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async getBookingsByDealId(dealId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.dealId, dealId));
  }

  async isDealBooked(dealId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.dealId, dealId),
        eq(bookings.status, "CONFIRMED")
      ));
    return result.length > 0;
  }

  async updateBookingEmailSent(id: string): Promise<void> {
    await db.update(bookings).set({ emailSent: true }).where(eq(bookings.id, id));
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  // ========================================
  // CONSUMER DEAL METHODS
  // ========================================
  
  async createDeal(data: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(deals).values(data).returning();
    return deal;
  }

  async deleteDeal(dealId: string): Promise<void> {
    await db.delete(deals).where(eq(deals.id, dealId));
  }

  async updateDeal(dealId: string, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [deal] = await db
      .update(deals)
      .set(data)
      .where(eq(deals.id, dealId))
      .returning();
    return deal;
  }

  // ========================================
  // AUTO LISTING RULES METHODS
  // ========================================

  async getAutoListingRule(hotelId: string): Promise<AutoListingRule | undefined> {
    const [rule] = await db
      .select()
      .from(autoListingRules)
      .where(eq(autoListingRules.hotelId, hotelId));
    return rule;
  }

  async upsertAutoListingRule(data: InsertAutoListingRule): Promise<AutoListingRule> {
    const existing = await this.getAutoListingRule(data.hotelId);
    
    if (existing) {
      const [updated] = await db
        .update(autoListingRules)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(autoListingRules.hotelId, data.hotelId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(autoListingRules)
        .values(data)
        .returning();
      return created;
    }
  }

  async deleteAutoListingRule(hotelId: string): Promise<void> {
    await db
      .delete(autoListingRules)
      .where(eq(autoListingRules.hotelId, hotelId));
  }

  // ========================================
  // REWARDS SYSTEM METHODS
  // ========================================

  async getUserRewards(userId: string): Promise<any | undefined> {
    const [result] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .limit(1);
    return result;
  }

  async createUserRewards(data: any): Promise<any> {
    const [result] = await db.insert(userRewards).values(data).returning();
    return result;
  }

  async updateUserRewards(userId: string, data: Partial<any>): Promise<void> {
    await db
      .update(userRewards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userRewards.userId, userId));
  }

  async createRewardsTransaction(data: any): Promise<any> {
    const [result] = await db.insert(rewardsTransactions).values(data).returning();
    return result;
  }

  async getRewardsTransactions(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(rewardsTransactions)
      .where(eq(rewardsTransactions.userId, userId))
      .orderBy(desc(rewardsTransactions.createdAt));
  }

  async createHotelReview(data: any): Promise<any> {
    const [result] = await db.insert(hotelReviews).values(data).returning();
    return result;
  }

  async getUserReviews(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(hotelReviews)
      .where(eq(hotelReviews.userId, userId))
      .orderBy(desc(hotelReviews.createdAt));
  }

  async getPromoCodeByCode(code: string): Promise<any | undefined> {
    const [result] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code))
      .limit(1);
    return result;
  }

  async hasUserUsedPromoCode(userId: string, promoCodeId: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(promoCodeUsage)
      .where(
        and(
          eq(promoCodeUsage.userId, userId),
          eq(promoCodeUsage.promoCodeId, promoCodeId)
        )
      )
      .limit(1);
    return !!result;
  }

  async createPromoCodeUsage(data: any): Promise<any> {
    const [result] = await db.insert(promoCodeUsage).values(data).returning();
    return result;
  }

  async incrementPromoCodeUsage(promoCodeId: string): Promise<void> {
    await db
      .update(promoCodes)
      .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
      .where(eq(promoCodes.id, promoCodeId));
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async markBookingPointsAwarded(bookingId: string): Promise<void> {
    await db
      .update(bookings)
      .set({ pointsAwarded: true })
      .where(eq(bookings.id, bookingId));
  }

  async markBookingReviewSubmitted(bookingId: string): Promise<void> {
    await db
      .update(bookings)
      .set({ reviewSubmitted: true })
      .where(eq(bookings.id, bookingId));
  }

  // ========================================
  // SAVED LISTINGS
  // ========================================

  async saveProperty(userId: string, propertyId: string): Promise<any> {
    const existing = await db.select().from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.propertyId, propertyId)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [saved] = await db.insert(savedListings).values({
      id: uuidv4(), userId, propertyId, itemType: "property",
    }).returning();
    return saved;
  }

  async unsaveProperty(userId: string, propertyId: string): Promise<void> {
    await db.delete(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.propertyId, propertyId)));
  }

  async saveDeal(userId: string, dealId: string): Promise<any> {
    const existing = await db.select().from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.dealId, dealId)))
      .limit(1);
    if (existing.length > 0) return existing[0];
    const [saved] = await db.insert(savedListings).values({
      id: uuidv4(), userId, dealId, itemType: "deal",
    }).returning();
    return saved;
  }

  async unsaveDeal(userId: string, dealId: string): Promise<void> {
    await db.delete(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.dealId, dealId)));
  }

  async getUserSavedListings(userId: string): Promise<any[]> {
    return await db.select().from(savedListings)
      .where(eq(savedListings.userId, userId))
      .orderBy(desc(savedListings.createdAt));
  }

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const result = await db.select().from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.propertyId, propertyId)))
      .limit(1);
    return result.length > 0;
  }

  async isDealSaved(userId: string, dealId: string): Promise<boolean> {
    const result = await db.select().from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.dealId, dealId)))
      .limit(1);
    return result.length > 0;
  }

  async getUserSavedPropertyIds(userId: string): Promise<string[]> {
    const results = await db.select({ propertyId: savedListings.propertyId }).from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.itemType, "property")));
    return results.map(r => r.propertyId).filter(Boolean) as string[];
  }

  async getUserSavedDealIds(userId: string): Promise<string[]> {
    const results = await db.select({ dealId: savedListings.dealId }).from(savedListings)
      .where(and(eq(savedListings.userId, userId), eq(savedListings.itemType, "deal")));
    return results.map(r => r.dealId).filter(Boolean) as string[];
  }
}

// Legacy MemStorage for backward compatibility during transition
export class MemStorage implements IStorage {
  private deals: Map<string, Deal>;
  private waitlistEntries: InsertWaitlist[];
  private hotelInquiriesEntries: InsertHotelInquiry[];
  private owners: Map<string, HotelOwner>;
  private sessions: Map<string, { ownerId: string; expiresAt: Date }>;
  private hotelsMap: Map<string, HotelProfile>;
  private roomTypesMap: Map<string, RoomTypeRecord>;
  private availabilityMap: Map<string, AvailabilityRecord>;
  private publishedDealsMap: Map<string, PublishedDeal>;

  constructor() {
    this.deals = new Map();
    this.waitlistEntries = [];
    this.hotelInquiriesEntries = [];
    this.owners = new Map();
    this.sessions = new Map();
    this.hotelsMap = new Map();
    this.roomTypesMap = new Map();
    this.availabilityMap = new Map();
    this.publishedDealsMap = new Map();
    this.seedMockData();
  }

  private seedMockData() {
    const getDate = (daysFromNow: number) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split('T')[0];
    };

    const mockDeals: Deal[] = [
      {
        id: "gn_001",
        hotelName: "Crown City Suites",
        location: "Melbourne, VIC",
        stars: 5,
        rating: "4.8",
        reviewCount: 1247,
        checkInDate: getDate(3),
        checkOutDate: getDate(4),
        nights: 1,
        roomType: "King Room",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        normalPrice: 380,
        dealPrice: 247,
        currency: "AUD",
        dealScore: 92,
        categoryTags: ["Luxury", "City", "Last Minute"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-37.8136",
        longitude: "144.9631",
        amenities: ["WiFi", "Pool", "Gym", "Spa", "Restaurant"],
        nearbyHighlight: "5 min to Flinders Station",
        maxGuests: 2,
      },
      {
        id: "gn_002",
        hotelName: "Crown Riverfront",
        location: "Melbourne, VIC",
        stars: 5,
        rating: "4.7",
        reviewCount: 892,
        checkInDate: getDate(4),
        checkOutDate: getDate(5),
        nights: 1,
        roomType: "River View King",
        imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
        normalPrice: 420,
        dealPrice: 294,
        currency: "AUD",
        dealScore: 88,
        categoryTags: ["Luxury", "City", "Trending"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-37.8200",
        longitude: "144.9600",
        amenities: ["WiFi", "Pool", "Gym", "Spa", "Bar"],
        nearbyHighlight: "Southbank Promenade views",
        maxGuests: 2,
      },
      {
        id: "gn_003",
        hotelName: "Bayview Boutique",
        location: "Geelong, VIC",
        stars: 4,
        rating: "4.5",
        reviewCount: 634,
        checkInDate: getDate(2),
        checkOutDate: getDate(3),
        nights: 1,
        roomType: "Standard Queen",
        imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        normalPrice: 195,
        dealPrice: 137,
        currency: "AUD",
        dealScore: 85,
        categoryTags: ["Boutique", "Last Minute"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-38.1499",
        longitude: "144.3617",
        amenities: ["WiFi", "Restaurant", "Bar", "Parking"],
        nearbyHighlight: "Walk to Waterfront",
        maxGuests: 2,
      },
      {
        id: "gn_004",
        hotelName: "Bayview Coastal",
        location: "Mornington, VIC",
        stars: 4,
        rating: "4.6",
        reviewCount: 478,
        checkInDate: getDate(3),
        checkOutDate: getDate(4),
        nights: 1,
        roomType: "Ocean View Room",
        imageUrl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
        normalPrice: 245,
        dealPrice: 159,
        currency: "AUD",
        dealScore: 90,
        categoryTags: ["Beach", "Last Minute", "Trending"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-38.2178",
        longitude: "145.0388",
        amenities: ["WiFi", "Pool", "Spa", "Beach Access"],
        nearbyHighlight: "2 min walk to beach",
        maxGuests: 2,
      },
      {
        id: "gn_005",
        hotelName: "The Langham Melbourne",
        location: "Melbourne, VIC",
        stars: 5,
        rating: "4.9",
        reviewCount: 2156,
        checkInDate: getDate(4),
        checkOutDate: getDate(5),
        nights: 1,
        roomType: "Deluxe King",
        imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
        normalPrice: 480,
        dealPrice: 338,
        currency: "AUD",
        dealScore: 94,
        categoryTags: ["Luxury", "City", "Trending"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-37.8205",
        longitude: "144.9580",
        amenities: ["WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar"],
        nearbyHighlight: "Yarra River views",
        maxGuests: 2,
      },
      {
        id: "gn_006",
        hotelName: "Park Hyatt Melbourne",
        location: "Melbourne, VIC",
        stars: 5,
        rating: "4.8",
        reviewCount: 1834,
        checkInDate: getDate(8),
        checkOutDate: getDate(9),
        nights: 1,
        roomType: "Park Suite",
        imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        normalPrice: 550,
        dealPrice: 385,
        currency: "AUD",
        dealScore: 91,
        categoryTags: ["Luxury", "City"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-37.8128",
        longitude: "144.9695",
        amenities: ["WiFi", "Pool", "Gym", "Spa", "Restaurant"],
        nearbyHighlight: "Opposite St Patrick's Cathedral",
        maxGuests: 2,
      },
      {
        id: "gn_007",
        hotelName: "Crown City Suites",
        location: "Melbourne, VIC",
        stars: 5,
        rating: "4.8",
        reviewCount: 1247,
        checkInDate: getDate(5),
        checkOutDate: getDate(7),
        nights: 2,
        roomType: "Executive Suite",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        normalPrice: 520,
        dealPrice: 364,
        currency: "AUD",
        dealScore: 88,
        categoryTags: ["Luxury", "City"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-37.8136",
        longitude: "144.9631",
        amenities: ["WiFi", "Pool", "Gym", "Spa", "Restaurant"],
        nearbyHighlight: "5 min to Flinders Station",
        maxGuests: 4,
      },
      {
        id: "gn_008",
        hotelName: "Crown Riverfront",
        location: "Melbourne, VIC",
        stars: 5,
        rating: "4.7",
        reviewCount: 892,
        checkInDate: getDate(6),
        checkOutDate: getDate(7),
        nights: 1,
        roomType: "Penthouse Suite",
        imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
        normalPrice: 780,
        dealPrice: 546,
        currency: "AUD",
        dealScore: 90,
        categoryTags: ["Luxury", "City"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-37.8200",
        longitude: "144.9600",
        amenities: ["WiFi", "Pool", "Gym", "Spa", "Bar"],
        nearbyHighlight: "Southbank Promenade views",
        maxGuests: 4,
      },
      {
        id: "gn_009",
        hotelName: "Bayview Boutique",
        location: "Geelong, VIC",
        stars: 4,
        rating: "4.5",
        reviewCount: 634,
        checkInDate: getDate(7),
        checkOutDate: getDate(9),
        nights: 2,
        roomType: "Deluxe King",
        imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        normalPrice: 260,
        dealPrice: 182,
        currency: "AUD",
        dealScore: 87,
        categoryTags: ["Boutique"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-38.1499",
        longitude: "144.3617",
        amenities: ["WiFi", "Restaurant", "Bar", "Parking"],
        nearbyHighlight: "Walk to Waterfront",
        maxGuests: 3,
      },
      {
        id: "gn_010",
        hotelName: "Bayview Coastal",
        location: "Mornington, VIC",
        stars: 4,
        rating: "4.6",
        reviewCount: 478,
        checkInDate: getDate(5),
        checkOutDate: getDate(6),
        nights: 1,
        roomType: "Beachfront Suite",
        imageUrl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
        normalPrice: 420,
        dealPrice: 294,
        currency: "AUD",
        dealScore: 88,
        categoryTags: ["Beach", "Trending"],
        cancellation: "Free cancellation",
        whyCheap: "",
        latitude: "-38.2178",
        longitude: "145.0388",
        amenities: ["WiFi", "Pool", "Spa", "Beach Access"],
        nearbyHighlight: "2 min walk to beach",
        maxGuests: 4,
      },
    ];

    mockDeals.forEach(deal => this.deals.set(deal.id, deal));
  }

  // Implement all interface methods with in-memory storage
  async getDeals(search?: string, category?: string, sort?: string): Promise<Deal[]> {
    let results = Array.from(this.deals.values());
    if (search) {
      const lowerSearch = search.toLowerCase();
      results = results.filter(deal => 
        deal.location.toLowerCase().includes(lowerSearch) || 
        deal.hotelName.toLowerCase().includes(lowerSearch)
      );
    }
    if (category && category !== "All Deals") {
      results = results.filter(deal => deal.categoryTags.includes(category));
    }
    return results;
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async createWaitlistEntry(entry: InsertWaitlist): Promise<void> {
    this.waitlistEntries.push(entry);
  }

  async createHotelInquiry(inquiry: InsertHotelInquiry): Promise<void> {
    this.hotelInquiriesEntries.push(inquiry);
  }

  async createOwner(email: string, password: string, name?: string): Promise<HotelOwner> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const owner: HotelOwner = {
      id: uuidv4(),
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      createdAt: new Date(),
    };
    this.owners.set(owner.id, owner);
    return owner;
  }

  async getOwnerByEmail(email: string): Promise<HotelOwner | undefined> {
    return Array.from(this.owners.values()).find(o => o.email === email.toLowerCase());
  }

  async verifyPassword(email: string, password: string): Promise<HotelOwner | null> {
    const owner = await this.getOwnerByEmail(email);
    if (!owner) return null;
    const valid = await bcrypt.compare(password, owner.passwordHash);
    return valid ? owner : null;
  }

  async createSession(ownerId: string): Promise<string> {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, { ownerId, expiresAt: new Date(Date.now() + SESSION_DURATION_MS) });
    return sessionId;
  }

  async getSessionOwner(sessionId: string): Promise<HotelOwner | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) return null;
    return this.owners.get(session.ownerId) || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getOwnerHotels(ownerId: string): Promise<HotelProfile[]> {
    return Array.from(this.hotelsMap.values()).filter(h => h.ownerId === ownerId);
  }

  async getHotel(hotelId: string): Promise<HotelProfile | undefined> {
    return this.hotelsMap.get(hotelId);
  }

  async createHotel(data: InsertHotel): Promise<HotelProfile> {
    const hotel: HotelProfile = {
      ...data,
      id: data.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as HotelProfile;
    this.hotelsMap.set(hotel.id, hotel);
    return hotel;
  }

  async updateHotel(hotelId: string, data: Partial<InsertHotel>): Promise<HotelProfile | undefined> {
    const hotel = this.hotelsMap.get(hotelId);
    if (!hotel) return undefined;
    const updated = { ...hotel, ...data, updatedAt: new Date() };
    this.hotelsMap.set(hotelId, updated);
    return updated;
  }

  async deactivateHotel(hotelId: string): Promise<void> {
    await this.updateHotel(hotelId, { isActive: false });
  }

  async getHotelRoomTypes(hotelId: string): Promise<RoomTypeRecord[]> {
    return Array.from(this.roomTypesMap.values()).filter(r => r.hotelId === hotelId);
  }

  async createRoomType(data: InsertRoomType): Promise<RoomTypeRecord> {
    const roomType: RoomTypeRecord = {
      ...data,
      id: data.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as RoomTypeRecord;
    this.roomTypesMap.set(roomType.id, roomType);
    return roomType;
  }

  async updateRoomType(roomTypeId: string, data: Partial<InsertRoomType>): Promise<RoomTypeRecord | undefined> {
    const roomType = this.roomTypesMap.get(roomTypeId);
    if (!roomType) return undefined;
    const updated = { ...roomType, ...data, updatedAt: new Date() };
    this.roomTypesMap.set(roomTypeId, updated);
    return updated;
  }

  async deleteRoomType(roomTypeId: string): Promise<void> {
    this.roomTypesMap.delete(roomTypeId);
  }

  async getAvailability(roomTypeId: string, startDate: string, endDate: string): Promise<AvailabilityRecord[]> {
    return Array.from(this.availabilityMap.values()).filter(a => 
      a.roomTypeId === roomTypeId && a.date >= startDate && a.date <= endDate
    );
  }

  async upsertAvailability(data: InsertAvailability): Promise<AvailabilityRecord> {
    const av: AvailabilityRecord = {
      ...data,
      id: data.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AvailabilityRecord;
    this.availabilityMap.set(av.id, av);
    return av;
  }

  async bulkUpdateAvailability(roomTypeId: string, startDate: string, endDate: string, data: Partial<InsertAvailability>): Promise<void> {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    for (const date of dates) {
      await this.upsertAvailability({
        id: uuidv4(),
        roomTypeId,
        date,
        available: data.available ?? 0,
        barRate: data.barRate ?? 100,
        minStay: data.minStay ?? 1,
        closedToArrival: data.closedToArrival ?? false,
      });
    }
  }

  async getHotelDeals(hotelId: string): Promise<PublishedDeal[]> {
    return Array.from(this.publishedDealsMap.values()).filter(d => d.hotelId === hotelId);
  }

  async createPublishedDeal(data: InsertPublishedDeal): Promise<PublishedDeal> {
    const deal: PublishedDeal = {
      ...data,
      id: data.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PublishedDeal;
    this.publishedDealsMap.set(deal.id, deal);
    return deal;
  }

  async updatePublishedDeal(dealId: string, data: Partial<InsertPublishedDeal>): Promise<PublishedDeal | undefined> {
    const deal = this.publishedDealsMap.get(dealId);
    if (!deal) return undefined;
    const updated = { ...deal, ...data, updatedAt: new Date() };
    this.publishedDealsMap.set(dealId, updated);
    return updated;
  }

  async deletePublishedDeal(dealId: string): Promise<void> {
    this.publishedDealsMap.delete(dealId);
  }

  async publishDeals(dealIds: string[]): Promise<void> {
    for (const id of dealIds) {
      await this.updatePublishedDeal(id, { status: "PUBLISHED" });
    }
  }

  async unpublishDeals(dealIds: string[]): Promise<void> {
    for (const id of dealIds) {
      await this.updatePublishedDeal(id, { status: "DRAFT" });
    }
  }

  async getPublicHotels(): Promise<HotelProfile[]> {
    return Array.from(this.hotelsMap.values()).filter(h => h.isActive);
  }

  async getPublicHotel(hotelId: string): Promise<HotelProfile | undefined> {
    const hotel = this.hotelsMap.get(hotelId);
    return hotel?.isActive ? hotel : undefined;
  }

  async getPublicDealsByHotel(hotelId: string, startDate?: string, endDate?: string): Promise<PublishedDeal[]> {
    return Array.from(this.publishedDealsMap.values()).filter(d => 
      d.hotelId === hotelId && d.status === "PUBLISHED"
    );
  }

  async getPublicDealsGrouped(): Promise<any[]> {
    return [];
  }

  // Booking methods for MemStorage
  private bookingsMap: Map<string, Booking> = new Map();

  async createBooking(data: InsertBooking): Promise<Booking> {
    const booking: Booking = {
      ...data,
      createdAt: new Date(),
    } as Booking;
    this.bookingsMap.set(data.id, booking);
    return booking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookingsMap.get(id);
  }

  async getBookingsByDealId(dealId: string): Promise<Booking[]> {
    return Array.from(this.bookingsMap.values()).filter(b => b.dealId === dealId);
  }

  async isDealBooked(dealId: string): Promise<boolean> {
    return Array.from(this.bookingsMap.values()).some(
      b => b.dealId === dealId && b.status === "CONFIRMED"
    );
  }

  async updateBookingEmailSent(id: string): Promise<void> {
    const booking = this.bookingsMap.get(id);
    if (booking) {
      booking.emailSent = true;
      this.bookingsMap.set(id, booking);
    }
  }

  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookingsMap.values());
  }

  async createDeal(data: InsertDeal): Promise<Deal> {
    const deal = data as Deal;
    this.deals.set(deal.id, deal);
    return deal;
  }

  async deleteDeal(dealId: string): Promise<void> {
    this.deals.delete(dealId);
  }

  async updateDeal(dealId: string, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const deal = this.deals.get(dealId);
    if (!deal) return undefined;
    const updated = { ...deal, ...data } as Deal;
    this.deals.set(dealId, updated);
    return updated;
  }

  // Auto listing rules stub methods for MemStorage
  async getAutoListingRule(hotelId: string): Promise<AutoListingRule | undefined> {
    return undefined;
  }

  async upsertAutoListingRule(data: InsertAutoListingRule): Promise<AutoListingRule> {
    return data as AutoListingRule;
  }

  async deleteAutoListingRule(hotelId: string): Promise<void> {
    return;
  }

  // Rewards system stub methods for MemStorage
  async getUserRewards(userId: string): Promise<any | undefined> {
    return undefined;
  }

  async createUserRewards(data: any): Promise<any> {
    return data;
  }

  async updateUserRewards(userId: string, data: Partial<any>): Promise<void> {
    return;
  }

  async createRewardsTransaction(data: any): Promise<any> {
    return data;
  }

  async getRewardsTransactions(userId: string): Promise<any[]> {
    return [];
  }

  async createHotelReview(data: any): Promise<any> {
    return data;
  }

  async getUserReviews(userId: string): Promise<any[]> {
    return [];
  }

  async getPromoCodeByCode(code: string): Promise<any | undefined> {
    return undefined;
  }

  async hasUserUsedPromoCode(userId: string, promoCodeId: string): Promise<boolean> {
    return false;
  }

  async createPromoCodeUsage(data: any): Promise<any> {
    return data;
  }

  async incrementPromoCodeUsage(promoCodeId: string): Promise<void> {
    return;
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return [];
  }

  async markBookingPointsAwarded(bookingId: string): Promise<void> {
    return;
  }

  async markBookingReviewSubmitted(bookingId: string): Promise<void> {
    return;
  }

  // Saved listings stub methods for MemStorage
  async saveProperty(userId: string, propertyId: string): Promise<any> { return { id: "stub", userId, propertyId, itemType: "property" }; }
  async unsaveProperty(userId: string, propertyId: string): Promise<void> { return; }
  async saveDeal(userId: string, dealId: string): Promise<any> { return { id: "stub", userId, dealId, itemType: "deal" }; }
  async unsaveDeal(userId: string, dealId: string): Promise<void> { return; }
  async getUserSavedListings(userId: string): Promise<any[]> { return []; }
  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> { return false; }
  async isDealSaved(userId: string, dealId: string): Promise<boolean> { return false; }
  async getUserSavedPropertyIds(userId: string): Promise<string[]> { return []; }
  async getUserSavedDealIds(userId: string): Promise<string[]> { return []; }
}

// Use MemStorage since database is not connected
export const storage: IStorage = new MemStorage();
