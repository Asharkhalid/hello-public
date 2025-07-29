# Audio Visualization System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AUDIO VISUALIZATION SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                   │
│  ┌─────────────────────┐                                        ┌──────────────────────┐         │
│  │   AUDIO SOURCES     │                                        │   VISUAL OUTPUT      │         │
│  │                     │                                        │                      │         │
│  │  ┌──────────────┐   │     ┌─────────────────────────┐      │  ┌───────────────┐  │         │
│  │  │ User Stream  ├───┼────▶│                         │      │  │ Canvas        │  │         │
│  │  └──────────────┘   │     │   Web Audio API        │      │  │ Visualization │  │         │
│  │                     │     │                         │      │  └───────────────┘  │         │
│  │  ┌──────────────┐   │     │  ┌─────────────────┐  │      │                      │         │
│  │  │ AI Stream    ├───┼────▶│  │ AudioContext    │  │      │  ┌───────────────┐  │         │
│  │  └──────────────┘   │     │  │ AnalyserNode    │  │      │  │ Transcript    │  │         │
│  └─────────────────────┘     │  │ FFT Analysis    │  │      │  │ Overlay       │  │         │
│                              │  └─────────────────┘  │      │  └───────────────┘  │         │
│                              └───────────┬───────────┘      └──────────────────────┘         │
│                                          │                                                     │
│                                          ▼                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              FRONTEND LAYER                                            │   │
│  ├───────────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                        │   │
│  │  ┌──────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐    │   │
│  │  │  AudioVisualization  │    │     Custom Hooks     │    │  Visualization      │    │   │
│  │  │    Component         │    │                      │    │     Manager         │    │   │
│  │  │                      │    │  ┌───────────────┐  │    │                      │    │   │
│  │  │  • Canvas Ref        │◀───┤  │useAudioAnalysis│  │    │  • Register Viz     │    │   │
│  │  │  • Visualizer Sel.   │    │  └───────────────┘  │    │  • Active Control   │    │   │
│  │  │  • Animation Loop    │    │                      │    │  • Render Pipeline  │    │   │
│  │  │  • Keyboard Control  │    │  ┌───────────────┐  │    └──────────┬───────────┘    │   │
│  │  └──────────────────────┘    │  │ useTranscripts│  │              │                  │   │
│  │                              │  └───────────────┘  │              ▼                  │   │
│  │  ┌──────────────────────┐    │                      │    ┌──────────────────────┐    │   │
│  │  │  TranscriptOverlay   │◀───┤  ┌───────────────┐  │    │   12 VISUALIZERS    │    │   │
│  │  │    Component         │    │  │useConversation│  │    │                      │    │   │
│  │  │                      │    │  │    State      │  │    ├─ Single-Zone (5) ───┤    │   │
│  │  │  • Auto-scroll       │    │  └───────────────┘  │    │  • UnifiedWaves     │    │   │
│  │  │  • Speaker Colors    │    └─────────────────────┘    │  • MorphingBlob     │    │   │
│  │  │  • Max 10 entries    │                                │  • DNAHelix         │    │   │
│  │  └──────────────────────┘                                │  • ReactiveMatrix   │    │   │
│  │                                                           │  • PlasmaFlow       │    │   │
│  └───────────────────────────────────────────────────────────┼─ Dual-Zone (7) ─────┤    │   │
│                                                              │  • Waves            │    │   │
│                                                              │  • SpectrumBars     │    │   │
│                                                              │  • Circular         │    │   │
│                                                              │  • Particles        │    │   │
│                                                              │  • DotGrid          │    │   │
│                                                              │  • Orb              │    │   │
│                                                              │  • DualZoneAdapter  │    │   │
│                                                              └──────────────────────┘    │   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     DATA FLOW                                               │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  AUDIO PROCESSING PIPELINE:                                                                 │
│  ─────────────────────────                                                                 │
│                                                                                             │
│   MediaStream ──▶ AudioContext ──▶ AnalyserNode ──▶ FFT Data ──▶ AudioZoneData            │
│       │                                                               │                     │
│       │                                                               ▼                     │
│       │                                                     ┌─────────────────┐            │
│       │                                                     │  Frequency Data  │            │
│       └────────────────────────────────────────────────────▶│  • Low Band     │            │
│                                                             │  • Mid Band     │            │
│                                                             │  • High Band    │            │
│                                                             │  • Volume Level │            │
│                                                             │  • Speaking Flag│            │
│                                                             └─────────────────┘            │
│                                                                                             │
│  TRANSCRIPT FLOW:                                                                           │
│  ───────────────                                                                           │
│                                                                                             │
│   OpenAI Events ──▶ Webhook ──▶ TranscriptCollector ──▶ Database ──▶ API Endpoint         │
│        │                              │                                    │                │
│        │                              │                                    ▼                │
│        │                              │                          ┌──────────────────┐      │
│        │                              │                          │ /api/meetings/    │      │
│        │                              │                          │ [id]/transcripts │      │
│        │                              │                          └────────┬─────────┘      │
│        │                              │                                   │                 │
│        │                              └───── EventEmitter ────────────────┼─────▶ UI       │
│        │                                                                  │                 │
│        │                                                                  ▼                 │
│        │                                                         HTTP Polling (2s)          │
│        │                                                                                    │
│        └─────────────▶ ConversationStateTracker ──▶ State Machine ──▶ UI Updates          │
│                                                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture Detail

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                               COMPONENT ARCHITECTURE                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  FRONTEND COMPONENTS:                                                                       │
│  ───────────────────                                                                       │
│                                                                                             │
│  ┌─── AudioVisualization.tsx ────────────────────────────────────────────┐                │
│  │                                                                        │                │
│  │  Props: { userStream, aiStream, meetingId }                          │                │
│  │                                                                        │                │
│  │  State Management:                                                     │                │
│  │    • activeVisualizer: string                                         │                │
│  │    • visualizers: Array<{id, name}>                                   │                │
│  │    • userAudio: AudioZoneData | null                                  │                │
│  │    • aiAudio: AudioZoneData | null                                    │                │
│  │                                                                        │                │
│  │  Features:                                                            │                │
│  │    • Tab key cycling through visualizers                              │                │
│  │    • Real-time canvas rendering at 60fps                              │                │
│  │    • Dynamic speaker indicators                                       │                │
│  │    • Color mode indicator for single-zone visualizers                 │                │
│  │                                                                        │                │
│  └────────────────────────────────────────────────────────────────────────┘                │
│                                                                                             │
│  ┌─── TranscriptOverlay.tsx ─────────────────────────────────────────────┐                │
│  │                                                                        │                │
│  │  Props: { meetingId }                                                 │                │
│  │                                                                        │                │
│  │  Features:                                                            │                │
│  │    • Auto-scrolling transcript display                                │                │
│  │    • Maximum 10 recent entries                                        │                │
│  │    • Speaker-based color coding (Pink=User, Blue=AI)                  │                │
│  │    • HTTP polling every 2 seconds                                     │                │
│  │                                                                        │                │
│  └────────────────────────────────────────────────────────────────────────┘                │
│                                                                                             │
│  BACKEND COMPONENTS:                                                                        │
│  ──────────────────                                                                        │
│                                                                                             │
│  ┌─── Webhook Route (/api/webhook) ──────────────────────────────────────┐                │
│  │                                                                        │                │
│  │  Handles Events:                                                      │                │
│  │    • call.session_started - Initialize realtime connection            │                │
│  │    • realtime.event - Process transcripts and state changes           │                │
│  │    • call.session_ended - Cleanup and process meeting                 │                │
│  │    • call.transcription_ready - Legacy transcript handling            │                │
│  │                                                                        │                │
│  │  Integrations:                                                        │                │
│  │    • OpenAI Realtime API                                              │                │
│  │    • Stream Video SDK                                                 │                │
│  │    • TranscriptCollector                                              │                │
│  │    • ConversationStateTracker                                         │                │
│  │                                                                        │                │
│  └────────────────────────────────────────────────────────────────────────┘                │
│                                                                                             │
│  ┌─── TranscriptCollector ───────────────────────────────────────────────┐                │
│  │                                                                        │                │
│  │  Singleton Service:                                                   │                │
│  │    • Stores transcript chunks with sequence numbers                   │                │
│  │    • Emits real-time events via EventEmitter                          │                │
│  │    • Handles database persistence (server-side only)                  │                │
│  │    • Provides subscription mechanism for UI updates                   │                │
│  │                                                                        │                │
│  └────────────────────────────────────────────────────────────────────────┘                │
│                                                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Color System & Speaker Detection

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                              COLOR MAPPING SYSTEM                                           │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  SPEAKER DETECTION:                                                                         │
│  ─────────────────                                                                         │
│                                                                                             │
│   Audio Analysis ──▶ Volume Threshold ──▶ isSpeaking Flag                                 │
│                            │                                                                │
│                            └─▶ threshold = 0.01                                             │
│                                                                                             │
│  COLOR TRANSITIONS:                                                                         │
│  ─────────────────                                                                         │
│                                                                                             │
│   ┌────────────────┬──────────────────┬─────────────────┬──────────────────┐             │
│   │  SPEAKER STATE │  PRIMARY COLOR   │  RGB VALUE      │  USAGE           │             │
│   ├────────────────┼──────────────────┼─────────────────┼──────────────────┤             │
│   │  User Speaking │  Pink            │  rgb(236,72,153) │  User voice      │             │
│   │  AI Speaking   │  Blue            │  rgb(59,130,246) │  AI voice        │             │
│   │  Both Speaking │  Purple          │  rgb(147,51,234) │  Overlap         │             │
│   │  None Speaking │  Indigo          │  rgb(99,102,241) │  Ambient/Idle    │             │
│   └────────────────┴──────────────────┴─────────────────┴──────────────────┘             │
│                                                                                             │
│  TRANSITION TIMING:                                                                         │
│  ─────────────────                                                                         │
│                                                                                             │
│   Previous Color ──▶ Smooth Interpolation ──▶ Current Color                               │
│                            │                                                                │
│                            └─▶ 300-500ms transition                                        │
│                                                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Current Issues & Technical Details

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 KNOWN ISSUES                                                │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  1. COLOR STRING CONCATENATION BUG:                                                         │
│     • Issue: rgb() + '88' creates invalid CSS (e.g., "rgb(236,72,153)88")                 │
│     • Location: Color utility functions adding alpha incorrectly                           │
│     • Fix: Use rgba() or proper alpha channel handling                                     │
│                                                                                             │
│  2. CANVAS RENDERING ERRORS:                                                                │
│     • Issue: Negative radius in arc() calls                                                │
│     • Cause: Invalid calculations in some visualizers                                      │
│     • Fix: Add Math.max(0, radius) guards                                                  │
│                                                                                             │
│  3. DATABASE ACCESS ON CLIENT:                                                              │
│     • Issue: TranscriptCollector tries to access DB from client-side                       │
│     • Solution: Added typeof window === 'undefined' checks                                 │
│     • Alternative: Use API endpoints for all DB operations                                 │
│                                                                                             │
│  PERFORMANCE OPTIMIZATIONS:                                                                 │
│  ─────────────────────────                                                                 │
│                                                                                             │
│  • Canvas clearing with low alpha (0.1) for motion trails                                  │
│  • RequestAnimationFrame for 60fps rendering                                               │
│  • Frequency data downsampling (256 FFT size)                                              │
│  • Smoothing time constant: 0.8 for stable visuals                                         │
│  • HTTP polling interval: 2 seconds (balanced for real-time feel)                          │
│                                                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Visualizer Types

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                              VISUALIZER CLASSIFICATIONS                                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  SINGLE-ZONE ADAPTIVE (5 visualizers):                                                     │
│  ─────────────────────────────────────                                                     │
│  • Unified display area                                                                     │
│  • Dynamic color transitions based on speaker                                              │
│  • More complex visual patterns                                                             │
│  • Examples: UnifiedWaves, MorphingBlob, DNAHelix, ReactiveMatrix, PlasmaFlow              │
│                                                                                             │
│  DUAL-ZONE TRADITIONAL (7 visualizers):                                                    │
│  ────────────────────────────────────                                                      │
│  • Split screen (left=User, right=AI)                                                      │
│  • Fixed color assignments                                                                  │
│  • Simpler, more predictable patterns                                                      │
│  • Examples: Waves, SpectrumBars, Circular, Particles, DotGrid, Orb, DualZoneAdapter      │
│                                                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Key Integration Points

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                              INTEGRATION SUMMARY                                            │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  1. Web Audio API Integration:                                                              │
│     • MediaStreamSource for audio input                                                     │
│     • AnalyserNode for frequency analysis                                                   │
│     • FFT size: 256 for balanced performance                                                │
│                                                                                             │
│  2. OpenAI Realtime API:                                                                    │
│     • Event-based transcript capture                                                        │
│     • Multiple event types for comprehensive coverage                                       │
│     • State tracking for conversation flow                                                  │
│                                                                                             │
│  3. Database Integration:                                                                   │
│     • Drizzle ORM for transcript storage                                                    │
│     • Sequence numbers for ordering                                                         │
│     • Server-side only operations                                                           │
│                                                                                             │
│  4. HTTP API Endpoints:                                                                     │
│     • /api/meetings/[id]/transcripts - Fetch transcripts                                   │
│     • /api/meetings/[id]/state - Get conversation state                                    │
│     • /api/webhook - Handle Stream events                                                   │
│                                                                                             │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```