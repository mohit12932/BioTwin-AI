/**
 * Pharmacology Routes
 * 
 * Endpoints for drug interaction checking, allergy contraindications,
 * renal dosing adjustments, and pharmacogenomic guidance.
 */

const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const { isMongoReady } = require('../config/mongo');
const { validatePatientId, sanitizeString } = require('../utils/validation');
const pharmacologyService = require('../services/pharmacology.service');
const PharmacologyAnalysis = require('../models/PharmacologyAnalysis');

/**
 * GET /api/pharmacology/:patientId/analysis
 * Get comprehensive pharmacology analysis for a patient
 */
router.get('/:patientId/analysis', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const analysis = pharmacologyService.analyzePatientPharmacology(patient);

    // Persist analysis to MongoDB
    try {
      if (isMongoReady()) {
        await PharmacologyAnalysis.create({
          patientId: req.params.patientId,
          analysiType: 'full',
          medications: (patient.medications || []).map(m => m.name || m),
          interactions: analysis.drugInteractions?.interactions || [],
          dosingAdjustments: analysis.renalDosing?.adjustments || [],
          pgxGuidance: analysis.pharmacogenomics?.guidance || [],
          allergyContraindications: analysis.allergyContraindications?.contraindications || [],
          fullResult: analysis
        });
        console.log(`Pharmacology analysis saved to MongoDB for patient: ${req.params.patientId}`);
      }
    } catch (dbErr) {
      console.warn('MongoDB save failed for pharmacology analysis:', dbErr.message);
    }
    
    res.json({
      patientId: req.params.patientId,
      patientName: patient.name,
      ...analysis
    });
  } catch (error) {
    console.error('Pharmacology analysis error:', error);
    res.status(500).json({ error: 'Failed to perform pharmacology analysis' });
  }
});

/**
 * POST /api/pharmacology/check-interactions
 * Check drug-drug interactions for a list of medications
 */
router.post('/check-interactions', (req, res) => {
  try {
    const { medications } = req.body;
    
    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({ error: 'medications array is required' });
    }

    const result = pharmacologyService.checkDrugInteractions(medications);
    res.json(result);
  } catch (error) {
    console.error('Interaction check error:', error);
    res.status(500).json({ error: 'Failed to check drug interactions' });
  }
});

/**
 * POST /api/pharmacology/check-allergies
 * Check drug-allergy contraindications
 */
router.post('/check-allergies', (req, res) => {
  try {
    const { medications, allergies } = req.body;
    
    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({ error: 'medications array is required' });
    }
    if (!allergies || !Array.isArray(allergies)) {
      return res.status(400).json({ error: 'allergies array is required' });
    }

    const result = pharmacologyService.checkAllergyContraindications(medications, allergies);
    res.json(result);
  } catch (error) {
    console.error('Allergy check error:', error);
    res.status(500).json({ error: 'Failed to check allergy contraindications' });
  }
});

/**
 * POST /api/pharmacology/renal-dosing
 * Get renal dose adjustments based on GFR
 */
router.post('/renal-dosing', (req, res) => {
  try {
    const { medications, gfr } = req.body;
    
    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({ error: 'medications array is required' });
    }
    if (gfr === undefined || gfr === null || typeof gfr !== 'number') {
      return res.status(400).json({ error: 'gfr (number) is required' });
    }

    const result = pharmacologyService.getrenalDoseAdjustments(medications, gfr);
    res.json(result);
  } catch (error) {
    console.error('Renal dosing error:', error);
    res.status(500).json({ error: 'Failed to calculate renal dose adjustments' });
  }
});

/**
 * POST /api/pharmacology/pgx-guidance
 * Get pharmacogenomic dosing guidance
 */
router.post('/pgx-guidance', (req, res) => {
  try {
    const { medications, pharmacogenomics } = req.body;
    
    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({ error: 'medications array is required' });
    }
    if (!pharmacogenomics || typeof pharmacogenomics !== 'object') {
      return res.status(400).json({ error: 'pharmacogenomics object is required' });
    }

    const result = pharmacologyService.getPharmacogenomicGuidance(medications, pharmacogenomics);
    res.json(result);
  } catch (error) {
    console.error('PGx guidance error:', error);
    res.status(500).json({ error: 'Failed to get pharmacogenomic guidance' });
  }
});

/**
 * POST /api/pharmacology/:patientId/add-medication
 * Add a new medication with safety check
 */
router.post('/:patientId/add-medication', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const { medication } = req.body;
    if (!medication || !medication.name) {
      return res.status(400).json({ error: 'medication object with name is required' });
    }

    // Sanitize medication name
    const sanitizedMedName = sanitizeString(medication.name, 100);
    if (!sanitizedMedName) {
      return res.status(400).json({ error: 'Invalid medication name' });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Create list with new medication for safety check
    const currentMeds = patient.medications || [];
    const newMedList = [...currentMeds, { ...medication, name: sanitizedMedName }];
    
    // Run safety checks
    const interactionCheck = pharmacologyService.checkDrugInteractions(newMedList);
    const allergyCheck = pharmacologyService.checkAllergyContraindications(
      [medication], 
      patient.allergies || []
    );
    
    // Check for critical issues
    const hasCriticalInteraction = interactionCheck.riskLevel === 'Critical';
    const hasCriticalAllergy = allergyCheck.riskLevel === 'Critical' || allergyCheck.riskLevel === 'High';
    
    if (hasCriticalInteraction || hasCriticalAllergy) {
      return res.status(409).json({
        error: 'Critical safety concern detected',
        canProceed: false,
        interactionCheck,
        allergyCheck,
        message: 'Medication not added due to safety concerns. Review and override if clinically appropriate.'
      });
    }

    // Add medication to patient
    const newMedication = {
      name: sanitizedMedName,
      dosage: medication.dosage || '',
      frequency: medication.frequency || '',
      route: medication.route || 'Oral',
      startDate: new Date(),
      indication: medication.indication || '',
      prescriber: medication.prescriber || ''
    };

    const patientObj = await Patient.findOne({ patientId: req.params.patientId });
    if (patientObj) {
      patientObj.medications.push(newMedication);
      await patientObj.save();
    }

    res.status(201).json({
      success: true,
      medication: newMedication,
      safetyCheck: {
        interactionCheck,
        allergyCheck
      },
      message: 'Medication added successfully'
    });
  } catch (error) {
    console.error('Add medication error:', error);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

/**
 * POST /api/pharmacology/:patientId/add-allergy
 * Add a new allergy to patient record
 */
router.post('/:patientId/add-allergy', async (req, res) => {
  try {
    const patientIdValidation = validatePatientId(req.params.patientId);
    if (!patientIdValidation.valid) {
      return res.status(400).json({ error: patientIdValidation.error });
    }

    const { allergy } = req.body;
    if (!allergy || !allergy.allergen) {
      return res.status(400).json({ error: 'allergy object with allergen is required' });
    }

    // Sanitize allergen name
    const sanitizedAllergen = sanitizeString(allergy.allergen, 100);
    if (!sanitizedAllergen) {
      return res.status(400).json({ error: 'Invalid allergen name' });
    }

    const patient = await getPatient(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const newAllergy = {
      allergen: sanitizedAllergen,
      allergenType: allergy.allergenType || 'Drug',
      reaction: allergy.reaction || '',
      severity: allergy.severity || 'Moderate',
      onsetDate: allergy.onsetDate ? new Date(allergy.onsetDate) : null,
      verified: allergy.verified || false
    };

    // Check if new allergy conflicts with current medications
    const allergyCheck = pharmacologyService.checkAllergyContraindications(
      patient.medications || [],
      [newAllergy]
    );

    const patientObj = await Patient.findOne({ patientId: req.params.patientId });
    if (patientObj) {
      patientObj.allergies.push(newAllergy);
      await patientObj.save();
    }

    res.status(201).json({
      success: true,
      allergy: newAllergy,
      medicationConflicts: allergyCheck.contraindications,
      warnings: allergyCheck.warnings,
      message: allergyCheck.contraindications.length > 0 
        ? 'Allergy added - WARNING: Conflicts with current medications detected!'
        : 'Allergy added successfully'
    });
  } catch (error) {
    console.error('Add allergy error:', error);
    res.status(500).json({ error: 'Failed to add allergy' });
  }
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

module.exports = router;
