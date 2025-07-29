# Pipecat Integration Recommendation for Multi-Provider Voice AI

## Executive Summary

After studying Pipecat's architecture and capabilities, I recommend using Pipecat as the unified layer for supporting both OpenAI and Gemini voice AI providers. Pipecat solves the core challenge: it provides a consistent interface while handling the complex audio bridging that GetStream doesn't expose.

## Why Pipecat Solves Our Problem

### Current Challenge
- GetStream's `connectOpenAi()` is a black box - we can't replicate it for Gemini
- GetStream handles audio bridging internally, not exposing it for other providers
- We need WebRTC infrastructure for real-time audio

### Pipecat's Solution
- **Unified Interface**: Same API for OpenAI and Gemini
- **WebRTC Handled**: Via Daily transport (production-ready)
- **Provider Abstraction**: Switch providers with config change
- **Audio Pipeline**: Handles format conversion automatically

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your React App                           │
│                 (Using Pipecat React SDK)                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    WebRTC (Daily)
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Pipecat Server                             │
│                  (Python Backend)                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Daily Input │→ │Pipeline Logic│ → │ Provider Output │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│                           │                                  │
│                    ┌──────┴───────┐                        │
│                    │              │                         │
│              OpenAI API      Gemini API                     │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Pipecat Backend Setup

```python
# src/backend/voice_agent.py

import os
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.openai import OpenAILLMService
from pipecat.services.gemini import GeminiMultimodalLiveLLMService
from pipecat.pipeline.pipeline import Pipeline
from pipecat.transports.services.daily import DailyParams, DailyTransport

class VoiceAgentService:
    def __init__(self, provider: str = "openai"):
        self.provider = provider
        
    async def create_pipeline(self, room_url: str, token: str, config: dict):
        # Create transport (same for both providers)
        transport = DailyTransport(
            room_url,
            token,
            "Voice Agent",
            DailyParams(
                audio_out_enabled=True,
                transcription_enabled=True,
                vad_enabled=True,
            )
        )
        
        # Create provider-specific service
        if self.provider == "openai":
            llm = OpenAILLMService(
                api_key=os.getenv("OPENAI_API_KEY"),
                model="gpt-4o-realtime-preview"
            )
        else:  # gemini
            llm = GeminiMultimodalLiveLLMService(
                api_key=os.getenv("GEMINI_API_KEY"),
                voice_id="Puck"
            )
        
        # Create pipeline (same structure for both)
        pipeline = Pipeline([
            transport.input(),
            llm,
            transport.output()
        ])
        
        return pipeline
```

### Phase 2: Integration API

```python
# src/backend/api.py

from fastapi import FastAPI, HTTPException
from daily import Daily
import uuid

app = FastAPI()
daily_client = Daily()

@app.post("/sessions/create")
async def create_session(
    provider: str = "openai",
    agent_id: str = None,
    instructions: str = None
):
    """Create a new voice session with specified provider"""
    
    # Create Daily room
    room = daily_client.create_room(
        name=f"session-{uuid.uuid4()}",
        properties={
            "enable_recording": True,
            "enable_advanced_chat": True
        }
    )
    
    # Generate tokens
    owner_token = daily_client.create_meeting_token(
        room_name=room["name"],
        is_owner=True
    )
    
    agent_token = daily_client.create_meeting_token(
        room_name=room["name"],
        user_name="AI Agent",
        is_owner=False
    )
    
    # Start Pipecat bot
    agent_service = VoiceAgentService(provider=provider)
    bot_task = asyncio.create_task(
        agent_service.create_pipeline(
            room["url"],
            agent_token,
            {"instructions": instructions}
        )
    )
    
    return {
        "session_id": room["name"],
        "room_url": room["url"],
        "token": owner_token,
        "provider": provider
    }
```

### Phase 3: React Frontend Integration

```typescript
// src/lib/voice/pipecat-client.ts

import { RTVIClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';

export class PipecatVoiceClient {
  private rtviClient: RTVIClient;
  
  async connect(sessionData: {
    room_url: string;
    token: string;
    provider: string;
  }) {
    const transport = new DailyTransport({
      ...sessionData,
      userName: "User",
      callbacks: {
        onJoinedRoom: () => console.log("Joined room"),
      }
    });
    
    this.rtviClient = new RTVIClient({
      transport,
      enableMic: true,
      enableCam: false,
      timeout: 30000,
    });
    
    await this.rtviClient.connect();
    
    // Set up event listeners
    this.rtviClient.on('transcript', (data) => {
      console.log('Transcript:', data);
      // Forward to your transcript collector
    });
    
    return this.rtviClient;
  }
  
  disconnect() {
    this.rtviClient?.disconnect();
  }
}
```

### Phase 4: Updated Webhook Handler

```typescript
// src/app/api/webhook/route.ts

import { PipecatVoiceClient } from '@/lib/voice/pipecat-client';

// In call.session_started handler:
if (eventType === "call.session_started") {
  const provider = existingMeeting.voiceProvider || 'openai';
  
  // Create Pipecat session
  const response = await fetch(`${process.env.PIPECAT_API_URL}/sessions/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      agent_id: existingAgent.id,
      instructions: existingMeeting.prompt
    })
  });
  
  const session = await response.json();
  
  // Store session info
  await db.update(meetings).set({
    pipecatSessionId: session.session_id,
    pipecatRoomUrl: session.room_url,
    voiceProvider: provider
  }).where(eq(meetings.id, meetingId));
  
  // Note: Users will connect to Pipecat room directly
  // GetStream call can be used for video if needed
}
```

### Phase 5: Frontend Voice UI

```tsx
// src/components/VoiceChat.tsx

import { RTVIClientProvider, RTVIClientAudio } from '@pipecat-ai/client-react';
import { useEffect, useState } from 'react';

export function VoiceChat({ meeting }: { meeting: Meeting }) {
  const [client, setClient] = useState<RTVIClient | null>(null);
  
  useEffect(() => {
    if (meeting.pipecatRoomUrl) {
      const voiceClient = new PipecatVoiceClient();
      voiceClient.connect({
        room_url: meeting.pipecatRoomUrl,
        token: meeting.userToken,
        provider: meeting.voiceProvider
      }).then(setClient);
      
      return () => voiceClient.disconnect();
    }
  }, [meeting]);
  
  if (!client) return <div>Connecting...</div>;
  
  return (
    <RTVIClientProvider client={client}>
      <div className="voice-interface">
        <RTVIClientAudio />
        <AudioVisualizer />
        <TranscriptDisplay />
      </div>
    </RTVIClientProvider>
  );
}
```

## Migration Strategy

### Option A: Gradual Migration (Recommended)
1. **Week 1-2**: Set up Pipecat backend with both providers
2. **Week 3**: Add feature flag for new voice system
3. **Week 4**: Test with internal users
4. **Week 5-6**: Gradual rollout (10% → 50% → 100%)

### Option B: Hybrid Approach
- Keep GetStream + OpenAI for existing users
- Use Pipecat for new features/providers
- Migrate gradually based on user feedback

## Key Benefits

### 1. Provider Flexibility
```python
# Easy provider switching
llm = get_llm_service(provider="gemini")  # or "openai", "anthropic", etc.
```

### 2. Consistent Interface
- Same React components regardless of provider
- Unified event handling
- Single transcript format

### 3. Advanced Features
- Pipecat Flows for complex conversations
- Function calling across all providers
- Built-in VAD and interruption handling

### 4. Production Ready
- Daily's WebRTC infrastructure (99.99% uptime)
- Global edge network
- Built-in recording and analytics

## Cost Analysis

### Current (GetStream + OpenAI)
- GetStream: ~$0.004/participant/minute
- OpenAI: $0.06/minute
- **Total**: ~$0.064/minute

### Pipecat Solution
- Daily: ~$0.004/minute
- OpenAI: $0.06/minute OR Gemini: TBD (free in preview)
- Pipecat server: ~$0.001/minute (your infrastructure)
- **Total**: ~$0.065/minute (OpenAI) or ~$0.005/minute (Gemini preview)

## Technical Considerations

### Pros
✅ Unified multi-provider support
✅ Production-tested WebRTC (Daily)
✅ Active development and community
✅ Supports video if needed
✅ Built-in recording and transcription

### Cons
❌ Additional service to maintain (Pipecat server)
❌ Python backend (if you prefer Node.js)
❌ Learning curve for Pipecat concepts

## Recommendation

**Implement Pipecat for new voice features** while keeping existing GetStream+OpenAI integration. This allows:

1. **Immediate Gemini support** without waiting for GetStream
2. **A/B testing** between solutions
3. **Gradual migration** based on real performance data
4. **Future flexibility** for new providers (Anthropic, etc.)

## Next Steps

1. **Week 1**: Set up Pipecat development environment
2. **Week 2**: Create proof-of-concept with both providers
3. **Week 3**: Performance testing vs current solution
4. **Week 4**: Make go/no-go decision for production

This approach gives you provider independence while maintaining production quality through Daily's proven WebRTC infrastructure.