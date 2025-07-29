import OpenAI from "openai";
import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import {
  MessageNewEvent,
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallRecordingReadyEvent,
  CallSessionParticipantLeftEvent,
  CallSessionStartedEvent,
} from "@stream-io/node-sdk";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";
import { transcriptCollector } from '@/lib/transcript/collector';
import { withRetry } from '@/lib/utils/retry';

// Type definitions for webhook conversation events
interface ConversationContent {
  type: string;
  transcript?: string;
}

interface ConversationItem {
  type: string;
  role?: string;
  content?: ConversationContent[];
}
import { generateMeetingAnalysis, findNextSession } from '@/lib/llm/meeting-analysis-v2';
import type { Session, SessionProgress, AnalyzerInput } from '@/lib/llm/types';
import { conversationStates, ConversationStateTracker } from '@/lib/conversation/state-tracker';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
};

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");

  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 }
    );
  }

  const body = await req.text();

  if (!verifySignatureWithSDK(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload as Record<string, unknown>)?.type;

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

    // Safety Check: Ensure the meeting has a valid prompt before connecting the AI.
    if (!existingMeeting.prompt || !existingMeeting.prompt.includes("CONVERSATION STATES")) {
      console.error(`[Webhook] CRITICAL: Meeting ${meetingId} has an invalid or empty prompt. AI cannot function.`);
      // You could optionally end the call here to prevent a bad user experience.
      // await streamVideo.video.call("default", meetingId).end();
      return NextResponse.json({ error: "Meeting prompt is invalid, cannot start AI session." }, { status: 500 });
    }

    const call = streamVideo.video.call("default", meetingId);
    // make the AI agent join the call
    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: process.env.OPENAI_API_KEY!,
      agentUserId: existingAgent.id,
    });

    // passing the prompt from your database meeting record as the AI's instructions
    console.log("Updating session instructions : ", existingMeeting.prompt);
    realtimeClient.updateSession({
      instructions: existingMeeting.prompt,
      input_audio_transcription: {
        model: "whisper-1"
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      modalities: ["text", "audio"],
      voice: "alloy"
    });

    // Create conversation state tracker
    const stateTracker = new ConversationStateTracker();
    conversationStates.set(meetingId, stateTracker);

    // NEW: Set up comprehensive event handling
    realtimeClient.on('realtime.event', ({ event }: { event: Record<string, unknown> }) => {
      try {
        // Log all events to debug
        console.log(`[Webhook] Received event: ${event.type}`);
        
        // Check for different transcript event formats
        if (event.type === 'response.audio_transcript.done') {
          console.log(`[Webhook] AI transcript event:`, event);
          if (typeof event.transcript === 'string') {
            console.log(`[Webhook] Storing AI transcript: "${event.transcript}"`);
            transcriptCollector.storeChunk(meetingId, 'agent', event.transcript);
          }
        }
        
        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          console.log(`[Webhook] User transcript event:`, event);
          if (typeof event.transcript === 'string') {
            console.log(`[Webhook] Storing User transcript: "${event.transcript}"`);
            transcriptCollector.storeChunk(meetingId, 'user', event.transcript);
          }
        }
        
        // Also check for other possible transcript events
        if (event.type === 'conversation.item.created' && event.item && typeof event.item === 'object') {
          const item = event.item as ConversationItem;
          if (item.type === 'message' && item.content && Array.isArray(item.content)) {
            item.content.forEach((content: ConversationContent) => {
              if (content.type === 'audio' && content.transcript) {
                console.log(`[Webhook] Found transcript in conversation.item.created:`, content.transcript);
                const role = item.role === 'assistant' ? 'agent' : 'user';
                transcriptCollector.storeChunk(meetingId, role, content.transcript);
              }
            });
          }
        }

        // NEW: Capture all conversation state events
        const stateEvents = [
          'input_audio_buffer.speech_started',
          'input_audio_buffer.speech_stopped', 
          'response.created',
          'response.audio.delta',
          'response.function_call_arguments.delta',
          'response.done',
          'session.updated'
        ];
        
        if (typeof event.type === 'string' && stateEvents.includes(event.type)) {
          stateTracker.handleEvent(event.type);
          console.log(`[Webhook] State update for ${meetingId}: ${event.type} -> ${stateTracker.getState().agentState}`);
        }
      } catch (error) {
        console.error(`[Webhook] Event processing error for meeting ${meetingId}:`, error);
      }
    });

    console.log(`[Webhook] Real-time transcript collection started for meeting ${meetingId}`);
  } else if (eventType === "call.session_participant_left") {
    console.log(`[Webhook] Processing event: ${eventType}`);
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid.split(":")[1]; // call_cid is formatted as "type:id"

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    const call = streamVideo.video.call("default", meetingId);
    await call.end();
  } else if (eventType === "call.session_ended") {
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

    // Cleanup transcript collector and conversation state
    transcriptCollector.cleanup(meetingId);
    conversationStates.delete(meetingId);
  } else if (eventType === "call.transcription_ready") {
    console.log(`[Webhook] Processing event: ${eventType}`);
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = event.call_cid.split(":")[1]; // call_cid is formatted as "type:id"

    const [updatedMeeting] = await db
      .update(meetings)
      .set({
        transcriptUrl: event.call_transcription.url,
      })
      .where(eq(meetings.id, meetingId))
      .returning();

    if (!updatedMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Legacy transcription ready - this is now handled by real-time processing
    console.log(`[Webhook] Legacy transcription ready for meeting ${meetingId}, ignoring (using real-time processing)`);
  } else if (eventType === "call.recording_ready") {
    console.log(`[Webhook] Processing event: ${eventType}`);
    const event = payload as CallRecordingReadyEvent;
    const meetingId = event.call_cid.split(":")[1]; // call_cid is formatted as "type:id"

    await db
      .update(meetings)
      .set({
        recordingUrl: event.call_recording.url,
      })
      .where(eq(meetings.id, meetingId));
  } else if (eventType === "message.new") {
    console.log(`[Webhook] Processing event: ${eventType}`);
    const event = payload as MessageNewEvent;

    const userId = event.user?.id;
    const channelId = event.channel_id;
    const text = event.message?.text;

    if (!userId || !channelId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [existingMeeting] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.id, channelId), eq(meetings.status, "completed")));

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, existingMeeting.agentId));

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (userId !== existingAgent.id) {
      const instructions = `
      You are an AI assistant helping the user revisit a recently completed meeting.
      Below is a summary of the meeting, generated from the transcript:
      
      ${existingMeeting.summary}
      
      The following are your original instructions from the live meeting assistant. Please continue to follow these behavioral guidelines as you assist the user:
      
      ${existingMeeting.prompt || "Follow your standard coaching guidelines."}
      
      The user may ask questions about the meeting, request clarifications, or ask for follow-up actions.
      Always base your responses on the meeting summary above.
      
      You also have access to the recent conversation history between you and the user. Use the context of previous messages to provide relevant, coherent, and helpful responses. If the user's question refers to something discussed earlier, make sure to take that into account and maintain continuity in the conversation.
      
      If the summary does not contain enough information to answer a question, politely let the user know.
      
      Be concise, helpful, and focus on providing accurate information from the meeting and the ongoing conversation.
      `;

      const channel = streamChat.channel("messaging", channelId);
      await channel.watch();

      const previousMessages = channel.state.messages
        .slice(-5)
        .filter((msg) => msg.text && msg.text.trim() !== "")
        .map<ChatCompletionMessageParam>((message) => ({
          role: message.user?.id === existingAgent.id ? "assistant" : "user",
          content: message.text || "",
        }));

      const GPTResponse = await openaiClient.chat.completions.create({
        messages: [
          { role: "system", content: instructions },
          ...previousMessages,
          { role: "user", content: text },
        ],
        model: "gpt-4o",
      });

      const GPTResponseText = GPTResponse.choices[0].message.content;

      if (!GPTResponseText) {
        return NextResponse.json(
          { error: "No response from GPT" },
          { status: 400 }
        );
      }

      const avatarUrl = generateAvatarUri({
        seed: existingAgent.name,
        variant: "botttsNeutral",
      });

      streamChat.upsertUser({
        id: existingAgent.id,
        name: existingAgent.name,
        image: avatarUrl,
      });

      channel.sendMessage({
        text: GPTResponseText,
        user: {
          id: existingAgent.id,
          name: existingAgent.name,
          image: avatarUrl,
        },
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}

// Enhanced processing function with retries and error handling
async function processImmediately(meetingId: string): Promise<void> {
  console.log(`[Processing] Starting immediate analysis for meeting ${meetingId}`);
  
  try {
    // Check if database is available
    if (!db.query) {
      console.error('[Processing] Database not available');
      return;
    }

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

    // Check if this is a blueprint-based meeting (use new analysis)
    const isBlueprint = meeting.agent.blueprintSnapshot && 
      (meeting.agent.blueprintSnapshot as { sessions?: unknown[] }).sessions;
    
    if (isBlueprint) {
      // Sophisticated analysis with new system
      const analysis = await withRetry(async () => {
        const blueprintSnapshot = meeting.agent.blueprintSnapshot as {
          id: string;
          name: string;
          description: string;
          marketingCollateral: Record<string, unknown>;
          sessions: Session[];
        };

        const input: AnalyzerInput = {
          blueprintSessions: blueprintSnapshot.sessions,
          currentProgress: (meeting.progress as SessionProgress[]) || [],
          transcript: JSON.stringify(formattedTranscript)
        };

        console.log(`[Processing] Analysis input:`, {
          sessionsCount: input.blueprintSessions.length,
          progressCount: input.currentProgress.length,
          transcriptLength: input.transcript.length
        });

        return generateMeetingAnalysis(input);
      }, 2, 2000);
      
      // Update meeting with sophisticated results
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

      // Determine next session
      const blueprintSnapshot = meeting.agent.blueprintSnapshot as {
        sessions: Session[];
      };
      
      const nextSession = findNextSession(analysis.updatedProgress, blueprintSnapshot.sessions);

      // Create next meeting if needed
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
