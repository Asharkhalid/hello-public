# Audio Visualization Implementation Guide

## Quick Start
Build an extensible audio visualization system with transcript display in 5 hours.

## Phase 1: Core Infrastructure (1.5 hours)

### 1.1 Create Visualizer Types
```typescript
// src/modules/call/visualization/types.ts
export interface AudioVisualizer {
  id: string;
  name: string;
  render(canvas: HTMLCanvasElement, audioData: AudioData): void;
}

export interface AudioData {
  userVolume: number;
  aiVolume: number;
  userFrequencies: Uint8Array;
  aiFrequencies: Uint8Array;
  isSpeaking: {
    user: boolean;
    ai: boolean;
  };
}
```

### 1.2 Create Visualization Manager
```typescript
// src/modules/call/visualization/manager.ts
export class VisualizationManager {
  private visualizers = new Map<string, AudioVisualizer>();
  private activeId: string = 'waves';
  
  register(visualizer: AudioVisualizer) {
    this.visualizers.set(visualizer.id, visualizer);
  }
  
  setActive(id: string) {
    if (this.visualizers.has(id)) {
      this.activeId = id;
    }
  }
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const visualizer = this.visualizers.get(this.activeId);
    if (visualizer) {
      visualizer.render(canvas, audioData);
    }
  }
}
```

### 1.3 Create Manager Hook
```typescript
// src/modules/call/hooks/use-visualization-manager.ts
export const useVisualizationManager = () => {
  const managerRef = useRef<VisualizationManager>();
  
  useEffect(() => {
    const manager = new VisualizationManager();
    
    // Register built-in visualizers
    manager.register(new WavesVisualizer());
    manager.register(new DotGridVisualizer());
    manager.register(new OrbVisualizer());
    
    managerRef.current = manager;
  }, []);
  
  return managerRef.current;
};
```

## Phase 2: Built-in Visualizers (2 hours)

### 2.1 Waves Visualizer
```typescript
// src/modules/call/visualization/visualizers/waves.ts
export class WavesVisualizer implements AudioVisualizer {
  id = 'waves';
  name = 'Waves';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // User wave (bottom)
    this.drawWave(ctx, audioData.userFrequencies, '#ff006e', 
                  canvas.height * 0.75, audioData.userVolume);
    
    // AI wave (top)
    this.drawWave(ctx, audioData.aiFrequencies, '#00d9ff', 
                  canvas.height * 0.25, audioData.aiVolume);
  }
  
  private drawWave(ctx: CanvasRenderingContext2D, frequencies: Uint8Array, 
                   color: string, yBase: number, volume: number) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + volume * 3;
    ctx.globalAlpha = 0.3 + volume * 0.7;
    ctx.beginPath();
    
    const step = ctx.canvas.width / frequencies.length;
    
    for (let i = 0; i < frequencies.length; i++) {
      const x = i * step;
      const amplitude = (frequencies[i] / 255) * 50 * (0.5 + volume);
      const y = yBase + Math.sin(i * 0.1 + Date.now() * 0.001) * amplitude;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
```

### 2.2 Dot Grid Visualizer
```typescript
// src/modules/call/visualization/visualizers/dot-grid.ts
export class DotGridVisualizer implements AudioVisualizer {
  id = 'dot-grid';
  name = 'Dot Grid';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const gridSize = 30;
    const time = Date.now() * 0.001;
    
    for (let x = gridSize/2; x < canvas.width; x += gridSize) {
      for (let y = gridSize/2; y < canvas.height; y += gridSize) {
        const isUserZone = y > canvas.height / 2;
        const volume = isUserZone ? audioData.userVolume : audioData.aiVolume;
        const color = isUserZone ? '#ff006e' : '#00d9ff';
        
        // Wave effect
        const distance = Math.sqrt(
          Math.pow(x - canvas.width/2, 2) + 
          Math.pow(y - canvas.height/2, 2)
        );
        const wave = Math.sin(distance * 0.01 - time * 2) * 0.5 + 0.5;
        
        ctx.fillStyle = color;
        ctx.globalAlpha = (0.1 + volume * 0.5) * wave;
        ctx.beginPath();
        ctx.arc(x, y, 2 + volume * 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }
}
```

### 2.3 CSS Aura Visualizer
```typescript
// src/modules/call/visualization/visualizers/aura.tsx
export const AuraVisualizer: React.FC<{audioData: AudioData}> = ({ audioData }) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* User aura */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-300"
        style={{
          background: `radial-gradient(circle, rgba(255, 0, 110, ${0.2 + audioData.userVolume * 0.6}), transparent)`,
          transform: `translateX(-50%) translateY(50%) scale(${0.8 + audioData.userVolume * 0.4})`,
        }}
      />
      
      {/* AI aura */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-300"
        style={{
          background: `radial-gradient(circle, rgba(0, 217, 255, ${0.2 + audioData.aiVolume * 0.6}), transparent)`,
          transform: `translateX(-50%) translateY(-50%) scale(${0.8 + audioData.aiVolume * 0.4})`,
        }}
      />
    </div>
  );
};
```

## Phase 3: Integration (1.5 hours)

### 3.1 Create Main Visualization Component
```typescript
// src/modules/call/ui/components/audio-visualization.tsx
export const AudioVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const manager = useVisualizationManager();
  const [activeVisualizer, setActiveVisualizer] = useState('waves');
  
  // Get audio data
  const userAudio = useAudioAnalysis(userStream);
  const aiAudio = useAudioAnalysis(aiStream);
  
  // Animation loop
  useEffect(() => {
    if (!canvasRef.current || !manager) return;
    
    const audioData: AudioData = {
      userVolume: userAudio?.audioLevel || 0,
      aiVolume: aiAudio?.audioLevel || 0,
      userFrequencies: userAudio?.frequencyData || new Uint8Array(128),
      aiFrequencies: aiAudio?.frequencyData || new Uint8Array(128),
      isSpeaking: {
        user: userAudio?.isSpeaking || false,
        ai: aiAudio?.isSpeaking || false
      }
    };
    
    const animate = () => {
      manager.render(canvasRef.current!, audioData);
      requestAnimationFrame(animate);
    };
    
    animate();
  }, [manager, userAudio, aiAudio]);
  
  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Canvas visualizers */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={window.innerWidth}
        height={window.innerHeight}
      />
      
      {/* CSS visualizers */}
      {activeVisualizer === 'aura' && <AuraVisualizer audioData={audioData} />}
      
      {/* Transcript overlay */}
      <TranscriptOverlay />
      
      {/* Visualizer selector */}
      <div className="absolute top-4 right-4 z-10">
        <select
          value={activeVisualizer}
          onChange={(e) => {
            setActiveVisualizer(e.target.value);
            manager?.setActive(e.target.value);
          }}
          className="bg-gray-800 text-white px-3 py-1 rounded"
        >
          <option value="waves">Waves</option>
          <option value="dot-grid">Dot Grid</option>
          <option value="aura">Aura</option>
          <option value="dual-zone">Dual Zone (Classic)</option>
        </select>
      </div>
    </div>
  );
};
```

### 3.2 Update CallActive Component
```typescript
// In src/modules/call/ui/components/call-active.tsx
// Replace existing visualizer with:
<AudioVisualization />
```

## Testing Checklist
- [ ] Audio levels reflect actual speech
- [ ] User and AI voices show different colors
- [ ] Smooth 60fps animation
- [ ] Visualizer switching works
- [ ] Transcripts display correctly
- [ ] No memory leaks

## Adding Custom Visualizers
```typescript
// 1. Create your visualizer
class MyCustomVisualizer implements AudioVisualizer {
  id = 'custom';
  name = 'My Custom';
  
  render(canvas: HTMLCanvasElement, audioData: AudioData) {
    // Your visualization code
  }
}

// 2. Register in manager
manager.register(new MyCustomVisualizer());
```

## Performance Tips
1. Use `requestAnimationFrame` for smooth animation
2. Clear canvas each frame to prevent trails
3. Throttle complex calculations
4. Use CSS transforms for GPU acceleration
5. Limit transcript entries shown

## Common Issues
- **No visualization**: Check audio streams are connected
- **Laggy animation**: Reduce calculation complexity
- **Wrong colors**: Verify user/AI stream assignment
- **Canvas sizing**: Handle window resize events