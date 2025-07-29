import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env file");
}

const main = async () => {
  const client = neon(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  try {
    console.log("🧹 Starting database cleanup...");

    // Order of deletion matters to avoid foreign key violations.
    // 1. Delete transcript chunks (references meetings)
    console.log("- Deleting all records from 'transcript_chunks' table...");
    await db.delete(schema.transcriptChunks);

    // 2. Delete meetings
    console.log("- Deleting all records from 'meetings' table...");
    await db.delete(schema.meetings);

    // 3. Delete agents
    console.log("- Deleting all records from 'agents' table...");
    await db.delete(schema.agents);
    
    // 4. Delete agent blueprints
    console.log("- Deleting all records from 'agent_blueprints' table...");
    await db.delete(schema.agentBlueprints);

    console.log("✅ Database cleanup completed successfully.");
  } catch (error) {
    console.error("❌ An error occurred during database cleanup:", error);
    process.exit(1);
  } finally {
    // Neon's HTTP driver doesn't require an explicit close/end call
    console.log("🔌 Process finished.");
  }
};

main();