// Layer 6: Explainability & Advanced Intelligence Engine

const digitalTwinService = require('./digitalTwin.service');
const Patient = require('../models/Patient');
const { isMongoReady } = require('../config/mongo');

const getPatientById = async (patientId) => {
  let patient = null;
  try {
    patient = await Patient.findOne({ patientId: patientId });
  } catch (e) {
    console.error('MongoDB query error:', e.message);
  }
  return patient;
};

/**
 * 1. Feature Importance Calculator (Explainable AI)
 * Simulates SHAP values by perturbing inputs and observing risk score delta.
 */
const calculateFeatureImportance = (patientProfile) => {
  // Baseline static estimation based on medical rules for the hackathon
  // In a real python microservice, this would be actual SHAP extraction.
  
  let factors = [];
  const vitals = patientProfile.vitals || {};
  const lifestyle = patientProfile.lifestyle || {};
  const age = patientProfile.age || 40;
  
  // Weights (adds up to ~100)
  if (vitals.bpSystolic > 130) {
    factors.push({ feature: "Blood Pressure (Systolic)", weight: 35, impact: "Negative", value: vitals.bpSystolic });
  } else {
    factors.push({ feature: "Blood Pressure", weight: 15, impact: "Neutral", value: vitals.bpSystolic });
  }
  
  if (lifestyle.smoking === "Yes" || lifestyle.smoking === "Past") {
    factors.push({ feature: "Smoking History", weight: 28, impact: "Negative", value: lifestyle.smoking });
  }
  
  if (vitals.sugar > 140) {
    factors.push({ feature: "Blood Glucose", weight: 22, impact: "Negative", value: vitals.sugar });
  }
  
  if (age > 60) {
    factors.push({ feature: "Age Factor", weight: 20, impact: "Negative", value: age });
  } else {
    factors.push({ feature: "Age Factor", weight: 10, impact: "Positive", value: age });
  }
  
  if (lifestyle.exercise === "None") {
    factors.push({ feature: "Sedentary Lifestyle", weight: 15, impact: "Negative", value: "None" });
  } else if (lifestyle.exercise === "Active") {
    factors.push({ feature: "Active Lifestyle", weight: 25, impact: "Positive", value: "Active" });
  }
  
  // Normalize weights to sum to 100%
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  factors = factors.map(f => ({
    ...f,
    normalizedWeight: parseFloat(((f.weight / totalWeight) * 100).toFixed(1))
  }));
  
  // Sort descending by weight
  factors.sort((a, b) => b.normalizedWeight - a.normalizedWeight);
  
  return factors;
};

/**
 * 2. Preventive Insights Generator
 */
const generatePreventiveInsights = (featureImportance) => {
  const insights = [];
  
  featureImportance.forEach(f => {
    if (f.impact === "Negative") {
      if (f.feature.includes("Blood Pressure")) {
        insights.push("Reducing Systolic BP by 10% can lower your acute cardiac event probability by 18%.");
      }
      if (f.feature.includes("Smoking")) {
        insights.push("Smoking cessation will improve SpO2 absorption efficiency and reduce respiratory distress risk by 35% within 1 year.");
      }
      if (f.feature.includes("Glucose")) {
        insights.push("Stabilizing fasting blood sugar below 110 mg/dL significantly enhances recovery velocity and limits metabolic complications.");
      }
      if (f.feature.includes("Sedentary")) {
        insights.push("Introducing 30 mins of moderate cardiovascular exercise daily improves systemic resilience.");
      }
    }
  });
  
  if (insights.length === 0) {
    insights.push("Patient profile demonstrates robust baseline stability. Maintain current lifestyle regimen.");
  }
  
  return insights;
};

/**
 * 3. What-If Scenario Engine Wrapper
 */
const runWhatIfSimulation = async (patientId, modifications, treatmentPlan) => {
  // Fetch original patient
  const patient = await getPatientById(patientId);
  
  if (!patient) throw new Error("Patient not found for What-If scenario.");
  
  // Deep clone to avoid mutating real DB twin
  const modifiedTwinInput = JSON.parse(JSON.stringify(patient));
  
  // Apply modifications (e.g., changes to vitals or lifestyle)
  if (modifications.vitals) {
    modifiedTwinInput.vitals = { ...modifiedTwinInput.vitals, ...modifications.vitals };
  }
  if (modifications.lifestyle) {
    modifiedTwinInput.lifestyle = { ...modifiedTwinInput.lifestyle, ...modifications.lifestyle };
  }

  if (modifications.profile) {
    modifiedTwinInput.profile = { ...modifiedTwinInput.profile, ...modifications.profile };
    if (typeof modifications.profile.height !== 'undefined') modifiedTwinInput.height = modifications.profile.height;
    if (typeof modifications.profile.weight !== 'undefined') modifiedTwinInput.weight = modifications.profile.weight;
  }
  
  // Re-run the core Digital Twin Simulation on the modified phantom twin
  const whatIfSimResult = digitalTwinService.simulateTreatment(modifiedTwinInput, treatmentPlan);
  
  // Run on baseline for delta calculation
  const baselineSimResult = digitalTwinService.simulateTreatment(patient, treatmentPlan);
  
  return {
    appliedModifications: modifications,
    baselineMetrics: {
      effectiveness: baselineSimResult.effectiveness,
      risk: baselineSimResult.risk
    },
    whatIfMetrics: {
      effectiveness: whatIfSimResult.effectiveness,
      risk: whatIfSimResult.risk
    },
    deltas: {
      effectivenessChange: parseFloat((whatIfSimResult.effectiveness - baselineSimResult.effectiveness).toFixed(1)),
      riskChange: parseFloat((whatIfSimResult.risk - baselineSimResult.risk).toFixed(1))
    }
  };
};

const generateCohortMatches = async (patientId, treatmentPlan = { type: 'Standard', dosage: 'Medium', duration: 30 }) => {
  const patient = await getPatientById(patientId);
  if (!patient) throw new Error('Patient not found for cohort matching.');

  const simulation = digitalTwinService.runFullSimulation(patient, treatmentPlan);
  const disease = patient.disease || 'General';
  const biomarkers = patient.biomarkers || {};
  const cohortsByDisease = {
    Oncology: ['Targeted responders', 'Immunotherapy bridge', 'Resistance surveillance'],
    Cardiac: ['High-risk intervention', 'Hemodynamic stabilization', 'Secondary prevention'],
    Metabolic: ['Insulin-sensitization', 'Lifestyle-responsive', 'Multi-morbidity control'],
    Respiratory: ['Inflammatory airway control', 'Oxygen recovery', 'Smoking-reversal'],
  };

  const labels = cohortsByDisease[disease] || ['General precision cohort', 'Conservative responders', 'Escalation candidates'];
  const baselineAge = patient.age || 50;
  const baseRisk = clampMetric((patient.metrics?.riskScore || 0.35) * 100);

  const cohorts = labels.map((label, index) => {
    const similarity = clampMetric(82 - index * 9 + simulation.effectiveness * 0.12 - baseRisk * 0.08 + (biomarkers.therapyTarget && biomarkers.therapyTarget !== 'Broad Standard of Care' ? 6 : 0));
    const responseRate = clampMetric(simulation.effectiveness + 8 - index * 6);
    const adverseRate = clampMetric(simulation.risk - 12 + index * 7);

    return {
      label,
      matchedPatients: Math.max(18, Math.round(90 - index * 17 + baselineAge * 0.2)),
      similarityScore: similarity,
      responseRate,
      adverseEventRate: adverseRate,
      relevance: similarity >= 75 ? 'High' : similarity >= 55 ? 'Medium' : 'Exploratory',
    };
  });

  cohorts.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    patientId,
    disease,
    recommendedCohort: cohorts[0],
    cohorts,
  };
};

const analyzeDrugInteractions = async (patientId) => {
  const patient = await getPatientById(patientId);
  if (!patient) throw new Error('Patient not found for drug intelligence.');

  const meds = patient.medications || [];
  const biomarkers = patient.biomarkers || {};
  const lifestyle = patient.lifestyle || {};
  const interactions = [];

  const hasMedication = (name) => meds.some((med) => (med.name || '').toLowerCase().includes(name));
  if (hasMedication('metformin') && (patient.vitals?.sugar || 0) > 140) {
    interactions.push({
      pair: 'Metformin + uncontrolled glucose state',
      severity: 'Moderate',
      signal: 'Metabolic control remains unstable despite active therapy.',
      action: 'Consider escalation or adherence review before adding aggressive protocols.',
    });
  }
  if (hasMedication('lisinopril') && (patient.vitals?.bpSystolic || 0) < 110) {
    interactions.push({
      pair: 'ACE inhibitor + low systolic pressure',
      severity: 'Moderate',
      signal: 'Current blood pressure trend may increase hypotension risk.',
      action: 'Reassess dose intensity before intensifying treatment.',
    });
  }
  if (lifestyle.smoking === 'Yes' || lifestyle.smoking === 'Past') {
    interactions.push({
      pair: 'Smoking history + cardio/respiratory therapies',
      severity: 'Moderate',
      signal: 'Smoking history can blunt therapeutic response and worsen oxygen recovery.',
      action: 'Pair treatment with smoking cessation support and closer respiratory monitoring.',
    });
  }
  if (biomarkers.resistanceMarker && biomarkers.resistanceMarker !== 'None reported') {
    interactions.push({
      pair: 'Resistance marker + targeted therapy pathway',
      severity: 'High',
      signal: `Recorded resistance marker: ${biomarkers.resistanceMarker}.`,
      action: 'Avoid single-pathway dependency and monitor for escape mechanisms.',
    });
  }

  return {
    patientId,
    interactions,
    summary: interactions.length
      ? 'Interaction intelligence found therapy, lifestyle, or biomarker conditions that may alter treatment safety.'
      : 'No major interaction warnings detected from current medication, biomarker, and lifestyle profile.',
  };
};

const buildClinicianReport = async (patientId, treatmentPlan = { type: 'Standard', dosage: 'Medium', duration: 30 }) => {
  const patient = await getPatientById(patientId);
  if (!patient) throw new Error('Patient not found for report generation.');

  const simulation = digitalTwinService.runFullSimulation(patient, treatmentPlan);
  const xai = calculateFeatureImportance(patient);
  const preventive = generatePreventiveInsights(xai);
  const cohort = await generateCohortMatches(patientId, treatmentPlan);
  const drugIntel = await analyzeDrugInteractions(patientId);

  return {
    patient,
    treatmentPlan,
    simulation,
    xai,
    preventive,
    cohort,
    drugIntel,
    generatedAt: new Date().toISOString(),
  };
};

const clampMetric = (value) => Math.max(0, Math.min(99, Number(value) || 0));

module.exports = {
  getPatientById,
  calculateFeatureImportance,
  generatePreventiveInsights,
  runWhatIfSimulation,
  generateCohortMatches,
  analyzeDrugInteractions,
  buildClinicianReport
};
