/**
 * Multi-Round Agent Negotiation Protocol Service
 * 
 * AI-Powered Implementation using OpenAI GPT-4 / OpenRouter
 * 
 * Implements a cyclic negotiation loop (Actor Model pattern) where:
 * 1. Specialist Agents (Geneticist, Pharmacologist, Endocrinologist) analyze patient data
 * 2. HERA Guardian evaluates economic/access constraints and may VETO
 * 3. Consensus Engine synthesizes a final recommendation
 * 
 * Note: Features such as simulated memory, swarming, and fake tool usage 
 * have been removed to ensure the system only presents real, verified results.
 */

const EventEmitter = require('events');
const crypto = require('crypto');
const { getCachedConsensus, setCachedConsensus } = require('../utils/cache');
const heraGraph = require('./heraConstraint.service');
require('dotenv').config();

// Check for Gemini/OpenAI/OpenRouter integration
let openaiClient = null;
let AI_ENABLED = false;

try {
  if (process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
    openaiClient = require('./ai/openaiClient');
    AI_ENABLED = true;
    const provider = process.env.GEMINI_API_KEY ? 'Gemini' : (process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'OpenAI');
    console.log(`💡 AI integration enabled (${provider}) for AI-powered agents`);
  } else {
    console.log('⚠️ No AI API key set - Multi-Agent AI System is DISABLED.');
    console.log('   Set GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in .env to enable AI');
  }
} catch (error) {
  console.log('⚠️ AI client not available:', error.message);
}

// Global event bus for telemetry streaming
const negotiationEventBus = new EventEmitter();
negotiationEventBus.setMaxListeners(100);

// Agent role definitions with color coding for frontend
const AGENT_ROLES = {
  NEPHROLOGIST: {
    id: 'nephrologist',
    name: 'Dr. Nephro',
    specialty: 'Clinical Nephrologist',
    avatar: '🫘',
    color: '#a855f7',
    bias: 'renal_protection',
    priority: ['kidney_function', 'egfr_preservation', 'fluid_balance']
  },
  CARDIOLOGIST: {
    id: 'cardiologist',
    name: 'Dr. Cardio',
    specialty: 'Clinical Cardiologist',
    avatar: '❤️',
    color: '#22c55e',
    bias: 'cardiac_output',
    priority: ['heart_failure_management', 'blood_pressure', 'diuresis']
  },
  ENDOCRINOLOGIST: {
    id: 'endocrinologist',
    name: 'Dr. Endo',
    specialty: 'Endocrinologist',
    avatar: '⚗️',
    color: '#f59e0b',
    bias: 'metabolic',
    priority: ['metabolic_control', 'hormone_optimization', 'glycemic_targets']
  },
  HERA: {
    id: 'hera',
    name: 'HERA Guardian',
    specialty: 'Health Economics & Resource Agent',
    avatar: '🛡️',
    color: '#06b6d4',
    bias: 'constraint',
    priority: ['cost_effectiveness', 'accessibility', 'insurance_coverage']
  }
};

// Negotiation states
const NEGOTIATION_STATES = {
  INITIALIZING: 'initializing',
  ROUND_PROPOSAL: 'round_proposal',
  CONSTRAINT_REVIEW: 'constraint_review',
  VETO_ISSUED: 'veto_issued',
  CONSENSUS_REACHED: 'consensus_reached',
  DEADLOCK: 'deadlock',
  HUMAN_INTERVENTION: 'human_intervention',
  STEERING: 'steering',
  ERROR: 'error'
};

// Active negotiation sessions
const activeSessions = new Map();

/**
 * Create a new negotiation session
 */
function createSession(sessionId, patient, treatmentContext) {
  const session = {
    id: sessionId,
    patient,
    treatmentContext,
    state: NEGOTIATION_STATES.INITIALIZING,
    currentRound: 0,
    maxRounds: 3,
    proposals: [],
    agentAnalyses: {},
    vetoes: [],
    consensus: null,
    telemetry: [],
    humanInterventions: [],
    steeringConstraints: [],
    startTime: Date.now(),
    lastActivity: Date.now(),
    aiEnabled: AI_ENABLED
  };
  
  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Emit telemetry event for real-time streaming
 */
function emitTelemetry(sessionId, event) {
  const telemetryEvent = {
    sessionId,
    timestamp: Date.now(),
    ...event
  };
  
  const session = activeSessions.get(sessionId);
  if (session) {
    session.telemetry.push(telemetryEvent);
    session.lastActivity = Date.now();
  }
  
  negotiationEventBus.emit('telemetry', telemetryEvent);
  negotiationEventBus.emit(`telemetry:${sessionId}`, telemetryEvent);
  
  return telemetryEvent;
}

/**
 * Helper for AI calls with retry
 */
async function retryAICall(fn, maxRetries = 1, delayMs = 500) {
  if (!AI_ENABLED || !openaiClient) {
    throw new Error('AI System is not configured. Missing API Keys.');
  }
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`AI call attempt ${attempt}/${maxRetries + 1} failed:`, error.message);
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

/**
 * AI-Powered Nephrologist Agent
 */
async function nephrologistAnalyze(session) {
  const agent = AGENT_ROLES.NEPHROLOGIST;
  const { patient } = session;
  
  emitTelemetry(session.id, {
    type: 'agent_start',
    agent: agent.id,
    agentName: agent.name,
    specialty: agent.specialty,
    color: agent.color,
    message: `Analyzing renal function and AKI risk...`
  });
  
  try {
    const analysis = await retryAICall(
      () => openaiClient.analyzeWithAgent('nephrologist', patient),
      0, 0
    );
    analysis.aiGenerated = true;
    
    if (analysis.keyFindings?.length > 0) {
      emitTelemetry(session.id, {
        type: 'agent_insight',
        agent: agent.id,
        color: agent.color,
        message: analysis.keyFindings[0],
        data: { metabolizerStatus: analysis.metabolizerStatus }
      });
    }
    
    emitTelemetry(session.id, {
      type: 'agent_complete',
      agent: agent.id,
      color: agent.color,
      message: `Analysis complete. Confidence: ${Math.round((analysis.confidence || 0.7) * 100)}%`,
      proposal: {
        type: analysis.proposalType || 'Standard',
        confidence: analysis.confidence || 0.7
      }
    });
    
    session.agentAnalyses.nephrologist = analysis;
    return analysis;
  } catch (error) {
    emitTelemetry(session.id, {
      type: 'agent_alert',
      agent: agent.id,
      color: agent.color,
      severity: 'critical',
      message: `❌ Analysis failed: ${error.message}`
    });
    throw error;
  }
}

/**
 * AI-Powered Cardiologist Agent
 */
async function cardiologistAnalyze(session) {
  const agent = AGENT_ROLES.CARDIOLOGIST;
  const { patient } = session;
  
  emitTelemetry(session.id, {
    type: 'agent_start',
    agent: agent.id,
    agentName: agent.name,
    specialty: agent.specialty,
    color: agent.color,
    message: `Initiating cardiovascular assessment...`
  });
  
  try {
    const analysis = await retryAICall(
      () => openaiClient.analyzeWithAgent('cardiologist', patient, {
        nephrologistAnalysis: session.agentAnalyses.nephrologist
      }),
      0, 0
    );
    analysis.aiGenerated = true;
    
    emitTelemetry(session.id, {
      type: 'agent_insight',
      agent: agent.id,
      color: agent.color,
      message: analysis.recommendations?.[0] || `Safety assessment complete. Score: ${analysis.safetyScore || 75}/100`
    });
    
    emitTelemetry(session.id, {
      type: 'agent_complete',
      agent: agent.id,
      color: agent.color,
      message: `Safety review complete. Safety Score: ${analysis.safetyScore || 75}/100`,
      proposal: {
        type: analysis.proposalType || 'Conservative',
        confidence: analysis.confidence || 0.75,
        safetyScore: analysis.safetyScore || 75
      }
    });
    
    session.agentAnalyses.cardiologist = analysis;
    return analysis;
  } catch (error) {
    emitTelemetry(session.id, {
      type: 'agent_alert',
      agent: agent.id,
      color: agent.color,
      severity: 'critical',
      message: `❌ Analysis failed: ${error.message}`
    });
    throw error;
  }
}

/**
 * AI-Powered Endocrinologist Agent
 */
async function endocrinologistAnalyze(session) {
  const agent = AGENT_ROLES.ENDOCRINOLOGIST;
  const { patient } = session;
  
  emitTelemetry(session.id, {
    type: 'agent_start',
    agent: agent.id,
    agentName: agent.name,
    specialty: agent.specialty,
    color: agent.color,
    message: `Evaluating metabolic profile...`
  });
  
  try {
    const analysis = await retryAICall(
      () => openaiClient.analyzeWithAgent('endocrinologist', patient, {
        nephrologistAnalysis: session.agentAnalyses.nephrologist,
        cardiologistAnalysis: session.agentAnalyses.cardiologist
      }),
      0, 0
    );
    analysis.aiGenerated = true;
    
    if (analysis.keyFindings?.length > 0) {
      emitTelemetry(session.id, {
        type: 'agent_insight',
        agent: agent.id,
        color: agent.color,
        message: analysis.keyFindings[0]
      });
    }
    
    emitTelemetry(session.id, {
      type: 'agent_complete',
      agent: agent.id,
      color: agent.color,
      message: `Metabolic assessment complete. Confidence: ${Math.round((analysis.confidence || 0.75) * 100)}%`,
      proposal: {
        type: analysis.proposalType || 'Standard',
        confidence: analysis.confidence || 0.75
      }
    });
    
    session.agentAnalyses.endocrinologist = analysis;
    return analysis;
  } catch (error) {
    emitTelemetry(session.id, {
      type: 'agent_alert',
      agent: agent.id,
      color: agent.color,
      severity: 'critical',
      message: `❌ Analysis failed: ${error.message}`
    });
    throw error;
  }
}

/**
 * AI-Powered HERA Guardian Agent
 */
async function heraAnalyze(session) {
  const agent = AGENT_ROLES.HERA;
  const { patient } = session;
  
  emitTelemetry(session.id, {
    type: 'agent_start',
    agent: agent.id,
    agentName: agent.name,
    specialty: agent.specialty,
    color: agent.color,
    message: `Evaluating resource constraints and feasibility...`
  });
  
  try {
    const analysis = await retryAICall(
      () => openaiClient.analyzeWithAgent('hera', patient, {
        nephrologistAnalysis: session.agentAnalyses.nephrologist,
        cardiologistAnalysis: session.agentAnalyses.cardiologist,
        endocrinologistAnalysis: session.agentAnalyses.endocrinologist
      }),
      0, 0
    );
    analysis.aiGenerated = true;
    
    // FAST PATH: Run the C++ Native Knowledge Graph against current medications + recommended protocols
    let allMedications = [];
    if (Array.isArray(patient.currentMedications)) {
      allMedications = [...patient.currentMedications];
    } else if (Array.isArray(patient.medications)) {
      allMedications = patient.medications.map(m => typeof m === 'string' ? m : m.name).filter(Boolean);
    }
    
    // Include structurally proposed treatments from all specialist agents
    const agents = [session.agentAnalyses.nephrologist, session.agentAnalyses.cardiologist, session.agentAnalyses.endocrinologist];
    agents.forEach(a => {
      if (a && Array.isArray(a.proposedDrugs)) {
        allMedications.push(...a.proposedDrugs);
      }
    });

    // Extract physiological and socioeconomic context
    const patientContext = {
      budget: patient.socioEconomic?.monthlyBudget || patient.socioEconomic?.budget || 0,
      egfr: patient.labs?.egfr || 100
    };
    
    // Execute Native C++ Validation (O(N^2) total verification against constraints)
    const violations = heraGraph.validateRegimen(allMedications, patientContext);
    
    if (violations.length > 0) {
       // Hard veto override from C++ graph
       const violationReasons = violations.map(v => 
          v.drugA === 'BUDGET_EXCEEDED' ? v.drugB : 
          v.drugB.includes('Constraint') ? `${v.drugA}: ${v.drugB}` : 
          `${v.drugA} contraindicated with ${v.drugB}`
       ).join('; ');
       
       analysis.veto = {
           issued: true,
           reason: `HARD VETO via Native C++ Graph: ${violationReasons}`
       };
    }
    
    if (analysis.veto?.issued) {
      emitTelemetry(session.id, {
        type: 'agent_veto',
        agent: agent.id,
        color: agent.color,
        severity: 'critical',
        message: `🛑 VETO: ${analysis.veto.reason}`
      });
    } else {
      emitTelemetry(session.id, {
        type: 'agent_approval',
        agent: agent.id,
        color: agent.color,
        message: `✅ Feasibility approved (Score: ${analysis.feasibilityScore || 75}/100)`
      });
    }
    
    emitTelemetry(session.id, {
      type: 'agent_complete',
      agent: agent.id,
      color: agent.color,
      message: `Feasibility analysis complete. Score: ${analysis.feasibilityScore || 75}%`,
      response: {
        feasibilityScore: analysis.feasibilityScore,
        veto: analysis.veto
      }
    });
    
    session.agentAnalyses.hera = analysis;
    return analysis;
  } catch (error) {
    emitTelemetry(session.id, {
      type: 'agent_alert',
      agent: agent.id,
      color: agent.color,
      severity: 'critical',
      message: `❌ Analysis failed: ${error.message}`
    });
    throw error;
  }
}

/**
 * Generate consensus
 */
async function generateConsensus(session) {
  emitTelemetry(session.id, {
    type: 'phase_start',
    phase: 'consensus_building',
    message: `Building multi-agent consensus...`
  });
  
  try {
    const consensus = await retryAICall(
      () => openaiClient.generateConsensusRecommendation(
        session.patient,
        session.agentAnalyses
      ),
      0, 0
    );
    consensus.aiGenerated = true;
    
    emitTelemetry(session.id, {
      type: 'consensus_generated',
      message: `Consensus protocol: ${consensus.recommendedProtocol}`,
      data: consensus
    });
    
    session.consensus = consensus;
    return consensus;
  } catch (error) {
    emitTelemetry(session.id, {
      type: 'agent_alert',
      severity: 'critical',
      message: `❌ Consensus generation failed: ${error.message}`
    });
    throw error;
  }
}

/**
 * Run full negotiation process
 */
async function runNegotiation(sessionId, patient, treatmentContext = {}) {
  const session = createSession(sessionId, patient, treatmentContext);
  
  emitTelemetry(sessionId, {
    type: 'negotiation_start',
    message: `🚀 Multi-Agent Consensus Protocol Initiated`,
    patient: { name: patient.name, disease: patient.disease },
    aiEnabled: AI_ENABLED
  });

  if (!AI_ENABLED) {
    session.state = NEGOTIATION_STATES.ERROR;
    emitTelemetry(sessionId, {
      type: 'error',
      severity: 'critical',
      message: `🚫 AI System Disabled: Missing GEMINI_API_KEY, OPENAI_API_KEY or OPENROUTER_API_KEY. Simulated/mock results have been removed to ensure real outputs only.`
    });
    return {
      sessionId,
      session,
      result: { consensusReached: false, error: 'AI_NOT_CONFIGURED' },
      telemetry: session.telemetry,
      timing: { totalMs: 0 }
    };
  }
  
  session.currentRound = 1;
  session.state = NEGOTIATION_STATES.ROUND_PROPOSAL;
  
  const startTime = Date.now();

  // Create a deterministic hash of the patient's core clinical state
  const patientState = {
    id: patient.id || patient.patientId,
    disease: patient.disease,
    vitals: patient.vitals,
    biomarkers: patient.biomarkers,
    socioEconomic: patient.socioEconomic
  };
  const patientHash = crypto.createHash('sha256').update(JSON.stringify(patientState)).digest('hex');

  try {
    // 1. Check Redis Cache
    const cachedResult = await getCachedConsensus(patientHash);
    
    if (cachedResult) {
      emitTelemetry(sessionId, {
        type: 'cache_hit',
        message: `⚡ Redis Semantic Cache Hit (Hash: ${patientHash.substring(0, 8)}). Bypassing OpenAI.`,
      });
      
      // Emit the cached rounds
      emitTelemetry(sessionId, {
        type: 'round_start',
        round: 1,
        message: `═══════════ ROUND 1: Cached Specialist Analysis ═══════════`
      });

      // Rapidly replay agent telemetry
      for (const [agentKey, analysis] of Object.entries(cachedResult.agentAnalyses)) {
        if (agentKey !== 'hera') {
          emitTelemetry(sessionId, {
            type: 'agent_complete',
            agent: agentKey,
            color: AGENT_ROLES[agentKey.toUpperCase()].color,
            message: `Cached Analysis Applied (Confidence: ${analysis.confidenceScore}%)`,
            response: { recommendation: analysis.recommendation }
          });
        }
      }
      
      emitTelemetry(sessionId, {
        type: 'agent_complete',
        agent: 'hera',
        color: AGENT_ROLES.HERA.color,
        message: `Cached Feasibility applied. Veto: ${cachedResult.agentAnalyses.hera?.veto?.issued || false}`,
      });

      const totalTime = Date.now() - startTime;
      
      emitTelemetry(sessionId, {
        type: 'consensus_reached',
        round: session.currentRound,
        message: `✅ CONSENSUS ACHIEVED (From Cache)`,
        consensus: cachedResult.consensus,
        timing: { totalMs: totalTime }
      });
      
      emitTelemetry(sessionId, {
        type: 'negotiation_complete',
        message: `═══════════ NEGOTIATION COMPLETE ═══════════`,
        totalRounds: session.currentRound,
        vetoes: 0,
        consensusReached: true,
        aiEnabled: AI_ENABLED,
        timing: { totalMs: totalTime }
      });
      
      return {
        sessionId,
        session,
        result: {
          consensusReached: true,
          consensus: cachedResult.consensus,
          agentAnalyses: cachedResult.agentAnalyses
        },
        telemetry: session.telemetry,
        timing: { totalMs: totalTime }
      };
    }

    emitTelemetry(sessionId, {
      type: 'round_start',
      round: 1,
      message: `═══════════ ROUND 1: Specialist Analysis (Parallel) ═══════════`
    });
    await Promise.all([
      nephrologistAnalyze(session),
      cardiologistAnalyze(session),
      endocrinologistAnalyze(session)
    ]);
    
    emitTelemetry(sessionId, {
      type: 'phase_start',
      phase: 'constraint_review',
      message: `HERA Guardian constraint evaluation...`
    });
    
    session.state = NEGOTIATION_STATES.CONSTRAINT_REVIEW;
    await heraAnalyze(session);
    
    const heraAnalysis = session.agentAnalyses.hera;
    if (heraAnalysis?.veto?.issued) {
      session.state = NEGOTIATION_STATES.VETO_ISSUED;
      session.vetoes.push({
        round: 1,
        vetoAgent: 'hera',
        veto: heraAnalysis.veto
      });
    }
    
    const consensus = await generateConsensus(session);
    session.state = NEGOTIATION_STATES.CONSENSUS_REACHED;
    
    // Write successful consensus to Redis Cache
    await setCachedConsensus(patientHash, {
      consensus,
      agentAnalyses: session.agentAnalyses
    });
    
    const totalTime = Date.now() - startTime;
    
    emitTelemetry(sessionId, {
      type: 'consensus_reached',
      round: session.currentRound,
      message: `✅ CONSENSUS ACHIEVED`,
      consensus,
      timing: { totalMs: totalTime }
    });
    
    emitTelemetry(sessionId, {
      type: 'negotiation_complete',
      message: `═══════════ NEGOTIATION COMPLETE ═══════════`,
      totalRounds: session.currentRound,
      vetoes: session.vetoes.length,
      consensusReached: true,
      aiEnabled: AI_ENABLED,
      timing: { totalMs: totalTime }
    });
    
    return {
      sessionId,
      session,
      result: {
        consensusReached: true,
        consensus,
        agentAnalyses: session.agentAnalyses
      },
      telemetry: session.telemetry,
      timing: { totalMs: totalTime }
    };
  } catch (error) {
    session.state = NEGOTIATION_STATES.ERROR;
    const totalTime = Date.now() - startTime;
    return {
      sessionId,
      session,
      result: { consensusReached: false, error: error.message },
      telemetry: session.telemetry,
      timing: { totalMs: totalTime }
    };
  }
}

/**
 * Handle human intervention (HITL Steering)
 * Removed mock AI generation; if this is called, it just passes it to next cycle if we implement one, 
 * but for this simplified version, we just log it.
 */
async function injectHumanIntervention(sessionId, intervention) {
  const session = activeSessions.get(sessionId);
  if (!session) throw new Error('Session not found');
  
  session.state = NEGOTIATION_STATES.HUMAN_INTERVENTION;
  session.humanInterventions.push({
    timestamp: Date.now(),
    ...intervention
  });
  
  emitTelemetry(sessionId, {
    type: 'human_intervention',
    severity: 'critical',
    message: `🔔 HUMAN INTERVENTION: ${intervention.message || intervention.constraint}`,
    intervention
  });
  
  return session;
}

function getSession(sessionId) {
  return activeSessions.get(sessionId);
}

function getSessionTelemetry(sessionId) {
  const session = activeSessions.get(sessionId);
  return session ? session.telemetry : [];
}

module.exports = {
  runNegotiation,
  injectHumanIntervention,
  getSession,
  getSessionTelemetry,
  createSession,
  negotiationEventBus,
  AGENT_ROLES,
  NEGOTIATION_STATES,
  AI_ENABLED: () => AI_ENABLED
};
