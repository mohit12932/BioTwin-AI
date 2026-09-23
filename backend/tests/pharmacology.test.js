process.env.JWT_SECRET = 'test_secret_key';
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const pharmacologyRoutes = require('../routes/pharmacology.routes');
const { authMiddleware } = require('../middleware/auth.middleware');
const Patient = require('../models/Patient');

const app = express();
app.use(express.json());
app.use('/api/pharmacology', authMiddleware, pharmacologyRoutes);

const generateToken = (role, patientId = null) => {
  const payload = { user: { id: 'test_user_id', role } };
  if (patientId) payload.user.id = patientId;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Pharmacology API', () => {
  let doctorToken;

  beforeEach(async () => {
    doctorToken = generateToken('doctor');
    
    // Create test patient
    await Patient.create({
      patientId: 'P-PHARMA-1',
      name: 'Pharma Test',
      medications: [],
      allergies: []
    });
  });

  describe('POST /api/pharmacology/:patientId/add-medication', () => {
    it('should add a medication using optimistic locking pattern', async () => {
      const res = await request(app)
        .post('/api/pharmacology/P-PHARMA-1/add-medication')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          medication: {
            name: 'Aspirin',
            dosage: '81mg',
            frequency: 'Daily',
            route: 'Oral'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const dbPatient = await Patient.findOne({ patientId: 'P-PHARMA-1' });
      expect(dbPatient.medications.length).toBe(1);
      expect(dbPatient.medications[0].name).toBe('Aspirin');
    });
  });

  describe('POST /api/pharmacology/:patientId/add-allergy', () => {
    it('should add an allergy using optimistic locking pattern', async () => {
      const res = await request(app)
        .post('/api/pharmacology/P-PHARMA-1/add-allergy')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          allergy: {
            allergen: 'Penicillin',
            reaction: 'Hives',
            severity: 'Severe'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const dbPatient = await Patient.findOne({ patientId: 'P-PHARMA-1' });
      expect(dbPatient.allergies.length).toBe(1);
      expect(dbPatient.allergies[0].allergen).toBe('Penicillin');
    });
  });
});
