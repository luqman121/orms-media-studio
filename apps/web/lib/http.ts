// Route-handler helpers: JSON responses, request body parsing (multipart or JSON),
// and error → JSON conversion. Replaces Express's res.json / multer / express.json.
//
// `handleError` is the SINGLE translation boundary for the server. Library packages
// (`@orms/model-router`, `@orms/generation-runtime`) emit stable machine `code`
// strings + `retryable` flags (never next-intl, never cookies) so the BullMQ worker
// — which runs outside Next.js with no request context — can share them verbatim.
// This file resolves those codes to localized strings via the request locale
// (`getLocale` / `getTranslations` from `next-intl/server`, which read the
// `NEXT_LOCALE` cookie through `i18n/request.ts`).
import { getLocale, getTranslations } from 'next-intl/server';
import { AuthError } from './auth';
import { MAX_UPLOAD_BYTES } from './storage';
import { InsufficientCreditsError, LocalizedError } from '@orms/generation-runtime';
import type { NormalizedError } from '@orms/model-router';

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
            throw new LocalizedError({ code: 'generic.fileTooLarge', status: 413 });
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

// Map a provider `NormalizedError.code` (emitted by `@orms/model-router`
// `normalizeError`) to a dotted key within the `errors.provider.*` catalog
// namespace. Codes are kept stable so the worker's persisted RunEvent `dataJson`
// never changes shape. Unknown codes fall back to `messageAr`.
// Exported so route handlers that build structured provider-error responses
// (e.g. `{ id, error, code, retryable }`) can translate the `error` field inline
// without going through `handleError`'s simpler shape.
export const PROVIDER_CODE_TO_CATALOG_KEY: Record<string, string> = {
  timeout: 'provider.timeout',
  invalid_input: 'provider.invalidInput',
  provider_auth: 'provider.auth',
  rate_limited: 'provider.rateLimited',
  provider_error: 'provider.unknown',
};

// Convert a thrown error into a localized JSON Response. This is the single
// translation boundary: it resolves the request locale via next-intl and maps
// typed errors (AuthError / InsufficientCreditsError / LocalizedError /
// NormalizedError) to catalog keys. Never leaks stack traces or secrets.
export async function handleError(e: unknown): Promise<Response> {
  const t = await getTranslations('errors');

  // AuthError → errors.auth.required | errors.auth.invalid (by code), 401.
  if (e instanceof AuthError) {
    const key = e.code === 'auth_invalid' ? 'auth.invalid' : 'auth.required';
    return json({ error: t(key) }, e.status);
  }

  // InsufficientCreditsError → errors.credits.insufficient, 402.
  if (e instanceof InsufficientCreditsError) {
    return json({ error: t('credits.insufficient'), code: e.code }, e.status);
  }

  // LocalizedError → catalog key (e.code is dotted, relative to `errors`), status
  // defaults to 500. Params are forwarded for ICU interpolation.
  if (e instanceof LocalizedError) {
    return json({ error: t(e.code, e.params as Record<string, string | number | Date> | undefined), code: e.code }, e.status);
  }

  // NormalizedError (duck-typed: has `code` + `retryable`) → errors.provider.* by
  // code, falling back to `messageAr` when the code is unmapped. Status 502 if
  // retryable else 400.
  if (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as NormalizedError).code === 'string' &&
    typeof (e as NormalizedError).retryable === 'boolean'
  ) {
    const ne = e as NormalizedError;
    const catalogKey = PROVIDER_CODE_TO_CATALOG_KEY[ne.code];
    const message = catalogKey ? t(catalogKey) : ne.messageAr;
    return json({ error: message, code: ne.code, retryable: ne.retryable }, ne.retryable ? 502 : 400);
  }

  // Status-bearing plain Error (e.g. thrown by older paths) → preserve status,
  // translate the generic bucket. Falls back to 500 + errors.generic.serverError.
  const status = (e as { status?: number })?.status || 500;
  if (status >= 500) {
    // Never leak the raw message/stack for server errors.
    console.error('[api error]', (e as Error)?.message);
    return json({ error: t('generic.serverError') }, status);
  }
  return json({ error: t('generic.badRequest') }, status);
}