# Text Animation Implementation Plan

## Phase 1: Foundation (Core System)

### 1.1 Create Base Types and Interfaces
```typescript
// types.ts
- TranscriptChunk interface
- AnimatedText interface
- TextAnimationConfig interface
- TextAnimator abstract interface
- Position and animation state types
```

### 1.2 Build Base Animator Class
```typescript
// base-animator.ts
- Abstract BaseTextAnimator class
- Common functionality:
  - DOM element pooling
  - Basic lifecycle (enter/display/exit)
  - Configuration management
  - Event handling
```

### 1.3 Create Text Animation Manager
```typescript
// text-animation-manager.ts
- Singleton manager class
- Animator registration
- Visualizer binding
- Global configuration
- Performance monitoring
```

### 1.4 Implement Queue System
```typescript
// transcript-queue.ts
- FIFO queue with priority support
- Rate limiting
- Deduplication
- Speaker-based grouping
```

## Phase 2: Core Animators

### 2.1 Subtitle Animator (Default)
```typescript
// animators/subtitle-animator.ts
- Traditional bottom bar layout
- Stack management for multiple texts
- Smooth transitions between texts
- Clean, professional appearance
```

### 2.2 Floating Animator
```typescript
// animators/floating-animator.ts
- Random/strategic positioning
- Collision detection
- Gentle drift physics
- Depth layering
```

### 2.3 Wave Animator
```typescript
// animators/wave-animator.ts
- Sine wave path following
- Synchronized with audio waves
- Text rides along crests
- Smooth undulation
```

## Phase 3: Integration

### 3.1 Update Transcript Overlay
```typescript
// Modify transcript-overlay.tsx
- Remove current static display
- Integrate TextAnimationManager
- Pass transcripts to animation system
- Handle visualizer changes
```

### 3.2 Connect to Visualizers
```typescript
// Update audio-visualization.tsx
- Add text animator property to visualizers
- Pass animator preference to manager
- Coordinate colors with visualizer
```

### 3.3 Create Configuration Presets
```typescript
// text-animation-presets.ts
const presets = {
  'orb-webgl': {
    animator: 'floating',
    config: { /* Ethereal floating config */ }
  },
  'threads-webgl': {
    animator: 'wave',
    config: { /* Wave rider config */ }
  },
  // ... etc
}
```

## Phase 4: Advanced Features

### 4.1 Effects System
```typescript
// effects/
- glow-effect.ts (CSS box-shadow based)
- blur-effect.ts (backdrop-filter)
- particle-effect.ts (Canvas overlay)
- distortion-effect.ts (CSS transforms)
```

### 4.2 Additional Animators
```typescript
// animators/
- matrix-animator.ts (Matrix rain style)
- orbital-animator.ts (Circular orbits)
- bubble-animator.ts (Chat bubbles)
- terminal-animator.ts (Command line style)
```

### 4.3 Collision System
```typescript
// collision-manager.ts
- Spatial grid partitioning
- Bounding box detection
- Force-based separation
- Performance optimized
```

## Implementation Details

### File Structure
```
src/modules/call/text-animations/
├── types.ts
├── base-animator.ts
├── text-animation-manager.ts
├── transcript-queue.ts
├── collision-manager.ts
├── text-animation-presets.ts
├── animators/
│   ├── subtitle-animator.ts
│   ├── floating-animator.ts
│   ├── wave-animator.ts
│   ├── matrix-animator.ts
│   ├── orbital-animator.ts
│   ├── bubble-animator.ts
│   └── terminal-animator.ts
├── effects/
│   ├── glow-effect.ts
│   ├── blur-effect.ts
│   ├── particle-effect.ts
│   └── distortion-effect.ts
└── utils/
    ├── easing.ts
    ├── physics.ts
    └── dom-pool.ts
```

### Key Implementation Patterns

#### 1. DOM Element Pooling
```typescript
class DOMPool {
  private available: HTMLElement[] = [];
  private inUse: Set<HTMLElement> = new Set();
  
  acquire(): HTMLElement {
    const element = this.available.pop() || this.createElement();
    this.inUse.add(element);
    return element;
  }
  
  release(element: HTMLElement): void {
    this.resetElement(element);
    this.inUse.delete(element);
    this.available.push(element);
  }
}
```

#### 2. Animation Frame Loop
```typescript
class AnimationLoop {
  private lastTime = 0;
  private animators: Map<string, TextAnimator> = new Map();
  
  private tick = (time: number) => {
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    
    for (const animator of this.animators.values()) {
      animator.update(deltaTime);
    }
    
    requestAnimationFrame(this.tick);
  };
}
```

#### 3. Visualizer Binding
```typescript
interface VisualizerBinding {
  visualizerId: string;
  animatorId: string;
  configOverrides?: Partial<TextAnimationConfig>;
  dynamicConfig?: (audioData: AudioData) => Partial<TextAnimationConfig>;
}

class TextAnimationManager {
  private bindings: Map<string, VisualizerBinding> = new Map();
  
  bindVisualizer(binding: VisualizerBinding): void {
    this.bindings.set(binding.visualizerId, binding);
  }
}
```

### Performance Targets

1. **Frame Rate**: Maintain 60 FPS with up to 5 concurrent texts
2. **Memory**: < 10MB for text animation system
3. **CPU**: < 5% usage when idle, < 15% during animations
4. **DOM Operations**: Batch updates in single frame
5. **Initialization**: < 100ms to start showing first text

### Testing Strategy

1. **Unit Tests**
   - Animator lifecycle methods
   - Queue operations
   - Collision detection algorithms
   - Configuration merging

2. **Integration Tests**
   - Visualizer switching
   - Transcript flow pipeline
   - Performance under load
   - Memory leak detection

3. **Visual Tests**
   - Screenshot comparisons
   - Animation smoothness
   - Text readability
   - Mobile responsiveness

### Accessibility Compliance

1. **ARIA Live Regions**: Announce new transcripts
2. **Contrast Ratios**: WCAG AA compliance
3. **Motion Preferences**: Respect prefers-reduced-motion
4. **Keyboard Navigation**: Tab through transcripts
5. **Screen Reader**: Hidden descriptive text

### Browser Support

- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari 14+
- Chrome Android 90+

### Configuration UI (Future)

```typescript
interface TextAnimationSettings {
  // Global settings
  enabled: boolean;
  maxConcurrent: number;
  defaultDuration: number;
  
  // Per-visualizer overrides
  visualizerSettings: {
    [visualizerId: string]: {
      animatorId: string;
      config: Partial<TextAnimationConfig>;
    };
  };
  
  // Accessibility
  reduceMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
}
```

## Success Metrics

1. **User Engagement**: 80% of users keep animations enabled
2. **Performance**: 95% of frames rendered at 60 FPS
3. **Reliability**: < 0.1% transcript display failures
4. **Accessibility**: 100% WCAG AA compliance
5. **Mobile**: Smooth performance on 2019+ devices