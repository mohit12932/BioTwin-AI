"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Download,
  Home,
  Info,
  Sparkles,
  User,
  LayoutDashboard,
  Droplet,
  HeartPulse,
  Zap,
  Shield,
  TrendingUp,
  FileCheck,
  ChevronRight,
  Play,
  RotateCcw,
  Clock,
  AlertOctagon,
  FlaskConical,
  Database,
  Search,
  Brain,
  RefreshCw,
  MessageSquare,
  ArrowLeft, Bell, X, ArrowRight
} from 'lucide-react';
import apiClient, { startNegotiation, startNegotiationSync, getNegotiationState, getTelemetryWebSocketUrl, injectIntervention } from '../api/apiClient';
import PatientProfilePanel from '../components/PatientProfilePanel';
import OutcomeTrajectoryChart from '../components/OutcomeTrajectoryChart';

// =============================================================================
// CONFIGURATION: New sidebar structure for consensus-centered dashboard
// =============================================================================

const AGENT_CONFIG = {
  nephrologist: {
    key: 'nephrologist',
    name: 'Nephrologist',
    shortName: 'NA',
    icon: Droplet,
    emoji: '🫘',
    color: '#a855f7',
    bgColor: '#f3e8ff',
    borderColor: '#a855f7',
    description: 'Renal function and fluid balance optimization',
  },
  cardiologist: {
    key: 'cardiologist',
    name: 'Cardiologist',
    shortName: 'CA',
    icon: HeartPulse,
    emoji: '❤️',
    color: '#22c55e',
    bgColor: '#dcfce7',
    borderColor: '#22c55e',
    description: 'Cardiovascular hemodynamics and dosing safety',
  },
  endocrinologist: {
    key: 'endocrinologist',
    name: 'Endocrinologist',
    shortName: 'EA',
    icon: Zap,
    emoji: '⚡',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    description: 'Metabolic pathway analysis and glucose management',
  },
  hera: {
    key: 'hera',
    name: 'HERA Guardian',
    shortName: 'HERA',
    icon: Shield,
    emoji: '🛡️',
    color: '#06b6d4',
    bgColor: '#cffafe',
    borderColor: '#06b6d4',
    description: 'Economic constraints and real-world viability',
    isGuardian: true,
  },
};

const sectionThemes = {
  overview: {
    layer: 'Consensus Overview',
    description: 'Multi-agent consensus summary with transparent reasoning and recommendations.',
    accentBg: 'bg-emerald-100',
    accentText: 'text-emerald-700',
  },
  profile: {
    layer: 'Patient Profile',
    description: 'Complete patient phenotype, vitals, biomarkers, and socio-economic context.',
    accentBg: 'bg-sky-100',
    accentText: 'text-sky-700',
  },
  nephrologist: {
    layer: 'Nephrologist Agent',
    description: 'Renal function analysis, eGFR trends, and toxicity risk factors.',
    accentBg: 'bg-violet-100',
    accentText: 'text-violet-700',
  },
  cardiologist: {
    layer: 'Cardiologist Agent',
    description: 'Cardiovascular output, hypotensive risk, and interaction safety assessment.',
    accentBg: 'bg-green-100',
    accentText: 'text-green-700',
  },
  endocrinologist: {
    layer: 'Endocrinologist Agent',
    description: 'Metabolic pathway analysis, glucose management, and hormonal factors.',
    accentBg: 'bg-amber-100',
    accentText: 'text-amber-700',
  },
  hera: {
    layer: 'HERA Guardian',
    description: 'Economic constraints, insurance validation, and real-world treatment viability.',
    accentBg: 'bg-cyan-100',
    accentText: 'text-cyan-700',
  },
  trajectory: {
    layer: 'Outcome Trajectory',
    description: 'Projected disease path comparing baseline vs. consensus-driven protocol.',
    accentBg: 'bg-emerald-100',
    accentText: 'text-emerald-700',
  },
  recommendation: {
    layer: 'Final Recommendation',
    description: 'Consensus-driven treatment protocol with full explainability audit trail.',
    accentBg: 'bg-emerald-100',
    accentText: 'text-emerald-700',
  },
};

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

const Panel = ({ children, className = '' }) => (
  <div className={`rounded-[28px] border border-black/5 bg-white/88 p-6 shadow-[0_10px_40px_rgba(64,88,70,0.08)] backdrop-blur ${className}`}>
    {children}
  </div>
);

const InfoHint = ({ text }) => (
  <span className="group relative inline-flex align-middle">
    <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-black/10">
      <Info className="h-3.5 w-3.5" />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 rounded-2xl bg-slate-900 px-3 py-2 text-xs leading-5 text-white shadow-xl group-hover:block">
      {text}
    </span>
  </span>
);

// Agent insight data generator based on patient data and real backend telemetry
const generateAgentInsights = (patient, drugIntel, result, realAgentAnalyses) => {
  const cyp2c19 = patient?.biomarkers?.pharmacogenomics?.cyp2c19 || '*1/*2 Poor Metabolizer';
  const glucoseLevel = patient?.vitals?.sugar || patient?.vitals?.glucose || 142;
  const monthlyBudget = patient?.socioEconomic?.monthlyMedicationBudget || 150;
  const insurance = patient?.socioEconomic?.insuranceTier || 'Basic';
  const medications = patient?.medications || [];

  // Helper to safely extract real data or fallback
  const getAgentData = (agentKey, fallbackData) => {
    const realData = realAgentAnalyses?.[agentKey];
    if (!realData) return fallbackData;

    return {
      ...fallbackData,
      rationale: realData.keyFindings?.[0] || realData.rationale || fallbackData.rationale,
      recommendation: realData.proposalType || realData.recommendation || fallbackData.recommendation,
      confidence: realData.confidence ? Math.round(realData.confidence * 100) : fallbackData.confidence,
      dataAnalyzed: realData.dataAnalyzed || fallbackData.dataAnalyzed,
      risk: realData.risk || fallbackData.risk,
    };
  };
  
  return {
    nephrologist: getAgentData('nephrologist', {
      ...AGENT_CONFIG.nephrologist,
      status: result ? 'consensus' : 'ready',
      dataAnalyzed: [
        'eGFR & Creatinine Clearance',
        'Electrolyte Panel (K+, Na+)',
        'Renal Toxicity Risk Assessment',
        'Fluid Balance Status',
      ],
      rationale: 'Patient exhibits normal renal function (eGFR > 60). No acute kidney injury markers detected. Kidneys can safely clear standard protocol dosages without risking nephrotoxicity.',
      recommendation: 'Standard renal dosing approved',
      risk: 'Standard dosages of nephrotoxic medications may cause acute kidney injury if clearance drops',
      confidence: 95,
    }),
    cardiologist: getAgentData('cardiologist', {
      ...AGENT_CONFIG.cardiologist,
      status: result ? 'consensus' : 'ready',
      dataAnalyzed: [
        `Current medication regimen (${medications.length} active drugs)`,
        'Ejection Fraction & BP Trends',
        'Drug-drug interaction database',
        'Hypotensive Risk Matrix',
      ],
      rationale: `${medications.length > 0 ? `Current regimen includes ${medications.map(m => m.name || m).join(', ')}.` : ''} Hemodynamics are stable. Cardiac output is sufficient. No significant cardiovascular contraindications detected.`,
      recommendation: 'Maintain current cardiac protocol; monitor BP',
      risk: 'Drug accumulation and potential hypotensive toxicity with standard protocol',
      confidence: 92,
    }),
    endocrinologist: getAgentData('endocrinologist', {
      ...AGENT_CONFIG.endocrinologist,
      status: result ? 'consensus' : 'ready',
      dataAnalyzed: [
        `Glucose level: ${glucoseLevel} mg/dL`,
        'HbA1c trend analysis',
        'Metabolic cascade risk',
        'Cardiovascular risk factors',
      ],
      rationale: `Current glucose (${glucoseLevel} mg/dL) indicates ${glucoseLevel > 140 ? 'suboptimal glycemic control' : 'adequate control'}. ${glucoseLevel > 140 ? 'Aggressive alternative treatments could trigger metabolic instability. Prefer conservative pathway with close monitoring.' : 'Continue current management with periodic reassessment.'}`,
      recommendation: glucoseLevel > 140 ? 'Intensify glycemic therapy conservatively' : 'Maintain current glycemic management',
      risk: 'Metabolic instability with aggressive intervention',
      confidence: 88,
    }),
    hera: getAgentData('hera', {
      ...AGENT_CONFIG.hera,
      status: result ? (result.recommendation?.hasVeto ? 'blocked' : 'consensus') : 'monitoring',
      dataAnalyzed: [
        `Budget constraint: $${monthlyBudget}/month`,
        `Insurance tier: ${insurance}`,
        'Transportation access assessment',
        'Socioeconomic risk factors',
      ],
      rationale: `Enforcing strict budget compliance at $${monthlyBudget}/mo. ${monthlyBudget < 200 ? 'Several proposed therapies exceed budget limit. Advanced biologics (~$800/mo) are not viable. ' : ''}HERA mandates generic-only formulary to prevent financial toxicity and ensure medication adherence.`,
      recommendation: monthlyBudget < 200 ? 'VETO: Mandate Generic Protocol Only' : 'Approved within budget constraints',
      risk: 'Medication non-adherence due to cost is #1 cause of treatment failure',
      confidence: 100,
      isVeto: monthlyBudget < 200,
    }),
  };
};

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

const Dashboard = ({ role = 'doctor', providedId, providedSection }) => {
  const id = providedId;
  const section = providedSection;
  const router = useRouter();
  // Monotonic counter for message IDs — avoids duplicate keys when messages
  // are created in the same millisecond via Date.now()
  const msgCounter = useRef(0);
  const nextId = () => `msg-${++msgCounter.current}`;

  const activeSection = section || 'overview';
  const canSimulate = role === 'doctor' || role === 'admin';
  const canExport = role === 'doctor' || role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);
  const [vetoOverridden, setVetoOverridden] = useState(false);
  const [selectedAgentKey, setSelectedAgentKey] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Steering State
  const [steeringInput, setSteeringInput] = useState('');
  const [isSteeringActive, setIsSteeringActive] = useState(false);
  const [negotiationSessionId, setNegotiationSessionId] = useState(null);

  const [error, setError] = useState('');
  const [realAgentAnalyses, setRealAgentAnalyses] = useState(null);

  const [patient, setPatient] = useState(null);
  const [, setPrediction] = useState(null);
  const [, setExplainability] = useState(null);
  const [, setCohortData] = useState(null);
  const [drugIntel, setDrugIntel] = useState(null);
  const [result, setResult] = useState(null);

  const [treatmentPlan] = useState({ type: 'Standard', dosage: 'Medium', duration: 30 });

  // Consensus simulation state
  const [consensusStatus, setConsensusStatus] = useState('idle'); // idle, running, consensus
  const [deliberationMessages, setDeliberationMessages] = useState([]);
  const [consensusResult, setConsensusResult] = useState(null);
  const feedRef = useRef(null);
  const wsRef = useRef(null);
  
  // Generate agent insights based on patient data
  const agentInsights = useMemo(() => {
    return generateAgentInsights(patient, drugIntel, result, realAgentAnalyses);
  }, [patient, drugIntel, result, realAgentAnalyses]);

  // Load dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        if (!id) return;
        
        const [patientRes, predictionRes, explainRes] = await Promise.allSettled([
          apiClient.get(`/patient/${id}`),
          apiClient.get(`/predict/${id}`),
          apiClient.post('/explain/insights', { patientId: id }),
        ]);

        if (patientRes.status !== 'fulfilled') throw patientRes.reason;

        const patientData = patientRes.value.data;
        setPatient(patientData);
        if (predictionRes.status === 'fulfilled') setPrediction(predictionRes.value.data);
        if (explainRes.status === 'fulfilled') setExplainability(explainRes.value.data);

        const [cohortRes, drugRes] = await Promise.allSettled([
          apiClient.post('/explain/cohort-match', { patientId: id, treatmentPlan }),
          apiClient.post('/explain/drug-intelligence', { patientId: id }),
        ]);

        if (cohortRes.status === 'fulfilled') setCohortData(cohortRes.value.data);
        if (drugRes.status === 'fulfilled') setDrugIntel(drugRes.value.data);
      } catch (loadError) {
        console.error(loadError);
        setError('Unable to load the digital twin dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [id, treatmentPlan]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // HITL Steering state - moved here for useEffect access
  const [excludedMedications, setExcludedMedications] = useState([]);
  const consensusResultRef = useRef(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    consensusResultRef.current = consensusResult;
  }, [consensusResult]);

  // CRITICAL: useEffect to update consensusResult when medications are excluded via steering
  // Runs when EITHER excludedMedications OR consensusResult changes to handle timing issues
  useEffect(() => {
    if (excludedMedications.length === 0) return;
    if (!consensusResult) {
      console.log('[Steering Effect] No consensus result yet');
      return;
    }
    
    // Check if any excluded medication is STILL in the current result
    const currentMeds = consensusResult.medications || [];
    const medsStillPresent = currentMeds.filter(med => 
      excludedMedications.some(excluded => 
        med.name.toLowerCase().includes(excluded.toLowerCase())
      )
    );
    
    // Only update if there are medications that should be removed but aren't yet
    if (medsStillPresent.length > 0) {
      console.log('[Steering Effect] Found excluded medications still in result:', medsStillPresent.map(m => m.name));
      console.log('[Steering Effect] Excluded list:', excludedMedications);
      
      const updatedMedications = currentMeds.filter(med => 
        !excludedMedications.some(excluded => 
          med.name.toLowerCase().includes(excluded.toLowerCase())
        )
      );
      
      console.log('[Steering Effect] Updated medications list:', updatedMedications.map(m => m.name));
      
      // Create the updated result
      const excludedNames = medsStillPresent.map(m => m.name).join(', ');
      const updatedResult = {
        ...consensusResult,
        medications: updatedMedications,
        hasVeto: true,
        reasoning: consensusResult.reasoning + (consensusResult.reasoning.includes('NOTE:') ? '' : ` NOTE: ${excludedNames} withdrawn per clinician steering.`)
      };
      
      setConsensusResult(updatedResult);
    }
  }, [excludedMedications, consensusResult]);

  // Demo agent deliberation responses
  const DEMO_RESPONSES = useMemo(() => {
    return [
      { 
        agent: 'system', 
        type: 'system',
        message: 'Initializing multi-agent consensus protocol...' 
      },
      {
        agent: 'nephrologist',
        type: 'tool_use',
        tool: 'GenoMap',
        action: `Querying genetic markers for Oncology profile...`
      },
      { 
        agent: 'nephrologist', 
        type: 'proposal',
        message: `Analyzing patient profile. Patient is HER2 negative. Trastuzumab is inappropriate.` 
      },
      {
        agent: 'cardiologist',
        type: 'tool_use',
        tool: 'DrugBank',
        action: `Cross-referencing cardiovascular implications of alternative oncology drugs...`
      },
      { 
        agent: 'cardiologist', 
        type: 'proposal',
        message: `Cardiovascular risk from aggressive alternatives is extremely high. Recommend focusing on symptom management and palliative care to ensure quality of life.`
      },
      { 
        agent: 'endocrinologist', 
        type: 'insight',
        message: `Current metabolic markers support a palliative approach. Aggressive interventions may trigger severe metabolic instability.` 
      },
      { 
        agent: 'coordinator', 
        type: 'system',
        message: 'Reviewing proposals against patient constraints...' 
      },
      {
        agent: 'hera',
        type: 'tool_use',
        tool: 'CostAnalysis',
        action: `Evaluating financial feasibility of proposed treatments...`
      },
      { 
        agent: 'hera', 
        type: 'veto',
        message: `VETO: The cost of the proposed treatment exceeds the patient's budget.` 
      },
      { 
        agent: 'hera', 
        type: 'insight',
        message: `Feasibility analysis complete. Score: 10%` 
      },
      {
        agent: 'coordinator',
        type: 'consensus',
        message: 'CONSENSUS REACHED. Consensus protocol: Palliative Care and Symptom Management for Oncology Patient'
      },
      {
        agent: 'coordinator',
        type: 'consensus',
        message: 'CONSENSUS ACHIEVED'
      }
    ];
  }, [patient]);

  const DEMO_CONSENSUS_RESULT = useMemo(() => ({
    protocol: 'Palliative Care and Symptom Management for Oncology Patient',
    reasoning: `Given the patient's financial constraints and the inappropriateness of Trastuzumab due to HER2 negativity, the focus will shift to palliative care and symptom management. This includes lifestyle modifications and supportive care to address fatigue, pain, and nausea while ensuring renal and cardiovascular health.`,
    confidence: 85,
    rounds: 1,
    hasVeto: true,
    medications: [
      { name: 'Ondansetron', dose: '8 mg', frequency: 'Every 8 hours as needed for nausea' },
      { name: 'Acetaminophen', dose: '500 mg', frequency: 'Every 6 hours as needed for pain' }
    ],
    agentAgreement: {
      nephrologist: 'agreed',
      cardiologist: 'agreed',
      endocrinologist: 'agreed',
      hera: 'adjusted'
    }
  }), [patient]);

  // Helper function to format timestamp - wrapped in useCallback to prevent dependency issues
  const formatTimestamp = useCallback(() => {
    return new Date().toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' });
  }, []);

  // Run the consensus deliberation using REAL backend AI agents
  const runConsensusDeliberation = useCallback(async () => {
    setConsensusStatus('running');
    setDeliberationMessages(prev => prev.filter(msg => msg.agent === 'clinician' || msg.type === 'steering_acknowledgment'));
    setConsensusResult(null);
    setVetoOverridden(false);
    
    // Add initial system message
    setDeliberationMessages(prev => [...prev, {
      id: nextId(),
      agent: 'system',
      type: 'system',
      message: 'Initializing multi-agent consensus protocol...',
      timestamp: formatTimestamp()
    }]);
    
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = getTelemetryWebSocketUrl() + '/ws/telemetry';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        const response = await startNegotiation(id);
        if (response.sessionId) {
          setNegotiationSessionId(response.sessionId);
          ws.send(JSON.stringify({ type: 'subscribe', sessionId: response.sessionId }));
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected' || data.type === 'subscribed' || data.type === 'intervention_received' || data.type === 'pong') return;
          
          const baseTimestamp = data.timestamp 
            ? new Date(data.timestamp).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' })
            : formatTimestamp();

          if (data.type === 'consensus_reached' || data.type === 'consensus_generated' || (data.session && data.session.state === 'consensus_reached') || data.consensusReached) {
            ws.close();
            setConsensusStatus('completed');
            
            setDeliberationMessages(prev => [...prev, {
              id: nextId(),
              agent: 'coordinator',
              type: 'consensus',
              message: data.message || 'Consensus reached. Finalizing protocol.',
              timestamp: baseTimestamp
            }]);

            const state = await getNegotiationState(data.sessionId);
            const session = state?.state || state;
            let consensus = data.consensus || data.data || session?.finalPlan || state?.result?.finalPlan || state?.result?.consensus;
            
            if (consensus) {
              const agentAnalyses = session.agentAnalyses || {};
              const consensusData = {
                protocol: consensus.recommendedProtocol || 'AI-Optimized Treatment Protocol',
                reasoning: consensus.protocolDetails || consensus.rationale || 'Multi-agent consensus achieved based on patient-specific analysis.',
                confidence: Math.round((consensus.confidence || 0.85) * 100),
                rounds: session.currentRound || session.rounds || 1,
                hasVeto: session.vetoes?.length > 0,
                agentAgreement: consensus.agentAgreement || {
                  nephrologist: agentAnalyses.nephrologist ? 'agreed' : 'pending',
                  cardiologist: agentAnalyses.cardiologist ? 'agreed' : 'pending',
                  endocrinologist: agentAnalyses.endocrinologist ? 'agreed' : 'pending',
                  hera: session.vetoes?.length > 0 ? 'adjusted' : 'validated'
                },
                medications: consensus.medications,
                monitoring: consensus.monitoring,
                precautions: consensus.precautions
              };
              
              setConsensusResult(consensusData);
              setRealAgentAnalyses(agentAnalyses);
              setConsensusStatus('consensus');
              setResult({ 
                recommendation: { 
                  best: { 
                    name: consensusData.protocol, 
                    reason: consensusData.reasoning 
                  } 
                } 
              });
            } else {
              setConsensusStatus('failed');
              setResult({
                recommendation: {
                  best: {
                    name: 'Negotiation Failed',
                    reason: 'Failed to reach consensus due to system errors or API failure.'
                  }
                }
              });
            }
            setSimulating(false);
            return;
          }

          const agentId = data.agent || 'system';
          let msgObj = null;

          if (data.type === 'tool_use' || data.type === 'api_query' || data.type === 'database_query') {
            msgObj = {
              id: nextId(), agent: agentId, type: 'tool_use',
              tool: data.tool || data.database || 'External API',
              action: data.action || data.query || data.message, timestamp: baseTimestamp
            };
          } else if (data.type === 'sub_agent_spawn' || data.type === 'specialist_summon') {
            msgObj = {
              id: nextId(), agent: agentId, type: 'sub_agent',
              subAgentName: data.subAgentName || data.specialistName || 'Specialist',
              subAgentEmoji: data.emoji || '🔬',
              message: data.message || `Summoning specialist`, timestamp: baseTimestamp
            };
          } else if (data.type === 'sub_agent_response' || data.type === 'specialist_response') {
            msgObj = {
              id: nextId(), agent: agentId, type: 'sub_agent_response',
              agentName: data.agentName || data.subAgentName || 'Specialist',
              message: data.message, recommendations: data.recommendations || [],
              color: data.color, timestamp: baseTimestamp
            };
          } else if (data.type === 'reflection' || data.type === 'memory_recall' || data.type === 'past_case') {
            msgObj = {
              id: nextId(), agent: agentId, type: 'reflection',
              message: data.message || data.memory || 'Recalling past case...',
              caseId: data.caseId, timestamp: baseTimestamp
            };
          } else if (data.type === 'steering_acknowledgment' || data.type === 'constraint_acknowledged') {
            msgObj = {
              id: nextId(), agent: agentId, type: 'steering_acknowledgment',
              message: data.message, isFlashing: true, timestamp: baseTimestamp
            };
          } else if (data.type === 'renegotiation_triggered' || data.type === 'renegotiation') {
            msgObj = {
              id: nextId(), agent: 'system', type: 'renegotiation_triggered',
              message: data.message || 'Re-negotiation triggered...', timestamp: baseTimestamp
            };
          } else if (data.type === 'agent_start' || data.type === 'agent_reasoning' || data.type === 'agent_insight' || data.type === 'agent_alert' || data.type === 'agent_proposal' || data.type === 'agent_complete' || data.type === 'agent_veto' || data.type === 'agent_approval') {
            let messageType = 'proposal';
            if (data.type === 'agent_veto') messageType = 'veto';
            else if (data.type === 'agent_alert' && data.severity === 'critical') messageType = 'alert';
            else if (data.type === 'agent_approval') messageType = 'approval';
            msgObj = {
              id: nextId(), agent: agentId, type: messageType,
              message: data.message, timestamp: baseTimestamp, color: data.color
            };
          } else if (data.message) {
            msgObj = {
              id: nextId(), agent: agentId, type: 'system',
              message: data.message, timestamp: baseTimestamp
            };
          }

          if (msgObj) {
            setDeliberationMessages(prev => [...prev, msgObj]);
            if (feedRef.current) {
              setTimeout(() => {
                feedRef.current.scrollTop = feedRef.current.scrollHeight;
              }, 10);
            }
          }
        } catch (e) { console.error("WS parse error", e); }
      };

      ws.onerror = (e) => {
        console.error("WebSocket Error:", e);
      };
      
    } catch (error) {
      console.error(error);
      setSimulating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, formatTimestamp]);
  
  // Fallback demo deliberation (when backend unavailable)
  const runDemoDeliberation = useCallback(() => {
    DEMO_RESPONSES.forEach((resp, i) => {
      setTimeout(() => {
        const newMessage = {
          ...resp,
          id: nextId(),
          timestamp: formatTimestamp()
        };
        setDeliberationMessages(prev => [...prev, newMessage]);
        
        if (feedRef.current) {
          setTimeout(() => {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
          }, 50);
        }
      }, (i + 1) * 2000);
    });
    
    setTimeout(() => {
      setConsensusResult(DEMO_CONSENSUS_RESULT);
      setConsensusStatus('consensus');
      setResult({ recommendation: { best: { name: DEMO_CONSENSUS_RESULT.protocol, reason: DEMO_CONSENSUS_RESULT.reasoning } } });
    }, (DEMO_RESPONSES.length + 1) * 2000);
  }, [DEMO_RESPONSES, DEMO_CONSENSUS_RESULT, formatTimestamp]);

  // Reset consensus state
  const resetConsensus = useCallback(() => {
    setConsensusStatus('idle');
    setDeliberationMessages(prev => prev.filter(msg => msg.agent === 'clinician' || msg.type === 'steering_acknowledgment'));
    setConsensusResult(null);
  }, []);

  // New sidebar sections
  const sections = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'workspace' },
    { key: 'divider1', divider: true, label: 'Case Context' },
    { key: 'profile', label: 'Patient Profile', icon: User, group: 'context' },
    { key: 'divider2', divider: true, label: 'Agent Perspectives' },
    { key: 'geneticist', label: 'Geneticist', icon: Dna, group: 'agents', color: '#a855f7' },
    { key: 'pharmacologist', label: 'Pharmacologist', icon: Pill, group: 'agents', color: '#22c55e' },
    { key: 'endocrinologist', label: 'Endocrinologist', icon: Zap, group: 'agents', color: '#f59e0b' },
    { key: 'hera', label: 'HERA Guardian', icon: Shield, group: 'agents', color: '#06b6d4' },
    { key: 'divider3', divider: true, label: 'Outcome' },
    { key: 'trajectory', label: 'Trajectory', icon: TrendingUp, group: 'outcome' },
    { key: 'recommendation', label: 'Recommendation', icon: FileCheck, group: 'outcome' },
  ];

  const currentTheme = sectionThemes[activeSection] || sectionThemes.overview;

  const openSection = (key) => {
    if (key.startsWith('divider')) return;
    router.push(`/dashboard/${id}/${key}`);
  };



  // Reserved for manual simulation trigger (currently uses consensus deliberation instead)
  const _runSimulation = async () => {
    setSimulating(true);
    setConsensusStatus('running');
    setDeliberationMessages([]);
    setConsensusResult(null);
    setVetoOverridden(false);
    
    try {
      const response = await startNegotiationSync(id || patient.patientId);
      
      if (!response.success && response.error === 'AI_NOT_CONFIGURED') {
        setSimulating(false);
        setConsensusStatus('failed');
        setDeliberationMessages([{
          id: nextId(),
          type: 'error',
          agent: 'system',
          message: 'AI System Disabled: Missing AI API Key.',
          timestamp: formatTimestamp()
        }]);
        return;
      }
      
      // Animate the telemetry array returned by the sync API
      const telemetry = response.telemetry || [];
      telemetry.forEach((event, i) => {
        setTimeout(() => {
          const newMessage = {
            id: nextId(),
            type: event.type,
            agent: event.agent || 'system',
            message: event.message,
            severity: event.severity,
            timestamp: formatTimestamp()
          };
          setDeliberationMessages(prev => [...prev, newMessage]);
          
          if (feedRef.current) {
            setTimeout(() => {
              feedRef.current.scrollTop = feedRef.current.scrollHeight;
            }, 10);
          }
        }, (i + 1) * 300);
      });
      
      const totalAnimationTime = (telemetry.length + 1) * 300;
      
      setTimeout(() => {
        if (response.consensusReached) {
          setConsensusResult(response.consensus);
          setConsensusStatus('consensus');
          setResult({
            recommendation: {
              best: {
                name: response.consensus.recommendedProtocol || 'Generated Protocol',
                reason: response.consensus.rationale || 'Protocol dynamically generated.'
              },
              confidence: 85
            }
          });
        } else {
          setConsensusStatus('failed');
        }
        setSimulating(false);
      }, totalAnimationTime);
      
    } catch (e) {
      console.error('Failed to run negotiation:', e);
      setDeliberationMessages(prev => [...prev, {
        id: nextId(),
        type: 'error',
        agent: 'system',
        message: `Connection Error: ${e.message}`,
        timestamp: formatTimestamp()
      }]);
      setSimulating(false);
      setConsensusStatus('failed');
    }
  };



  // Generate trajectory data
  const generateConsensusTrajectory = () => {
    if (!result?.trajectory) return null;
    return result.trajectory.map(point => ({
      day: point.day,
      'Baseline (Pre-Consensus)': point['Without Treatment'] || point.baseline || 50,
      'Multi-Agent Consensus Protocol': point['Optimized Treatment'] || point.optimized || 70,
    }));
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  // Agent avatar configurations for the feed
  const AGENT_CONFIG_FEED = {
    nephrologist: { name: 'Nephrologist', emoji: '🫘', bgColor: '#f3e8ff', borderColor: '#a855f7', color: '#a855f7' },
    cardiologist: { name: 'Cardiologist', emoji: '❤️', bgColor: '#dcfce7', borderColor: '#22c55e', color: '#22c55e' },
    endocrinologist: { name: 'Endocrinologist', emoji: '⚡', bgColor: '#fef3c7', borderColor: '#f59e0b', color: '#f59e0b' },
    hera: { name: 'HERA Guardian', emoji: '🛡️', bgColor: '#cffafe', borderColor: '#06b6d4', color: '#06b6d4' },
    coordinator: { name: 'Coordinator', emoji: '🎯', bgColor: '#f5f3ff', borderColor: '#8b5cf6', color: '#8b5cf6' },
    system: { name: 'System', emoji: '⚙️', bgColor: '#f1f5f9', borderColor: '#64748b', color: '#64748b' },
    clinician: { name: 'You (Clinician)', emoji: '👨‍⚕️', bgColor: '#fef9c3', borderColor: '#eab308', color: '#eab308' },
  };

  const getAgentConfig = (agentKey) => {
    const key = agentKey?.toLowerCase().replace(/[^a-z_]/g, '') || 'system';
    return AGENT_CONFIG_FEED[key] || AGENT_CONFIG_FEED.system;
  };

  // Render a single message in the feed - ENHANCED with all 5 features
  // Compact Timeline Message Render
  function renderMessage(msg, index) {
    const agent = getAgentConfig(msg.agent);
    const isSteering = msg.type === 'steering_intervention';
    const isSteeringAck = msg.type === 'steering_acknowledgment';

    if (isSteering) {
      return (
        <div key={msg.id || index} className="mb-3 relative group ml-1 mr-1">
          <div className="bg-amber-50/80 rounded-xl shadow-sm border border-amber-200 overflow-hidden flex flex-col">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-amber-500 rounded-l-xl"></div>
            <div className="p-3 pl-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <span className="text-[13px] font-bold tracking-tight text-amber-800">CLINICIAN STEERING</span>
                <span className="text-[10px] text-amber-600 ml-auto font-medium">{msg.timestamp}</span>
              </div>
              <p className="text-[12px] text-amber-900 font-medium italic">"{msg.constraint || msg.message}"</p>
            </div>
          </div>
        </div>
      );
    }

    if (isSteeringAck) {
      return (
        <div key={msg.id || index} className="mb-3 relative group ml-1 mr-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-amber-400 rounded-l-xl"></div>
            <div className="p-3 pl-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-bold tracking-tight text-slate-700">{agent.name}</span>
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm font-bold ml-1">ACKNOWLEDGED</span>
                <span className="text-[10px] text-slate-400 ml-auto font-medium">{msg.timestamp}</span>
              </div>
              <p className="text-[12px] text-slate-700 font-medium">{msg.message}</p>
            </div>
          </div>
        </div>
      );
    }

    // Default box-style node (matching Pic 3)
    const messagesArray = msg.messages || [msg];
    const isVetoMsg = messagesArray.some(m => m.message && m.message.toUpperCase().includes('VETO'));
    const borderColor = isVetoMsg ? '#ef4444' : agent.color; // Red for veto
    
    return (
      <div key={msg.id || index} className="mb-3 relative group ml-1 mr-1">
        <div className={`bg-white rounded-xl shadow-sm border ${isVetoMsg ? 'border-red-200 bg-red-50/30' : 'border-slate-200'} overflow-hidden flex flex-col`}>
          <div className="w-1 absolute left-0 top-0 bottom-0 rounded-l-xl" style={{ backgroundColor: borderColor }}></div>
          <div className="p-3 pl-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] bg-slate-50 border border-slate-100">
                {agent.emoji}
              </div>
              <span className="text-[13px] font-bold tracking-tight text-slate-700">{agent.name}</span>
              <span className="text-[10px] text-slate-400 ml-auto font-medium">{msg.timestamp}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {messagesArray.map((m, i) => (
                <p key={m.id || i} className={`text-[12px] font-medium leading-relaxed ${m.message && m.message.toUpperCase().includes('VETO') ? 'text-red-700' : 'text-slate-700'}`}>
                  {m.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER SECTIONS
  // =============================================================================


  // Handle steering submission
  const handleSteeringSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!steeringInput.trim()) return;
    
    const constraint = steeringInput.trim();
    setSteeringInput('');
    setIsSteeringActive(false);
    
    // Add steering message to feed
    const steeringMsg = {
      id: Date.now(),
      agent: 'clinician',
      type: 'steering_intervention',
      constraint: constraint,
      message: constraint,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    setDeliberationMessages(prev => [...prev, steeringMsg]);
    
    // Simple steering effect logic for the redesign
    setTimeout(() => {
      setDeliberationMessages(prev => [...prev, {
        id: Date.now() + 1,
        agent: 'coordinator',
        type: 'steering_acknowledgment',
        isFlashing: true,
        message: `Acknowledged clinical constraint: "${constraint}". Agents are evaluating the impact on the current protocol.`,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    }, 1000);
    
    // Trigger a renegotiation update in the simulation
    setTimeout(() => {
      setDeliberationMessages(prev => [...prev, {
        id: Date.now() + 2,
        agent: 'system',
        type: 'renegotiation_triggered',
        message: '🔄 Protocol updated based on clinician steering...',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
      
      // We will trigger a refetch of the simulation with the new constraint
      // by updating the excludedMedications or similar state.
      setExcludedMedications(prev => {
         const newExclusions = [...prev];
         if (constraint.toLowerCase().includes('metformin')) newExclusions.push('Metformin');
         if (constraint.toLowerCase().includes('gabapentin')) newExclusions.push('Gabapentin');
         if (constraint.toLowerCase().includes('tiotropium')) newExclusions.push('Tiotropium');
         return newExclusions.length > prev.length ? newExclusions : prev;
      });
    }, 2500);

  }, [steeringInput, setDeliberationMessages, setIsSteeringActive, setSteeringInput, setExcludedMedications]);

  // OVERVIEW: Horizontal Command Center View
  const renderOverview = () => {
    return (
      <div className="flex flex-col h-full bg-transparent">
        {/* COMPACT PATIENT STRIP (~70px) */}
      <div className="h-[70px] border-b border-slate-200/60 bg-transparent flex items-center px-6 shrink-0 justify-between">
          
          <div className="flex items-center gap-4 w-[35%]">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {patient?.personalInfo?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-slate-800 leading-none">{patient?.personalInfo?.name || 'Dorothy Baker'}</h2>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                  {patient?.personalInfo?.age || 52}{patient?.personalInfo?.gender?.charAt(0) || 'F'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {(patient?.clinicalProfile?.conditions || ['Heart Failure', 'Hypertension']).map((c, i) => (
                  <span key={i} className="text-[11px] font-medium text-slate-500">{c}{i === 0 ? ' · ' : ''}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-8 flex-1">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">BP</span>
              <span className="text-[14px] font-bold text-slate-700">{patient?.vitals?.bloodPressure || '148/92'}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">EF</span>
              <span className="text-[14px] font-bold text-slate-700">{patient?.vitals?.ejectionFraction || '38'}%</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">eGFR</span>
              <span className="text-[14px] font-bold text-slate-700">{patient?.vitals?.egfr || '42'}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Meds</span>
              <span className="text-[14px] font-bold text-slate-700">{patient?.medications?.length || 7}</span>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-md border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold tracking-widest uppercase">High Risk</span>
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE: 2 Horizontal Columns + Top Recommendation */}
        <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar">
                    {/* FINAL RECOMMENDATION FULL WIDTH */}
          {result && (
            <div className="shrink-0 bg-emerald-50/40 border-b border-slate-200/60 p-6 flex flex-col relative animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm z-10 w-full">
              
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-500 flex items-center justify-center text-white mt-1">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-600 tracking-widest uppercase block leading-tight mb-1 mt-1">ADJUSTED RECOMMENDATION</span>
                  <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase block leading-tight mb-2">RECOMMENDED PROTOCOL</span>
                  <h3 className="text-[20px] font-bold text-slate-900 leading-snug">
                    {result.recommendation?.best?.name || `Dataset-Driven Consensus GDMT Protocol`}
                  </h3>
                </div>
              </div>
              
              <div className="pl-[52px]">
                <p className="text-[13px] text-slate-700 font-medium leading-relaxed mb-6">
                  {result.recommendation?.best?.reason || `This consensus was synthesized from the large clinical dataset. The patient requires careful diuresis balanced with renal protection and strict adherence to budget constraints.`}
                </p>
                
                <div className="bg-white border border-emerald-200 rounded-xl p-4 mb-4 shadow-sm">
                   <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase block mb-3">MEDICATION PROTOCOL</span>
                   {consensusResult?.medications?.length > 0 ? (
                     consensusResult.medications.map((med, idx) => (
                       <div key={idx} className="flex items-center justify-between py-2 border-b border-emerald-100/60 last:border-0">
                         <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                           <span className="text-[12px] font-bold text-slate-700">{med.name}</span>
                         </div>
                         <span className="text-[11px] text-slate-500 font-medium">{med.dose} {med.frequency}</span>
                       </div>
                     ))
                   ) : (
                     <>
                       <div className="flex items-center justify-between py-2 border-b border-emerald-100/60 last:border-0">
                         <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                           <span className="text-[12px] font-bold text-slate-700">Primary Therapy</span>
                         </div>
                         <span className="text-[11px] text-slate-500 font-medium">As per updated constraints</span>
                       </div>
                       <div className="flex items-center justify-between py-2 border-b border-emerald-100/60 last:border-0">
                         <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                           <span className="text-[12px] font-bold text-slate-700">Supportive Care</span>
                         </div>
                         <span className="text-[11px] text-slate-500 font-medium">Monitor vitals continuously</span>
                       </div>
                     </>
                   )}
                </div>
                
                {(isSteeringActive || deliberationMessages.some(m => m.type === 'steering_intervention') || agentInsights.hera?.isVeto) && (
                  <div className="bg-amber-100/80 text-amber-800 text-[12px] font-medium p-3 rounded-xl mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Protocol adjusted due to safety, budget, or clinician constraints.
                  </div>
                )}
                
                <div className="flex items-center justify-between border-t border-emerald-200/60 pt-5 mt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-slate-600 font-medium">Confidence: <strong className="text-emerald-500">{result.recommendation?.confidence || 85}%</strong></span>
                    <span className="text-[12px] text-slate-600 font-medium">Rounds: <strong className="text-slate-700">1</strong></span>
                  </div>
                  <button className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-[12px] font-bold tracking-wide hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-md shadow-slate-900/20 active:scale-95">
                    Apply to Treatment Plan <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 flex-1 min-h-[600px]">
            
            {/* LEFT: SPECIALISTS */}
          <div className="border-r border-slate-200/60 bg-white/30 flex flex-col h-full overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 shrink-0">
                <h3 className="text-[12px] font-bold text-slate-800 tracking-wider">SPECIALIST PANEL</h3>
                <p className="text-[11px] text-slate-500 font-medium">4 agents · 3 aligned · 1 caution</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 custom-scrollbar content-start">
                {!result && !simulating ? (
                  <div className="text-center py-8">
                     <p className="text-[12px] text-slate-400 font-medium">Agents standing by.</p>
                  </div>
                ) : (
                  Object.entries(agentInsights).map(([key, agent]) => {
                    const isVeto = agent.isVeto;
                    const isCaution = agent.risk && agent.risk.toLowerCase().includes('risk');
                    let statusLabel = simulating ? 'ANALYZING' : (isVeto ? 'VETO ISSUED' : (isCaution ? 'CAUTION' : 'ALIGNED'));
                    let statusColor = simulating ? 'text-indigo-500' : (isVeto ? 'text-red-600' : (isCaution ? 'text-amber-600' : 'text-emerald-600'));
                    let dotColor = simulating ? 'bg-indigo-500' : (isVeto ? 'bg-red-500' : (isCaution ? 'bg-amber-500' : 'bg-emerald-500'));
                    
                    const agentThemeMap = {
                      nephrologist: { border: 'border-purple-300', bg: 'bg-purple-100 text-purple-600', bar: 'bg-purple-500', iconBg: 'bg-purple-100' },
                      cardiologist: { border: 'border-emerald-300', bg: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-500', iconBg: 'bg-emerald-100' },
                      endocrinologist: { border: 'border-amber-300', bg: 'bg-amber-100 text-amber-600', bar: 'bg-amber-500', iconBg: 'bg-amber-100' },
                      hera: { border: 'border-cyan-300', bg: 'bg-cyan-100 text-cyan-600', bar: 'bg-cyan-500', iconBg: 'bg-cyan-100' }
                    };
                    const theme = agentThemeMap[key] || { border: 'border-slate-200', bg: 'bg-slate-100 text-slate-600', bar: 'bg-slate-500', iconBg: 'bg-slate-100' };
                    
                    const pillClass = simulating ? 'bg-indigo-100 text-indigo-700' : (isVeto ? 'bg-red-100 text-red-600' : theme.bg);
                    const pillText = simulating ? 'ANALYZING' : (isVeto ? 'VETO' : 'Ready');
                    const barColor = simulating ? 'bg-indigo-400' : (isVeto ? 'bg-red-500' : theme.bar);
                    const confidenceVal = agent.confidence || 0;
                    
                    return (
                      <div 
                        key={key} 
                        className={`bg-white rounded-[20px] border-2 ${selectedAgentKey === key ? 'ring-2 ring-slate-400 shadow-md' : 'shadow-sm hover:shadow-md'} ${theme.border} transition-all cursor-pointer group p-5`}
                        onClick={() => {
                          setSelectedAgentKey(key);
                          setIsDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[20px] ${theme.iconBg}`}>
                              {agent.emoji}
                            </div>
                            <div>
                              <h4 className="font-bold text-[15px] text-slate-900">{agent.name}</h4>
                              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{agent.name.substring(0,2)}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${pillClass}`}>
                            {pillText}
                          </div>
                        </div>
                        
                        <p className="text-[13px] text-slate-600 font-medium line-clamp-2 h-10 mb-2">
                          {simulating ? 'Reviewing clinical constraints...' : (agent.recommendation || 'Analyzing data')}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4 flex items-center gap-3">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full`} style={{ width: `${confidenceVal}%` }}></div>
                            </div>
                            <span className={`text-[12px] font-bold ${simulating ? 'text-indigo-600' : (isVeto ? 'text-red-600' : theme.bg.split(' ')[1])}`}>
                              {confidenceVal}%
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: LIVE DELIBERATION */}
          <div className="bg-white/60 flex flex-col h-full overflow-hidden relative">
              <div className="px-6 py-5 border-b border-slate-200 shrink-0 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">Live Agent Deliberation</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Watch AI specialists collaborate in real-time</p>
                </div>
                {result && (
                  <button 
                    onClick={_runSimulation}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition-colors border border-slate-200"
                  >
                    <RefreshCw className="w-3 h-3" /> Run Again
                  </button>
                )}
              </div>

              {!simulating && !result ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <button
                     onClick={_runSimulation}
                     className="w-full rounded-md bg-slate-900 px-6 py-3 text-[13px] font-bold text-white hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-2"
                   >
                     <BrainCircuit className="w-4 h-4" />
                     Initiate Consult
                   </button>
                   <p className="text-[11px] text-slate-400 mt-4 font-medium">Awaiting MDT initialization</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar" ref={feedRef}>
                    {(() => {
                      const grouped = [];
                      deliberationMessages.forEach(msg => {
                        const prev = grouped[grouped.length - 1];
                        const isSpecial = msg.type === 'steering_intervention' || msg.type === 'steering_acknowledgment' || msg.type === 'renegotiation_triggered';
                        if (!isSpecial && prev && prev.agent === msg.agent) {
                          prev.messages.push(msg);
                        } else {
                          grouped.push({ ...msg, messages: [msg] });
                        }
                      });
                      return grouped.map((group, index) => renderMessage(group, index));
                    })()}
                    {simulating && (
                      <div className="pl-6 border-l border-slate-200 ml-3 pb-4 relative">
                        <div className="absolute w-2 h-2 rounded-full bg-slate-300 -left-[5px] top-1.5 animate-pulse"></div>
                        <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase animate-pulse">Agents negotiating...</span>
                      </div>
                    )}
                    {result && (
                      <div className="mt-4 mb-2 p-3 bg-emerald-50 rounded-md border border-emerald-100 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">Consensus Reached</span>
                      </div>
                    )}
                  </div>

                  {/* Steering Input Area */}
                  <div className="shrink-0 pt-3 pb-4 px-6 bg-white border-t border-slate-200/60">
                    <form onSubmit={handleSteeringSubmit} className="flex items-center gap-2 mb-2">
                      <span className="text-amber-500 font-mono text-[14px] font-bold mt-0.5">&gt;</span>
                      <input
                        type="text"
                        value={steeringInput}
                        onChange={(e) => setSteeringInput(e.target.value)}
                        placeholder={simulating && deliberationMessages.length === 0 ? "Start consensus to enable steering..." : "Inject clinical constraint..."}
                        className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-slate-300 text-slate-700 disabled:opacity-50"
                        disabled={simulating && deliberationMessages.length === 0}
                      />
                      <button
                        type="submit"
                        disabled={!steeringInput.trim() || (simulating && deliberationMessages.length === 0)}
                        className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                          steeringInput.trim() 
                            ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-sm' 
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        Inject
                      </button>
                    </form>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-medium text-slate-400">{deliberationMessages.length} messages</span>
                      <span className={`text-[10px] font-bold ${result ? 'text-emerald-500' : (simulating ? 'text-indigo-400 animate-pulse' : 'text-slate-300')}`}>
                        {result ? 'Consensus achieved' : (simulating ? 'Deliberating...' : 'Awaiting input')}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

                      </div>
        </div>
      </div>
    );
  };
  // =============================================================================
  // LOADING & ERROR STATES
  // =============================================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#e8f5e9_0%,#c8e6c9_100%)] text-slate-900">
        <div className="space-y-4 text-center">
          <Activity className="mx-auto h-12 w-12 animate-pulse text-emerald-500" />
          <p className="text-lg font-semibold">Loading BioTwin AI...</p>
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#e8f5e9_0%,#c8e6c9_100%)] px-4 text-slate-900">
        <Panel className="max-w-lg text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-rose-500" />
          <p className="mb-4 text-lg font-semibold">{error}</p>
          <button onClick={() => router.push('/doctor')} className="rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">
            Back to Registry
          </button>
        </Panel>
      </div>
    );
  }

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="h-screen w-full bg-[linear-gradient(180deg,#e8f5e9_0%,#c8e6c9_100%)] p-3 md:p-5 flex flex-col font-sans overflow-hidden">
      
      {/* Top Navigation Bar (restored style) */}
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3 rounded-full bg-white/70 px-5 py-2.5 shadow-sm border border-white">
          <BrainCircuit className="h-5 w-5 text-emerald-700" />
          <div>
            <p className="font-bold text-slate-800 leading-tight text-sm">BioTwin AI</p>
            <p className="text-[9px] uppercase tracking-widest text-emerald-700 font-bold leading-tight">Clinical Copilot</p>
          </div>
        </div>
        
        <button
          onClick={() => router.push('/doctor')}
          className="flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-slate-700 hover:bg-white shadow-sm border border-white font-semibold text-xs transition-all"
        >
          <Home className="h-4 w-4" /> Exit to Registry
        </button>
      </div>

      {/* Curved Bento Box Main Container */}
      <div className="mx-auto flex-1 w-full max-w-[1500px] rounded-[38px] border border-white/60 bg-[#f5f5f0]/90 shadow-[0_24px_80px_rgba(80,110,88,0.12)] flex flex-col overflow-hidden relative">
        {error && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-red-50 text-red-600 text-xs font-bold px-4 py-2 text-center border-b border-red-200">
            {error}
          </div>
        )}
        
        {renderOverview()}

        {/* RIGHT DRAWER: SPECIALIST REASONING */}
        <div className={`absolute top-0 right-0 bottom-0 w-[400px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out z-50 ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedAgentKey && agentInsights[selectedAgentKey] && (
            <div className="h-full flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">SPECIALIST REASONING</span>
                <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-2xl">{agentInsights[selectedAgentKey].emoji}</div>
                  <div>
                    <h2 className="text-[18px] font-bold text-slate-800">{agentInsights[selectedAgentKey].name}</h2>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
                       {agentInsights[selectedAgentKey].isVeto ? 'VETO ISSUED' : 'ASSESSMENT COMPLETE'}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">CLINICAL RATIONALE</h3>
                    <p className="text-[13px] text-slate-700 font-medium leading-relaxed">
                      {agentInsights[selectedAgentKey].rationale}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">RECOMMENDATION</h3>
                    <p className="text-[13px] text-slate-800 font-bold leading-relaxed">
                      {agentInsights[selectedAgentKey].recommendation}
                    </p>
                  </div>

                  {agentInsights[selectedAgentKey].risk && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h3 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Risk Identified
                      </h3>
                      <p className="text-[12px] text-amber-900 font-medium leading-relaxed">
                        {agentInsights[selectedAgentKey].risk}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Drawer overlay */}
        {isDrawerOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/10 z-40 transition-opacity backdrop-blur-[1px]"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
        )}

      </div>
      
      {/* Global minimal styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
