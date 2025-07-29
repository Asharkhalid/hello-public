"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAudioAnalysis, type AudioZoneData } from '@/modules/call/hooks/use-audio-analysis';
import { VisualizationManager } from '@/modules/call/visualization/manager';
import { TranscriptOverlay } from './transcript-overlay';
import type { AudioData } from '@/modules/call/visualization/types';

// Import all visualizers
import {
  // Primary visualizer
  OrbWebGLVisualizer,
  ThreadsWebGLVisualizer,
  // Single-zone adaptive visualizers
  UnifiedWavesVisualizer,
  ReactiveMatrixVisualizer,
  // Dual-zone visualizers
  WavesVisualizer,
  DotGridVisualizer,
  DualZoneAdapter,
  SpectrumBarsVisualizer
} from '@/modules/call/visualization/visualizers';

interface AudioVisualizationProps {
  userStream: MediaStream | undefined;
  aiStream: MediaStream | undefined;
  meetingId: string;
  onVisualizerChange?: (visualizerId: string, visualizerName: string) => void;
  onVisualizersReady?: (visualizers: Array<{id: string, name: string}>, activeId: string) => void;
}

export function useVisualizerControls() {
  const changeVisualizer = (id: string) => {
    window.dispatchEvent(new CustomEvent('changeVisualizer', { detail: { id } }));
  };
  
  return { changeVisualizer };
}

export const AudioVisualization: React.FC<AudioVisualizationProps> = ({ 
  userStream, 
  aiStream, 
  meetingId,
  onVisualizerChange,
  onVisualizersReady 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<VisualizationManager | undefined>(undefined);
  const [activeVisualizer, setActiveVisualizer] = useState('orb-webgl');
  const [visualizers, setVisualizers] = useState<Array<{id: string, name: string}>>([]);
  const [userAudio, setUserAudio] = useState<AudioZoneData | null>(null);
  const [aiAudio, setAiAudio] = useState<AudioZoneData | null>(null);
  
  // Get audio data
  useAudioAnalysis(userStream, useCallback((data: AudioZoneData) => {
    setUserAudio(data);
  }, []));
  
  useAudioAnalysis(aiStream, useCallback((data: AudioZoneData) => {
    setAiAudio(data);
  }, []));
  
  // Initialize manager
  useEffect(() => {
    const manager = new VisualizationManager();
    
    // Register WebGL visualizers
    manager.register(new OrbWebGLVisualizer());
    manager.register(new ThreadsWebGLVisualizer());
    
    // Register single-zone adaptive visualizers (newer, more dynamic)
    manager.register(new UnifiedWavesVisualizer());
    manager.register(new ReactiveMatrixVisualizer());
    
    // Register dual-zone visualizers
    manager.register(new WavesVisualizer());
    manager.register(new SpectrumBarsVisualizer());
    manager.register(new DotGridVisualizer());
    manager.register(new DualZoneAdapter());
    
    managerRef.current = manager;
    manager.setActive('orb-webgl'); // Set Orb WebGL as default
    const availableVisualizers = manager.getAvailable();
    setVisualizers(availableVisualizers);
    onVisualizersReady?.(availableVisualizers, 'orb-webgl');
  }, [onVisualizersReady]);
  
  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = visualizers.findIndex(v => v.id === activeVisualizer);
        const nextIndex = (currentIndex + 1) % visualizers.length;
        const nextVisualizer = visualizers[nextIndex];
        
        setActiveVisualizer(nextVisualizer.id);
        managerRef.current?.setActive(nextVisualizer.id);
        onVisualizerChange?.(nextVisualizer.id, nextVisualizer.name);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [visualizers, activeVisualizer, onVisualizerChange]);
  
  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !managerRef.current) return;
    
    let animationId: number;
    
    const animate = () => {
      const audioData: AudioData = {
        userVolume: userAudio?.audioLevel || 0,
        aiVolume: aiAudio?.audioLevel || 0,
        userFrequencies: userAudio?.frequencyData || new Uint8Array(128),
        aiFrequencies: aiAudio?.frequencyData || new Uint8Array(128),
        isSpeaking: {
          user: userAudio?.isSpeaking || false,
          ai: aiAudio?.isSpeaking || false
        },
        timestamp: Date.now()
      };
      
      managerRef.current!.render(canvasRef.current!, audioData);
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [userAudio, aiAudio, activeVisualizer]);
  
  // Expose method to change visualizer externally
  useEffect(() => {
    const handleVisualizerChange = (e: CustomEvent<{ id: string }>) => {
      const { id } = e.detail;
      if (visualizers.find(v => v.id === id)) {
        setActiveVisualizer(id);
        managerRef.current?.setActive(id);
        const visualizer = visualizers.find(v => v.id === id);
        if (visualizer) {
          onVisualizerChange?.(visualizer.id, visualizer.name);
        }
      }
    };
    
    window.addEventListener('changeVisualizer', handleVisualizerChange as EventListener);
    return () => window.removeEventListener('changeVisualizer', handleVisualizerChange as EventListener);
  }, [visualizers, onVisualizerChange]);
  
  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Canvas for visualizations */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Transcript overlay */}
      <TranscriptOverlay meetingId={meetingId} />
      
      {/* Speaker indicators */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Show color mode indicator for single-zone visualizers */}
        {['orb-webgl', 'threads-webgl', 'unified-waves', 'reactive-matrix'].includes(activeVisualizer) && (
          <div className="bg-gray-900/90 backdrop-blur-lg rounded-xl p-3 border border-gray-800 mb-2">
            <p className="text-xs text-gray-400 mb-2">Color Mode</p>
            <div className="flex items-center gap-2">
              <div className={`
                w-3 h-3 rounded-full transition-all duration-500
                ${aiAudio?.isSpeaking && userAudio?.isSpeaking ? 'bg-purple-500' :
                  userAudio?.isSpeaking ? 'bg-pink-500' :
                  aiAudio?.isSpeaking ? 'bg-blue-500' :
                  'bg-indigo-500'}
              `} />
              <span className="text-sm text-gray-300">
                {aiAudio?.isSpeaking && userAudio?.isSpeaking ? 'Both Speaking' :
                 userAudio?.isSpeaking ? 'Your Voice' :
                 aiAudio?.isSpeaking ? 'AI Voice' :
                 'Ambient'}
              </span>
            </div>
          </div>
        )}
        <div className={`
          flex items-center space-x-3 backdrop-blur-lg rounded-full px-4 py-2 
          transition-all duration-300 transform
          ${aiAudio?.isSpeaking 
            ? 'bg-blue-900/50 scale-100 opacity-100' 
            : 'bg-blue-900/20 scale-95 opacity-60'
          }
        `}>
          <div className="relative">
            <div className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${aiAudio?.isSpeaking ? 'bg-blue-400' : 'bg-blue-600'}
            `} />
            {aiAudio?.isSpeaking && (
              <div className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping" />
            )}
          </div>
          <span className={`
            text-sm font-medium transition-colors duration-300
            ${aiAudio?.isSpeaking ? 'text-blue-100' : 'text-blue-300'}
          `}>
            AI {aiAudio?.isSpeaking ? 'Speaking' : 'Listening'}
          </span>
        </div>
        
        <div className={`
          flex items-center space-x-3 backdrop-blur-lg rounded-full px-4 py-2 
          transition-all duration-300 transform
          ${userAudio?.isSpeaking 
            ? 'bg-pink-900/50 scale-100 opacity-100' 
            : 'bg-pink-900/20 scale-95 opacity-60'
          }
        `}>
          <div className="relative">
            <div className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${userAudio?.isSpeaking ? 'bg-pink-400' : 'bg-pink-600'}
            `} />
            {userAudio?.isSpeaking && (
              <div className="absolute inset-0 w-3 h-3 bg-pink-400 rounded-full animate-ping" />
            )}
          </div>
          <span className={`
            text-sm font-medium transition-colors duration-300
            ${userAudio?.isSpeaking ? 'text-pink-100' : 'text-pink-300'}
          `}>
            You {userAudio?.isSpeaking ? 'Speaking' : 'Silent'}
          </span>
        </div>
      </div>
    </div>
  );
};