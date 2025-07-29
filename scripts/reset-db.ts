import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env file");
}

const main = async () => {
  // Fix for "FATAL: eof" error with neon serverless driver
  // See: https://github.com/neondatabase/serverless/issues/111
  neonConfig.fetchConnectionCache = true;
  
  const client = neon(process.env.DATABASE_URL!);
  // Note: We don't pass a schema here because we are doing raw SQL operations
  const db = drizzle(client);

  try {
    console.log("🔥 Starting database reset...");

    const tablesResult = await db.execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    
    const tables = (tablesResult.rows as { tablename: string }[]).map(
      (t) => t.tablename
    );
    
    if (tables.length === 0) {
        console.log("✅ No tables found to drop. Database appears to be clean.");
    } else {
        console.log(`- Dropping the following tables: ${tables.join(", ")}`);
        for (const table of tables) {
            await db.execute(sql.raw(`DROP TABLE public."${table}" CASCADE;`));
        }
        console.log("✅ All tables dropped successfully.");
    }

    console.log("🏁 Database reset script finished.");
    console.log("➡️  Next step: Run 'npm run db:push' to apply your schema.");

  } catch (error) {
    console.error("❌ An error occurred during database reset:", error);
    process.exit(1);
  } finally {
    console.log("🔌 Process finished.");
  }
};

main(); 