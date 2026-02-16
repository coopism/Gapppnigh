import { db } from "./db";
import { hotelOwners, hotels, roomTypes, availability, publishedDeals, deals } from "../shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";

const SALT_ROUNDS = 12;

async function createTables() {
  console.log("Creating tables if not exist...");
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hotel_owners" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "name" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hotels" (
      "id" text PRIMARY KEY NOT NULL,
      "owner_id" text NOT NULL,
      "chain_name" text,
      "name" text NOT NULL,
      "description" text,
      "address" text,
      "city" text NOT NULL,
      "state" text,
      "country" text DEFAULT 'Australia' NOT NULL,
      "latitude" numeric,
      "longitude" numeric,
      "star_rating" integer DEFAULT 3 NOT NULL,
      "amenities" text[],
      "images" text[],
      "contact_email" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "room_types" (
      "id" text PRIMARY KEY NOT NULL,
      "hotel_id" text NOT NULL,
      "name" text NOT NULL,
      "inventory" integer DEFAULT 1 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "availability" (
      "id" text PRIMARY KEY NOT NULL,
      "room_type_id" text NOT NULL,
      "date" text NOT NULL,
      "available" integer DEFAULT 0 NOT NULL,
      "bar_rate" integer NOT NULL,
      "min_stay" integer DEFAULT 1 NOT NULL,
      "closed_to_arrival" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "published_deals" (
      "id" text PRIMARY KEY NOT NULL,
      "hotel_id" text NOT NULL,
      "room_type_id" text NOT NULL,
      "date" text NOT NULL,
      "bar_rate" integer NOT NULL,
      "deal_price" integer NOT NULL,
      "discount_percent" integer NOT NULL,
      "reason" text,
      "status" text DEFAULT 'DRAFT' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "deals" (
      "id" text PRIMARY KEY NOT NULL,
      "hotel_name" text NOT NULL,
      "location" text NOT NULL,
      "stars" integer NOT NULL,
      "rating" numeric NOT NULL,
      "review_count" integer NOT NULL,
      "check_in_date" text NOT NULL,
      "check_out_date" text NOT NULL,
      "nights" integer NOT NULL,
      "room_type" text NOT NULL,
      "image_url" text NOT NULL,
      "normal_price" integer NOT NULL,
      "deal_price" integer NOT NULL,
      "currency" text NOT NULL,
      "deal_score" integer NOT NULL,
      "category_tags" text[] NOT NULL,
      "cancellation" text NOT NULL,
      "why_cheap" text NOT NULL,
      "latitude" numeric,
      "longitude" numeric,
      "amenities" text[],
      "nearby_highlight" text,
      "max_guests" integer DEFAULT 2 NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bookings" (
      "id" text PRIMARY KEY NOT NULL,
      "deal_id" text NOT NULL,
      "hotel_name" text NOT NULL,
      "room_type" text NOT NULL,
      "check_in_date" text NOT NULL,
      "check_out_date" text NOT NULL,
      "nights" integer NOT NULL,
      "guest_first_name" text NOT NULL,
      "guest_last_name" text NOT NULL,
      "guest_email" text NOT NULL,
      "guest_phone" text NOT NULL,
      "guest_country_code" text DEFAULT '+61' NOT NULL,
      "special_requests" text,
      "total_price" integer NOT NULL,
      "currency" text DEFAULT '$' NOT NULL,
      "status" text DEFAULT 'CONFIRMED' NOT NULL,
      "email_sent" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "deal_holds" (
      "id" text PRIMARY KEY NOT NULL,
      "deal_id" text NOT NULL,
      "session_id" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "owner_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "owner_id" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "waitlist" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" text NOT NULL,
      "preferred_city" text
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hotel_inquiries" (
      "id" serial PRIMARY KEY NOT NULL,
      "hotel_name" text NOT NULL,
      "city" text NOT NULL,
      "contact_email" text NOT NULL,
      "gap_nights_per_week" text NOT NULL
    )
  `);
  
  // User authentication tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "name" text,
      "email_verified_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "deleted_at" timestamp
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id"),
      "session_hash" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "revoked_at" timestamp,
      "user_agent" text,
      "ip_address" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "email_tokens" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id"),
      "token_hash" text NOT NULL,
      "type" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "used_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_alert_preferences" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") UNIQUE,
      "preferred_city" text,
      "max_price" integer,
      "alert_frequency" text DEFAULT 'daily',
      "is_enabled" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  
  // Add user_id column to bookings if not exists
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='user_id') THEN
        ALTER TABLE "bookings" ADD COLUMN "user_id" text REFERENCES "users"("id");
      END IF;
    END $$;
  `);
  
  // Add OAuth columns to users if not exists
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
        ALTER TABLE "users" ADD COLUMN "google_id" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='apple_id') THEN
        ALTER TABLE "users" ADD COLUMN "apple_id" text;
      END IF;
    END $$;
  `);
  
  // ========================================
  // AIRBNB HOST TABLES
  // ========================================

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "airbnb_hosts" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "name" text NOT NULL,
      "phone" text,
      "country_code" text DEFAULT '+61',
      "bio" text,
      "profile_photo" text,
      "average_response_time" integer DEFAULT 60,
      "response_rate" integer DEFAULT 100,
      "is_superhost" boolean DEFAULT false NOT NULL,
      "stripe_account_id" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "email_verified_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "host_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "expires_at" timestamp NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "properties" (
      "id" text PRIMARY KEY NOT NULL,
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "title" text NOT NULL,
      "description" text NOT NULL,
      "property_type" text DEFAULT 'entire_place' NOT NULL,
      "category" text DEFAULT 'apartment',
      "address" text NOT NULL,
      "city" text NOT NULL,
      "state" text,
      "country" text DEFAULT 'Australia' NOT NULL,
      "postcode" text,
      "latitude" numeric,
      "longitude" numeric,
      "max_guests" integer DEFAULT 2 NOT NULL,
      "bedrooms" integer DEFAULT 1 NOT NULL,
      "beds" integer DEFAULT 1 NOT NULL,
      "bathrooms" numeric DEFAULT '1' NOT NULL,
      "amenities" text[],
      "house_rules" text,
      "check_in_instructions" text,
      "check_in_time" text DEFAULT '15:00',
      "check_out_time" text DEFAULT '10:00',
      "cancellation_policy" text DEFAULT 'moderate',
      "base_nightly_rate" integer NOT NULL,
      "cleaning_fee" integer DEFAULT 0,
      "service_fee" integer DEFAULT 0,
      "min_nights" integer DEFAULT 1 NOT NULL,
      "max_nights" integer DEFAULT 30,
      "instant_book" boolean DEFAULT false NOT NULL,
      "self_check_in" boolean DEFAULT false NOT NULL,
      "pet_friendly" boolean DEFAULT false NOT NULL,
      "smoking_allowed" boolean DEFAULT false NOT NULL,
      "nearby_highlight" text,
      "average_rating" numeric DEFAULT '0',
      "total_reviews" integer DEFAULT 0,
      "status" text DEFAULT 'pending_approval' NOT NULL,
      "rejection_reason" text,
      "approved_at" timestamp,
      "approved_by" text,
      "images" text[],
      "cover_image" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "property_photos" (
      "id" text PRIMARY KEY NOT NULL,
      "property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
      "url" text NOT NULL,
      "caption" text,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "is_cover" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "property_availability" (
      "id" text PRIMARY KEY NOT NULL,
      "property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
      "date" text NOT NULL,
      "is_available" boolean DEFAULT true NOT NULL,
      "is_gap_night" boolean DEFAULT false NOT NULL,
      "nightly_rate" integer NOT NULL,
      "gap_night_discount" integer DEFAULT 0,
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "property_bookings" (
      "id" text PRIMARY KEY NOT NULL,
      "property_id" text NOT NULL REFERENCES "properties"("id"),
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "user_id" text NOT NULL REFERENCES "users"("id"),
      "check_in_date" text NOT NULL,
      "check_out_date" text NOT NULL,
      "nights" integer NOT NULL,
      "guests" integer DEFAULT 1 NOT NULL,
      "nightly_rate" integer NOT NULL,
      "cleaning_fee" integer DEFAULT 0,
      "service_fee" integer DEFAULT 0,
      "total_price" integer NOT NULL,
      "currency" text DEFAULT 'AUD' NOT NULL,
      "guest_message" text,
      "special_requests" text,
      "status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
      "host_decision_at" timestamp,
      "host_decline_reason" text,
      "stripe_payment_intent_id" text,
      "stripe_setup_intent_id" text,
      "payment_captured_at" timestamp,
      "guest_first_name" text NOT NULL,
      "guest_last_name" text NOT NULL,
      "guest_email" text NOT NULL,
      "guest_phone" text,
      "email_sent" boolean DEFAULT false NOT NULL,
      "points_awarded" boolean DEFAULT false NOT NULL,
      "review_submitted" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "property_qa" (
      "id" text PRIMARY KEY NOT NULL,
      "property_id" text NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
      "user_id" text REFERENCES "users"("id"),
      "question" text NOT NULL,
      "answer" text,
      "answered_at" timestamp,
      "is_public" boolean DEFAULT true NOT NULL,
      "is_host_faq" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Migration: add is_host_faq column and make user_id nullable (for existing tables)
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='property_qa' AND column_name='is_host_faq') THEN
        ALTER TABLE "property_qa" ADD COLUMN "is_host_faq" boolean DEFAULT false NOT NULL;
      END IF;
    END $$;
  `);
  await db.execute(sql`
    ALTER TABLE "property_qa" ALTER COLUMN "user_id" DROP NOT NULL;
  `);

  // Migration: add phone, google_id, apple_id columns to users table
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE "users" ADD COLUMN "phone" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
        ALTER TABLE "users" ADD COLUMN "google_id" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='apple_id') THEN
        ALTER TABLE "users" ADD COLUMN "apple_id" text;
      END IF;
    END $$;
  `);

  // Migration: make property_bookings.user_id nullable for guest bookings
  await db.execute(sql`
    ALTER TABLE "property_bookings" ALTER COLUMN "user_id" DROP NOT NULL;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_id_verifications" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") UNIQUE,
      "stripe_verification_session_id" text,
      "status" text DEFAULT 'unverified' NOT NULL,
      "verified_at" timestamp,
      "failure_reason" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "property_reviews" (
      "id" text PRIMARY KEY NOT NULL,
      "property_id" text NOT NULL REFERENCES "properties"("id"),
      "booking_id" text NOT NULL REFERENCES "property_bookings"("id"),
      "user_id" text NOT NULL REFERENCES "users"("id"),
      "rating" integer NOT NULL,
      "cleanliness_rating" integer,
      "accuracy_rating" integer,
      "check_in_rating" integer,
      "communication_rating" integer,
      "location_rating" integer,
      "value_rating" integer,
      "comment" text NOT NULL,
      "host_response" text,
      "host_responded_at" timestamp,
      "is_verified" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // ========================================
  // DRAFT LISTINGS + iCAL + GAP NIGHT RULES
  // ========================================

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "draft_listings" (
      "id" text PRIMARY KEY NOT NULL,
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "current_step" integer DEFAULT 0 NOT NULL,
      "airbnb_url" text,
      "title" text,
      "description" text,
      "property_type" text DEFAULT 'entire_place',
      "category" text DEFAULT 'apartment',
      "address" text,
      "city" text,
      "state" text,
      "country" text DEFAULT 'Australia',
      "postcode" text,
      "latitude" numeric,
      "longitude" numeric,
      "max_guests" integer DEFAULT 2,
      "bedrooms" integer DEFAULT 1,
      "beds" integer DEFAULT 1,
      "bathrooms" numeric DEFAULT '1',
      "amenities" text[],
      "house_rules" text,
      "check_in_time" text DEFAULT '15:00',
      "check_out_time" text DEFAULT '10:00',
      "min_notice" integer DEFAULT 1,
      "prep_buffer" boolean DEFAULT false,
      "base_nightly_rate" integer,
      "cleaning_fee" integer DEFAULT 0,
      "gap_night_discount" integer DEFAULT 30,
      "weekday_multiplier" numeric DEFAULT '1.0',
      "weekend_multiplier" numeric DEFAULT '1.0',
      "manual_approval" boolean DEFAULT true,
      "auto_publish" boolean DEFAULT false,
      "self_check_in" boolean DEFAULT false,
      "pet_friendly" boolean DEFAULT false,
      "smoking_allowed" boolean DEFAULT false,
      "nearby_highlight" text,
      "check_in_instructions" text,
      "cover_image" text,
      "images" text[],
      "manual_blocked_dates" jsonb DEFAULT '[]',
      "status" text DEFAULT 'draft' NOT NULL,
      "published_property_id" text,
      "last_saved_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ical_connections" (
      "id" text PRIMARY KEY NOT NULL,
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "draft_id" text REFERENCES "draft_listings"("id") ON DELETE CASCADE,
      "property_id" text REFERENCES "properties"("id") ON DELETE CASCADE,
      "ical_url" text NOT NULL,
      "label" text DEFAULT 'Airbnb',
      "status" text DEFAULT 'pending' NOT NULL,
      "last_sync_at" timestamp,
      "last_error" text,
      "sync_interval_minutes" integer DEFAULT 30,
      "blocked_dates" jsonb,
      "detected_gap_nights" jsonb,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "gap_night_rules" (
      "id" text PRIMARY KEY NOT NULL,
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "property_id" text REFERENCES "properties"("id") ON DELETE CASCADE,
      "draft_id" text REFERENCES "draft_listings"("id") ON DELETE CASCADE,
      "check_in_time" text DEFAULT '15:00',
      "check_out_time" text DEFAULT '10:00',
      "min_notice" integer DEFAULT 1,
      "prep_buffer" boolean DEFAULT false,
      "base_nightly_rate" integer,
      "gap_night_discount" integer DEFAULT 30,
      "weekday_multiplier" numeric DEFAULT '1.0',
      "weekend_multiplier" numeric DEFAULT '1.0',
      "manual_approval" boolean DEFAULT true,
      "auto_publish" boolean DEFAULT false,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Add manual_blocked_dates column if missing (for existing databases)
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='draft_listings' AND column_name='manual_blocked_dates') THEN
        ALTER TABLE "draft_listings" ADD COLUMN "manual_blocked_dates" jsonb DEFAULT '[]';
      END IF;
    END $$;
  `);

  console.log("Tables created!");

  // ========================================
  // CREATE INDEXES FOR PERFORMANCE
  // ========================================
  console.log("Creating indexes...");

  // Property-related indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_properties_host_id ON "properties"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_properties_status ON "properties"("status")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_properties_city ON "properties"("city")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_properties_is_active ON "properties"("is_active")`);

  // Property photos index
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_photos_property_id ON "property_photos"("property_id")`);

  // Property availability indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_availability_property_id ON "property_availability"("property_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_availability_date ON "property_availability"("date")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_availability_is_available ON "property_availability"("is_available")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_availability_is_gap_night ON "property_availability"("is_gap_night")`);

  // Property bookings indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_bookings_property_id ON "property_bookings"("property_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_bookings_host_id ON "property_bookings"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_bookings_user_id ON "property_bookings"("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_bookings_status ON "property_bookings"("status")`);

  // Property Q&A indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_qa_property_id ON "property_qa"("property_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_qa_user_id ON "property_qa"("user_id")`);

  // Property reviews indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_reviews_property_id ON "property_reviews"("property_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_property_reviews_user_id ON "property_reviews"("user_id")`);

  // Host sessions index
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_host_sessions_host_id ON "host_sessions"("host_id")`);

  // User verification index
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_id_verifications_user_id ON "user_id_verifications"("user_id")`);

  // User sessions index
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON "user_sessions"("user_id")`);

  // Draft listings indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_draft_listings_host_id ON "draft_listings"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_draft_listings_status ON "draft_listings"("status")`);

  // iCal connections indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ical_connections_host_id ON "ical_connections"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ical_connections_draft_id ON "ical_connections"("draft_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ical_connections_property_id ON "ical_connections"("property_id")`);

  // Gap night rules indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gap_night_rules_host_id ON "gap_night_rules"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gap_night_rules_property_id ON "gap_night_rules"("property_id")`);

  console.log("Indexes created!");
}

export async function bootstrapDatabase() {
  try {
    await createTables();
  } catch (err) {
    console.log("Table creation error:", err);
    return; // Don't seed if tables failed
  }
  
  console.log("Checking if database needs seeding...");
  
  let dealCount = 0;
  try {
    const existingDeals = await db.select({ count: sql<number>`count(*)` }).from(deals);
    dealCount = Number(existingDeals[0]?.count) || 0;
  } catch (err) {
    console.log("Error checking deals count:", err);
    return; // Don't seed if we can't check
  }
  
  if (dealCount > 0) {
    console.log(`Database already has ${dealCount} deals, skipping seed.`);
    return;
  }
  
  console.log("Database is empty, seeding...");
  
  try {

  const owner1Id = uuidv4();
  const owner2Id = uuidv4();

  const owner1Password = await bcrypt.hash("password123", SALT_ROUNDS);
  const owner2Password = await bcrypt.hash("password123", SALT_ROUNDS);

  await db.insert(hotelOwners).values([
    {
      id: owner1Id,
      email: "crown@example.com",
      passwordHash: owner1Password,
      name: "Crown Collection Manager",
    },
    {
      id: owner2Id,
      email: "bayview@example.com",
      passwordHash: owner2Password,
      name: "Bayview Group Manager",
    },
  ]).onConflictDoNothing();

  const hotel1Id = uuidv4();
  const hotel2Id = uuidv4();
  const hotel3Id = uuidv4();
  const hotel4Id = uuidv4();

  await db.insert(hotels).values([
    {
      id: hotel1Id,
      ownerId: owner1Id,
      chainName: "Crown Collection",
      name: "Crown City Suites",
      description: "Luxury suites in the heart of Melbourne with stunning city views.",
      address: "123 Collins Street",
      city: "Melbourne",
      state: "VIC",
      country: "Australia",
      latitude: "-37.8136",
      longitude: "144.9631",
      starRating: 5,
      amenities: ["WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar", "Concierge"],
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"],
      contactEmail: "bookings@crowncity.com",
      isActive: true,
    },
    {
      id: hotel2Id,
      ownerId: owner1Id,
      chainName: "Crown Collection",
      name: "Crown Riverfront",
      description: "Premium waterfront accommodation in Southbank.",
      address: "45 Riverside Avenue",
      city: "Melbourne",
      state: "VIC",
      country: "Australia",
      latitude: "-37.8200",
      longitude: "144.9600",
      starRating: 5,
      amenities: ["WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar", "Room Service"],
      images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"],
      contactEmail: "bookings@crownriverfront.com",
      isActive: true,
    },
    {
      id: hotel3Id,
      ownerId: owner2Id,
      chainName: "Bayview Group",
      name: "Bayview Boutique",
      description: "Charming boutique hotel in the heart of Geelong.",
      address: "78 Bay Street",
      city: "Geelong",
      state: "VIC",
      country: "Australia",
      latitude: "-38.1499",
      longitude: "144.3617",
      starRating: 4,
      amenities: ["WiFi", "Restaurant", "Bar", "Parking"],
      images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"],
      contactEmail: "bookings@bayviewboutique.com",
      isActive: true,
    },
    {
      id: hotel4Id,
      ownerId: owner2Id,
      chainName: "Bayview Group",
      name: "Bayview Coastal",
      description: "Beachfront luxury on the Mornington Peninsula.",
      address: "12 Ocean Drive",
      city: "Mornington",
      state: "VIC",
      country: "Australia",
      latitude: "-38.2178",
      longitude: "145.0388",
      starRating: 4,
      amenities: ["WiFi", "Pool", "Spa", "Beach Access", "Restaurant"],
      images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800"],
      contactEmail: "bookings@bayviewcoastal.com",
      isActive: true,
    },
  ]).onConflictDoNothing();

  const room1Id = uuidv4();
  const room2Id = uuidv4();
  const room3Id = uuidv4();
  const room4Id = uuidv4();
  const room5Id = uuidv4();
  const room6Id = uuidv4();
  const room7Id = uuidv4();
  const room8Id = uuidv4();

  await db.insert(roomTypes).values([
    { id: room1Id, hotelId: hotel1Id, name: "King Room", inventory: 20 },
    { id: room2Id, hotelId: hotel1Id, name: "Executive Suite", inventory: 10 },
    { id: room3Id, hotelId: hotel2Id, name: "River View King", inventory: 15 },
    { id: room4Id, hotelId: hotel2Id, name: "Penthouse Suite", inventory: 5 },
    { id: room5Id, hotelId: hotel3Id, name: "Standard Queen", inventory: 12 },
    { id: room6Id, hotelId: hotel3Id, name: "Deluxe King", inventory: 8 },
    { id: room7Id, hotelId: hotel4Id, name: "Ocean View Room", inventory: 18 },
    { id: room8Id, hotelId: hotel4Id, name: "Beachfront Suite", inventory: 6 },
  ]).onConflictDoNothing();

  const today = new Date();
  const availabilityRecords: any[] = [];

  const roomConfigs = [
    { id: room1Id, baseRate: 350 },
    { id: room2Id, baseRate: 550 },
    { id: room3Id, baseRate: 380 },
    { id: room4Id, baseRate: 750 },
    { id: room5Id, baseRate: 180 },
    { id: room6Id, baseRate: 250 },
    { id: room7Id, baseRate: 220 },
    { id: room8Id, baseRate: 400 },
  ];

  for (const config of roomConfigs) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      let available = Math.floor(Math.random() * 5) + 1;
      let minStay = 1;
      let closedToArrival = false;
      
      if (i === 5 || i === 12 || i === 19 || i === 26) {
        available = 2;
      }
      if (i === 4 || i === 6 || i === 11 || i === 13 || i === 18 || i === 20 || i === 25 || i === 27) {
        available = 0;
      }
      
      if (i >= 7 && i <= 10) {
        minStay = 2;
      }
      
      if (i === 15) {
        closedToArrival = true;
      }

      availabilityRecords.push({
        id: uuidv4(),
        roomTypeId: config.id,
        date: dateStr,
        available,
        barRate: config.baseRate + Math.floor(Math.random() * 50),
        minStay,
        closedToArrival,
      });
    }
  }

  await db.insert(availability).values(availabilityRecords).onConflictDoNothing();

  const sampleDeals = [
    {
      id: uuidv4(),
      hotelId: hotel1Id,
      roomTypeId: room1Id,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 380,
      dealPrice: 247,
      discountPercent: 35,
      reason: "",
      status: "PUBLISHED",
    },
    {
      id: uuidv4(),
      hotelId: hotel1Id,
      roomTypeId: room1Id,
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 365,
      dealPrice: 219,
      discountPercent: 40,
      reason: "",
      status: "PUBLISHED",
    },
    {
      id: uuidv4(),
      hotelId: hotel2Id,
      roomTypeId: room3Id,
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 420,
      dealPrice: 294,
      discountPercent: 30,
      reason: "",
      status: "PUBLISHED",
    },
    {
      id: uuidv4(),
      hotelId: hotel3Id,
      roomTypeId: room5Id,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 195,
      dealPrice: 137,
      discountPercent: 30,
      reason: "",
      status: "PUBLISHED",
    },
    {
      id: uuidv4(),
      hotelId: hotel4Id,
      roomTypeId: room7Id,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 245,
      dealPrice: 159,
      discountPercent: 35,
      reason: "",
      status: "PUBLISHED",
    },
  ];

  await db.insert(publishedDeals).values(sampleDeals).onConflictDoNothing();

  const getDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  const consumerDeals = [
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
    },
    {
      id: "gn_001a",
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
    },
    {
      id: "gn_002a",
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
    },
    {
      id: "gn_003a",
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
    },
    {
      id: "gn_004a",
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
    },
  ];

  await db.insert(deals).values(consumerDeals).onConflictDoNothing();

  console.log("Database seeded successfully!");
  console.log("Test accounts:");
  console.log("  - crown@example.com / password123");
  console.log("  - bayview@example.com / password123");
  } catch (err) {
    console.log("Seeding error:", err);
  }
}
