import { 
  deals, waitlist, hotelInquiries, hotelOwners, hotels, roomTypes, availability, publishedDeals, ownerSessions, bookings,
  type Deal, type InsertWaitlist, type InsertHotelInquiry, 
  type HotelOwner, type InsertHotelOwner, type HotelProfile, type InsertHotel,
  type RoomTypeRecord, type InsertRoomType, type AvailabilityRecord, type InsertAvailability,
  type PublishedDeal, type InsertPublishedDeal, type OwnerSession,
  type Booking, type InsertBooking
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
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
}

export class DatabaseStorage implements IStorage {
  
  // ========================================
  // EXISTING METHODS (Deals, Waitlist, Inquiries)
  // ========================================
  
  async getDeals(search?: string, category?: string, sort?: string): Promise<Deal[]> {
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
    const mockDeals: Deal[] = [
      {
        id: "gn_001",
        hotelName: "Crown City Suites",
        location: "Melbourne, Australia",
        stars: 5,
        rating: "4.6",
        reviewCount: 1284,
        checkInDate: "2026-02-14",
        checkOutDate: "2026-02-15",
        nights: 1,
        roomType: "King Room",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        normalPrice: 420,
        dealPrice: 189,
        currency: "A$",
        dealScore: 92,
        categoryTags: ["All Deals", "Last Minute", "City"],
        cancellation: "Non-refundable",
        whyCheap: "Gap night: 1-night orphan slot between longer bookings.",
        latitude: "-37.8136",
        longitude: "144.9631",
        amenities: ["WiFi", "Pool", "Gym", "Parking", "Restaurant"],
        nearbyHighlight: "5 min walk to Flinders Station",
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
}

// Use DatabaseStorage by default
export const storage: IStorage = new DatabaseStorage();
