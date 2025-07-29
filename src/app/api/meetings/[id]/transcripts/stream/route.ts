import { NextRequest, NextResponse } from "next/server";
import { transcriptCollector } from "@/lib/transcript/collector";
import type { TranscriptEntry } from "@/modules/call/visualization/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const { id: meetingId } = resolvedParams;
  
  console.log('[SSE] Starting transcript stream for meeting:', meetingId);

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Send initial transcripts
  const sendInitialTranscripts = async () => {
    try {
      const chunks = await transcriptCollector.getTranscript(meetingId);
      const transcripts: TranscriptEntry[] = chunks.map((chunk) => ({
        id: `${chunk.meetingId}-${chunk.sequenceNumber}`,
        speaker: chunk.speakerType === 'agent' ? 'assistant' : 'user',
        text: chunk.text,
        timestamp: chunk.timestamp.getTime()
      }));

      console.log('[SSE] Sending initial transcripts:', transcripts.length);
      
      // Send initial data
      await writer.write(
        encoder.encode(`event: init\ndata: ${JSON.stringify({ transcripts })}\n\n`)
      );
    } catch {
      console.error('[SSE] Failed to send initial transcripts');
    }
  };

  // Subscribe to real-time updates
  const subscribeToUpdates = () => {
    const handleNewTranscript = async (entry: TranscriptEntry) => {
      try {
        console.log('[SSE] Sending new transcript:', entry.speaker, entry.text);
        await writer.write(
          encoder.encode(`event: transcript\ndata: ${JSON.stringify(entry)}\n\n`)
        );
      } catch {
        console.error('[SSE] Failed to send transcript update');
      }
    };

    // Subscribe to transcript events
    const unsubscribe = transcriptCollector.subscribe(meetingId, handleNewTranscript);

    // Cleanup on disconnect
    request.signal.addEventListener('abort', () => {
      console.log('[SSE] Client disconnected, cleaning up');
      unsubscribe();
      writer.close();
    });
  };

  // Start streaming
  sendInitialTranscripts();
  subscribeToUpdates();

  // Keep connection alive with heartbeat
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(`:heartbeat\n\n`));
    } catch {
      console.log('[SSE] Heartbeat failed, closing connection');
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
  });

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}