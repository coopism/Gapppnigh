import { pgTable, text, serial, integer, boolean, numeric, jsonb, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ========================================
// HOTEL OWNER PORTAL TABLES
// ========================================

export const hotelOwners = pgTable("hotel_owners", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ownerSessions = pgTable("owner_sessions", {
  id: text("id").primaryKey(), // Session token
  ownerId: text("owner_id").notNull().references(() => hotelOwners.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hotels = pgTable("hotels", {
  id: text("id").primaryKey(), // UUID
  ownerId: text("owner_id").notNull().references(() => hotelOwners.id),
  chainName: text("chain_name"),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull().default("Australia"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  starRating: integer("star_rating").notNull().default(3),
  amenities: text("amenities").array(),
  images: text("images").array(),
  contactEmail: text("contact_email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const roomTypes = pgTable("room_types", {
  id: text("id").primaryKey(), // UUID
  hotelId: text("hotel_id").notNull().references(() => hotels.id),
  name: text("name").notNull(),
  inventory: integer("inventory").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const availability = pgTable("availability", {
  id: text("id").primaryKey(), // UUID
  roomTypeId: text("room_type_id").notNull().references(() => roomTypes.id),
  date: text("date").notNull(), // YYYY-MM-DD
  available: integer("available").notNull().default(0),
  barRate: integer("bar_rate").notNull(),
  minStay: integer("min_stay").notNull().default(1),
  closedToArrival: boolean("closed_to_arrival").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const publishedDeals = pgTable("published_deals", {
  id: text("id").primaryKey(), // UUID
  hotelId: text("hotel_id").notNull().references(() => hotels.id),
  roomTypeId: text("room_type_id").notNull().references(() => roomTypes.id),
  date: text("date").notNull(), // YYYY-MM-DD
  barRate: integer("bar_rate").notNull(),
  dealPrice: integer("deal_price").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const hotelOwnersRelations = relations(hotelOwners, ({ many }) => ({
  hotels: many(hotels),
  sessions: many(ownerSessions),
}));

export const hotelsRelations = relations(hotels, ({ one, many }) => ({
  owner: one(hotelOwners, {
    fields: [hotels.ownerId],
    references: [hotelOwners.id],
  }),
  roomTypes: many(roomTypes),
  publishedDeals: many(publishedDeals),
}));

export const roomTypesRelations = relations(roomTypes, ({ one, many }) => ({
  hotel: one(hotels, {
    fields: [roomTypes.hotelId],
    references: [hotels.id],
  }),
  availability: many(availability),
  publishedDeals: many(publishedDeals),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  roomType: one(roomTypes, {
    fields: [availability.roomTypeId],
    references: [roomTypes.id],
  }),
}));

export const publishedDealsRelations = relations(publishedDeals, ({ one }) => ({
  hotel: one(hotels, {
    fields: [publishedDeals.hotelId],
    references: [hotels.id],
  }),
  roomType: one(roomTypes, {
    fields: [publishedDeals.roomTypeId],
    references: [roomTypes.id],
  }),
}));

// Insert schemas for new tables
export const insertHotelOwnerSchema = createInsertSchema(hotelOwners).omit({ createdAt: true });
export const insertHotelSchema = createInsertSchema(hotels).omit({ createdAt: true, updatedAt: true });
export const insertRoomTypeSchema = createInsertSchema(roomTypes).omit({ createdAt: true, updatedAt: true });
export const insertAvailabilitySchema = createInsertSchema(availability).omit({ createdAt: true, updatedAt: true });
export const insertPublishedDealSchema = createInsertSchema(publishedDeals).omit({ createdAt: true, updatedAt: true });

// Types for new tables
export type HotelOwner = typeof hotelOwners.$inferSelect;
export type InsertHotelOwner = z.infer<typeof insertHotelOwnerSchema>;
export type HotelProfile = typeof hotels.$inferSelect;
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type RoomTypeRecord = typeof roomTypes.$inferSelect;
export type InsertRoomType = z.infer<typeof insertRoomTypeSchema>;
export type AvailabilityRecord = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type PublishedDeal = typeof publishedDeals.$inferSelect;
export type InsertPublishedDeal = z.infer<typeof insertPublishedDealSchema>;
export type OwnerSession = typeof ownerSessions.$inferSelect;

export const deals = pgTable("deals", {
  id: text("id").primaryKey(), // Using text ID as per spec "gn_001"
  hotelName: text("hotel_name").notNull(),
  location: text("location").notNull(),
  stars: integer("stars").notNull(),
  rating: numeric("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
  checkInDate: text("check_in_date").notNull(),
  checkOutDate: text("check_out_date").notNull(),
  nights: integer("nights").notNull(),
  roomType: text("room_type").notNull(),
  imageUrl: text("image_url").notNull(),
  normalPrice: integer("normal_price").notNull(),
  dealPrice: integer("deal_price").notNull(),
  currency: text("currency").notNull(),
  dealScore: integer("deal_score").notNull(),
  categoryTags: text("category_tags").array().notNull(), // PostgreSQL array
  cancellation: text("cancellation").notNull(),
  whyCheap: text("why_cheap").notNull(),
  // New fields for map and amenities
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  amenities: text("amenities").array(), // WiFi, Pool, Gym, Parking, etc.
  nearbyHighlight: text("nearby_highlight"), // "5 min walk to beach"
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  preferredCity: text("preferred_city"),
});

export const hotelInquiries = pgTable("hotel_inquiries", {
  id: serial("id").primaryKey(),
  hotelName: text("hotel_name").notNull(),
  city: text("city").notNull(),
  contactEmail: text("contact_email").notNull(),
  gapNightsPerWeek: text("gap_nights_per_week").notNull(),
});

// Zod Schemas
export const insertDealSchema = createInsertSchema(deals);
export const insertWaitlistSchema = createInsertSchema(waitlist).omit({ id: true });
export const insertHotelInquirySchema = createInsertSchema(hotelInquiries).omit({ id: true });

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type InsertHotelInquiry = z.infer<typeof insertHotelInquirySchema>;

// Hotel Dashboard Types (Front-end only, not persisted to DB)
export interface Hotel {
  id: string;
  name: string;
  location: string;
  roomTypes: RoomType[];
}

export interface RoomType {
  id: string;
  name: string;
  hotelId: string;
}

export interface ARIEntry {
  hotelId: string;
  roomTypeId: string;
  date: string;
  available: number;
  barRate: number;
  minStay: number;
  closedToArrival: boolean;
}

export interface OrphanNightCandidate {
  id: string;
  hotelId: string;
  roomTypeId: string;
  roomTypeName: string;
  date: string;
  barRate: number;
  available: number;
  reason: string;
  suggestedDiscountPercent: number;
  status: 'draft' | 'approved' | 'published';
  included: boolean;
  overridePrice?: number;
  overrideDiscountPercent?: number;
  gapDuration: number;
  qtyToSell: number;
  gapStartDate?: string;
  gapEndDate?: string;
}

export type PricingMode = 'percent_off' | 'floor_price' | 'fixed_price';

export interface PricingRule {
  mode: PricingMode;
  value: number;
  applyTo: 'all' | 'selected_room_type' | 'checked_only';
  selectedRoomTypeId?: string;
  gapDurationDiscounts?: { [key: number]: number };
}

// ========================================
// BOOKINGS TABLE
// ========================================

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(), // Booking reference like "GN1234567890"
  dealId: text("deal_id").notNull(),
  hotelName: text("hotel_name").notNull(),
  roomType: text("room_type").notNull(),
  checkInDate: text("check_in_date").notNull(),
  checkOutDate: text("check_out_date").notNull(),
  nights: integer("nights").notNull(),
  guestFirstName: text("guest_first_name").notNull(),
  guestLastName: text("guest_last_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone").notNull(),
  guestCountryCode: text("guest_country_code").notNull().default("+61"),
  specialRequests: text("special_requests"),
  totalPrice: integer("total_price").notNull(), // Total paid (GST inclusive)
  currency: text("currency").notNull().default("$"),
  status: text("status").notNull().default("CONFIRMED"), // CONFIRMED | CANCELLED | COMPLETED
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ createdAt: true });
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
