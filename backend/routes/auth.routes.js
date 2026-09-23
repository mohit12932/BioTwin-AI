const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { isMongoReady } = require('../config/mongo');

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  JWT_SECRET = 'fallback_secret_for_demo_purposes_only';
}
const JWT_EXPIRES_IN = '24h';

// ── Demo account details for seeding ──────────────────────────────────────────
const DEMO_EMAIL    = 'doctor@biotwin.ai';
const DEMO_PASSWORD = 'password123';

const signToken = (payload) =>
  new Promise((resolve, reject) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }, (err, token) =>
      err ? reject(err) : resolve(token)
    )
  );

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Real DB lookup
    if (!isMongoReady()) {
      return res.status(503).json({ error: 'MongoDB is required for authentication' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = await signToken({ user: { id: user.id, role: user.role, name: user.name } });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Creates/upserts the real doctor document in MongoDB.
router.post('/seed', async (req, res) => {
  try {
    if (!isMongoReady()) {
      return res.status(503).json({
        error: 'MongoDB is required to seed the database.',
      });
    }

    // Upsert — avoids duplicate-key error if called twice.
    // Must hash password manually since pre('save') hook doesn't fire on findOneAndUpdate.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    await User.findOneAndUpdate(
      { email: DEMO_EMAIL },
      {
        $setOnInsert: {
          name: 'Dr. Gregory House',
          email: DEMO_EMAIL,
          password: hashedPassword,
          role: 'doctor'
        }
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      message: 'Demo doctor account is ready.',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD
    });

  } catch (err) {
    console.error('Seed error:', err.message);
    return res.status(500).json({ error: 'Failed to seed database' });
  }
});

module.exports = router;
