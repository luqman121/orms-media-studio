// Ported from backend/src/routes/generate.js — GET /api/generate/generations
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { serializeGenerationWithSignedUrls } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '') || 50, 200);
    const offset = parseInt(url.searchParams.get('offset') || '') || 0;
    const type = url.searchParams.get('type');

    const rows = await prisma.generation.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const data = await Promise.all(rows.map(serializeGenerationWithSignedUrls));
    return json({ data, limit, offset });
  } catch (e) {
    return handleError(e);
  }
}
