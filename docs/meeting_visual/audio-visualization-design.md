# Audio Visualization System Design

## Overview
A simple, extensible audio visualization system with transcript display for AI voice calls. Supports multiple visualization styles and distinguishes between AI and user voice through colors/animations.

## Core Architecture

### 1. Base Visualizer Interface
```typescript
interface AudioVisualizer {
  id: string;
  name: string;
  render(canvas: HTMLCanvasElement, audioData: AudioData): void;
}

interface AudioData {
  userVolume: number;      // 0-1
  aiVolume: number;        // 0-1
  userFrequencies: Uint8Array;
  aiFrequencies: Uint8Array;
  isSpeaking: {
    user: boolean;
    ai: boolean;
  };
}
```

### 2. Visualization Manager Component
```typescript
const VisualizationManager: React.FC = () => {
  const userAudio = useAudioAnalysis(userStream);
  const aiAudio = useAudioAnalysis(aiStream);
  const [activeVisualizer, setActiveVisualizer] = useState('waves');
  
  return (
    <div className="relative h-full w-full">
      {/* Canvas for visualization */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      {/* Transcript overlay */}
      <TranscriptOverlay />
      
      {/* Visualizer selector */}
      <VisualizerSelector 
        current={activeVisualizer}
        onChange={setActiveVisualizer}
      />
    </div>
  );
};
```

### 3. Built-in Visualizers

#### CSS Aura (Stream.io style)
```typescript
const AuraVisualizer: React.FC<AudioData> = ({ userVolume, aiVolume }) => {
  return (
    <>
      <div 
        className="aura-user"
        style={{
          '--volume': userVolume,
          background: 'radial-gradient(circle, #ff006e, transparent)',
          transform: `scale(calc(0.5 + var(--volume)))`
        }}
      />
      <div 
        className="aura-ai"
        style={{
          '--volume': aiVolume,
          background: 'radial-gradient(circle, #00d9ff, transparent)',
          transform: `scale(calc(0.5 + var(--volume)))`
        }}
      />
    </>
  );
};
```

#### Waves Visualizer
```typescript
class WavesVisualizer implements AudioVisualizer {
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    
    // Draw user wave (bottom half)
    this.drawWave(ctx, audioData.userFrequencies, '#ff006e', canvas.height * 0.75);
    
    // Draw AI wave (top half)
    this.drawWave(ctx, audioData.aiFrequencies, '#00d9ff', canvas.height * 0.25);
  }
  
  private drawWave(ctx: CanvasRenderingContext2D, frequencies: Uint8Array, color: string, yOffset: number) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    
    for (let i = 0; i < frequencies.length; i++) {
      const x = (i / frequencies.length) * ctx.canvas.width;
      const amplitude = (frequencies[i] / 255) * 50;
      const y = yOffset + Math.sin(i * 0.1) * amplitude;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
  }
}
```

#### Dot Grid Visualizer
```typescript
class DotGridVisualizer implements AudioVisualizer {
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        const isUserZone = y > canvas.height / 2;
        const volume = isUserZone ? audioData.userVolume : audioData.aiVolume;
        const color = isUserZone ? '#ff006e' : '#00d9ff';
        
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2 + volume * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 2 + volume * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
```

### 4. Transcript Display
```typescript
const TranscriptOverlay: React.FC = () => {
  const transcripts = useTranscripts();
  
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 max-h-1/3 overflow-y-auto">
      {transcripts.slice(-10).map((entry) => (
        <div 
          key={entry.id}
          className={`mb-2 p-2 rounded ${
            entry.speaker === 'user' ? 'bg-pink-900/20 text-left' : 'bg-blue-900/20 text-right'
          }`}
        >
          <span className="text-xs opacity-70">{entry.speaker}</span>
          <p>{entry.text}</p>
        </div>
      ))}
    </div>
  );
};
```

### 5. Existing Visualizer Adapter
```typescript
// Wrap existing DualZoneVisualizer
class DualZoneAdapter implements AudioVisualizer {
  id = 'dual-zone';
  name = 'Dual Zone';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    // Render existing component to canvas
    // or mount as React component overlay
  }
}
```

## Color Scheme
- **User Voice**: Pink/Red spectrum (#ff006e, #ff4458)
- **AI Voice**: Blue/Cyan spectrum (#00d9ff, #0891b2)
- **Neutral/Background**: Dark grays (#111827, #1f2937)

## Performance Considerations
1. Use `requestAnimationFrame` for 60fps
2. Canvas for complex animations
3. CSS for simple effects
4. Throttle audio analysis to ~30fps
5. Limit transcript history to last 10-20 entries

## Adding New Visualizers
```typescript
// 1. Implement the interface
class MyVisualizer implements AudioVisualizer {
  id = 'my-viz';
  name = 'My Visualizer';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    // Your visualization logic
  }
}

// 2. Register with manager
visualizerManager.register(new MyVisualizer());
```

## Integration Points
1. **Audio Analysis**: Reuse existing `useAudioAnalysis` hook
2. **Transcript Collection**: Connect to existing transcript service
3. **UI Components**: Integrate into `CallActive` component
4. **Stream.io**: Use their audio streams directly

## Benefits
- Simple interface for adding new visualizers
- Clear separation between user and AI voice
- Reuses existing audio infrastructure
- Minimal changes to current codebase
- Performance optimized with canvas/CSS split