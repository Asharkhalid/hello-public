import { EventEmitter } from 'events';
import type { TranscriptEntry } from '@/modules/call/visualization/types';

class ClientTranscriptCollector extends EventEmitter {
  private static instance: ClientTranscriptCollector;
  
  private constructor() {
    super();
  }
  
  static getInstance(): ClientTranscriptCollector {
    if (!ClientTranscriptCollector.instance) {
      ClientTranscriptCollector.instance = new ClientTranscriptCollector();
    }
    return ClientTranscriptCollector.instance;
  }
  
  emitTranscript(meetingId: string, entry: TranscriptEntry) {
    console.log('[ClientTranscriptCollector] Emitting transcript for meeting:', meetingId, entry);
    this.emit(`transcript:${meetingId}`, entry);
  }
  
  subscribe(meetingId: string, callback: (entry: TranscriptEntry) => void) {
    console.log('[ClientTranscriptCollector] Subscribing to transcripts for meeting:', meetingId);
    this.on(`transcript:${meetingId}`, callback);
    return () => {
      console.log('[ClientTranscriptCollector] Unsubscribing from transcripts for meeting:', meetingId);
      this.off(`transcript:${meetingId}`, callback);
    };
  }
  
  cleanup(meetingId: string) {
    this.removeAllListeners(`transcript:${meetingId}`);
  }
}

export const clientTranscriptCollector = ClientTranscriptCollector.getInstance();