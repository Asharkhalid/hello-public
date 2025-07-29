"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
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