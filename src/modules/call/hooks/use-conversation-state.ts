import { useState, useEffect } from 'react';
import type { ConversationState } from '@/lib/conversation/state-tracker';

export function useConversationState(meetingId: string | null) {
  const [state, setState] = useState<ConversationState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;

    let mounted = true;
    
    const fetchState = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/state`);
        if (!response.ok) {
          throw new Error('Failed to fetch state');
        }
        const data = await response.json();
        if (mounted) {
          setState(data.state);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    };

    // Initial fetch
    fetchState();
    
    // Poll for updates
    const interval = setInterval(fetchState, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [meetingId]);

  return { state, error };
}