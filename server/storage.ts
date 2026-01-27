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
