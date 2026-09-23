const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Create HTTP server for WebSocket support
const httpServer = http.createServer(app);

// Database connection status (will be set after async connection)
let dbConnected = false;

// Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

// ==========================================
// Simple Logger Utility
// ==========================================
const logger = {
  info: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
    }
  },
  warn: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
    }
  },
  error: (message, meta = {}) => {
    console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
  }
};

// Export logger for use in other modules
module.exports.logger = logger;

// ==========================================
// LAYER 5: Security & Performance Middleware
// ==========================================
app.use(helmet()); 
app.use(compression()); 

// Use morgan only in development, skip in production for structured logs
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan(':date[iso] | :method :url | Status: :status | RespTime: :response-time ms'));
}

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Please wait before making more requests." },
  skip: (req) => req.path === '/api/health' // Skip health checks
});
app.use('/api', apiLimiter);

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' 
      ? [
          'https://biotwin-azure.com', 
          'https://hospital-intranet.gov',
          // Vercel deployments
          'https://biotwin.vercel.app',
          'https://biotwin-ai.vercel.app',
          'https://bio-twin.vercel.app',
          'https://bio-twin-ai.vercel.app'
        ] 
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']);

// Dynamic CORS check for Vercel preview deployments
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check static allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Dynamic bypasses removed for security
    
    // In development, allow all
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'production') {
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: Date.now() - start
      });
    }
  });
  next();
});

// Routes
const authRoutes = require('./routes/auth.routes');
const authMiddleware = require('./middleware/auth.middleware').authMiddleware;
const auditMiddleware = require('./middleware/audit.middleware');
const patientRoutes = require('./routes/patient.routes');
const negotiationRoutes = require('./routes/negotiation.routes');
const intakeRoutes = require('./routes/intake.routes');

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/intake', intakeRoutes);

// Health check endpoint (public - no auth required)
app.get('/api/health', (req, res) => {
  const telemetryServer = require('./websocket/telemetryServer');
  const { isMongoReady } = require('./config/mongo');
  res.json({ 
    status: "healthy",
    service: "BioTwin AI API",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: isMongoReady() ? 'MongoDB Atlas' : 'Disconnected',
    features: {
      agentNegotiation: true,
      websocketTelemetry: true,
      humanInTheLoop: true
    },
    websocket: {
      path: '/ws/telemetry',
      connectedClients: telemetryServer.getClientCount()
    }
  });
});

// Protect all following routes with authentication
app.use('/api', authMiddleware);
app.use('/api', auditMiddleware);

app.use('/api/patient', patientRoutes);
app.use('/api/negotiate', negotiationRoutes); // Multi-round agent negotiation protocol

// ==========================================
// Global Error Handling Middleware
// ==========================================

// Handle 404 - Route not found
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  // Log error details
  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Send error response
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

// Start Server with proper async initialization
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Await database connection before starting the server
    dbConnected = await connectDB();
    logger.info('Database initialization complete', { connected: dbConnected });
  } catch (err) {
    logger.warn('Database connection failed, continuing with in-memory store', { error: err.message });
  }
  
  // Initialize WebSocket server for real-time telemetry
  const telemetryServer = require('./websocket/telemetryServer');
  telemetryServer.initializeWebSocket(httpServer);
  logger.info('WebSocket telemetry server initialized', { path: '/ws/telemetry' });
  
  httpServer.listen(PORT, () => {
    logger.info(`BioTwin API Server started`, { 
      port: PORT, 
      env: process.env.NODE_ENV || 'development',
      database: dbConnected ? 'MongoDB' : 'Disconnected',
      features: ['Agent Negotiation', 'WebSocket Telemetry', 'HITL Interventions']
    });
  });
  
  return httpServer;
};

// Initialize server
const serverPromise = startServer();

module.exports = { app, serverPromise };
