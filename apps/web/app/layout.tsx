import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
import { SwRegister } from '@/components/SwRegister';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { dirForLocale, type Locale } from '../i18n/locale';

// Localized metadata is generated per request from the `metadata` catalog
// (next-intl `getTranslations`). The static `viewport` stays unchanged.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  return {
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: t('appleWebAppTitle'),
    },
    icons: {
      icon: '/icons/icon.svg',
      apple: '/icons/apple-touch-icon.png',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#864FF2',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Resolve the locale from the `NEXT_LOCALE` cookie (Arabic default) so the
  // `<html lang dir>` attributes are dynamic and flip with the user's choice.
  // `getLocale()` reads the same request config (`i18n/request.ts`) used by
  // `getTranslations`, so metadata + `<html>` stay in sync.
  const locale = (await getLocale()) as Locale;
  const dir = dirForLocale(locale);
  // Pass the full message bundle to the client provider so client components
  // (e.g. DashboardShell, locale switcher) can use `useTranslations`.
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700;800&family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SwRegister />
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}