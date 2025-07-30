

### **Requirement Document: Migration from GetStream to Direct OpenAI Real-time Integration**

**1.0 Objective**

To replace the GetStream video and AI services with a direct, self-hosted solution using WebSockets for audio transport and OpenAI's native APIs for Speech-to-Text (STT), Large Language Model (LLM) processing, and Text-to-Speech (TTS).

All other existing functionality—including the database schema, post-call analysis, meeting management, and frontend UI components—will be retained and integrated with the new real-time engine.

**2.0 High-Level Architectural Shift**

*   **As-Is (GetStream):** The client connects to GetStream. The backend webhook listens for events from GetStream's cloud (e.g., `call.session_started`, `transcript.done`) and reacts to them. GetStream manages audio transport and the connection to OpenAI.
*   **To-Be (Direct OpenAI):** The client will establish a persistent WebSocket connection directly to our Next.js backend. The backend will manage a full-duplex audio stream, orchestrating the flow between the user and three separate OpenAI APIs (Whisper, GPT, TTS) in real-time.

**3.0 Backend Requirements**

This is the most significant part of the migration. We will build a new real-time engine on the backend.

*   **3.1. WebSocket Server Implementation**
    *   A WebSocket endpoint must be created within the Next.js application (e.g., using a custom server or a library compatible with Vercel/Node.js like `ws`).
    *   This server must handle multiple concurrent client connections, maintaining a unique state for each active meeting.
    *   It must manage the entire lifecycle of the connection: handshake, message handling, and cleanup on disconnection.

*   **3.2. Real-time Agent Orchestrator**
    *   A new backend module, the "Agent Orchestrator," will be created. It will be instantiated for each new WebSocket connection.
    *   **Responsibility**: To manage the end-to-end flow for a single call session.
    *   On connection, it will authenticate the user and retrieve the meeting details (`meetingId`, `prompt`) from the database, just as the `call.session_started` webhook did.
    *   It will manage the state of the conversation (e.g., `user_speaking`, `ai_thinking`, `ai_speaking`).

*   **3.3. Real-time Audio Pipeline (STT -> LLM -> TTS)**
    *   The Orchestrator must manage a three-stage, streaming-first pipeline:
        1.  **Ingestion & STT**: Receive audio chunks (e.g., base64 encoded) from the client via the WebSocket. Stream these chunks directly to the **OpenAI Whisper API**.
        2.  **LLM Processing**: As Whisper returns transcripts, the Orchestrator will stream these text chunks to the **OpenAI Chat Completions (GPT) API**.
        3.  **TTS Generation**: As the GPT API returns its response text, the Orchestrator will immediately stream this text to the **OpenAI TTS API** to generate the AI's voice.
        4.  **Egress**: Stream the resulting audio chunks from the TTS API back to the client over the WebSocket.

*   **3.4. State Management & Turn Detection**
    *   The `conversationStates` in-memory tracker is no longer sufficient. The Agent Orchestrator itself will manage the agent's state.
    *   **Voice Activity Detection (VAD)** must be implemented on the server. The server will analyze the incoming audio stream from the user to detect periods of silence, which signifies the end of a user's "turn." This is critical for knowing when to send the collected transcript to the LLM.
    *   State-change messages (e.g., `{ "type": "agent_state", "state": "thinking" }`) must be sent to the client over the WebSocket to drive the UI.

*   **3.5. Database & Transcript Integration**
    *   The existing `transcriptCollector` will still be used.
    *   The Agent Orchestrator will call `transcriptCollector.storeChunk()` as transcripts are finalized from both the user (Whisper) and the AI (from the LLM response), ensuring the database is kept in sync.

**4.0 Frontend Requirements**

The frontend will be refactored to replace the GetStream SDK with a direct WebSocket implementation.

*   **4.1. WebSocket Client Service (`useRealtimeAgent` hook)**
    *   A new custom hook, `useRealtimeAgent`, will be created to encapsulate all WebSocket logic.
    *   It will be responsible for:
        *   Establishing and maintaining the WebSocket connection.
        *   Requesting microphone permissions and capturing audio via the Web Audio API.
        *   Encoding and streaming the user's microphone audio to the backend.
        *   Receiving messages from the WebSocket (AI audio, transcripts, state updates).
        *   Managing a queue for incoming AI audio chunks and playing them back seamlessly using the Web Audio API.
    *   This hook will expose the necessary state and callbacks to the UI, such as `isConnected`, `agentState`, `latestTranscript`, `toggleMute`, `leaveCall`.

*   **4.2. Component Refactoring**
    *   **`CallConnect.tsx`**: The `<StreamVideo>` and `<StreamCall>` providers will be removed. This component will be simplified, primarily using the new `useRealtimeAgent` hook to establish the connection.
    *   **`CallUI.tsx`**: Its state management (`show`, `isJoining`) remains relevant. The `handleJoin` function will now trigger the connection via the `useRealtimeAgent` hook instead of `call.join()`.
    *   **`CallActive.tsx`**: The `useCallStateHooks` will be replaced. The component will get its data (mic state, participants) directly from the `useRealtimeAgent` hook. The audio streams for the visualization (`inputStream`, `outputStream`) will be sourced from the local microphone and the playback of AI audio from the hook.

**5.0 Data Flow & API (WebSocket Payloads)**

A strict contract for WebSocket messages must be defined.

*   **5.1. Client-to-Server Messages**
    *   `{ "type": "audio_chunk", "data": "..." }`: Base64 encoded audio data.
    *   `{ "type": "control", "action": "mute" / "unmute" }`: To signal media state changes.
*   **5.2. Server-to-Client Messages**
    *   `{ "type": "audio_chunk", "data": "..." }`: Base64 encoded audio from the AI's voice.
    *   `{ "type": "transcript_entry", "data": { ... } }`: A full `TranscriptEntry` object.
    *   `{ "type": "agent_state", "state": "listening" | "thinking" | "speaking" }`: To drive UI animations.
    *   `{ "type": "error", "message": "..." }`: To communicate errors to the client.

**6.0 Deprecation & Cleanup Plan**

To complete the migration, the following will be removed:

*   **Dependencies**: The `@stream-io/video-react-sdk` and `@stream-io/node-sdk` packages will be removed from `package.json`.
*   **Backend Code**:
    *   The `webhook/route.ts` file's logic for `call.session_started`, `call.session_participant_left`, and real-time transcript events will be removed. The core of this file becomes obsolete.
    *   The API routes `/meetings/[id]/state/route.ts` and `/meetings/[id]/transcripts/stream/route.ts` will be deleted, as this functionality is replaced by proactive WebSocket messages.
*   **Frontend Code**: All GetStream provider components and hooks (`StreamVideo`, `StreamCall`, `useCall`, `useCallStateHooks`) will be removed.

***