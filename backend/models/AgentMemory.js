const { mongoose } = require('../config/mongo');

const AgentMemorySchema = new mongoose.Schema({
  agentId: { type: String, required: true, index: true },
  patientId: { type: String, index: true },
  type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  context: { type: mongoose.Schema.Types.Mixed },
  reason: { type: String },
  drugs: [{ type: String }],
  estimatedCost: { type: Number },
  targetAgent: { type: String }
}, { timestamps: true, collection: 'agent_memories' });

// Add composite index for quick lookups
AgentMemorySchema.index({ agentId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model('AgentMemory', AgentMemorySchema);
