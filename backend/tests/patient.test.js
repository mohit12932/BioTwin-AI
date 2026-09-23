process.env.JWT_SECRET = 'test_secret_key';
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const patientRoutes = require('../routes/patient.routes');
const { authMiddleware } = require('../middleware/auth.middleware');
const Patient = require('../models/Patient');

const app = express();
app.use(express.json());

// Dummy implementation of auth for routes
app.use('/api/patient', authMiddleware, patientRoutes);

const generateToken = (role, patientId = null) => {
  const payload = { user: { id: 'test_user_id', role } };
  if (patientId) payload.user.id = patientId; // Because auth middleware checks req.user.id
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Patient API', () => {
  let doctorToken;
  let patientToken;
  let otherPatientToken;

  beforeAll(() => {
    doctorToken = generateToken('doctor');
    patientToken = generateToken('patient', 'P123');
    otherPatientToken = generateToken('patient', 'P999');
  });

  describe('POST /api/patient/', () => {
    it('should allow doctor to create a patient', async () => {
      const res = await request(app)
        .post('/api/patient/')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'John Doe', age: 45 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('patientId');
      expect(res.body.name).toBe('John Doe');
      
      const dbPatient = await Patient.findOne({ patientId: res.body.patientId });
      expect(dbPatient).toBeTruthy();
      expect(dbPatient.name).toBe('John Doe');
    });

    it('should deny patient to create a patient', async () => {
      const res = await request(app)
        .post('/api/patient/')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ name: 'John Doe', age: 45 });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/patient/:id', () => {
    beforeEach(async () => {
      await Patient.create({
        patientId: 'P123',
        name: 'Patient User',
        age: 30
      });
    });

    it('should allow patient to access their own record', async () => {
      const res = await request(app)
        .get('/api/patient/P123')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Patient User');
    });

    it('should deny patient to access another record', async () => {
      const res = await request(app)
        .get('/api/patient/P123')
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow doctor to access any record', async () => {
      const res = await request(app)
        .get('/api/patient/P123')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Patient User');
    });
  });
});
