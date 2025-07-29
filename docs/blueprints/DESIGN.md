# Agent Blueprint System - V3 Design Document (Final)

## 1. Overview

This document outlines the final technical design for the Agent Blueprint System. This V3 design incorporates detailed feedback to create a robust, scalable, and maintainable architecture.

The core of the system is a clear separation of concerns:
- **`agent_blueprints`**: A new table storing an agent's identity, marketing materials, and a reference to its conversational logic.
- **`meeting_templates`**: A JSON object within the blueprint that defines the entire conversational journey as a series of templates.
- **`meeting_states`**: A dedicated table to track a user's progress through an agent's blueprint, creating a new state after each completed meeting.

This design is built to be resilient, handling race conditions and analysis failures gracefully, while providing a clear path for future enhancements.

---

## 2. Final Database Schema (`src/db/schema.ts`)

### New Table: `agent_blueprints`

This is the central definition for an agent's guided experience. It explicitly separates marketing content from the conversational logic.

```typescript:src/db/schema.ts
// ... imports
import { jsonb } from 'drizzle-orm/pg-core';

// ...

export const agentBlueprints = pgTable("agent_blueprints", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  description: text("description"),
  
  // Marketing and UI content, displayed on the agent's public page.
  marketingCollateral: jsonb("marketing_collateral").notNull(),
  
  // The complete conversational flow, including the initial template and all subsequent ones.
  meetingTemplates: jsonb("meeting_templates").notNull(),

  type: text("type", { enum: ["sequential", "recurring"] }).notNull().default("sequential"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### New Table: `meeting_states`

This table is the authoritative progress tracker for a user's journey with a specific agent blueprint. A single record exists per user/agent, and it is updated after each meeting.

```typescript:src/db/schema.ts
export const meetingStates = pgTable("meeting_states", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  blueprintId: text("blueprint_id").notNull().references(() => agentBlueprints.id, { onDelete: "cascade" }),
  
  // Tracks the user's journey through the meeting templates.
  completedMeetingTemplates: jsonb("completed_meeting_templates").default('[]'), // e.g., ['intro', 'session_2']
  progressSummary: text("progress_summary"), // A running summary of the journey.
  
  // The pre-prepared plan for the very next meeting.
  nextMeetingPlan: jsonb("next_meeting_plan"), 
  
  // The full blueprint JSON is snapshotted on creation to handle versioning.
  blueprintSnapshot: jsonb("blueprint_snapshot").notNull(),

  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
    // Ensures one progress tracker per user-agent-blueprint combo.
    user_agent_blueprint_unique_idx: uniqueIndex("user_agent_blueprint_unique_idx").on(table.userId, table.agentId, table.blueprintId),
}));
```

### Modifications to `agents` and `meetings`

-   The `agents` table gets a `blueprintId` to link to `agent_blueprints`.
-   The `meetings` table gets `sessionInstructions` (the prompt used for that meeting) and `meetingStateId` to link back to the state that generated it.

```typescript:src/db/schema.ts
// ...

export const agents = pgTable("agents", {
  // ... existing fields
  instructions: text("instructions"), // Optional, for non-blueprint agents
  blueprintId: text("blueprint_id").references(() => agentBlueprints.id),
  // ...
});

export const meetings = pgTable("meetings", {
  // ... existing fields
  summary: text("summary"),
  sessionInstructions: text("session_instructions"),
  // Link to the state that this meeting fulfills. Null for the first meeting.
  meetingStateId: text("meeting_state_id").references(() => meetingStates.id),
  // ...
});

```

---

## 3. Core Logic and Data Flow

### Meeting Creation Flow (`meetingsRouter.create`)

This flow is now robust against race conditions and clearly defined.

1.  **On meeting request**, fetch the agent and check its `blueprintId`.
2.  **Look for an existing `meeting_states` record** for the user/agent.
3.  **Handle Race Condition:** Query the most recent `meetings` record for the user/agent. If its status is `'processing'`, throw a user-friendly error: "Please wait a moment, your previous session is still being analyzed."
4.  **First Meeting (No `meeting_states` record):**
    *   Fetch the `agent_blueprints` record.
    *   Use the `initialMeetingTemplate` from the `meetingTemplates` JSON to generate instructions.
    *   When this first meeting is created, also create the initial `meeting_states` record, taking a `blueprintSnapshot` to lock in the version.
5.  **Subsequent Meetings (`meeting_states` record exists):**
    *   Use the `nextMeetingPlan` from the existing `meeting_states` record to get the pre-generated instructions.
    *   Create the new meeting, linking it to the `meeting_states` record.

### Meeting Completion Flow (`meetingsProcessing` Inngest Function)

This background job is the engine of progression.

1.  **Triggered** after a transcript is ready for a completed meeting.
2.  **Fetch Data**: Load the `meeting`, the `meeting_states` record for the user/agent, and the `blueprintSnapshot` from that state record.
3.  **Dynamic Analysis Prompt:**
    *   Identify the `meeting_template` that was just completed.
    *   Create a detailed prompt for the `summarizer` LLM agent, including the transcript and the `completionCriteria` from the template.
    *   Instruct the LLM to return a structured JSON object: `{ "summary": "...", "sessionCompleted": true, "reasoning": "..." }`.
4.  **Parse Response** and determine if the session was completed.
5.  **Identify Next Template:** Based on the blueprint's flow, find the next `meeting_template`.
6.  **Generate Next Meeting Plan:** Create the JSON object for the `nextMeetingPlan`, which includes the `nextMeetingTemplateId` and the dynamically generated `generatedInstructions` for that upcoming meeting.
7.  **Update `meeting_states` Record:** Atomically update the single `meeting_states` record for the user/agent with:
    *   The ID of the template just completed.
    *   An updated `progressSummary`.
    *   The newly generated `nextMeetingPlan`.

---

## 4. Finalized JSON Structures

### `agent_blueprints.marketingCollateral`

```json
{
  "tagline": "Master the Principles of Success",
  "objectives": ["Learn to think like an achiever", "Develop a success-oriented mindset"],
  "whatYouWillLearn": ["The 13 steps to riches", "How to overcome fear and procrastination"],
  "uiElements": { "themeColor": "#D4AF37" }
}
```

### `agent_blueprints.meetingTemplates`

```json
{
  "initialMeetingTemplate": {
    "id": "intro_to_principles",
    "name": "Introduction to 'Think and Grow Rich'",
    "completionCriteria": { "keyTopicsCovered": ["desire", "faith"] }
  },
  "meeting_templates": [
    {
      "id": "mastermind_alliance",
      "name": "The Mastermind Principle",
      "completionCriteria": { "keyTopicsCovered": ["mastermind", "synergy"] }
    }
  ]
}
```

### `meeting_states.nextMeetingPlan`

```json
{
  "nextMeetingTemplateId": "mastermind_alliance",
  "generatedInstructions": "Last time, we discussed the power of a definite chief aim. Now, let's explore how to amplify your efforts by forming a Mastermind alliance...",
  "contextToCarryOver": "User has defined their chief aim as 'building a successful online business'."
}
```

This V3 design provides a comprehensive, robust, and clear path for implementation, directly reflecting the detailed requirements and critiques discussed. 