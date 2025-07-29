import { z } from "zod";

export const agentsInsertSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
});

export const agentsUpdateSchema = agentsInsertSchema.extend({
  id: z.string().min(1, { message: "Id is required" }),
});

export const agentUpdateSchema = agentsInsertSchema.extend({
  id: z.string(),
});

export const sessionSchema = z.object({
  session_id: z.string(),
  session_name: z.string(),
  completion_criteria: z.array(z.string()),
  prompt: z.string(),
});

export const agentBlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  marketingCollateral: z.any().optional().nullable(),
  meetingTemplates: z.object({
    sessions: z.array(sessionSchema),
  }).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
