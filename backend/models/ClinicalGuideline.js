const mongoose = require('mongoose');

const clinicalGuidelineSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    default: 'Clinical Database',
  },
  specialty: {
    type: String,
    required: true,
    enum: ['nephrologist', 'cardiologist', 'endocrinologist', 'general'],
  },
  embedding: {
    type: [Number],
    required: true,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClinicalGuideline', clinicalGuidelineSchema);
