import createNextIntlPlugin from 'next-intl/plugin';

// next-intl App Router plugin. The request config lives at `./i18n/request.ts`
// (the repo uses `apps/web/app` instead of `src/`, so we point the plugin at the
// custom path explicitly). See `orms-arabic-rtl` skill + next-intl "without i18n
// routing" pattern (cookie-based, no `[locale]` route restructuring).
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl;