// SQLite database — singleton using Node's built-in `node:sqlite` (DatabaseSync).
// Ported from backend/src/db/database.js (was better-sqlite3). Same on-disk format,
// same synchronous prepare/run/get/all API — no native addon to compile.
// Phase 3 replaces this with PostgreSQL via Prisma (@orms/db).
import { DatabaseSync } from 'node:sqlite';
import { DB_PATH, ensureStorageDirs } from './storage';

type DB = DatabaseSync;

// Reuse a single connection across Next.js dev hot-reloads.
const globalForDb = globalThis as unknown as { __ormsDb?: DB };

export function getDB(): DB {
  if (globalForDb.__ormsDb) return globalForDb.__ormsDb;
  ensureStorageDirs();
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  globalForDb.__ormsDb = db;
  return db;
}

function migrate(db: DB): void {
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
  asset_path TEXT,              -- comma-separated local filenames
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
