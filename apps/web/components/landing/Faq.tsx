'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';

type FaqKey = 'what' | 'tech' | 'types' | 'reference' | 'arabic';
const FAQ_ORDER: FaqKey[] = ['what', 'tech', 'types', 'reference', 'arabic'];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const t = useTranslations('landing.faq');

  return (
    <section id="faq" className="relative mx-auto max-w-[760px] scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mb-10 text-center">
        <span className="badge mx-auto">{t('eyebrow')}</span>
        <h2 className="font-display mt-4 text-balance text-[clamp(1.9rem,4.5vw,2.6rem)] font-extrabold leading-tight">
          {t('title')}
        </h2>
      </div>

      <div className="space-y-3">
        {FAQ_ORDER.map((key, i) => {
          const isOpen = open === i;
          return (
            <div key={key} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-start"
              >
                <span className="text-base font-bold text-text-100">{t(`items.${key}.q`)}</span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-primary-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="grid transition-all duration-300"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-text-400">{t(`items.${key}.a`)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-text-500">
        {t('moreQuestion')}{' '}
        <Link href="/auth" className="inline-flex items-center gap-1 font-semibold text-primary-400 hover:text-primary-500">
          <Sparkles size={14} /> {t('tryNow')}
        </Link>
      </p>
    </section>
  );
}