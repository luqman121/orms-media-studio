// SQLite database — singleton init with WAL + FK + schema migrations.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/app.db');

let dbSingleton = null;

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDB() {
  if (dbSingleton) return dbSingleton;
  ensureDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  dbSingleton = db;
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,            -- 'image' | 'video'
  model_id TEXT NOT NULL,
  model_name TEXT,
  prompt TEXT,
  params_json TEXT,             -- arbitrary params object
  status TEXT NOT NULL,         -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'streaming'
  job_id TEXT,                  -- OpenRouter job_id for async (video)
  polling_url TEXT,
  asset_path TEXT,              -- local file path relative to /uploads
  asset_media_type TEXT,        -- 'image/png' etc
  thumbnail_path TEXT,          -- for videos (optional)
  cost TEXT,                    -- numeric string USD
  error TEXT,
  duration_ms INTEGER,          -- generation wall time
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS uploaded_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_cache (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
  `);
}

module.exports = { getDB, DB_PATH };