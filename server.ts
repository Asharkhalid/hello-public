// server.ts

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { AgentOrchestrator } from '@/lib/agent/AgentOrchestrator';
import { agentConfig } from '@/config/agent.config';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// A map to hold active orchestrators for each meeting
const activeOrchestrators = new Map<string, AgentOrchestrator>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url!, true);

    if (pathname === '/api/ws/agent') {
      // --- Authentication Step ---
      const token = query.token as string;
      const meetingId = query.meetingId as string;

      if (!token || !meetingId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, meetingId);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: any, request: any, meetingId: any) => {
    console.log(`[Server] WebSocket connection established for meeting: ${meetingId}`);

    const orchestrator = new AgentOrchestrator(meetingId, ws, agentConfig);
    activeOrchestrators.set(meetingId, orchestrator);

    ws.on('message', (message: any) => {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'audio_chunk') {
        const audioBuffer = Buffer.from(msg.data, 'base64');
        orchestrator.handleClientAudio(audioBuffer);
      }
    });

    ws.on('close', () => {
      console.log(`[Server] WebSocket connection closed for meeting: ${meetingId}`);
      orchestrator.cleanup();
      activeOrchestrators.delete(meetingId);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});