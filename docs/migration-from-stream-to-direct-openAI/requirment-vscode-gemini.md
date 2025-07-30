# Project: Stream Agent Flow Migration to Direct OpenAI API

## Goal

Replace the **Stream** service with **direct calls to the OpenAI API** for voice agent functionality, while maintaining all existing features of the **Stream Agent Flow**.  
Use the **Direct OpenAI Flow** codebase as a reference implementation.

---

## 1. Functional Requirements

### ✅ Preserve Existing Functionality

The migrated Stream Agent Flow must retain all current features:

- Real-time audio streaming  
- Transcript generation  
- Agent interaction and response  
- All existing UI components and user workflows  

### 🔄 Replace Stream Service

- Completely remove the dependency on the Stream service for:
  - Audio processing  
  - Transcription  
  - Agent interaction  

### 🔌 Direct OpenAI API Integration

- Implement direct communication with the OpenAI API for:
  - Session management (creation, termination)  
  - Real-time audio input  
  - Transcript retrieval  
  - AI agent response generation  

### ⚡ Maintain Real-time Performance

- Ensure minimal latency in:
  - Audio processing  
  - Transcription  
  - Agent responses  

### 🛡️ Error Handling

- Implement robust handling for OpenAI API errors:
  - Retry mechanisms  
  - Informative error messages  

### ⚙️ Configuration

- Allow configuration of:
  - OpenAI API keys  
  - Other relevant runtime settings  

---

## 2. Technical Requirements

### 📁 Reference Implementation

- Use the "Direct OpenAI Flow" codebase for API usage patterns and architecture.

### 🧱 Code Structure

- Maintain clean, modular, and maintainable code.

### 📦 Dependencies

- Minimize and update all external dependencies.

### ✅ Testing

- Implement comprehensive:
  - Unit tests  
  - Integration tests  

### 🧩 API Proxy

- Implement API proxy routes similar to:
  - `src/app/api/responses/route.ts`  
  - `src/app/api/session/route.ts`  

### 🎙️ Transcription Handling

- Adapt `useTranscripts` hook:
  - Path: `src/modules/call/hooks/use-transcripts.ts`  
  - Remove SSE (EventSource) and polling logic  
  - Use direct OpenAI transcription API  

### 🧾 Session Management

- Replace Stream-based session logic with OpenAI-based session management.

---

## 3. Migration Steps

1. **Set up OpenAI API Credentials**
   - Obtain API keys from [https://platform.openai.com](https://platform.openai.com)

2. **Implement OpenAI API Proxy Routes**
   - Create Next.js API routes to proxy:
     - Session creation  
     - Transcript retrieval  
     - Reference:
       - `src/app/api/responses/route.ts`  
       - `src/app/api/session/route.ts`  

3. **Modify `useTranscripts` Hook**
   - Remove:
     - `EventSource` / SSE logic  
     - `fallbackToPolling` mechanism  
   - Implement:
     - Direct calls to OpenAI API  
     - Data structure adaptation  

4. **Implement Session Management**
   - Use OpenAI for:
     - Creating sessions  
     - Tracking and terminating sessions  

5. **Integrate OpenAI Audio Input**
   - Stream audio input directly to OpenAI using proxy routes.

6. **Update Agent Interaction Logic**
   - Replace Stream API calls with OpenAI calls for:
     - Generating responses  
     - Managing agent state  

7. **Testing**
   - Write:
     - Unit tests  
     - Integration tests  

8. **Deployment**
   - Deploy to **staging** environment for validation.

---

## 4. Rollback Plan

- Maintain existing Stream Agent Flow as a **fallback backup**.
- Use **feature flags** to toggle the new flow.
- Enable quick reversion if critical issues arise.

---

## 5. Success Criteria

- ✅ All existing features are retained and functional.
- 🔥 Stream service is fully removed.
- ⚡ Real-time performance is comparable or improved.
- 🧱 Application is stable and production-ready.

