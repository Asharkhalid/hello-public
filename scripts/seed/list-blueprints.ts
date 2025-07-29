import "./load-env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { agentBlueprints } from "../../src/db/schema";

// Initialize database connection
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: 'require',
  max: 1
});

const db = drizzle(client, { schema });

async function listActiveBlueprints() {
  const blueprints = await db
    .select()
    .from(agentBlueprints)
    .where(eq(agentBlueprints.isActive, true));

  if (blueprints.length === 0) {
    console.log("❌ No active blueprints found");
    return;
  }

  console.log(`\n✅ Found ${blueprints.length} active blueprint(s):\n`);
  
  blueprints.forEach((blueprint, index) => {
    console.log(`${index + 1}. ${blueprint.name}`);
    console.log(`   ID: ${blueprint.id}`);
    console.log(`   Type: ${blueprint.type}`);
    if (blueprint.description) {
      console.log(`   Description: ${blueprint.description}`);
    }
    
    const meetingTemplates = blueprint.meetingTemplates as { sessions: Array<{ session_id: string; session_name: string }> };
    if (meetingTemplates?.sessions?.length) {
      console.log(`   Conversations: ${meetingTemplates.sessions.length}`);
      meetingTemplates.sessions.forEach((session, idx) => {
        console.log(`     ${idx + 1}. ${session.session_name || 'Untitled Session'}`);
      });
    }
    console.log("");
  });
}

// Main execution
async function main() {
  await listActiveBlueprints();
}

main()
  .catch(console.error)
  .finally(async () => {
    await client.end();
    process.exit(0);
  });