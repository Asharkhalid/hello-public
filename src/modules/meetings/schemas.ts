import { z } from "zod";

export const meetingsInsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  agentId: z.string().min(1, { message: "Agent is required" }),
  conversationId: z.string().optional(),
});

export const meetingsUpdateSchema = meetingsInsertSchema.extend({
  id: z.string().min(1, { message: "Id is required" }),
});

export const blueprintAnalysisSchema = z.object({
  summary: z.string(),
  sessionCompleted: z.boolean(),
  reasoning: z.string(),
});
