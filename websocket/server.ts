// websocket/server.ts
import 'dotenv/config';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { AgentOrchestrator } from '@/lib/agent/AgentOrchestrator';
import { agentConfig } from '@/config/agent.config';
import { parse } from 'url';
import cors from 'cors';

// Create a simple HTTP server to handle CORS pre-flight requests
const server = createServer((req, res) => {
    // We use the `cors` middleware to automatically handle OPTIONS requests
    cors() (req, res, () => {
        res.writeHead(200);
        res.end("WebSocket server is running");
    });
});

const wss = new WebSocketServer({ server });

const activeOrchestrators = new Map<string, AgentOrchestrator>();

wss.on('connection', (ws, request) => {
    // We need to parse the URL from the request to get query params
    const url = request.url ? new URL(request.url, `http://${request.headers.host}`) : null;
    const meetingId = url?.searchParams.get('meetingId') as string;
    const token = url?.searchParams.get('token') as string;

    console.log(`[Server] WebSocket connection attempt for meeting: ${meetingId}`);

    // --- Authentication Step ---
    if (!token || !meetingId) {
      ws.close(1008, 'Meeting ID and Token are required.');
      return;
    }

    const orchestrator = new AgentOrchestrator(meetingId, ws, agentConfig);
    activeOrchestrators.set(meetingId, orchestrator);

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());
        console.log(`[Server] Received message of type: ${msg.type || 'unknown'}`);

        if (msg.type === 'audio_chunk' && msg.data) {
          const audioBuffer = Buffer.from(msg.data, 'base64');
          orchestrator.handleClientAudio(audioBuffer);
        }
      } catch (error) {
        console.error("[Server] Failed to parse incoming message:", message.toString(), error);
      }
    });

    ws.on('close', () => {
      console.log(`[Server] WebSocket connection closed for meeting: ${meetingId}`);
      orchestrator.cleanup();
      activeOrchestrators.delete(meetingId);
    });
});

const port = 3001; // We run the WebSocket server on a different port
server.listen(port, () => {
  console.log(`> WebSocket server ready on ws://localhost:${port}`);
});