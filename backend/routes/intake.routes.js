const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseMedicalDocument } = require('../services/ai/openaiClient');

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
    const filesData = req.files.map(file => ({
      buffer: file.buffer,
      mimeType: file.mimetype
    }));
    
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

module.exports = router;
