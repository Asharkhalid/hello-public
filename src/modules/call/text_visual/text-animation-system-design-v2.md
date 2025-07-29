# Text Animation System Design v2

## Overview

The text animation system provides a modular framework with three independent layers:
1. **Text Effects**: Visual styling and character-level effects
2. **Animation Patterns**: Movement and positioning behaviors  
3. **Agent Configuration**: Per-speaker customization

Each layer can be mixed and matched independently, creating unlimited combinations.

## Architecture Layers

### Layer 1: Text Effects (Visual Treatment)

Text effects modify the appearance of text without affecting position or movement.

#### Available Effects

**1. Blur Effect**
```typescript
interface BlurEffect {
  type: 'blur';
  initialBlur: number;      // Starting blur radius (0-20)
  finalBlur: number;        // Ending blur radius
  duration: number;         // Transition time
  easing: EasingFunction;
}
```

**2. Pressure Effect**
```typescript
interface PressureEffect {
  type: 'pressure';
  depth: number;            // Shadow depth
  angle: number;            // Shadow angle
  intensity: number;        // Pressure amount
  reactive: boolean;        // React to audio
}
```

**3. Glow Effect**
```typescript
interface GlowEffect {
  type: 'glow';
  color: string;            // Glow color
  radius: number;           // Glow radius
  intensity: number;        // Glow strength
  pulse: boolean;           // Pulsing glow
}
```

**4. Gradient Fill**
```typescript
interface GradientEffect {
  type: 'gradient';
  colors: string[];         // Gradient stops
  angle: number;            // Gradient angle
  animated: boolean;        // Moving gradient
}
```

**5. Typing Effect**
```typescript
interface TypingEffect {
  type: 'typing';
  speed: number;            // Characters per second
  cursor: boolean;          // Show cursor
  randomize: boolean;       // Random delays
}
```

**6. Morph Effect**
```typescript
interface MorphEffect {
  type: 'morph';
  method: 'letter' | 'word' | 'smooth';
  duration: number;
  particleEffect: boolean;
}
```

**7. Glitch Effect**
```typescript
interface GlitchEffect {
  type: 'glitch';
  frequency: number;        // Glitches per second
  intensity: number;        // Distortion amount
  duration: number;         // Glitch duration
}
```

**8. Wave Distortion**
```typescript
interface WaveEffect {
  type: 'wave';
  amplitude: number;        // Wave height
  frequency: number;        // Wave frequency
  speed: number;           // Animation speed
}
```

### Layer 2: Animation Patterns (Movement & Position)

Animation patterns control how text moves and where it appears, independent of visual effects.

#### Available Patterns

**1. Static Pattern**
```typescript
interface StaticPattern {
  type: 'static';
  position: Position;       // Fixed position
  alignment: Alignment;     // Text alignment
  stacking: 'vertical' | 'horizontal';
}
```

**2. Float Pattern**
```typescript
interface FloatPattern {
  type: 'float';
  driftSpeed: Vector2;      // Drift velocity
  boundingBox: Rectangle;   // Movement bounds
  collision: boolean;       // Collision detection
}
```

**3. Orbit Pattern**
```typescript
interface OrbitPattern {
  type: 'orbit';
  center: Position;         // Orbit center
  radius: number;          // Orbit radius
  speed: number;           // Rotation speed
  elliptical: boolean;     // Elliptical orbit
}
```

**4. Path Pattern**
```typescript
interface PathPattern {
  type: 'path';
  path: Path2D | SVGPath;  // Movement path
  duration: number;        // Path duration
  loop: boolean;          // Loop movement
}
```

**5. Grid Pattern**
```typescript
interface GridPattern {
  type: 'grid';
  columns: number;         // Grid columns
  rows: number;           // Grid rows
  spacing: number;        // Cell spacing
  fillOrder: 'sequential' | 'random';
}
```

**6. Cascade Pattern**
```typescript
interface CascadePattern {
  type: 'cascade';
  direction: Direction;    // Fall direction
  speed: number;          // Fall speed
  stagger: number;        // Stagger delay
}
```

**7. Bubble Pattern**
```typescript
interface BubblePattern {
  type: 'bubble';
  side: 'left' | 'right' | 'auto';
  tail: boolean;          // Speech bubble tail
  stack: boolean;         // Stack messages
}
```

**8. Elastic Pattern**
```typescript
interface ElasticPattern {
  type: 'elastic';
  anchor: Position;       // Anchor point
  elasticity: number;     // Spring constant
  damping: number;       // Damping factor
}
```

### Layer 3: Agent Configuration

Agent configuration allows per-speaker customization of effects and animations.

```typescript
interface AgentConfig {
  id: string;
  name: string;
  role: 'user' | 'assistant' | 'system';
  
  // Visual identity
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    gradient?: string[];
  };
  
  // Text effects preferences
  effects: {
    primary: TextEffect;
    secondary?: TextEffect;
    emphasis?: TextEffect;      // For important messages
  };
  
  // Animation preferences
  animation: {
    entryPattern: AnimationPattern;
    displayPattern: AnimationPattern;
    exitPattern: AnimationPattern;
    preferredZone?: ScreenZone;  // Preferred screen area
  };
  
  // Behavioral modifiers
  behavior: {
    priority: number;           // Display priority (0-100)
    persistence: number;        // How long to display
    grouping: boolean;          // Group consecutive messages
    interruption: 'queue' | 'replace' | 'overlay';
  };
  
  // Audio reactivity
  audioResponse: {
    volumeScale: boolean;       // Scale with voice volume
    frequencyMap: boolean;      // React to voice frequencies
    rhythmSync: boolean;        // Sync to speech rhythm
  };
}
```

## Composition System

The three layers combine independently:

```typescript
interface TextComposition {
  // Content
  text: string;
  speaker: AgentConfig;
  
  // Visual composition
  effects: TextEffect[];        // Can layer multiple effects
  animation: AnimationPattern;  // Current animation
  
  // Runtime state
  phase: 'entering' | 'active' | 'exiting';
  startTime: number;
  duration: number;
}
```

### Composition Examples

**Example 1: AI Assistant with Ethereal Style**
```typescript
const aiAgent: AgentConfig = {
  id: 'assistant-1',
  name: 'AI Assistant',
  role: 'assistant',
  colors: {
    primary: '#00BFFF',
    glow: '#00E5FF',
    gradient: ['#00BFFF', '#00E5FF', '#00BFFF']
  },
  effects: {
    primary: { type: 'blur', initialBlur: 10, finalBlur: 0 },
    secondary: { type: 'glow', radius: 20, pulse: true }
  },
  animation: {
    entryPattern: { type: 'float', driftSpeed: { x: 0.5, y: 0.3 } },
    displayPattern: { type: 'orbit', radius: 200, speed: 0.1 },
    exitPattern: { type: 'cascade', direction: 'up', speed: 100 }
  }
};
```

**Example 2: User with Direct Style**
```typescript
const userAgent: AgentConfig = {
  id: 'user-1',
  name: 'User',
  role: 'user',
  colors: {
    primary: '#FF006E',
    glow: '#FF0080'
  },
  effects: {
    primary: { type: 'typing', speed: 30, cursor: true }
  },
  animation: {
    entryPattern: { type: 'static', position: { x: 100, y: 'bottom-100' } },
    displayPattern: { type: 'static' },
    exitPattern: { type: 'static' }
  }
};
```

## Visualizer Presets

Each visualizer suggests default combinations but doesn't enforce them:

```typescript
interface VisualizerPreset {
  id: string;
  name: string;
  
  // Suggested defaults for agents
  agentDefaults: {
    user: Partial<AgentConfig>;
    assistant: Partial<AgentConfig>;
  };
  
  // Layout hints
  layout: {
    zones: ScreenZone[];        // Available zones
    maxConcurrent: number;      // Max texts shown
    collisionMode: 'prevent' | 'layer' | 'push';
  };
}
```

### Preset Examples

**Orb Visualizer Preset**
```typescript
const orbPreset: VisualizerPreset = {
  id: 'orb-webgl',
  name: 'Ethereal Orb',
  agentDefaults: {
    assistant: {
      effects: {
        primary: { type: 'blur', initialBlur: 15 },
        secondary: { type: 'glow', pulse: true }
      },
      animation: {
        entryPattern: { type: 'float' },
        displayPattern: { type: 'orbit', radius: 250 }
      }
    },
    user: {
      effects: {
        primary: { type: 'gradient', animated: true }
      },
      animation: {
        displayPattern: { type: 'float' }
      }
    }
  }
};
```

**Matrix Visualizer Preset**
```typescript
const matrixPreset: VisualizerPreset = {
  id: 'matrix',
  name: 'Digital Matrix',
  agentDefaults: {
    assistant: {
      effects: {
        primary: { type: 'typing', speed: 50 },
        secondary: { type: 'glitch', frequency: 0.1 }
      },
      animation: {
        entryPattern: { type: 'cascade', direction: 'down' }
      }
    }
  }
};
```

## Configuration API

### Runtime Configuration

```typescript
class TextAnimationSystem {
  // Configure agents
  configureAgent(config: AgentConfig): void;
  updateAgent(id: string, updates: Partial<AgentConfig>): void;
  
  // Configure effects independently
  addEffect(agentId: string, effect: TextEffect): void;
  removeEffect(agentId: string, effectType: string): void;
  
  // Configure animations independently  
  setAnimation(agentId: string, pattern: AnimationPattern): void;
  
  // Apply visualizer presets
  applyPreset(preset: VisualizerPreset): void;
  
  // Global settings
  setGlobalConfig(config: GlobalConfig): void;
}
```

### Effect Chaining

Effects can be chained and combined:

```typescript
// Combine multiple effects
const combinedEffects = [
  { type: 'blur', initialBlur: 20, finalBlur: 0, duration: 500 },
  { type: 'glow', radius: 10, pulse: true },
  { type: 'gradient', colors: ['#FF006E', '#FF0080'], animated: true }
];

// Apply based on conditions
if (isImportant) {
  effects.push({ type: 'pressure', depth: 5, reactive: true });
}
```

## Implementation Architecture

### Core Components

```typescript
// Core system
TextAnimationSystem
├── EffectEngine           // Handles all visual effects
├── AnimationEngine        // Handles all movement patterns
├── AgentManager          // Manages agent configurations
├── CompositionEngine     // Combines effects + animations
├── RenderPipeline        // Optimized rendering
└── AudioReactor          // Audio-reactive features

// Effects
TextEffect (interface)
├── BlurEffect
├── PressureEffect
├── GlowEffect
├── GradientEffect
├── TypingEffect
├── MorphEffect
├── GlitchEffect
└── WaveEffect

// Animations
AnimationPattern (interface)
├── StaticPattern
├── FloatPattern
├── OrbitPattern
├── PathPattern
├── GridPattern
├── CascadePattern
├── BubblePattern
└── ElasticPattern
```

### Performance Optimization

**Effect Rendering Pipeline**
```
Text → Effect Layer 1 → Effect Layer 2 → ... → Animation → Output
        (GPU)           (GPU)                   (GPU)       (Screen)
```

**Optimization Strategies**
1. **Effect Batching**: Group similar effects
2. **GPU Acceleration**: Use CSS transforms and filters
3. **Layer Caching**: Cache complex effect combinations
4. **LOD System**: Reduce effects based on performance

## Agent Templates

Pre-configured agent personalities:

```typescript
const agentTemplates = {
  // Calm, ethereal AI
  'ethereal-ai': {
    effects: ['blur', 'glow'],
    animation: 'orbit',
    colors: { primary: '#00BFFF', glow: '#00E5FF' }
  },
  
  // Energetic, playful AI
  'playful-ai': {
    effects: ['pressure', 'gradient'],
    animation: 'elastic',
    colors: { primary: '#FFD700', glow: '#FFA500' }
  },
  
  // Professional, clear AI
  'professional-ai': {
    effects: ['typing'],
    animation: 'static',
    colors: { primary: '#4A90E2' }
  },
  
  // Mysterious, cryptic AI
  'cryptic-ai': {
    effects: ['glitch', 'morph'],
    animation: 'float',
    colors: { primary: '#9B59B6', glow: '#8E44AD' }
  }
};
```

## Usage Examples

### Basic Usage
```typescript
// Configure an agent
const agent = {
  id: 'my-assistant',
  effects: {
    primary: { type: 'blur', initialBlur: 10 }
  },
  animation: {
    displayPattern: { type: 'float' }
  }
};

textSystem.configureAgent(agent);
```

### Dynamic Adaptation
```typescript
// Change effects based on content
if (message.emotion === 'excited') {
  textSystem.addEffect(agentId, { 
    type: 'pressure', 
    reactive: true 
  });
}

// Change animation based on screen space
if (screenIsCrowded) {
  textSystem.setAnimation(agentId, { 
    type: 'bubble', 
    stack: true 
  });
}
```

### Audio Reactivity
```typescript
// Effects respond to audio
const audioReactiveEffect = {
  type: 'glow',
  radius: 10,
  intensity: audioData.amplitude * 2,
  color: audioData.frequency > 1000 ? '#00FF00' : '#FF0000'
};
```

This revised design separates concerns properly:
- **Effects** are purely visual treatments
- **Animations** handle movement and positioning
- **Agents** configure personality and preferences
- All three layers can be mixed independently