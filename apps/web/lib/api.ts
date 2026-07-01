// Typed fetch wrapper — auto-injects JWT, handles errors.
// Ported from frontend/src/lib/api.js. SSR-safe (guards localStorage access).
const TOKEN_KEY = 'orms_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null): void {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

type Body = FormData | Record<string, unknown> | undefined | null;

interface ReqOpts extends Omit<RequestInit, 'method' | 'body'> {
  headers?: Record<string, string>;
}

async function req<T = any>(method: string, url: string, body?: Body, opts: ReqOpts = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let finalBody: BodyInit | undefined;
  if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }
  const r = await fetch(url, { method, headers, body: finalBody, ...opts });
  let data: any = null;
  try {
    data = await r.json();
  } catch {
    data = null;
  }
  if (!r.ok) {
    const msg = (data && (data.error || data.detail)) || `HTTP ${r.status}`;
    const err = new Error(msg) as ApiError;
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T = any>(u: string, opts?: ReqOpts) => req<T>('GET', u, undefined, opts),
  post: <T = any>(u: string, b?: Body, opts?: ReqOpts) => req<T>('POST', u, b, opts),
  del: <T = any>(u: string) => req<T>('DELETE', u, undefined),
  put: <T = any>(u: string, b?: Body) => req<T>('PUT', u, b),
};

export async function fetchEventSource(
  url: string,
  body: Record<string, unknown>,
  onMessage: (evt: any) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  const token = getToken();
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok || !r.body) {
    if (onError) onError(new Error(`HTTP ${r.status}`));
    return;
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        onMessage(JSON.parse(payload));
      } catch {
        /* ignore */
      }
    }
  }
}
