"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Brain, AlertTriangle, CheckCircle, XCircle, Clock, User, Zap, MessageSquare } from 'lucide-react';

/**
 * GlassBoxTerminal - Real-time visualization of agent negotiation telemetry
 * Shows the internal dialogue between specialist agents as they negotiate treatment plans
 */

const AGENT_COLORS = {
  nephrologist: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-300', icon: '🧬' },
  oncologist: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300', icon: '🎗️' },
  cardiologist: { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-300', icon: '❤️' },
  endocrinologist: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300', icon: '⚗️' },
  cardiologist: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300', icon: '💊' },
  hera: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', text: 'text-cyan-300', icon: '🛡️' },
  patient_advocate: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300', icon: '👤' },
  system: { bg: 'bg-slate-500/20', border: 'border-slate-500/40', text: 'text-slate-300', icon: '⚙️' },
  human: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300', icon: '🧑‍⚕️' },
};

const EVENT_ICONS = {
  negotiation_started: Clock,
  round_started: Zap,
  agent_proposal: MessageSquare,
  constraint_evaluation: AlertTriangle,
  veto_issued: XCircle,
  revision_requested: AlertTriangle,
  consensus_reached: CheckCircle,
  negotiation_complete: CheckCircle,
  intervention_received: User,
  error: XCircle,
};

function formatTimestamp(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}

function AgentBadge({ agent }) {
  const config = AGENT_COLORS[agent] || AGENT_COLORS.system;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.border} border ${config.text}`}>
      <span>{config.icon}</span>
      <span className="capitalize">{agent?.replace('_', ' ') || 'System'}</span>
    </span>
  );
}

function EventLine({ event, isNew }) {
  const Icon = EVENT_ICONS[event.type] || MessageSquare;
  const config = AGENT_COLORS[event.agent] || AGENT_COLORS.system;
  
  const renderEventContent = () => {
    switch (event.type) {
      case 'negotiation_started':
        return (
          <div className="text-cyan-300">
            <span className="font-semibold">Negotiation session initiated</span>
            <span className="text-slate-400 ml-2">Session: {event.sessionId?.slice(0, 8)}...</span>
          </div>
        );
      
      case 'round_started':
        return (
          <div className="text-amber-300">
            <span className="font-semibold">Round {event.round} started</span>
            <span className="text-slate-400 ml-2">Max rounds: {event.maxRounds}</span>
          </div>
        );
      
      case 'agent_proposal':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent={event.agent} />
              <span className="text-slate-300">proposes:</span>
            </div>
            <div className="ml-4 p-2 rounded bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-200">{event.proposal?.recommendation || 'No recommendation'}</p>
              {event.proposal?.confidence && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Confidence:</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full max-w-[100px]">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(event.proposal.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-300">{(event.proposal.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
              {event.proposal?.reasoning && (
                <p className="mt-1 text-xs text-slate-400 italic">&quot;{event.proposal.reasoning}&quot;</p>
              )}
            </div>
          </div>
        );
      
      case 'constraint_evaluation':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent="hera" />
              <span className="text-slate-300">evaluating constraints...</span>
            </div>
            {event.constraints && event.constraints.length > 0 && (
              <div className="ml-4 space-y-1">
                {event.constraints.map((c, i) => (
                  <div key={i} className={`text-xs px-2 py-1 rounded ${c.violated ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                    {c.violated ? '✗' : '✓'} {c.name}: {c.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'veto_issued':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent="hera" />
              <span className="text-red-400 font-semibold">VETO ISSUED</span>
            </div>
            <div className="ml-4 p-2 rounded bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-200">{event.reason}</p>
              {event.violations && event.violations.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {event.violations.map((v, i) => (
                    <li key={i} className="text-xs text-red-300">- {v}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      
      case 'revision_requested':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent={event.targetAgent} />
              <span className="text-amber-300">revision requested</span>
            </div>
            <div className="ml-4 p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-200">{event.feedback}</p>
            </div>
          </div>
        );
      
      case 'consensus_reached':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="font-semibold">CONSENSUS REACHED</span>
              <span className="text-slate-400">in {event.rounds} rounds</span>
            </div>
            {event.consensusScore && (
              <div className="ml-4 flex items-center gap-2">
                <span className="text-xs text-slate-400">Agreement Score:</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full max-w-[150px]">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                    style={{ width: `${event.consensusScore * 100}%` }}
                  />
                </div>
                <span className="text-sm text-emerald-300 font-medium">{(event.consensusScore * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        );
      
      case 'negotiation_complete':
        return (
          <div className="text-emerald-300">
            <span className="font-semibold">Negotiation completed</span>
            <span className="text-slate-400 ml-2">
              Status: {event.status} | Rounds: {event.totalRounds}
            </span>
          </div>
        );
      
      case 'intervention_received':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent="human" />
              <span className="text-yellow-400 font-semibold">HUMAN INTERVENTION</span>
            </div>
            <div className="ml-4 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-200">{event.constraint}</p>
              {event.source && (
                <p className="text-xs text-yellow-300/70 mt-1">Source: {event.source}</p>
              )}
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="text-red-400">
            <span className="font-semibold">Error:</span>
            <span className="ml-2">{event.message}</span>
          </div>
        );
      
      default:
        return (
          <div className="text-slate-300">
            <span className="font-medium">{event.type}:</span>
            <span className="ml-2 text-slate-400">{JSON.stringify(event.data || event)}</span>
          </div>
        );
    }
  };

  return (
    <div className={`flex gap-3 py-2 px-3 rounded-lg transition-all duration-300 ${isNew ? 'bg-cyan-500/10 animate-pulse' : 'hover:bg-slate-800/30'}`}>
      <div className="flex-shrink-0 w-20 text-xs text-slate-500 font-mono pt-1">
        {formatTimestamp(event.timestamp)}
      </div>
      <div className={`flex-shrink-0 p-1 rounded ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        {renderEventContent()}
      </div>
    </div>
  );
}

function RoundDivider({ round }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Round {round}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  );
}

export default function GlassBoxTerminal({ 
  events = [], 
  isConnected = false, 
  sessionId = null,
  status = 'idle',
  className = '' 
}) {
  const terminalRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newEventIds, setNewEventIds] = useState(new Set());
  const prevEventsLength = useRef(events.length);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Track new events for animation
  useEffect(() => {
    if (events.length > prevEventsLength.current) {
      const newIds = new Set();
      for (let i = prevEventsLength.current; i < events.length; i++) {
        newIds.add(i);
      }
      setNewEventIds(newIds);
      
      // Clear animation after 1 second
      setTimeout(() => setNewEventIds(new Set()), 1000);
    }
    prevEventsLength.current = events.length;
  }, [events.length]);

  // Handle manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  // Group events by round for visual separation
  const groupedEvents = [];
  let currentRound = 0;
  
  events.forEach((event, index) => {
    if (event.round && event.round !== currentRound && event.type === 'round_started') {
      currentRound = event.round;
      groupedEvents.push({ type: 'divider', round: currentRound, key: `divider-${currentRound}` });
    }
    groupedEvents.push({ ...event, index, key: `event-${index}` });
  });

  const getStatusColor = () => {
    switch (status) {
      case 'negotiating': return 'text-amber-400';
      case 'consensus': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'intervention': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'negotiating': return 'Agents Negotiating...';
      case 'consensus': return 'Consensus Reached';
      case 'failed': return 'Negotiation Failed';
      case 'intervention': return 'Processing Intervention';
      default: return 'Awaiting Session';
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-sm overflow-hidden ${className}`}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">Glass Box Reasoning</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {/* Session Status */}
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full bg-slate-800/80 ${getStatusColor()}`}>
            {status === 'negotiating' && <Brain className="w-3 h-3 animate-pulse" />}
            <span className="text-xs font-medium">{getStatusText()}</span>
          </div>
          
          {/* Session ID */}
          {sessionId && (
            <span className="text-xs text-slate-500 font-mono">
              {sessionId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={terminalRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-[300px] max-h-[600px] p-2 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <Brain className="w-12 h-12 opacity-30" />
            <p>Waiting for agent negotiation to begin...</p>
            <p className="text-xs">Start a negotiation session to see real-time reasoning</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedEvents.map((item) => 
              item.type === 'divider' ? (
                <RoundDivider key={item.key} round={item.round} />
              ) : (
                <EventLine 
                  key={item.key} 
                  event={item} 
                  isNew={newEventIds.has(item.index)}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/60 bg-slate-800/30">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{events.length} events</span>
          {!autoScroll && (
            <button 
              onClick={() => {
                setAutoScroll(true);
                if (terminalRef.current) {
                  terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
                }
              }}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Resume auto-scroll
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Auto-scroll:</span>
          <div className={`w-2 h-2 rounded-full ${autoScroll ? 'bg-emerald-400' : 'bg-slate-500'}`} />
        </div>
      </div>
    </div>
  );
}
