import { useState, useEffect, useCallback, useRef } from "react";
import { StreamTheme, useCall } from "@stream-io/video-react-sdk";
import { LoaderIcon } from "lucide-react";

import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallProcessing } from "./call-processing";

interface Props {
  meetingName: string;
  meetingId: string;
  autoJoin?: boolean;
}

export const CallUI = ({ meetingName, meetingId, autoJoin = false }: Props) => {
  const call = useCall();
  const [show, setShow] = useState<"lobby" | "call" | "processing">("lobby");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitiatedJoin = useRef(false);

  const handleJoin = useCallback(async () => {
    if (!call || isJoining || hasInitiatedJoin.current) {
      return;
    }

    setIsJoining(true);
    hasInitiatedJoin.current = true;
    setError(null);
    
    try {
      // Ensure camera and mic are disabled before joining
      await call.camera.disable();
      await call.microphone.disable();
      
      // Always try to get or create the call first to ensure it exists
      await call.getOrCreate({
        data: {
          custom: {
            meetingId,
            meetingName,
          },
          settings_override: {
            transcription: { mode: "auto-on" },
          },
        },
      });
      
      await call.join();
      setShow("call");
    } catch (error) {
      console.error('Failed to join call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', {
        message: errorMessage,
        code: (error as Record<string, unknown>)?.code,
        details: (error as Record<string, unknown>)?.details
      });
      
      // Reset state on error so user can retry
      hasInitiatedJoin.current = false;
      setIsJoining(false);
      
      // Set error state
      setError(errorMessage);
    }
  }, [call, meetingId, meetingName]); // Remove isJoining from deps as it's checked inside the function

  const handleLeave = () => {
    if (!call) return;

    call.endCall();
    setShow("processing");
  };

  // Auto-join when requested and call is ready
  useEffect(() => {
    if (autoJoin && call && show === "lobby" && !hasInitiatedJoin.current) {
      // Small delay to ensure call object is fully initialized
      const timer = setTimeout(() => {
        handleJoin();
      }, 500);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, call]); // Intentionally exclude handleJoin and show to prevent infinite loop

  return (
    <div className="h-full">
      {/* Error state */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            <p className="text-sm">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Auto-joining state */}
      {show === "lobby" && autoJoin && isJoining && (
        <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
          <div className="text-center space-y-4">
            <LoaderIcon className="size-8 animate-spin text-white mx-auto" />
            <div className="text-white">
              <h3 className="font-semibold">Joining session...</h3>
              <p className="text-sm text-gray-300">Setting up video connection</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Lobby state */}
      {show === "lobby" && (!autoJoin || !isJoining) && (
        <StreamTheme className="h-full">
          <CallLobby onJoin={handleJoin} meetingId={meetingId} />
        </StreamTheme>
      )}
      
      {/* Active call with custom interface */}
      {show === "call" && (
        <StreamTheme className="h-full">
          <CallActive onLeave={handleLeave} meetingName={meetingName} meetingId={meetingId} />
        </StreamTheme>
      )}

      {/* Processing state */}
      {show === "processing" && (
        <CallProcessing meetingId={meetingId} />
      )}
    </div>
  );
};
