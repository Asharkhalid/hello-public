import { useState, useEffect } from "react";
import { 
  useCall, 
  useCallStateHooks,
  ParticipantsAudio,
  SpeakingWhileMutedNotification 
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Phone, Palette } from "lucide-react";

import { DualZoneVisualizer } from "./dual-zone-visualizer";
import { AudioVisualizer } from "./audio-visualizer-enhanced";
import { VisualizerModeSelector } from "./visualizer-mode-selector";
import './audio-visualizer-styles.css';

type VisualizationSystem = "dual-zone" | "enhanced";
type VisualizationMode = "aura" | "glow" | "pulse" | "wave";

interface Props {
  onLeave: () => void;
  meetingName: string;
}

export const UnifiedCallActive = ({ onLeave, meetingName }: Props) => {
  const call = useCall();
  const { 
    useMicrophoneState, 
    useCameraState, 
    useParticipants
  } = useCallStateHooks();
  
  const { microphone, isMute: isMicMuted, mediaStream: micStream } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const participants = useParticipants();

  // Visualization system state
  const [visualizationSystem, setVisualizationSystem] = useState<VisualizationSystem>("dual-zone");
  const [enhancedMode, setEnhancedMode] = useState<VisualizationMode>("aura");
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Stream state for dual-zone system
  const [inputStream, setInputStream] = useState<MediaStream>();
  const [outputStream, setOutputStream] = useState<MediaStream>();

  // Get microphone stream for audio visualization
  useEffect(() => {
    if (micStream) {
      console.log('Microphone stream detected:', micStream);
      setInputStream(micStream);
    }
  }, [micStream]);

  // Get remote participant audio streams for visualization
  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.isLocalParticipant);
    console.log('Participants:', participants.length, 'Remote:', remoteParticipants.length);
    
    if (remoteParticipants.length > 0) {
      for (const participant of remoteParticipants) {
        console.log('Participant audio stream:', participant.audioStream);
        if (participant.audioStream) {
          setOutputStream(participant.audioStream);
          break; // Use first available audio stream
        }
      }
    }
  }, [participants]);

  const toggleMute = async () => {
    try {
      await microphone.toggle();
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const toggleVideo = async () => {
    try {
      await camera.toggle();
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  const handleLeave = async () => {
    try {
      await call?.leave();
      onLeave();
    } catch (error) {
      console.error('Failed to leave call:', error);
      onLeave(); // Still call onLeave to update UI
    }
  };

  const toggleVisualizationSystem = () => {
    setVisualizationSystem(prev => prev === "dual-zone" ? "enhanced" : "dual-zone");
    setShowModeSelector(false); // Close mode selector when switching systems
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Conditional Visualization System */}
      <div className="absolute inset-0">
        {visualizationSystem === "dual-zone" ? (
          <DualZoneVisualizer 
            inputStream={inputStream}    // Human microphone
            outputStream={outputStream}  // AI audio output
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full">
            <AudioVisualizer
              mode={enhancedMode}
              showParticipantInfo={true}
              enableAdvancedEffects={true}
              agentUserId="lucy"
            />
          </div>
        )}
      </div>

      {/* Enhanced Mode Selector (only for enhanced system) */}
      {visualizationSystem === "enhanced" && showModeSelector && (
        <VisualizerModeSelector
          currentMode={enhancedMode}
          onModeChange={setEnhancedMode}
        />
      )}

      {/* Hidden audio component for GetStream's audio management */}
      <div className="hidden">
        <ParticipantsAudio participants={participants} />
      </div>

      {/* Meeting Info Overlay */}
      <div className="absolute top-6 left-6 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
          <h2 className="text-white font-semibold text-lg">{meetingName}</h2>
          <p className="text-gray-300 text-sm">
            {participants.length === 1 ? "Waiting for AI..." : `${participants.length} participants`}
          </p>
        </div>
      </div>

      {/* Visualization System Indicator */}
      <div className="absolute top-6 right-6 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">
            {visualizationSystem === "dual-zone" ? "Dual-Zone" : `Enhanced (${enhancedMode})`}
          </span>
        </div>
      </div>

      {/* Call Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
          <SpeakingWhileMutedNotification>
            <Button
              variant={isMicMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleMute}
              className="rounded-full w-12 h-12 p-0 transition-all hover:scale-110"
            >
              {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
          </SpeakingWhileMutedNotification>

          <Button
            variant={isCamMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12 p-0 transition-all hover:scale-110"
          >
            {isCamMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {/* Visualization System Toggle */}
          <Button
            variant="outline"
            size="lg"
            onClick={toggleVisualizationSystem}
            className="rounded-full w-12 h-12 p-0 transition-all hover:scale-110"
            title={`Switch to ${visualizationSystem === "dual-zone" ? "Enhanced" : "Dual-Zone"} visualization`}
          >
            <Palette className="w-6 h-6" />
          </Button>

          {/* Enhanced Mode Selector Toggle (only for enhanced system) */}
          {visualizationSystem === "enhanced" && (
            <Button
              variant={showModeSelector ? "default" : "outline"}
              size="lg"
              onClick={() => setShowModeSelector(!showModeSelector)}
              className="rounded-full w-12 h-12 p-0 transition-all hover:scale-110"
              title="Change enhanced mode"
            >
              ✨
            </Button>
          )}

          <Button
            variant="destructive"
            size="lg"
            onClick={handleLeave}
            className="rounded-full w-12 h-12 p-0 transition-all hover:scale-110"
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Development Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-6 left-6 z-10">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs font-mono">
            <div>System: {visualizationSystem}</div>
            {visualizationSystem === "enhanced" && <div>Mode: {enhancedMode}</div>}
            <div>Participants: {participants.length}</div>
            <div>Input Stream: {inputStream ? '✓' : '✗'}</div>
            <div>Output Stream: {outputStream ? '✓' : '✗'}</div>
          </div>
        </div>
      )}
    </div>
  );
}; 