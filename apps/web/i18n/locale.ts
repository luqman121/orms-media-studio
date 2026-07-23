// Shared, CLIENT-SAFE locale constants + helpers for ORMS (Arabic default,
// English supported). This module MUST NOT import `next/headers` (or any
// server-only API) because it is imported by client components (e.g.
// DashboardShell, the locale switcher). The cookie-reading logic lives in
// the server-only `i18n/request.ts` + the root layout (via `getLocale()`).
//
// Cookie-based, NO `[locale]` route restructuring (next-intl "without i18n
// routing" pattern). The cookie is named `NEXT_LOCALE` and is set by the
// `POST /api/locale` route handler.
export const LOCALE_COOKIE = 'NEXT_LOCALE';
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';

/** `dir` attribute for a given locale. */
export function dirForLocale(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}