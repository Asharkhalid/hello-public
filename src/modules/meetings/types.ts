import { inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

import type { AppRouter } from "@/trpc/routers/_app";
import { agentBlueprintSchema, sessionSchema } from "@/modules/agents/schemas";

export type MeetingGetMany = inferRouterOutputs<AppRouter>["meetings"]["getMany"]["items"];
export type MeetingGetOne = inferRouterOutputs<AppRouter>["meetings"]["getOne"];
export enum MeetingStatus {
  Upcoming = "upcoming",
  Active = "active",
  Completed = "completed",
  Processing = "processing",
  Cancelled = "cancelled",
};
export type StreamTranscriptItem = {
  speaker_id: string;
  type: string;
  text: string;
  start_ts: number;
  stop_ts: number;
};

export type SessionTemplate = z.infer<typeof sessionSchema>;

export type AgentBlueprint = z.infer<typeof agentBlueprintSchema>;

export type NextMeetingPlan = {
  nextMeetingTemplateId?: string;
  generatedInstructions?: string;
  contextToCarryOver?: string;
};