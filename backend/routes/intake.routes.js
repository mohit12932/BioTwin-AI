const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseMedicalDocument } = require('../services/ai/openaiClient');
const intakeService = require('../services/intake.service');
const Patient = require('../models/Patient');
const { isMongoReady } = require('../config/mongo');

// Set up multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @route   POST /api/intake/parse-document
 * @desc    Upload an image/pdf of a lab report and return parsed JSON
 * @access  Public (for kiosk mode)
 */
router.post('/parse-document', upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Map files to an array of { buffer, mimetype }
    const filesData = req.files.map(file => {
      let mimeType = file.mimetype;
      if (mimeType === 'application/octet-stream' && file.originalname && file.originalname.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      }
      return {
        buffer: file.buffer,
        mimeType: mimeType
      };
    });
    
    const parsedData = await parseMedicalDocument(filesData);
    
    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('OCR Parsing Error:', error);
    return res.status(500).json({ 
      error: 'Failed to parse document',
      message: error.message 
    });
  }
});

router.get('/demo-cases', (req, res) => {
  res.json(intakeService.getDemoCases());
});

router.post('/demo-seed/:slug', async (req, res) => {
  try {
    const cases = intakeService.getDemoCases();
    const demoCase = cases.find(c => c.slug === req.params.slug);
    
    if (!demoCase) {
      return res.status(404).json({ error: 'Demo case not found' });
    }
    
    const structuredProfile = intakeService.processIntake(demoCase.payload);
    
    const newPatient = {
      ...structuredProfile
    };
    
    if (!isMongoReady()) {
      return res.status(503).json({ error: 'MongoDB is required but not connected.' });
    }
    
    await Patient.create(newPatient);
    
    res.status(201).json({
      patientId: newPatient.patientId,
      message: "Demo Profile Successfully Created"
    });
  } catch (error) {
    console.error("Demo Seed Error:", error);
    res.status(500).json({ error: "Failed to seed demo case" });
  }
});

module.exports = router;
