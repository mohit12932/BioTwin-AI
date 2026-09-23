/**
 * Input validation utilities for API routes
 * Provides sanitization and validation without external dependencies
 */

/**
 * Sanitize a string to prevent XSS and injection attacks
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/&/g, '&amp;')  // Replace & first to avoid double-encoding
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .trim();
};

/**
 * Validate patient ID format
 * @param {string} patientId - Patient ID to validate
 * @returns {{ valid: boolean, error?: string }}
 */
const validatePatientId = (patientId) => {
  if (!patientId) {
    return { valid: false, error: 'Patient ID is required' };
  }
  if (typeof patientId !== 'string') {
    return { valid: false, error: 'Patient ID must be a string' };
  }
  // Allow alphanumeric, dashes, and underscores, 2-50 characters
  const idPattern = /^[a-zA-Z0-9_-]{2,50}$/;
  if (!idPattern.test(patientId)) {
    return { valid: false, error: 'Patient ID must be 2-50 alphanumeric characters (dashes and underscores allowed)' };
  }
  return { valid: true };
};

/**
 * Validate treatment plan object
 * @param {object} treatmentPlan - Treatment plan to validate
 * @returns {{ valid: boolean, error?: string, sanitized?: object }}
 */
const validateTreatmentPlan = (treatmentPlan) => {
  if (!treatmentPlan || typeof treatmentPlan !== 'object') {
    return { valid: false, error: 'Treatment plan is required and must be an object' };
  }

  const allowedTypes = ['Conservative', 'Standard', 'Aggressive'];
  const allowedDosages = ['Low', 'Medium', 'High'];

  const type = treatmentPlan.type;
  const dosage = treatmentPlan.dosage;
  const duration = treatmentPlan.duration;

  if (type && !allowedTypes.includes(type)) {
    return { valid: false, error: `Treatment type must be one of: ${allowedTypes.join(', ')}` };
  }

  if (dosage && !allowedDosages.includes(dosage)) {
    return { valid: false, error: `Dosage must be one of: ${allowedDosages.join(', ')}` };
  }

  if (duration !== undefined) {
    const numDuration = Number(duration);
    if (isNaN(numDuration) || numDuration < 1 || numDuration > 365) {
      return { valid: false, error: 'Duration must be a number between 1 and 365 days' };
    }
  }

  return {
    valid: true,
    sanitized: {
      type: type || 'Standard',
      dosage: dosage || 'Medium',
      duration: Number(duration) || 30
    }
  };
};

/**
 * Validate vitals object
 * @param {object} vitals - Vitals to validate
 * @returns {{ valid: boolean, error?: string, sanitized?: object }}
 */
const validateVitals = (vitals) => {
  if (!vitals || typeof vitals !== 'object') {
    return { valid: true, sanitized: {} }; // Vitals are optional
  }

  const sanitized = {};
  const ranges = {
    heartRate: { min: 30, max: 250 },
    bpSystolic: { min: 60, max: 250 },
    bpDiastolic: { min: 30, max: 150 },
    sugar: { min: 20, max: 600 },
    spO2: { min: 50, max: 100 },
    temperature: { min: 30, max: 115 } // Allow both Celsius and Fahrenheit
  };

  for (const [key, range] of Object.entries(ranges)) {
    const val = vitals[key];
    if (val === undefined || val === null || val === '' || val === 0 || val === '0') continue;
    
    const value = Number(val);
      if (isNaN(value)) {
        return { valid: false, error: `${key} must be a number` };
      }
      if (value < range.min || value > range.max) {
        return { valid: false, error: `${key} must be between ${range.min} and ${range.max}` };
      }
      sanitized[key] = value;
  }

  return { valid: true, sanitized };
};

/**
 * Validate lifestyle object
 * @param {object} lifestyle - Lifestyle to validate
 * @returns {{ valid: boolean, error?: string, sanitized?: object }}
 */
const validateLifestyle = (lifestyle) => {
  if (!lifestyle || typeof lifestyle !== 'object') {
    return { valid: true, sanitized: {} }; // Lifestyle is optional
  }

  const allowedSmoking = ['Yes', 'No', 'Past', 'Unknown', ''];
  const allowedExercise = ['None', 'Rarely', 'Moderate', 'Active', 'Unknown', ''];
  const allowedAlcohol = ['Yes', 'No', 'Occasional', 'Occasionally', 'Rarely', 'Frequently', 'Unknown', ''];

  const sanitized = {};

  if (lifestyle.smoking !== undefined && lifestyle.smoking !== null) {
    if (!allowedSmoking.includes(lifestyle.smoking)) {
      return { valid: false, error: `smoking must be one of: ${allowedSmoking.join(', ')}` };
    }
    sanitized.smoking = lifestyle.smoking;
  }

  if (lifestyle.exercise !== undefined && lifestyle.exercise !== null) {
    if (!allowedExercise.includes(lifestyle.exercise)) {
      return { valid: false, error: `exercise must be one of: ${allowedExercise.join(', ')}` };
    }
    sanitized.exercise = lifestyle.exercise;
  }

  if (lifestyle.alcohol !== undefined && lifestyle.alcohol !== null) {
    if (!allowedAlcohol.includes(lifestyle.alcohol)) {
      return { valid: false, error: `alcohol must be one of: ${allowedAlcohol.join(', ')}` };
    }
    sanitized.alcohol = lifestyle.alcohol;
  }

  return { valid: true, sanitized };
};

/**
 * Validate patient intake data
 * @param {object} data - Patient intake data
 * @returns {{ valid: boolean, error?: string }}
 */
const validatePatientIntake = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Patient data is required' };
  }

  // Name validation
  if (data.name) {
    if (typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 100) {
      return { valid: false, error: 'Name must be a string between 1-100 characters' };
    }
  }

  // Age validation
  if (data.age !== undefined) {
    const age = Number(data.age);
    if (isNaN(age) || age < 0 || age > 150) {
      return { valid: false, error: 'Age must be a number between 0 and 150' };
    }
  }

  // Vitals validation
  if (data.vitals) {
    const vitalsResult = validateVitals(data.vitals);
    if (!vitalsResult.valid) {
      return vitalsResult;
    }
  }

  // Lifestyle validation
  if (data.lifestyle) {
    const lifestyleResult = validateLifestyle(data.lifestyle);
    if (!lifestyleResult.valid) {
      return lifestyleResult;
    }
  }

  return { valid: true };
};

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {{ valid: boolean, error?: string }}
 */
const validateApiKey = (apiKey) => {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  if (typeof apiKey !== 'string') {
    return { valid: false, error: 'API key must be a string' };
  }
  // API keys should be at least 16 characters
  if (apiKey.length < 16 || apiKey.length > 256) {
    return { valid: false, error: 'Invalid API key format' };
  }
  return { valid: true };
};

/**
 * Express middleware to validate request body against a schema
 * @param {function} validator - Validation function
 * @returns {function} Express middleware
 */
const validateBody = (validator) => {
  return (req, res, next) => {
    const result = validator(req.body);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }
    if (result.sanitized) {
      req.sanitizedBody = result.sanitized;
    }
    next();
  };
};

module.exports = {
  sanitizeString,
  validatePatientId,
  validateTreatmentPlan,
  validateVitals,
  validateLifestyle,
  validatePatientIntake,
  validateApiKey,
  validateBody
};
