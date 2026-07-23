import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import Logo from '../ui/Logo';

export default async function Footer() {
  const t = await getTranslations('landing.footer');

  const columns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
      title: t('colProduct'),
      links: [
        { label: t('linkGenerator'), href: '/generate' },
        { label: t('linkGallery'), href: '#gallery' },
        { label: t('linkPricing'), href: '#pricing' },
      ],
    },
    {
      title: t('colResources'),
      links: [
        { label: t('linkFeatures'), href: '#features' },
        { label: t('linkGuide'), href: '#faq' },
        { label: t('linkFaq'), href: '#faq' },
      ],
    },
    {
      title: t('colAccount'),
      links: [
        { label: t('linkLogin'), href: '/auth' },
        { label: t('linkRegister'), href: '/auth' },
        { label: t('linkDashboard'), href: '/dashboard' },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-[rgba(169,154,241,0.10)] pt-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-500">{t('desc')}</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-bold text-text-200">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-text-500 transition-colors hover:text-text-100">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[rgba(169,154,241,0.10)] py-6 text-xs text-text-500 sm:flex-row">
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-500" />
            {t('poweredBy')}
          </span>
        </div>
      </div>

      {/* Large low-opacity watermark (DESIGN.md §10.9) */}
      <div
        aria-hidden
        className="pointer-events-none select-none text-center font-display font-extrabold leading-none text-white/[0.03]"
        style={{ fontSize: 'clamp(4rem, 18vw, 15rem)', marginBottom: '-0.15em' }}
      >
        ORMS
      </div>
    </footer>
  );
}