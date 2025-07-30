Of course. Based on the clarified and focused requirements for a "Core Voice Engine MVP," here is the detailed technical design document.

***

### **Design Document: Direct OpenAI Real-time Engine (Phase 1 MVP)**

**Version:** 1.0
**Date:** July 30, 2025
**Objective:** To design the core components for a self-hosted voice agent engine that directly uses OpenAI APIs for STT, LLM, and TTS, focusing exclusively on achieving a successful voice-in/voice-out conversation loop.

**1.0 High-Level Architecture**

This design specifies a backend-centric architecture where the client maintains a simple, persistent WebSocket connection. The backend is stateful and orchestrates the complex, low-latency pipeline required for a real-time conversation.

**1.1. Phase 1 Architecture Diagram**

```mermaid
graph TD
    subgraph Client (Browser)
        A[Minimal UI] --> B(useRealtimeAgent Hook);
        B -- Captures Mic Audio --> C[Web Audio API / MediaRecorder];
        C -- Encoded Audio Chunks --> D[WebSocket Client];
        D -- Receives AI Audio Chunks --> E[Audio Playback Engine];
        E -- Plays Audio --> F[Speakers];
    end

    subgraph Backend (Next.js Server)
        G[WebSocket Server] -- Manages Connections --> H{Meeting Orchestrator};
        H -- For each call, handles --> I(STT -> LLM -> TTS Pipeline);
        I -- Persists conversation --> J[Database via TranscriptCollector];
    end

    subgraph OpenAI APIs
        K[Whisper API];
        L[GPT-4o API];
        M[TTS API];
    end

    D -- "audio_chunk" messages --> G;
    G -- "audio_chunk" messages --> D;

    I -- Streams user audio --> K;
    K -- Returns transcripts --> I;
    I -- Streams transcripts --> L;
    L -- Streams response text --> I;
    I -- Streams text --> M;
    M -- Streams audio --> I;
```

**2.0 Backend Component Design**

The backend is the core of this system.

**2.1. WebSocket Server (`/api/ws/agent`)**

*   **Technology**: A WebSocket server implemented with the `ws` library, running on a custom Next.js server.
*   **Connection Lifecycle**:
    1.  **Handshake**: The client initiates a connection to `/api/ws/agent?meetingId=[ID]&token=[AUTH_TOKEN]`. The server validates the auth token and meeting ID.
    2.  **Instantiation**: Upon successful validation, the server creates a new instance of the `AgentOrchestrator` class, passing it the `meetingId` and the WebSocket connection object.
    3.  **Message Routing**: All subsequent messages from this client are routed directly to the `handleMessage` method of its corresponding orchestrator instance.
    4.  **Termination**: When the connection is closed (client disconnects or error), the server calls the `orchestrator.cleanup()` method to release all resources.

**2.2. Agent Orchestrator (`AgentOrchestrator.ts`)**

*   **Pattern**: A stateful class that manages a single conversation session from start to finish.
*   **Core Properties**:
    *   `meetingId: string`: The ID of the current meeting.
    *   `prompt: string`: The agent's instructions, fetched from the database.
    *   `ws: WebSocket`: The direct connection to the client.
    *   `whisperStream`, `gptStream`, `ttsStream`: Writable/Readable streams for interacting with OpenAI.
    *   `userTranscriptBuffer: string`: A temporary buffer to accumulate the user's speech during their turn.
    *   `state: 'listening' | 'thinking' | 'speaking' | 'recovering_error'`: (Amended) The current state of the agent, including a new state for error recovery.
*   **Core Methods**:
    *   `constructor(meetingId, ws)`: Initializes the object and immediately fetches the agent's prompt from the `meetings` table in the database.
    *   `handleClientAudio(audioChunk: Buffer)`: This is the primary entry point for user audio. It performs two actions:
        1.  Streams the audio chunk to the Whisper API.
        2.  Passes the audio to the internal VAD (Voice Activity Detection) logic.
    *   `_runVAD(audioChunk: Buffer)`: A simple volume-based VAD. If a sufficient period of silence is detected, it triggers the `_sendTranscriptToLLM` method.
    *   `_sendTranscriptToLLM()`: Sends the contents of `userTranscriptBuffer` to the GPT-4o API to get a response, then clears the buffer for the next turn.
    *   `cleanup()`: A critical method to close all streams to OpenAI and ensure no background processes are left running.
    *   `_handlePipelineError(error: Error, stage: 'whisper' | 'gpt' | 'tts')`: (New) A dedicated method to handle errors from any part of the OpenAI pipeline.

**2.3. Server-Side Audio Pipeline Logic**

The pipeline is designed for minimum latency. Crucially, each stream connection to an OpenAI API will be wrapped in error handling to ensure resilience. If a stream fails, the orchestrator will enter a recovery state instead of crashing.

1.  **User Audio (Client -> Whisper)**: The orchestrator maintains a persistent stream to the Whisper API. As audio arrives from the client, it's immediately forwarded.
2.  **User Transcript (Whisper -> Orchestrator)**: As Whisper transcribes, it sends back text fragments. These are appended to the `userTranscriptBuffer` and stored in the database via `transcriptCollector`.
3.  **LLM Turn (Orchestrator -> GPT)**: Once VAD detects the user has finished speaking, the full transcript in the buffer is sent to the GPT API with `stream: true`.
4.  **AI Response (GPT -> TTS -> Client)**:
    *   As text tokens arrive from the GPT stream, they are immediately pushed into two places:
        1.  The OpenAI TTS API stream to begin generating audio.
        2.  The `transcriptCollector` to save the AI's response.
    *   As the TTS API returns audio chunks, they are immediately forwarded to the client through the WebSocket connection.

**2.4. Error Handling and Resilience (New Section)**

This section details the system's strategy for managing failures during the live conversation.

*   **2.4.1. Stream Failure Detection**
    *   Each of the three OpenAI stream objects (Whisper, GPT, TTS) within the `AgentOrchestrator` will have a listener attached to its `'error'` event (e.g., `gptStream.on('error', (err) => ...)`).
    *   Any error caught from these streams will be immediately funneled into the `_handlePipelineError` method.

*   **2.4.2. Graceful Recovery Flow**
    *   Upon entering `_handlePipelineError`, the orchestrator will execute the following sequence:
        1.  **Log the Error**: The specific error and the stage it occurred in (`whisper`, `gpt`, or `tts`) will be logged to the server console for debugging.
        2.  **Set State**: The orchestrator's state will be set to `'recovering_error'`. This prevents any new audio from being processed while it recovers.
        3.  **Pipeline Cleanup**: The orchestrator will immediately call `cleanup()` on all existing OpenAI streams to terminate them cleanly.
        4.  **Send Apology Audio**: The orchestrator will read a pre-canned, local audio file (e.g., `/public/audio/error_generic.wav`). It will stream the contents of this file to the client via the WebSocket. This ensures the user receives feedback even if the TTS API is down.
        5.  **Reset State**: Once the apology audio has been fully sent, the orchestrator's state will be reset to `'listening'`.
        6.  The orchestrator is now stable and ready to receive the user's next utterance, effectively recovering from the error without disconnecting the user.

*   **2.4.3. Pre-canned Audio Response**
    *   A high-quality, generic audio file (e.g., "I'm sorry, I seem to be having a technical issue. Could you please repeat that?") will be stored within the project's public assets. This removes the dependency on the TTS API during a failure scenario, making the recovery process much more robust.


**3.0 Frontend Component Design**

For Phase 1, the frontend is simplified to its core function: capturing and playing audio.

**3.1. `useRealtimeAgent` Hook**

*   **Public Interface**:
    *   **State**: `isConnected: boolean`
    *   **Functions**: `connect(meetingId, token)`, `disconnect()`
*   **Internal Logic**:
    *   **WebSocket**: Manages the connection to the backend server.
    *   **Audio Capture**: On `connect()`, it uses `navigator.mediaDevices.getUserMedia()` to get microphone access. It will use a `MediaRecorder` instance to capture audio in small, regular chunks (e.g., every 200ms).
    *   **Audio Sending**: Each chunk from `MediaRecorder` is encoded (e.g., as a Base64 string) and sent over the WebSocket in the format `{ "type": "audio_chunk", "data": "..." }`.
    *   **Audio Playback**: Manages an internal queue of incoming AI audio chunks. It uses the Web Audio API (`AudioContext`) to decode and play these chunks sequentially, ensuring smooth playback.

**3.2. Minimal UI (`VoiceHarness.tsx`)**

*   A simple React component for testing and validation.
*   It will contain two buttons: "Connect" and "Disconnect".
*   It will use the `useRealtimeAgent` hook to manage the session.
*   It will display the current `isConnected` status.

**4.0 Phase 1 API Specification (WebSocket)**

The contract between client and server is minimal for this phase.

*   **Client-to-Server Message**:
    ```json
    {
      "type": "audio_chunk",
      "data": "[Base64-encoded audio data]"
    }
    ```*   **Server-to-Client Message**:
    ```json
    {
      "type": "audio_chunk",
      "data": "[Base64-encoded audio data]"
    }
    ```

**5.0 Data Persistence Flow**

This design explicitly reuses the existing persistence layer with no modifications.

1.  **User Transcript**: When the `AgentOrchestrator` receives a finalized text segment from Whisper, it calls `transcriptCollector.storeChunk(meetingId, 'user', text)`.
2.  **AI Transcript**: When the `AgentOrchestrator` receives a finalized text response from the GPT model, it calls `transcriptCollector.storeChunk(meetingId, 'agent', text)`.
3.  This ensures that the `transcript_chunks` table is populated correctly for later use (e.g., post-call analysis, Phase 2 UI).

**6.0 Phase 1 Implementation Plan**

1.  **Backend Setup**: Implement the WebSocket server and the `AgentOrchestrator` class with its internal pipeline logic. Create a simple Node.js test script to act as a client, validating the full audio loop without a browser.
2.  **Frontend Hook**: Develop the `useRealtimeAgent` hook to handle audio capture, encoding, sending, receiving, and playback.
3.  **UI Harness**: Create the minimal `VoiceHarness.tsx` component.
4.  **Integration**: Connect the frontend harness to the backend server.
5.  **Validation**: The primary success criterion for this phase is the ability to click "Connect," have a multi-turn spoken conversation with the AI, and have the AI's responses be contextually accurate and audibly clear.
