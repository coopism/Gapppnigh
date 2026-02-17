/**
 * One-time seed script: Add a completed booking + points for scoopmeals@gmail.com
 * Run with: npx tsx server/seed-test-user.ts
 */
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function seed() {
  console.log("Seeding test data for scoopmeals@gmail.com...");

  // 1. Find the user (raw SQL to avoid schema mismatch)
  const userResult = await db.execute(
    sql`SELECT id, email, name FROM users WHERE email = 'scoopmeals@gmail.com' LIMIT 1`
  );
  const user = userResult.rows[0] as any;
  if (!user) {
    console.error("User scoopmeals@gmail.com not found. Please sign up first.");
    process.exit(1);
  }
  console.log("Found user: " + user.id + " (" + (user.name || user.email) + ")");

  // 2. Find any deal to reference
  const dealResult = await db.execute(
    sql`SELECT id, hotel_name, location, room_type, deal_price FROM deals LIMIT 1`
  );
  const deal = dealResult.rows[0] as any;
  if (!deal) {
    console.error("No deals found in database. Cannot create booking without a deal.");
    process.exit(1);
  }
  console.log("Using deal: " + deal.id + " - " + deal.hotel_name);

  // 3. Create a completed booking
  const bookingId = "GN" + Date.now();
  const firstName = user.name ? user.name.split(" ")[0] : "Test";
  const lastName = user.name ? user.name.split(" ").slice(1).join(" ") || "User" : "User";
  const totalPrice = (deal.deal_price || 200) * 2;

  await db.execute(sql`
    INSERT INTO bookings (id, user_id, deal_id, hotel_name, hotel_city, room_type, check_in_date, check_out_date, nights, guest_first_name, guest_last_name, guest_email, guest_phone, guest_country_code, total_price, currency, status, email_sent, points_awarded, review_submitted)
    VALUES (${bookingId}, ${user.id}, ${deal.id}, ${deal.hotel_name}, ${deal.location || 'Melbourne'}, ${deal.room_type || 'Standard'}, '2026-01-15', '2026-01-17', 2, ${firstName}, ${lastName}, ${user.email}, '0400000000', '+61', ${totalPrice}, '$', 'COMPLETED', true, true, false)
  `);
  console.log("Created completed booking: " + bookingId);

  // 4. Create or update rewards record with 500 points
  const rewardsResult = await db.execute(
    sql`SELECT id, current_points, total_points_earned FROM user_rewards WHERE user_id = ${user.id} LIMIT 1`
  );
  const existing = rewardsResult.rows[0] as any;

  if (existing) {
    const newCurrent = (existing.current_points || 0) + 500;
    const newTotal = (existing.total_points_earned || 0) + 500;
    await db.execute(sql`
      UPDATE user_rewards SET current_points = ${newCurrent}, total_points_earned = ${newTotal}, updated_at = NOW()
      WHERE user_id = ${user.id}
    `);
    console.log("Updated rewards: +500 points (new balance: " + newCurrent + ")");
  } else {
    const rewardsId = uuidv4();
    await db.execute(sql`
      INSERT INTO user_rewards (id, user_id, total_points_earned, current_points, credit_balance, tier)
      VALUES (${rewardsId}, ${user.id}, 500, 500, 0, 'Bronze')
    `);
    console.log("Created rewards account with 500 points");
  }

  // 5. Create transaction record
  const txId = uuidv4();
  await db.execute(sql`
    INSERT INTO rewards_transactions (id, user_id, type, points, description, booking_id)
    VALUES (${txId}, ${user.id}, 'EARN', 500, 'Seed: Completed booking bonus', ${bookingId})
  `);
  console.log("Created rewards transaction");

  console.log("");
  console.log("Done! scoopmeals@gmail.com now has:");
  console.log("  - 1 completed booking (" + bookingId + ") at " + deal.hotel_name);
  console.log("  - 500 reward points");
  console.log("  - Can write a review and redeem points");

  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
