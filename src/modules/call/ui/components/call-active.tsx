import { useState, useEffect, useCallback } from "react";
import {
  useCall, 
  useCallStateHooks,
  ParticipantsAudio,
  SpeakingWhileMutedNotification 
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Phone } from "lucide-react";

import { AudioVisualization, useVisualizerControls } from "./audio-visualization";
import './audio-visualizer-styles.css';

interface Props {
  onLeave: () => void;
  meetingName: string;
  meetingId: string;
}

export const CallActive = ({ onLeave, meetingName, meetingId }: Props) => {
  const call = useCall();
  const { 
    useMicrophoneState, 
    useCameraState, 
    useParticipants
  } = useCallStateHooks();
  
  
  const { microphone, isMute: isMicMuted, mediaStream: micStream } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const participants = useParticipants();

  const [inputStream, setInputStream] = useState<MediaStream>();
  const [outputStream, setOutputStream] = useState<MediaStream>();
  const [visualizers, setVisualizers] = useState<Array<{id: string, name: string}>>([]);
  const [activeVisualizer, setActiveVisualizer] = useState('orb-webgl');
  const { changeVisualizer } = useVisualizerControls();

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

  const handleVisualizerChange = useCallback((id: string) => {
    setActiveVisualizer(id);
  }, []);

  const handleVisualizersReady = useCallback((vis: Array<{id: string, name: string}>, activeId: string) => {
    setVisualizers(vis);
    setActiveVisualizer(activeId);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Audio Visualization with multiple visualizers */}
      <div className="absolute inset-0">
        <AudioVisualization 
          userStream={inputStream}     // Human microphone
          aiStream={outputStream}      // AI audio output
          meetingId={meetingId}
          onVisualizerChange={handleVisualizerChange}
          onVisualizersReady={handleVisualizersReady}
        />
      </div>

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

      {/* Status Indicator with Visualizer Dropdown */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm">Connected</span>
        </div>
        
        {visualizers.length > 0 && (
          <select
            value={activeVisualizer}
            onChange={(e) => changeVisualizer(e.target.value)}
            className="bg-black/50 backdrop-blur-sm text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            {visualizers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
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
    </div>
  );
};
