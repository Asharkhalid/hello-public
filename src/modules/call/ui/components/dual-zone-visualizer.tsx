"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useAudioAnalysis, type AudioZoneData } from '@/modules/call/hooks/use-audio-analysis';
import { AnimationSelector, type AnimationType } from './animation-selector';
import { 
  SpiralAnimation, 
  DottedBackground, 
  MetamorphicLoader,
  CanvasRevealEffect 
} from './animations/base-animations';

// Color schemes for different zones
const ZONE_COLORS = {
  ai: {
    primary: '#00f5ff',      // Cyan
    secondary: '#0080ff',    // Blue  
    accent: '#8000ff',       // Purple
  },
  human: {
    primary: '#ff6b35',      // Orange
    secondary: '#ff9500',    // Amber
    accent: '#ffcb05',       // Yellow
  }
} as const;

interface DualZoneVisualizerProps {
  inputStream?: MediaStream;    // Human audio
  outputStream?: MediaStream;   // AI audio
  className?: string;
}

interface ZoneAnimationProps {
  audioData: AudioZoneData;
  zone: 'ai' | 'human';
  dimensions: { width: number; height: number };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Utility function to adjust color intensity based on audio level
const adjustColorIntensity = (color: string, intensity: number): string => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Adjust intensity (0-1 range) - balanced visibility
  const factor = 0.3 + (intensity * 0.7); // Minimum 30% visibility, scales to 100%
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  return `rgb(${newR}, ${newG}, ${newB})`;
};

// Audio-reactive animation components
const SpiralZone: React.FC<ZoneAnimationProps> = ({ audioData, dimensions, colors }) => {
  // Much more subtle scaling - barely visible at 0%, normal at higher levels
  const baseOpacity = 0.1 + (audioData.audioLevel * 2); // 0.1 to 2.1 range
  const reactiveDotRadius = 0.5 + (audioData.audioLevel * 4);
  const reactiveDuration = 8 - (audioData.frequencyBands.high / 255 * 5);
  const reactiveColor = adjustColorIntensity(colors.primary, Math.max(audioData.audioLevel * 2, 0.1));
  const reactiveDots = Math.floor(20 + (audioData.audioLevel * 580)); // 20-600 dots based on audio
  
  return (
    <div style={{ opacity: Math.min(baseOpacity, 1) }}>
      <SpiralAnimation
        totalDots={reactiveDots}
        size={Math.min(dimensions.width, dimensions.height) * 0.6}
        dotRadius={reactiveDotRadius}
        duration={Math.max(reactiveDuration, 2)}
        dotColor={reactiveColor}
        backgroundColor="transparent"
      />
    </div>
  );
};

const DottedZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  // Much more sensitive to audio changes
  const reactiveOpacity = 0.2 + (audioData.audioLevel * 3); // More sensitive scaling
  const reactiveDotSize = 0.5 + (audioData.frequencyBands.mid / 255 * 3);
  const reactiveSpacing = 20 - (audioData.audioLevel * 12); // More responsive spacing
  
  return (
    <DottedBackground
      dotColor={adjustColorIntensity(colors.primary, Math.max(audioData.audioLevel * 3, 0.2))}
      dotSize={reactiveDotSize}
      dotSpacing={Math.max(reactiveSpacing, 6)}
      enableVignette={audioData.isSpeaking}
      style={{ opacity: Math.min(reactiveOpacity, 1) }}
    />
  );
};

const MetamorphicZone: React.FC<ZoneAnimationProps> = ({ audioData, dimensions, colors }) => {
  // Listening mode when quiet, active when speaking
  const reactiveSize = Math.min(dimensions.width, dimensions.height) * (0.05 + audioData.audioLevel * 0.7);
  const reactiveOpacity = 0.1 + (audioData.audioLevel * 1.5);
  
  return (
    <div className="flex items-center justify-center w-full h-full" style={{ opacity: Math.min(reactiveOpacity, 1) }}>
      <MetamorphicLoader
        size={Math.max(reactiveSize, 15)} // Very small minimum size
        color={colors.primary}
        lighteningStep={30 - (audioData.frequencyBands.high / 255 * 15)}
      />
    </div>
  );
};

const StarsZone: React.FC<ZoneAnimationProps> = ({ audioData, colors, zone }) => {
  // Much more sensitive and better spread
  const reactiveOpacity = 0.3 + (audioData.audioLevel * 2);
  const starCount = Math.floor(30 + audioData.audioLevel * 100); // More stars, more sensitive
  
  // Generate consistent star positions based on zone
  const stars = Array.from({ length: starCount }, (_, i) => {
    const seed = i + (zone === 'ai' ? 1000 : 2000); // Different patterns per zone
    const x = (Math.sin(seed * 0.1) * 0.5 + 0.5) * 100; // Spread across width
    const y = zone === 'ai' 
      ? (Math.cos(seed * 0.15) * 0.3 + 0.3) * 100 // AI: upper portion
      : (Math.cos(seed * 0.15) * 0.3 + 0.7) * 100; // Human: lower portion
    return { x, y, seed };
  });
  
  return (
    <div style={{ opacity: Math.min(reactiveOpacity, 1) }}>
      <div className="w-full h-full relative bg-transparent">
        <div className="absolute inset-0">
          {stars.map((star, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${1 + audioData.audioLevel * 4}px`,
                height: `${1 + audioData.audioLevel * 4}px`,
                backgroundColor: colors.primary,
                boxShadow: audioData.audioLevel > 0.05
                  ? `0 0 ${6 + audioData.audioLevel * 12}px ${colors.primary}` 
                  : `0 0 3px ${colors.primary}`,
                animation: audioData.audioLevel > 0.05
                  ? `pulse ${1 + Math.sin(star.seed) * 0.5}s ease-in-out infinite alternate`
                  : 'none',
                opacity: 0.4 + audioData.audioLevel * 0.6
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const LampsZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  // Much more sensitive to any audio input
  const reactiveOpacity = 0.2 + (audioData.audioLevel * 2.5); // More sensitive
  const lampIntensity = Math.max(audioData.audioLevel * 2, 0.1); // Enhanced scaling
  
  return (
    <div style={{ opacity: Math.min(reactiveOpacity, 1) }} className="w-full h-full relative">
      {/* Lamp beam effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative"
          style={{
            width: `${120 + lampIntensity * 180}px`,
            height: `${220 + lampIntensity * 80}px`,
          }}
        >
          {/* Lamp cone */}
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2"
            style={{
              width: `${25 + lampIntensity * 35}px`,
              height: `${70 + lampIntensity * 30}px`,
              background: `linear-gradient(to bottom, ${colors.primary}90, transparent)`,
              clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)',
              filter: `blur(${2 + lampIntensity * 2}px)`,
            }}
          />
          
          {/* Lamp bulb */}
          <div
            className="absolute top-2 left-1/2 transform -translate-x-1/2 rounded-full"
            style={{
              width: `${10 + lampIntensity * 6}px`,
              height: `${10 + lampIntensity * 6}px`,
              backgroundColor: colors.primary,
              boxShadow: `0 0 ${15 + lampIntensity * 15}px ${colors.primary}`,
            }}
          />
          
          {/* Ground illumination */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 rounded-full"
            style={{
              width: `${80 + lampIntensity * 100}px`,
              height: `${40 + lampIntensity * 20}px`,
              background: `radial-gradient(ellipse, ${colors.primary}50, transparent)`,
              filter: `blur(${3 + lampIntensity * 3}px)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const CanvasZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  // More visible and responsive canvas effect
  const reactiveOpacity = 0.3 + (audioData.audioLevel * 2); // Much more visible
  const reactiveAnimationSpeed = 0.3 + (audioData.audioLevel * 1.5);
  const dotDensity = Math.max(audioData.audioLevel, 0.1); // Minimum visibility
  
  // Convert hex to RGB array
  const hexToRgbArray = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 255, 255];
  };
  
  // More visible opacities
  const adjustedOpacities = [
    0.05 + dotDensity * 0.2,
    0.06 + dotDensity * 0.25,
    0.07 + dotDensity * 0.3,
    0.08 + dotDensity * 0.35,
    0.09 + dotDensity * 0.4,
    0.1 + dotDensity * 0.45,
    0.12 + dotDensity * 0.5,
    0.15 + dotDensity * 0.55,
    0.18 + dotDensity * 0.6,
    0.2 + dotDensity * 0.7,
  ];
  
  return (
    <div style={{ opacity: Math.min(reactiveOpacity, 1) }}>
      <CanvasRevealEffect
        animationSpeed={reactiveAnimationSpeed}
        colors={[hexToRgbArray(colors.primary), hexToRgbArray(colors.secondary)]}
        containerClassName="bg-transparent"
        showGradient={false}
        opacities={adjustedOpacities}
        dotSize={3 + audioData.audioLevel * 3}
      />
    </div>
  );
};

const VoiceZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  // Voice visualizer bars similar to the provided component
  const barCount = 48;
  const reactiveOpacity = 0.2 + (audioData.audioLevel * 2);
  
  return (
    <div style={{ opacity: Math.min(reactiveOpacity, 1) }} className="w-full h-full flex items-center justify-center">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: barCount }, (_, i) => {
          // Create wave-like effect with audio data
          const baseHeight = 10;
          const audioHeight = audioData.frequencyData[Math.floor(i * audioData.frequencyData.length / barCount)] || 0;
          const height = baseHeight + (audioHeight / 255) * 80;
          
          return (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: '2px',
                height: `${height}%`,
                backgroundColor: colors.primary,
                maxHeight: '90%',
                minHeight: audioData.audioLevel > 0.01 ? '10%' : '2%',
                opacity: 0.4 + (audioHeight / 255) * 0.6,
                boxShadow: audioData.audioLevel > 0.05 
                  ? `0 0 4px ${colors.primary}` 
                  : 'none',
                animationDelay: `${i * 20}ms`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Animation registry with voice effect (removed gradient)
const ANIMATION_REGISTRY: Record<AnimationType, React.ComponentType<ZoneAnimationProps>> = {
  spiral: SpiralZone,
  dotted: DottedZone,
  metamorphic: MetamorphicZone,
  stars: StarsZone,
  lamps: LampsZone,
  canvas: CanvasZone,
  voice: VoiceZone,
};

export const DualZoneVisualizer: React.FC<DualZoneVisualizerProps> = ({
  inputStream,
  outputStream,
  className
}) => {
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>('spiral');
  const [aiAudio, setAiAudio] = useState<AudioZoneData>({
    audioLevel: 0,
    frequencyData: new Uint8Array(128),
    frequencyBands: { low: 0, mid: 0, high: 0 },
    isSpeaking: false,
  });
  const [humanAudio, setHumanAudio] = useState<AudioZoneData>({
    audioLevel: 0,
    frequencyData: new Uint8Array(128),
    frequencyBands: { low: 0, mid: 0, high: 0 },
    isSpeaking: false,
  });
  
  // Audio analysis hooks
  useAudioAnalysis(outputStream, useCallback((data: AudioZoneData) => {
    setAiAudio(data);
  }, []));
  
  useAudioAnalysis(inputStream, useCallback((data: AudioZoneData) => {
    setHumanAudio(data);
  }, []));
  
  // Get dimensions for zones
  const dimensions = useMemo(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
  }), []);
  
  const AnimationComponent = ANIMATION_REGISTRY[selectedAnimation];
  
  return (
    <div className={`relative w-full h-full overflow-hidden bg-black ${className || ''}`}>
      {/* AI Zone - Top half */}
      <div className="absolute top-0 left-0 w-full h-1/2 overflow-hidden">
        <AnimationComponent
          audioData={aiAudio}
          zone="ai"
          dimensions={dimensions}
          colors={ZONE_COLORS.ai}
        />
      </div>
      
      {/* Human Zone - Bottom half */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 overflow-hidden">
        <AnimationComponent
          audioData={humanAudio}
          zone="human"
          dimensions={dimensions}
          colors={ZONE_COLORS.human}
        />
      </div>
      
      {/* Animation Selector - Bottom right */}
      <div className="absolute bottom-4 right-4 z-50">
        <AnimationSelector
          selectedAnimation={selectedAnimation}
          onAnimationChange={setSelectedAnimation}
        />
      </div>
      
      {/* Zone Labels */}
      <div 
        className="absolute top-4 left-4 text-sm font-medium transition-all duration-300"
        style={{ 
          color: aiAudio.isSpeaking ? '#00f5ff' : 'rgba(0, 245, 255, 0.6)',
          textShadow: aiAudio.isSpeaking ? '0 0 10px #00f5ff40' : 'none'
        }}
      >
        🤖 AI
        {aiAudio.isSpeaking && (
          <span className="ml-2 inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        )}
      </div>
      <div 
        className="absolute bottom-20 left-4 text-sm font-medium transition-all duration-300"
        style={{ 
          color: humanAudio.isSpeaking ? '#ff6b35' : 'rgba(255, 107, 53, 0.6)',
          textShadow: humanAudio.isSpeaking ? '0 0 10px #ff6b3540' : 'none'
        }}
      >
        👤 You
        {humanAudio.isSpeaking && (
          <span className="ml-2 inline-block w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        )}
      </div>
      
      {/* Audio level indicators (optional debug info) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/50 text-xs">
          AI: {Math.round(aiAudio.audioLevel * 100)}% | Human: {Math.round(humanAudio.audioLevel * 100)}%
        </div>
      )}
    </div>
  );
}; 