const AuditLog = require('../models/AuditLog');
const { isMongoReady } = require('../config/mongo');

const auditMiddleware = (req, res, next) => {
  res.on('finish', async () => {
    try {
      if (!isMongoReady() || !req.user) return;
      
      const resourceId = req.params.id || req.body.patientId || 'N/A';
      
      const log = new AuditLog({
        user: req.user.id || req.user.email || 'unknown',
        role: req.user.role || 'unknown',
        action: `${req.method} ${req.originalUrl}`,
        resourceId: resourceId,
        details: {
          status: res.statusCode
        }
      });
      
      await log.save();
    } catch (err) {
      console.error('Audit Log failed:', err.message);
    }
  });
  
  next();
};

module.exports = auditMiddleware;
