import "./load-env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { user } from "../../src/db/schema";

// Initialize database connection
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("Please run with: DATABASE_URL=your_url npm run seed:find-user khalid@looptoday.com");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: 'require',
  max: 1
});

const db = drizzle(client, { schema });

async function findUserByEmail(email: string) {
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, email));

  if (!foundUser) {
    console.log(`❌ No user found with email: ${email}`);
    return null;
  }

  console.log("\n✅ User found:");
  console.log(`ID: ${foundUser.id}`);
  console.log(`Name: ${foundUser.name}`);
  console.log(`Email: ${foundUser.email}`);
  console.log(`Created: ${foundUser.createdAt}`);
  
  return foundUser;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: tsx find-user-by-email.ts <email>");
    console.error("Example: tsx find-user-by-email.ts khalid@looptoday.com");
    process.exit(1);
  }

  const email = args[0];
  await findUserByEmail(email);
}

main()
  .catch(console.error)
  .finally(async () => {
    await client.end();
    process.exit(0);
  });