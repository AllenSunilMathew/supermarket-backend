const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { OAuth2Client } = require('google-auth-library');

// Helper to sign JWTs
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supermarket_jwt_secret_key_9988', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already registered with this email' });
    }

    // Hash user's password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in the database
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      return res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data received' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate user and log in
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    // Find user by email — case-insensitive search so "Admin@..." and "admin@..." both work
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });

    if (user && !user.password && user.googleId) {
      return res.status(400).json({ message: 'This account was created via Google. Please sign in with Google' });
    }

    let isMatch = false;
    if (user && user.password) {
      try {
        // Try bcrypt compare first (for hashed passwords)
        isMatch = await bcrypt.compare(password, user.password);
      } catch (err) {
        isMatch = false;
      }
      // Fallback: plain-text comparison for manually added MongoDB users
      if (!isMatch) {
        isMatch = (password === user.password);
      }
    }

    if (user && isMatch) {
      // Normalize role to lowercase so frontend admin checks always work
      const normalizedRole = (user.role || 'customer').toLowerCase();
      return res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        token: generateToken(user.id),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate or register via Google Login
// @route   POST /api/auth/google
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { token, isMock, mockData } = req.body;

    let email, name, googleId;

    // Check if we are running in mock authentication mode (fallback for local development)
    if (isMock || !process.env.GOOGLE_CLIENT_ID) {
      if (!mockData || !mockData.email) {
        return res.status(400).json({ message: 'Invalid Google login payload' });
      }
      email = mockData.email;
      name = mockData.name || 'Google Customer';
      googleId = mockData.googleId || `g_${Date.now()}`;
    } else {
      // Validate Google Access ID token
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      googleId = payload.sub;
    }

    // Check if email already registered
    let user = await User.findOne({ email });

    if (user) {
      // Link Google authentication ID if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create user profile for new Google customer
      user = await User.create({
        name,
        email,
        googleId,
        role: 'customer',
      });
    }

    return res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error(`Google Auth Route Error: ${error.message}`);
    return res.status(500).json({ message: 'Google authentication failed' });
  }
});

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    return res.json(req.user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
