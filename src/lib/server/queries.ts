import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import "server-only";

export async function getAgentWithBlueprint(agentId: string) {
  return await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: {
      blueprint: true,
    },
  });
}

export async function getLatestMeeting(userId: string, agentId: string) {
  return await db.query.meetings.findFirst({
    where: and(eq(meetings.userId, userId), eq(meetings.agentId, agentId)),
    orderBy: [desc(meetings.createdAt)],
  });
} 