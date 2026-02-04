import cron from "node-cron";
import { storage } from "./storage";
import * as rewards from "./rewards";
import { db } from "./db";
import { bookings, deals } from "@shared/schema";
import { eq, and, lt, gte, lte, sql } from "drizzle-orm";

// Award points for completed bookings (runs daily at 2 AM)
export function startPointsAwardJob() {
  // Run every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] Starting points award job...");
    
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Find all confirmed bookings where checkout date was yesterday and points not yet awarded
      const completedBookings = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "CONFIRMED"),
            eq(bookings.pointsAwarded, false),
            lte(bookings.checkOutDate, yesterday.toISOString().split('T')[0])
          )
        );
      
      console.log(`[CRON] Found ${completedBookings.length} completed bookings to award points`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const booking of completedBookings) {
        try {
          const result = await rewards.awardBookingPoints(
            storage,
            booking.userId,
            booking.id,
            booking.totalPrice,
            booking.hotelName
          );
          
          if (result.success) {
            await storage.markBookingPointsAwarded(booking.id);
            successCount++;
            console.log(`[CRON] Awarded ${result.pointsAwarded} points to user ${booking.userId} for booking ${booking.id}`);
          } else {
            failCount++;
            console.error(`[CRON] Failed to award points for booking ${booking.id}`);
          }
        } catch (error) {
          failCount++;
          console.error(`[CRON] Error awarding points for booking ${booking.id}:`, error);
        }
      }
      
      console.log(`[CRON] Points award job completed: ${successCount} successful, ${failCount} failed`);
    } catch (error) {
      console.error("[CRON] Points award job error:", error);
    }
  });
  
  console.log("[CRON] Points award job scheduled (daily at 2:00 AM)");
}

// Auto-publish gap nights based on hotel rules (runs daily at 3 AM)
export function startAutoListingJob() {
  // Run every day at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    console.log("[CRON] Starting auto-listing job...");
    
    try {
      // Get all active auto-listing rules
      const rules = await db.query.autoListingRules.findMany({
        where: (rules, { eq }) => eq(rules.isEnabled, true),
        with: {
          hotel: true,
        },
      });
      
      console.log(`[CRON] Found ${rules.length} active auto-listing rules`);
      
      let totalDealsCreated = 0;
      
      for (const rule of rules) {
        try {
          const now = new Date();
          const triggerDate = new Date(now);
          triggerDate.setHours(triggerDate.getHours() + rule.hoursBeforeCheckIn);
          
          // Get room types for this hotel
          const roomTypes = await storage.getRoomTypesByHotel(rule.hotelId);
          
          // Filter room types based on rule
          const eligibleRoomTypes = rule.roomTypeIds && rule.roomTypeIds.length > 0
            ? roomTypes.filter(rt => rule.roomTypeIds!.includes(rt.id))
            : roomTypes;
          
          for (const roomType of eligibleRoomTypes) {
            // Get availability for the next 30 days
            const startDate = new Date(triggerDate);
            const endDate = new Date(triggerDate);
            endDate.setDate(endDate.getDate() + 30);
            
            const availability = await storage.getRoomAvailability(
              roomType.id,
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            );
            
            // Find orphan nights (available nights surrounded by bookings)
            for (const avail of availability) {
              if (avail.available <= 0) continue;
              
              const availDate = new Date(avail.date);
              const dayOfWeek = availDate.getDay(); // 0 = Sunday, 6 = Saturday
              
              // Check day of week filter
              if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                if (!rule.daysOfWeek.includes(dayNames[dayOfWeek])) {
                  continue;
                }
              }
              
              // Check blackout dates
              if (rule.blackoutDates && rule.blackoutDates.includes(avail.date)) {
                continue;
              }
              
              // Check if deal already exists for this date
              const existingDeal = await db.query.publishedDeals.findFirst({
                where: (deals, { and, eq }) => and(
                  eq(deals.hotelId, rule.hotelId),
                  eq(deals.roomTypeId, roomType.id),
                  eq(deals.checkInDate, avail.date)
                ),
              });
              
              if (existingDeal) continue;
              
              // Calculate discounted price
              const basePrice = avail.basePrice || roomType.basePrice;
              const discountedPrice = Math.floor(basePrice * (1 - rule.discountPercentage / 100));
              const finalPrice = Math.max(discountedPrice, rule.minimumPrice || 0);
              
              // Create the deal
              const checkOutDate = new Date(availDate);
              checkOutDate.setDate(checkOutDate.getDate() + 1);
              
              await storage.createPublishedDeal({
                hotelId: rule.hotelId,
                roomTypeId: roomType.id,
                checkInDate: avail.date,
                checkOutDate: checkOutDate.toISOString().split('T')[0],
                nights: 1,
                originalPrice: basePrice,
                discountedPrice: finalPrice,
                discountPercentage: Math.round(((basePrice - finalPrice) / basePrice) * 100),
                inventory: 1,
                autoGenerated: true,
              });
              
              totalDealsCreated++;
              console.log(`[CRON] Auto-created deal for ${rule.hotel.name} - ${roomType.name} on ${avail.date}`);
            }
          }
        } catch (error) {
          console.error(`[CRON] Error processing auto-listing rule ${rule.id}:`, error);
        }
      }
      
      console.log(`[CRON] Auto-listing job completed: ${totalDealsCreated} deals created`);
    } catch (error) {
      console.error("[CRON] Auto-listing job error:", error);
    }
  });
  
  console.log("[CRON] Auto-listing job scheduled (daily at 3:00 AM)");
}

// Start all cron jobs
export function startAllCronJobs() {
  console.log("[CRON] Starting all scheduled jobs...");
  startPointsAwardJob();
  startAutoListingJob();
  console.log("[CRON] All scheduled jobs started successfully");
}
