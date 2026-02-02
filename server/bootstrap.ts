import { db } from "./db";
import { hotelOwners, hotels, roomTypes, availability, publishedDeals, deals } from "../shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";

const SALT_ROUNDS = 12;

export async function bootstrapDatabase() {
  console.log("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "migrations") });
    console.log("Migrations completed!");
  } catch (err) {
    console.log("Migration error (tables may already exist):", err);
  }
  
  console.log("Checking if database needs seeding...");
  
  const existingDeals = await db.select({ count: sql<number>`count(*)` }).from(deals);
  const dealCount = Number(existingDeals[0]?.count) || 0;
  
  if (dealCount > 0) {
    console.log(`Database already has ${dealCount} deals, skipping seed.`);
    return;
  }
  
  console.log("Database is empty, seeding...");

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
}
