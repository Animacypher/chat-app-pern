const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/users/search?query=  (protected) ────────────────────────────────
// Search for users by username (case-insensitive, partial match).
// Excludes the currently authenticated user from results.
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.query(
      `SELECT id, username, gender
       FROM users
       WHERE username ILIKE $1
         AND id != $2
       ORDER BY username ASC
       LIMIT 20`,
      [`%${query.trim()}%`, req.user.id]
    );

    return res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('Search users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/users/me  (protected) ───────────────────────────────────────
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
