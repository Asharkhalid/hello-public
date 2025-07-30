

# Requirement Document: Direct OpenAI Real-time Engine (Phase 1 MVP)

**Version:** 1.2
**Date:** July 29, 2025
**Status:** Approved for Design

## 1.0 Objective

To re-architect the existing "stream agent flow" by replacing the GetStream.io dependency with a self-hosted, backend-driven, real-time voice engine. This new engine will directly interface with OpenAI APIs (Whisper, Chat, TTS) to provide the same core functionality while giving us maximum control over the real-time pipeline and data flow.

This document outlines the requirements for **Phase 1**, which focuses exclusively on creating a functional voice-in/voice-out conversation loop.

## 2.0 Scope

### 2.1 In-Scope

-   Development of a new backend WebSocket server to manage persistent client connections.
-   Creation of a backend "Agent Orchestrator" to manage the lifecycle and state of each individual call.
-   Implementation of a server-side, low-latency audio pipeline: Speech-to-Text -> LLM -> Text-to-Speech.
-   Refactoring the frontend to communicate via this new WebSocket server instead of the GetStream SDK.
-   Maintaining and utilizing the existing database schema and data persistence logic for meetings and transcripts.
-   Creation of a minimal "harness" UI for the purpose of testing and validating the core voice loop.

### 2.2 Out-of-Scope for Phase 1

-   **No changes to the existing Database Schema.** The system will use the `meetings` and `transcript_chunks` tables as they are currently defined.
-   **No integration of the live transcript UI.** The "chat bubble" view will be implemented in a subsequent phase.
-   **No integration of the audio visualization components.** These will be re-wired in a subsequent phase.
-   **No changes to the post-call analysis flow** (`processImmediately` function).
-   **No implementation of advanced UI controls** like Push-to-Talk (PTT) or codec selection.

## 3.0 High-Level Architectural Shift

| Aspect | As-Is (Stream Agent Flow) | To-Be (Direct Engine Flow) |
| :--- | :--- | :--- |
| **Primary Orchestrator** | **Reactive Backend** (Listens for GetStream webhooks) | **Proactive & Stateful Backend** (Hosts the session directly) |
| **Audio Transport** | GetStream's WebRTC Servers | Direct WebSocket connection to our server |
| **Real-time Pipeline** | Managed by GetStream's cloud | Managed entirely by our backend |
| **State Management** | Centralized in our Database (driven by webhooks) | Managed by the stateful backend orchestrator |

## 4.0 Functional Requirements (FR)

### 4.1 Backend

-   **FR-B1: WebSocket Server Implementation**
    -   The system **SHALL** provide a WebSocket endpoint (e.g., `/api/ws/agent`).
    -   The server **SHALL** manage multiple concurrent client connections, maintaining a distinct session state for each.
    -   The server **SHALL** validate a JSON Web Token (JWT) provided on connection (e.g., in a query parameter) and **SHALL** terminate unauthorized connections with a `401 Unauthorized` status.

-   **FR-B2: Agent Orchestrator Module**
    -   For each authorized WebSocket connection, a dedicated "Agent Orchestrator" instance **SHALL** be created.
    -   Upon instantiation, the orchestrator **SHALL** fetch the corresponding meeting details (especially the `prompt`) from the database.
    -   The orchestrator **SHALL** be initialized with a centralized configuration object to manage its behavior.
    -   The orchestrator **SHALL** manage the agent's state (`listening`, `thinking`, `speaking`, `recovering_error`) and communicate state changes to the client.

-   **FR-B3: Real-time Audio Pipeline**
    -   The orchestrator **SHALL** implement a low-latency, streaming-first pipeline for processing audio:
        1.  **Ingestion:** It must accept incoming audio chunks from the client WebSocket.
        2.  **STT:** It must stream the user's audio to the OpenAI Whisper API.
        3.  **LLM:** It must stream the finalized text from Whisper to the OpenAI Chat Completions API.
        4.  **TTS:** It must stream the text response from the Chat API to the OpenAI TTS API.
        5.  **Egress:** It must stream the generated audio from the TTS API back to the client.

-   **FR-B4: Voice Activity Detection (VAD)**
    -   The system **SHALL** implement server-side VAD to determine when the user has finished speaking. This logic must be robust enough to handle minor pauses and avoid cutting off the user prematurely.

-   **FR-B5: Data Persistence**
    -   The system **SHALL** reuse the existing `transcriptCollector` module to save all user and AI transcripts to the `transcript_chunks` table in the database as they are finalized.

-   **FR-B6: Backpressure Handling**
    -   The system **SHALL** ignore user audio input received while the agent is in a 'thinking' or 'speaking' state to prevent interruptions.

### 4.2 Frontend

-   **FR-F1: WebSocket Client Service**
    -   A new custom hook (e.g., `useRealtimeAgent`) **SHALL** be created to encapsulate all WebSocket communication logic.
    -   This hook **SHALL** manage the WebSocket connection lifecycle (`connect`, `disconnect`).
    -   It **SHALL** be responsible for capturing microphone audio and streaming it to the backend.
    -   It **SHALL** handle incoming messages from the backend, including AI audio chunks and state updates.
    -   It **SHALL** provide a mechanism for seamless, low-latency playback of the incoming AI audio stream.

-   **FR-F2: Minimal UI Harness**
    -   For Phase 1 validation, a minimal UI component **SHALL** be created.
    -   This component **SHALL** contain "Connect" and "Disconnect" buttons.
    -   It **SHALL** display the current connection status (`Disconnected`, `Connecting`, `Connected`).

## 5.0 Non-Functional Requirements (NFR)

-   **NFR-1 (Low Latency):** The end-to-end response time ("turn-taking" latency) from the end of a user's utterance to the beginning of the AI's audible response **MUST** be minimized. The entire pipeline must be fully streaming.
-   **NFR-2 (Security):** All WebSocket connections **MUST** be authenticated via a short-lived JSON Web Token (JWT) to prevent unauthorized access and resource usage.
-   **NFR-3 (Configuration):** All operational parameters (model names, VAD thresholds, etc.) **MUST** be externalized into a dedicated configuration file, separate from the core application logic.
-   **NFR-4 (Error Handling):** The backend orchestrator **MUST** gracefully handle transient errors from the OpenAI API streams. It **SHALL** do so by playing a pre-recorded audio message to the user and resetting the session state without disconnecting the call.
-   **NFR-5 (Scalability):** The backend WebSocket solution **SHALL** be designed to handle a reasonable number of concurrent users (e.g., 50+) without significant degradation in performance.

## 6.0 Deprecation Plan

Upon successful implementation and validation of the new system in a future phase, the following components will be formally removed:

-   **Dependencies**: The `@stream-io/video-react-sdk` and `@stream-io/node-sdk` packages.
-   **Backend Code**: The `/webhook/route.ts`, `/meetings/[id]/state/route.ts`, and `/meetings/[id]/transcripts/stream/route.ts` API endpoints.
-   **Frontend Code**: All `<StreamTheme>`, `<StreamVideo>`, `<StreamCall>` components and all `useCall` / `useCallStateHooks` hooks.