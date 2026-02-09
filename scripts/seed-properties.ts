import "dotenv/config";
import { db } from "../server/db";
import { airbnbHosts, properties, propertyAvailability } from "@shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

const EXAMPLE_HOSTS = [
  {
    name: "Sarah Mitchell",
    email: "sarah.mitchell@example.com",
    password: "HostPass123!",
    phone: "+61412345678",
    bio: "Superhost with 5+ years experience. I love sharing my beautiful properties with travellers from around the world.",
    averageResponseTime: 30,
    responseRate: 98,
    isSuperhost: true,
  },
  {
    name: "James Cooper",
    email: "james.cooper@example.com",
    password: "HostPass123!",
    phone: "+61423456789",
    bio: "Property investor and travel enthusiast. My places are always clean, comfortable, and centrally located.",
    averageResponseTime: 45,
    responseRate: 95,
    isSuperhost: false,
  },
  {
    name: "Emma Chen",
    email: "emma.chen@example.com",
    password: "HostPass123!",
    phone: "+61434567890",
    bio: "Interior designer turned host. Each of my properties is uniquely styled and thoughtfully curated.",
    averageResponseTime: 20,
    responseRate: 100,
    isSuperhost: true,
  },
];

const EXAMPLE_PROPERTIES = [
  {
    hostIndex: 0,
    title: "Stunning Bondi Beach Apartment - Ocean Views",
    description: "Wake up to breathtaking ocean views in this beautifully renovated 2-bedroom apartment, just 200m from Bondi Beach. The open-plan living area floods with natural light, and the balcony offers panoramic views of the coastline. Perfect for couples or small families wanting to experience Sydney's most famous beach lifestyle.\n\nThe apartment features a fully equipped modern kitchen, premium bedding, smart TV with Netflix, and high-speed WiFi. The building has secure parking and a rooftop pool.",
    propertyType: "entire_place",
    category: "apartment",
    address: "45 Campbell Parade",
    city: "Sydney",
    state: "NSW",
    country: "Australia",
    postcode: "2026",
    latitude: "-33.8908",
    longitude: "151.2743",
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: "1",
    amenities: ["WiFi", "Kitchen", "Pool", "Parking", "Air Conditioning", "Washer", "Dryer", "TV", "Beach Access", "Balcony"],
    houseRules: "No smoking. No parties. Quiet hours 10pm-8am. Please remove shoes at the door.",
    checkInInstructions: "Self check-in via smart lock. Code will be sent 24 hours before your stay. Building entrance is on Campbell Parade - look for the blue awning.",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    cancellationPolicy: "moderate",
    baseNightlyRate: 28900, // $289/night
    cleaningFee: 8500, // $85
    minNights: 1,
    maxNights: 14,
    instantBook: false,
    selfCheckIn: true,
    petFriendly: false,
    smokingAllowed: false,
    nearbyHighlight: "200m walk to Bondi Beach",
    coverImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800",
    ],
  },
  {
    hostIndex: 0,
    title: "Cozy Surry Hills Terrace House",
    description: "A charming Victorian terrace house in the heart of Surry Hills, Sydney's trendiest neighbourhood. This 3-bedroom home has been lovingly restored with original features including exposed brick walls and timber floors, combined with modern comforts.\n\nSteps away from Crown Street's best cafes, restaurants, and boutiques. Central Station is a 10-minute walk away. The private courtyard garden is perfect for morning coffee.",
    propertyType: "entire_place",
    category: "house",
    address: "78 Crown Street",
    city: "Sydney",
    state: "NSW",
    country: "Australia",
    postcode: "2010",
    latitude: "-33.8837",
    longitude: "151.2113",
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: "2",
    amenities: ["WiFi", "Kitchen", "Washer", "Dryer", "TV", "Garden", "BBQ", "Air Conditioning", "Heating", "Iron"],
    houseRules: "No smoking indoors. Pets welcome with prior approval. Please take bins out on collection night.",
    checkInInstructions: "Key lockbox located to the left of the front door. Code: provided 24h before check-in.",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    cancellationPolicy: "flexible",
    baseNightlyRate: 34500, // $345/night
    cleaningFee: 12000, // $120
    minNights: 2,
    maxNights: 30,
    instantBook: false,
    selfCheckIn: true,
    petFriendly: true,
    smokingAllowed: false,
    nearbyHighlight: "Heart of Surry Hills cafe strip",
    coverImage: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
    ],
  },
  {
    hostIndex: 1,
    title: "Modern CBD Studio - Crown Casino Views",
    description: "Sleek and modern studio apartment on the 35th floor of a premium Southbank tower. Floor-to-ceiling windows offer stunning views of the Yarra River and Crown Casino. The perfect base for exploring Melbourne's world-class dining, arts, and culture scene.\n\nFeatures a queen bed, fully equipped kitchenette, rain shower, and building amenities including gym, pool, and concierge.",
    propertyType: "entire_place",
    category: "studio",
    address: "1 Freshwater Place",
    city: "Melbourne",
    state: "VIC",
    country: "Australia",
    postcode: "3006",
    latitude: "-37.8226",
    longitude: "144.9589",
    maxGuests: 2,
    bedrooms: 0,
    beds: 1,
    bathrooms: "1",
    amenities: ["WiFi", "Kitchen", "Pool", "Gym", "Parking", "Air Conditioning", "TV", "Concierge", "Elevator", "City Views"],
    houseRules: "No smoking. No parties. Building quiet hours apply after 10pm.",
    checkInInstructions: "Check in at the concierge desk in the lobby. Photo ID required. Key card and parking pass will be provided.",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    cancellationPolicy: "moderate",
    baseNightlyRate: 18900, // $189/night
    cleaningFee: 6000, // $60
    minNights: 1,
    maxNights: 28,
    instantBook: false,
    selfCheckIn: false,
    petFriendly: false,
    smokingAllowed: false,
    nearbyHighlight: "Above Crown Casino, Yarra River views",
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
    ],
  },
  {
    hostIndex: 1,
    title: "Fitzroy Loft - Artistic Inner City Living",
    description: "An industrial-chic loft conversion in the vibrant heart of Fitzroy. Exposed brick, polished concrete floors, and soaring ceilings create a unique atmosphere. The mezzanine bedroom overlooks the open-plan living space.\n\nBrunswick Street's famous bars, live music venues, and vintage shops are right outside your door. Tram stops within 50m for easy access to the CBD.",
    propertyType: "entire_place",
    category: "loft",
    address: "212 Brunswick Street",
    city: "Melbourne",
    state: "VIC",
    country: "Australia",
    postcode: "3065",
    latitude: "-37.7985",
    longitude: "144.9780",
    maxGuests: 3,
    bedrooms: 1,
    beds: 1,
    bathrooms: "1",
    amenities: ["WiFi", "Kitchen", "Washer", "Air Conditioning", "Heating", "TV", "Record Player", "Books", "Bike Available"],
    houseRules: "No smoking. Respect the neighbours. The loft has thin walls so please keep noise reasonable.",
    checkInInstructions: "Keypads on both the street entrance and apartment door. Codes sent via message 24h before arrival.",
    checkInTime: "14:00",
    checkOutTime: "10:00",
    cancellationPolicy: "flexible",
    baseNightlyRate: 22500, // $225/night
    cleaningFee: 7500, // $75
    minNights: 1,
    maxNights: 14,
    instantBook: false,
    selfCheckIn: true,
    petFriendly: false,
    smokingAllowed: false,
    nearbyHighlight: "Brunswick Street nightlife & dining",
    coverImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
      "https://images.unsplash.com/photo-1600573472591-ee6981cf81d6?w=800",
    ],
  },
  {
    hostIndex: 2,
    title: "Luxury Gold Coast Beachfront Villa",
    description: "Experience the ultimate Gold Coast lifestyle in this stunning 4-bedroom beachfront villa. Direct beach access, private pool, and tropical gardens create a resort-like atmosphere. The open-plan design seamlessly connects indoor and outdoor living spaces.\n\nPerfect for families or groups wanting a premium beach holiday. Surfers Paradise is a 10-minute drive, while local cafes and restaurants are within walking distance.",
    propertyType: "entire_place",
    category: "villa",
    address: "15 The Esplanade",
    city: "Gold Coast",
    state: "QLD",
    country: "Australia",
    postcode: "4218",
    latitude: "-28.0333",
    longitude: "153.4333",
    maxGuests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: "3",
    amenities: ["WiFi", "Kitchen", "Pool", "Parking", "Air Conditioning", "Beach Access", "BBQ", "Outdoor Dining", "TV", "Washer", "Dryer", "Garden"],
    houseRules: "No parties or events. Pool use at your own risk. Please rinse sand off before entering the house.",
    checkInInstructions: "Meet & greet available, or self check-in via keypad. Pool heating is extra - please request in advance.",
    checkInTime: "15:00",
    checkOutTime: "10:00",
    cancellationPolicy: "strict",
    baseNightlyRate: 55000, // $550/night
    cleaningFee: 20000, // $200
    minNights: 3,
    maxNights: 21,
    instantBook: false,
    selfCheckIn: true,
    petFriendly: false,
    smokingAllowed: false,
    nearbyHighlight: "Direct beach access, private pool",
    coverImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
    ],
  },
  {
    hostIndex: 2,
    title: "Byron Bay Treehouse Retreat",
    description: "Escape to this magical treehouse nestled in the Byron Bay hinterland. Surrounded by lush rainforest, this unique eco-retreat offers a truly unforgettable experience. Wake up to birdsong and the sound of the creek below.\n\nThe treehouse features a comfortable queen bed, outdoor shower, fully equipped kitchen, and a stunning deck overlooking the canopy. Byron Bay town centre is a 15-minute drive.",
    propertyType: "entire_place",
    category: "cabin",
    address: "42 Coorabell Road",
    city: "Byron Bay",
    state: "NSW",
    country: "Australia",
    postcode: "2481",
    latitude: "-28.6420",
    longitude: "153.6150",
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: "1",
    amenities: ["WiFi", "Kitchen", "Parking", "Outdoor Shower", "Deck", "Hammock", "Nature Views", "Firepit", "Bird Watching"],
    houseRules: "No smoking. No loud music - respect the wildlife and neighbours. Please compost food scraps.",
    checkInInstructions: "Follow the gravel road to the marked parking area. Walk 50m along the lit path to the treehouse. Key under the planter by the door.",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    cancellationPolicy: "moderate",
    baseNightlyRate: 32000, // $320/night
    cleaningFee: 9500, // $95
    minNights: 2,
    maxNights: 7,
    instantBook: false,
    selfCheckIn: true,
    petFriendly: false,
    smokingAllowed: false,
    nearbyHighlight: "Rainforest retreat, 15min to Byron Bay",
    coverImage: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800",
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
    ],
  },
];

function generateGapNightDates(baseRate: number): Array<{
  date: string;
  isAvailable: boolean;
  isGapNight: boolean;
  nightlyRate: number;
  gapNightDiscount: number;
  notes: string;
}> {
  const dates = [];
  const today = new Date();
  
  // Generate 60 days of availability
  for (let i = 1; i <= 60; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    
    // Simulate booking pattern: some dates booked, create gaps
    const dayOfWeek = date.getDay();
    const weekNum = Math.floor(i / 7);
    
    // Create realistic gap patterns
    let isAvailable = true;
    let isGapNight = false;
    let discount = 0;
    let notes = "";
    
    // Week 1-2: Mon-Wed available (gap between weekend bookings)
    if (weekNum < 2 && dayOfWeek >= 1 && dayOfWeek <= 3) {
      isGapNight = true;
      discount = 25;
      notes = "Gap between weekend bookings";
    }
    // Week 3: Tuesday only (single night gap)
    else if (weekNum === 2 && dayOfWeek === 2) {
      isGapNight = true;
      discount = 35;
      notes = "Single night gap - great deal!";
    }
    // Week 4-5: Wed-Thu gap
    else if ((weekNum === 3 || weekNum === 4) && (dayOfWeek === 3 || dayOfWeek === 4)) {
      isGapNight = true;
      discount = 30;
      notes = "Midweek gap between long stays";
    }
    // Week 6-7: Mon-Tue gap
    else if ((weekNum === 5 || weekNum === 6) && (dayOfWeek === 1 || dayOfWeek === 2)) {
      isGapNight = true;
      discount = 20;
      notes = "Early week gap night";
    }
    // Simulate some dates as booked/unavailable
    else if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      isAvailable = false; // Weekends booked
    }
    // Other weekdays: available but not gap nights
    else {
      isAvailable = true;
      isGapNight = false;
    }
    
    if (isAvailable) {
      const nightlyRate = isGapNight 
        ? baseRate  // Rate before discount
        : baseRate;
      
      dates.push({
        date: dateStr,
        isAvailable,
        isGapNight,
        nightlyRate,
        gapNightDiscount: discount,
        notes,
      });
    }
  }
  
  return dates;
}

async function seedProperties() {
  console.log("\n🏠 Seeding example AirBnB properties...\n");

  try {
    // Create hosts
    const hostIds: string[] = [];
    
    for (const hostData of EXAMPLE_HOSTS) {
      const [existing] = await db
        .select()
        .from(airbnbHosts)
        .where(eq(airbnbHosts.email, hostData.email))
        .limit(1);

      if (existing) {
        console.log(`  ⏭️  Host ${hostData.email} already exists, skipping...`);
        hostIds.push(existing.id);
        continue;
      }

      const passwordHash = await bcrypt.hash(hostData.password, 10);
      const hostId = uuidv4();

      await db.insert(airbnbHosts).values({
        id: hostId,
        email: hostData.email,
        passwordHash,
        name: hostData.name,
        phone: hostData.phone,
        bio: hostData.bio,
        averageResponseTime: hostData.averageResponseTime,
        responseRate: hostData.responseRate,
        isSuperhost: hostData.isSuperhost,
        isActive: true,
      });

      console.log(`  ✅ Created host: ${hostData.name} (${hostData.email})`);
      hostIds.push(hostId);
    }

    // Create properties
    for (const propData of EXAMPLE_PROPERTIES) {
      const hostId = hostIds[propData.hostIndex];
      
      // Check if property already exists by title
      const [existing] = await db
        .select()
        .from(properties)
        .where(eq(properties.title, propData.title))
        .limit(1);

      if (existing) {
        console.log(`  ⏭️  Property "${propData.title}" already exists, skipping...`);
        continue;
      }

      const propertyId = uuidv4();
      
      await db.insert(properties).values({
        id: propertyId,
        hostId,
        title: propData.title,
        description: propData.description,
        propertyType: propData.propertyType,
        category: propData.category,
        address: propData.address,
        city: propData.city,
        state: propData.state,
        country: propData.country,
        postcode: propData.postcode,
        latitude: propData.latitude,
        longitude: propData.longitude,
        maxGuests: propData.maxGuests,
        bedrooms: propData.bedrooms,
        beds: propData.beds,
        bathrooms: propData.bathrooms,
        amenities: propData.amenities,
        houseRules: propData.houseRules,
        checkInInstructions: propData.checkInInstructions,
        checkInTime: propData.checkInTime,
        checkOutTime: propData.checkOutTime,
        cancellationPolicy: propData.cancellationPolicy,
        baseNightlyRate: propData.baseNightlyRate,
        cleaningFee: propData.cleaningFee,
        serviceFee: 0,
        minNights: propData.minNights,
        maxNights: propData.maxNights,
        instantBook: propData.instantBook,
        selfCheckIn: propData.selfCheckIn,
        petFriendly: propData.petFriendly,
        smokingAllowed: propData.smokingAllowed,
        nearbyHighlight: propData.nearbyHighlight,
        coverImage: propData.coverImage,
        images: propData.images,
        status: "approved", // Pre-approved for seeding
        approvedAt: new Date(),
        isActive: true,
      });

      console.log(`  ✅ Created property: "${propData.title}" in ${propData.city}`);

      // Generate gap night availability
      const availDates = generateGapNightDates(propData.baseNightlyRate);
      let gapCount = 0;
      
      for (const avail of availDates) {
        await db.insert(propertyAvailability).values({
          id: uuidv4(),
          propertyId,
          date: avail.date,
          isAvailable: avail.isAvailable,
          isGapNight: avail.isGapNight,
          nightlyRate: avail.nightlyRate,
          gapNightDiscount: avail.gapNightDiscount,
          notes: avail.notes || null,
        });
        if (avail.isGapNight) gapCount++;
      }

      console.log(`     📅 Added ${availDates.length} availability dates (${gapCount} gap nights)`);
    }

    console.log("\n🎉 Seeding complete!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Example host login credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    for (const host of EXAMPLE_HOSTS) {
      console.log(`  📧 ${host.email} / ${host.password}`);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedProperties();
