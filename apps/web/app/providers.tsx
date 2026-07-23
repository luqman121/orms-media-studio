'use client';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from '../context/AuthContext';
import type { Locale } from '../i18n/locale';

// Client-side providers wrapper. Auth lives in localStorage / client state.
// `NextIntlClientProvider` receives the locale + messages resolved by the
// server root layout so client components can use `useTranslations` /
// `useLocale` without re-fetching the catalog.
export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages: Record<string, unknown>;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>{children}</AuthProvider>
    </NextIntlClientProvider>
  );
}