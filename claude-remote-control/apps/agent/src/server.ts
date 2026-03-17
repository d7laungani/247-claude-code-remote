/**
 * Main server entry point - Express HTTP server with WebSocket support.
 * Routes and handlers are split into separate modules for maintainability.
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';
import { execSync } from 'child_process';
import { initDatabase, closeDatabase } from './db/index.js';
import * as sessionsDb from './db/sessions.js';

// Routes
import {
  createProjectRoutes,
  createSessionRoutes,
  createPairRoutes,
  createHooksRoutes,
} from './routes/index.js';

// WebSocket
import { handleTerminalConnection, handleSessionsConnection } from './websocket-handlers.js';

// Utility to get active tmux sessions
function getActiveTmuxSessions(): Set<string> {
  try {
    const output = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', {
      encoding: 'utf-8',
    });
    return new Set(
      output
        .trim()
        .split('\n')
        .filter((s: string) => s)
    );
  } catch {
    return new Set();
  }
}

export async function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = createHttpServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Initialize SQLite database
  initDatabase();

  // Reconcile sessions with active tmux sessions
  const activeTmuxSessions = getActiveTmuxSessions();
  sessionsDb.reconcileWithTmux(activeTmuxSessions);

  // Load existing sessions
  const dbSessions = sessionsDb.getAllSessions();
  console.log(`[DB] Loaded ${dbSessions.length} sessions from database`);

  // Health check endpoint for container orchestration
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Mount API routes
  app.use('/api', createProjectRoutes());
  app.use('/api/sessions', createSessionRoutes());

  // Mount pairing routes (both at /pair and /api/pair for flexibility)
  app.use('/pair', createPairRoutes());
  app.use('/api/pair', createPairRoutes());

  // Mount hooks routes for Claude Code hook notifications
  app.use('/api/hooks', createHooksRoutes());

  // Handle WebSocket upgrades
  server.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);

    if (url.pathname === '/terminal') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleTerminalConnection(ws, url);
      });
      return;
    }

    if (url.pathname === '/sessions') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleSessionsConnection(ws, url);
      });
      return;
    }

    socket.destroy();
  });

  // Server-side WebSocket ping to keep connections alive through Tailscale proxy.
  // Protocol-level pings (ws.ping()) are recognized by proxies as keepalive,
  // unlike application-level JSON pings which look like regular data frames.
  const WS_PING_INTERVAL = 20_000; // 20s - well under typical proxy idle timeouts (60-120s)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, WS_PING_INTERVAL);

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Server] Shutting down...');
    clearInterval(pingInterval);
    closeDatabase();
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}
