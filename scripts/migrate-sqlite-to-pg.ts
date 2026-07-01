// One-time data migration: legacy SQLite (data/app.db) → PostgreSQL (via Prisma).
// Usage:  DATABASE_URL=postgres://... SQLITE_PATH=./data/app.db npm run db:seed-from-sqlite
//
// Idempotent: uses upsert by id and resets the Postgres id sequences afterwards so
// new inserts don't collide with imported rows. Safe to run against an empty DB
// (it just reports 0 rows). Requires `prisma generate` + an applied migration first.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@orms/db';

const SQLITE_PATH = process.env.SQLITE_PATH || process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// SQLite stores 'YYYY-MM-DD HH:MM:SS' in UTC; convert to a JS Date.
function parseDate(s: unknown): Date {
  if (!s || typeof s !== 'string') return new Date();
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? new Date() : d;
}

async function resetSequence(table: string): Promise<void> {
  // pg_get_serial_sequence needs the (lowercased) table name; COALESCE handles empty tables.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT COUNT(*) > 0 FROM "${table}"))`,
  );
}

async function main() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log(`[migrate] no SQLite DB at ${SQLITE_PATH} — nothing to import.`);
    return;
  }
  const db = new DatabaseSync(SQLITE_PATH);
  const users = db.prepare('SELECT * FROM users ORDER BY id').all() as any[];
  const gens = db.prepare('SELECT * FROM generations ORDER BY id').all() as any[];
  let ups: any[] = [];
  try {
    ups = db.prepare('SELECT * FROM uploaded_images ORDER BY id').all() as any[];
  } catch {
    /* table may not exist */
  }
  console.log(`[migrate] source rows — users=${users.length} generations=${gens.length} uploaded_images=${ups.length}`);

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: String(u.email).toLowerCase(), password: u.password, name: u.name ?? null, createdAt: parseDate(u.created_at) },
    });
  }

  for (const g of gens) {
    await prisma.generation.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        userId: g.user_id,
        type: g.type,
        modelId: g.model_id,
        modelName: g.model_name ?? null,
        prompt: g.prompt ?? null,
        paramsJson: g.params_json ?? null,
        status: g.status,
        jobId: g.job_id ?? null,
        pollingUrl: g.polling_url ?? null,
        assetPath: g.asset_path ?? null,
        assetMediaType: g.asset_media_type ?? null,
        thumbnailPath: g.thumbnail_path ?? null,
        cost: g.cost ?? null,
        error: g.error ?? null,
        durationMs: g.duration_ms ?? null,
        createdAt: parseDate(g.created_at),
        updatedAt: parseDate(g.updated_at),
      },
    });
  }

  for (const up of ups) {
    await prisma.uploadedImage.upsert({
      where: { id: up.id },
      update: {},
      create: {
        id: up.id,
        userId: up.user_id,
        filename: up.filename,
        originalName: up.original_name ?? null,
        mimeType: up.mime_type ?? null,
        size: up.size ?? null,
        createdAt: parseDate(up.created_at),
      },
    });
  }

  await resetSequence('users');
  await resetSequence('generations');
  await resetSequence('uploaded_images');

  db.close();
  console.log('[migrate] done.');
}

main()
  .catch((e) => {
    console.error('[migrate] failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
