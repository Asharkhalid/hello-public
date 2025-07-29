"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useAudioAnalysis, type AudioZoneData } from '@/modules/call/hooks/use-audio-analysis';
import { type AnimationType } from './animation-selector';
import { 
  SpiralAnimation, 
  DottedBackground, 
  MetamorphicLoader,
  CanvasRevealEffect 
} from './animations/base-animations';
import './audio-visualizer-styles.css';

// Enhanced modes from the new system
type EnhancedMode = "aura" | "glow" | "pulse" | "wave";
type CombinedAnimationType = AnimationType | EnhancedMode;

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

interface EnhancedDualZoneVisualizerProps {
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

// Enhanced Aura Zone (CSS-based like the new system)
const EnhancedAuraZone: React.FC<ZoneAnimationProps> = ({ audioData, colors, zone }) => {
  const intensity = audioData.audioLevel;
  const energy = Math.sqrt(audioData.frequencyBands.mid / 255);
  
  return (
    <div 
      className="enhanced-aura-zone"
      style={{
        '--volume-intensity': intensity,
        '--volume-energy': energy,
        '--zone-primary': colors.primary,
        '--zone-secondary': colors.secondary,
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } as React.CSSProperties}
    >
      <div className={`enhanced-aura enhanced-aura--${zone}`} />
      <style jsx>{`
        .enhanced-aura {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .enhanced-aura::before,
        .enhanced-aura::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          mix-blend-mode: plus-lighter;
          animation: enhanced-aura-pulse alternate ease-in-out infinite;
        }
        
        .enhanced-aura::before {
          width: calc(200px + var(--volume-intensity, 0) * 300px);
          height: calc(200px + var(--volume-intensity, 0) * 300px);
          background: var(--zone-primary);
          opacity: calc(0.3 + var(--volume-energy, 0) * 0.7);
          animation-duration: calc(2s - var(--volume-intensity, 0) * 0.5s);
          filter: blur(calc(20px + var(--volume-intensity, 0) * 30px));
        }
        
        .enhanced-aura::after {
          width: calc(120px + var(--volume-intensity, 0) * 180px);
          height: calc(120px + var(--volume-intensity, 0) * 180px);
          background: var(--zone-secondary);
          opacity: calc(0.2 + var(--volume-energy, 0) * 0.5);
          animation-duration: calc(3s - var(--volume-intensity, 0) * 1s);
          filter: blur(calc(15px + var(--volume-intensity, 0) * 20px));
        }
        
        @keyframes enhanced-aura-pulse {
          from {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.6;
          }
          to {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// Enhanced Glow Zone
const EnhancedGlowZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  const intensity = audioData.audioLevel;
  const energy = Math.sqrt(audioData.frequencyBands.high / 255);
  
  return (
    <div 
      className="enhanced-glow-zone"
      style={{
        '--volume-intensity': intensity,
        '--volume-energy': energy,
        '--zone-primary': colors.primary,
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } as React.CSSProperties}
    >
      <div className="enhanced-glow" />
      <style jsx>{`
        .enhanced-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(150px + var(--volume-intensity, 0) * 250px);
          height: calc(150px + var(--volume-intensity, 0) * 250px);
          border-radius: 50%;
          background: radial-gradient(
            circle,
            var(--zone-primary) 0%,
            transparent 70%
          );
          opacity: calc(0.4 + var(--volume-energy, 0) * 0.6);
          filter: blur(calc(25px + var(--volume-intensity, 0) * 35px));
          animation: enhanced-glow-pulse calc(2s - var(--volume-intensity, 0) * 0.8s) ease-in-out infinite alternate;
        }
        
        @keyframes enhanced-glow-pulse {
          from {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.3;
          }
          to {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};

// Enhanced Pulse Zone
const EnhancedPulseZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  const intensity = audioData.audioLevel;
  
  return (
    <div 
      className="enhanced-pulse-zone"
      style={{
        '--volume-intensity': intensity,
        '--zone-primary': colors.primary,
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } as React.CSSProperties}
    >
      <div className="enhanced-pulse-ring enhanced-pulse-ring--1" />
      <div className="enhanced-pulse-ring enhanced-pulse-ring--2" />
      <style jsx>{`
        .enhanced-pulse-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          border: 2px solid var(--zone-primary);
          animation: enhanced-pulse-expand ease-out infinite;
        }
        
        .enhanced-pulse-ring--1 {
          width: calc(80px + var(--volume-intensity, 0) * 120px);
          height: calc(80px + var(--volume-intensity, 0) * 120px);
          animation-duration: calc(2s - var(--volume-intensity, 0) * 0.5s);
          animation-delay: 0s;
        }
        
        .enhanced-pulse-ring--2 {
          width: calc(120px + var(--volume-intensity, 0) * 180px);
          height: calc(120px + var(--volume-intensity, 0) * 180px);
          animation-duration: calc(2s - var(--volume-intensity, 0) * 0.5s);
          animation-delay: -1s;
        }
        
        @keyframes enhanced-pulse-expand {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Enhanced Wave Zone
const EnhancedWaveZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  const intensity = audioData.audioLevel;
  const lowFreq = audioData.frequencyBands.low / 255;
  const midFreq = audioData.frequencyBands.mid / 255;
  const highFreq = audioData.frequencyBands.high / 255;
  
  return (
    <div 
      className="enhanced-wave-zone"
      style={{
        '--volume-intensity': intensity,
        '--freq-low': lowFreq,
        '--freq-mid': midFreq,
        '--freq-high': highFreq,
        '--zone-primary': colors.primary,
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } as React.CSSProperties}
    >
      <div className="enhanced-wave" />
      <style jsx>{`
        .enhanced-wave {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: calc(6px + var(--volume-intensity, 0) * 24px);
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--zone-primary) 25%,
            var(--zone-primary) 75%,
            transparent 100%
          );
          opacity: calc(0.4 + var(--freq-mid, 0) * 0.6);
          border-radius: calc(3px + var(--volume-intensity, 0) * 12px);
          animation: enhanced-wave-flow calc(3s - var(--volume-intensity, 0) * 1s) ease-in-out infinite;
        }
        
        @keyframes enhanced-wave-flow {
          0%, 100% {
            transform: translate(-50%, -50%) scaleX(0.7);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scaleX(1.3);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

// Existing animation components (from your original system)
const SpiralZone: React.FC<ZoneAnimationProps> = ({ audioData, dimensions, colors }) => {
  const baseOpacity = 0.1 + (audioData.audioLevel * 2);
  const reactiveDotRadius = 0.5 + (audioData.audioLevel * 4);
  const reactiveDuration = 8 - (audioData.frequencyBands.high / 255 * 5);
  const reactiveColor = colors.primary;
  const reactiveDots = Math.floor(20 + (audioData.audioLevel * 580));
  
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
  const reactiveOpacity = 0.2 + (audioData.audioLevel * 3);
  const reactiveDotSize = 0.5 + (audioData.frequencyBands.mid / 255 * 3);
  const reactiveSpacing = 20 - (audioData.audioLevel * 12);
  
  return (
    <DottedBackground
      dotColor={colors.primary}
      dotSize={reactiveDotSize}
      dotSpacing={Math.max(reactiveSpacing, 6)}
      enableVignette={audioData.isSpeaking}
      style={{ opacity: Math.min(reactiveOpacity, 1) }}
    />
  );
};

const MetamorphicZone: React.FC<ZoneAnimationProps> = ({ audioData, dimensions, colors }) => {
  const reactiveSize = Math.min(dimensions.width, dimensions.height) * (0.05 + audioData.audioLevel * 0.7);
  const reactiveOpacity = 0.1 + (audioData.audioLevel * 1.5);
  
  return (
    <div className="flex items-center justify-center w-full h-full" style={{ opacity: Math.min(reactiveOpacity, 1) }}>
      <MetamorphicLoader
        size={Math.max(reactiveSize, 15)}
        color={colors.primary}
        lighteningStep={30 - (audioData.frequencyBands.high / 255 * 15)}
      />
    </div>
  );
};

const CanvasZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  const reactiveOpacity = 0.3 + (audioData.audioLevel * 2);
  const reactiveAnimationSpeed = 0.3 + (audioData.audioLevel * 1.5);
  const dotDensity = Math.max(audioData.audioLevel, 0.1);
  
  const hexToRgbArray = (hex: string): number[] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 255, 255];
  };
  
  const adjustedOpacities = Array.from({ length: 10 }, (_, i) => 
    0.05 + (i * 0.01) + dotDensity * (0.2 + i * 0.05)
  );
  
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

// Stars Zone (from original system)
const StarsZone: React.FC<ZoneAnimationProps> = ({ audioData, colors, zone }) => {
  const reactiveOpacity = 0.3 + (audioData.audioLevel * 2);
  const starCount = Math.floor(30 + audioData.audioLevel * 100);
  
  const stars = Array.from({ length: starCount }, (_, i) => {
    const seed = i + (zone === 'ai' ? 1000 : 2000);
    const x = (Math.sin(seed * 0.1) * 0.5 + 0.5) * 100;
    const y = zone === 'ai' 
      ? (Math.cos(seed * 0.15) * 0.3 + 0.3) * 100
      : (Math.cos(seed * 0.15) * 0.3 + 0.7) * 100;
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

// Lamps Zone (from original system)
const LampsZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  const reactiveOpacity = 0.2 + (audioData.audioLevel * 2.5);
  const lampIntensity = Math.max(audioData.audioLevel * 2, 0.1);
  
  return (
    <div style={{ opacity: Math.min(reactiveOpacity, 1) }} className="w-full h-full relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative"
          style={{
            width: `${120 + lampIntensity * 180}px`,
            height: `${220 + lampIntensity * 80}px`,
          }}
        >
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
          
          <div
            className="absolute top-2 left-1/2 transform -translate-x-1/2 rounded-full"
            style={{
              width: `${10 + lampIntensity * 6}px`,
              height: `${10 + lampIntensity * 6}px`,
              backgroundColor: colors.primary,
              boxShadow: `0 0 ${15 + lampIntensity * 15}px ${colors.primary}`,
            }}
          />
          
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

// Voice Zone (from original system)
const VoiceZone: React.FC<ZoneAnimationProps> = ({ audioData, colors }) => {
  const barCount = 48;
  const reactiveOpacity = 0.2 + (audioData.audioLevel * 2);
  
  return (
    <div style={{ opacity: Math.min(reactiveOpacity, 1) }} className="w-full h-full flex items-center justify-center">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: barCount }, (_, i) => {
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

// Combined animation registry
const ANIMATION_REGISTRY: Record<CombinedAnimationType, React.ComponentType<ZoneAnimationProps>> = {
  // Original animations
  spiral: SpiralZone,
  dotted: DottedZone,
  metamorphic: MetamorphicZone,
  stars: StarsZone,
  lamps: LampsZone,
  canvas: CanvasZone,
  voice: VoiceZone,
  // Enhanced modes
  aura: EnhancedAuraZone,
  glow: EnhancedGlowZone,
  pulse: EnhancedPulseZone,
  wave: EnhancedWaveZone,
};

export const EnhancedDualZoneVisualizer: React.FC<EnhancedDualZoneVisualizerProps> = ({
  inputStream,
  outputStream,
  className
}) => {
  const [selectedAnimation, setSelectedAnimation] = useState<CombinedAnimationType>('aura');
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
      
      {/* Enhanced Animation Selector */}
      <div className="absolute bottom-4 right-4 z-50">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <div className="text-white text-xs mb-2 text-center">Animation</div>
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(ANIMATION_REGISTRY).map((animationType) => (
              <button
                key={animationType}
                onClick={() => setSelectedAnimation(animationType as CombinedAnimationType)}
                className={`
                  px-2 py-1 text-xs rounded transition-all
                  ${selectedAnimation === animationType 
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50' 
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                  }
                `}
                title={`Switch to ${animationType} animation`}
              >
                {animationType}
              </button>
            ))}
          </div>
        </div>
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
      
      {/* Audio level indicators */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/50 text-xs">
          AI: {Math.round(aiAudio.audioLevel * 100)}% | Human: {Math.round(humanAudio.audioLevel * 100)}% | Mode: {selectedAnimation}
        </div>
      )}
    </div>
  );
}; 