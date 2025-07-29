import { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

export type AgentsGetMany = inferRouterOutputs<AppRouter>["agents"]["getMany"]["items"];
export type AgentGetOne = inferRouterOutputs<AppRouter>["agents"]["getOne"];

export type AgentBlueprintsGetMany = inferRouterOutputs<AppRouter>["agentBlueprints"]["getMany"]["items"];
export type AgentBlueprintGetOne = inferRouterOutputs<AppRouter>["agentBlueprints"]["getOne"];

export type MarketingCollateral = {
  imageUrl: string;
  author: string;
  tagline?: string;
  objectives?: string[];
  description?: string;
  features?: string[];
};
