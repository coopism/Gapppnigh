import { db } from "../server/db";
import { hotelOwners, hotels, roomTypes, availability, publishedDeals } from "../shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const SALT_ROUNDS = 12;

async function seed() {
  console.log("Seeding database...");

  // Create hotel owners
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

  console.log("Created hotel owners");

  // Create hotels
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

  console.log("Created hotels");

  // Create room types
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

  console.log("Created room types");

  // Generate availability for next 30 days
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
      
      // Create some orphan night patterns
      let available = Math.floor(Math.random() * 5) + 1;
      let minStay = 1;
      let closedToArrival = false;
      
      // Create true gaps (day between blocked days)
      if (i === 5 || i === 12 || i === 19 || i === 26) {
        available = 2; // Available
      }
      if (i === 4 || i === 6 || i === 11 || i === 13 || i === 18 || i === 20 || i === 25 || i === 27) {
        available = 0; // Blocked
      }
      
      // Add some min stay restrictions
      if (i >= 7 && i <= 10) {
        minStay = 2;
      }
      
      // Add closed to arrival on some days
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
  console.log(`Created ${availabilityRecords.length} availability records`);

  // Create some sample published deals
  const sampleDeals = [
    {
      id: uuidv4(),
      hotelId: hotel1Id,
      roomTypeId: room1Id,
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 380,
      dealPrice: 247,
      discountPercent: 35,
      reason: "1-night gap between bookings",
      status: "PUBLISHED",
    },
    {
      id: uuidv4(),
      hotelId: hotel3Id,
      roomTypeId: room5Id,
      date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      barRate: 195,
      dealPrice: 137,
      discountPercent: 30,
      reason: "Mid-week gap night",
      status: "PUBLISHED",
    },
  ];

  await db.insert(publishedDeals).values(sampleDeals).onConflictDoNothing();
  console.log("Created sample published deals");

  console.log("\n✅ Seed complete!");
  console.log("\nTest accounts:");
  console.log("  - crown@example.com / password123 (owns Crown Collection)");
  console.log("  - bayview@example.com / password123 (owns Bayview Group)");
  
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
