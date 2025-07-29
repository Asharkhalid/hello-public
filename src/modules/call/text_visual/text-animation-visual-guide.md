# Text Animation Visual Implementation Guide

## Animation Flow Diagrams

### 1. Subtitle Classic (Bottom Bar)

```
Time: 0s
┌─────────────────────────────────────┐
│                                     │
│         [Visualization]             │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
         ↓ (fade in from bottom)

Time: 0.5s
┌─────────────────────────────────────┐
│                                     │
│         [Visualization]             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ AI: Hello, how can I help you?  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

Time: 3s (new text arrives)
┌─────────────────────────────────────┐
│                                     │
│         [Visualization]             │
│ ┌─────────────────────────────────┐ │
│ │ AI: Hello, how can I help you?  │ │ (moves up)
│ ├─────────────────────────────────┤ │
│ │ User: I need help with coding   │ │ (fades in)
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. Orbital Text (Around Orb)

```
         Text orbits around center
              ↓
    "Hello" →  ⟲  ← "Welcome"
            ╱ ○ ╲
           ╱ ORB ╲
    "AI" →        ← "User"
            ╲   ╱
             ⟳
              ↑
        Text follows orbital path

Depth layers:
- Front texts: full opacity, larger
- Back texts: reduced opacity, smaller
```

### 3. Wave Rider (Following Threads)

```
Wave crest positions for text:
     Text 1
       ↓
    ╱╲    ╱╲    ╱╲
   ╱  ╲  ╱  ╲  ╱  ╲   ← Wave threads
  ╱    ╲╱    ╲╱    ╲
        ↑      ↑
     Text 2  Text 3

Text follows wave undulation:
t=0s:  ___Hello___
t=1s:  ╱─Hello─╲
t=2s: ╱  Hello  ╲
```

### 4. Matrix Rain

```
│T│ │ │A│ │H│ │ │ │
│h│ │ │I│ │e│ │ │ │
│i│ │ │:│ │l│ │ │ │
│s│ │ │ │ │l│ │T│ │
│ │ │ │H│ │o│ │h│ │
│i│ │ │e│ │,│ │i│ │
│s│ │ │l│ │ │ │s│ │
│ │ │ │l│ │h│ │ │ │
│a│ │ │o│ │o│ │i│ │
│ │ │ │ │ │w│ │s│ │
│t│ │ │ │ │ │ │ │ │
│e│ │ │ │ │c│ │a│ │
│s│ │ │ │ │a│ │ │ │
│t│ │ │ │ │n│ │t│ │
↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
```

### 5. Floating Bubbles

```
     ○─"How are"─○           ○─"Great!"─○
       ╲        ╱                    ╱
        ╲      ╱                    ╱
         ╲    ╱      ○─"Hello"─○   ╱
          ╲  ╱            │       ╱
           ╲╱             │      ╱
           AI            You    AI

Bubble physics:
- Gentle drift: vx = sin(time) * 0.5
- Soft bounce: vy = cos(time) * 0.3
- Collision: Repel with spring force
```

## Text State Machine

```
                 ┌─────────┐
                 │ QUEUED  │
                 └────┬────┘
                      │ Space available
                      ↓
                 ┌─────────┐
            ┌────│ENTERING │────┐
            │    └────┬────┘    │
            │         │         │ Collision
            │    Animation      │ detected
            │    complete       │
            │         ↓         ↓
            │    ┌─────────┐  ┌──────────┐
            │    │DISPLAYED│  │REPOSITION│
            │    └────┬────┘  └────┬─────┘
            │         │            │
            │    Time expired      │
            │         ↓            │
            │    ┌─────────┐      │
            └────│ EXITING │←─────┘
                 └────┬────┘
                      │ Animation done
                      ↓
                 ┌─────────┐
                 │ REMOVED │
                 └─────────┘
```

## Collision Detection Grid

```
Screen divided into collision grid:
┌───┬───┬───┬───┬───┬───┬───┬───┐
│ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │
├───┼───┼───┼───┼───┼───┼───┼───┤
│ 8 │ 9 │[T1]─────┤15 │16 │17 │  T1: Text 1 occupies
├───┼───┼───┼───┼───┼───┼───┼───┤      cells 10-13
│18 │19 │20 │21 │22 │23 │24 │25 │  T2: Text 2 occupies
├───┼───┼───┼───┼───┼───┼───┼───┤      cells 28-29
│26 │27 │[T2]│30 │31 │32 │33 │34 │
└───┴───┴───┴───┴───┴───┴───┴───┘

Collision check: O(1) grid lookup
```

## Animation Easing Curves

```
Entry (ease-out):          Exit (ease-in):
│                         │
│         ╱───            │    ───╲
│       ╱                 │        ╲
│     ╱                   │          ╲
│   ╱                     │            ╲
│ ╱                       │              ╲
└──────────────►          └──────────────►
  Time                      Time

Elastic (bounce):          Wave (sine):
│      ╱╲                 │    ╱╲    ╱╲
│    ╱    ╲  ╱─           │  ╱    ╲╱    ╲
│  ╱        ╲╱            │╱            
│╱                        │
└──────────────►          └──────────────►
  Time                      Time
```

## Performance Optimization Layers

```
Layer 1: CSS-only animations (60 FPS)
├── transform: translate3d()
├── opacity transitions
└── will-change hints

Layer 2: JavaScript animations (30-60 FPS)
├── Custom easing functions
├── Physics simulations
└── Collision detection

Layer 3: Canvas/WebGL effects (30 FPS)
├── Particle systems
├── Glow effects
└── Distortion effects

Degradation strategy:
High-end → All layers active
Mid-range → Layers 1-2 only
Low-end → Layer 1 only
```

## Responsive Breakpoints

```
Desktop (>1200px):
┌─────────────────────────────────┐
│ ┌─────┐                ┌─────┐ │
│ │Info │  Visualization  │Status│ │
│ └─────┘                └─────┘ │
│  Multiple floating texts shown  │
│ ┌─────────────────────────────┐ │
│ │      Control Bar           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

Tablet (768-1200px):
┌─────────────────────┐
│ Info | Status       │
│  Visualization      │
│  2-3 texts max      │
│ ┌─────────────────┐ │
│ │   Controls      │ │
│ └─────────────────┘ │
└─────────────────────┘

Mobile (<768px):
┌──────────────┐
│Info │ Status │
│Visualization │
│              │
│ ┌──────────┐ │
│ │Single text│ │
│ └──────────┘ │
│              │
│  [Controls]  │
└──────────────┘
```

## Memory Management

```
Text Element Pool:
┌─────────────────────────────────────┐
│ Active: [T1] [T2] [T3]              │
│ Pool:   [T4] [T5] [T6] [T7] [T8]    │
└─────────────────────────────────────┘
         ↑               ↓
      Recycle         Reuse

Instead of creating/destroying DOM:
- Reuse pooled elements
- Reset styles and content
- Hide instead of remove
```

## Configuration Examples

```javascript
// Orb configuration
{
  id: 'orb-ethereal',
  animator: 'FloatingAnimator',
  config: {
    entryDuration: 800,
    displayDuration: 4000,
    exitDuration: 1000,
    layout: 'orbital',
    origin: { x: 'random', y: 'center' },
    effects: ['glow', 'blur'],
    colors: {
      user: 'rgba(255, 0, 111, 0.9)',
      ai: 'rgba(0, 191, 255, 0.9)'
    }
  }
}

// Matrix configuration
{
  id: 'matrix-rain',
  animator: 'MatrixAnimator',
  config: {
    entryDuration: 2000,
    displayDuration: 3000,
    exitDuration: 1500,
    layout: 'columns',
    origin: { x: 'spread', y: 'top' },
    font: {
      family: 'monospace',
      size: '14px',
      color: '#00ff00'
    }
  }
}
```