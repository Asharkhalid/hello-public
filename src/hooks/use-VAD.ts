// hooks/useVAD.ts

import { useRef, useState, useEffect, useCallback } from 'react';

interface VADOptions {
  onSpeechStart: () => void;
  onSpeechEnd: (audio: Blob) => void;
  silenceDuration: number;
  silenceThreshold: number;
}

export function useVAD({
  onSpeechStart,
  onSpeechEnd,
  silenceDuration,
  silenceThreshold,
}: VADOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isSpeakingRef = useRef(false); // Use ref to avoid re-render dependency in loop

  const monitor = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

    if (average > silenceThreshold) { // Speech detected
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        onSpeechStart();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (isSpeakingRef.current) { // Silence after speech
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          mediaRecorderRef.current?.stop(); // This will trigger onstop and onSpeechEnd
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          silenceTimerRef.current = null;
        }, silenceDuration);
      }
    }
    
    animationFrameId.current = requestAnimationFrame(monitor);
  }, [onSpeechStart, silenceDuration, silenceThreshold]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onSpeechEnd(audioBlob);
        audioChunksRef.current = [];
        // Automatically restart listening after sending audio
        if (isListening) mediaRecorderRef.current?.start();
      };
      
      mediaRecorderRef.current.start();
      setIsListening(true);
      monitor();

    } catch (err) {
      console.error("Error starting VAD:", err);
    }
  }, [monitor, onSpeechEnd, isListening]);

  const stop = useCallback(() => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    setIsListening(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  return { start, stop, isListening, isSpeaking };
}