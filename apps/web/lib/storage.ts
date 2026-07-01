// Filesystem storage paths — ported from backend/src/routes/generate.js + database.js.
// Phase 4 replaces local disk with Cloudflare R2 (object storage + signed URLs).
import path from 'node:path';
import fs from 'node:fs';

const DATA_ROOT = process.env.DATA_DIR || path.join(process.cwd(), 'data');

export const DB_PATH = process.env.DB_PATH || path.join(DATA_ROOT, 'app.db');
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(DATA_ROOT, 'uploads');
export const ASSETS_DIR = process.env.ASSETS_DIR || path.join(DATA_ROOT, 'assets');

// Max reference-image upload size (mirrors the old multer 50MB cap).
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function ensureStorageDirs(): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
