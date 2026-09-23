const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const intakeService = require('../services/intake.service');
const Patient = require('../models/Patient');
const { isMongoReady } = require('../config/mongo');
const { validatePatientId, validatePatientIntake, sanitizeString } = require('../utils/validation');
const { authorize, authorizePatientResource } = require('../middleware/auth.middleware');

router.post('/parse-lab', authorize('doctor', 'admin'), (req, res) => {
  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'rawText required' });

  try {
    const parsed = intakeService.parseLabPanel(rawText);
    res.json(parsed);
  } catch (error) {
    console.error('Lab parse error:', error);
    res.status(500).json({ error: 'Failed to parse lab panel.' });
  }
});



// Add new Intake Endpoint
router.post('/intake', authorize('doctor', 'admin'), async (req, res) => {
  try {
    const rawData = req.body;
    
    // Validate patient intake data
    const intakeValidation = validatePatientIntake(rawData);
    if (!intakeValidation.valid) {
      return res.status(400).json({ error: intakeValidation.error });
    }
    
    // Process and normalize data via business logic
    const structuredProfile = intakeService.processIntake(rawData);
    
    // Create new patient object
    const newPatient = {
      ...structuredProfile
    };
    
    // Save to MongoDB
    if (!isMongoReady()) {
      return res.status(503).json({ error: 'MongoDB is required but not connected.' });
    }
    
    await Patient.create(newPatient);
    
    // We send back exactly what is required for the Next Layer
    res.status(201).json({
      patientId: newPatient.patientId,
      baselineHealthIndex: newPatient.metrics.baselineHealthIndex,
      riskScore: newPatient.metrics.riskScore,
      diseaseProbability: newPatient.metrics.diseaseProbability,
      profile: newPatient.profile,
      message: "Digital Health Profile Successfully Created"
    });
  } catch (error) {
    console.error("Intake Error:", error);
    res.status(500).json({ error: "Failed to process patient intake" });
  }
});

router.post('/', authorize('doctor', 'admin'), async (req, res) => {
  const patientData = req.body;
  
  // Validate required fields
  if (!patientData.name || !patientData.age) {
    return res.status(400).json({ error: "Name and age are required" });
  }
  
  // Sanitize name
  const sanitizedName = sanitizeString(patientData.name, 100);
  if (!sanitizedName) {
    return res.status(400).json({ error: "Name is required and must be a valid string" });
  }
  
  // Validate age
  const age = Number(patientData.age);
  if (isNaN(age) || age < 0 || age > 150) {
    return res.status(400).json({ error: "Age must be a number between 0 and 150" });
  }

  // 'patientId' (Mongoose schema required field) must be set
  const generatedId = uuidv4();
  const newPatient = {
    patientId: generatedId,
    ...patientData,
    name: sanitizedName,
    age: age,
    createdAt: new Date()
  };

  if (!isMongoReady()) {
    return res.status(503).json({ error: 'MongoDB is required but not connected.' });
  }

    return res.status(500).json({ error: 'Database error' });
  }
  
  res.status(201).json(newPatient);
});

router.get('/:id', authorizePatientResource, async (req, res) => {
  // Validate patient ID
  const patientIdValidation = validatePatientId(req.params.id);
  if (!patientIdValidation.valid) {
    return res.status(400).json({ error: patientIdValidation.error });
  }

  let patient;
  try {
     if (!isMongoReady()) {
        return res.status(503).json({ error: 'MongoDB is required but not connected.' });
     }
     // try Mongo first
      const queryPatient = await Patient.findOne({ patientId: req.params.id });
      if (queryPatient) patient = queryPatient;
  } catch(e) {
    console.warn('MongoDB query failed for patient lookup:', e.message);
    return res.status(500).json({ error: 'Database error' });
  }
  
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json(patient);
});

router.get('/', authorize('doctor', 'admin'), async (req, res) => {
  let patients = [];
  try {
     if (!isMongoReady()) {
        return res.status(503).json({ error: 'MongoDB is required but not connected.' });
     }
     patients = await Patient.find({});
  } catch(e) {
    console.warn('MongoDB query failed for patient list:', e.message);
    return res.status(500).json({ error: 'Database error' });
  }
  
  res.json(patients);
});

module.exports = router;
