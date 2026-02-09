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

// Automatic listing rules for hotels
export const autoListingRules = pgTable("auto_listing_rules", {
  id: text("id").primaryKey(), // UUID
  hotelId: text("hotel_id").notNull().references(() => hotels.id).unique(),
  enabled: boolean("enabled").notNull().default(false),
  hoursBeforeCheckin: integer("hours_before_checkin").notNull().default(48),
  defaultDiscountPercent: integer("default_discount_percent").notNull().default(30),
  minPriceFloor: integer("min_price_floor").notNull().default(50),
  roomTypeIds: text("room_type_ids").array(), // null = all room types
  daysOfWeek: text("days_of_week").array(), // ["MON", "TUE", ...] or null = all days
  blackoutDates: text("blackout_dates").array(), // ["2026-12-25", "2026-12-31"]
  requiresGap: boolean("requires_gap").notNull().default(true), // Only list if orphan night
  minGapDuration: integer("min_gap_duration").notNull().default(1), // Min nights in gap
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
  autoListingRule: one(autoListingRules),
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

export const autoListingRulesRelations = relations(autoListingRules, ({ one }) => ({
  hotel: one(hotels, {
    fields: [autoListingRules.hotelId],
    references: [hotels.id],
  }),
}));

// Insert schemas for new tables
export const insertHotelOwnerSchema = createInsertSchema(hotelOwners).omit({ createdAt: true });
export const insertHotelSchema = createInsertSchema(hotels).omit({ createdAt: true, updatedAt: true });
export const insertRoomTypeSchema = createInsertSchema(roomTypes).omit({ createdAt: true, updatedAt: true });
export const insertAvailabilitySchema = createInsertSchema(availability).omit({ createdAt: true, updatedAt: true });
export const insertPublishedDealSchema = createInsertSchema(publishedDeals).omit({ createdAt: true, updatedAt: true });
export const insertAutoListingRuleSchema = createInsertSchema(autoListingRules).omit({ createdAt: true, updatedAt: true });

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
export type AutoListingRule = typeof autoListingRules.$inferSelect;
export type InsertAutoListingRule = z.infer<typeof insertAutoListingRuleSchema>;
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
  maxGuests: integer("max_guests").notNull().default(2), // Room capacity
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

// ========================================
// ADMIN PANEL TABLES
// ========================================

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, super_admin
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: text("id").primaryKey(), // Session token
  adminId: text("admin_id").notNull().references(() => adminUsers.id),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: text("id").primaryKey(), // UUID
  adminId: text("admin_id").notNull().references(() => adminUsers.id),
  action: text("action").notNull(), // e.g., "user_banned", "deal_deleted", "promo_created"
  targetType: text("target_type"), // e.g., "user", "booking", "deal"
  targetId: text("target_id"),
  details: jsonb("details"), // Additional context
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========================================
// AIRBNB / SHORT-TERM RENTAL HOST TABLES
// ========================================

export const airbnbHosts = pgTable("airbnb_hosts", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  countryCode: text("country_code").default("+61"),
  bio: text("bio"),
  profilePhoto: text("profile_photo"),
  averageResponseTime: integer("average_response_time").default(60), // minutes
  responseRate: integer("response_rate").default(100), // percentage
  isSuperhost: boolean("is_superhost").notNull().default(false),
  stripeAccountId: text("stripe_account_id"), // for payouts
  isActive: boolean("is_active").notNull().default(true),
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hostSessions = pgTable("host_sessions", {
  id: text("id").primaryKey(), // Session token
  hostId: text("host_id").notNull().references(() => airbnbHosts.id),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: text("id").primaryKey(), // UUID
  hostId: text("host_id").notNull().references(() => airbnbHosts.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  propertyType: text("property_type").notNull().default("entire_place"), // entire_place | private_room | shared_room | unique_stay
  category: text("category").default("apartment"), // apartment | house | cabin | villa | cottage | loft | studio | townhouse | other
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull().default("Australia"),
  postcode: text("postcode"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  maxGuests: integer("max_guests").notNull().default(2),
  bedrooms: integer("bedrooms").notNull().default(1),
  beds: integer("beds").notNull().default(1),
  bathrooms: numeric("bathrooms").notNull().default("1"),
  amenities: text("amenities").array(), // WiFi, Kitchen, Pool, Parking, AC, etc.
  houseRules: text("house_rules"),
  checkInInstructions: text("check_in_instructions"),
  checkInTime: text("check_in_time").default("15:00"),
  checkOutTime: text("check_out_time").default("10:00"),
  cancellationPolicy: text("cancellation_policy").default("moderate"), // flexible | moderate | strict
  baseNightlyRate: integer("base_nightly_rate").notNull(), // in cents
  cleaningFee: integer("cleaning_fee").default(0), // in cents
  serviceFee: integer("service_fee").default(0), // in cents (GapNight fee)
  minNights: integer("min_nights").notNull().default(1),
  maxNights: integer("max_nights").default(30),
  instantBook: boolean("instant_book").notNull().default(false),
  selfCheckIn: boolean("self_check_in").notNull().default(false),
  petFriendly: boolean("pet_friendly").notNull().default(false),
  smokingAllowed: boolean("smoking_allowed").notNull().default(false),
  nearbyHighlight: text("nearby_highlight"), // "5 min walk to beach"
  averageRating: numeric("average_rating").default("0"),
  totalReviews: integer("total_reviews").default(0),
  status: text("status").notNull().default("pending_approval"), // pending_approval | approved | rejected | suspended | archived
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by"), // admin user ID
  images: text("images").array(), // URLs
  coverImage: text("cover_image"), // Primary image URL
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyPhotos = pgTable("property_photos", {
  id: text("id").primaryKey(), // UUID
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  isCover: boolean("is_cover").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const propertyAvailability = pgTable("property_availability", {
  id: text("id").primaryKey(), // UUID
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  isAvailable: boolean("is_available").notNull().default(true),
  isGapNight: boolean("is_gap_night").notNull().default(false), // true = this is a gap between bookings
  nightlyRate: integer("nightly_rate").notNull(), // in cents - can override base rate
  gapNightDiscount: integer("gap_night_discount").default(0), // percentage discount for gap nights
  notes: text("notes"), // host can add notes like "between two long bookings"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyBookings = pgTable("property_bookings", {
  id: text("id").primaryKey(), // Booking reference like "PB-XXXXXXXX"
  propertyId: text("property_id").notNull().references(() => properties.id),
  hostId: text("host_id").notNull().references(() => airbnbHosts.id),
  userId: text("user_id").notNull().references(() => users.id),
  checkInDate: text("check_in_date").notNull(),
  checkOutDate: text("check_out_date").notNull(),
  nights: integer("nights").notNull(),
  guests: integer("guests").notNull().default(1),
  nightlyRate: integer("nightly_rate").notNull(), // in cents
  cleaningFee: integer("cleaning_fee").default(0),
  serviceFee: integer("service_fee").default(0),
  totalPrice: integer("total_price").notNull(), // in cents
  currency: text("currency").notNull().default("AUD"),
  guestMessage: text("guest_message"), // message to host with booking request
  specialRequests: text("special_requests"),
  // Booking flow status
  status: text("status").notNull().default("PENDING_APPROVAL"),
  // PENDING_APPROVAL -> APPROVED -> CONFIRMED (paid) -> COMPLETED
  // PENDING_APPROVAL -> DECLINED
  // APPROVED -> PAYMENT_FAILED
  // CONFIRMED -> CANCELLED_BY_GUEST | CANCELLED_BY_HOST
  hostDecisionAt: timestamp("host_decision_at"),
  hostDeclineReason: text("host_decline_reason"),
  // Stripe payment
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSetupIntentId: text("stripe_setup_intent_id"),
  paymentCapturedAt: timestamp("payment_captured_at"),
  // Guest info
  guestFirstName: text("guest_first_name").notNull(),
  guestLastName: text("guest_last_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone"),
  // Meta
  emailSent: boolean("email_sent").notNull().default(false),
  pointsAwarded: boolean("points_awarded").notNull().default(false),
  reviewSubmitted: boolean("review_submitted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyQA = pgTable("property_qa", {
  id: text("id").primaryKey(), // UUID
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  question: text("question").notNull(),
  answer: text("answer"), // null until host answers
  answeredAt: timestamp("answered_at"),
  isPublic: boolean("is_public").notNull().default(true), // public Q&A visible to all
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userIdVerifications = pgTable("user_id_verifications", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id).unique(),
  stripeVerificationSessionId: text("stripe_verification_session_id"),
  status: text("status").notNull().default("unverified"), // unverified | pending | verified | failed
  verifiedAt: timestamp("verified_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyReviews = pgTable("property_reviews", {
  id: text("id").primaryKey(), // UUID
  propertyId: text("property_id").notNull().references(() => properties.id),
  bookingId: text("booking_id").notNull().references(() => propertyBookings.id),
  userId: text("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  cleanlinessRating: integer("cleanliness_rating"), // 1-5
  accuracyRating: integer("accuracy_rating"), // 1-5
  checkInRating: integer("check_in_rating"), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  locationRating: integer("location_rating"), // 1-5
  valueRating: integer("value_rating"), // 1-5
  comment: text("comment").notNull(),
  hostResponse: text("host_response"),
  hostRespondedAt: timestamp("host_responded_at"),
  isVerified: boolean("is_verified").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for AirBnB host tables
export const airbnbHostsRelations = relations(airbnbHosts, ({ many }) => ({
  sessions: many(hostSessions),
  properties: many(properties),
  bookings: many(propertyBookings),
}));

export const hostSessionsRelations = relations(hostSessions, ({ one }) => ({
  host: one(airbnbHosts, {
    fields: [hostSessions.hostId],
    references: [airbnbHosts.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  host: one(airbnbHosts, {
    fields: [properties.hostId],
    references: [airbnbHosts.id],
  }),
  photos: many(propertyPhotos),
  availability: many(propertyAvailability),
  bookings: many(propertyBookings),
  qa: many(propertyQA),
  reviews: many(propertyReviews),
}));

export const propertyPhotosRelations = relations(propertyPhotos, ({ one }) => ({
  property: one(properties, {
    fields: [propertyPhotos.propertyId],
    references: [properties.id],
  }),
}));

export const propertyAvailabilityRelations = relations(propertyAvailability, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAvailability.propertyId],
    references: [properties.id],
  }),
}));

export const propertyBookingsRelations = relations(propertyBookings, ({ one }) => ({
  property: one(properties, {
    fields: [propertyBookings.propertyId],
    references: [properties.id],
  }),
  host: one(airbnbHosts, {
    fields: [propertyBookings.hostId],
    references: [airbnbHosts.id],
  }),
  user: one(users, {
    fields: [propertyBookings.userId],
    references: [users.id],
  }),
}));

export const propertyQARelations = relations(propertyQA, ({ one }) => ({
  property: one(properties, {
    fields: [propertyQA.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyQA.userId],
    references: [users.id],
  }),
}));

export const propertyReviewsRelations = relations(propertyReviews, ({ one }) => ({
  property: one(properties, {
    fields: [propertyReviews.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyReviews.userId],
    references: [users.id],
  }),
  booking: one(propertyBookings, {
    fields: [propertyReviews.bookingId],
    references: [propertyBookings.id],
  }),
}));

export const userIdVerificationsRelations = relations(userIdVerifications, ({ one }) => ({
  user: one(users, {
    fields: [userIdVerifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas for host tables
export const insertAirbnbHostSchema = createInsertSchema(airbnbHosts).omit({ createdAt: true, updatedAt: true });
export const insertHostSessionSchema = createInsertSchema(hostSessions).omit({ createdAt: true });
export const insertPropertySchema = createInsertSchema(properties).omit({ createdAt: true, updatedAt: true });
export const insertPropertyPhotoSchema = createInsertSchema(propertyPhotos).omit({ createdAt: true });
export const insertPropertyAvailabilitySchema = createInsertSchema(propertyAvailability).omit({ createdAt: true, updatedAt: true });
export const insertPropertyBookingSchema = createInsertSchema(propertyBookings).omit({ createdAt: true, updatedAt: true });
export const insertPropertyQASchema = createInsertSchema(propertyQA).omit({ createdAt: true });
export const insertUserIdVerificationSchema = createInsertSchema(userIdVerifications).omit({ createdAt: true, updatedAt: true });
export const insertPropertyReviewSchema = createInsertSchema(propertyReviews).omit({ createdAt: true });

// Types for host tables
export type AirbnbHost = typeof airbnbHosts.$inferSelect;
export type InsertAirbnbHost = z.infer<typeof insertAirbnbHostSchema>;
export type HostSession = typeof hostSessions.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type PropertyAvailabilityRecord = typeof propertyAvailability.$inferSelect;
export type PropertyBooking = typeof propertyBookings.$inferSelect;
export type InsertPropertyBooking = z.infer<typeof insertPropertyBookingSchema>;
export type PropertyQA = typeof propertyQA.$inferSelect;
export type UserIdVerification = typeof userIdVerifications.$inferSelect;
export type PropertyReview = typeof propertyReviews.$inferSelect;

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
  userId: text("user_id"), // Optional - linked to user account if logged in
  dealId: text("deal_id").notNull(),
  hotelName: text("hotel_name").notNull(),
  hotelCity: text("hotel_city"),
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
  pointsAwarded: boolean("points_awarded").notNull().default(false),
  reviewSubmitted: boolean("review_submitted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ createdAt: true });
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// ========================================
// DEAL HOLDS TABLE (5 minute reservation)
// ========================================

export const dealHolds = pgTable("deal_holds", {
  id: text("id").primaryKey(), // UUID
  dealId: text("deal_id").notNull(),
  sessionId: text("session_id").notNull(), // Browser session or IP
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDealHoldSchema = createInsertSchema(dealHolds).omit({ createdAt: true });
export type DealHold = typeof dealHolds.$inferSelect;
export type InsertDealHold = z.infer<typeof insertDealHoldSchema>;

// ========================================
// USER AUTHENTICATION TABLES
// ========================================

export const users = pgTable("users", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  googleId: text("google_id"), // OAuth Google ID
  appleId: text("apple_id"), // OAuth Apple ID
  emailVerifiedAt: timestamp("email_verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  sessionHash: text("session_hash").notNull(), // Hashed session token
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(), // Hashed token
  type: text("type").notNull(), // "verify_email" | "reset_password"
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAlertPreferences = pgTable("user_alert_preferences", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id).unique(),
  preferredCity: text("preferred_city"),
  maxPrice: integer("max_price"),
  alertFrequency: text("alert_frequency").default("daily"), // "daily" | "instant"
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ========================================
// REWARDS SYSTEM TABLES
// ========================================

export const userRewards = pgTable("user_rewards", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id).unique(),
  totalPointsEarned: integer("total_points_earned").notNull().default(0),
  currentPoints: integer("current_points").notNull().default(0), // Available points
  creditBalance: integer("credit_balance").notNull().default(0), // In cents (100 = $1)
  tier: text("tier").notNull().default("Bronze"), // Bronze | Silver | Gold | Platinum
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rewardsTransactions = pgTable("rewards_transactions", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // EARN | REDEEM | CONVERT_TO_CREDIT
  points: integer("points").notNull(), // Positive for earn, negative for redeem
  description: text("description").notNull(),
  bookingId: text("booking_id"), // Reference to booking if applicable
  reviewId: text("review_id"), // Reference to review if applicable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hotelReviews = pgTable("hotel_reviews", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  bookingId: text("booking_id").notNull().references(() => bookings.id),
  hotelName: text("hotel_name").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment").notNull(),
  isVerified: boolean("is_verified").notNull().default(true), // Verified stay
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promoCodes = pgTable("promo_codes", {
  id: text("id").primaryKey(), // UUID
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // PERCENTAGE | FIXED_AMOUNT | POINTS
  value: integer("value").notNull(), // Percentage (e.g., 10 for 10%) or cents or points
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promoCodeUsage = pgTable("promo_code_usage", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  promoCodeId: text("promo_code_id").notNull().references(() => promoCodes.id),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  emailTokens: many(emailTokens),
  alertPreferences: many(userAlertPreferences),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const emailTokensRelations = relations(emailTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailTokens.userId],
    references: [users.id],
  }),
}));

export const userAlertPreferencesRelations = relations(userAlertPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userAlertPreferences.userId],
    references: [users.id],
  }),
}));

// Insert schemas for user tables
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ createdAt: true });
export const insertEmailTokenSchema = createInsertSchema(emailTokens).omit({ createdAt: true });
export const insertUserAlertPreferencesSchema = createInsertSchema(userAlertPreferences).omit({ createdAt: true, updatedAt: true });

// Insert schemas for rewards tables
export const insertUserRewardsSchema = createInsertSchema(userRewards).omit({ createdAt: true, updatedAt: true });
export const insertRewardsTransactionSchema = createInsertSchema(rewardsTransactions).omit({ createdAt: true });
export const insertHotelReviewSchema = createInsertSchema(hotelReviews).omit({ createdAt: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ createdAt: true });
export const insertPromoCodeUsageSchema = createInsertSchema(promoCodeUsage).omit({ usedAt: true });

// Types for user tables
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type EmailToken = typeof emailTokens.$inferSelect;
export type InsertEmailToken = z.infer<typeof insertEmailTokenSchema>;
export type UserAlertPreference = typeof userAlertPreferences.$inferSelect;
export type InsertUserAlertPreference = z.infer<typeof insertUserAlertPreferencesSchema>;

// Types for rewards tables
export type UserRewards = typeof userRewards.$inferSelect;
export type InsertUserRewards = z.infer<typeof insertUserRewardsSchema>;
export type RewardsTransaction = typeof rewardsTransactions.$inferSelect;
export type InsertRewardsTransaction = z.infer<typeof insertRewardsTransactionSchema>;
export type HotelReview = typeof hotelReviews.$inferSelect;
export type InsertHotelReview = z.infer<typeof insertHotelReviewSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = z.infer<typeof insertPromoCodeUsageSchema>;

// Password validation schema
export const passwordSchema = z.string()
  .min(10, "Password must be at least 10 characters")
  .refine((password) => {
    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score >= 3;
  }, "Password must include at least 3 of: uppercase, lowercase, number, symbol");

// User signup schema
export const signupSchema = z.object({
  email: z.string().email("Invalid email address").transform(e => e.trim().toLowerCase()),
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
});

// User login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").transform(e => e.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});
