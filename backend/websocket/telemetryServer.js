/**
 * WebSocket Server for Real-Time Agent Telemetry
 * 
 * Provides live streaming of agent negotiations, thoughts, and decisions
 * to the Glass Box Reasoning UI for complete transparency.
 */

const WebSocket = require('ws');
const { negotiationEventBus } = require('../services/agentNegotiation.service');

const url = require('url');
const jwt = require('jsonwebtoken');

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  JWT_SECRET = 'fallback_secret_for_demo_purposes_only';
}

let wss = null;
const clientSessions = new Map(); // Map<WebSocket, Set<sessionId>>

/**
 * Initialize WebSocket server attached to HTTP server
 */
function initializeWebSocket(server) {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws/telemetry'
  });

  console.log('[WebSocket] Telemetry server initialized on /ws/telemetry');

  wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true);
    const token = parameters.query.token;

    if (!token) {
      console.log('[WebSocket] Connection rejected: No token provided');
      ws.close(4001, 'Unauthorized');
      return;
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.log('[WebSocket] Connection rejected: Invalid token');
      ws.close(4001, 'Unauthorized');
      return;
    }

    const clientId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    console.log(`[WebSocket] Client connected: ${clientId}`);
    
    // Initialize client session tracking
    clientSessions.set(ws, new Set());
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId,
      message: 'Connected to BioTwin Agent Telemetry Stream',
      timestamp: Date.now()
    }));

    // Handle incoming messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, data, clientId);
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: Date.now()
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      
      // Cleanup session subscriptions
      const sessions = clientSessions.get(ws);
      if (sessions) {
        sessions.forEach(sessionId => {
          unsubscribeFromSession(ws, sessionId);
        });
      }
      clientSessions.delete(ws);
    });

    // Handle errors
    ws.on('error', (err) => {
      console.error(`[WebSocket] Client error (${clientId}):`, err.message);
    });
  });

  // Subscribe to global telemetry events
  negotiationEventBus.on('telemetry', (event) => {
    broadcastToSession(event.sessionId, event);
  });

  return wss;
}

/**
 * Handle incoming messages from WebSocket clients
 */
function handleClientMessage(ws, data, clientId) {
  switch (data.type) {
    case 'subscribe':
      // Subscribe to a specific negotiation session
      if (data.sessionId) {
        subscribeToSession(ws, data.sessionId);
        ws.send(JSON.stringify({
          type: 'subscribed',
          sessionId: data.sessionId,
          message: `Now receiving telemetry for session: ${data.sessionId}`,
          timestamp: Date.now()
        }));
      }
      break;

    case 'unsubscribe':
      // Unsubscribe from a session
      if (data.sessionId) {
        unsubscribeFromSession(ws, data.sessionId);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          sessionId: data.sessionId,
          timestamp: Date.now()
        }));
      }
      break;

    case 'ping':
      // Heartbeat response
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
      break;

    case 'intervention':
      // Forward human intervention to the negotiation system
      // This is handled by the REST API, but we acknowledge receipt
      ws.send(JSON.stringify({
        type: 'intervention_received',
        message: 'Intervention forwarded to negotiation engine',
        timestamp: Date.now()
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'unknown_command',
        message: `Unknown message type: ${data.type}`,
        timestamp: Date.now()
      }));
  }
}

/**
 * Subscribe a client to a specific session's telemetry
 */
function subscribeToSession(ws, sessionId) {
  const sessions = clientSessions.get(ws);
  if (sessions) {
    sessions.add(sessionId);
  }
}

/**
 * Unsubscribe a client from a session
 */
function unsubscribeFromSession(ws, sessionId) {
  const sessions = clientSessions.get(ws);
  if (sessions) {
    sessions.delete(sessionId);
  }
}

/**
 * Broadcast telemetry event to all clients subscribed to a session
 */
function broadcastToSession(sessionId, event) {
  if (!wss) return;

  const message = JSON.stringify({
    ...event,
    _broadcast: true
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const sessions = clientSessions.get(client);
      
      // Send to clients subscribed to this session OR to 'all' sessions
      if (sessions && (sessions.has(sessionId) || sessions.has('all'))) {
        client.send(message);
      }
    }
  });
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(event) {
  if (!wss) return;

  const message = JSON.stringify({
    ...event,
    _global: true,
    timestamp: Date.now()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Send telemetry event directly (for external callers)
 */
function emitTelemetry(sessionId, event) {
  broadcastToSession(sessionId, {
    sessionId,
    timestamp: Date.now(),
    ...event
  });
}

/**
 * Get WebSocket server instance
 */
function getWSS() {
  return wss;
}

/**
 * Get count of connected clients
 */
function getClientCount() {
  return wss ? wss.clients.size : 0;
}

module.exports = {
  initializeWebSocket,
  broadcastToSession,
  broadcastToAll,
  emitTelemetry,
  getWSS,
  getClientCount
};
