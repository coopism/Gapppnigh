import "dotenv/config";
import { db } from "../server/db";
import { deals } from "../shared/schema";
import { sql } from "drizzle-orm";

async function updateMaxGuests() {
  console.log("Updating maxGuests for existing deals...");
  
  // Update all deals with maxGuests based on room type
  await db.execute(sql`
    UPDATE deals 
    SET max_guests = CASE 
      WHEN room_type LIKE '%Penthouse%' THEN 4
      WHEN room_type LIKE '%Suite%' THEN 3
      ELSE 2 
    END
    WHERE max_guests IS NULL OR max_guests = 2
  `);
  
  console.log("✅ maxGuests updated for all deals!");
  process.exit(0);
}

updateMaxGuests().catch((err) => {
  console.error("Update error:", err);
  process.exit(1);
});
