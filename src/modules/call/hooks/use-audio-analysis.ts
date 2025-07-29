import { useEffect, useRef } from 'react';

export interface AudioZoneData {
  audioLevel: number;           // 0-1
  frequencyData: Uint8Array;    // Raw frequency data
  frequencyBands: {
    low: number;               // 0-250Hz
    mid: number;               // 250-4000Hz
    high: number;              // 4000Hz+
  };
  isSpeaking: boolean;
}

const defaultAudioData: AudioZoneData = {
  audioLevel: 0,
  frequencyData: new Uint8Array(128),
  frequencyBands: { low: 0, mid: 0, high: 0 },
  isSpeaking: false,
};

export const useAudioAnalysis = (
  stream: MediaStream | undefined, 
  onAudioData: (data: AudioZoneData) => void
) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!stream) {
      onAudioData(defaultAudioData);
      return;
    }
    
    const setupAudio = async () => {
      try {
        // Clean up previous context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        // Start analysis loop
        const analyze = () => {
          if (!analyser) {
            return;
          }
          
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(frequencyData);
          
          // Calculate overall audio level
          const audioLevel = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
          
          // Calculate frequency bands
          const lowBand = frequencyData.slice(0, 10);
          const midBand = frequencyData.slice(10, 50);
          const highBand = frequencyData.slice(50, frequencyData.length);
          
          const low = lowBand.reduce((a, b) => a + b, 0) / lowBand.length;
          const mid = midBand.reduce((a, b) => a + b, 0) / midBand.length;
          const high = highBand.reduce((a, b) => a + b, 0) / highBand.length;
          
          const audioData: AudioZoneData = {
            audioLevel,
            frequencyData,
            frequencyBands: { low, mid, high },
            isSpeaking: audioLevel > 0.01,
          };
          
          onAudioData(audioData);
          
          animationFrameRef.current = requestAnimationFrame(analyze);
        };
        
        analyze();
      } catch (error) {
        console.error('Audio analysis setup failed:', error);
        onAudioData(defaultAudioData);
      }
    };
    
    setupAudio();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [stream, onAudioData]);
  
  return { audioContextRef, analyserRef };
}; 