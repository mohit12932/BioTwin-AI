const { mongoose } = require('../config/mongo');

const WearableEventSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  metrics: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

WearableEventSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('WearableEvent', WearableEventSchema);
