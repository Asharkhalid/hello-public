"use client";

import React, { useRef, useEffect } from 'react';
import { useTranscripts } from '@/modules/call/hooks/use-transcripts';

interface TranscriptOverlayProps {
  meetingId: string;
}

export const TranscriptOverlay: React.FC<TranscriptOverlayProps> = ({ meetingId }) => {
  const transcripts = useTranscripts(meetingId);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debug logging
  useEffect(() => {
    console.log('[TranscriptOverlay] Transcripts:', transcripts.length, transcripts);
  }, [transcripts]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
      <div 
        ref={containerRef}
        className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide"
      >
        {transcripts.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            <p>No transcripts yet. Start speaking to see transcripts here.</p>
          </div>
        ) : (
          transcripts.slice(-10).map((entry) => (
            <div
              key={entry.id}
              className={`
                p-2 rounded-lg max-w-md transition-all duration-300 shadow-sm
                ${entry.speaker === 'user' 
                  ? 'ml-auto bg-pink-900 text-pink-100 border border-pink-800' 
                  : 'mr-auto bg-blue-900 text-blue-100 border border-blue-800'
                }
              `}
            >
              <p className="text-xs opacity-70 mb-1">
                {entry.speaker === 'user' ? 'You' : 'AI Assistant'}
              </p>
              <p className="text-sm">{entry.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};