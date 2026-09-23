/**
 * Clinical Trials Routes
 * 
 * API endpoints for clinical trial matching and search
 * Integrates with trials.service.js for patient-to-trial matching
 */

const express = require('express');
const router = express.Router();
const trialsService = require('../services/trials.service');
const Patient = require('../models/Patient');
const TrialMatch = require('../models/TrialMatch');
const { isMongoReady } = require('../config/mongo');

/**
 * Helper to get patient from MongoDB or mockDB fallback
 */
async function getPatient(patientId) {
  let patient = null;
  try {
    patient = await Patient.findOne({ patientId }) || await Patient.findOne({ id: patientId });
  } catch (e) {
    console.warn('MongoDB patient lookup failed:', e.message);
  }
  return patient;
}

/**
 * POST /api/trials/match/:patientId
 * Match a patient to eligible clinical trials
 */
router.post('/match/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await getPatient(patientId);
    
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        message: `No patient found with ID: ${patientId}`
      });
    }

    const matchResults = await trialsService.matchPatientToTrials(patient);

    // Persist match result to MongoDB
    try {
      if (isMongoReady()) {
        await TrialMatch.create({
          patientId,
          matchType: 'full',
          totalFound: matchResults.totalFound,
          eligibleTrials: matchResults.eligibleCount,
          results: matchResults.results
        });
        console.log(`Trial match saved to MongoDB for patient: ${patientId}`);
      }
    } catch (dbErr) {
      console.warn('MongoDB save failed for trial match:', dbErr.message);
    }
    
    res.json({ success: true, ...matchResults });
  } catch (error) {
    console.error('Trial matching error:', error);
    res.status(500).json({ error: 'Trial matching failed', message: error.message });
  }
});

/**
 * GET /api/trials/search
 * Search clinical trials by criteria
 * Query params: disease, phase, status, genomicMarker, intervention
 */
router.get('/search', (req, res) => {
  try {
    const { disease, phase, status, genomicMarker, intervention } = req.query;
    
    const criteria = {};
    if (disease) criteria.disease = disease;
    if (phase) criteria.phase = phase;
    if (status) criteria.status = status;
    if (genomicMarker) criteria.genomicMarker = genomicMarker;
    if (intervention) criteria.intervention = intervention;
    
    const results = trialsService.searchTrials(criteria);
    
    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Trial search error:', error);
    res.status(500).json({
      error: 'Trial search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trials/:nctId
 * Get detailed information about a specific trial
 */
router.get('/:nctId', (req, res) => {
  try {
    const { nctId } = req.params;
    
    // Validate NCT ID format
    if (!nctId || !nctId.match(/^NCT\d{8}$/)) {
      return res.status(400).json({
        error: 'Invalid NCT ID',
        message: 'NCT ID should be in format NCT followed by 8 digits (e.g., NCT04567890)'
      });
    }
    
    const trial = trialsService.getTrialById(nctId);
    
    if (!trial) {
      return res.status(404).json({
        error: 'Trial not found',
        message: `No trial found with NCT ID: ${nctId}`
      });
    }
    
    res.json({
      success: true,
      trial
    });
  } catch (error) {
    console.error('Trial lookup error:', error);
    res.status(500).json({
      error: 'Trial lookup failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trials/list/all
 * Get all available clinical trials
 */
router.get('/list/all', (_req, res) => {
  try {
    const results = trialsService.searchTrials({});
    
    res.json({
      success: true,
      trials: results.results,
      totalTrials: results.totalFound
    });
  } catch (error) {
    console.error('Trial list error:', error);
    res.status(500).json({
      error: 'Failed to list trials',
      message: error.message
    });
  }
});

/**
 * POST /api/trials/quick-match
 * Quick trial matching without full patient record
 * Accepts partial patient data in request body
 */
router.post('/quick-match', async (req, res) => {
  try {
    const partialPatient = req.body;
    
    if (!partialPatient || Object.keys(partialPatient).length === 0) {
      return res.status(400).json({
        error: 'Missing patient data',
        message: 'Request body must contain patient information for matching'
      });
    }
    
    // Ensure minimum required fields
    if (!partialPatient.disease && !partialPatient.conditions) {
      return res.status(400).json({
        error: 'Insufficient data',
        message: 'At least disease type or conditions must be provided for matching'
      });
    }
    
    // Generate a temporary ID for the quick match
    partialPatient.patientId = partialPatient.patientId || `QUICK-${Date.now()}`;
    partialPatient.name = partialPatient.name || 'Quick Match Patient';
    
    const matchResults = await trialsService.matchPatientToTrials(partialPatient);
    
    res.json({
      success: true,
      matchType: 'quick',
      ...matchResults
    });
  } catch (error) {
    console.error('Quick match error:', error);
    res.status(500).json({
      error: 'Quick match failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trials/stats/summary
 * Get statistics about available trials
 */
router.get('/stats/summary', (_req, res) => {
  try {
    const allTrials = trialsService.CLINICAL_TRIALS;
    
    // Calculate statistics
    const stats = {
      totalTrials: allTrials.length,
      byPhase: {},
      byStatus: {},
      byDisease: {},
      recruitingCount: 0
    };
    
    allTrials.forEach(trial => {
      // Phase distribution
      stats.byPhase[trial.phase] = (stats.byPhase[trial.phase] || 0) + 1;
      
      // Status distribution
      stats.byStatus[trial.status] = (stats.byStatus[trial.status] || 0) + 1;
      
      // Disease distribution
      (trial.eligibility.diseases || []).forEach(disease => {
        stats.byDisease[disease] = (stats.byDisease[disease] || 0) + 1;
      });
      
      // Recruiting count
      if (trial.status === 'Recruiting') {
        stats.recruitingCount++;
      }
    });
    
    res.json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get trial statistics',
      message: error.message
    });
  }
});

module.exports = router;
