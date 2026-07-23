import { prisma } from '@orms/db';
import { LocalizedError } from '@orms/generation-runtime';
import { requireAuth } from '@/lib/auth';
import { handleError, json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

function projectId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new LocalizedError({ code: 'projects.notFound', status: 404 });
  }
  return id;
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

export async function GET(req: Request, context: Context) {
  try {
    const userId = requireAuth(req);
    const id = projectId((await context.params).id);
    const project = await prisma.project.findFirst({
      where: { id, userId, archived: false },
      include: { _count: { select: { assets: true, generations: true } } },
    });
    if (!project) throw new LocalizedError({ code: 'projects.notFound', status: 404 });
    return json(serializeProject(project));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const userId = requireAuth(req);
    const id = projectId((await context.params).id);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new LocalizedError({ code: 'generic.badRequest', status: 400 });
    }
    const name = projectName((body as { name?: unknown } | null)?.name);
    const owned = await prisma.project.findFirst({
      where: { id, userId, archived: false },
      select: { id: true },
    });
    if (!owned) throw new LocalizedError({ code: 'projects.notFound', status: 404 });

    const project = await prisma.project.update({
      where: { id: owned.id },
      data: { name },
      include: { _count: { select: { assets: true, generations: true } } },
    });
    return json(serializeProject(project));
  } catch (error) {
    return handleError(error);
  }
}
