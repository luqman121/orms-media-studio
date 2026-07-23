import type { Prisma } from '@orms/db';
import { prisma } from '@orms/db';
import { LocalizedError } from '@orms/generation-runtime';
import { requireAuth } from '@/lib/auth';
import { handleError, json } from '@/lib/http';
import { serializeLibraryAsset } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

function positiveInteger(raw: string | null, fallback: number, code: string): number {
  if (raw == null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new LocalizedError({ code, status: 400 });
  }
  return value;
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

    const rawKind = url.searchParams.get('kind');
    if (rawKind != null && rawKind !== 'image' && rawKind !== 'video') {
      throw new LocalizedError({ code: 'assets.kindInvalid', status: 400 });
    }

    const rawFavorite = url.searchParams.get('favorite');
    if (rawFavorite != null && rawFavorite !== 'true' && rawFavorite !== 'false') {
      throw new LocalizedError({ code: 'assets.favoriteInvalid', status: 400 });
    }

    const rawProjectId = url.searchParams.get('projectId');
    let projectId: number | undefined;
    if (rawProjectId != null) {
      projectId = positiveInteger(rawProjectId, 0, 'assets.projectInvalid');
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId, archived: false },
        select: { id: true },
      });
      if (!project) throw new LocalizedError({ code: 'projects.notFound', status: 404 });
    }

    const rawQuery = url.searchParams.get('q');
    const q = rawQuery?.trim() ?? '';
    if (q.length > 200) throw new LocalizedError({ code: 'assets.queryTooLong', status: 400 });

    const where: Prisma.AssetWhereInput = {
      userId,
      ...(rawKind ? { kind: rawKind } : {}),
      ...(rawFavorite != null ? { favorite: rawFavorite === 'true' } : {}),
      ...(projectId != null ? { projectId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { generation: { is: { prompt: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [assets, totalItems] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        include: {
          generation: { select: { prompt: true, modelId: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.asset.count({ where }),
    ]);
    const data = await Promise.all(assets.map(serializeLibraryAsset));

    return json({
      data,
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
