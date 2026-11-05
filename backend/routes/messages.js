const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/messages/:userId ─────────────────────────────────────────────────
// Fetch full conversation history between the logged-in user and another user.
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, content, created_at
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [myId, userId]
    );

    return res.status(200).json({ messages: result.rows });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/messages ─────────────────────────────────────────────────────────
// Fetch the list of recent conversations (distinct users the current user has
// chatted with), including the latest message preview.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;

    const result = await pool.query(
      `SELECT DISTINCT ON (other_id)
         other_id,
         u.username,
         u.gender,
         last_msg.content   AS last_message,
         last_msg.created_at AS last_message_at
       FROM (
         SELECT
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_id,
           content,
           created_at
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
       ) AS last_msg
       JOIN users u ON u.id = last_msg.other_id
       ORDER BY other_id, last_msg.created_at DESC`,
      [myId]
    );

    // Re-sort so the most recent conversation appears first
    const sorted = result.rows.sort(
      (a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)
    );

    return res.status(200).json({ conversations: sorted });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
