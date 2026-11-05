-- NOTE: PostgreSQL does not support CREATE DATABASE IF NOT EXISTS.
-- Create the database manually before running this script:
--   psql -U postgres -c "CREATE DATABASE chat_app_db;"
-- Then connect to it and run this file:
--   psql -U postgres -d chat_app_db -f db/init.sql

-- Drop existing tables (cascade removes FK-dependent objects)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,   -- max 30 characters
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  gender VARCHAR(1) NOT NULL,             -- 'M' or 'F'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Private messages between users
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast conversation lookups
CREATE INDEX idx_messages_sender_receiver
  ON messages (sender_id, receiver_id);

-- Reset primary-key sequences to 1 for a clean slate
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
