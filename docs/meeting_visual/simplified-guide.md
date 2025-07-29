# Audio Visualization System - Simplified Guide

## Quick Overview

This system creates real-time audio visualizations during video calls, displaying both your voice and the AI's voice as animated graphics while showing live transcripts at the bottom of the screen.

## System Flow

```
1. Audio Capture → Web Audio API → Frequency Analysis → Visual Display
2. Speech Events → Webhook → Transcript Storage → Polling → UI Display
```

## Key Components & Files

### 1. Audio Visualization (`/src/modules/call/ui/components/audio-visualization.tsx`)
- **What it does**: Main component that renders the canvas and manages visualizers
- **Key features**:
  - Manages 12 different visualizers (5 adaptive, 7 traditional)
  - Tab key cycles through visualizers
  - Shows speaker indicators (pink for you, blue for AI)
  - Renders at 60fps using requestAnimationFrame

### 2. Audio Analysis (`/src/modules/call/hooks/use-audio-analysis.ts`)
- **What it does**: Captures audio streams and analyzes frequencies
- **Key settings**:
  - FFT size: 256 (balanced quality/performance)
  - Speaking threshold: 0.01 volume level
  - Frequency bands: Low (0-250Hz), Mid (250-4000Hz), High (4000Hz+)
  - Smoothing: 0.8 for stable visuals

### 3. Transcript Display (`/src/modules/call/ui/components/transcript-overlay.tsx`)
- **What it does**: Shows live transcripts at the bottom of the screen
- **Features**:
  - Auto-scrolls to newest messages
  - Shows last 10 messages
  - Color-coded: Pink for user, Blue for AI
  - Updates every 2 seconds via HTTP polling

### 4. Webhook Handler (`/src/app/api/webhook/route.ts`)
- **What it does**: Receives events from Stream Video and OpenAI
- **Handles**:
  - `call.session_started` - Initializes realtime connection
  - `realtime.event` - Captures live transcripts
  - `call.session_ended` - Cleanup and processing
  - Various transcript events for both user and AI speech

### 5. Transcript Collection (`/src/lib/transcript/collector.ts`)
- **What it does**: Stores and manages transcript chunks
- **Features**:
  - Singleton service for consistent storage
  - EventEmitter for real-time updates
  - Server-side database persistence
  - Client-side subscription support

## How Visualizers Work

### Single-Zone Adaptive (5 visualizers)
These use the entire canvas and change color based on who's speaking:
- **UnifiedWaves** - Flowing wave patterns
- **MorphingBlob** - Organic blob that pulses with speech
- **DNAHelix** - Rotating double helix
- **ReactiveMatrix** - Grid of reactive dots
- **PlasmaFlow** - Fluid plasma-like animation

### Dual-Zone Traditional (7 visualizers)
These split the screen (left for user, right for AI):
- **Waves** - Classic waveform display
- **SpectrumBars** - Frequency spectrum bars
- **Circular** - Circular audio meter
- **Particles** - Floating particles
- **DotGrid** - Grid of reactive dots
- **Orb** - Pulsing orb visualization
- **DualZoneAdapter** - Generic adapter for other visualizers

## How Transcripts Flow

1. **Speech Detected** → OpenAI processes audio
2. **Webhook Receives** → `/api/webhook` gets transcript events
3. **Collector Stores** → TranscriptCollector saves to database
4. **API Endpoint** → `/api/meetings/[id]/transcripts` serves data
5. **UI Polls** → Every 2 seconds, UI fetches latest transcripts
6. **Display Updates** → TranscriptOverlay shows new messages

## Color Transitions

The system uses smooth color transitions based on speaker state:

```typescript
// Color mapping (from color-utils.ts)
User Speaking → #ff006e (Hot Pink)
AI Speaking → #00d9ff (Cyan)
Both Speaking → #a855f7 (Purple)
None Speaking → #6366f1 (Indigo)
```

**Transition Speed**: 0.1 (10% per frame toward target color)
**Result**: Smooth ~300-500ms color transitions

## Technical Details

### Audio Processing Pipeline
```
MediaStream → AudioContext → AnalyserNode → FFT Analysis → AudioZoneData
```

### Data Structure
```typescript
AudioZoneData {
  audioLevel: number (0-1)
  frequencyData: Uint8Array
  frequencyBands: { low, mid, high }
  isSpeaking: boolean
}
```

### Performance Optimizations
- Canvas clearing with low alpha (0.1) for motion trails
- RequestAnimationFrame for consistent 60fps
- FFT size of 256 (good balance of detail vs performance)
- 2-second polling interval (real-time feel without overload)

## Common Issues & Solutions

1. **No Audio Visualization**
   - Check browser permissions for microphone
   - Ensure MediaStream is properly connected
   - Verify AudioContext isn't in 'suspended' state

2. **No Transcripts Showing**
   - Check webhook is receiving events
   - Verify database connection
   - Ensure meeting ID matches between components

3. **Performance Issues**
   - Reduce FFT size if needed
   - Increase smoothing time constant
   - Use simpler visualizers (dual-zone typically lighter)

## Quick Debugging

1. **Check Audio Flow**: Open console, look for `[useAudioAnalysis]` logs
2. **Check Transcripts**: Look for `[Webhook]` and `[TranscriptOverlay]` logs
3. **Check State**: Monitor `[ConversationState]` logs for AI state changes
4. **Check Network**: Watch Network tab for `/api/meetings/[id]/transcripts` calls

## File Structure Summary

```
/src/modules/call/
├── ui/components/
│   ├── audio-visualization.tsx    # Main visualization component
│   └── transcript-overlay.tsx     # Transcript display
├── hooks/
│   ├── use-audio-analysis.ts      # Audio stream processing
│   └── use-transcripts.ts         # Transcript fetching
├── visualization/
│   ├── manager.ts                 # Visualizer management
│   ├── types.ts                   # TypeScript interfaces
│   ├── utils/
│   │   └── color-utils.ts         # Color transitions
│   └── visualizers/               # All 12 visualizers
└── /src/app/api/
    ├── webhook/route.ts           # Event handler
    └── meetings/[id]/
        └── transcripts/route.ts   # Transcript API
```

This simplified guide should help you understand how the audio visualization system works without getting lost in implementation details.