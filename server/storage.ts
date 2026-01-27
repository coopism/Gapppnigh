import { deals, waitlist, hotelInquiries, type Deal, type InsertWaitlist, type InsertHotelInquiry } from "@shared/schema";

export interface IStorage {
  getDeals(search?: string, category?: string, sort?: string): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  createWaitlistEntry(entry: InsertWaitlist): Promise<void>;
  createHotelInquiry(inquiry: InsertHotelInquiry): Promise<void>;
}

export class MemStorage implements IStorage {
  private deals: Map<string, Deal>;
  private waitlist: InsertWaitlist[];
  private hotelInquiries: InsertHotelInquiry[];

  constructor() {
    this.deals = new Map();
    this.waitlist = [];
    this.hotelInquiries = [];
    this.seedMockData();
  }

  private seedMockData() {
    const mockDeals: Deal[] = [
      {
        id: "gn_001",
        hotelName: "Crown City Suites",
        location: "Melbourne, Australia",
        stars: 5,
        rating: "4.6",
        reviewCount: 1284,
        checkInDate: "2026-02-14",
        checkOutDate: "2026-02-15",
        nights: 1,
        roomType: "King Room",
        imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        normalPrice: 420,
        dealPrice: 189,
        currency: "A$",
        dealScore: 92,
        categoryTags: ["All Deals", "Last Minute", "City"],
        cancellation: "Non-refundable",
        whyCheap: "Gap night: 1-night orphan slot between longer bookings.",
        latitude: "-37.8136",
        longitude: "144.9631",
        amenities: ["WiFi", "Pool", "Gym", "Parking", "Restaurant"],
        nearbyHighlight: "5 min walk to Flinders Station",
      },
      {
        id: "gn_002",
        hotelName: "Seaside Paradise Resort",
        location: "Gold Coast, Australia",
        stars: 4,
        rating: "4.2",
        reviewCount: 850,
        checkInDate: "2026-02-15",
        checkOutDate: "2026-02-16",
        nights: 1,
        roomType: "Ocean View Suite",
        imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        normalPrice: 350,
        dealPrice: 150,
        currency: "A$",
        dealScore: 88,
        categoryTags: ["All Deals", "Beach", "Trending"],
        cancellation: "Non-refundable",
        whyCheap: "Last-minute cancellation.",
        latitude: "-28.0167",
        longitude: "153.4000",
        amenities: ["WiFi", "Pool", "Spa", "Beach Access"],
        nearbyHighlight: "Direct beach access",
      },
      {
        id: "gn_003",
        hotelName: "Urban Loft Hotel",
        location: "Sydney, Australia",
        stars: 4,
        rating: "4.5",
        reviewCount: 2100,
        checkInDate: "2026-02-16",
        checkOutDate: "2026-02-17",
        nights: 1,
        roomType: "Standard Double",
        imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
        normalPrice: 280,
        dealPrice: 120,
        currency: "A$",
        dealScore: 95,
        categoryTags: ["All Deals", "City", "Trending"],
        cancellation: "Flexible",
        whyCheap: "Mid-week vacancy.",
        latitude: "-33.8688",
        longitude: "151.2093",
        amenities: ["WiFi", "Gym", "Bar", "Rooftop"],
        nearbyHighlight: "10 min to Opera House",
      },
       {
        id: "gn_004",
        hotelName: "Mountain View Lodge",
        location: "Blue Mountains, Australia",
        stars: 3,
        rating: "4.0",
        reviewCount: 450,
        checkInDate: "2026-02-18",
        checkOutDate: "2026-02-19",
        nights: 1,
        roomType: "Cozy Cabin",
        imageUrl: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800",
        normalPrice: 200,
        dealPrice: 90,
        currency: "A$",
        dealScore: 85,
        categoryTags: ["All Deals", "Nature", "Quiet"],
        cancellation: "Non-refundable",
        whyCheap: "Off-season promotion.",
        latitude: "-33.7333",
        longitude: "150.3000",
        amenities: ["WiFi", "Fireplace", "Nature Trails"],
        nearbyHighlight: "Walking trails nearby",
      },
      {
        id: "gn_005",
        hotelName: "The Grand Historic",
        location: "Melbourne, Australia",
        stars: 5,
        rating: "4.9",
        reviewCount: 3200,
        checkInDate: "2026-02-20",
        checkOutDate: "2026-02-21",
        nights: 1,
        roomType: "Heritage Suite",
        imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
        normalPrice: 550,
        dealPrice: 299,
        currency: "A$",
        dealScore: 90,
        categoryTags: ["All Deals", "Luxury", "City"],
        cancellation: "Flexible",
        whyCheap: "Gap night: 1-night orphan slot between conference bookings.",
        latitude: "-37.8100",
        longitude: "144.9700",
        amenities: ["WiFi", "Pool", "Spa", "Concierge", "Restaurant"],
        nearbyHighlight: "Heritage district",
      },
      {
        id: "gn_006",
        hotelName: "Brisbane Riverside Hotel",
        location: "Brisbane, Australia",
        stars: 4,
        rating: "4.3",
        reviewCount: 1560,
        checkInDate: "2026-02-17",
        checkOutDate: "2026-02-18",
        nights: 1,
        roomType: "River View Room",
        imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
        normalPrice: 320,
        dealPrice: 145,
        currency: "A$",
        dealScore: 87,
        categoryTags: ["All Deals", "City", "Trending"],
        cancellation: "Flexible",
        whyCheap: "Gap night between business conference blocks.",
        latitude: "-27.4698",
        longitude: "153.0251",
        amenities: ["WiFi", "Pool", "Gym", "Bar"],
        nearbyHighlight: "River walk at your door",
      },
      {
        id: "gn_007",
        hotelName: "Perth Waterfront Suites",
        location: "Perth, Australia",
        stars: 5,
        rating: "4.7",
        reviewCount: 980,
        checkInDate: "2026-02-19",
        checkOutDate: "2026-02-20",
        nights: 1,
        roomType: "Executive Suite",
        imageUrl: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800",
        normalPrice: 480,
        dealPrice: 225,
        currency: "A$",
        dealScore: 91,
        categoryTags: ["All Deals", "Luxury", "City"],
        cancellation: "Non-refundable",
        whyCheap: "Single night between corporate bookings.",
        latitude: "-31.9505",
        longitude: "115.8605",
        amenities: ["WiFi", "Pool", "Spa", "Parking", "Restaurant"],
        nearbyHighlight: "Elizabeth Quay 2 min",
      },
      {
        id: "gn_008",
        hotelName: "Adelaide Hills Retreat",
        location: "Adelaide, Australia",
        stars: 4,
        rating: "4.4",
        reviewCount: 620,
        checkInDate: "2026-02-22",
        checkOutDate: "2026-02-23",
        nights: 1,
        roomType: "Garden Suite",
        imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
        normalPrice: 260,
        dealPrice: 115,
        currency: "A$",
        dealScore: 86,
        categoryTags: ["All Deals", "Boutique", "Nature"],
        cancellation: "Flexible",
        whyCheap: "Midweek gap between weekend getaways.",
        latitude: "-34.9285",
        longitude: "138.6007",
        amenities: ["WiFi", "Garden", "Breakfast", "Wine Tours"],
        nearbyHighlight: "Wine country access",
      },
      {
        id: "gn_009",
        hotelName: "Cairns Tropical Resort",
        location: "Cairns, Australia",
        stars: 4,
        rating: "4.5",
        reviewCount: 1890,
        checkInDate: "2026-02-16",
        checkOutDate: "2026-02-17",
        nights: 1,
        roomType: "Rainforest View",
        imageUrl: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
        normalPrice: 380,
        dealPrice: 165,
        currency: "A$",
        dealScore: 89,
        categoryTags: ["All Deals", "Beach", "Trending"],
        cancellation: "Non-refundable",
        whyCheap: "Gap night: cancelled tour group.",
        latitude: "-16.9186",
        longitude: "145.7781",
        amenities: ["WiFi", "Pool", "Reef Tours", "Spa"],
        nearbyHighlight: "Reef departure point",
      },
      {
        id: "gn_010",
        hotelName: "Byron Bay Beach House",
        location: "Byron Bay, Australia",
        stars: 4,
        rating: "4.8",
        reviewCount: 2340,
        checkInDate: "2026-02-21",
        checkOutDate: "2026-02-22",
        nights: 1,
        roomType: "Beachfront Room",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
        normalPrice: 420,
        dealPrice: 195,
        currency: "A$",
        dealScore: 93,
        categoryTags: ["All Deals", "Beach", "Trending", "Boutique"],
        cancellation: "Flexible",
        whyCheap: "Single night between long-stay bookings.",
        latitude: "-28.6474",
        longitude: "153.6020",
        amenities: ["WiFi", "Beach Access", "Yoga", "Cafe"],
        nearbyHighlight: "Steps to Main Beach",
      },
      {
        id: "gn_011",
        hotelName: "Hobart Harbor Inn",
        location: "Hobart, Australia",
        stars: 3,
        rating: "4.2",
        reviewCount: 780,
        checkInDate: "2026-02-23",
        checkOutDate: "2026-02-24",
        nights: 1,
        roomType: "Harbor View Double",
        imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800",
        normalPrice: 240,
        dealPrice: 99,
        currency: "A$",
        dealScore: 84,
        categoryTags: ["All Deals", "City"],
        cancellation: "Non-refundable",
        whyCheap: "Off-peak gap night.",
        latitude: "-42.8821",
        longitude: "147.3272",
        amenities: ["WiFi", "Restaurant", "Bar"],
        nearbyHighlight: "Salamanca Market nearby",
      },
      {
        id: "gn_012",
        hotelName: "Sydney Opera House Views",
        location: "Sydney, Australia",
        stars: 5,
        rating: "4.9",
        reviewCount: 4200,
        checkInDate: "2026-02-18",
        checkOutDate: "2026-02-19",
        nights: 1,
        roomType: "Harbour Suite",
        imageUrl: "https://images.unsplash.com/photo-1549294413-26f195471c9d?w=800",
        normalPrice: 680,
        dealPrice: 340,
        currency: "A$",
        dealScore: 94,
        categoryTags: ["All Deals", "Luxury", "City", "Trending"],
        cancellation: "Flexible",
        whyCheap: "Last-minute cancellation from VIP booking.",
        latitude: "-33.8568",
        longitude: "151.2153",
        amenities: ["WiFi", "Pool", "Spa", "Concierge", "Fine Dining"],
        nearbyHighlight: "Opera House views",
      },
      {
        id: "gn_013",
        hotelName: "Surfers Paradise Tower",
        location: "Gold Coast, Australia",
        stars: 4,
        rating: "4.1",
        reviewCount: 1100,
        checkInDate: "2026-02-24",
        checkOutDate: "2026-02-25",
        nights: 1,
        roomType: "Ocean View Studio",
        imageUrl: "https://images.unsplash.com/photo-1582610116397-edb318620f90?w=800",
        normalPrice: 290,
        dealPrice: 125,
        currency: "A$",
        dealScore: 83,
        categoryTags: ["All Deals", "Beach"],
        cancellation: "Non-refundable",
        whyCheap: "Gap between weekend party bookings.",
        latitude: "-28.0025",
        longitude: "153.4311",
        amenities: ["WiFi", "Pool", "Gym", "Beach Access"],
        nearbyHighlight: "Surfers Paradise beach",
      },
      {
        id: "gn_014",
        hotelName: "Melbourne Arts Quarter",
        location: "Melbourne, Australia",
        stars: 4,
        rating: "4.6",
        reviewCount: 1750,
        checkInDate: "2026-02-25",
        checkOutDate: "2026-02-26",
        nights: 1,
        roomType: "Designer Loft",
        imageUrl: "https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800",
        normalPrice: 340,
        dealPrice: 155,
        currency: "A$",
        dealScore: 88,
        categoryTags: ["All Deals", "Boutique", "City"],
        cancellation: "Flexible",
        whyCheap: "Orphan night between art festival bookings.",
        latitude: "-37.8180",
        longitude: "144.9550",
        amenities: ["WiFi", "Cafe", "Art Gallery", "Rooftop"],
        nearbyHighlight: "NGV 5 min walk",
      },
      {
        id: "gn_015",
        hotelName: "Great Barrier Reef Lodge",
        location: "Cairns, Australia",
        stars: 5,
        rating: "4.7",
        reviewCount: 890,
        checkInDate: "2026-02-26",
        checkOutDate: "2026-02-27",
        nights: 1,
        roomType: "Reef Suite",
        imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
        normalPrice: 520,
        dealPrice: 275,
        currency: "A$",
        dealScore: 90,
        categoryTags: ["All Deals", "Luxury", "Beach"],
        cancellation: "Flexible",
        whyCheap: "Gap night: dive tour schedule change.",
        latitude: "-16.9000",
        longitude: "145.7600",
        amenities: ["WiFi", "Pool", "Dive Center", "Spa", "Restaurant"],
        nearbyHighlight: "Reef tours on-site",
      },
    ];

    mockDeals.forEach(deal => this.deals.set(deal.id, deal));
  }

  async getDeals(search?: string, category?: string, sort?: string): Promise<Deal[]> {
    let results = Array.from(this.deals.values());

    if (search) {
      const lowerSearch = search.toLowerCase();
      results = results.filter(deal => 
        deal.location.toLowerCase().includes(lowerSearch) || 
        deal.hotelName.toLowerCase().includes(lowerSearch)
      );
    }

    if (category && category !== "All Deals") {
      results = results.filter(deal => deal.categoryTags.includes(category));
    }

    if (sort) {
      switch (sort) {
        case "cheapest":
          results.sort((a, b) => a.dealPrice - b.dealPrice);
          break;
        case "discount":
          // Calculate discount percentage
          results.sort((a, b) => {
            const discountA = (a.normalPrice - a.dealPrice) / a.normalPrice;
            const discountB = (b.normalPrice - b.dealPrice) / b.normalPrice;
            return discountB - discountA;
          });
          break;
        case "rating":
           results.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
           break;
        case "best":
        default:
          results.sort((a, b) => b.dealScore - a.dealScore);
          break;
      }
    }

    return results;
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async createWaitlistEntry(entry: InsertWaitlist): Promise<void> {
    this.waitlist.push(entry);
  }

  async createHotelInquiry(inquiry: InsertHotelInquiry): Promise<void> {
    this.hotelInquiries.push(inquiry);
  }
}

export const storage = new MemStorage();
