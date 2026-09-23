/**
 * WebSocket hook for Agent Telemetry
 * Connects to the backend telemetry stream for real-time agent negotiation updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;

export function useAgentTelemetry(sessionId, options = {}) {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [activeAgent, setActiveAgent] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const connectRef = useRef(null);
  
  const { autoConnect = true, onEvent, onConnect, onDisconnect } = options;

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('biotwin_token') : null;
    let wsUrl = '';
    
    if (process.env.NEXT_PUBLIC_WS_HOST) {
      if (process.env.NEXT_PUBLIC_WS_HOST.startsWith('ws')) {
        wsUrl = `${process.env.NEXT_PUBLIC_WS_HOST}/ws/telemetry`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${process.env.NEXT_PUBLIC_WS_HOST}/ws/telemetry`;
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host.replace(':3000', ':5000');
      wsUrl = `${protocol}//${host}/ws/telemetry`;
    }
    
    return `${wsUrl}${token ? `?token=${token}` : ''}`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      const wsUrl = getWsUrl();
      console.log('[Telemetry] Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('[Telemetry] Connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to session if provided
        if (sessionId) {
          ws.send(JSON.stringify({ type: 'subscribe', sessionId }));
        }
        
        onConnect?.();
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update state based on event type
          if (data.type === 'agent_start') {
            setActiveAgent(data.agent);
          } else if (data.type === 'agent_complete') {
            setActiveAgent(null);
          } else if (data.type === 'phase_start') {
            setCurrentPhase(data.phase);
          } else if (data.type === 'round_start') {
            setCurrentPhase('round_' + data.round);
          } else if (data.type === 'consensus_reached' || data.type === 'negotiation_complete') {
            setCurrentPhase('complete');
          }
          
          // Add to events list
          setEvents(prev => [...prev, { ...data, receivedAt: Date.now() }]);
          
          // Call custom event handler
          onEvent?.(data);
        } catch (err) {
          console.error('[Telemetry] Failed to parse message:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log('[Telemetry] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        onDisconnect?.();
        
        // Attempt reconnection using ref to avoid temporal dead zone
        if (reconnectAttempts.current < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          console.log(`[Telemetry] Reconnecting (${reconnectAttempts.current}/${WS_MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeout.current = setTimeout(() => {
            connectRef.current?.();
          }, WS_RECONNECT_DELAY);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };
      
      ws.onerror = (error) => {
        console.error('[Telemetry] WebSocket error:', error);
        setConnectionError('Connection error');
      };
      
    } catch (err) {
      console.error('[Telemetry] Failed to connect:', err);
      setConnectionError(err.message);
    }
  }, [getWsUrl, sessionId, onConnect, onDisconnect, onEvent]);
  
  // Keep connectRef in sync with connect function
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Subscribe to a session
  const subscribe = useCallback((newSessionId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', sessionId: newSessionId }));
    }
  }, []);

  // Unsubscribe from a session
  const unsubscribe = useCallback((targetSessionId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', sessionId: targetSessionId }));
    }
  }, []);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      setTimeout(() => connect(), 0);
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Subscribe to new session when sessionId changes
  useEffect(() => {
    if (sessionId && isConnected) {
      subscribe(sessionId);
    }
  }, [sessionId, isConnected, subscribe]);

  return {
    events,
    isConnected,
    connectionError,
    currentPhase,
    activeAgent,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearEvents
  };
}

export default useAgentTelemetry;
