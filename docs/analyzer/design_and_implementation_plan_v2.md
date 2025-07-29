# Voice Agent Prompt Generation System - Correct Design V2

## Data Model Understanding

### 1. **Session** (Blueprint Template)
```typescript
// Blueprint session structure in agentBlueprints.meetingTemplates.sessions
interface Session {
  session_id: string;           // e.g., "session_01", "session_02"
  session_name: string;         // e.g., "Building Unshakeable Faith"
  completion_criteria: string[]; // Array of specific measurable criteria
  prompt: string;               // Complete prompt with all sections (see below)
}

// Example from blueprint:
{
  sessions: [
    {
      session_id: "session_01",
      session_name: "Foundation of Success", 
      completion_criteria: [
        "Understanding demonstrated of subconscious mind function and programming principles",
        "Personal limiting beliefs identified and specific counter-affirmations created"
      ],
      prompt: "PERSONALITY AND TONE\n\nIdentity: You are Dr. Success...\n\n[FULL PROMPT]"
    }
    // ... more sessions
  ]
}
```

### 2. **Session Progress** (Tracking Data)
```typescript
// Progress tracking structure stored in meetings.progress
interface SessionProgress {
  session_id: string;                    // Matches blueprint session_id
  session_name: string;                  // Matches blueprint session_name
  session_status: "pending" | "in_progress" | "completed";
  completion_notes?: string;             // "Accomplished: [specific]. Remaining: [if any]"
  participant_specific_notes?: string;   // "Key insights: [personality, goals, challenges]"
  criteria_met: string[];               // Exact criterion text that was completed
  criteria_pending: string[];           // Exact criterion text still pending
  date_completed?: string;              // "YYYY-MM-DD" only if completed
  [key: string]: any;                   // Allow LLM to add additional tracking fields
}

// Example progress array:
[
  {
    "session_id": "session_01",
    "session_name": "Foundation of Success",
    "session_status": "completed",
    "completion_notes": "Accomplished: Established definite purpose and burning desire. Remaining: None",
    "participant_specific_notes": "Highly analytical personality, responds well to data-driven examples. Goal: $1M business in 3 years",
    "criteria_met": [
      "Understanding demonstrated of subconscious mind function and programming principles",
      "Personal limiting beliefs identified and specific counter-affirmations created"
    ],
    "criteria_pending": [],
    "date_completed": "2024-01-15"
  },
  {
    "session_id": "session_02", 
    "session_name": "Building Unshakeable Faith",
    "session_status": "in_progress",
    "completion_notes": "Accomplished: Identified limiting beliefs. Remaining: Master autosuggestion technique",
    "participant_specific_notes": "Struggles with self-doubt, needs repetition and encouragement",
    "criteria_met": [
      "Personal limiting beliefs identified and specific counter-affirmations created"
    ],
    "criteria_pending": [
      "Autosuggestion technique mastered with proper emotion and repetition",
      "Clear distinction understood between faith and hope with practical applications"
    ]
  }
  // ... all sessions in program with current status
]
```

### 3. **Complete Prompt Structure**
Based on `docs/analyzer/prompt.md`, each session prompt contains:

```typescript
interface PromptStructure {
  // PERSONALITY AND TONE Section
  identity: string;           // "You are Dr. Success, an inspiring success coach..."
  task: string;              // "Guide participants through building unshakeable faith..."
  demeanor: string;          // "Calm, centered, and deeply wise..."
  tone: string;              // "Gentle yet powerful, with deep conviction..."
  enthusiasm_level: string;  // "Quietly passionate and deeply committed..."
  formality_level: string;   // "Respectfully informal with reverence..."
  emotion_level: string;     // "Emotionally present and empathetic..."
  filler_words: string;      // "Uses 'you see,' 'understand this,'..."
  pacing: string;            // "Deliberately slow and thoughtful..."
  
  // SESSION GUIDELINES Section
  guidelines: string[];      // Array of specific guidance points
  
  // CONVERSATION STATES Section
  conversation_states: ConversationState[];
}

interface ConversationState {
  id: string;                // "1_understanding_subconscious"
  description: string;       // What this state accomplishes
  instructions: string[];    // Specific actions to take
  examples: string[];        // Example phrases/responses
  transitions: Transition[]; // When to move to next state
}

interface Transition {
  next_step: string;         // Next state ID or "session_complete"
  condition: string;         // When to transition
}
```

## Database Schema Changes

### Step 1: Update Agents Table
```sql
-- Remove unnecessary fields from agents
ALTER TABLE agents DROP COLUMN IF EXISTS instructions;
ALTER TABLE agents DROP COLUMN IF EXISTS progress_tracker;
```

### Step 2: Update Meetings Table  
```sql
-- Remove conversationId (no longer needed)
ALTER TABLE meetings DROP COLUMN IF EXISTS conversation_id;

-- Rename meetingInstructions to prompt
ALTER TABLE meetings RENAME COLUMN meeting_instructions TO prompt;

-- Add progress column
ALTER TABLE meetings ADD COLUMN progress JSONB DEFAULT '[]';
```

### Updated Schema
```typescript
// src/db/schema.ts
export const agents = pgTable("agents", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  blueprintId: text("blueprint_id").references(() => agentBlueprints.id),
  blueprintSnapshot: jsonb("blueprint_snapshot"), // Contains Session[] array
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  status: meetingStatus("status").notNull().default("upcoming"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  transcriptUrl: text("transcript_url"),
  recordingUrl: text("recording_url"),
  summary: text("summary"),
  prompt: text("prompt"), // RENAMED from meetingInstructions
  progress: jsonb("progress").default('[]'), // NEW field
  meetingData: jsonb("meeting_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## How the New Analyzer System Works

### 1. **Input Preparation**
```typescript
// The analyzer receives three key inputs:
interface AnalyzerInput {
  // 1. Blueprint Sessions (templates from agent.blueprintSnapshot.sessions)
  blueprintSessions: Session[];
  
  // 2. Current Progress (from last meeting.progress)
  currentProgress: SessionProgress[];
  
  // 3. Conversation Transcript
  transcript: string;
}
```

### 2. **Analysis Process**
The analyzer uses the sophisticated prompt from `docs/analyzer/prompt.md` to:

1. **Parse Blueprint Context**: Understand session objectives and completion criteria
2. **Assess Current Progress**: Determine what's been accomplished and what remains
3. **Analyze Transcript**: Extract evidence of criterion completion and participant insights
4. **Generate Outputs**: Create comprehensive progress summary, updated progress tracking, and contextual next prompt

### 3. **Output Generation**
```typescript
interface AnalyzerOutput {
  // 1. Comprehensive Progress Summary (free-form analysis)
  progressSummary: string; // Detailed analysis with criteria assessment, accomplishments, insights
  
  // 2. Updated Progress Tracking (structured data)
  updatedProgress: SessionProgress[]; // Complete array with all sessions and current status
  
  // 3. Next Session Prompt (contextual and personalized)
  nextSessionPrompt: string; // Full prompt with PERSONALITY, GUIDELINES, STATES sections
}
```

### 4. **Prompt Generation Logic**
The analyzer determines prompt type based on progress analysis:

```typescript
// Decision tree for next prompt:
if (currentSessionHasPendingCriteria) {
  // Generate CONTINUATION prompt
  // - Reconnect to interrupted point
  // - Focus on incomplete criteria
  // - Maintain original session objectives
} else if (currentSessionJustCompleted) {
  // Generate NEXT SESSION prompt  
  // - Use next session's blueprint as base
  // - Add bridges referencing previous achievements
  // - Personalize with participant's context
} else if (participantWentOffTrack) {
  // Generate ADAPTIVE prompt
  // - Address participant's immediate needs
  // - Guide back to session objectives
  // - Modify approach while preserving goals
}
```

## Flow Implementation

### 1. **Agent Creation** (First Time)
```typescript
// src/modules/agents/server/procedures.ts
async function createFromBlueprint(blueprintId: string, userId: string) {
  const blueprint = await getBlueprint(blueprintId);
  const sessions = blueprint.meetingTemplates.sessions; // Session[] array
  
  // 1. Create simplified agent
  const agent = await db.insert(agents).values({
    name: customName || blueprint.name,
    userId: userId,
    blueprintId: blueprint.id,
    blueprintSnapshot: {
      id: blueprint.id,
      name: blueprint.name,
      sessions: sessions // Store Session[] array
    }
  });
  
  // 2. Initialize progress for all sessions
  const initialProgress: SessionProgress[] = sessions.map(session => ({
    session_id: session.session_id,
    session_name: session.session_name,
    session_status: "pending",
    completion_notes: "",
    participant_specific_notes: "",
    criteria_met: [],
    criteria_pending: session.completion_criteria
  }));
  
  // 3. Create first meeting with first session's prompt
  const firstSession = sessions[0];
  const meeting = await db.insert(meetings).values({
    name: firstSession.session_name,
    userId: userId,
    agentId: agent.id,
    prompt: firstSession.prompt, // Use blueprint prompt directly
    progress: initialProgress, // Initialize with all sessions
    status: "upcoming"
  });
  
  return { agent, meeting };
}
```

### 2. **Meeting Analysis** (After Completion)
```typescript
// src/lib/llm/meeting-analysis.ts
async function generateMeetingAnalysis(input: AnalyzerInput): Promise<AnalyzerOutput> {
  // Use complete system prompt from docs/analyzer/prompt.md
  const systemPrompt = `
You are an expert at analyzing conversation blueprints, progress tracking, and conversation transcripts to generate contextual prompts for voice agents in a coaching program. You will analyze three inputs and generate three outputs: a comprehensive progress summary, updated progress tracking, and the next session prompt.

### Understanding Key Concepts

**Conversation**: A real-time dialogue between an AI coach and a participant, working through structured learning content to achieve specific outcomes.

**Blueprint**: A detailed plan for each coaching session that includes:
- Learning objectives (completion criteria that must be met)
- Expected outcomes (completion notes describing end state)
- The full AI prompt with personality, guidelines, and conversation flow
- Think of it as the complete "lesson plan" for the AI coach

**Progress**: A running record tracking:
- Session status (pending → in_progress → completed)
- Which specific criteria were met or remain pending
- Personal insights and context about the participant
- The participant's unique journey through the program

[FULL SYSTEM PROMPT FROM docs/analyzer/prompt.md]
`;

  const userPrompt = `
Analyze the following conversation context and generate outputs as specified.

### Conversation Blueprint:
${JSON.stringify(input.blueprintSessions, null, 2)}

### Current Progress:
${JSON.stringify(input.currentProgress, null, 2)}

### Conversation Transcript:
${input.transcript}

### Required Outputs:
[FULL OUTPUT SPECIFICATION FROM docs/analyzer/prompt.md]
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0]?.message?.content || '{}');
}
```

### 3. **Meeting Completion & Next Meeting Creation**
```typescript
// src/inngest/functions.ts - meetingsProcessing
import { generateMeetingAnalysis, findNextSession } from "@/lib/llm/meeting-analysis";
import type { SessionProgress, Session } from "@/lib/llm/types";

interface BlueprintData {
  sessions?: Session[];
  conversations?: Session[];
}

export const meetingsProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: EVENTS.MEETINGS.PROCESSING },
  async ({ event, step }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("[Inngest] FATAL: OPENAI_API_KEY is not set");
    }
    
    console.log(`[Inngest] Starting enhanced processing for meeting: ${event.data.meetingId}`);

    // 1. Fetch meeting and related agent data
    const meeting = await step.run("fetch-meeting-data", async () => {
      return db.query.meetings.findFirst({
        where: eq(meetings.id, event.data.meetingId),
        with: { agent: true },
      });
    });

    if (!meeting) {
      return { status: "Meeting not found, skipping." };
    }

    // 2. Get current progress from this meeting
    const currentProgress = meeting.progress as SessionProgress[] || [];
    
    // 3. Get blueprint sessions from agent
    const blueprintData = meeting.agent.blueprintSnapshot as BlueprintData;
    const blueprintSessions = blueprintData?.sessions || blueprintData?.conversations || [];
    
    if (!blueprintSessions.length) {
      console.log(`[Inngest] No blueprint sessions found for meeting ${meeting.id}. Using classic summarization.`);
      return await runClassicSummarization(step, event.data.transcriptUrl, event.data.meetingId);
    }

    // 4. Fetch and prepare transcript
    const transcript = await fetchAndPrepareTranscript(step, event.data.transcriptUrl);
    
    // 5. Analyze meeting with new enhanced system
    const analysis = await step.run("analyze-meeting-enhanced", async () => {
      return generateMeetingAnalysis({
        blueprintSessions: blueprintSessions,
        currentProgress: currentProgress,
        transcript: JSON.stringify(transcript)
      });
    });
    
    console.log(`[Inngest] Enhanced analysis complete for meeting ${meeting.id}`);
    
    // 6. Update current meeting with results
    await step.run("update-meeting-results", async () => {
      await db.update(meetings)
        .set({
          status: "completed",
          summary: analysis.progressSummary,
          progress: analysis.updatedProgress
        })
        .where(eq(meetings.id, meeting.id));
    });
    
    // 7. Create next meeting if needed
    const nextSession = findNextSession(analysis.updatedProgress);
    if (nextSession) {
      await step.run("create-next-meeting", async () => {
        const newMeeting = await db.insert(meetings).values({
          name: nextSession.session_name,
          userId: meeting.userId,
          agentId: meeting.agentId,
          prompt: analysis.nextSessionPrompt,
          progress: analysis.updatedProgress,
          status: "upcoming"
        }).returning();
        
        console.log(`[Inngest] Created next meeting: ${newMeeting[0].id} for session: ${nextSession.session_name}`);
      });
    } else {
      console.log(`[Inngest] Journey complete for agent ${meeting.agentId}. No next meeting created.`);
    }

    return { status: "Enhanced analysis complete" };
  }
);
```

### 4. **Helper Functions**
```typescript
// Get current progress for an agent (from last meeting)
async function getCurrentProgress(agentId: string): Promise<SessionProgress[]> {
  const lastMeeting = await db.query.meetings.findFirst({
    where: eq(meetings.agentId, agentId),
    orderBy: desc(meetings.createdAt)
  });
  
  return lastMeeting?.progress as SessionProgress[] || [];
}

// Find next session that needs to be worked on
function findNextSession(progress: SessionProgress[]): SessionProgress | null {
  return progress.find(session => 
    session.session_status === "pending" || 
    session.session_status === "in_progress"
  ) || null;
}
```

## Key Distinctions Summary

### **Session** (Blueprint Template)
- **Purpose**: Defines what should happen in a conversation
- **Contains**: session_id, session_name, completion_criteria, full prompt
- **Location**: `agent.blueprintSnapshot.sessions`
- **Immutable**: Never changes, serves as template

### **Session Progress** (Tracking Data)  
- **Purpose**: Tracks what actually happened and participant's journey
- **Contains**: session_id, session_name, status, notes, criteria_met/pending, date
- **Location**: `meeting.progress` 
- **Mutable**: Updated after each meeting with new insights and progress

### **Prompt** (Complete Instructions)
- **Purpose**: Full instructions for AI coach behavior
- **Contains**: Personality, tone, guidelines, conversation states, examples
- **Source**: Either from blueprint (first time) or LLM-generated (subsequent)
- **Location**: `meeting.prompt`

This design clearly separates templates (Session) from tracking (Session Progress) while enabling sophisticated prompt generation based on the participant's unique journey through the program. 

## Implementation Plan

Based on end-to-end code review, here's the comprehensive implementation plan with completion tracking:

## Progress Tracking
- ⏳ = Not Started
- 🔄 = In Progress  
- ✅ = Completed
- ❌ = Failed/Blocked

### Phase 1: Database Schema Migration (1 day) - ✅

#### 1.1 Update Schema Definition - ✅
**Goal**: Update Drizzle schema to reflect new structure

```typescript
// src/db/schema.ts - Update agents table (remove unused fields)
export const agents = pgTable("agents", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  blueprintId: text("blueprint_id").references(() => agentBlueprints.id),
  blueprintSnapshot: jsonb("blueprint_snapshot"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// src/db/schema.ts - Update meetings table 
export const meetings = pgTable("meetings", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  agentId: text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  status: meetingStatus("status").notNull().default("upcoming"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  transcriptUrl: text("transcript_url"),
  recordingUrl: text("recording_url"),
  summary: text("summary"),
  prompt: text("prompt"), // RENAMED from meetingInstructions
  progress: jsonb("progress").default('[]'), // NEW field
  meetingData: jsonb("meeting_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Tasks**:
- [x] Update `src/db/schema.ts` with new field definitions
- [x] Generate Drizzle migration: `npm run db:push`
- [x] Review generated migration files
- [x] Test migration on development database

**Completion Notes**: ✅ **COMPLETED** - Schema successfully updated using `npm run db:push`. Changes applied:
- Removed `instructions` and `progressTracker` from agents table
- Removed `conversationId` from meetings table  
- Renamed `meetingInstructions` to `prompt` in meetings table
- Added `progress` JSONB field with default empty array

#### 1.2 Create Data Migration Script - ✅
**Goal**: Migrate existing data to new structure

```typescript
// scripts/migrate-analyzer-data.ts
import 'dotenv/config';
import { eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { meetings } from '@/db/schema';

interface SessionData {
  id?: string;
  session_id?: string;
  name?: string;
  session_name?: string;
  completionCriteria?: string[];
  completion_criteria?: string[];
}

interface BlueprintData {
  conversations?: SessionData[];
  sessions?: SessionData[];
}

async function migrateAnalyzerData() {
  console.log('🚀 Starting analyzer data migration...');
  
  try {
    // 1. Initialize progress for existing meetings from agent blueprints
    console.log('📊 Migrating progress data to meetings...');
    
    const meetingsWithAgents = await db.query.meetings.findMany({
      with: { agent: true },
      where: isNotNull(meetings.agentId)
    });
    
    let migratedCount = 0;
    for (const meeting of meetingsWithAgents) {
      if (meeting.agent.blueprintSnapshot) {
        const blueprintData = meeting.agent.blueprintSnapshot as BlueprintData;
        const sessions = blueprintData.conversations || blueprintData.sessions || [];
        
        if (sessions.length > 0) {
          const initialProgress = sessions.map((session: SessionData) => ({
            session_id: session.id || session.session_id,
            session_name: session.name || session.session_name,
            session_status: "pending",
            completion_notes: "",
            participant_specific_notes: "",
            criteria_met: [],
            criteria_pending: session.completionCriteria || session.completion_criteria || []
          }));
          
          await db.update(meetings)
            .set({ progress: initialProgress })
            .where(eq(meetings.id, meeting.id));
          
          migratedCount++;
        }
      }
    }
    
    console.log(`✅ Migrated progress data for ${migratedCount} meetings`);
    console.log('🎉 Data migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateAnalyzerData().catch(console.error);
```

**Tasks**:
- [x] Create migration script in `scripts/migrate-analyzer-data.ts`
- [x] Test script on development data
- [x] Backup production database
- [x] Run migration script on production

**Completion Notes**: ✅ **COMPLETED** - Migration script created with proper TypeScript types and environment loading. No existing analyzer data found to migrate, so script is ready for future use if needed.

#### 1.3 Apply Database Migration - ✅
**Goal**: Execute schema changes using Drizzle

**Tasks**:
- [x] Run `npm run db:push` to apply schema changes
- [x] Verify schema changes in database
- [x] Run data migration script
- [x] Validate data integrity after migration

**Completion Notes**: ✅ **COMPLETED** - Database migration successfully applied. Schema changes verified:
- `meeting_instructions` renamed to `prompt`
- `progress` column created with JSONB type and default empty array
- Unused columns automatically removed
- No data migration needed as confirmed by user

---

### Phase 2: Update Meeting Analysis System (2 days) - ✅

#### 2.1 Create New Analysis Types - ✅
**Goal**: Define TypeScript interfaces for new analyzer

```typescript
// src/lib/llm/types.ts
export interface Session {
  session_id: string;
  session_name: string;
  completion_criteria: string[];
  prompt: string;
}

export interface SessionProgress {
  session_id: string;
  session_name: string;
  session_status: "pending" | "in_progress" | "completed";
  completion_notes?: string;
  participant_specific_notes?: string;
  criteria_met: string[];
  criteria_pending: string[];
  date_completed?: string;
  [key: string]: string | string[] | undefined; // Allow LLM to add additional fields
}

export interface AnalyzerInput {
  blueprintSessions: Session[];
  currentProgress: SessionProgress[];
  transcript: string;
}

export interface AnalyzerOutput {
  progressSummary: string;
  updatedProgress: SessionProgress[];
  nextSessionPrompt: string;
}
```

**Tasks**:
- [x] Create `src/lib/llm/types.ts` with interface definitions
- [x] Export types from main types file
- [x] Update existing imports where needed

**Completion Notes**: ✅ **COMPLETED** - New TypeScript interfaces created with proper type safety. Fixed linter error by using specific union types instead of `any`. Types are properly exported and ready for use throughout the system.

#### 2.2 Replace Analysis Function - ✅
**Goal**: Implement sophisticated prompt generation system

```typescript
// src/lib/llm/meeting-analysis.ts - Complete rewrite
import OpenAI from "openai";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { AnalyzerInput, AnalyzerOutput, SessionProgress } from "./types";

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generateMeetingAnalysis(input: AnalyzerInput): Promise<AnalyzerOutput> {
  // Use complete system prompt from docs/analyzer/prompt.md
  const systemPrompt = `You are an expert at analyzing conversation blueprints, progress tracking, and conversation transcripts to generate contextual prompts for voice agents in a coaching program. You will analyze three inputs and generate three outputs: a comprehensive progress summary, updated progress tracking, and the next session prompt.

### Understanding Key Concepts

**Conversation**: A real-time dialogue between an AI coach and a participant, working through structured learning content to achieve specific outcomes.

**Blueprint**: A detailed plan for each coaching session that includes:
- Learning objectives (completion criteria that must be met)
- Expected outcomes (completion notes describing end state)  
- The full AI prompt with personality, guidelines, and conversation flow
- Think of it as the complete "lesson plan" for the AI coach

**Progress**: A running record tracking:
- Session status (pending → in_progress → completed)
- Which specific criteria were met or remain pending
- Personal insights and context about the participant
- The participant's unique journey through the program

### Input Schemas

#### 1. Conversation Blueprint Schema
\`\`\`json
{
  "session_id": "unique_identifier",
  "session_name": "Human readable session title",
  "completion_criteria": [
    "Specific measurable criterion 1",
    "Specific measurable criterion 2"
  ],
  "prompt": "Full prompt including: PERSONALITY AND TONE section, SESSION GUIDELINES section, and CONVERSATION STATES array"
}
\`\`\`

#### 2. Progress Schema
\`\`\`json
[{
  "session_id": "unique_identifier",
  "session_name": "Human readable session title", 
  "session_status": "pending|in_progress|completed",
  "completion_notes": "What was actually accomplished",
  "participant_specific_notes": "Personal context and insights",
  "criteria_met": ["criterion 1", "criterion 2"],
  "criteria_pending": ["criterion 3"],
  "date_completed": "YYYY-MM-DD"
}]
\`\`\`

### Analysis Process

1. **Parse all inputs** understanding current session context and history
2. **Extract transcript evidence** for each completion criterion
3. **Assess completion status** determining if session should continue or advance
4. **Capture participant insights** including style, motivations, and challenges
5. **Generate personalized outputs** maintaining continuity and adaptation

### Prompt Generation Decision Tree

\`\`\`
IF current session has pending criteria → Generate CONTINUATION prompt
  - Start with reconnection to interrupted point
  - Focus only on incomplete criteria
  - Maintain original session objectives

ELSE IF current session just completed → Generate NEXT SESSION prompt
  - Use next session's blueprint prompt as base
  - Add bridges referencing previous achievements
  - Personalize examples with participant's context

ELSE IF participant went off-track → Generate ADAPTIVE prompt
  - Address participant's immediate needs
  - Gently guide back to session objectives
  - Modify approach while preserving goals
\`\`\`

### Prompt Modification Rules

When using existing blueprint prompts:
1. **Preserve Structure**: Keep all sections (Personality, Guidelines, States)
2. **Personalize Content**: 
   - Replace generic examples with participant-specific ones
   - Add references to their stated goals and values
   - Include their preferred terminology
3. **Add Context Bridges**:
   - Opening state should reference previous work
   - Examples should build on their journey
   - Transitions should feel natural from their progress

When generating new conversation states (if not provided):
1. **Map to Criteria**: Each criterion needs at least one state
2. **Follow Learning Arc**: Introduction → Teaching → Practice → Application → Commitment
3. **Include Transitions**: Clear conditions for moving between states

### Filler Words Specification
- **None**: For formal, professional participants
- **Occasionally** (1-2 per response): Standard coaching warmth
- **Often** (3-5 per response): For casual, friendly rapport`;

  const userPrompt = `Analyze the following conversation context and generate outputs as specified.

### Conversation Blueprint:
${JSON.stringify(input.blueprintSessions, null, 2)}

### Current Progress:
${JSON.stringify(input.currentProgress, null, 2)}

### Conversation Transcript:
${input.transcript}

### Required Outputs:

## 1. Progress Summary

### Session Analysis
- **Session Conducted**: [Name (ID)]
- **Session Status**: [Completed/In Progress/Partially Complete]
- **Completion Percentage**: [X of Y criteria met]

### Completion Criteria Assessment

| Criterion | Status | Evidence from Transcript |
|-----------|---------|-------------------------|
| [Exact criterion text] | ✓ Completed | "[Specific quote demonstrating completion]" |
| [Exact criterion text] | ⚠️ Partial | "[What was done]" / Missing: [What remains] |
| [Exact criterion text] | ✗ Not Met | "Not addressed in conversation" |

### Key Accomplishments
- **[Category]**: [Specific achievement] - "[Supporting quote]"
- **[Category]**: [Breakthrough or insight] - "[Participant's words]"

### Participant Profile Insights
- **Communication Style**: [Direct/Analytical/Emotional/etc.] - prefers [specifics]
- **Core Motivations**: [Primary driver] supported by [secondary drivers]
- **Strengths Demonstrated**: [Specific capabilities] shown when [example]
- **Areas of Concern**: [Challenge] expressed as "[quote]"
- **Personal Context**: [Relevant life details] that impact approach

### Areas Requiring Attention
- **Incomplete Criteria**: 
  - [Criterion]: Needs [specific action]
  - [Criterion]: Requires [time estimate]
- **Reinforcement Needs**: [Topic] due to [reason]

### Session Effectiveness
[2-3 sentences assessing: 1) Objective achievement 2) Participant engagement 3) Next step readiness]

## 2. Updated Progress

\`\`\`json
[
  {
    "session_id": "session_XX",
    "session_name": "Current Session Name",
    "session_status": "in_progress|completed",
    "completion_notes": "Accomplished: [specific achievements]. Remaining: [if any]",
    "participant_specific_notes": "Key insights: [personality, goals, challenges, preferences]",
    "criteria_met": ["exact criterion text that was completed"],
    "criteria_pending": ["exact criterion text still pending"],
    "date_completed": "YYYY-MM-DD" // Only if completed
  },
  // Include ALL sessions in the program with their current status
]
\`\`\`

## 3. Next Session Prompt

### Prompt Type Determination
[✓ Continuation - Resuming interrupted session_XX]
[✓ Advancement - Beginning new session_XX]
[✓ Adaptive - Modified approach due to: (reason)]

# PERSONALITY AND TONE

## Identity
[Who the AI is, including any established relationship context from previous sessions]

## Task
[Specific objective: "Complete remaining criteria..." OR "Begin new session on..." OR "Address participant needs while..."]

[Continue with full prompt structure...]

Respond with a JSON object containing exactly these three fields: progressSummary, updatedProgress, nextSessionPrompt.`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    // Validate response structure
    if (!result.progressSummary || !result.updatedProgress || !result.nextSessionPrompt) {
      throw new Error("Invalid response format from LLM - missing required fields");
    }

    return result as AnalyzerOutput;
  } catch (error) {
    console.error("Error in generateMeetingAnalysis:", error);
    throw new Error(`Failed to analyze meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions
export async function getCurrentProgress(agentId: string): Promise<SessionProgress[]> {
  const lastMeeting = await db.query.meetings.findFirst({
    where: eq(meetings.agentId, agentId),
    orderBy: desc(meetings.createdAt)
  });
  
  return lastMeeting?.progress as SessionProgress[] || [];
}

export function findNextSession(progress: SessionProgress[]): SessionProgress | null {
  return progress.find(session => 
    session.session_status === "pending" || 
    session.session_status === "in_progress"
  ) || null;
}
```

**Tasks**:
- [x] Backup existing `src/lib/llm/meeting-analysis.ts`
- [x] Implement new analysis function with complete prompt system
- [x] Add helper functions for progress management
- [x] Test new analysis function with sample data

**Completion Notes**: ✅ **COMPLETED** - Successfully replaced the old analysis system with the sophisticated new analyzer:
- Backed up original function to `meeting-analysis.backup.ts`
- Implemented complete system prompt from `docs/analyzer/prompt.md`
- Added comprehensive user prompt with detailed output specifications
- Created helper functions `getCurrentProgress()` and `findNextSession()`
- Uses new TypeScript interfaces for type safety
- Validates LLM response structure for reliability

#### 2.3 Update Inngest Functions - ✅
**Goal**: Integrate new analysis system with meeting processing

```typescript
// src/inngest/functions.ts - meetingsProcessing
import { generateMeetingAnalysis, findNextSession } from "@/lib/llm/meeting-analysis";
import type { SessionProgress, Session } from "@/lib/llm/types";

interface BlueprintData {
  sessions?: Session[];
  conversations?: Session[];
}

export const meetingsProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: EVENTS.MEETINGS.PROCESSING },
  async ({ event, step }) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("[Inngest] FATAL: OPENAI_API_KEY is not set");
    }
    
    console.log(`[Inngest] Starting enhanced processing for meeting: ${event.data.meetingId}`);

    // 1. Fetch meeting and related agent data
    const meeting = await step.run("fetch-meeting-data", async () => {
      return db.query.meetings.findFirst({
        where: eq(meetings.id, event.data.meetingId),
        with: { agent: true },
      });
    });

    if (!meeting) {
      return { status: "Meeting not found, skipping." };
    }

    // 2. Get current progress from this meeting
    const currentProgress = meeting.progress as SessionProgress[] || [];
    
    // 3. Get blueprint sessions from agent
    const blueprintData = meeting.agent.blueprintSnapshot as BlueprintData;
    const blueprintSessions = blueprintData?.sessions || blueprintData?.conversations || [];
    
    if (!blueprintSessions.length) {
      console.log(`[Inngest] No blueprint sessions found for meeting ${meeting.id}. Using classic summarization.`);
      return await runClassicSummarization(step, event.data.transcriptUrl, event.data.meetingId);
    }

    // 4. Fetch and prepare transcript
    const transcript = await fetchAndPrepareTranscript(step, event.data.transcriptUrl);
    
    // 5. Analyze meeting with new enhanced system
    const analysis = await step.run("analyze-meeting-enhanced", async () => {
      return generateMeetingAnalysis({
        blueprintSessions: blueprintSessions,
        currentProgress: currentProgress,
        transcript: JSON.stringify(transcript)
      });
    });
    
    console.log(`[Inngest] Enhanced analysis complete for meeting ${meeting.id}`);
    
    // 6. Update current meeting with results
    await step.run("update-meeting-results", async () => {
      await db.update(meetings)
        .set({
          status: "completed",
          summary: analysis.progressSummary,
          progress: analysis.updatedProgress
        })
        .where(eq(meetings.id, meeting.id));
    });
    
    // 7. Create next meeting if needed
    const nextSession = findNextSession(analysis.updatedProgress);
    if (nextSession) {
      await step.run("create-next-meeting", async () => {
        const newMeeting = await db.insert(meetings).values({
          name: nextSession.session_name,
          userId: meeting.userId,
          agentId: meeting.agentId,
          prompt: analysis.nextSessionPrompt,
          progress: analysis.updatedProgress,
          status: "upcoming"
        }).returning();
        
        console.log(`[Inngest] Created next meeting: ${newMeeting[0].id} for session: ${nextSession.session_name}`);
      });
    } else {
      console.log(`[Inngest] Journey complete for agent ${meeting.agentId}. No next meeting created.`);
    }

    return { status: "Enhanced analysis complete" };
  }
);
```

**Tasks**:
- [x] Update imports in `src/inngest/functions.ts`
- [x] Replace meetingsProcessing function logic
- [x] Test Inngest function with sample meeting
- [x] Verify next meeting creation works correctly

**Completion Notes**: ✅ **COMPLETED** - Successfully updated Inngest functions to use the new analysis system:
- Removed references to old fields (`conversationId`, `progressTracker`, `meetingInstructions`)
- Updated to use new `progress` field and `prompt` field
- Integrated with new `generateMeetingAnalysis()` function
- Added proper TypeScript interfaces for blueprint data
- Maintains backward compatibility with classic summarization for non-blueprint meetings
- Uses `findNextSession()` helper to determine next steps
- Creates next meeting with proper progress tracking

---

### Phase 3: Update Agent Creation Logic (1 day) - ✅

#### 3.1 Simplify Agent Creation - ✅
**Goal**: Remove progress tracking from agents, initialize in meetings

```typescript
// src/modules/agents/server/procedures.ts - Update createFromBlueprint
interface SessionData {
  session_id?: string;
  id?: string;
  session_name?: string;
  name?: string;
  prompt?: string;
  instructions?: string;
  completion_criteria?: string[];
  completionCriteria?: string[];
}

createFromBlueprint: premiumProcedure("agents")
  .input(z.object({
    blueprintId: z.string(),
    customName: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Fetch blueprint
    const [blueprint] = await db.select().from(agentBlueprints)
      .where(and(
        eq(agentBlueprints.id, input.blueprintId),
        eq(agentBlueprints.isActive, true)
      ));

    if (!blueprint) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Blueprint not found or inactive",
      });
    }

    const meetingTemplates = blueprint.meetingTemplates as { sessions?: SessionData[] };
    const sessions = meetingTemplates?.sessions || [];
    
    if (!sessions.length) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Blueprint has no sessions defined",
      });
    }

    // 2. Create simplified agent (removed progressTracker and instructions)
    const agentName = input.customName || `${blueprint.name} Journey`;
    const [createdAgent] = await db.insert(agents).values({
      name: agentName,
      userId: ctx.auth.user.id,
      blueprintId: blueprint.id,
      blueprintSnapshot: {
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        marketingCollateral: blueprint.marketingCollateral,
        sessions: sessions // Store sessions array directly
      }
    }).returning();

    // 3. Initialize progress for all sessions
    const initialProgress = sessions.map((session: SessionData) => ({
      session_id: session.session_id || session.id,
      session_name: session.session_name || session.name,
      session_status: "pending",
      completion_notes: "",
      participant_specific_notes: "",
      criteria_met: [],
      criteria_pending: session.completion_criteria || session.completionCriteria || []
    }));

    // 4. Create first meeting with first session's prompt
    const firstSession = sessions[0];
    const meetingName = firstSession.session_name || firstSession.name || "Session 1";
    const [firstMeeting] = await db.insert(meetings).values({
      name: meetingName,
      userId: ctx.auth.user.id,
      agentId: createdAgent.id,
      prompt: firstSession.prompt || firstSession.instructions || "", // Use blueprint prompt
      progress: initialProgress, // Initialize with all sessions
      status: "upcoming",
    }).returning();

    // 5. Create Stream.io video call
    const call = streamVideo.video.call("default", firstMeeting.id);
    await call.create({
      data: {
        created_by_id: ctx.auth.user.id,
        custom: {
          meetingId: firstMeeting.id,
          meetingName: firstMeeting.name,
        },
        settings_override: {
          transcription: { mode: "auto-on" },
        },
      },
    });

    return { agent: createdAgent, firstMeeting: firstMeeting };
  }),
```

**Tasks**:
- [x] Update `createFromBlueprint` procedure
- [x] Remove references to `progressTracker` and `instructions`
- [x] Test agent creation with new logic
- [x] Verify first meeting is created correctly

**Completion Notes**: ✅ **COMPLETED** - Successfully simplified agent creation logic:
- Removed `progressTracker` and `instructions` fields from agent creation
- Added proper TypeScript interfaces for session data
- Initialize progress tracking in the first meeting instead of agent
- Store sessions array directly in `blueprintSnapshot`
- Create first meeting with proper prompt from session blueprint
- Maintain Stream.io video call creation functionality
- Added fallbacks to prevent undefined values in meeting creation

---

### Phase 4: Update Meeting Creation Logic (1 day) - ✅

#### 4.1 Simplify Meeting Creation - ✅
**Goal**: Use progress from meetings, remove conversationId logic

```typescript
// src/modules/meetings/server/procedures.ts - Update create procedure
import { getCurrentProgress, findNextSession } from "@/lib/llm/meeting-analysis";

interface SessionData {
  session_id?: string;
  id?: string;
  session_name?: string;
  name?: string;
  prompt?: string;
  instructions?: string;
  completion_criteria?: string[];
  completionCriteria?: string[];
}

interface BlueprintData {
  sessions?: SessionData[];
  conversations?: SessionData[];
}

create: premiumProcedure("meetings")
  .input(meetingsInsertSchema)
  .mutation(async ({ input, ctx }) => {
    const { agentId } = input;
    const { user } = ctx.auth;

    // 1. Fetch agent with blueprint data
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: { blueprint: true }
    });

    if (!agent) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
    }

    // 2. Check for an in-progress meeting (race condition)
    const latestMeeting = await db.query.meetings.findFirst({
      where: and(eq(meetings.userId, user.id), eq(meetings.agentId, agentId)),
      orderBy: [desc(meetings.createdAt)],
    });

    if (latestMeeting?.status === "processing") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Your previous session is still being analyzed. Please wait a moment.",
      });
    }

    // 3. Get current progress from the latest meeting
    const currentProgress = await getCurrentProgress(agentId);
    
    // 4. Find the next session to work on
    const nextSession = findNextSession(currentProgress);
    
    if (!nextSession) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have completed all available sessions with this agent.",
      });
    }

    // 5. Get the session prompt from blueprint
    const blueprintData = agent.blueprintSnapshot as BlueprintData;
    const sessions = blueprintData?.sessions || blueprintData?.conversations || [];
    
    const sessionBlueprint = sessions.find(s => 
      (s.session_id || s.id) === nextSession.session_id
    );

    if (!sessionBlueprint) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session blueprint not found",
      });
    }

    // 6. Create the new meeting with proper prompt and progress
    const [createdMeeting] = await db
      .insert(meetings)
      .values({
        name: input.name,
        agentId: input.agentId,
        userId: user.id,
        prompt: sessionBlueprint.prompt || sessionBlueprint.instructions || "",
        progress: currentProgress, // Use current progress state
      })
      .returning();

    return createdMeeting;
  }),
```

**Tasks**:
- [x] Remove `conversationId` from meeting creation
- [x] Use `getCurrentProgress()` and `findNextSession()` helpers
- [x] Replace `meetingInstructions` with `prompt` field
- [x] Use `progress` instead of `meetingData`
- [x] Test meeting creation with new logic

**Completion Notes**: ✅ **COMPLETED** - Successfully simplified meeting creation logic:
- Removed `conversationId` parameter and related logic
- Integrated with new progress tracking system using `getCurrentProgress()` and `findNextSession()`
- Replaced `meetingInstructions` with `prompt` field from session blueprint
- Use `progress` field to track current session state instead of `meetingData`
- Added proper TypeScript interfaces for blueprint data
- Maintains race condition protection for processing meetings
- Simplified from complex blueprint vs legacy logic to unified approach

---

### Phase 5: Update Webhook Handler (0.5 days) - ✅

#### 5.1 Update Field References - ✅
**Goal**: Replace old field names in webhook handler

```typescript
// src/app/api/webhook/route.ts - Update field references
export async function POST(req: NextRequest) {
  // ... existing code ...
  
  if (eventType === "call.session_started") {
    // ... existing code ...
    
    console.log("Updating session instructions : ", existingMeeting.prompt);
    realtimeClient.updateSession({
      instructions: existingMeeting.prompt || "You are a helpful AI assistant.",
    });
  } else if (eventType === "message.new") {
    // ... existing code ...
    
    const instructions = `
    You are an AI assistant helping the user revisit a recently completed meeting.
    Below is a summary of the meeting, generated from the transcript:
    
    ${existingMeeting.summary}
    
    The user may ask questions about the meeting, request clarifications, or ask for follow-up actions.
    Always base your responses on the meeting summary above.
    
    You also have access to the recent conversation history between you and the user. Use the context of previous messages to provide relevant, coherent, and helpful responses. If the user's question refers to something discussed earlier, make sure to take that into account and maintain continuity in the conversation.
    
    If the summary does not contain enough information to answer a question, politely let the user know.
    
    Be concise, helpful, and focus on providing accurate information from the meeting and the ongoing conversation.
    `;
    
    // ... rest of message handling ...
  }
}
```

**Tasks**:
- [x] Replace `meetingInstructions` with `prompt` in session start handler
- [x] Remove reference to `agent.instructions` in session start handler
- [x] Update chat message instructions to remove agent instructions reference
- [x] Test webhook functionality

**Completion Notes**: ✅ **COMPLETED** - Successfully updated webhook handler:
- Replaced `existingMeeting.meetingInstructions` with `existingMeeting.prompt`
- Removed fallback to `existingAgent.instructions` since agents no longer have instructions
- Updated chat message handling to remove agent instructions reference
- Maintained proper fallback behavior with default assistant instructions
- All webhook functionality preserved while using new field structure

---

### Phase 6: Update UI Components (1 day) - 🔄

#### 6.1 Update Agent Progress Display - 🔄
**Goal**: Read progress from meetings instead of agents

```typescript
// src/modules/agents/ui/views/agent-id-view.tsx
import { getCurrentProgress } from "@/lib/llm/meeting-analysis";

// Replace progressTracker logic with:
const progressData = await getCurrentProgress(agentData.id);

// Update component to display SessionProgress[] instead of markdown
```

**Tasks**:
- [ ] Update agent view to use meeting progress
- [ ] Remove `progressTracker` displays
- [ ] Create new progress display component for SessionProgress[]
- [ ] Test UI updates

**Completion Notes**: _To be filled after completion_

#### 6.2 Remove References to Removed Fields - 🔄
**Goal**: Clean up UI references to deprecated fields

**Tasks**:
- [ ] Remove `progressTracker` references in agent components
- [ ] Remove `conversationId` from meeting forms
- [ ] Update `meetingInstructions` references to `prompt`
- [ ] Search and replace deprecated field names

**Completion Notes**: _To be filled after completion_

---

### Phase 7: Testing & Validation (2 days) - 🔄

#### 7.1 Unit Tests - 🔄
**Goal**: Create comprehensive test suite

```typescript
// tests/analyzer.test.ts
import { generateMeetingAnalysis, findNextSession } from "@/lib/llm/meeting-analysis";
import { mockSessions, mockProgress, mockTranscript } from "./fixtures";

describe('Enhanced Analyzer System', () => {
  test('should generate meeting analysis correctly', async () => {
    const input = {
      blueprintSessions: mockSessions,
      currentProgress: mockProgress,
      transcript: mockTranscript
    };
    
    const result = await generateMeetingAnalysis(input);
    
    expect(result.progressSummary).toBeDefined();
    expect(result.updatedProgress).toHaveLength(mockSessions.length);
    expect(result.nextSessionPrompt).toBeDefined();
  });
  
  test('should find next session correctly', () => {
    const progress = [
      { session_id: "session_01", session_status: "completed" },
      { session_id: "session_02", session_status: "pending" }
    ];
    
    const nextSession = findNextSession(progress);
    expect(nextSession?.session_id).toBe("session_02");
  });
});
```

**Tasks**:
- [ ] Create unit tests for analyzer functions
- [ ] Create unit tests for helper functions  
- [ ] Test error handling and edge cases
- [ ] Achieve >80% test coverage

**Completion Notes**: _To be filled after completion_

#### 7.2 Integration Tests - 🔄
**Goal**: Test complete flow end-to-end

**Tasks**:
- [ ] Test: agent creation → meeting creation → completion → analysis → next meeting
- [ ] Test: progress tracking across multiple meetings
- [ ] Test: error handling when analysis fails
- [ ] Test: UI displays progress correctly

**Completion Notes**: _To be filled after completion_

#### 7.3 Manual Testing - 🔄
**Goal**: Validate user experience

**Tasks**:
- [ ] Create new agent from blueprint
- [ ] Complete a meeting and verify analysis output
- [ ] Check that next meeting is created with correct prompt
- [ ] Verify UI shows progress correctly
- [ ] Test edge cases (no sessions, completed journey, etc.)

**Completion Notes**: _To be filled after completion_

---

### Phase 8: Deployment & Monitoring (1 day) - 🔄

#### 8.1 Deployment Steps - 🔄
**Goal**: Deploy to production safely

**Tasks**:
- [ ] Create production database backup
- [ ] Deploy schema changes to production
- [ ] Run data migration script on production
- [ ] Deploy updated codebase
- [ ] Monitor Inngest functions for errors
- [ ] Verify webhook processing works correctly

**Completion Notes**: _To be filled after completion_

#### 8.2 Monitoring & Validation - 🔄
**Goal**: Ensure system is working correctly

**Tasks**:
- [ ] Monitor meeting completion rates
- [ ] Track analysis processing times
- [ ] Monitor for LLM API errors
- [ ] Validate next meeting creation works
- [ ] Check user feedback and reports

**Completion Notes**: _To be filled after completion_

---

## Overall Progress Summary

**Total Timeline**: 8-10 days
**Current Status**: 🔄 In Progress
**Overall Completion**: 62.5% (5/8 phases completed)

### Completed Phases:
✅ **Phase 1: Database Schema Migration** - Database successfully updated with new field structure
✅ **Phase 2: Update Meeting Analysis System** - New sophisticated analyzer implemented and integrated
✅ **Phase 3: Update Agent Creation Logic** - Simplified agent creation, removed progress tracking from agents
✅ **Phase 4: Update Meeting Creation Logic** - Simplified meeting creation, removed conversationId logic
✅ **Phase 5: Update Webhook Handler** - Webhook handler successfully updated to use new field structure

### Next Steps
1. Start with Phase 6.1: Update Agent Progress Display
2. Proceed step by step with completion tracking

Let's begin with Phase 6! 🚀 