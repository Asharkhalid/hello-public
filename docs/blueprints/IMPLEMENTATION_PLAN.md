# Agent Blueprint System - Implementation Plan

This document outlines the step-by-step plan to implement the Agent Blueprint system as defined in the [V3 Design Document](./DESIGN.md). Each step is designed to be a small, logical, and verifiable unit of work.

---

## Implementation Steps

### ☑ Step 1: Implement Core Database Schema

-   **Goal:** Create the foundational database tables (`agent_blueprints`, `meeting_states`) and add the required foreign key relationships to the existing `agents` and `meetings` tables.
-   **Reasoning:** The entire system depends on this schema. Implementing it first allows us to generate migrations and provides the necessary database structure for all subsequent logic. This step is purely declarative and contains no business logic.
-   **Files to Modify:**
    1.  `src/db/schema.ts`

---

### ☑ Step 2: Update tRPC Procedures for Meeting Creation

-   **Goal:** Modify the `meetings.create` tRPC procedure to handle the new blueprint-driven meeting creation logic.
-   **Reasoning:** This is the primary user-facing entry point for the new system. We need to implement the core logic that checks for a user's progress (`meeting_states`) and creates a meeting based on either the blueprint's initial template or a pre-generated `nextMeetingPlan`. This step will also include the critical race-condition check.
-   **Files to Modify:**
    1.  `src/modules/meetings/server/procedures.ts`
    2.  `src/modules/meetings/schemas.ts` (No changes were needed)
    3.  `src/lib/server/queries.ts` (A new file for reusable database queries, to keep procedures clean)

---

### ☑ Step 3: Implement the Inngest Background Job for State Progression

-   **Goal:** Create or modify the Inngest function that processes a completed meeting's transcript, analyzes it against the blueprint's criteria, and updates the user's `meeting_states` record.
-   **Reasoning:** This is the engine of the blueprint system. This background job is responsible for analyzing the user's performance, summarizing their progress, and preparing the plan for their next meeting. Isolating this complex logic into an Inngest function makes it reliable and decoupled from the synchronous meeting creation flow.
-   **Files to Modify:**
    1.  `src/inngest/functions.ts`
    2.  `src/inngest/events.ts` (A new file for storing event constants)
    3.  `src/lib/llm/prompts.ts` (A new file for storing the complex analysis prompts)
    4.  `src/lib/llm/agent.ts` (No changes were needed)

---

### ☑ Step 4: Create a Seeding Script for Blueprints

-   **Goal:** Add a script to seed the database with a sample `agent_blueprint` and its associated `meeting_templates`.
-   **Reasoning:** To effectively test the system during development, we need a consistent way to populate the database with a valid blueprint. A seed script ensures we can easily create and reset test data without manual database intervention.
-   **Files to Modify:**
    1.  `scripts/seed-blueprint.ts` (New file)
    2.  `package.json` (to add a script command `npm run db:seed:blueprint`)

---

## Implementation Notes & History

-   **Step 1 (Done):**
    -   Added `agent_blueprints` and `meeting_states` tables to `src/db/schema.ts`.
    -   Added `blueprintId` to the `agents` table and made `instructions` optional.
    -   Added `meetingStateId` and `sessionInstructions` to the `meetings` table.
    -   Imported `jsonb` and `uniqueIndex` to support the new columns.
-   **Step 2 (Done):**
    -   Created `src/lib/server/queries.ts` to abstract database lookups for agents, meetings, and meeting states.
    -   Overhauled the `meetings.create` procedure in `src/modules/meetings/server/procedures.ts` with the new blueprint logic.
    -   Implemented the race-condition check to prevent new meetings while one is processing.
    -   Added logic to create the initial `meeting_states` record for a user's first blueprint meeting.
    -   **Major Refactor:** Corrected the tRPC context typing in `src/trpc/init.ts` to properly infer and pass down the `auth` session object, fixing dozens of cascading type errors across the application.
    -   Added `AgentBlueprint` and `NextMeetingPlan` types to `src/modules/meetings/types.ts`.
-   **Step 3 (Done):**
    -   Created `src/inngest/events.ts` to centralize event definitions.
    -   Created `src/lib/llm/prompts.ts` to manage the blueprint analysis prompt.
    -   Overhauled the `meetingsProcessing` function in `src/inngest/functions.ts` to be the main engine for blueprint progression.
    -   The function now dynamically chooses between classic summarization and blueprint analysis based on the agent's configuration.
    -   Implemented the logic to parse LLM output, determine the next template, generate the `nextMeetingPlan`, and update the `meeting_states` table.
    -   Refactored transcript fetching into a shared helper function.
    -   Resolved complex Inngest and Drizzle typing issues by correctly inferring the `Step` type and ensuring arrays passed to Drizzle's `inArray` were strongly typed.
-   **Step 4 (Done):**
    -   Created a new seeding script at `scripts/seed-blueprint.ts`.
    -   The script defines and inserts a detailed "Think and Grow Rich" agent blueprint, using the user-provided session content.
    -   Made the script idempotent by having it delete any existing blueprint with the same name before insertion.
    -   Added a `db:seed:blueprint` command to `package.json` for easy execution. 