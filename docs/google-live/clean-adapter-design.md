# Clean Multi-Provider Voice AI Design

## Understanding the Current Integration

GetStream's `connectOpenAi()` does two things:
1. **Audio Bridging** (handled by GetStream internally):
   - AI agent joins the call as a participant
   - Audio routing between WebRTC and OpenAI
   - All handled server-side by GetStream

2. **Returns OpenAI's RealtimeClient** for:
   - Configuration (`updateSession`)
   - Event listening (`on('realtime.event')`)
   - Direct control of the AI behavior

## The Adapter Pattern Solution

Since GetStream doesn't offer `connectGemini()`, we'll create an adapter that:
1. Provides the same interface as OpenAI's RealtimeClient
2. Handles Gemini WebSocket connection behind the scenes
3. Translates between OpenAI and Gemini event formats

## Implementation

### 1. Voice Provider Interface

```typescript
// src/lib/voice-providers/types.ts

export interface VoiceProviderClient {
  // Core methods matching OpenAI RealtimeClient
  updateSession(config: SessionConfig): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  disconnect(): void;
}

export interface SessionConfig {
  instructions?: string;
  voice?: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}
```

### 2. Gemini Adapter

```typescript
// src/lib/voice-providers/gemini-adapter.ts

export class GeminiRealtimeAdapter implements VoiceProviderClient {
  private ws: WebSocket | null = null;
  private eventHandlers = new Map<string, Set<Function>>();
  private sessionConfig: any = {};
  
  constructor(
    private apiKey: string,
    private callId: string,
    private agentUserId: string
  ) {}
  
  async connect() {
    // Connect to Gemini WebSocket
    const url = `wss://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:streamGenerateContent?key=${this.apiKey}`;
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      // Send initial setup
      this.ws!.send(JSON.stringify({
        setup: {
          model: "models/gemini-2.0-flash-exp"
        }
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleGeminiEvent(data);
    };
  }
  
  updateSession(config: SessionConfig) {
    // Translate OpenAI config to Gemini format
    if (config.instructions) {
      this.ws?.send(JSON.stringify({
        systemInstruction: {
          parts: [{ text: config.instructions }]
        }
      }));
    }
    
    // Store config for later use
    this.sessionConfig = { ...this.sessionConfig, ...config };
  }
  
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  private handleGeminiEvent(data: any) {
    // Translate Gemini events to OpenAI format
    const handlers = this.eventHandlers.get('realtime.event');
    if (!handlers) return;
    
    // Map Gemini events to OpenAI-style events
    if (data.serverContent?.modelTurn?.parts?.[0]?.text) {
      // Gemini text response -> OpenAI transcript event
      const event = {
        type: 'response.audio_transcript.done',
        transcript: data.serverContent.modelTurn.parts[0].text
      };
      handlers.forEach(h => h({ event }));
    }
    
    if (data.toolCall) {
      // Handle function calls similarly
      const event = {
        type: 'response.function_call_arguments.done',
        arguments: JSON.stringify(data.toolCall.args)
      };
      handlers.forEach(h => h({ event }));
    }
  }
  
  disconnect() {
    this.ws?.close();
  }
}
```

### 3. The Missing Piece: Audio Bridge

The challenge is that GetStream handles audio bridging for OpenAI internally. For Gemini, we need to handle this ourselves.

#### Option A: Server-Side Media Processor (Complex but Correct)

```typescript
// src/lib/voice-providers/gemini-media-bridge.ts

import { MediaProcessor } from '@stream-io/node-sdk';

export class GeminiMediaBridge {
  private processor: MediaProcessor;
  
  constructor(
    private call: any,
    private geminiAdapter: GeminiRealtimeAdapter,
    private agentUserId: string
  ) {}
  
  async connect() {
    // This is where it gets complex - we need to:
    // 1. Join the call as a server-side participant
    // 2. Capture incoming audio
    // 3. Forward to Gemini
    // 4. Play Gemini responses back
    
    // GetStream doesn't expose this API publicly
    // We'd need their internal media processing capabilities
  }
}
```

#### Option B: Request GetStream Support (Recommended)

Since GetStream handles the media bridging internally for OpenAI, the cleanest solution is to request they add Gemini support.

#### Option C: Hybrid Approach (Practical Workaround)

Use a combination of GetStream for call management and a separate service for Gemini:

```typescript
// src/lib/voice-providers/hybrid-gemini.ts

export class HybridGeminiProvider {
  private geminiAdapter: GeminiRealtimeAdapter;
  private dailyRoom: any; // Daily.co room for media
  
  async connectToCall(call: any, config: any) {
    // 1. Create a Daily room that bridges to Gemini
    this.dailyRoom = await createDailyRoomWithGemini({
      geminiApiKey: config.apiKey,
      systemPrompt: config.instructions
    });
    
    // 2. Have the GetStream call participants join Daily
    // This gives us audio bridging that GetStream doesn't expose
    const bridgeUrl = `${this.dailyRoom.url}?t=${this.dailyRoom.token}`;
    
    // 3. Return adapter for consistent interface
    this.geminiAdapter = new GeminiRealtimeAdapter(
      config.apiKey,
      call.id,
      config.agentUserId
    );
    
    return this.geminiAdapter;
  }
}
```

### 4. Updated Webhook Handler

```typescript
// src/app/api/webhook/route.ts

const VOICE_PROVIDERS = {
  openai: 'openai',
  gemini: 'gemini'
} as const;

// In call.session_started handler:
const provider = existingMeeting.voiceProvider || VOICE_PROVIDERS.openai;

let realtimeClient: VoiceProviderClient;

if (provider === VOICE_PROVIDERS.openai) {
  // Use GetStream's native OpenAI integration
  realtimeClient = await streamVideo.video.connectOpenAi({
    call,
    openAiApiKey: process.env.OPENAI_API_KEY!,
    agentUserId: existingAgent.id,
  });
} else if (provider === VOICE_PROVIDERS.gemini) {
  // Use our Gemini adapter
  const geminiProvider = new HybridGeminiProvider();
  realtimeClient = await geminiProvider.connectToCall(call, {
    apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
    agentUserId: existingAgent.id,
    instructions: existingMeeting.prompt
  });
}

// Same code for both providers thanks to adapter pattern
realtimeClient.updateSession({
  instructions: existingMeeting.prompt,
  input_audio_transcription: {
    model: provider === VOICE_PROVIDERS.openai ? "whisper-1" : "gemini-auto"
  },
  turn_detection: {
    type: "server_vad",
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500
  }
});

// Event handling works the same
realtimeClient.on('realtime.event', ({ event }: { event: Record<string, unknown> }) => {
  // Existing event handling code remains unchanged
  if (event.type === 'response.audio_transcript.done' && typeof event.transcript === 'string') {
    transcriptCollector.storeChunk(meetingId, 'agent', event.transcript);
  }
  // ... rest of event handling
});
```

## Practical Implementation Path

### Phase 1: Proof of Concept (1 week)
1. Implement GeminiRealtimeAdapter with event translation
2. Use Daily.co for audio bridging (as recommended by Google)
3. Test with a few meetings

### Phase 2: Production Path Decision (1 week)
Based on POC results, choose:

**Option A**: If Daily.co bridging works well
- Refine the hybrid approach
- Add error handling and fallbacks
- Deploy with feature flags

**Option B**: If latency/quality issues
- Contact GetStream for native Gemini support
- Consider building custom media server
- Stay with OpenAI until solution ready

### Phase 3: Rollout (2 weeks)
1. Add provider selection to UI
2. Implement gradual rollout
3. Monitor performance metrics

## Key Benefits of This Design

1. **Minimal Code Changes**: Adapter pattern means existing code stays the same
2. **Easy Testing**: Can A/B test providers without changing business logic
3. **Future Proof**: Easy to add more providers
4. **Fallback Ready**: Can fall back to OpenAI if Gemini fails

## Database Changes

```sql
-- Simple addition to existing schema
ALTER TABLE meetings ADD COLUMN voice_provider VARCHAR(20) DEFAULT 'openai';
ALTER TABLE agents ADD COLUMN preferred_voice_provider VARCHAR(20) DEFAULT 'openai';
```

## Environment Variables

```env
# Existing
OPENAI_API_KEY=xxx

# New
GOOGLE_GEMINI_API_KEY=xxx
DAILY_API_KEY=xxx  # If using Daily.co bridge
DEFAULT_VOICE_PROVIDER=openai
ENABLE_GEMINI=false
```

## Cost Analysis

- **OpenAI**: $0.06/minute
- **Gemini**: Free during preview, likely $0.04-0.05/minute after
- **Daily.co**: ~$0.004/minute (if using for bridge)

## Next Steps

1. **Immediate**: Contact GetStream about Gemini support timeline
2. **Week 1**: Build GeminiRealtimeAdapter
3. **Week 2**: Test Daily.co bridging approach
4. **Week 3**: Make production decision based on results

This design provides a clean path forward while acknowledging the reality that GetStream controls the media bridging layer.