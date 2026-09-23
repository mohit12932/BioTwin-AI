const { mongoose } = require('../config/mongo');

const AuditLogSchema = new mongoose.Schema({
  user: { type: String, required: true }, // user ID or email
  role: { type: String, required: true }, // doctor, admin, patient
  action: { type: String, required: true }, // e.g., 'GET /api/patient/P123'
  resourceId: { type: String }, // e.g., patient ID
  details: { type: mongoose.Schema.Types.Mixed }, 
  timestamp: { type: Date, default: Date.now }
});

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ user: 1, timestamp: -1 });
AuditLogSchema.index({ resourceId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
