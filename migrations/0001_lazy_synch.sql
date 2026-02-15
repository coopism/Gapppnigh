CREATE TABLE "admin_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "airbnb_hosts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "airbnb_hosts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auto_listing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"hours_before_checkin" integer DEFAULT 48 NOT NULL,
	"default_discount_percent" integer DEFAULT 30 NOT NULL,
	"min_price_floor" integer DEFAULT 50 NOT NULL,
	"room_type_ids" text[],
	"days_of_week" text[],
	"blackout_dates" text[],
	"requires_gap" boolean DEFAULT true NOT NULL,
	"min_gap_duration" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auto_listing_rules_hotel_id_unique" UNIQUE("hotel_id")
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"hotel_name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_code_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"promo_code_id" text NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "property_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"date" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_gap_night" boolean DEFAULT false NOT NULL,
	"nightly_rate" integer NOT NULL,
	"gap_night_discount" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"host_id" text NOT NULL,
	"user_id" text NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "property_photos" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_qa" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"user_id" text,
	"question" text NOT NULL,
	"answer" text,
	"answered_at" timestamp,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_host_faq" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"booking_id" text NOT NULL,
	"user_id" text NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "rewards_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"description" text NOT NULL,
	"booking_id" text,
	"review_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_alert_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preferred_city" text,
	"max_price" integer,
	"alert_frequency" text DEFAULT 'daily',
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_alert_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_id_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_verification_session_id" text,
	"status" text DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_id_verifications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total_points_earned" integer DEFAULT 0 NOT NULL,
	"current_points" integer DEFAULT 0 NOT NULL,
	"credit_balance" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'Bronze' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_rewards_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"phone" text,
	"google_id" text,
	"apple_id" text,
	"email_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "hotel_city" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "points_awarded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "review_submitted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_listing_rules" ADD CONSTRAINT "auto_listing_rules_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_sessions" ADD CONSTRAINT "host_sessions_host_id_airbnb_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."airbnb_hosts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_reviews" ADD CONSTRAINT "hotel_reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_usage" ADD CONSTRAINT "promo_code_usage_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_host_id_airbnb_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."airbnb_hosts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_availability" ADD CONSTRAINT "property_availability_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_host_id_airbnb_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."airbnb_hosts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_bookings" ADD CONSTRAINT "property_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_qa" ADD CONSTRAINT "property_qa_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_qa" ADD CONSTRAINT "property_qa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_reviews" ADD CONSTRAINT "property_reviews_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_reviews" ADD CONSTRAINT "property_reviews_booking_id_property_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."property_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_reviews" ADD CONSTRAINT "property_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards_transactions" ADD CONSTRAINT "rewards_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_alert_preferences" ADD CONSTRAINT "user_alert_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_id_verifications" ADD CONSTRAINT "user_id_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;