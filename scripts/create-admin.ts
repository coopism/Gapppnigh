import { db } from "../server/db";
import { adminUsers } from "@shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@gapnight.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.ADMIN_NAME || "System Administrator";

  console.log("\n🔐 Creating admin user...\n");

  try {
    // Check if admin already exists
    const [existing] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    if (existing) {
      console.log(`❌ Admin user with email ${email} already exists.`);
      console.log(`   Use a different email or delete the existing admin first.\n`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const [admin] = await db
      .insert(adminUsers)
      .values({
        id: uuidv4(),
        email,
        passwordHash,
        name,
        role: "super_admin",
        isActive: true,
      })
      .returning();

    console.log("✅ Admin user created successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:    ", email);
    console.log("🔑 Password: ", password);
    console.log("👤 Name:     ", name);
    console.log("🛡️  Role:     ", admin.role);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("⚠️  IMPORTANT: Change the password after first login!");
    console.log("🔗 Login at: /admin/login\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
