import { CSSProperties, useEffect, useState } from "react";
import { StreamVideoParticipant, useCallStateHooks } from "@stream-io/video-react-sdk";

const listeningCooldownMs = 1000;

type VisualizationMode = "aura" | "glow" | "pulse" | "wave";
type ActivityState = "listening" | "speaking" | "thinking" | "idle";

interface AudioVisualizerProps {
  mode?: VisualizationMode;
  showParticipantInfo?: boolean;
  enableAdvancedEffects?: boolean;
  agentUserId?: string; // Make agent ID configurable
}

interface EnhancedAudioAnalysis {
  intensity: number;
  energy: number;
  frequencyBands: { low: number; mid: number; high: number };
}

export function AudioVisualizer({ 
  mode = "aura", 
  showParticipantInfo = true,
  enableAdvancedEffects = true,
  agentUserId = "lucy" // Default to "lucy" but allow override
}: AudioVisualizerProps) {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const [activity, setActivity] = useState<ActivityState>("speaking");
  const [volumeHistory, setVolumeHistory] = useState<number[]>([]);
  const [peakVolume, setPeakVolume] = useState(0);
  const [isAIThinking] = useState(false); // Remove setter to fix linter
  
  const speaker = participants.find((p) => p.isSpeaking);
  const agent = useAgentParticipant(agentUserId);
  const localParticipant = participants.find((p) => p.isLocalParticipant);
  
  const mediaStream = activity === "listening" 
    ? localParticipant?.audioStream
    : agent?.audioStream;
    
  const volume = useMediaStreamVolume(mediaStream ?? null);
  const enhancedVolume = useEnhancedVolumeAnalysis(mediaStream);

  // Enhanced volume tracking with history
  useEffect(() => {
    setVolumeHistory(prev => {
      const newHistory = [...prev, volume].slice(-20); // Keep last 20 samples
      const currentPeak = Math.max(...newHistory);
      setPeakVolume(currentPeak);
      return newHistory;
    });
  }, [volume]);

  // Enhanced activity detection
  useEffect(() => {
    if (!speaker && activity === "listening") {
      const timeout = setTimeout(() => {
        setActivity(isAIThinking ? "thinking" : "speaking");
      }, listeningCooldownMs);
      return () => clearTimeout(timeout);
    }

    const isUserSpeaking = speaker?.isLocalParticipant;
    const isAgentSpeaking = speaker?.userId === agent?.userId;
    
    if (isUserSpeaking) {
      setActivity("listening");
    } else if (isAgentSpeaking) {
      setActivity("speaking");
    } else if (participants.length === 1) {
      setActivity("idle");
    }
  }, [speaker, activity, isAIThinking, agent?.userId, participants.length]);

  // AI thinking state detection (connect to OpenAI events)
  useEffect(() => {
    // TODO: Connect to OpenAI realtime events
    // Example integration:
    // realtimeClient.on('realtime.event', ({ event }) => {
    //   if (event.type === 'response.function_call_arguments.delta') {
    //     setIsAIThinking(true);
    //   } else if (event.type === 'response.audio.delta') {
    //     setIsAIThinking(false);
    //   }
    // });
  }, []);

  const averageVolume = volumeHistory.length > 0 
    ? volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length 
    : 0;

  const dynamicScale = enableAdvancedEffects 
    ? Math.min(1 + (enhancedVolume.intensity * 0.3), 1.4)
    : Math.min(1 + volume, 1.1);

  const dynamicBrightness = enableAdvancedEffects
    ? Math.max(Math.min(1 + (enhancedVolume.energy * 0.5), 1.5), 1)
    : Math.max(Math.min(1 + volume, 1.2), 1);

  return (
    <div className="audio-visualizer-container">
      <div
        className={`audio-visualizer audio-visualizer--${mode}`}
        style={{
          "--volumeter-scale": dynamicScale,
          "--volumeter-brightness": dynamicBrightness,
          "--volume-intensity": enhancedVolume.intensity,
          "--volume-energy": enhancedVolume.energy,
          "--peak-volume": peakVolume,
          "--average-volume": averageVolume,
          "--frequency-low": enhancedVolume.frequencyBands.low / 255,
          "--frequency-mid": enhancedVolume.frequencyBands.mid / 255,
          "--frequency-high": enhancedVolume.frequencyBands.high / 255,
        } as CSSProperties}
      >
        <div className={`audio-visualizer__${mode} audio-visualizer__${mode}_${activity}`} />
        
        {enableAdvancedEffects && (
          <>
            <div className={`audio-visualizer__particles audio-visualizer__particles_${activity}`} />
            <div className={`audio-visualizer__ripple audio-visualizer__ripple_${activity}`} />
          </>
        )}
      </div>

      {showParticipantInfo && (
        <div className="audio-visualizer__info">
          <div className={`participant-indicator participant-indicator--${activity}`}>
            {activity === "listening" && localParticipant && (
              <div className="participant-info">
                <span className="participant-name">{localParticipant.name || "You"}</span>
                <div className="volume-meter">
                  <div 
                    className="volume-bar" 
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
              </div>
            )}
            {activity === "speaking" && agent && (
              <div className="participant-info">
                <span className="participant-name">{agent.name || "AI Assistant"}</span>
                <div className="ai-status">
                  {isAIThinking ? "Thinking..." : "Speaking"}
                </div>
              </div>
            )}
            {activity === "thinking" && (
              <div className="participant-info">
                <span className="participant-name">AI Assistant</span>
                <div className="ai-status thinking">Processing...</div>
              </div>
            )}
            {activity === "idle" && (
              <div className="participant-info">
                <span className="participant-name">Waiting...</span>
                <div className="ai-status">Ready to assist</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced volume analysis hook
function useEnhancedVolumeAnalysis(stream: MediaStream | null | undefined): EnhancedAudioAnalysis {
  const [analysis, setAnalysis] = useState<EnhancedAudioAnalysis>({
    intensity: 0,
    energy: 0,
    frequencyBands: { low: 0, mid: 0, high: 0 }
  });

  useEffect(() => {
    if (!stream) {
      setAnalysis({
        intensity: 0,
        energy: 0,
        frequencyBands: { low: 0, mid: 0, high: 0 }
      });
      return;
    }

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let animationFrame: number;

    const setupAnalysis = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        const analyze = () => {
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(frequencyData);

          const intensity = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
          const energy = Math.sqrt(frequencyData.reduce((a, b) => a + b * b, 0) / frequencyData.length) / 255;

          // Frequency band analysis
          const lowBand = frequencyData.slice(0, 10);
          const midBand = frequencyData.slice(10, 50);
          const highBand = frequencyData.slice(50, frequencyData.length);

          const low = lowBand.reduce((a, b) => a + b, 0) / lowBand.length;
          const mid = midBand.reduce((a, b) => a + b, 0) / midBand.length;
          const high = highBand.reduce((a, b) => a + b, 0) / highBand.length;

          setAnalysis({
            intensity,
            energy,
            frequencyBands: { low, mid, high }
          });

          animationFrame = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (error) {
        console.warn('Enhanced audio analysis failed:', error);
      }
    };

    setupAnalysis();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [stream]);

  return analysis;
}

function useAgentParticipant(agentUserId: string): StreamVideoParticipant | null {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const agent = participants.find((p) => p.userId === agentUserId) ?? null;
  return agent;
}

// Simple volume hook
function useMediaStreamVolume(stream: MediaStream | null): number {
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!stream) {
      setVolume(0);
      return;
    }

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let animationFrame: number;

    const setupVolumeDetection = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        const detectVolume = () => {
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(frequencyData);
          const average = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
          setVolume(average / 255);
          animationFrame = requestAnimationFrame(detectVolume);
        };

        detectVolume();
      } catch (error) {
        console.warn('Volume detection failed:', error);
      }
    };

    setupVolumeDetection();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [stream]);

  return volume;
} 