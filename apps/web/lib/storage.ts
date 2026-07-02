// Phase 4: Cloudflare R2 object storage — replaces local disk (ASSETS_DIR / UPLOADS_DIR).
// All generated images/videos are stored as objects in R2; the assets route returns a
// signed redirect URL so traffic goes R2 → browser directly (zero Next.js egress).
//
// Required env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB — mirrors the old multer cap

let _client: S3Client | null = null;

function r2(): S3Client {
  if (_client) return _client;
  // Trim to tolerate stray whitespace/newlines that dashboards often paste in.
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }
  // A Cloudflare account id is exactly 32 hex chars. A malformed value (e.g. a stray
  // leading character) yields an unresolvable *.r2.cloudflarestorage.com host and an
  // opaque SSL/handshake error at upload time — fail fast with an actionable message.
  if (!/^[0-9a-f]{32}$/i.test(accountId)) {
    throw new Error(
      `R2_ACCOUNT_ID is malformed (expected 32 hex characters, got ${accountId.length}: "${accountId}") — ` +
        'check for a typo or stray character in the env var.',
    );
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function bucket(): string {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error('R2_BUCKET env var not set');
  return b;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}

// Returns a pre-signed GET URL valid for `expiresIn` seconds (default 1 h).
// Signing is local (HMAC) — no network call.
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return awsGetSignedUrl(r2(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
