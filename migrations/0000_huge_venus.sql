CREATE TABLE "availability" (
	"id" text PRIMARY KEY NOT NULL,
	"room_type_id" text NOT NULL,
	"date" text NOT NULL,
	"available" integer DEFAULT 0 NOT NULL,
	"bar_rate" integer NOT NULL,
	"min_stay" integer DEFAULT 1 NOT NULL,
	"closed_to_arrival" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
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
);
--> statement-breakpoint
CREATE TABLE "deal_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"session_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
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
);
--> statement-breakpoint
CREATE TABLE "hotel_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotel_name" text NOT NULL,
	"city" text NOT NULL,
	"contact_email" text NOT NULL,
	"gap_nights_per_week" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotel_owners" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_owners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "hotels" (
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
);
--> statement-breakpoint
CREATE TABLE "owner_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_deals" (
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
);
--> statement-breakpoint
CREATE TABLE "room_types" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"name" text NOT NULL,
	"inventory" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"preferred_city" text
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_owner_id_hotel_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."hotel_owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_sessions" ADD CONSTRAINT "owner_sessions_owner_id_hotel_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."hotel_owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_deals" ADD CONSTRAINT "published_deals_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_deals" ADD CONSTRAINT "published_deals_room_type_id_room_types_id_fk" FOREIGN KEY ("room_type_id") REFERENCES "public"."room_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE no action ON UPDATE no action;