require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const messagesRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// ─── REST Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// ─── Global error handler ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Socket.IO Setup ─────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    // Accept connections from both the Vite dev server origin and the backend
    // origin itself (production). The browser sends Origin: http://localhost:5173
    // even when the socket connects directly to :5000.
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5000'],
    credentials: true,
  },
});

/**
 * Socket authentication middleware.
 * Reads JWT from the handshake `auth.token` field (sent by the client).
 */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      id: decoded.id,
      username: decoded.username,
      gender: decoded.gender,
    };
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid or expired token'));
  }
});

/**
 * Derives a deterministic room name for a private 1-on-1 conversation.
 * IDs are cast to numbers and sorted numerically (not lexicographically)
 * so the room name is identical regardless of which user initiates.
 */
const privateRoom = (id1, id2) => {
  const sorted = [Number(id1), Number(id2)].sort((a, b) => a - b);
  return `pm:${sorted[0]}:${sorted[1]}`;
};

io.on('connection', (socket) => {
  const { id: userId, username } = socket.user;
  console.log(`[Socket] Connected: ${username} (${userId})`);

  // ── Join a private conversation room ───────────────────────────────────────
  socket.on('join_conversation', ({ otherUserId }) => {
    const room = privateRoom(Number(userId), Number(otherUserId));
    socket.join(room);
    console.log(`[Socket] ${username} joined room: ${room}`);
  });

  // ── Leave a room ───────────────────────────────────────────────────────────
  socket.on('leave_conversation', ({ otherUserId }) => {
    const room = privateRoom(Number(userId), Number(otherUserId));
    socket.leave(room);
    console.log(`[Socket] ${username} left room: ${room}`);
  });

  // ── Send a private message ─────────────────────────────────────────────────
  socket.on('send_message', async ({ receiverId, content }) => {
    if (!receiverId || !content || !content.trim()) return;

    // Coerce IDs to integers — the client may send them as strings
    const senderId   = Number(userId);
    const rcvrId     = Number(receiverId);

    if (!senderId || !rcvrId || isNaN(senderId) || isNaN(rcvrId)) {
      return socket.emit('error', { message: 'Invalid sender or receiver ID' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, sender_id, receiver_id, content, created_at`,
        [senderId, rcvrId, content.trim()]
      );

      const message = result.rows[0];
      const room = privateRoom(senderId, rcvrId);

      console.log(`[Socket] Message saved — room: ${room} | id: ${message.id}`);

      // Broadcast to everyone in the room (sender + receiver tabs)
      io.to(room).emit('receive_message', message);
    } catch (err) {
      console.error('[Socket] send_message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${username} (${userId})`);
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
