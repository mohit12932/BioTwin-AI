/**
 * Alerts Routes
 * 
 * Endpoints for clinical alerts, vital monitoring,
 * deterioration scoring, and alert management.
 */

const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { isMongoReady } = require('../config/mongo');
const { validatePatientId, sanitizeString } = require('../utils/validation');
const alertsService = require('../services/alerts.service');

/**
 * GET /api/alerts/:patientId
 * Get all alerts for a patient with optional filtering
 */
router.get('/:patientId', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { unacknowledgedOnly, severity } = req.query;
    let alerts = patient.alerts || [];

    // Filter by acknowledged status
    if (unacknowledgedOnly === 'true') {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    // Filter by severity
    if (severity) {
      const severities = severity.split(',').map(s => s.trim());
      alerts = alerts.filter(a => severities.includes(a.severity));
    }

    // Sort by severity and date
    const severityOrder = { 'Critical': 0, 'Warning': 1, 'Info': 2 };
    alerts.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      patientId: req.params.patientId,
      alerts,
      count: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'Critical').length,
        warning: alerts.filter(a => a.severity === 'Warning').length,
        info: alerts.filter(a => a.severity === 'Info').length,
        unacknowledged: alerts.filter(a => !a.acknowledged).length
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

/**
 * POST /api/alerts/:patientId/generate
 * Generate new alerts based on current patient data
 */
router.post('/:patientId/generate', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Generate alerts
    const alertAnalysis = await alertsService.generatePatientAlerts(patient);
    
    // Save new alerts to patient record
    if (alertAnalysis.alerts.length > 0) {
      await alertsService.savePatientAlerts(req.params.patientId, alertAnalysis.alerts);
    }

    res.json({
      patientId: req.params.patientId,
      ...alertAnalysis
    });
  } catch (error) {
    console.error('Generate alerts error:', error);
    res.status(500).json({ error: 'Failed to generate alerts' });
  }
});

/**
 * POST /api/alerts/:patientId/acknowledge/:alertId
 * Acknowledge a specific alert
 */
router.post('/:patientId/acknowledge/:alertId', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const { acknowledgedBy } = req.body;
    const acknowledger = sanitizeString(acknowledgedBy, 100) || 'System';

    const result = await alertsService.acknowledgeAlert(
      req.params.patientId,
      req.params.alertId,
      acknowledger
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Alert acknowledged',
        alertId: req.params.alertId,
        acknowledgedBy: acknowledger,
        acknowledgedAt: new Date().toISOString()
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to acknowledge alert' });
    }
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

/**
 * POST /api/alerts/:patientId/acknowledge-all
 * Acknowledge all alerts for a patient
 */
router.post('/:patientId/acknowledge-all', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const { acknowledgedBy, severity } = req.body;
    const acknowledger = sanitizeString(acknowledgedBy, 100) || 'System';

    // Build update query
    const updateQuery = { patientId: req.params.patientId };
    if (severity) {
      updateQuery['alerts.severity'] = severity;
    }

    if (isMongoReady()) {
      await Patient.updateMany(
        updateQuery,
        {
          $set: {
            'alerts.$[elem].acknowledged': true,
            'alerts.$[elem].acknowledgedBy': acknowledger,
            'alerts.$[elem].acknowledgedAt': new Date()
          }
        },
        {
          arrayFilters: severity 
            ? [{ 'elem.acknowledged': false, 'elem.severity': severity }]
            : [{ 'elem.acknowledged': false }]
        }
      );
    }

    res.json({
      success: true,
      message: severity ? `All ${severity} alerts acknowledged` : 'All alerts acknowledged',
      acknowledgedBy: acknowledger,
      acknowledgedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Acknowledge all alerts error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alerts' });
  }
});

/**
 * GET /api/alerts/:patientId/scores
 * Get deterioration scores (NEWS2, qSOFA) for a patient
 */
router.get('/:patientId/scores', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const vitals = patient.vitals || {};
    const conditions = patient.conditions || [];
    const isCOPD = conditions.some(c => /copd/i.test(c));

    // Calculate scores
    const news2 = alertsService.calculateNEWS2(vitals, {
      useSpO2Scale2: isCOPD,
      supplementalO2: req.query.supplementalO2 === 'true',
      consciousness: req.query.consciousness || 'alert'
    });

    const qsofa = alertsService.calculateQSOFA(vitals, req.query.mentalStatus || 'normal');

    res.json({
      patientId: req.params.patientId,
      patientName: patient.name,
      vitalsUsed: vitals,
      scores: {
        news2,
        qsofa
      },
      requiresEscalation: news2.riskLevel === 'High' || qsofa.sepsisRisk === 'High',
      recommendations: generateScoreRecommendations(news2, qsofa)
    });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({ error: 'Failed to calculate deterioration scores' });
  }
});

/**
 * POST /api/alerts/:patientId/vitals
 * Update patient vitals and auto-generate alerts
 */
router.post('/:patientId/vitals', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const { vitals } = req.body;
    if (!vitals || typeof vitals !== 'object') {
      return res.status(400).json({ error: 'vitals object is required' });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Merge new vitals with existing
    const updatedVitals = {
      ...patient.vitals,
      ...vitals,
      lastUpdated: new Date()
    };

    const patientObj = await Patient.findOne({ patientId: req.params.patientId });
    if (patientObj) {
      patientObj.vitals = updatedVitals;
      await patientObj.save();
    }

    // Generate alerts for new vitals
    const updatedPatient = { ...patient, vitals: updatedVitals };
    const alertAnalysis = await alertsService.generatePatientAlerts(updatedPatient);

    // Save any new alerts
    if (alertAnalysis.alerts.length > 0) {
      await alertsService.savePatientAlerts(req.params.patientId, alertAnalysis.alerts);
    }

    res.json({
      success: true,
      vitals: updatedVitals,
      alertAnalysis,
      message: alertAnalysis.requiresImmediateAttention 
        ? 'CRITICAL: Vitals updated - immediate attention required!'
        : 'Vitals updated successfully'
    });
  } catch (error) {
    console.error('Update vitals error:', error);
    res.status(500).json({ error: 'Failed to update vitals' });
  }
});

/**
 * GET /api/alerts/thresholds
 * Get configured alert thresholds (for reference)
 */
router.get('/config/thresholds', (req, res) => {
  res.json({
    vitalThresholds: alertsService.VITAL_THRESHOLDS,
    labThresholds: alertsService.LAB_THRESHOLDS,
    news2Scoring: alertsService.NEWS2_SCORING
  });
});

async function getPatient(patientId) {
  let patient = null;
  try {
    patient = await Patient.findOne({ patientId });
    if (!patient) {
      patient = await Patient.findOne({ id: patientId });
    }
  } catch (e) {
    console.warn('MongoDB query failed:', e.message);
  }
  return patient;
}

// Helper to generate recommendations from scores
function generateScoreRecommendations(news2, qsofa) {
  const recommendations = [];

  if (news2.riskLevel === 'High') {
    recommendations.push({
      priority: 'Immediate',
      action: 'Activate rapid response team',
      reason: `NEWS2 score ${news2.score} indicates high risk of deterioration`
    });
  } else if (news2.riskLevel === 'Medium') {
    recommendations.push({
      priority: 'Urgent',
      action: 'Request senior clinical review within 1 hour',
      reason: `NEWS2 score ${news2.score} indicates medium risk`
    });
  }

  if (qsofa.sepsisRisk === 'High') {
    recommendations.push({
      priority: 'Immediate',
      action: 'Initiate sepsis bundle - blood cultures, lactate, broad-spectrum antibiotics within 1 hour',
      reason: `qSOFA score ${qsofa.score}/3 suggests possible sepsis`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'Routine',
      action: 'Continue standard monitoring',
      reason: 'Deterioration scores within acceptable range'
    });
  }

  return recommendations;
}

module.exports = router;
