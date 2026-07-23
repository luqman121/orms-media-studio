// Locale-agnostic error carriers shared by the web routes (and available to the
// worker if ever needed). These carry a stable machine `code` (catalog key) plus
// optional interpolation params / HTTP status / retryability — they NEVER import
// next-intl or read cookies. Translation happens only at the web route boundary
// (`apps/web/lib/http.ts` `handleError`), which has the request context.
//
// `code` is a dotted catalog key relative to the `errors` namespace, e.g.
// `'generate.modelRequired'`, `'generic.notFound'`, `'credits.insufficient'`.

export interface LocalizedErrorOptions {
  code: string;
  params?: Record<string, unknown>;
  status?: number;
  retryable?: boolean;
}

/** Arbitrary catalog-keyed error thrown from route handlers. */
export class LocalizedError extends Error {
  readonly code: string;
  readonly params: Record<string, unknown> | undefined;
  readonly status: number;
  readonly retryable: boolean | undefined;
  constructor(opts: LocalizedErrorOptions) {
    super(opts.code);
    this.name = 'LocalizedError';
    this.code = opts.code;
    this.params = opts.params;
    this.status = opts.status ?? 500;
    this.retryable = opts.retryable;
  }
}