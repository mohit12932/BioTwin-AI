const { mongoose } = require('../config/mongo');

// ── Negotiation Session ──────────────────────────────────────────────────────
const NegotiationSchema = new mongoose.Schema({
  sessionId:          { type: String, required: true, unique: true, index: true },
  patientId:          { type: String, required: true, index: true },
  state:              { type: String },
  currentRound:       { type: Number },
  maxRounds:          { type: Number },
  consensusReached:   { type: Boolean, default: false },
  finalPlan:          { type: mongoose.Schema.Types.Mixed },
  proposals:          [{ type: mongoose.Schema.Types.Mixed }],
  vetoes:             [{ type: mongoose.Schema.Types.Mixed }],
  humanInterventions: [{ type: mongoose.Schema.Types.Mixed }],
  telemetry:          [{ type: mongoose.Schema.Types.Mixed }],
  treatmentContext:   { type: mongoose.Schema.Types.Mixed },
  startTime:          { type: Date },
  endTime:            { type: Date }
}, { timestamps: true, collection: 'negotiations' });

NegotiationSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Negotiation', NegotiationSchema);
