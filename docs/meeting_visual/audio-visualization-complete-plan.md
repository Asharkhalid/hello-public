# Audio Visualization System - Complete Design & Implementation Plan

## Overview
Build an extensible audio visualization system that displays both AI and user voice with visual effects and transcripts. The system supports multiple visualization styles and clearly distinguishes between speakers through colors and positioning.

## Design Goals
1. **Simple & Extensible**: Easy to add new visualizers
2. **Performance**: Smooth 60fps animations
3. **Clear Speaker Distinction**: Visual separation of AI and user
4. **Reuse Existing Code**: Leverage current audio analysis
5. **Best Practices**: TypeScript, React hooks, clean architecture

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│                CallActive Component              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │         AudioVisualization Component       │ │
│  │                                           │ │
│  │  ┌─────────────┐  ┌──────────────────┐  │ │
│  │  │   Canvas    │  │   Transcript     │  │ │
│  │  │ Visualizer  │  │    Overlay       │  │ │
│  │  └─────────────┘  └──────────────────┘  │ │
│  │                                           │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │      Visualizer Selector            │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
                          │
                          ├── useAudioAnalysis (existing)
                          ├── useTranscripts (new)
                          └── VisualizationManager
```

### Data Flow

```typescript
// Audio streams from Stream.io
userStream ──┐
             ├──> useAudioAnalysis ──> AudioData ──> Visualizer.render()
aiStream ────┘

// Transcripts from webhook
OpenAI Events ──> TranscriptCollector ──> useTranscripts ──> TranscriptOverlay
```

## Implementation Plan

### Phase 1: Core Infrastructure (1.5 hours)

#### 1.1 Create Type Definitions
**File:** `src/modules/call/visualization/types.ts`

```typescript
export interface AudioVisualizer {
  id: string;
  name: string;
  render(canvas: HTMLCanvasElement, audioData: AudioData): void;
  cleanup?(): void;
}

export interface AudioData {
  userVolume: number;      // 0-1
  aiVolume: number;        // 0-1
  userFrequencies: Uint8Array;
  aiFrequencies: Uint8Array;
  isSpeaking: {
    user: boolean;
    ai: boolean;
  };
  timestamp: number;
}

export interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: number;
}
```

#### 1.2 Create Visualization Manager
**File:** `src/modules/call/visualization/manager.ts`

```typescript
export class VisualizationManager {
  private visualizers = new Map<string, AudioVisualizer>();
  private activeId: string = 'waves';
  
  register(visualizer: AudioVisualizer) {
    this.visualizers.set(visualizer.id, visualizer);
  }
  
  setActive(id: string) {
    const current = this.visualizers.get(this.activeId);
    current?.cleanup?.();
    
    if (this.visualizers.has(id)) {
      this.activeId = id;
    }
  }
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const visualizer = this.visualizers.get(this.activeId);
    visualizer?.render(canvas, audioData);
  }
  
  getAvailable() {
    return Array.from(this.visualizers.values()).map(v => ({
      id: v.id,
      name: v.name
    }));
  }
}
```

#### 1.3 Create Transcript Hook
**File:** `src/modules/call/hooks/use-transcripts.ts`

```typescript
export const useTranscripts = (meetingId: string) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  
  useEffect(() => {
    // Subscribe to transcript updates
    const unsubscribe = TranscriptCollector.subscribe(meetingId, (entry) => {
      setTranscripts(prev => [...prev.slice(-50), entry]); // Keep last 50
    });
    
    return unsubscribe;
  }, [meetingId]);
  
  return transcripts;
};
```

### Phase 2: Built-in Visualizers (2 hours)

#### 2.1 Waves Visualizer
**File:** `src/modules/call/visualization/visualizers/waves.ts`

```typescript
export class WavesVisualizer implements AudioVisualizer {
  id = 'waves';
  name = 'Sound Waves';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines for visual separation
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // User wave (bottom half)
    this.drawWave(
      ctx, 
      audioData.userFrequencies, 
      '#ff006e', 
      canvas.height * 0.75, 
      audioData.userVolume,
      audioData.timestamp
    );
    
    // AI wave (top half)
    this.drawWave(
      ctx, 
      audioData.aiFrequencies, 
      '#00d9ff', 
      canvas.height * 0.25, 
      audioData.aiVolume,
      audioData.timestamp
    );
  }
  
  private drawWave(
    ctx: CanvasRenderingContext2D, 
    frequencies: Uint8Array, 
    color: string, 
    yBase: number, 
    volume: number,
    timestamp: number
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + volume * 3;
    ctx.globalAlpha = 0.3 + volume * 0.7;
    ctx.beginPath();
    
    const step = ctx.canvas.width / frequencies.length;
    
    for (let i = 0; i < frequencies.length; i++) {
      const x = i * step;
      const amplitude = (frequencies[i] / 255) * 50 * (0.5 + volume);
      const y = yBase + Math.sin(i * 0.1 + timestamp * 0.001) * amplitude;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
```

#### 2.2 Dot Grid Visualizer
**File:** `src/modules/call/visualization/visualizers/dot-grid.ts`

```typescript
export class DotGridVisualizer implements AudioVisualizer {
  id = 'dot-grid';
  name = 'Dot Grid';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gridSize = 25;
    const time = audioData.timestamp * 0.001;
    
    for (let x = gridSize/2; x < canvas.width; x += gridSize) {
      for (let y = gridSize/2; y < canvas.height; y += gridSize) {
        const isUserZone = y > canvas.height / 2;
        const volume = isUserZone ? audioData.userVolume : audioData.aiVolume;
        const frequencies = isUserZone ? audioData.userFrequencies : audioData.aiFrequencies;
        const color = isUserZone ? '#ff006e' : '#00d9ff';
        
        // Get frequency for this position
        const freqIndex = Math.floor((x / canvas.width) * frequencies.length);
        const freqValue = frequencies[freqIndex] / 255;
        
        // Create ripple effect from center
        const centerX = canvas.width / 2;
        const centerY = isUserZone ? canvas.height * 0.75 : canvas.height * 0.25;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const wave = Math.sin(distance * 0.02 - time * 3 - freqValue * Math.PI) * 0.5 + 0.5;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = (0.1 + volume * 0.4 + freqValue * 0.3) * wave;
        ctx.beginPath();
        ctx.arc(x, y, 1 + volume * 6 + freqValue * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }
}
```

#### 2.3 Orb Visualizer
**File:** `src/modules/call/visualization/visualizers/orb.ts`

```typescript
export class OrbVisualizer implements AudioVisualizer {
  id = 'orb';
  name = 'Energy Orbs';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // User orb
    this.drawOrb(
      ctx,
      canvas.width / 2,
      canvas.height * 0.75,
      audioData.userVolume,
      audioData.userFrequencies,
      '#ff006e',
      audioData.timestamp
    );
    
    // AI orb
    this.drawOrb(
      ctx,
      canvas.width / 2,
      canvas.height * 0.25,
      audioData.aiVolume,
      audioData.aiFrequencies,
      '#00d9ff',
      audioData.timestamp
    );
  }
  
  private drawOrb(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    volume: number,
    frequencies: Uint8Array,
    color: string,
    timestamp: number
  ) {
    // Calculate average frequency
    const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length / 255;
    
    // Multiple layers for glow effect
    for (let i = 3; i > 0; i--) {
      const radius = (50 + volume * 100) * i;
      const alpha = (0.1 + volume * 0.2) / i;
      
      // Create gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '88');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.globalAlpha = alpha;
      
      // Pulsing effect
      const pulse = Math.sin(timestamp * 0.003 + i) * 0.1 + 1;
      
      ctx.beginPath();
      ctx.arc(x, y, radius * pulse * (0.8 + avgFreq * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }
}
```

#### 2.4 Existing Visualizer Adapter
**File:** `src/modules/call/visualization/visualizers/dual-zone-adapter.ts`

```typescript
export class DualZoneAdapter implements AudioVisualizer {
  id = 'dual-zone';
  name = 'Dual Zone (Classic)';
  private container: HTMLElement | null = null;
  private root: Root | null = null;
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    // For React component, we'll mount it as overlay
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'absolute inset-0';
      canvas.parentElement?.appendChild(this.container);
      this.root = createRoot(this.container);
    }
    
    // Hide canvas when using React component
    canvas.style.display = 'none';
    
    // Render existing component
    this.root?.render(
      <DualZoneVisualizer
        humanAudioData={{
          audioLevel: audioData.userVolume,
          frequencyData: audioData.userFrequencies,
          isSpeaking: audioData.isSpeaking.user
        }}
        aiAudioData={{
          audioLevel: audioData.aiVolume,
          frequencyData: audioData.aiFrequencies,
          isSpeaking: audioData.isSpeaking.ai
        }}
      />
    );
  }
  
  cleanup() {
    this.root?.unmount();
    this.container?.remove();
  }
}
```

### Phase 3: Integration Components (1.5 hours)

#### 3.1 Transcript Overlay Component
**File:** `src/modules/call/ui/components/transcript-overlay.tsx`

```typescript
export const TranscriptOverlay: React.FC<{ meetingId: string }> = ({ meetingId }) => {
  const transcripts = useTranscripts(meetingId);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
      <div 
        ref={containerRef}
        className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide"
      >
        {transcripts.slice(-10).map((entry) => (
          <div
            key={entry.id}
            className={`
              p-2 rounded-lg backdrop-blur-sm max-w-md
              ${entry.speaker === 'user' 
                ? 'ml-auto bg-pink-900/20 text-pink-100' 
                : 'mr-auto bg-blue-900/20 text-blue-100'
              }
            `}
          >
            <p className="text-xs opacity-70 mb-1">
              {entry.speaker === 'user' ? 'You' : 'AI Assistant'}
            </p>
            <p className="text-sm">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 3.2 Main Audio Visualization Component
**File:** `src/modules/call/ui/components/audio-visualization.tsx`

```typescript
export const AudioVisualization: React.FC<{ 
  userStream: MediaStream | null;
  aiStream: MediaStream | null;
  meetingId: string;
}> = ({ userStream, aiStream, meetingId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<VisualizationManager>();
  const [activeVisualizer, setActiveVisualizer] = useState('waves');
  const [visualizers, setVisualizers] = useState<Array<{id: string, name: string}>>([]);
  
  // Get audio data
  const userAudio = useAudioAnalysis(userStream);
  const aiAudio = useAudioAnalysis(aiStream);
  
  // Initialize manager
  useEffect(() => {
    const manager = new VisualizationManager();
    
    // Register all visualizers
    manager.register(new WavesVisualizer());
    manager.register(new DotGridVisualizer());
    manager.register(new OrbVisualizer());
    manager.register(new DualZoneAdapter());
    
    managerRef.current = manager;
    setVisualizers(manager.getAvailable());
  }, []);
  
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
  
  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Canvas for visualizations */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Transcript overlay */}
      <TranscriptOverlay meetingId={meetingId} />
      
      {/* Visualizer selector */}
      <div className="absolute top-4 right-4 z-10">
        <select
          value={activeVisualizer}
          onChange={(e) => {
            setActiveVisualizer(e.target.value);
            managerRef.current?.setActive(e.target.value);
          }}
          className="bg-gray-800/90 backdrop-blur text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-gray-500"
        >
          {visualizers.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
      
      {/* Speaker indicators */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {aiAudio?.isSpeaking && (
          <div className="flex items-center space-x-2 bg-blue-900/50 backdrop-blur px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-100 text-sm">AI Speaking</span>
          </div>
        )}
        {userAudio?.isSpeaking && (
          <div className="flex items-center space-x-2 bg-pink-900/50 backdrop-blur px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
            <span className="text-pink-100 text-sm">You're Speaking</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

#### 3.3 Update CallActive Component
**File:** `src/modules/call/ui/components/call-active.tsx`

In the CallActive component, replace the existing visualizer with:

```typescript
// Remove or comment out:
// <EnhancedDualZoneVisualizer ... />

// Add:
<AudioVisualization 
  userStream={inputStream}
  aiStream={outputStream}
  meetingId={meetingId}
/>
```

### Phase 4: Transcript Integration (30 minutes)

#### 4.1 Update Transcript Collector
**File:** `src/lib/transcript/collector.ts`

Add event emission to existing collector:

```typescript
import { EventEmitter } from 'events';

class TranscriptCollectorClass extends EventEmitter {
  async storeChunk(
    meetingId: string,
    speakerType: 'user' | 'agent',
    text: string
  ): Promise<void> {
    // Existing storage logic...
    
    // Emit event for real-time updates
    this.emit(`transcript:${meetingId}`, {
      id: crypto.randomUUID(),
      speaker: speakerType === 'agent' ? 'assistant' : 'user',
      text,
      timestamp: Date.now()
    });
  }
  
  subscribe(meetingId: string, callback: (entry: TranscriptEntry) => void) {
    this.on(`transcript:${meetingId}`, callback);
    return () => this.off(`transcript:${meetingId}`, callback);
  }
}
```

## Testing Plan

### Unit Tests
1. Test each visualizer renders without errors
2. Test manager registration and switching
3. Test transcript subscription

### Integration Tests
1. Verify audio data flows correctly
2. Test visualizer switching during active call
3. Verify transcript display updates

### Performance Tests
1. Monitor FPS with Performance API
2. Check memory usage over time
3. Test with different window sizes

## Deployment Checklist
- [ ] All visualizers render correctly
- [ ] Audio levels reflect actual speech
- [ ] Transcripts appear in real-time
- [ ] No console errors
- [ ] Smooth 60fps performance
- [ ] Visualizer switching works
- [ ] Colors match design (user: pink, AI: blue)

## Future Enhancements
1. Add more visualizers (particles, 3D, etc.)
2. Customizable color themes
3. Audio-reactive backgrounds
4. Save visualizer preference
5. Export visualization as video

Let's start implementing!