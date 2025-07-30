// hooks/useRealtimeAgent.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { useVAD } from './use-VAD';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const useRealtimeAgent = () => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);

  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      if (audioQueueRef.current.length === 0) setIsAgentSpeaking(false);
      return;
    }
    
    isPlayingRef.current = true;
    setIsAgentSpeaking(true);
    
    const audioData = audioQueueRef.current.shift();
    if (!audioData || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    audioContextRef.current.decodeAudioData(audioData)
      .then(buffer => {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current!.destination);
        source.onended = () => {
          isPlayingRef.current = false;
          processAudioQueue();
        };
        source.start();
      })
      .catch(error => {
        console.error("Error decoding audio data:", error);
        isPlayingRef.current = false;
      });
  }, []);

  const sendAudioToServer = useCallback((audioBlob: Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Sending audio to server...");
      const reader = new FileReader();
      reader.onload = () => {
        const base64data = (reader.result as string).split(',')[1];
        wsRef.current?.send(JSON.stringify({ type: 'audio_chunk', data: base64data }));
      };
      reader.readAsDataURL(audioBlob);
    }
  }, []);

  const { start: startVAD, stop: stopVAD, isListening, isSpeaking } = useVAD({
    onSpeechStart: () => console.log("User started speaking..."),
    onSpeechEnd: sendAudioToServer,
    silenceDuration: 1000,
    silenceThreshold: 2 // Adjust this threshold based on your mic sensitivity
  });

  const connect = useCallback(async (meetingId: string, token: string) => {
    if (wsRef.current) return;
    setStatus('connecting');

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
    }

    const wsUrl = `ws://localhost:3001?meetingId=${meetingId}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      startVAD();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string);
      if (message.type === 'audio_chunk') {
        const audioData = Uint8Array.from(atob(message.data), c => c.charCodeAt(0)).buffer;
        audioQueueRef.current.push(audioData);
        processAudioQueue();
      }
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('disconnected');
      stopVAD();
      wsRef.current = null;
    };
  }, [processAudioQueue, startVAD, stopVAD]);

  const disconnect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return { status, connect, disconnect, isListening, isUserSpeaking: isSpeaking, isAgentSpeaking };
};