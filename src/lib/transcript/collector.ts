import { db } from '@/db';
import { transcriptChunks, meetings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { EventEmitter } from 'events';
import type { TranscriptEntry } from '@/modules/call/visualization/types';

interface TranscriptChunk {
  meetingId: string;
  speakerType: 'user' | 'agent';
  text: string;
  timestamp: Date;
  sequenceNumber: number;
}

export class TranscriptCollector extends EventEmitter {
  private sequenceCounters = new Map<string, number>();

  async storeChunk(
    meetingId: string, 
    speakerType: 'user' | 'agent', 
    text: string
  ): Promise<void> {
    try {
      const sequenceNumber = this.getNextSequence(meetingId);
      
      // Only store to database on server-side
      if (typeof window === 'undefined' && db) {
        await db.insert(transcriptChunks).values({
          meetingId,
          speakerType,
          text,
          timestamp: new Date(),
          sequenceNumber
        });

        console.log(`[Transcript] Stored ${speakerType} chunk ${sequenceNumber} for meeting ${meetingId}`);
      }
      
      // Always emit event for real-time updates (works on both client and server)
      const transcriptEntry: TranscriptEntry = {
        id: `${meetingId}-${sequenceNumber}`,
        speaker: speakerType === 'agent' ? 'assistant' : 'user',
        text,
        timestamp: Date.now()
      };
      this.emit(`transcript:${meetingId}`, transcriptEntry);
    } catch (error) {
      console.error(`[Transcript] Failed to store chunk for meeting ${meetingId}:`, error);
      // Don't throw - we don't want transcript storage to break the call
    }
  }

  async getTranscript(meetingId: string): Promise<TranscriptChunk[]> {
    try {
      // Only query database on server-side
      if (typeof window === 'undefined' && db) {
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
      }
      return [];
    } catch (error) {
      console.error(`[Transcript] Failed to retrieve transcript for meeting ${meetingId}:`, error);
      return [];
    }
  }

  async markTranscriptCollected(meetingId: string): Promise<void> {
    try {
      // Only update database on server-side
      if (typeof window === 'undefined' && db) {
        await db
          .update(meetings)
          .set({ transcriptCollected: true })
          .where(eq(meetings.id, meetingId));
      }
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
    this.removeAllListeners(`transcript:${meetingId}`);
  }
  
  subscribe(meetingId: string, callback: (entry: TranscriptEntry) => void) {
    this.on(`transcript:${meetingId}`, callback);
    return () => this.off(`transcript:${meetingId}`, callback);
  }
}

// Global singleton
export const transcriptCollector = new TranscriptCollector();