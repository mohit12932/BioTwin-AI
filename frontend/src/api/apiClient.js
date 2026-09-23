import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor for logging and auth token injection
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to track request duration
    config.metadata = { startTime: new Date() };
    
    // Auth token injection
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('biotwin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log request duration in development
    if (process.env.NODE_ENV !== 'production' && response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection.';
    } else if (error.response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('biotwin_token');
        localStorage.removeItem('biotwin_user');
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/login';
      }
      error.message = 'Authentication required.';
    } else if (error.response.status === 403) {
      error.message = 'Access denied. You do not have the required role.';
    } else if (error.response.status >= 500) {
      error.message = error.response.data?.error || 'Server error. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// Negotiation API Methods
// ============================================

/**
 * Start an asynchronous agent negotiation session
 * @param {string} patientId - The patient ID to negotiate for
 * @param {Object} options - Optional configuration
 * @returns {Promise<{sessionId: string, status: string}>}
 */
export const startNegotiation = async (patientId, options = {}) => {
  const response = await apiClient.post('/negotiate/start', {
    patientId,
    ...options
  });
  return response.data;
};

/**
 * Start a synchronous negotiation (waits for completion)
 * @param {string} patientId - The patient ID
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Full negotiation result
 */
export const startNegotiationSync = async (patientId, options = {}) => {
  const response = await apiClient.post('/negotiate/start-sync', {
    patientId,
    ...options
  }, {
    timeout: 180000 // 3 minute timeout for AI-powered negotiation
  });
  return response.data;
};

/**
 * Inject a human intervention into an active negotiation
 * @param {string} sessionId - The negotiation session ID
 * @param {Object} intervention - The intervention data
 * @returns {Promise<{status: string, message: string}>}
 */
export const injectIntervention = async (sessionId, intervention) => {
  const response = await apiClient.post(`/negotiate/${sessionId}/intervene`, intervention);
  return response.data;
};

/**
 * Get the current state of a negotiation session
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} Session state
 */
export const getNegotiationState = async (sessionId) => {
  const response = await apiClient.get(`/negotiate/${sessionId}`);
  return response.data;
};

/**
 * Get the full telemetry log for a session
 * @param {string} sessionId - The session ID
 * @returns {Promise<Array>} Array of telemetry events
 */
export const getNegotiationTelemetry = async (sessionId) => {
  const response = await apiClient.get(`/negotiate/${sessionId}/telemetry`);
  return response.data;
};

/**
 * Get WebSocket URL for telemetry streaming
 * @returns {string} WebSocket URL
 */
export const getTelemetryWebSocketUrl = () => {
  const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws';
  const host = apiBaseUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
  return `${wsProtocol}://${host}`;
};

/**
 * Upload one or multiple medical documents (images/PDF) for AI parsing
 * @param {File[]} files - Array of document files to upload
 * @returns {Promise<Object>} - Parsed JSON data
 */
export const parseLabReport = async (files) => {
  const formData = new FormData();
  
  if (Array.isArray(files)) {
    files.forEach(file => {
      formData.append('documents', file);
    });
  } else {
    // Fallback for single file
    formData.append('documents', files);
  }

  const response = await apiClient.post('/intake/parse-document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Don't timeout on OCR as it takes longer
    timeout: 30000 
  });
  
  return response.data;
};

export default apiClient;
