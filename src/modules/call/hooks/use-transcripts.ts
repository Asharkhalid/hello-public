import { useState, useEffect, useRef } from 'react';
import type { TranscriptEntry } from '@/modules/call/visualization/types';

export const useTranscripts = (meetingId: string) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    // Connect to SSE endpoint for real-time updates
    const connectSSE = () => {
      try {
        console.log('[useTranscripts] Connecting to SSE for meeting:', meetingId);
        
        const eventSource = new EventSource(`/api/meetings/${meetingId}/transcripts/stream`);
        eventSourceRef.current = eventSource;
        
        // Handle initial data
        eventSource.addEventListener('init', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (mounted && data.transcripts) {
              console.log('[useTranscripts] Received initial transcripts:', data.transcripts.length);
              setTranscripts(data.transcripts);
            }
          } catch (error) {
            console.error('[useTranscripts] Failed to parse init event:', error);
          }
        });
        
        // Handle new transcripts
        eventSource.addEventListener('transcript', (event) => {
          try {
            const transcript = JSON.parse(event.data) as TranscriptEntry;
            if (mounted) {
              console.log('[useTranscripts] New transcript:', transcript.speaker, transcript.text);
              setTranscripts(prev => [...prev, transcript]);
            }
          } catch (error) {
            console.error('[useTranscripts] Failed to parse transcript event:', error);
          }
        });
        
        // Handle errors
        eventSource.onerror = (error) => {
          console.error('[useTranscripts] SSE error:', error);
          eventSource.close();
          
          // Fallback to polling if SSE fails
          if (mounted) {
            console.log('[useTranscripts] Falling back to polling');
            fallbackToPolling();
          }
        };
        
      } catch (error) {
        console.error('[useTranscripts] Failed to connect SSE:', error);
        if (mounted) {
          fallbackToPolling();
        }
      }
    };
    
    // Fallback polling mechanism
    const fallbackToPolling = () => {
      const fetchTranscripts = async () => {
        try {
          const response = await fetch(`/api/meetings/${meetingId}/transcripts`);
          if (response.ok) {
            const data = await response.json();
            if (mounted && data.transcripts) {
              setTranscripts(data.transcripts);
            }
          }
        } catch (error) {
          console.error('[useTranscripts] Failed to fetch transcripts:', error);
        }
      };
      
      // Initial fetch
      fetchTranscripts();
      
      // Poll every 2 seconds
      const interval = setInterval(() => {
        if (mounted) {
          fetchTranscripts();
        }
      }, 2000);
      
      // Store interval ID for cleanup
      eventSourceRef.current = { close: () => clearInterval(interval) } as EventSource;
    };
    
    // Start with SSE
    connectSSE();
    
    // Cleanup
    return () => {
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [meetingId]);
  
  return transcripts;
};