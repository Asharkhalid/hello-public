# Dual-Zone Audio Visualization System

## 🎯 Simplified Design Overview

A full-screen visualization system that displays AI voice effects at the top and human voice effects at the bottom, using the same animation type but with different colors and intensities. Users can switch between animation types via a simple dropdown.

## 🏗️ System Architecture

```
┌─────────────────────────────────────┐
│ 🤖 AI Zone (Top 50%)               │  ← AI voice affects this area
│     Animation + AI Audio Data       │
├─────────────────────────────────────┤
│ 👤 Human Zone (Bottom 50%)         │  ← Human voice affects this area  
│     Animation + Human Audio Data    │
└─────────────────────────────────────┘
    [Animation Selector Dropdown] ↗️
```

### Core Components

1. **DualZoneVisualizer** - Main component managing both zones
2. **AudioStreamManager** - Extracts and analyzes AI vs Human audio
3. **AnimationRenderer** - Renders selected animation in both zones
4. **AnimationSelector** - Simple dropdown for switching animations

## 🔧 Technical Implementation

### 1. Main Visualizer Component

```typescript
interface DualZoneVisualizerProps {
  inputStream?: MediaStream;    // Human audio
  outputStream?: MediaStream;   // AI audio
  className?: string;
}

interface AudioZoneData {
  audioLevel: number;           // 0-1
  frequencyData: Uint8Array;    // Raw frequency data
  frequencyBands: {
    low: number;               // 0-250Hz
    mid: number;               // 250-4000Hz
    high: number;              // 4000Hz+
  };
  isSpeaking: boolean;
}

interface DualZoneState {
  selectedAnimation: AnimationType;
  aiAudio: AudioZoneData;
  humanAudio: AudioZoneData;
  isInitialized: boolean;
}
```

### 2. Animation Registry

```typescript
type AnimationType = 'spiral' | 'dotted' | 'metamorphic' | 'gradient' | 'stars' | 'lamps' | 'canvas';

interface AnimationConfig {
  name: string;
  displayName: string;
  component: React.ComponentType<ZoneAnimationProps>;
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
```

### 3. Color Schemes

```typescript
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
```

## 🎨 Adapted Animation Components

Each animation will be adapted to work in dual zones:

### 1. SpiralAnimation (Adapted)
```typescript
interface SpiralZoneProps extends ZoneAnimationProps {
  totalDots?: number;
  dotRadius?: number;
  duration?: number;
}

const SpiralZone: React.FC<SpiralZoneProps> = ({ 
  audioData, 
  zone, 
  dimensions, 
  colors,
  totalDots = 300,
  dotRadius = 2,
  duration = 3 
}) => {
  // Audio-reactive parameters
  const reactiveDotRadius = dotRadius + (audioData.audioLevel * 3);
  const reactiveDuration = duration - (audioData.frequencyBands.high / 255 * 1.5);
  const reactiveColor = adjustColorIntensity(colors.primary, audioData.audioLevel);
  
  return (
    <SpiralAnimation
      totalDots={totalDots}
      size={Math.min(dimensions.width, dimensions.height)}
      dotRadius={reactiveDotRadius}
      duration={reactiveDuration}
      dotColor={reactiveColor}
      backgroundColor="transparent"
    />
  );
};
```

### 2. DottedBackground (Adapted)
```typescript
const DottedZone: React.FC<ZoneAnimationProps> = ({ audioData, zone, colors }) => {
  const reactiveOpacity = 0.3 + (audioData.audioLevel * 0.7);
  const reactiveDotSize = 2 + (audioData.frequencyBands.mid / 255 * 3);
  
  return (
    <DottedBackground
      dotColor={adjustColorIntensity(colors.primary, audioData.audioLevel)}
      dotSize={reactiveDotSize}
      dotSpacing={10}
      enableVignette={audioData.isSpeaking}
      style={{ opacity: reactiveOpacity }}
    />
  );
};
```

### 3. MetamorphicLoader (Adapted)
```typescript
const MetamorphicZone: React.FC<ZoneAnimationProps> = ({ audioData, zone, dimensions, colors }) => {
  const reactiveSize = Math.min(dimensions.width, dimensions.height) * (0.3 + audioData.audioLevel * 0.4);
  
  return (
    <div className="flex items-center justify-center w-full h-full">
      <MetamorphicLoader
        size={reactiveSize}
        color={colors.primary}
        lighteningStep={24 - (audioData.frequencyBands.high / 255 * 12)}
      />
    </div>
  );
};
```

## 🎛️ User Interface

### Animation Selector Component
```typescript
const AnimationSelector: React.FC<{
  selectedAnimation: AnimationType;
  onAnimationChange: (animation: AnimationType) => void;
}> = ({ selectedAnimation, onAnimationChange }) => {
  return (
    <div className="absolute top-4 right-4 z-50">
      <select
        value={selectedAnimation}
        onChange={(e) => onAnimationChange(e.target.value as AnimationType)}
        className="bg-black/50 text-white rounded-lg px-3 py-2 text-sm backdrop-blur-sm border border-white/20"
      >
        <option value="spiral">🌀 Spiral</option>
        <option value="dotted">⚫ Dotted</option>
        <option value="metamorphic">🔷 Morphic</option>
        <option value="gradient">🌈 Gradient</option>
        <option value="stars">⭐ Stars</option>
        <option value="lamps">💡 Lamps</option>
        <option value="canvas">🎯 Canvas</option>
      </select>
    </div>
  );
};
```

## 🔧 Complete Implementation Structure

### Main Component Structure
```typescript
// src/modules/call/ui/components/dual-zone-visualizer.tsx
export const DualZoneVisualizer: React.FC<DualZoneVisualizerProps> = ({
  inputStream,
  outputStream,
  className
}) => {
  const [selectedAnimation, setSelectedAnimation] = useState<AnimationType>('spiral');
  const [aiAudio, setAiAudio] = useState<AudioZoneData>(defaultAudioData);
  const [humanAudio, setHumanAudio] = useState<AudioZoneData>(defaultAudioData);
  
  // Audio analysis hooks
  useAudioAnalysis(outputStream, setAiAudio);    // AI audio
  useAudioAnalysis(inputStream, setHumanAudio);  // Human audio
  
  const AnimationComponent = ANIMATION_REGISTRY[selectedAnimation];
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* AI Zone - Top 50% */}
      <div className="absolute top-0 left-0 w-full h-1/2">
        <AnimationComponent
          audioData={aiAudio}
          zone="ai"
          dimensions={{ width: window.innerWidth, height: window.innerHeight / 2 }}
          colors={ZONE_COLORS.ai}
        />
      </div>
      
      {/* Human Zone - Bottom 50% */}
      <div className="absolute bottom-0 left-0 w-full h-1/2">
        <AnimationComponent
          audioData={humanAudio}
          zone="human"
          dimensions={{ width: window.innerWidth, height: window.innerHeight / 2 }}
          colors={ZONE_COLORS.human}
        />
      </div>
      
      {/* Animation Selector */}
      <AnimationSelector
        selectedAnimation={selectedAnimation}
        onAnimationChange={setSelectedAnimation}
      />
      
      {/* Optional Zone Labels */}
      <div className="absolute top-4 left-4 text-white/70 text-sm">
        🤖 AI
      </div>
      <div className="absolute bottom-4 left-4 text-white/70 text-sm">
        👤 You
      </div>
    </div>
  );
};
```

### Audio Analysis Hook
```typescript
// src/modules/call/hooks/use-audio-analysis.ts
const useAudioAnalysis = (
  stream: MediaStream | undefined, 
  onAudioData: (data: AudioZoneData) => void
) => {
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  
  useEffect(() => {
    if (!stream) return;
    
    const setupAudio = async () => {
      try {
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const analyser = audioContextRef.current.createAnalyser();
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        // Start analysis loop
        const analyze = () => {
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(frequencyData);
          
          const audioLevel = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
          const low = frequencyData.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
          const mid = frequencyData.slice(10, 50).reduce((a, b) => a + b, 0) / 40;
          const high = frequencyData.slice(50).reduce((a, b) => a + b, 0) / (frequencyData.length - 50);
          
          onAudioData({
            audioLevel,
            frequencyData,
            frequencyBands: { low, mid, high },
            isSpeaking: audioLevel > 0.01
          });
          
          requestAnimationFrame(analyze);
        };
        
        analyze();
      } catch (error) {
        console.error('Audio analysis setup failed:', error);
      }
    };
    
    setupAudio();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, onAudioData]);
};
```

## 🚀 Integration with Existing System

### Replace Current Visualizer
```typescript
// In src/modules/call/ui/components/call-active.tsx
// Replace AudioVisualizer3D with DualZoneVisualizer

import { DualZoneVisualizer } from './dual-zone-visualizer';

// In CallActive component:
<DualZoneVisualizer
  inputStream={inputStream}   // User microphone
  outputStream={outputStream} // AI audio output
  className="absolute inset-0 -z-10"
/>
```

## 📁 File Structure

```
src/modules/call/ui/components/
├── dual-zone-visualizer.tsx          # Main component
├── animations/
│   ├── spiral-zone.tsx               # Adapted SpiralAnimation
│   ├── dotted-zone.tsx               # Adapted DottedBackground
│   ├── metamorphic-zone.tsx          # Adapted MetamorphicLoader
│   ├── gradient-zone.tsx             # Adapted GradientAnimation
│   ├── stars-zone.tsx                # Adapted GlowingStars
│   ├── lamps-zone.tsx                # Adapted Lamps
│   ├── canvas-zone.tsx               # Adapted CanvasEffect
│   └── index.ts                      # Animation registry
└── animation-selector.tsx            # Dropdown component

src/modules/call/hooks/
└── use-audio-analysis.ts             # Audio analysis hook
```

## 🎯 Key Benefits

1. **Simple UX**: One dropdown, instant switching
2. **Real-time**: Immediate audio response in both zones
3. **Clean Architecture**: Easy to add new animations
4. **Performance**: Optimized for dual-zone rendering
5. **Visual Clarity**: Clear AI vs Human distinction
6. **Minimal UI**: Doesn't interfere with the call

## ⚡ Performance Optimizations

1. **Shared Audio Context**: Reuse analysis for similar frequencies
2. **Zone-based Rendering**: Only update active speaking zones
3. **Animation Pooling**: Reuse animation instances when switching
4. **Throttled Updates**: Limit audio analysis to 30fps
5. **Memory Cleanup**: Proper cleanup when switching animations

This simplified approach gives you the core functionality with a much cleaner implementation and better user experience! 