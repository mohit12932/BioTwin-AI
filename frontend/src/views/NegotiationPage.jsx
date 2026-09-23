"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Home,
  MessageSquare,
  Play,
  RefreshCw,
  Users,
  Zap,
  AlertTriangle,
  Clock
} from 'lucide-react';
import apiClient, { 
  startNegotiation, 
  injectIntervention
  // getNegotiationState - reserved for future polling implementation
} from '../api/apiClient';
import useAgentTelemetry from '../hooks/useAgentTelemetry';
import GlassBoxTerminal from '../components/GlassBoxTerminal';
import HITLInterventionPanel from '../components/HITLInterventionPanel';

/**
 * NegotiationPage - Full-page view for agent negotiation with Glass Box UI
 * Shows real-time multi-agent negotiation with human-in-the-loop capabilities
 */

// Agent node visualization for the network diagram
function AgentNode({ agent, isActive, hasProposal, status }) {
  const AGENT_CONFIG = {
    nephrologist: { color: 'purple', icon: '🫘', label: 'Nephrologist' },
    oncologist: { color: 'red', icon: '🎗️', label: 'Oncologist' },
    cardiologist: { color: 'pink', icon: '❤️', label: 'Cardiologist' },
    endocrinologist: { color: 'amber', icon: '⚗️', label: 'Endocrinologist' },
    hera: { color: 'cyan', icon: '🛡️', label: 'HERA' },
    patient_advocate: { color: 'blue', icon: '👤', label: 'Patient Advocate' },
  };

  const config = AGENT_CONFIG[agent] || { color: 'slate', icon: '🤖', label: agent };
  
  const colorStyles = {
    purple: { ring: 'ring-purple-500', bg: 'bg-purple-500/20', text: 'text-purple-300', glow: 'shadow-purple-500/30' },
    red: { ring: 'ring-red-500', bg: 'bg-red-500/20', text: 'text-red-300', glow: 'shadow-red-500/30' },
    pink: { ring: 'ring-pink-500', bg: 'bg-pink-500/20', text: 'text-pink-300', glow: 'shadow-pink-500/30' },
    amber: { ring: 'ring-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-300', glow: 'shadow-amber-500/30' },
    green: { ring: 'ring-green-500', bg: 'bg-green-500/20', text: 'text-green-300', glow: 'shadow-green-500/30' },
    cyan: { ring: 'ring-cyan-500', bg: 'bg-cyan-500/20', text: 'text-cyan-300', glow: 'shadow-cyan-500/30' },
    blue: { ring: 'ring-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-300', glow: 'shadow-blue-500/30' },
    slate: { ring: 'ring-slate-500', bg: 'bg-slate-500/20', text: 'text-slate-300', glow: 'shadow-slate-500/30' },
  };

  const style = colorStyles[config.color];

  return (
    <div className={`
      relative flex flex-col items-center gap-2 p-3 rounded-xl 
      transition-all duration-300 
      ${isActive ? `${style.bg} ring-2 ${style.ring} shadow-lg ${style.glow}` : 'bg-slate-800/30'}
      ${isActive ? 'scale-110' : 'scale-100'}
    `}>
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center text-2xl
        ${style.bg} border border-slate-700/50
        ${isActive ? 'animate-pulse' : ''}
      `}>
        {config.icon}
      </div>
      <span className={`text-xs font-medium ${isActive ? style.text : 'text-slate-400'}`}>
        {config.label}
      </span>
      {hasProposal && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
      )}
      {status === 'veto' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs">✗</span>
        </div>
      )}
    </div>
  );
}

// Network visualization showing agent relationships
function AgentNetwork({ activeAgent, proposals, status }) {
  const agents = ['nephrologist', 'oncologist', 'cardiologist', 'endocrinologist', 'hera', 'patient_advocate'];
  
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/90 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-slate-200">Agent Network</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {agents.slice(0, 4).map(agent => (
          <AgentNode 
            key={agent}
            agent={agent}
            isActive={activeAgent === agent}
            hasProposal={proposals?.has(agent)}
            status={agent === 'hera' && status === 'veto' ? 'veto' : null}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 justify-items-center">
        {agents.slice(4).map(agent => (
          <AgentNode 
            key={agent}
            agent={agent}
            isActive={activeAgent === agent}
            hasProposal={proposals?.has(agent)}
            status={agent === 'hera' && status === 'veto' ? 'veto' : null}
          />
        ))}
      </div>
    </div>
  );
}

// Session stats panel
function SessionStats({ events, roundNumber }) {
  const proposalCount = events.filter(e => e.type === 'agent_proposal').length;
  const vetoCount = events.filter(e => e.type === 'veto_issued').length;
  const interventionCount = events.filter(e => e.type === 'intervention_received').length;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/90 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-slate-200">Session Statistics</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <p className="text-2xl font-bold text-cyan-300">{roundNumber || 0}</p>
          <p className="text-xs text-slate-400">Current Round</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3">
          <p className="text-2xl font-bold text-emerald-300">{proposalCount}</p>
          <p className="text-xs text-slate-400">Proposals</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3">
          <p className="text-2xl font-bold text-red-300">{vetoCount}</p>
          <p className="text-xs text-slate-400">Vetoes</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3">
          <p className="text-2xl font-bold text-yellow-300">{interventionCount}</p>
          <p className="text-xs text-slate-400">Interventions</p>
        </div>
      </div>
    </div>
  );
}

// Consensus result panel
function ConsensusResult({ result }) {
  if (!result) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-300">Consensus Reached</span>
      </div>
      <div className="space-y-3">
        {result.recommendations?.map((rec, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-sm font-medium text-slate-200">{rec.treatment || rec.recommendation}</p>
            {rec.confidence && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${rec.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{(rec.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        ))}
        {result.consensusScore && (
          <div className="pt-2 border-t border-slate-700/40">
            <p className="text-xs text-slate-400">
              Overall Agreement: <span className="text-emerald-300 font-semibold">{(result.consensusScore * 100).toFixed(0)}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NegotiationPage() {
  const router = useRouter();
  const { id: patientId } = useParams();
  
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, negotiating, consensus, failed, intervention
  const [roundNumber, setRoundNumber] = useState(0);
  const [consensusResult, setConsensusResult] = useState(null);
  const [proposals, setProposals] = useState(new Set());
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [patient, setPatient] = useState(null);

  // Connect to telemetry WebSocket
  const {
    events,
    isConnected,
    connectionError,
    activeAgent,
    subscribe,
    clearEvents
  } = useAgentTelemetry(sessionId, {
    autoConnect: true,
    onEvent: (event) => {
      // Update local state based on events
      if (event.type === 'round_started') {
        setRoundNumber(event.round);
      } else if (event.type === 'agent_proposal') {
        setProposals(prev => new Set([...prev, event.agent]));
      } else if (event.type === 'veto_issued') {
        setStatus('intervention');
      } else if (event.type === 'consensus_reached') {
        setStatus('consensus');
        setConsensusResult(event);
      } else if (event.type === 'negotiation_complete') {
        if (event.status === 'consensus') {
          setStatus('consensus');
        } else {
          setStatus('failed');
        }
      } else if (event.type === 'intervention_received') {
        setStatus('intervention');
      }
    }
  });

  // Load patient data
  useEffect(() => {
    if (patientId) {
      apiClient.get(`/patient/${patientId}`)
        .then(res => setPatient(res.data))
        .catch(err => console.error('Failed to load patient:', err));
    }
  }, [patientId]);

  // Start a new negotiation
  const handleStartNegotiation = useCallback(async () => {
    if (!patientId) {
      setError('No patient selected');
      return;
    }

    setIsStarting(true);
    setError(null);
    clearEvents();
    setProposals(new Set());
    setRoundNumber(0);
    setConsensusResult(null);
    setStatus('negotiating');

    try {
      const result = await startNegotiation(patientId, {
        maxRounds: 5,
        consensusThreshold: 0.7
      });
      
      setSessionId(result.sessionId);
      subscribe(result.sessionId);
    } catch (err) {
      console.error('Failed to start negotiation:', err);
      setError(err.response?.data?.error || err.message || 'Failed to start negotiation');
      setStatus('failed');
    } finally {
      setIsStarting(false);
    }
  }, [patientId, clearEvents, subscribe]);

  // Handle HITL intervention
  const handleIntervention = useCallback(async (intervention) => {
    if (!sessionId) {
      setError('No active session');
      return;
    }

    try {
      await injectIntervention(sessionId, intervention);
      setStatus('negotiating'); // Resume after intervention
    } catch (err) {
      console.error('Failed to inject intervention:', err);
      setError(err.response?.data?.error || err.message || 'Failed to inject intervention');
    }
  }, [sessionId]);

  // Restart negotiation
  const handleRestart = useCallback(() => {
    handleStartNegotiation();
  }, [handleStartNegotiation]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'negotiating':
        return { icon: Brain, text: 'Agents Negotiating...', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      case 'consensus':
        return { icon: CheckCircle2, text: 'Consensus Reached', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'failed':
        return { icon: AlertTriangle, text: 'Negotiation Failed', color: 'text-red-400', bg: 'bg-red-500/10' };
      case 'intervention':
        return { icon: Zap, text: 'Processing Intervention', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
      default:
        return { icon: Clock, text: 'Ready to Start', color: 'text-slate-400', bg: 'bg-slate-500/10' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_40%),linear-gradient(180deg,_#07111f_0%,_#0b1320_100%)] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(-1)}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  Multi-Agent Negotiation
                </h1>
                <p className="text-xs text-slate-400">
                  {patient ? `Patient: ${patient.name || patient.demographics?.name || patientId}` : 'Loading patient...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs text-slate-400">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>

              {/* Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusDisplay.bg}`}>
                <StatusIcon className={`w-4 h-4 ${statusDisplay.color} ${status === 'negotiating' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium ${statusDisplay.color}`}>
                  {statusDisplay.text}
                </span>
              </div>

              {/* Home Button */}
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <Home className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Error Banner */}
        {(error || connectionError) && (
          <div className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10">
            <div className="flex items-center gap-2 text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <span>{error || connectionError}</span>
            </div>
          </div>
        )}

        {/* Start Button - Show when idle */}
        {status === 'idle' && (
          <div className="mb-6 text-center py-12">
            <div className="inline-flex flex-col items-center gap-4">
              <Brain className="w-16 h-16 text-cyan-400/30" />
              <h2 className="text-xl font-semibold text-slate-200">Ready to Begin Agent Negotiation</h2>
              <p className="text-sm text-slate-400 max-w-md">
                Start a multi-agent negotiation session where specialist agents collaborate to find the optimal treatment plan for this patient.
              </p>
              <button
                onClick={handleStartNegotiation}
                disabled={isStarting || !patientId}
                className="
                  flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-gradient-to-r from-cyan-500 to-blue-500
                  text-white font-semibold
                  hover:from-cyan-400 hover:to-blue-400
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                "
              >
                {isStarting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Negotiation
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Glass Box Terminal */}
          <div className="lg:col-span-2 space-y-6">
            <GlassBoxTerminal
              events={events}
              isConnected={isConnected}
              sessionId={sessionId}
              status={status}
              className="h-[600px]"
            />

            {/* Consensus Result */}
            {status === 'consensus' && consensusResult && (
              <ConsensusResult result={consensusResult} />
            )}
          </div>

          {/* Right Column - Controls & Stats */}
          <div className="space-y-6">
            {/* Agent Network */}
            <AgentNetwork
              activeAgent={activeAgent}
              proposals={proposals}
              status={status}
            />

            {/* Session Stats */}
            <SessionStats
              events={events}
              roundNumber={roundNumber}
            />

            {/* HITL Intervention Panel */}
            <HITLInterventionPanel
              sessionId={sessionId}
              onIntervene={handleIntervention}
              onRestart={handleRestart}
              status={status}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
