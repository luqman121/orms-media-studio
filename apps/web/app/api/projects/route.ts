import { prisma } from '@orms/db';
import { LocalizedError } from '@orms/generation-runtime';
import { requireAuth } from '@/lib/auth';
import { handleError, json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function positiveInteger(raw: string | null, fallback: number, code: string): number {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new LocalizedError({ code, status: 400 });
  }
  return value;
}

function projectName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new LocalizedError({ code: 'projects.nameInvalid', status: 400 });
  }
  const name = value.trim();
  if (name.length < 1 || name.length > 100) {
    throw new LocalizedError({ code: 'projects.nameInvalid', status: 400 });
  }
  return name;
}

function serializeProject(project: {
  id: number;
  name: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { assets: number; generations: number };
}) {
  return {
    id: project.id,
    name: project.name,
    archived: project.archived,
    asset_count: project._count.assets,
    generation_count: project._count.generations,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const url = new URL(req.url);
    const page = positiveInteger(url.searchParams.get('page'), 1, 'pagination.pageInvalid');
    const requestedPageSize = positiveInteger(
      url.searchParams.get('pageSize'),
      DEFAULT_PAGE_SIZE,
      'pagination.pageSizeInvalid',
    );
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const where = { userId, archived: false };

    const [projects, totalItems] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        include: { _count: { select: { assets: true, generations: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    return json({
      data: projects.map(serializeProject),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new LocalizedError({ code: 'generic.badRequest', status: 400 });
    }
    const name = projectName((body as { name?: unknown } | null)?.name);
    const project = await prisma.project.create({
      data: { userId, name },
      include: { _count: { select: { assets: true, generations: true } } },
    });
    return json(serializeProject(project), 201);
  } catch (error) {
    return handleError(error);
  }
}
