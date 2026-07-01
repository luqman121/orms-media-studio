// Route-handler helpers: JSON responses, request body parsing (multipart or JSON),
// and error → JSON conversion. Replaces Express's res.json / multer / express.json.
import { AuthError } from './auth';
import { MAX_UPLOAD_BYTES } from './storage';

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface ParsedRequest {
  fields: Record<string, any>;
  file: UploadedFile | null;
}

// Parses either multipart/form-data (with an optional `image` file) or a JSON body.
// Mirrors the old behavior where generate endpoints accepted both.
export async function parseRequest(req: Request): Promise<ParsedRequest> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const fields: Record<string, any> = {};
    let file: UploadedFile | null = null;
    for (const [k, v] of form.entries()) {
      if (v instanceof File) {
        if (k === 'image' && v.size > 0) {
          if (v.size > MAX_UPLOAD_BYTES) {
            const err = new Error('حجم الملف كبير جداً') as Error & { status?: number };
            err.status = 413;
            throw err;
          }
          file = {
            buffer: Buffer.from(await v.arrayBuffer()),
            filename: v.name || 'upload.png',
            mimetype: v.type || 'image/png',
          };
        }
      } else {
        fields[k] = v;
      }
    }
    return { fields, file };
  }
  try {
    const body = await req.json();
    return { fields: body ?? {}, file: null };
  } catch {
    return { fields: {}, file: null };
  }
}

// Convert a thrown error into a JSON Response (localized Arabic message).
export function handleError(e: unknown): Response {
  if (e instanceof AuthError) return json({ error: e.message }, e.status);
  const status = (e as { status?: number })?.status || 500;
  const message = (e as Error)?.message || 'خطأ في الخادم';
  if (status >= 500) console.error('[api error]', message);
  return json({ error: message }, status);
}
