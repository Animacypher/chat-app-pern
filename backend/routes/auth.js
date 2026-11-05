const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Issues a JWT and sets it as an httpOnly cookie on the response.
 */
const issueToken = (res, user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    gender: user.gender,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set to true in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};

/**
 * Robust emoji detection regex — mirrors the frontend regex.
 * Uses the 'u' flag for full Unicode support.
 */
const EMOJI_REGEX =
  /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{FE0F}]/u;

/**
 * Returns true if the value contains any whitespace character.
 */
const containsSpace = (val) => /\s/.test(val);

/**
 * Returns true if the value contains any emoji character.
 */
const containsEmoji = (val) => EMOJI_REGEX.test(val);

/**
 * Validates registration fields.
 * Returns an array of error strings (empty if valid).
 */
const validateRegistration = ({ username, email, password, gender }) => {
  const errors = [];

  if (!username || username.trim() === '') {
    errors.push('Username is required');
  } else {
    if (containsSpace(username)) errors.push('Username must not contain spaces');
    if (containsEmoji(username)) errors.push('Username must not contain emojis');
    if (username.trim().length > 30) errors.push('Username must be 30 characters or fewer');
  }

  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else {
    if (containsSpace(email)) errors.push('Email must not contain spaces');
    if (containsEmoji(email)) errors.push('Email must not contain emojis');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email must be a valid email address');
    }
  }

  if (!password) {
    errors.push('Password is required');
  } else {
    if (containsSpace(password)) errors.push('Password must not contain spaces');
    if (containsEmoji(password)) errors.push('Password must not contain emojis');
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      errors.push('Password must contain both uppercase and lowercase letters');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  // Gender must be exactly 'M' or 'F'
  if (!gender || !['M', 'F'].includes(gender)) {
    errors.push("Gender must be either 'M' or 'F'");
  }

  return errors;
};

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, gender } = req.body;

    // Validate inputs
    const errors = validateRegistration({ username, email, password, gender });
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Store clean username — strip any '@' the user may have typed; '@' is display-only on the frontend
    const formattedUsername = username.trim().replace(/^@+/, '');
    const normalizedEmail = email.trim().toLowerCase();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into DB
    const result = await pool.query(
      `INSERT INTO users (username, email, password, gender)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, gender`,
      [formattedUsername, normalizedEmail, hashedPassword, gender]
    );

    const newUser = result.rows[0];

    // Issue JWT cookie
    issueToken(res, newUser);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        gender: newUser.gender,
      },
    });
  } catch (err) {
    // Handle unique constraint violations
    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('email')) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      if (err.constraint && err.constraint.includes('username')) {
        return res.status(409).json({ error: 'This username is already taken' });
      }
      return res.status(409).json({ error: 'Duplicate entry: email or username already in use' });
    }
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error', detail: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 400 — missing or empty payload fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 400 — guard: reject payloads with spaces or emojis (secondary layer of defense)
    if (containsSpace(email) || containsEmoji(email)) {
      return res.status(400).json({ message: 'Email must not contain spaces or emojis' });
    }
    if (containsSpace(password) || containsEmoji(password)) {
      return res.status(400).json({ message: 'Password must not contain spaces or emojis' });
    }

    // Look up user strictly by email
    let result;
    try {
      result = await pool.query(
        'SELECT id, username, email, password, gender FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
      );
    } catch (dbErr) {
      console.error('Login DB error:', dbErr);
      return res.status(500).json({
        message: 'Database connection failed',
        detail: dbErr.message,
      });
    }

    const user = result.rows[0] || null;

    // 401 — no matching account
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    // 401 — wrong password
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Issue JWT cookie
    issueToken(res, user);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        gender: user.gender,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      message: 'Internal server error',
      detail: err.message,
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  });
  return res.status(200).json({ message: 'Logged out successfully' });
});

// GET /api/auth/token  (protected)
// Returns the raw JWT value so the Socket.IO client can pass it in auth headers.
router.get('/token', authMiddleware, (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  return res.status(200).json({ token });
});

// GET /api/auth/me  (protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let result;
    try {
      result = await pool.query(
        'SELECT id, username, email, gender, created_at FROM users WHERE id = $1',
        [req.user.id]
      );
    } catch (dbErr) {
      console.error('Get me DB error:', dbErr);
      return res.status(500).json({
        message: 'Database connection failed',
        detail: dbErr.message,
      });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({
      message: 'Internal server error',
      detail: err.message,
    });
  }
});

module.exports = router;
