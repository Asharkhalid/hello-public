import "./load-env";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { user, agentBlueprints, agents, meetings } from "../../src/db/schema";

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

async function createAgentFromBlueprint(userId: string, blueprintId?: string) {
  console.log("Starting agent creation process...");

  // 1. Verify user exists
  const [targetUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId));

  if (!targetUser) {
    throw new Error(`User with ID ${userId} not found`);
  }

  console.log(`Found user: ${targetUser.email}`);

  // 2. Get blueprint (use provided ID or fetch the first active one)
  let blueprint;
  if (blueprintId) {
    [blueprint] = await db
      .select()
      .from(agentBlueprints)
      .where(and(
        eq(agentBlueprints.id, blueprintId),
        eq(agentBlueprints.isActive, true)
      ));
  } else {
    // Get the first active blueprint
    [blueprint] = await db
      .select()
      .from(agentBlueprints)
      .where(eq(agentBlueprints.isActive, true))
      .limit(1);
  }

  if (!blueprint) {
    throw new Error("No active blueprint found");
  }

  console.log(`Using blueprint: ${blueprint.name}`);

  // 3. Validate blueprint has conversations
  const meetingTemplates = blueprint.meetingTemplates as { sessions: Array<{ session_id: string; session_name: string; prompt: string }> };
  if (!meetingTemplates?.sessions?.length) {
    throw new Error("Blueprint has no conversations defined");
  }

  const firstConversation = meetingTemplates.sessions[0];
  console.log(`First conversation: ${firstConversation.session_name}`);

  // 4. Create agent with blueprint snapshot
  const agentName = `${blueprint.name} Journey - ${new Date().toLocaleDateString()}`;

  const [createdAgent] = await db
    .insert(agents)
    .values({
      id: nanoid(),
      name: agentName,
      userId: userId,
      blueprintId: blueprint.id,
      blueprintSnapshot: {
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        marketingCollateral: blueprint.marketingCollateral,
        conversations: meetingTemplates.sessions,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`Created agent: ${createdAgent.name} (ID: ${createdAgent.id})`);

  // 5. Create first meeting with progress tracking
  const meetingData = {
    currentConversationId: firstConversation.session_id,
    completedSessions: [],
    journeyStarted: new Date().toISOString(),
  };

  const [firstMeeting] = await db
    .insert(meetings)
    .values({
      id: nanoid(),
      name: firstConversation.session_name,
      userId: userId,
      agentId: createdAgent.id,
      prompt: firstConversation.prompt,
      meetingData: meetingData,
      status: "upcoming",
      progress: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`Created meeting: ${firstMeeting.name} (ID: ${firstMeeting.id})`);

  return {
    agent: createdAgent,
    meeting: firstMeeting,
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: tsx create-agent-from-blueprint.ts <userId> [blueprintId]");
    console.error("Example: tsx create-agent-from-blueprint.ts user123");
    console.error("Example: tsx create-agent-from-blueprint.ts user123 blueprint456");
    process.exit(1);
  }

  const userId = args[0];
  const blueprintId = args[1];

  try {
    const result = await createAgentFromBlueprint(userId, blueprintId);
    console.log("\n✅ Success!");
    console.log("Agent created:", result.agent);
    console.log("Meeting created:", result.meeting);
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await client.end();
    process.exit(0);
  });