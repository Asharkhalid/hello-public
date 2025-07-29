# Voice Agent Prompt Generation System - Implementation Plan

## Overview

This document outlines the implementation plan to bridge the gap between the current basic LLM analysis system and the sophisticated Voice Agent Prompt Generation System defined in `design_and_implementation_plan_v2.md` and `prompt.md`.

## Current State Analysis

### ✅ **Already Implemented (Production Ready)**
- Real-time transcript collection during meetings
- Stream.io integration with webhook processing
- Inngest functions for meeting processing
- OpenAI integration infrastructure
- Database tables for meetings, agents, and transcripts
- Blueprint system with agent snapshots

### ❌ **Missing Critical Components**
- Sophisticated LLM analysis system as specified in `prompt.md`
- Proper Session and SessionProgress TypeScript interfaces
- Database schema alignment (field names and structure)
- Dynamic prompt generation with conversation states
- Comprehensive progress tracking with criteria assessment

## Implementation Phases

### Phase 1: Database Schema Migration (Critical)

**Objective:** Align database schema with design specifications

**Files to Modify:**
- `src/db/schema.ts`
- New migration file: `src/db/migrations/0001_voice_agent_schema.sql`

**Changes Required:**

1. **Update Agents Table:**
```sql
-- Remove legacy fields
ALTER TABLE agents DROP COLUMN IF EXISTS instructions;
ALTER TABLE agents DROP COLUMN IF EXISTS progress_tracker;

-- Final agents table structure:
-- id, name, user_id, blueprint_id, blueprint_snapshot, created_at, updated_at
```

2. **Update Meetings Table:**
```sql
-- Rename field to match design
ALTER TABLE meetings RENAME COLUMN meeting_instructions TO prompt;

-- Add new progress tracking field
ALTER TABLE meetings ADD COLUMN progress JSONB DEFAULT '[]';

-- Remove conversation_id (replaced by session tracking in progress)
ALTER TABLE meetings DROP COLUMN IF EXISTS conversation_id;
```

3. **Update TypeScript Schema:**
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
  // ... existing fields ...
  prompt: text("prompt"), // RENAMED from meetingInstructions
  progress: jsonb("progress").default('[]'), // NEW - SessionProgress[] array
  // ... rest of fields ...
});
```

### Phase 2: TypeScript Interface Definitions

**Objective:** Create proper interfaces matching design specifications

**New File:** `src/lib/llm/types.ts`

```typescript
// Complete interface definitions from design document

export interface Session {
  session_id: string;           // e.g., "session_01", "session_02"
  session_name: string;         // e.g., "Building Unshakeable Faith"
  completion_criteria: string[]; // Array of specific measurable criteria
  prompt: string;               // Complete prompt with all sections
}

export interface SessionProgress {
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

export interface ConversationState {
  id: string;                // "1_understanding_subconscious"
  description: string;       // What this state accomplishes
  instructions: string[];    // Specific actions to take
  examples: string[];        // Example phrases/responses
  transitions: Transition[]; // When to move to next state
}

export interface Transition {
  next_step: string;         // Next state ID or "session_complete"
  condition: string;         // When to transition
}

export interface AnalyzerInput {
  blueprintSessions: Session[];
  currentProgress: SessionProgress[];
  transcript: string;
}

export interface AnalyzerOutput {
  progressSummary: string;      // Comprehensive progress analysis
  updatedProgress: SessionProgress[]; // Complete updated progress array
  nextSessionPrompt: string;    // Full prompt with PERSONALITY, GUIDELINES, STATES
}
```

### Phase 3: Sophisticated LLM Analysis System

**Objective:** Replace basic analysis with comprehensive system from `prompt.md`

**File to Replace:** `src/lib/llm/meeting-analysis.ts`

**Implementation Approach:**

1. **System Prompt Integration:**
```typescript
// Load complete system prompt from prompt.md
const SYSTEM_PROMPT = `
You are an expert at analyzing conversation blueprints, progress tracking, and conversation transcripts to generate contextual prompts for voice agents in a coaching program...
[COMPLETE SYSTEM PROMPT FROM prompt.md]
`;
```

2. **Input Preparation:**
```typescript
export async function generateMeetingAnalysis(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const userPrompt = `
Analyze the following conversation context and generate outputs as specified.

### Conversation Blueprint:
${JSON.stringify(input.blueprintSessions, null, 2)}

### Current Progress:
${JSON.stringify(input.currentProgress, null, 2)}

### Conversation Transcript:
${input.transcript}

### Required Outputs:
[COMPLETE OUTPUT SPECIFICATION FROM prompt.md]
`;

  // OpenAI call with structured response parsing
}
```

3. **Output Processing:**
```typescript
// Parse sophisticated LLM response into structured format
// Handle progress summary with criteria tables
// Extract updated SessionProgress array
// Generate dynamic prompt with conversation states
```

### Phase 4: Blueprint Structure Update

**Objective:** Update blueprint data structure to use "sessions" terminology

**File to Modify:** `scripts/seed-blueprint.ts`

**Changes Required:**

1. **Update Blueprint Data Structure:**
```typescript
const BLUEPRINT_DATA = {
  marketingCollateral: { /* existing */ },
  sessions: [  // CHANGED from "conversations"
    {
      session_id: "session_01",      // CHANGED from "id"
      session_name: "Foundation of Success Thinking", // CHANGED from "name"
      completion_criteria: [         // CHANGED from "completionCriteria"
        "Written definite purpose statement created and refined with emotional intensity",
        // ... other criteria
      ],
      prompt: `PERSONALITY AND TONE

Identity: You are Dr. Success, an inspiring success coach...

SESSION GUIDELINES
- Guide participants through understanding...

CONVERSATION STATES
[
  {
    "id": "1_welcome_and_establish",
    "description": "Welcome participant and establish transformative journey",
    "instructions": ["Welcome warmly", "Explain transformation ahead"],
    "examples": ["Welcome to this incredible journey...", "Today we begin..."],
    "transitions": [{"next_step": "2_thoughts_become_things", "condition": "Participant acknowledges readiness"}]
  },
  // ... more conversation states
]`
    },
    // ... more sessions
  ]
};
```

2. **Update Agent Creation:**
```typescript
// Update to use new Session structure
const [newAgent] = await db.insert(schema.agents).values({
  name: agentName,
  userId: user.id,
  blueprintId: newBlueprint.id,
  blueprintSnapshot: {
    id: newBlueprint.id,
    name: newBlueprint.name,
    description: newBlueprint.description,
    marketingCollateral: BLUEPRINT_DATA.marketingCollateral,
    sessions: BLUEPRINT_DATA.sessions // CHANGED from conversations
  },
  // REMOVE progressTracker field
});
```

3. **Initialize Meeting with Progress:**
```typescript
// Initialize SessionProgress array for first meeting
const initialProgress: SessionProgress[] = BLUEPRINT_DATA.sessions.map(session => ({
  session_id: session.session_id,
  session_name: session.session_name,
  session_status: "pending",
  completion_notes: "",
  participant_specific_notes: "",
  criteria_met: [],
  criteria_pending: session.completion_criteria
}));

// Set first session as in_progress
initialProgress[0].session_status = "in_progress";

const [testMeeting] = await db.insert(schema.meetings).values({
  name: firstSession.session_name,
  userId: user.id,
  agentId: newAgent.id,
  prompt: firstSession.prompt, // CHANGED from meetingInstructions
  progress: initialProgress,   // NEW field
  status: "upcoming"
});
```

### Phase 5: Meeting Processing Integration

**Objective:** Update Inngest functions to use new analysis system

**File to Modify:** `src/inngest/functions.ts`

**Changes Required:**

1. **Update Processing Function:**
```typescript
import { generateMeetingAnalysis } from "@/lib/llm/meeting-analysis";
import type { Session, SessionProgress, AnalyzerInput } from "@/lib/llm/types";

export const meetingsProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: EVENTS.MEETINGS.PROCESSING },
  async ({ event, step }) => {
    // ... existing setup ...

    // CHANGED: Use new analysis system
    const analysisInput: AnalyzerInput = {
      blueprintSessions: meeting.agent.blueprintSnapshot.sessions, // CHANGED from conversations
      currentProgress: meeting.progress || [], // CHANGED from progressTracker
      transcript: fullTranscript
    };

    const analysis = await generateMeetingAnalysis(analysisInput);

    // Update meeting with new fields
    await db.update(meetings)
      .set({
        status: "completed",
        summary: analysis.progressSummary,
        progress: analysis.updatedProgress, // CHANGED: structured data vs markdown
        // REMOVE progressTracker field updates
      })
      .where(eq(meetings.id, meeting.id));

    // Create next meeting if needed
    const nextSession = findNextSession(analysis.updatedProgress, meeting.agent.blueprintSnapshot.sessions);
    if (nextSession) {
      await db.insert(meetings).values({
        name: nextSession.session_name,
        userId: meeting.userId,
        agentId: meeting.agentId,
        prompt: analysis.nextSessionPrompt, // CHANGED: dynamic prompt vs static
        progress: analysis.updatedProgress,
        status: "upcoming"
      });
    }
  }
);
```

2. **Add Session Finding Logic:**
```typescript
function findNextSession(progress: SessionProgress[], sessions: Session[]): Session | null {
  // Find first session that's not completed
  const nextProgressItem = progress.find(p => p.session_status !== "completed");
  if (!nextProgressItem) return null;
  
  return sessions.find(s => s.session_id === nextProgressItem.session_id) || null;
}
```

### Phase 6: Meeting Procedures Update

**Objective:** Update meeting-related procedures to use new schema

**Files to Modify:**
- `src/modules/meetings/server/procedures.ts`
- Any other files referencing old field names

**Changes Required:**

1. **Update Field References:**
```typescript
// CHANGE: meetingInstructions → prompt
// CHANGE: progressTracker → progress
// REMOVE: conversationId references
```

2. **Update Meeting Creation:**
```typescript
// Use new Session structure when creating meetings
// Initialize proper SessionProgress arrays
// Use dynamic prompt generation for personalized sessions
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Phase 1: Database schema migration
- [ ] Phase 2: TypeScript interface definitions
- [ ] Testing: Verify schema changes don't break existing functionality

### Week 2: Core System
- [ ] Phase 3: Sophisticated LLM analysis system
- [ ] Testing: Comprehensive testing of new analysis outputs
- [ ] Validation: Ensure prompt generation matches design specs

### Week 3: Integration
- [ ] Phase 4: Blueprint structure update
- [ ] Phase 5: Meeting processing integration
- [ ] Phase 6: Meeting procedures update

### Week 4: Testing & Validation
- [ ] End-to-end testing of complete system
- [ ] Performance testing with real transcripts
- [ ] User acceptance testing with sample coaching sessions

## Risk Mitigation

### Data Migration
- Create backup of current database before schema changes
- Implement rollback procedures for each migration step
- Test migrations on staging environment first

### Backward Compatibility
- Maintain support for existing agents during transition
- Gradual rollout with feature flags
- Monitoring for errors during transition period

### Testing Strategy
- Unit tests for each new interface and function
- Integration tests for complete analysis pipeline
- End-to-end tests with real coaching scenarios
- Performance tests with large transcripts
- Blueprint-based testing with Think and Grow Rich coach

## Success Criteria

### Functional Requirements
- [ ] Sophisticated LLM analysis matching design specifications
- [ ] Dynamic prompt generation with conversation states
- [ ] Comprehensive progress tracking with criteria assessment
- [ ] Participant profiling and personalization
- [ ] Seamless integration with existing meeting flow

### Performance Requirements
- [ ] Analysis completion within 30 seconds for typical transcripts
- [ ] No degradation in meeting processing pipeline
- [ ] Reliable error handling and recovery

### Quality Requirements
- [ ] Generated prompts match design document structure
- [ ] SessionProgress tracking is comprehensive and accurate
- [ ] Participant insights are relevant and actionable
- [ ] Next session recommendations are contextually appropriate

## Blueprint Testing Strategy

### Testing with Think and Grow Rich Coach Blueprint

To validate the sophisticated analysis system, we'll use the existing "Think and Grow Rich Success Coach" blueprint as our primary test case.

#### Test Scenarios

**Scenario 1: First Session Analysis**
```typescript
// Test Data Setup
const testBlueprint = {
  sessions: [
    {
      session_id: "session_01",
      session_name: "Foundation of Success Thinking",
      completion_criteria: [
        "Written definite purpose statement created and refined with emotional intensity",
        "Clear understanding demonstrated between wishing vs burning desire through examples",
        "Daily visualization and autosuggestion practice routine committed to and scheduled",
        "Personal obstacles identified and specific commitment strategies established",
        "Emotional connection to purpose clearly expressed and felt during session"
      ],
      prompt: `PERSONALITY AND TONE
Identity: You are Dr. Success, an inspiring success coach...
[FULL PROMPT FROM BLUEPRINT]`
    }
  ]
};

const initialProgress: SessionProgress[] = [{
  session_id: "session_01",
  session_name: "Foundation of Success Thinking",
  session_status: "in_progress",
  completion_notes: "",
  participant_specific_notes: "",
  criteria_met: [],
  criteria_pending: [/* all criteria */]
}];

const testTranscript = `
Dr. Success: Welcome to this transformational journey! Today we're going to establish your burning desire and definite purpose. Tell me, what's your biggest dream?

User: I want to start my own business, something in tech. I've always wanted to be my own boss and build something meaningful.

Dr. Success: That's wonderful! But I want you to dig deeper. When you say "own business" - what specifically drives that desire? What would that business actually accomplish?

User: Well, I guess I want financial freedom. I'm tired of living paycheck to paycheck. And I have this idea for an app that could help people manage their finances better.

Dr. Success: Now we're getting somewhere! So you want to create financial security for yourself while helping others achieve the same. That's powerful. Let's make this more specific and emotionally charged. If you had that financial freedom, what would that enable in your life?

User: I could finally travel with my family without worrying about money. My kids could go to better schools. I wouldn't have to stress about every bill that comes in.

Dr. Success: Beautiful! Feel that emotion - that's not just wanting, that's burning desire. Now, let's craft this into a definite purpose statement...
`;
```

**Expected Analysis Output:**
```json
{
  "progressSummary": {
    "sessionAnalysis": "Foundation of Success Thinking (session_01) - In Progress - 2 of 5 criteria met",
    "criteriaAssessment": [
      {
        "criterion": "Written definite purpose statement created and refined with emotional intensity",
        "status": "⚠️ Partial",
        "evidence": "User identified core desire for financial freedom and helping others, but statement not yet written and refined"
      },
      {
        "criterion": "Clear understanding demonstrated between wishing vs burning desire through examples", 
        "status": "✓ Completed",
        "evidence": "'That's not just wanting, that's burning desire' - participant demonstrated emotional connection"
      }
    ],
    "participantInsights": {
      "communicationStyle": "Reflective and thoughtful - responds well to deeper questioning",
      "coreMotivations": "Financial security and family wellbeing",
      "personalContext": "Currently living paycheck to paycheck with young children"
    }
  },
  "updatedProgress": [/* SessionProgress with updated criteria_met */],
  "nextSessionPrompt": "PERSONALITY AND TONE\n\nIdentity: You are Dr. Success, building on the powerful breakthrough we just had...\n\n[PERSONALIZED PROMPT CONTINUING THE SESSION]"
}
```

#### Test Cases by Implementation Phase

**Phase 1 Testing: Database Schema**
```typescript
// Test migration scripts
describe('Schema Migration', () => {
  test('agents table removes legacy fields', async () => {
    // Verify instructions and progress_tracker fields are removed
    // Verify blueprint_snapshot structure is preserved
  });
  
  test('meetings table updates correctly', async () => {
    // Verify meeting_instructions renamed to prompt
    // Verify progress JSONB field added with default []
    // Verify existing data is preserved
  });
});
```

**Phase 2 Testing: TypeScript Interfaces**
```typescript
// Test interface validation
describe('Interface Validation', () => {
  test('Session interface matches blueprint structure', () => {
    const session: Session = testBlueprint.sessions[0];
    expect(session.session_id).toBeDefined();
    expect(session.completion_criteria).toBeInstanceOf(Array);
    expect(session.prompt).toContain('PERSONALITY AND TONE');
  });
  
  test('SessionProgress tracks criteria correctly', () => {
    const progress: SessionProgress = {/* test data */};
    expect(progress.criteria_met).toBeInstanceOf(Array);
    expect(progress.criteria_pending).toBeInstanceOf(Array);
  });
});
```

**Phase 3 Testing: LLM Analysis System**
```typescript
// Test sophisticated analysis
describe('LLM Analysis System', () => {
  test('generates comprehensive progress summary', async () => {
    const input: AnalyzerInput = {
      blueprintSessions: testBlueprint.sessions,
      currentProgress: initialProgress,
      transcript: testTranscript
    };
    
    const result = await generateMeetingAnalysis(input);
    
    expect(result.progressSummary).toContain('Session Analysis');
    expect(result.progressSummary).toContain('Completion Criteria Assessment');
    expect(result.progressSummary).toContain('Participant Profile Insights');
  });
  
  test('updates progress with criteria assessment', async () => {
    const result = await generateMeetingAnalysis(input);
    const updatedSession = result.updatedProgress[0];
    
    expect(updatedSession.criteria_met).toContain('Clear understanding demonstrated between wishing vs burning desire');
    expect(updatedSession.participant_specific_notes).toContain('financial freedom');
  });
  
  test('generates personalized next session prompt', async () => {
    const result = await generateMeetingAnalysis(input);
    
    expect(result.nextSessionPrompt).toContain('PERSONALITY AND TONE');
    expect(result.nextSessionPrompt).toContain('SESSION GUIDELINES');
    expect(result.nextSessionPrompt).toContain('CONVERSATION STATES');
    expect(result.nextSessionPrompt).toContain('financial freedom'); // Personalization
  });
});
```

**End-to-End Blueprint Testing**
```typescript
// Test complete journey through multiple sessions
describe('Complete Blueprint Journey', () => {
  test('progresses through Think and Grow Rich sessions', async () => {
    // Session 1: Foundation of Success
    let meeting1 = await createMeeting(agent, 'session_01');
    let analysis1 = await processMeeting(meeting1, transcript1);
    
    // Verify progress tracking
    expect(analysis1.updatedProgress[0].session_status).toBe('completed');
    expect(analysis1.updatedProgress[1].session_status).toBe('in_progress');
    
    // Session 2: Building Unshakeable Faith  
    let meeting2 = await createMeeting(agent, 'session_02');
    meeting2.prompt = analysis1.nextSessionPrompt; // Use dynamic prompt
    let analysis2 = await processMeeting(meeting2, transcript2);
    
    // Verify personalization carries forward
    expect(meeting2.prompt).toContain('financial freedom app'); // From session 1
    expect(analysis2.updatedProgress[1].participant_specific_notes)
      .toContain('tech entrepreneur'); // Accumulated insights
  });
  
  test('handles session repetition when criteria not met', async () => {
    const incompleteTranscript = `
    Dr. Success: Let's work on your definite purpose...
    User: Yeah, I just want to make money somehow.
    Dr. Success: We need to dig deeper...
    User: I don't know, maybe real estate or something.
    `;
    
    const analysis = await generateMeetingAnalysis({
      blueprintSessions: testBlueprint.sessions,
      currentProgress: initialProgress,
      transcript: incompleteTranscript
    });
    
    // Should stay in same session
    expect(analysis.updatedProgress[0].session_status).toBe('in_progress');
    expect(analysis.nextSessionPrompt).toContain('Let\'s reconnect to what we started');
  });
});
```

#### Performance Testing with Blueprint

**Load Testing:**
```typescript
// Test with long transcripts from multi-hour coaching sessions
describe('Performance Testing', () => {
  test('processes long transcript within 30 seconds', async () => {
    const longTranscript = generateLongTranscript(10000); // 10k words
    const startTime = Date.now();
    
    await generateMeetingAnalysis({
      blueprintSessions: fullBlueprint.sessions,
      currentProgress: midJourneyProgress,
      transcript: longTranscript
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000); // 30 seconds
  });
});
```

#### Integration Testing

**Real Blueprint Flow:**
```typescript
// Test with actual seeded blueprint data
describe('Blueprint Integration', () => {
  test('works with seeded Think and Grow Rich blueprint', async () => {
    // Use actual blueprint from seed script
    const agent = await getAgentWithBlueprint('Think and Grow Rich Success Coach');
    const blueprint = agent.blueprintSnapshot;
    
    // Test each session in sequence
    for (let i = 0; i < blueprint.sessions.length; i++) {
      const session = blueprint.sessions[i];
      const testTranscript = await generateTestTranscript(session);
      
      const analysis = await generateMeetingAnalysis({
        blueprintSessions: blueprint.sessions,
        currentProgress: getCurrentProgress(agent),
        transcript: testTranscript
      });
      
      // Validate analysis quality
      expect(analysis.progressSummary).toContain(session.session_name);
      expect(analysis.nextSessionPrompt).toContain('Dr. Success');
    });
  });
});
```

This comprehensive testing strategy ensures the sophisticated analysis system works correctly with the actual blueprint structure and provides the expected coaching experience through the complete Think and Grow Rich journey.

## Conclusion

This implementation plan bridges the gap between the current basic LLM system and the sophisticated Voice Agent Prompt Generation System specified in the design documents. The phased approach ensures stability while implementing the comprehensive analysis capabilities required for personalized coaching experiences.

The blueprint-based testing strategy validates the system using the actual Think and Grow Rich coaching journey, ensuring the sophisticated analysis produces high-quality, personalized coaching prompts that adapt to each participant's unique progress and insights.

The key transformation is moving from simple meeting summarization to sophisticated conversation analysis with dynamic prompt generation, comprehensive progress tracking, and personalized coaching adaptation based on participant insights and progress.