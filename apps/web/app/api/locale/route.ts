import { NextRequest, NextResponse } from 'next/server';
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from '../../../i18n/locale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/locale — set the `NEXT_LOCALE` cookie (Arabic default, English
// supported). Pre-auth (the auth page needs to localize too), but guarded
// against cross-site cookie injection by a light same-origin check on
// `Origin`/`Referer`. No DB, no auth dependency.
export async function POST(req: NextRequest) {
  // Light CSRF guard: require a same-origin request. `Origin` is preferred
  // (sent on POST); fall back to `Referer` for older clients. If neither is
  // present, reject (browsers always send at least one for fetch POST).
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const sameOrigin =
    (!!host && (!!origin && new URL(origin).host === host)) ||
    (!!host && (!!referer && new URL(referer).host === host));
  if (!sameOrigin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const locale = (body as { locale?: unknown })?.locale;
  if (typeof locale !== 'string' || !(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }

  // HttpOnly=true: the locale is read server-side via `cookies()` in
  // `i18n/request.ts` + `app/layout.tsx`. Keeping it HttpOnly prevents
  // client-side JS (or third-party scripts) from reading/tampering with it.
  // The client switcher only needs to *write* it (via this endpoint), not read
  // it — it gets the current locale from `useLocale()` (NextIntlClientProvider).
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale as Locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  });
  return res;
}