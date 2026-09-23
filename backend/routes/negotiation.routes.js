/**
 * Agent Negotiation Routes
 * 
 * REST API endpoints for:
 * - Starting multi-round agent negotiations
 * - Injecting human interventions
 * - Retrieving session state and telemetry
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const negotiationService = require('../services/agentNegotiation.service');
<<<<<<< HEAD
const Patient = require('../models/Patient');

async function getPatientById(id) {
  if (!isMongoReady()) {
    throw new Error('MongoDB is required but not connected.');
  }
  return await Patient.findOne({ patientId: id }).lean();
}
=======
const { getPatientById } = require('../services/explainability.service');
>>>>>>> 3778f74bcd64ed2d22a6821855c819025c03908c
const Negotiation = require('../models/Negotiation');
const { isMongoReady } = require('../config/mongo');

// Helper: persist a completed negotiation session to MongoDB
async function saveNegotiationToMongo(sessionId, patientId, result, context) {
  if (!isMongoReady()) return;
  try {
    await Negotiation.create({
      sessionId,
      patientId,
      state: result.session?.state,
      currentRound: result.session?.currentRound,
      maxRounds: result.session?.maxRounds,
      consensusReached: result.result?.consensusReached || false,
      finalPlan: result.result?.finalPlan,
      proposals: result.session?.proposals || [],
      vetoes: result.session?.vetoes || [],
      humanInterventions: result.session?.humanInterventions || [],
      telemetry: result.telemetry || [],
      treatmentContext: context,
      startTime: result.session?.startTime,
      endTime: new Date()
    });
    console.log(`Negotiation session saved to MongoDB: ${sessionId}`);
  } catch (dbErr) {
    console.warn('MongoDB save failed for negotiation:', dbErr.message);
  }
}

/**
 * POST /api/negotiate/start
 * Start a new multi-round agent negotiation for a patient
 */
router.post('/start', async (req, res) => {
  try {
    const { patientId, treatmentContext } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    // Fetch patient data
    const patient = await getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Generate unique session ID
    const sessionId = `neg-${uuidv4().slice(0, 8)}-${Date.now()}`;

    // Start negotiation asynchronously
    // The client should connect via WebSocket to receive real-time updates
    const negotiationPromise = negotiationService.runNegotiation(
      sessionId,
      patient,
      treatmentContext || {}
    );

    // Return immediately with session ID
    // Client connects to WebSocket for live updates
    res.json({
      success: true,
      sessionId,
      message: 'Negotiation started. Connect to WebSocket for live telemetry.',
      websocketUrl: `/ws/telemetry`,
      instructions: {
        step1: `Connect to WebSocket at ws://<host>/ws/telemetry`,
        step2: `Send: {"type": "subscribe", "sessionId": "${sessionId}"}`,
        step3: 'Receive real-time agent telemetry events'
      }
    });

    // Handle negotiation completion (fire and forget) — and persist to MongoDB
    negotiationPromise.then(result => {
      console.log(`[Negotiation] Session ${sessionId} completed:`, 
        result.result.consensusReached ? 'CONSENSUS' : 'NO CONSENSUS');
      saveNegotiationToMongo(sessionId, patientId, result, treatmentContext || {});
    }).catch(err => {
      console.error(`[Negotiation] Session ${sessionId} error:`, err);
    });

  } catch (error) {
    console.error('Error starting negotiation:', error);
    res.status(500).json({ error: 'Failed to start negotiation', details: error.message });
  }
});

/**
 * POST /api/negotiate/start-sync
 * Start negotiation and wait for completion (for non-WebSocket clients)
 */
router.post('/start-sync', async (req, res) => {
  try {
    const { patientId, treatmentContext } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const patient = await getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const sessionId = `neg-${uuidv4().slice(0, 8)}-${Date.now()}`;

    // Run negotiation synchronously
    const result = await negotiationService.runNegotiation(
      sessionId,
      patient,
      treatmentContext || {}
    );

    // Persist to MongoDB
    await saveNegotiationToMongo(sessionId, patientId, result, treatmentContext || {});

    res.json({
      success: true,
      sessionId,
      ...result.result,
      telemetry: result.telemetry,
      session: {
        rounds: result.session.currentRound,
        vetoes: result.session.vetoes,
        state: result.session.state
      }
    });

  } catch (error) {
    console.error('Error in sync negotiation:', error);
    res.status(500).json({ error: 'Negotiation failed', details: error.message });
  }
});

/**
 * POST /api/negotiate/:sessionId/intervene
 * Inject a human intervention into an active negotiation
 */
router.post('/:sessionId/intervene', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, message, constraint, impact } = req.body;

    if (!type || !message) {
      return res.status(400).json({ error: 'type and message are required' });
    }

    // Validate intervention type
    const validTypes = [
      'insurance_lost',
      'refuses_injections',
      'new_allergy',
      'budget_change',
      'urgency_change',
      'custom'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid intervention type',
        validTypes 
      });
    }

    const intervention = {
      type,
      message,
      constraint: constraint || message,
      impact: impact || 'Workflow re-evaluation required',
      timestamp: Date.now()
    };

    const session = await negotiationService.injectHumanIntervention(sessionId, intervention);

    res.json({
      success: true,
      sessionId,
      message: 'Intervention injected successfully',
      intervention,
      sessionState: session.state
    });

  } catch (error) {
    console.error('Error injecting intervention:', error);
    res.status(500).json({ error: 'Failed to inject intervention', details: error.message });
  }
});

/**
 * GET /api/negotiate/:sessionId
 * Get current state of a negotiation session
 */
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = negotiationService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId,
      state: session.state,
      currentRound: session.currentRound,
      maxRounds: session.maxRounds,
      proposals: session.proposals,
      vetoes: session.vetoes,
      consensus: session.consensus,
      humanInterventions: session.humanInterventions,
      startTime: session.startTime,
      lastActivity: session.lastActivity
    });

  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session', details: error.message });
  }
});

/**
 * GET /api/negotiate/:sessionId/telemetry
 * Get full telemetry log for a session
 */
router.get('/:sessionId/telemetry', (req, res) => {
  try {
    const { sessionId } = req.params;
    const telemetry = negotiationService.getSessionTelemetry(sessionId);

    if (!telemetry || telemetry.length === 0) {
      return res.status(404).json({ error: 'No telemetry found for session' });
    }

    res.json({
      sessionId,
      eventCount: telemetry.length,
      telemetry
    });

  } catch (error) {
    console.error('Error getting telemetry:', error);
    res.status(500).json({ error: 'Failed to get telemetry', details: error.message });
  }
});

/**
 * GET /api/negotiate/agents/info
 * Get information about available agents
 */
router.get('/agents/info', (req, res) => {
  res.json({
    agents: negotiationService.AGENT_ROLES,
    states: negotiationService.NEGOTIATION_STATES,
    description: 'Multi-round agent negotiation protocol with VETO capability'
  });
});

/**
 * POST /api/negotiate/:sessionId/force-revision
 * Force a revision round (for testing/demo)
 */
router.post('/:sessionId/force-revision', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = negotiationService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Inject a forced revision intervention
    await negotiationService.injectHumanIntervention(sessionId, {
      type: 'custom',
      message: reason || 'Manual revision triggered',
      constraint: 'Re-evaluate all proposals',
      impact: 'Full revision cycle required'
    });

    res.json({
      success: true,
      sessionId,
      message: 'Revision forced successfully'
    });

  } catch (error) {
    console.error('Error forcing revision:', error);
    res.status(500).json({ error: 'Failed to force revision', details: error.message });
  }
});

module.exports = router;
