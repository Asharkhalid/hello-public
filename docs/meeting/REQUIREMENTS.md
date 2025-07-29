# Automatic Meeting System - Requirements Document

## 📋 Overview

This document outlines the requirements for transforming the existing meeting system into an automated progression system. The goal is to simplify user experience and eliminate complex runtime queries by pre-computing meeting instructions and automatically creating the next meeting after each conversation completion.

**Key Terminology:**
- **Agent Blueprint**: Master template defining a learning program with multiple conversations
- **Agent**: User's personal conversational agent created from a blueprint 
- **Meeting**: Individual conversation between user and agent (what we're automating)
- **Conversation ID**: Identifies which conversation from the blueprint this meeting represents
- **Web Session**: Authentication session (unrelated to this system)

---

## 🏗️ Current System Architecture (What EXISTS)

### Database Schema
```typescript
// EXISTING: Agent Blueprints (master templates)
export const agentBlueprints = pgTable("agent_blueprints", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  marketingCollateral: jsonb("marketing_collateral").notNull(),
  meetingTemplates: jsonb("meeting_templates").notNull(), // Contains conversation definitions
  type: text("type", { enum: ["sequential", "recurring"] }).default("sequential"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// EXISTING: Agents (user instances, but limited functionality)
export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").references(() => user.id),
  instructions: text("instructions"), // Currently used for non-blueprint agents
  blueprintId: text("blueprint_id").references(() => agentBlueprints.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// EXISTING: Meetings (individual conversations)
export const meetings = pgTable("meetings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  userId: text("user_id").references(() => user.id),
  agentId: text("agent_id").references(() => agents.id),
  status: meetingStatus("status").default("upcoming"), // upcoming, active, completed, processing, cancelled
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  transcriptUrl: text("transcript_url"),
  recordingUrl: text("recording_url"),
  summary: text("summary"),
  meetingInstructions: text("meeting_instructions"), // Runtime generated
  meetingData: jsonb("meeting_data"), // TO BE REMOVED - no longer needed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Blueprint Conversation Structure (EXISTS)
Currently, `agentBlueprints.meetingTemplates` contains:
```json
{
  "sessions": [
    {
      "id": "conversation_1_desire",
      "name": "Conversation 1: Desire", 
      "status": "pending",
      "completionNotes": "",
      "instructions": "Complete AI instructions for this conversation...",
      "completionCriteria": "User must verbally commit to writing down their Definite Chief Aim."
    }
  ]
}
```

### Current Meeting Processing Flow (EXISTS)
1. Meeting completes, Inngest function triggered
2. Fetches transcript and meeting data
3. Analyzes transcript against conversation `completionCriteria` using LLM
4. Updates conversation `status` to "completed" or "in-progress"
5. Updates `meetingData` with analysis results
6. Sets meeting `status` to "completed"

---

## 🎯 Required Changes (What NEEDS TO CHANGE)

### 1. Agent-Level Progress Tracking (NEW)
**Problem**: Agents currently have no progress tracking mechanism for their conversation journey.

**Solution**: Add progress tracking to agents table:
```typescript
export const agents = pgTable("agents", {
  // ... existing fields ...
  
  // NEW: Personal blueprint snapshot (version isolation)
  blueprintSnapshot: jsonb("blueprint_snapshot"), // Snapshot of blueprint at creation
  
  // NEW: Progress tracking for this user's conversation journey  
  progressTracker: text("progress_tracker"), // Simple markdown format, LLM-generated
});
```

**Progress Tracker Schema**:
```typescript
// Simple markdown format - LLM generated
interface ProgressTracker {
  content: string; // Markdown content with progress, insights, notes
  currentConversationId: string;
  totalConversations: number;
  progressPercentage: number;
  journeyStatus: "active" | "paused" | "completed";
}
```

### 2. Automatic Next Meeting Creation (NEW)
**Problem**: Users must manually create each meeting.

**Solution**: Automatically create next meeting after conversation completion.

**Current Process**: 
- User completes meeting → Processing → User manually creates next meeting

**New Process**:
- User completes meeting → Processing → System automatically creates next meeting in "upcoming" status
- Stream.io call only created when user clicks to start the meeting

### 3. Remove meetingData Complexity (SIMPLIFICATION)
**Problem**: Complex `meetingData` field no longer needed.

**Current**: Runtime analysis of `meetingData` to find next conversation
**New**: Instructions pre-computed and stored in `meetingInstructions` field, no `meetingData` needed

### 4. Conversation ID Tracking (NEW)
**Problem**: No way to track which conversation from blueprint this meeting represents.

**Solution**: Add `conversationId` field to meetings table to identify the conversation from blueprint.
**Note**: Multiple meetings can have the same `conversationId` if user needs to retry/continue the same conversation.

---

## 🔄 Detailed System Flow Changes

### 1. Blueprint Selection & Agent Creation (NEW)
```typescript
async function startConversationWithBlueprint(blueprintId: string, userId: string) {
  // 1. Fetch blueprint template
  const blueprint = await db.query.agentBlueprints.findFirst({
    where: eq(agentBlueprints.id, blueprintId)
  });
  
  // 2. Create agent with blueprint snapshot
  const agent = await db.insert(agents).values({
    name: `${blueprint.name} Journey`,
    userId,
    blueprintId,
    blueprintSnapshot: {
      id: blueprintId,
      name: blueprint.name,
      description: blueprint.description,
      marketingCollateral: blueprint.marketingCollateral,
      conversations: blueprint.meetingTemplates.sessions
    },
    progressTracker: `# ${blueprint.name} Journey Started\n\n- Journey started on ${new Date().toISOString()}\n- Ready to begin first conversation\n- Current conversation: ${blueprint.meetingTemplates.sessions[0].name}`
  });
  
  // 3. Create first meeting with pre-computed instructions
  const firstConversation = blueprint.meetingTemplates.sessions[0];
  const meeting = await db.insert(meetings).values({
    name: firstConversation.name,
    userId,
    agentId: agent.id,
    conversationId: firstConversation.id, // Track which conversation this is
    meetingInstructions: firstConversation.instructions, // Pre-computed from blueprint
    status: "upcoming"
  });
  
  // NOTE: Stream.io call NOT created here - only when user clicks to start
  
  return { agent, meeting };
}
```

### 2. Meeting Completion with Automatic Progression (ENHANCED)
```typescript
async function processMeetingCompletion(meetingId: string) {
  // 1. Fetch meeting and analyze transcript
  const meeting = await db.query.meetings.findFirst({
    where: eq(meetings.id, meetingId),
    with: { agent: true }
  });
  
  const transcript = await fetchTranscript(meeting.transcriptUrl);
  
  // 2. LLM analyzes transcript and generates:
  // - Meeting summary
  // - Updated progress tracker (markdown)
  // - Next conversation determination
  // - Next meeting instructions
  const llmAnalysis = await analyzeMeetingWithLLM({
    transcript,
    currentConversationId: meeting.conversationId,
    blueprintSnapshot: meeting.agent.blueprintSnapshot,
    currentProgressTracker: meeting.agent.progressTracker
  });
  
  // 3. Update current meeting
  await db.update(meetings).set({
    summary: llmAnalysis.meetingSummary,
    status: "completed"
  }).where(eq(meetings.id, meetingId));
  
  // 4. Update agent progress
  await db.update(agents).set({
    progressTracker: llmAnalysis.updatedProgressTracker // LLM-generated markdown
  }).where(eq(agents.id, meeting.agentId));
  
  // 5. Create next meeting automatically (if journey not complete)
  if (llmAnalysis.nextConversation) {
    await db.insert(meetings).values({
      name: llmAnalysis.nextConversation.name,
      userId: meeting.userId,
      agentId: meeting.agentId,
      conversationId: llmAnalysis.nextConversation.id,
      meetingInstructions: llmAnalysis.nextConversation.instructions, // LLM-generated
      status: "upcoming"
    });
    
    // NOTE: Stream.io call NOT created here - only when user clicks to start
  }
}

// IMPORTANT: LLM will determine what the next conversation should be
// This is not predetermined in the blueprint - it's dynamically generated
// based on the user's progress and conversation analysis
async function analyzeMeetingWithLLM(input) {
  // LLM will generate:
  // 1. Meeting summary
  // 2. Updated progress tracker (markdown format)
  // 3. Determination of next conversation (ID, name, instructions)
  // 4. Journey completion status
  
  // The LLM has full flexibility to:
  // - Move to next conversation in blueprint
  // - Repeat current conversation if objectives not met
  // - Skip conversations if user demonstrates mastery
  // - Create custom conversation variations
  // - End journey early if appropriate
}
```

---

## 📊 Meeting Status Lifecycle (SIMPLIFIED)

### Before Meeting Starts
- `status: "upcoming"`
- `meetingInstructions: <pre-computed>`
- `conversationId: <conversation_id_from_blueprint>`
- No Stream.io call created yet

### When User Clicks to Start Meeting
- Create Stream.io call
- `status: "active"`
- `startedAt: <timestamp>`

### After Meeting Ends
- `status: "processing"`
- `endedAt: <timestamp>`
- `transcriptUrl: <url>`
- Background processing triggered

### After Processing Complete
- `status: "completed"`
- `summary: <LLM-generated summary>`
- Next meeting automatically created in "upcoming" status (no Stream.io call)

---

## 🚀 Implementation Priority

### Phase 1: Core Infrastructure
1. Add progress tracking fields to agents table (simplified)
2. Add conversationId to meetings table
3. Remove meetingData field dependency

### Phase 2: LLM Integration
1. Create LLM analysis function for meeting completion
2. Implement automatic next meeting creation
3. Generate progress tracker updates in markdown format

### Phase 3: User Experience
1. Create blueprint browsing interface
2. Add progress visualization from markdown
3. Implement conversation journey management dashboard

---

## 🔒 Business Logic Requirements

### Blueprint Version Isolation
- Agent's `blueprintSnapshot` isolates from blueprint updates
- User's conversation journey remains consistent even if blueprint changes
- Simple structure: id, name, description, marketingCollateral, conversations

### Progress Calculation
- Linear progression: `(completed conversations / total conversations) * 100`
- LLM maintains progress in flexible markdown format
- No rigid structure - full flexibility for LLM to track as needed

### Conversation Flow
- LLM determines next conversation dynamically
- Can repeat, skip, or modify conversations based on user progress
- Instructions generated by LLM for each specific user context
- Multiple meetings possible for same conversationId if needed

### Meeting Creation Flow
- Next meeting created in "upcoming" status only
- Stream.io call created only when user clicks to start
- Meetings always marked "completed" regardless of conversation objectives

---

*This requirements document provides a simplified, LLM-focused approach to the Automatic Meeting System.* 