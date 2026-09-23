/**
 * Agent Memory & Self-Reflection Service
 * 
 * Simplified Version.
 * Retains basic case history logging for demonstration without complex 
 * reflective pattern matching.
 */

const AgentMemory = require('../models/AgentMemory');
const { isMongoReady } = require('../config/mongo');

// Memory types
const MEMORY_TYPES = {
  VETO_RECEIVED: 'veto_received',
  RECOMMENDATION_SUCCESS: 'recommendation_success',
  DRUG_INTERACTION_LEARNED: 'drug_interaction_learned',
  BUDGET_CONSTRAINT_LEARNED: 'budget_constraint_learned',
  PATIENT_PATTERN: 'patient_pattern',
  CONSENSUS_ACHIEVED: 'consensus_achieved'
};

const MAX_MEMORIES_PER_AGENT = 10;

async function storeMemory(agentId, memory) {
  if (!isMongoReady()) return null;
  
  try {
    const memoryEntry = await AgentMemory.create({
      agentId,
      ...memory
    });
    
    // Cleanup old memories to maintain max limit
    const count = await AgentMemory.countDocuments({ agentId });
    if (count > MAX_MEMORIES_PER_AGENT) {
      const oldestMemories = await AgentMemory.find({ agentId })
        .sort({ timestamp: 1 })
        .limit(count - MAX_MEMORIES_PER_AGENT);
      
      for (const oldMem of oldestMemories) {
        await AgentMemory.findByIdAndDelete(oldMem._id);
      }
    }
    
    return memoryEntry;
  } catch (err) {
    console.error('AgentMemory store failed:', err.message);
    return null;
  }
}

function queryMemories(agentId, query = {}) {
  return []; // Simplified: return empty or basic history
}

// Replaced complex reflections with empty array
function getReflections(agentId, patientContext) {
  return [];
}

function recordHeraVeto(patientContext, vetoDetails) {
  return storeMemory('hera', {
    type: MEMORY_TYPES.VETO_RECEIVED,
    reason: vetoDetails.reason,
    drugs: vetoDetails.drugs,
    estimatedCost: vetoDetails.estimatedCost,
    targetAgent: vetoDetails.targetAgent,
    patientId: patientContext?.patientId || patientContext?.id,
    timestamp: Date.now()
  });
}

function recordSuccessfulRecommendation(agentId, patientContext, recommendation) {
  return storeMemory(agentId, {
    type: MEMORY_TYPES.RECOMMENDATION_SUCCESS,
    patientId: patientContext?.patientId || patientContext?.id,
    context: recommendation,
    timestamp: Date.now()
  });
}

function recordDrugInteraction(drugs, severity, description) {
  return storeMemory('pharmacologist', {
    type: MEMORY_TYPES.DRUG_INTERACTION_LEARNED,
    description
  });
}

function recordBudgetLearning(budgetRange, successfulAlternative) {
  return storeMemory('hera', {
    type: MEMORY_TYPES.BUDGET_CONSTRAINT_LEARNED
  });
}

// Generating reflection message now returns null to remove "fake memory" UI chatter
function generateReflectionMessage(agentId, patientContext) {
  return null;
}

async function getAllMemories() {
  if (!isMongoReady()) return {};
  try {
    const all = await AgentMemory.find().sort({ timestamp: -1 }).lean();
    const grouped = {};
    for (const mem of all) {
      if (!grouped[mem.agentId]) grouped[mem.agentId] = [];
      grouped[mem.agentId].push(mem);
    }
    return grouped;
  } catch (err) {
    console.error('Failed to get all memories:', err.message);
    return {};
  }
}

async function clearAllMemories() {
  if (isMongoReady()) {
    try {
      await AgentMemory.deleteMany({});
    } catch (err) {
      console.error('Failed to clear memories:', err.message);
    }
  }
}

module.exports = {
  storeMemory,
  queryMemories,
  getReflections,
  recordHeraVeto,
  recordSuccessfulRecommendation,
  recordDrugInteraction,
  recordBudgetLearning,
  generateReflectionMessage,
  getAllMemories,
  clearAllMemories,
  MEMORY_TYPES
};
