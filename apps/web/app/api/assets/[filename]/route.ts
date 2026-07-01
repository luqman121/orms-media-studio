// Ported from backend/src/routes/assets.js — GET /api/assets/:filename
// Serves generated assets from local disk. Phase 4 redirects to a signed R2 URL.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { json } from '@/lib/http';
import { ASSETS_DIR } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(_req: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  // Refuse path traversal.
  const fn = path.basename(filename);
  const abs = path.join(ASSETS_DIR, fn);
  if (!fs.existsSync(abs)) return json({ error: 'الملف غير موجود' }, 404);

  const ext = path.extname(fn).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(abs);
  const webStream = Readable.toWeb(fs.createReadStream(abs)) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
