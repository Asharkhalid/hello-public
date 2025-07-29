import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: 'require',
  max: 1
});

const db = drizzle(client, { schema });

async function checkUsers() {
  try {
    const users = await db.select().from(schema.user);
    console.log("\n🔍 Users in database:");
    console.log("=" .repeat(50));
    
    if (users.length === 0) {
      console.log("❌ No users found in the database!");
      console.log("\n💡 You need to create a user first before seeding.");
      console.log("   Either sign up through the app or add a user manually.");
    } else {
      users.forEach(user => {
        console.log(`📧 Email: ${user.email}`);
        console.log(`🆔 ID: ${user.id}`);
        console.log(`👤 Name: ${user.name || 'Not set'}`);
        console.log("-".repeat(50));
      });
      console.log(`\n✅ Total users: ${users.length}`);
    }
  } catch (error) {
    console.error("❌ Error connecting to database:", error);
  } finally {
    await client.end();
  }
}

checkUsers();