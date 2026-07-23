// One-time, idempotent backfill for Increment 1.
//   1. Create an Asset row for every existing Generation asset key (from the
//      comma-separated `assetPath`), inferring kind/mediaType from the key.
//   2. Give every existing user a CreditWallet + a `signup` ledger entry.
// Safe to run repeatedly. Run after `prisma migrate deploy`:
//   DATABASE_URL=... npx tsx scripts/backfill-increment1.ts
import { prisma } from '@orms/db';
import { SIGNUP_CREDITS } from '@orms/model-router';

function mediaTypeForKey(key: string): { kind: 'image' | 'video'; mediaType: string } {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  if (ext === 'mp4' || ext === 'webm') return { kind: 'video', mediaType: ext === 'webm' ? 'video/webm' : 'video/mp4' };
  if (ext === 'jpg' || ext === 'jpeg') return { kind: 'image', mediaType: 'image/jpeg' };
  if (ext === 'webp') return { kind: 'image', mediaType: 'image/webp' };
  if (ext === 'svg') return { kind: 'image', mediaType: 'image/svg+xml' };
  return { kind: 'image', mediaType: 'image/png' };
}

async function backfillAssets() {
  const gens = await prisma.generation.findMany({
    where: { assetPath: { not: null } },
    select: { id: true, userId: true, assetPath: true, assetMediaType: true },
  });
  let created = 0;
  for (const g of gens) {
    const keys = String(g.assetPath || '').split(',').map((s) => s.trim()).filter(Boolean);
    for (const key of keys) {
      const exists = await prisma.asset.findFirst({ where: { generationId: g.id, storageKey: key } });
      if (exists) continue;
      const { kind, mediaType } = mediaTypeForKey(key);
      await prisma.asset.create({
        data: { userId: g.userId, generationId: g.id, kind, storageKey: key, mediaType: g.assetMediaType || mediaType },
      });
      created += 1;
    }
  }
  console.log(`[backfill] assets created: ${created}`);
}

async function backfillWallets() {
  const users = await prisma.user.findMany({ select: { id: true } });
  let granted = 0;
  for (const u of users) {
    const wallet = await prisma.creditWallet.findUnique({ where: { userId: u.id } });
    if (wallet) continue;
    await prisma.$transaction([
      prisma.creditWallet.create({ data: { userId: u.id, balance: SIGNUP_CREDITS } }),
      prisma.creditLedger.create({
        data: {
          userId: u.id,
          kind: 'signup',
          amount: SIGNUP_CREDITS,
          balanceAfter: SIGNUP_CREDITS,
          reason: 'backfill signup grant',
          idempotencyKey: `signup:${u.id}`,
        },
      }),
    ]);
    granted += 1;
  }
  console.log(`[backfill] wallets granted: ${granted}`);
}

async function main() {
  await backfillAssets();
  await backfillWallets();
  await prisma.$disconnect();
  console.log('[backfill] done');
}

main().catch((e) => {
  console.error('[backfill] failed:', e);
  process.exit(1);
});
