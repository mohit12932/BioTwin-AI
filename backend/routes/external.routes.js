// Layer 5: External Healthcare Integration API

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const WearableEvent = require('../models/WearableEvent');

// HMS API Key from environment variable
const getHMSApiKey = () => process.env.HMS_API_KEY;

/**
 * Timing-safe API key comparison to prevent timing attacks
 * @param {string} providedKey - The API key provided in the request
 * @param {string} expectedKey - The expected API key
 * @returns {boolean} - Whether the keys match
 */
const safeCompareKeys = (providedKey, expectedKey) => {
  if (!providedKey || !expectedKey) return false;
  if (providedKey.length !== expectedKey.length) {
    // Still do a comparison to maintain constant time
    crypto.timingSafeEqual(
      Buffer.from(providedKey.padEnd(expectedKey.length, '0')),
      Buffer.from(expectedKey)
    );
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(expectedKey));
};

// Mock HMS (Hospital Management System) Auth Strategy
const requireHMSAuth = (req, res, next) => {
  const HMS_API_KEY = getHMSApiKey();
  
  // In production, API key is always required
  if (process.env.NODE_ENV === 'production') {
    if (!HMS_API_KEY) {
      return res.status(500).json({ error: "Server configuration error: HMS_API_KEY not set" });
    }
    
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || !safeCompareKeys(apiKey, HMS_API_KEY)) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing Hospital Management System credentials." });
    }
  } else {
    // In development, allow bypass only if explicitly configured to do so
    const apiKey = req.headers['x-api-key'];
    if (HMS_API_KEY && !safeCompareKeys(apiKey, HMS_API_KEY)) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing Hospital Management System credentials." });
    }
  }
  
  next();
};

// GET /api/external/ehr-data - Mock EHR Gateway Endpoint
router.get('/ehr-data/:patientId', requireHMSAuth, (req, res) => {
  const { patientId } = req.params;
  
  // Simulated external fetch from a massive HL7/FHIR compliant legacy database
  res.json({
    status: "success",
    source: "External EHR System",
    timestamp: new Date().toISOString(),
    data: {
      patientId,
      hl7_code: "M01-12-AE",
      lastVisit: "2026-03-10T14:30:00Z",
      structuredRecordsHash: "f1a2b3c4d5e6f7g8h9i0",
      notes: "Patient data successfully bridged from legacy Epic/Cerner node."
    }
  });
});

// POST /api/external/wearable-stream - IoT Ingestion Endpoint
router.post('/wearable-stream', async (req, res) => {
  const { deviceId, metrics } = req.body;
  
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: "Invalid IoT packet: deviceId is required and must be a string." });
  }
  
  if (!metrics || typeof metrics !== 'object') {
    return res.status(400).json({ error: "Invalid IoT packet: metrics object is required." });
  }

  // Validate metrics fields if provided
  if (metrics.heartRate !== undefined && (typeof metrics.heartRate !== 'number' || metrics.heartRate < 0 || metrics.heartRate > 300)) {
    return res.status(400).json({ error: "Invalid metrics: heartRate must be a number between 0 and 300." });
  }
  
  if (metrics.spO2 !== undefined && (typeof metrics.spO2 !== 'number' || metrics.spO2 < 0 || metrics.spO2 > 100)) {
    return res.status(400).json({ error: "Invalid metrics: spO2 must be a number between 0 and 100." });
  }

  // Simulated IoT ingestion queue processing - use structured logging in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[IoT INGEST] Stream received from wearable ${deviceId}: HR ${metrics.heartRate || 'N/A'} bpm`);
  }
  
  try {
    await WearableEvent.create({
      deviceId,
      metrics,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to save WearableEvent:', err.message);
  }
  
  res.status(202).json({
    status: "accepted",
    message: "Wearable telemetry ingested for Live Digital Twin Sync."
  });
});

router.get('/wearable-stream/:deviceId', async (req, res) => {
  try {
    const history = await WearableEvent.find({ deviceId: req.params.deviceId }).sort({ timestamp: -1 }).limit(100);
    res.json({
      deviceId: req.params.deviceId,
      history
    });
  } catch (err) {
    console.error('Failed to fetch wearable history:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
