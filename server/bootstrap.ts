import { db } from "./db";
import { sql } from "drizzle-orm";

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
      "verified_first_name" text,
      "verified_last_name" text,
      "verified_dob" text,
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

  // Saved listings table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "saved_listings" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "property_id" text REFERENCES "properties"("id") ON DELETE CASCADE,
      "deal_id" text,
      "item_type" text DEFAULT 'property' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
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

  // ========================================
  // ADMIN PANEL REVAMP — TABLES + MIGRATIONS
  // ========================================

  // Migration: add trust/safety columns to users table
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
        ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fraud_risk') THEN
        ALTER TABLE "users" ADD COLUMN "fraud_risk" text DEFAULT 'none';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='admin_notes') THEN
        ALTER TABLE "users" ADD COLUMN "admin_notes" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='suspended_at') THEN
        ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='suspended_by') THEN
        ALTER TABLE "users" ADD COLUMN "suspended_by" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='suspension_reason') THEN
        ALTER TABLE "users" ADD COLUMN "suspension_reason" text;
      END IF;
    END $$;
  `);

  // Migration: add verified identity columns to user_id_verifications
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_id_verifications' AND column_name='verified_first_name') THEN
        ALTER TABLE "user_id_verifications" ADD COLUMN "verified_first_name" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_id_verifications' AND column_name='verified_last_name') THEN
        ALTER TABLE "user_id_verifications" ADD COLUMN "verified_last_name" text;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_id_verifications' AND column_name='verified_dob') THEN
        ALTER TABLE "user_id_verifications" ADD COLUMN "verified_dob" text;
      END IF;
    END $$;
  `);

  // Migration: add role + permissions columns to admin_users if they exist but lack new columns
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='admin_users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='role') THEN
          ALTER TABLE "admin_users" ADD COLUMN "role" text NOT NULL DEFAULT 'admin';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='permissions') THEN
          ALTER TABLE "admin_users" ADD COLUMN "permissions" text[] DEFAULT '{}';
        END IF;
      END IF;
    END $$;
  `);

  // Migration: add module + snapshot columns to admin_activity_logs if they exist but lack new columns
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='admin_activity_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_activity_logs' AND column_name='module') THEN
          ALTER TABLE "admin_activity_logs" ADD COLUMN "module" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_activity_logs' AND column_name='before_snapshot') THEN
          ALTER TABLE "admin_activity_logs" ADD COLUMN "before_snapshot" jsonb;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_activity_logs' AND column_name='after_snapshot') THEN
          ALTER TABLE "admin_activity_logs" ADD COLUMN "after_snapshot" jsonb;
        END IF;
      END IF;
    END $$;
  `);

  // Admin users table (if not created by drizzle-kit push)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_users" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "password_hash" text NOT NULL,
      "name" text NOT NULL,
      "role" text NOT NULL DEFAULT 'admin',
      "permissions" text[] DEFAULT '{}',
      "is_active" boolean NOT NULL DEFAULT true,
      "last_login_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Admin sessions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_sessions" (
      "id" text PRIMARY KEY NOT NULL,
      "admin_id" text NOT NULL REFERENCES "admin_users"("id"),
      "expires_at" timestamp NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Admin activity logs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_activity_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "admin_id" text NOT NULL REFERENCES "admin_users"("id"),
      "action" text NOT NULL,
      "module" text,
      "target_type" text,
      "target_id" text,
      "details" jsonb,
      "before_snapshot" jsonb,
      "after_snapshot" jsonb,
      "ip_address" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Promo codes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "promo_codes" (
      "id" text PRIMARY KEY NOT NULL,
      "code" text NOT NULL UNIQUE,
      "discount_type" text NOT NULL DEFAULT 'percentage',
      "discount_value" integer NOT NULL,
      "max_uses" integer,
      "current_uses" integer DEFAULT 0 NOT NULL,
      "min_booking_amount" integer,
      "valid_from" timestamp,
      "valid_until" timestamp,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Feature flags table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "feature_flags" (
      "id" text PRIMARY KEY NOT NULL,
      "key" text NOT NULL UNIQUE,
      "label" text NOT NULL,
      "description" text,
      "enabled" boolean NOT NULL DEFAULT false,
      "category" text DEFAULT 'feature',
      "updated_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Site config table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_config" (
      "id" text PRIMARY KEY NOT NULL,
      "key" text NOT NULL UNIQUE,
      "value" text NOT NULL,
      "value_type" text NOT NULL DEFAULT 'string',
      "label" text NOT NULL,
      "description" text,
      "category" text DEFAULT 'general',
      "updated_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Support tickets table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "support_tickets" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text REFERENCES "users"("id"),
      "booking_id" text,
      "subject" text NOT NULL,
      "category" text NOT NULL DEFAULT 'other',
      "priority" text NOT NULL DEFAULT 'medium',
      "status" text NOT NULL DEFAULT 'open',
      "assigned_to" text REFERENCES "admin_users"("id"),
      "messages" jsonb DEFAULT '[]',
      "sla_deadline" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      "resolved_at" timestamp
    )
  `);

  // CMS city pages table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cms_city_pages" (
      "id" text PRIMARY KEY NOT NULL,
      "city" text NOT NULL UNIQUE,
      "state" text,
      "hero_title" text,
      "hero_subtitle" text,
      "seo_title" text,
      "seo_description" text,
      "featured_property_ids" text[] DEFAULT '{}',
      "faqs" jsonb DEFAULT '[]',
      "is_published" boolean DEFAULT false,
      "updated_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // CMS banners table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cms_banners" (
      "id" text PRIMARY KEY NOT NULL,
      "title" text NOT NULL,
      "message" text NOT NULL,
      "type" text NOT NULL DEFAULT 'info',
      "placement" text NOT NULL DEFAULT 'global',
      "city_filter" text[] DEFAULT '{}',
      "bg_color" text,
      "text_color" text,
      "link_url" text,
      "link_text" text,
      "starts_at" timestamp,
      "expires_at" timestamp,
      "is_active" boolean DEFAULT true,
      "priority" integer DEFAULT 0,
      "created_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // CMS static pages table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cms_static_pages" (
      "id" text PRIMARY KEY NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "title" text NOT NULL,
      "content" text NOT NULL DEFAULT '',
      "seo_title" text,
      "seo_description" text,
      "last_edited_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Notification templates table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notification_templates" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "subject" text NOT NULL,
      "body" text NOT NULL,
      "variables" text[] DEFAULT '{}',
      "category" text DEFAULT 'marketing',
      "created_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Notification logs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notification_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "template_id" text REFERENCES "notification_templates"("id"),
      "recipient_email" text NOT NULL,
      "channel" text NOT NULL DEFAULT 'email',
      "subject" text,
      "status" text NOT NULL DEFAULT 'sent',
      "error_message" text,
      "sent_by" text REFERENCES "admin_users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    )
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

  // Saved listings indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id ON "saved_listings"("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_saved_listings_property_id ON "saved_listings"("property_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_saved_listings_deal_id ON "saved_listings"("deal_id")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_listings_user_property ON "saved_listings"("user_id", "property_id") WHERE "property_id" IS NOT NULL`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_listings_user_deal ON "saved_listings"("user_id", "deal_id") WHERE "deal_id" IS NOT NULL`);

  // iCal connections indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ical_connections_host_id ON "ical_connections"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ical_connections_draft_id ON "ical_connections"("draft_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ical_connections_property_id ON "ical_connections"("property_id")`);

  // Gap night rules indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gap_night_rules_host_id ON "gap_night_rules"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_gap_night_rules_property_id ON "gap_night_rules"("property_id")`);

  // Messaging tables
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "conversations" (
      "id" text PRIMARY KEY NOT NULL,
      "property_id" text REFERENCES "properties"("id"),
      "booking_id" text,
      "guest_id" text NOT NULL REFERENCES "users"("id"),
      "host_id" text NOT NULL REFERENCES "airbnb_hosts"("id"),
      "subject" text,
      "last_message_at" timestamp DEFAULT now() NOT NULL,
      "guest_unread" integer DEFAULT 0 NOT NULL,
      "host_unread" integer DEFAULT 0 NOT NULL,
      "status" text DEFAULT 'active' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "messages" (
      "id" text PRIMARY KEY NOT NULL,
      "conversation_id" text NOT NULL REFERENCES "conversations"("id"),
      "sender_id" text NOT NULL,
      "sender_type" text NOT NULL,
      "content" text NOT NULL,
      "is_read" boolean DEFAULT false NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_conversations_guest_id ON "conversations"("guest_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON "conversations"("host_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON "messages"("conversation_id")`);

  // Migration: add host ID verification columns to airbnb_hosts
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airbnb_hosts' AND column_name='id_verified') THEN
        ALTER TABLE "airbnb_hosts" ADD COLUMN "id_verified" boolean DEFAULT false NOT NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airbnb_hosts' AND column_name='id_verified_at') THEN
        ALTER TABLE "airbnb_hosts" ADD COLUMN "id_verified_at" timestamp;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='airbnb_hosts' AND column_name='stripe_verification_session_id') THEN
        ALTER TABLE "airbnb_hosts" ADD COLUMN "stripe_verification_session_id" text;
      END IF;
    END $$;
  `);

  console.log("Indexes created!");
}

export async function bootstrapDatabase() {
  try {
    await createTables();
  } catch (err) {
    console.log("Table creation error:", err);
    return; // Don't seed if tables failed
  }
  
  // Hotel seed data removed — going all-in on Stays (Airbnb hosts)
  // Hotels will be re-enabled when SiteMinder integration is secured
  console.log("Bootstrap complete. No hotel seed data — Stays-only mode.");
}
