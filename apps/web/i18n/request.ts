import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from './locale';

// next-intl request config — "without i18n routing" pattern. The locale is
// read from the `NEXT_LOCALE` cookie (Arabic default, English supported).
// Messages are loaded via dynamic import per locale. Runs once per request
// (React `cache`); the same resolved locale is exposed to the root layout via
// `getLocale()` from `next-intl/server`.
export default getRequestConfig(async () => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale =
    value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
      ? (value as Locale)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});