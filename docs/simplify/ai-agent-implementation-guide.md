# AI Coding Agent Implementation Guide
## Step-by-Step Instructions for Real-time Processing Implementation

This guide provides detailed, actionable instructions for an AI coding agent to implement the real-time processing solution. Each step includes exact code, file paths, and verification commands.

## Table of Contents

1. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
2. [Phase 1: Database Foundation](#phase-1-database-foundation)
3. [Phase 2: Core Services](#phase-2-core-services)
4. [Phase 3: Webhook Integration](#phase-3-webhook-integration)
5. [Phase 4: UI Components](#phase-4-ui-components)
6. [Phase 5: API Endpoints](#phase-5-api-endpoints)
7. [Phase 6: Integration & Cleanup](#phase-6-integration--cleanup)
8. [Phase 7: Testing & Verification](#phase-7-testing--verification)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites & Environment Setup

### Environment Verification
Run these commands to verify the environment is ready:

```bash
# Check Node.js and npm
node --version # Should be >= 18
npm --version

# Check database connection
echo "Testing database connection..."
npx drizzle-kit introspect

# Check OpenAI API key
echo "OpenAI API Key configured: ${OPENAI_API_KEY:0:7}..."

# Verify current project structure
ls -la src/app/api/webhook/
ls -la src/modules/call/ui/components/
```

### Backup Current State
```bash
# Create backup branch
git checkout -b realtime-implementation-backup
git add -A && git commit -m "Backup before real-time implementation"
git push origin realtime-implementation-backup

# Create working branch
git checkout main
git checkout -b feature/realtime-processing
```

---

## Phase 1: Database Foundation

### Step 1.1: Create Database Migration

**Create file:** `drizzle/0xxx_add_transcript_storage.sql`

```sql
-- Add transcript chunks table for real-time storage
CREATE TABLE IF NOT EXISTS "transcript_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "meeting_id" uuid NOT NULL,
  "speaker_type" varchar(10) NOT NULL CHECK (speaker_type IN ('user', 'agent')),
  "text" text NOT NULL,
  "timestamp" timestamp with time zone NOT NULL DEFAULT now(),
  "sequence_number" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS "idx_transcript_chunks_meeting_sequence" 
ON "transcript_chunks" ("meeting_id", "sequence_number");

CREATE INDEX IF NOT EXISTS "idx_transcript_chunks_meeting_timestamp" 
ON "transcript_chunks" ("meeting_id", "timestamp");

-- Add foreign key constraint
ALTER TABLE "transcript_chunks" 
ADD CONSTRAINT "transcript_chunks_meeting_id_fk" 
FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE;

-- Add processing fields to meetings table
ALTER TABLE "meetings" 
ADD COLUMN IF NOT EXISTS "error" text,
ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "transcript_collected" boolean DEFAULT false;

-- Ensure 'failed' status exists in meeting_status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
        CREATE TYPE meeting_status AS ENUM ('upcoming', 'active', 'processing', 'completed', 'failed', 'cancelled');
    ELSE
        BEGIN
            ALTER TYPE meeting_status ADD VALUE IF NOT EXISTS 'failed';
        EXCEPTION WHEN duplicate_object THEN null;
        END;
    END IF;
END $$;
```

### Step 1.2: Update Database Schema

**Edit file:** `src/db/schema.ts`

Add these additions to the existing file:

```typescript
// Add to imports at top of file
import { index } from "drizzle-orm/pg-core";

// Add transcript chunks table after existing tables
export const transcriptChunks = pgTable('transcript_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  speakerType: varchar('speaker_type', { length: 10 }).notNull(),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  sequenceNumber: integer('sequence_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  meetingSequenceIdx: index('idx_transcript_chunks_meeting_sequence')
    .on(table.meetingId, table.sequenceNumber),
  meetingTimestampIdx: index('idx_transcript_chunks_meeting_timestamp')
    .on(table.meetingId, table.timestamp),
}));

// Find the existing meetings table definition and add these fields
// Add these to the existing meetings pgTable definition:
error: text('error'),
processingStartedAt: timestamp('processing_started_at', { withTimezone: true }),
transcriptCollected: boolean('transcript_collected').default(false),

// Update the meeting status enum if it doesn't include 'failed'
// Ensure this includes all statuses:
export const meetingStatus = pgEnum('meeting_status', [
  'upcoming', 'active', 'processing', 'completed', 'failed', 'cancelled'
]);
```

### Step 1.3: Run Database Migration

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration to database
npx drizzle-kit migrate

# Verify tables were created
npx drizzle-kit introspect | grep -E "(transcript_chunks|meetings)"
```

**Verification:** Check that the command completes without errors and shows the new table.

---

## Phase 2: Core Services

### Step 2.1: Create Retry Utility

**Create file:** `src/lib/utils/retry.ts`

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`[Retry] Attempt ${i + 1}/${maxRetries + 1} failed:`, error);
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Step 2.2: Create Transcript Collector Service

**Create file:** `src/lib/transcript/collector.ts`

```typescript
import { db } from '@/db';
import { transcriptChunks, meetings } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface TranscriptChunk {
  meetingId: string;
  speakerType: 'user' | 'agent';
  text: string;
  timestamp: Date;
  sequenceNumber: number;
}

export class TranscriptCollector {
  private sequenceCounters = new Map<string, number>();

  async storeChunk(
    meetingId: string, 
    speakerType: 'user' | 'agent', 
    text: string
  ): Promise<void> {
    try {
      const sequenceNumber = this.getNextSequence(meetingId);
      
      await db.insert(transcriptChunks).values({
        meetingId,
        speakerType,
        text,
        timestamp: new Date(),
        sequenceNumber
      });

      console.log(`[Transcript] Stored ${speakerType} chunk ${sequenceNumber} for meeting ${meetingId}`);
    } catch (error) {
      console.error(`[Transcript] Failed to store chunk for meeting ${meetingId}:`, error);
      // Don't throw - we don't want transcript storage to break the call
    }
  }

  async getTranscript(meetingId: string): Promise<TranscriptChunk[]> {
    try {
      const chunks = await db
        .select()
        .from(transcriptChunks)
        .where(eq(transcriptChunks.meetingId, meetingId))
        .orderBy(transcriptChunks.sequenceNumber);

      return chunks.map(chunk => ({
        meetingId: chunk.meetingId,
        speakerType: chunk.speakerType as 'user' | 'agent',
        text: chunk.text,
        timestamp: chunk.timestamp,
        sequenceNumber: chunk.sequenceNumber
      }));
    } catch (error) {
      console.error(`[Transcript] Failed to retrieve transcript for meeting ${meetingId}:`, error);
      return [];
    }
  }

  async markTranscriptCollected(meetingId: string): Promise<void> {
    try {
      await db
        .update(meetings)
        .set({ transcriptCollected: true })
        .where(eq(meetings.id, meetingId));
    } catch (error) {
      console.error(`[Transcript] Failed to mark transcript collected for meeting ${meetingId}:`, error);
    }
  }

  private getNextSequence(meetingId: string): number {
    const current = this.sequenceCounters.get(meetingId) || 0;
    const next = current + 1;
    this.sequenceCounters.set(meetingId, next);
    return next;
  }

  cleanup(meetingId: string): void {
    this.sequenceCounters.delete(meetingId);
  }
}

// Global singleton
export const transcriptCollector = new TranscriptCollector();
```

### Step 2.3: Verify Services

```bash
# Check files were created correctly
ls -la src/lib/utils/retry.ts
ls -la src/lib/transcript/collector.ts

# Check TypeScript compilation
npx tsc --noEmit
```

**Verification:** Both files should exist and TypeScript should compile without errors.

---

## Phase 3: Webhook Integration

### Step 3.1: Update Webhook Handler

**Edit file:** `src/app/api/webhook/route.ts`

**IMPORTANT:** This requires careful editing of the existing file. Follow these exact steps:

1. **Add imports at the top of the file:**

```typescript
// Add these imports to the existing imports section
import { transcriptCollector } from '@/lib/transcript/collector';
import { withRetry } from '@/lib/utils/retry';
import { generateMeetingAnalysis, findNextSession } from '@/lib/llm/meeting-analysis';
```

2. **Find the `call.session_started` handler and replace it with:**

```typescript
if (eventType === "call.session_started") {
  console.log(`[Webhook] Processing event: ${eventType}`);
  const event = payload as CallSessionStartedEvent;
  const meetingId = event.call.custom?.meetingId;

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  const [existingMeeting] = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        not(eq(meetings.status, "completed")),
        not(eq(meetings.status, "active")),
        not(eq(meetings.status, "cancelled")),
        not(eq(meetings.status, "processing")),
      )
    );

  if (!existingMeeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await db
    .update(meetings)
    .set({
      status: "active",
      startedAt: new Date(),
    })
    .where(eq(meetings.id, existingMeeting.id));

  const [existingAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, existingMeeting.agentId));

  if (!existingAgent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const call = streamVideo.video.call("default", meetingId);
  const realtimeClient = await streamVideo.video.connectOpenAi({
    call,
    openAiApiKey: process.env.OPENAI_API_KEY!,
    agentUserId: existingAgent.id,
  });

  console.log("Updating session instructions : ", existingMeeting.prompt);
  realtimeClient.updateSession({
    instructions: existingMeeting.prompt || "You are a helpful AI assistant.",
    input_audio_transcription: {
      model: "whisper-1"
    },
    turn_detection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  });

  // NEW: Set up real-time transcript collection
  realtimeClient.on('realtime.event', ({ time, source, event }) => {
    try {
      // Agent responses (output audio transcripts)
      if (event.type === 'response.audio_transcript.done' && event.transcript) {
        transcriptCollector.storeChunk(meetingId, 'agent', event.transcript);
      }
      
      // User input transcription (conversation items)
      if (event.type === 'conversation.item.audio_transcription.completed' && event.transcript) {
        transcriptCollector.storeChunk(meetingId, 'user', event.transcript);
      }
    } catch (error) {
      console.error(`[Webhook] Transcript collection error for meeting ${meetingId}:`, error);
    }
  });

  console.log(`[Webhook] Real-time transcript collection started for meeting ${meetingId}`);
}
```

3. **Find the `call.session_ended` handler and replace it with:**

```typescript
else if (eventType === "call.session_ended") {
  console.log(`[Webhook] Processing event: ${eventType}`);
  const event = payload as CallEndedEvent;
  const meetingId = event.call.custom?.meetingId;

  if (!meetingId) {
    return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
  }

  // Mark transcript collection complete
  await transcriptCollector.markTranscriptCollected(meetingId);

  // Update meeting status to processing
  await db
    .update(meetings)
    .set({
      status: "processing",
      endedAt: new Date(),
      processingStartedAt: new Date()
    })
    .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));

  // Start immediate processing (fire-and-forget)
  processImmediately(meetingId).catch(error => {
    console.error(`[Webhook] Processing failed for meeting ${meetingId}:`, error);
  });

  // Cleanup transcript collector
  transcriptCollector.cleanup(meetingId);
}
```

4. **Add the processing function at the end of the file (before the final return statement):**

```typescript
// Enhanced processing function with retries and error handling
async function processImmediately(meetingId: string): Promise<void> {
  console.log(`[Processing] Starting immediate analysis for meeting ${meetingId}`);
  
  try {
    // Get meeting context with retry
    const meeting = await withRetry(async () => {
      const result = await db.query.meetings.findFirst({
        where: eq(meetings.id, meetingId),
        with: { agent: true }
      });
      if (!result) throw new Error(`Meeting ${meetingId} not found`);
      return result;
    }, 3, 1000);

    // Get transcript with retry
    const transcript = await withRetry(async () => {
      const chunks = await transcriptCollector.getTranscript(meetingId);
      if (chunks.length === 0) {
        console.warn(`[Processing] No transcript found for meeting ${meetingId}, proceeding anyway`);
      }
      return chunks;
    }, 3, 1000);

    // Format transcript for analysis
    const formattedTranscript = transcript.map(chunk => ({
      speaker_id: chunk.speakerType,
      text: chunk.text,
      user: { 
        name: chunk.speakerType === 'user' ? 'User' : meeting.agent.name 
      }
    }));

    // Determine processing type
    const blueprintData = meeting.agent.blueprintSnapshot as any;
    const blueprintSessions = blueprintData?.sessions || blueprintData?.conversations || [];
    
    if (blueprintSessions.length > 0) {
      // Enhanced analysis with blueprint
      const analysis = await withRetry(async () => {
        return generateMeetingAnalysis({
          blueprintSessions,
          currentProgress: meeting.progress as any[] || [],
          transcript: JSON.stringify(formattedTranscript)
        });
      }, 2, 2000);
      
      // Update meeting with enhanced results
      await withRetry(async () => {
        await db
          .update(meetings)
          .set({
            status: "completed",
            summary: analysis.progressSummary,
            progress: analysis.updatedProgress
          })
          .where(eq(meetings.id, meetingId));
      }, 3, 1000);
      
      // Create next meeting if needed
      const nextSession = findNextSession(analysis.updatedProgress);
      if (nextSession) {
        await withRetry(async () => {
          await db.insert(meetings).values({
            name: nextSession.session_name,
            userId: meeting.userId,
            agentId: meeting.agentId,
            prompt: analysis.nextSessionPrompt,
            progress: analysis.updatedProgress,
            status: "upcoming"
          });
        }, 3, 1000);
        
        console.log(`[Processing] Created next meeting for session: ${nextSession.session_name}`);
      }
      
    } else {
      // Classic summarization fallback
      const response = await withRetry(async () => {
        return openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "You are an expert summarizer. Write readable, concise content about this meeting transcript." 
            },
            { 
              role: "user", 
              content: `Summarize this transcript: ${JSON.stringify(formattedTranscript)}` 
            }
          ]
        });
      }, 2, 2000);

      const summary = response.choices[0]?.message?.content || "Summary generation failed";
      
      await withRetry(async () => {
        await db
          .update(meetings)
          .set({
            status: "completed",
            summary
          })
          .where(eq(meetings.id, meetingId));
      }, 3, 1000);
    }

    console.log(`[Processing] Completed analysis for meeting ${meetingId}`);
    
  } catch (error) {
    console.error(`[Processing] Final error for meeting ${meetingId}:`, error);
    
    // Mark meeting as failed with error details
    await db
      .update(meetings)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Processing failed"
      })
      .where(eq(meetings.id, meetingId))
      .catch(dbError => {
        console.error(`[Processing] Failed to update meeting status for ${meetingId}:`, dbError);
      });
  }
}
```

5. **Remove any existing Inngest imports and usage:**

```bash
# Search for and remove these lines:
# import { inngest } from "@/inngest/client";
# Any lines that call inngest.send()
```

### Step 3.2: Verify Webhook Changes

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check for remaining Inngest references
grep -r "inngest" src/app/api/webhook/route.ts
```

**Verification:** TypeScript should compile without errors, and no Inngest references should remain.

---

## Phase 4: UI Components

### Step 4.1: Create Processing Component

**Create file:** `src/modules/call/ui/components/call-processing.tsx`

```typescript
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CallProcessingProps {
  meetingId: string;
}

type ProcessingStatus = 'processing' | 'completed' | 'failed';

export const CallProcessing = ({ meetingId }: CallProcessingProps) => {
  const [status, setStatus] = useState<ProcessingStatus>('processing');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const startTime = Date.now();
    
    // Progress simulation with realistic timing
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) return prev; // Cap until completion
        const elapsed = Date.now() - startTime;
        // Progress based on typical processing time (10-20 seconds)
        const expectedDuration = 15000; // 15 seconds
        const timeProgress = Math.min((elapsed / expectedDuration) * 85, 85);
        return Math.max(prev, timeProgress);
      });
    }, 200);

    // Elapsed time counter
    const timeInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Status polling with exponential backoff
    let pollInterval = 1000; // Start with 1 second
    const maxPollInterval = 3000; // Max 3 seconds
    
    const statusPoller = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/status`);
        const meeting = await response.json();
        
        if (meeting.status === 'completed') {
          setProgress(100);
          setStatus('completed');
          clearInterval(progressInterval);
          clearInterval(timeInterval);
          setTimeout(() => {
            router.push(`/meetings/${meetingId}`);
          }, 1500);
          return;
        } 
        
        if (meeting.status === 'failed') {
          setStatus('failed');
          setError(meeting.error || 'Processing failed');
          clearInterval(progressInterval);
          clearInterval(timeInterval);
          return;
        }

        // Continue polling with exponential backoff
        pollInterval = Math.min(pollInterval * 1.2, maxPollInterval);
        setTimeout(statusPoller, pollInterval);
        
      } catch (err) {
        console.error('Failed to check meeting status:', err);
        // Retry after delay
        setTimeout(statusPoller, pollInterval);
      }
    };

    // Start initial poll after short delay
    setTimeout(statusPoller, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, [meetingId, router]);

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
        <div className="flex flex-col items-center gap-6 bg-background rounded-lg p-10 shadow-lg max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-green-600 mb-2">
              Analysis Complete!
            </h3>
            <p className="text-muted-foreground">
              Redirecting to your session results...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
        <div className="flex flex-col items-center gap-6 bg-background rounded-lg p-10 shadow-lg max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <div className="text-center">
            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Processing Failed
            </h3>
            <p className="text-muted-foreground mb-4">
              {error || "We couldn't analyze your session. Please try again."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => router.push("/meetings")}>
              Back to Meetings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
      <div className="flex flex-col items-center gap-8 bg-background rounded-lg p-10 shadow-lg max-w-md w-full">
        
        {/* Animated Brain */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
          <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-ping"></div>
          <div className="absolute inset-6 rounded-full bg-blue-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>
        
        {/* Progress Info */}
        <div className="text-center w-full">
          <h3 className="text-xl font-semibold mb-2">
            Analyzing Your Session
          </h3>
          <p className="text-muted-foreground mb-6">
            {progress < 30 && "Preparing analysis..."}
            {progress >= 30 && progress < 70 && "Understanding conversation patterns..."}
            {progress >= 70 && progress < 85 && "Generating insights and tracking progress..."}
            {progress >= 85 && "Finalizing analysis..."}
          </p>
          
          {/* Progress Bar */}
          <Progress value={progress} className="w-full mb-4" />
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            <span>{elapsedTime}s elapsed</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          This usually takes 10-20 seconds
        </p>
      </div>
    </div>
  );
};
```

### Step 4.2: Update Call UI Component

**Edit file:** `src/modules/call/ui/components/call-ui.tsx`

1. **Add import at the top:**

```typescript
import { CallProcessing } from './call-processing';
```

2. **Update the Props interface:**

```typescript
interface Props {
  meetingName: string;
  meetingId: string; // Add this line
}
```

3. **Update the component function signature:**

```typescript
export const CallUI = ({ meetingName, meetingId }: Props) => {
```

4. **Update the state type:**

```typescript
const [show, setShow] = useState<"lobby" | "call" | "processing">("lobby");
```

5. **Update the handleLeave function:**

```typescript
const handleLeave = () => {
  if (!call) return;

  call.endCall();
  setShow("processing"); // Change from "ended" to "processing"
};
```

6. **Update the return JSX:**

```typescript
return (
  <div className="h-full">
    {/* Keep StreamTheme for Stream functionality but only show during lobby */}
    {show === "lobby" && (
      <StreamTheme className="h-full">
        <CallLobby onJoin={handleJoin} />
      </StreamTheme>
    )}
    
    {/* Custom call interface */}
    {show === "call" && (
      <StreamTheme className="h-full">
        <CallActive onLeave={handleLeave} meetingName={meetingName} />
      </StreamTheme>
    )}
    
    {/* Processing interface */}
    {show === "processing" && <CallProcessing meetingId={meetingId} />}
  </div>
);
```

### Step 4.3: Update Call Connect Component

**Edit file:** `src/modules/call/ui/components/call-connect.tsx`

Find the line that renders `<CallUI>` and update it to pass the meetingId:

```typescript
<CallUI meetingName={meetingName} meetingId={meetingId} />
```

### Step 4.4: Remove Old Call Ended Component

**Delete file:** `src/modules/call/ui/components/call-ended.tsx`

```bash
rm src/modules/call/ui/components/call-ended.tsx
```

---

## Phase 5: API Endpoints

### Step 5.1: Create Meeting Status Endpoint

**Create file:** `src/app/api/meetings/[id]/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, params.id),
      columns: { 
        status: true, 
        error: true,
        endedAt: true,
        processingStartedAt: true,
        transcriptCollected: true
      }
    });
    
    if (!meeting) {
      return NextResponse.json(
        { error: "Meeting not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Failed to get meeting status:', error);
    return NextResponse.json(
      { error: "Failed to get meeting status" },
      { status: 500 }
    );
  }
}
```

### Step 5.2: Verify API Endpoint

```bash
# Check file was created
ls -la src/app/api/meetings/[id]/status/route.ts

# Verify TypeScript compilation
npx tsc --noEmit
```

---

## Phase 6: Integration & Cleanup

### Step 6.1: Remove Inngest Dependencies

```bash
# Remove Inngest files and directories
rm -rf src/inngest/
rm -f src/app/api/inngest/route.ts

# Remove from package.json
npm uninstall inngest @inngest/agent-kit
```

### Step 6.2: Clean Up Imports

Search for and remove any remaining Inngest references:

```bash
# Find all files that might import Inngest
grep -r "from.*inngest" src/ --exclude-dir=node_modules

# Remove any imports like:
# import { inngest } from "@/inngest/client";
# import { EVENTS } from "@/inngest/events";
```

### Step 6.3: Update Dependencies

```bash
# Reinstall to clean up package-lock.json
npm install

# Verify no Inngest packages remain
npm list | grep inngest
```

**Verification:** The command should return no results (no Inngest packages found).

---

## Phase 7: Testing & Verification

### Step 7.1: Build Verification

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check Next.js build
npm run build
```

**Verification:** Both commands should complete without errors.

### Step 7.2: Database Verification

```bash
# Verify database schema
npx drizzle-kit introspect | grep transcript_chunks

# Test database connection
echo "SELECT COUNT(*) FROM meetings;" | npx drizzle-kit query
```

**Verification:** Should show the transcript_chunks table exists and query should work.

### Step 7.3: Manual Testing Checklist

Start the development server and test:

```bash
npm run dev
```

**Test scenarios:**

1. **Start a call** - Verify call connects and agent responds
2. **Have a conversation** - Talk with the agent for 30+ seconds
3. **End the call** - Verify processing screen appears immediately
4. **Wait for completion** - Verify progress bar and redirect to results
5. **Check database** - Verify transcript chunks were stored
6. **Test error handling** - Force an error and verify failure state

### Step 7.4: Cleanup Verification

```bash
# Verify no Inngest references remain anywhere
grep -r "inngest" src/ --exclude-dir=node_modules

# Verify new files exist
ls -la src/lib/transcript/collector.ts
ls -la src/lib/utils/retry.ts
ls -la src/modules/call/ui/components/call-processing.tsx
ls -la src/app/api/meetings/[id]/status/route.ts

# Verify old files are gone
ls src/modules/call/ui/components/call-ended.tsx 2>/dev/null || echo "call-ended.tsx correctly removed"
ls -la src/inngest/ 2>/dev/null || echo "inngest directory correctly removed"
```

**Verification:** Should show no Inngest references, new files exist, old files are gone.

---

## Rollback Procedures

### Emergency Rollback (< 5 minutes)

If critical issues occur during testing:

```bash
# Immediately revert to backup
git checkout realtime-implementation-backup
git checkout -b emergency-fix

# Deploy if needed
vercel --prod
```

### Planned Rollback (15 minutes)

If issues are discovered after deployment:

```bash
# Revert code changes
git revert <commit-range>

# Reinstall Inngest if needed
npm install inngest @inngest/agent-kit

# Revert database migration if necessary
# (Create down migration or restore from backup)
```

### Partial Rollback

If only specific features fail:

```bash
# Disable real-time processing only
# Comment out transcript collection in webhook
# Fall back to existing Inngest processing
```

---

## Success Criteria

- [ ] **Database migration** completes successfully
- [ ] **Transcript collection** works during calls
- [ ] **Processing starts** within 2 seconds of call end
- [ ] **Progress UI** provides meaningful feedback
- [ ] **Meeting completion** redirects to results
- [ ] **Error handling** prevents user confusion
- [ ] **No Inngest references** remain in codebase
- [ ] **TypeScript compilation** succeeds
- [ ] **Build process** completes without errors
- [ ] **Manual testing** passes all scenarios

## Post-Implementation Monitoring

After successful deployment, monitor:

1. **Processing success rate** - Should be > 99%
2. **Processing time** - Should average 10-15 seconds
3. **Transcript collection rate** - Should capture all conversations
4. **Database performance** - Query times should remain fast
5. **User experience** - No complaints about processing delays

This guide provides step-by-step instructions that an AI coding agent can follow to implement the real-time processing solution while maintaining all existing functionality.