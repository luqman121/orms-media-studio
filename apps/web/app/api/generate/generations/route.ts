// Ported from backend/src/routes/generate.js — GET /api/generate/generations
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { serializeGenerationWithSignedUrls } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function positiveInteger(raw: string | null, fallback: number, code: string): number {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new LocalizedError({ code, status: 400 });
  }
  return value;
}

function nonNegativeInteger(raw: string | null, fallback: number, code: string): number {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new LocalizedError({ code, status: 400 });
  }
  return value;
}

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const limit = Math.min(
      positiveInteger(url.searchParams.get('limit'), 50, 'pagination.limitInvalid'),
      200,
    );
    const offset = nonNegativeInteger(url.searchParams.get('offset'), 0, 'pagination.offsetInvalid');
    const type = url.searchParams.get('type');
    if (type != null && type !== 'image' && type !== 'video') {
      throw new LocalizedError({ code: 'generate.typeInvalid', status: 400 });
    }

    const rawProjectId = url.searchParams.get('projectId');
    let projectId: number | undefined;
    if (rawProjectId != null) {
      projectId = positiveInteger(rawProjectId, 0, 'generate.projectInvalid');
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId, archived: false },
        select: { id: true },
      });
      if (!project) throw new LocalizedError({ code: 'projects.notFound', status: 404 });
    }

    const where = { userId, ...(type ? { type } : {}), ...(projectId != null ? { projectId } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.generation.count({ where }),
    ]);
    const data = await Promise.all(rows.map((row) => serializeGenerationWithSignedUrls(row)));
    return json({
      data,
      limit,
      offset,
      total,
      total_pages: Math.ceil(total / limit),
      has_more: offset + data.length < total,
    });
  } catch (e) {
    return handleError(e);
  }
}
