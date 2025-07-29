import { NextRequest, NextResponse } from "next/server";
import { transcriptCollector } from "@/lib/transcript/collector";
import type { TranscriptEntry } from "@/modules/call/visualization/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: meetingId } = resolvedParams;
    
    // Get transcripts from the database
    const chunks = await transcriptCollector.getTranscript(meetingId);
    
    // Convert to the format expected by the client
    const transcripts: TranscriptEntry[] = chunks.map((chunk) => ({
      id: `${chunk.meetingId}-${chunk.sequenceNumber}`,
      speaker: chunk.speakerType === 'agent' ? 'assistant' : 'user',
      text: chunk.text,
      timestamp: chunk.timestamp.getTime()
    }));
    
    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error('[API] Failed to fetch transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}