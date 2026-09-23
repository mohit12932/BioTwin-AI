// Layer 6: Explainability & Advanced Intelligence API

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const explainService = require('../services/explainability.service');
const Patient = require('../models/Patient');
const { isMongoReady } = require('../config/mongo');

// POST /api/explain/insights - Get Feature Importance (Explainable AI)
router.post('/insights', async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: "patientId required" });
  
  try {
    let patient;
    try {
      patient = await Patient.findOne({ patientId: patientId });
    } catch(e) {
      console.error('MongoDB query error:', e.message);
    }
    
    if (!patient) return res.status(404).json({ error: "Patient Twin not found." });
    
    const featureImportance = explainService.calculateFeatureImportance(patient);
    const preventiveInsights = explainService.generatePreventiveInsights(featureImportance);
    
    res.json({
      featureImportance,
      preventiveInsights
    });
  } catch (error) {
    console.error("XAI Insight Error:", error);
    res.status(500).json({ error: "Failed to compile XAI reasoning." });
  }
});

// POST /api/explain/what-if - Run Interactive What-If Scenarios
router.post('/what-if', async (req, res) => {
  const { patientId, modifications, treatmentPlan } = req.body;
  
  if (!patientId || !modifications || !treatmentPlan) {
    return res.status(400).json({ error: "Missing parameters for What-If compilation." });
  }
  
  try {
    const whatIfResults = await explainService.runWhatIfSimulation(patientId, modifications, treatmentPlan);
    res.json(whatIfResults);
  } catch (error) {
    console.error("What-If Engine Error:", error);
    res.status(500).json({ error: "Failed to simulate alternative timeline." });
  }
});

router.post('/cohort-match', async (req, res) => {
  const { patientId, treatmentPlan } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  try {
    const data = await explainService.generateCohortMatches(patientId, treatmentPlan);
    res.json(data);
  } catch (error) {
    console.error('Cohort Match Error:', error);
    res.status(500).json({ error: 'Failed to generate cohort matches.' });
  }
});

router.post('/drug-intelligence', async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  try {
    const data = await explainService.analyzeDrugInteractions(patientId);
    res.json(data);
  } catch (error) {
    console.error('Drug Intelligence Error:', error);
    res.status(500).json({ error: 'Failed to analyze drug interactions.' });
  }
});

router.post('/report', async (req, res) => {
  const { patientId, treatmentPlan } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  // Sanitize patientId to prevent path traversal in filename
  const sanitizedPatientId = String(patientId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  if (!sanitizedPatientId) {
    return res.status(400).json({ error: 'Invalid patientId format' });
  }

  try {
    const report = await explainService.buildClinicianReport(patientId, treatmentPlan);
    
    // Validate report structure before generating PDF
    if (!report || !report.patient || !report.simulation) {
      return res.status(500).json({ error: 'Incomplete report data. Run simulation first.' });
    }
    
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const filename = `biotwin-report-${sanitizedPatientId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(22).text('BioTwin AI Clinician Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Generated: ${report.generatedAt || new Date().toISOString()}`);
    doc.text(`Patient: ${report.patient.name || 'Unknown'} (${report.patient.patientId || sanitizedPatientId})`);
    doc.text(`Disease Pathway: ${report.patient.disease || 'Not specified'}`);
    
    // Safely access treatment plan properties
    const treatmentType = report.treatmentPlan?.type || 'Standard';
    const treatmentDosage = report.treatmentPlan?.dosage || 'Medium';
    const treatmentDuration = report.treatmentPlan?.duration || 30;
    doc.text(`Treatment Plan: ${treatmentType} / ${treatmentDosage} / ${treatmentDuration} days`);

    doc.moveDown();
    doc.fontSize(16).text('Simulation Summary');
    doc.fontSize(11).text(`Effectiveness: ${report.simulation.effectiveness ?? 'N/A'}%`);
    doc.text(`Risk: ${report.simulation.risk ?? 'N/A'}%`);
    doc.text(`Side Effects: ${report.simulation.sideEffects ?? 'N/A'}%`);
    
    // Safely access nested recommendation
    const bestRecommendation = report.simulation.recommendation?.best?.name || 'Not available';
    doc.text(`Best Recommendation: ${bestRecommendation}`);

    doc.moveDown();
    doc.fontSize(16).text('Top Risk Drivers');
    const xaiData = Array.isArray(report.xai) ? report.xai : [];
    if (xaiData.length > 0) {
      xaiData.slice(0, 4).forEach((item) => {
        if (item && item.feature) {
          doc.fontSize(11).text(`- ${item.feature}: ${item.value ?? 'N/A'} (${item.normalizedWeight ?? 0}%)`);
        }
      });
    } else {
      doc.fontSize(11).text('- No risk driver data available');
    }

    doc.moveDown();
    doc.fontSize(16).text('Preventive Actions');
    const preventiveData = Array.isArray(report.preventive) ? report.preventive : [];
    if (preventiveData.length > 0) {
      preventiveData.slice(0, 3).forEach((item) => {
        if (item) doc.fontSize(11).text(`- ${item}`);
      });
    } else {
      doc.fontSize(11).text('- No preventive actions specified');
    }

    doc.moveDown();
    doc.fontSize(16).text('Cohort Match');
    if (report.cohort?.recommendedCohort) {
      doc.fontSize(11).text(`Recommended cohort: ${report.cohort.recommendedCohort.label || 'Unknown'}`);
      doc.text(`Similarity: ${report.cohort.recommendedCohort.similarityScore ?? 'N/A'}%`);
      doc.text(`Response rate: ${report.cohort.recommendedCohort.responseRate ?? 'N/A'}%`);
    } else {
      doc.fontSize(11).text('- No cohort match data available');
    }

    doc.moveDown();
    doc.fontSize(16).text('Drug Interaction Intelligence');
    const interactions = report.drugIntel?.interactions;
    if (Array.isArray(interactions) && interactions.length > 0) {
      interactions.slice(0, 3).forEach((item) => {
        if (item) {
          doc.fontSize(11).text(`- ${item.pair || 'Unknown'} [${item.severity || 'Unknown'}]`);
          doc.text(`  ${item.action || 'No action specified'}`);
        }
      });
    } else {
      doc.fontSize(11).text('- No major interaction warnings detected.');
    }

    doc.end();
  } catch (error) {
    console.error('Report Export Error:', error);
    res.status(500).json({ error: 'Failed to generate clinician report.' });
  }
});

module.exports = router;
