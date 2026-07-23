import { prisma } from '@orms/db';
import { LocalizedError } from '@orms/generation-runtime';
import { requireAuth } from '@/lib/auth';
import { handleError, json } from '@/lib/http';
import { serializeLibraryAsset } from '@/lib/serialize';
import { deleteObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

function assetId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new LocalizedError({ code: 'assets.notFound', status: 404 });
  }
  return id;
}

const assetInclude = {
  generation: { select: { prompt: true, modelId: true } },
  project: { select: { name: true } },
} as const;

export async function GET(req: Request, context: Context) {
  try {
    const userId = requireAuth(req);
    const id = assetId((await context.params).id);
    const asset = await prisma.asset.findFirst({
      where: { id, userId },
      include: assetInclude,
    });
    if (!asset) throw new LocalizedError({ code: 'assets.notFound', status: 404 });
    return json(await serializeLibraryAsset(asset));
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const userId = requireAuth(req);
    const id = assetId((await context.params).id);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new LocalizedError({ code: 'generic.badRequest', status: 400 });
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new LocalizedError({ code: 'generic.badRequest', status: 400 });
    }

    const input = body as Record<string, unknown>;
    const keys = Object.keys(input);
    if (keys.length === 0 || keys.some((key) => key !== 'name' && key !== 'favorite')) {
      throw new LocalizedError({ code: 'assets.patchInvalid', status: 400 });
    }

    const data: { name?: string | null; favorite?: boolean } = {};
    if ('name' in input) {
      if (input.name !== null && typeof input.name !== 'string') {
        throw new LocalizedError({ code: 'assets.nameInvalid', status: 400 });
      }
      const name = typeof input.name === 'string' ? input.name.trim() : null;
      if (name != null && name.length > 120) {
        throw new LocalizedError({ code: 'assets.nameInvalid', status: 400 });
      }
      data.name = name || null;
    }
    if ('favorite' in input) {
      if (typeof input.favorite !== 'boolean') {
        throw new LocalizedError({ code: 'assets.favoriteInvalid', status: 400 });
      }
      data.favorite = input.favorite;
    }

    const owned = await prisma.asset.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) throw new LocalizedError({ code: 'assets.notFound', status: 404 });
    const asset = await prisma.asset.update({
      where: { id: owned.id },
      data,
      include: assetInclude,
    });
    return json(await serializeLibraryAsset(asset));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const userId = requireAuth(req);
    const id = assetId((await context.params).id);

    const storageKey = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findFirst({
        where: { id, userId },
        select: { id: true, storageKey: true },
      });
      if (!asset) throw new LocalizedError({ code: 'assets.notFound', status: 404 });

      const generations = await tx.generation.findMany({
        where: { userId, assetPath: { contains: asset.storageKey } },
        select: { id: true, assetPath: true },
      });
      for (const generation of generations) {
        const currentKeys = String(generation.assetPath || '').split(',').filter(Boolean);
        const nextKeys = currentKeys.filter((key) => key !== asset.storageKey);
        if (nextKeys.length !== currentKeys.length) {
          await tx.generation.update({
            where: { id: generation.id },
            data: { assetPath: nextKeys.length > 0 ? nextKeys.join(',') : null },
          });
        }
      }

      await tx.asset.delete({ where: { id: asset.id } });
      return asset.storageKey;
    });

    await deleteObject(storageKey).catch((error) => {
      console.warn('[library] failed to delete private object:', (error as Error).message);
    });
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
