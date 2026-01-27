import { pgTable, text, serial, integer, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
