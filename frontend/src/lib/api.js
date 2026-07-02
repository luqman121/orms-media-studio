// Typed fetch wrapper — auto-injects JWT, handles errors
const TOKEN_KEY = 'orms_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

async function req(method, url, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let finalUrl = url;
  let finalBody;
  if (body instanceof FormData) {
    finalBody = body;
  } else if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }
  const r = await fetch(finalUrl, { method, headers, body: finalBody, ...opts });
  let data;
  try { data = await r.json(); } catch (e) { data = null; }
  if (!r.ok) {
    const msg = (data && (data.error || data.detail)) || `HTTP ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (u, opts) => req('GET', u, undefined, opts),
  post: (u, b, opts) => req('POST', u, b, opts),
  del: (u) => req('DELETE', u, undefined),
  put: (u, b) => req('PUT', u, b),
};

export async function fetchEventSource(url, body, onMessage, onError) {
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
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try { onMessage(JSON.parse(payload)); }
      catch (e) { /* ignore */ }
    }
  }
}