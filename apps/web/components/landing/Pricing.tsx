'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

type PlanKey = 'starter' | 'creator' | 'pro';
const PLAN_ORDER: PlanKey[] = ['starter', 'creator', 'pro'];
const PLAN_FEATURED: Record<PlanKey, boolean> = { starter: false, creator: true, pro: false };
const PLAN_MONTHLY: Record<PlanKey, number> = { starter: 0, creator: 19, pro: 49 };
const PLAN_YEARLY: Record<PlanKey, number> = { starter: 0, creator: 15, pro: 39 };

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const t = useTranslations('landing.pricing');

  return (
    <section id="pricing" className="relative mx-auto max-w-[1280px] scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto mb-10 max-w-[680px] text-center">
        <span className="badge mx-auto">{t('eyebrow')}</span>
        <h2 className="font-display mt-4 text-balance text-[clamp(1.9rem,4.5vw,2.6rem)] font-extrabold leading-tight">
          {t('title')}
        </h2>
        <p className="mt-4 leading-relaxed text-text-400">{t('subtitle')}</p>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[rgba(169,154,241,0.14)] bg-bg-900 p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${!annual ? 'bg-gradient-brand text-white' : 'text-text-400'}`}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all ${annual ? 'bg-gradient-brand text-white' : 'text-text-400'}`}
          >
            {t('yearly')}
            <span className={`text-[0.65rem] ${annual ? 'text-white/80' : 'text-success-500'}`}>{t('yearlyDiscount')}</span>
          </button>
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const featured = PLAN_FEATURED[key];
          const price = annual ? PLAN_YEARLY[key] : PLAN_MONTHLY[key];
          const features = t.raw(`plans.${key}.features`) as unknown as string[];
          const priceLabel = key === 'starter' ? t('plans.starter.priceLabel') : '';
          return (
            <Card
              key={key}
              featured={featured}
              hover={!featured}
              className={`flex flex-col p-7 ${featured ? 'lg:-translate-y-3' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-extrabold text-text-100">{t(`plans.${key}.name`)}</h3>
                {featured && <Badge tone="cyan">{t('featuredBadge')}</Badge>}
              </div>
              <p className="mt-1 text-sm text-text-500">{t(`plans.${key}.tagline`)}</p>

              <div className="mt-5 flex items-end gap-1">
                {priceLabel && price === 0 ? (
                  <span className="font-display text-4xl font-extrabold text-text-100">{priceLabel}</span>
                ) : (
                  <>
                    <span className="font-display text-4xl font-extrabold text-text-100">${price}</span>
                    <span className="mb-1 text-sm text-text-500">{t('perMonth')}</span>
                  </>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-text-200">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(134,79,242,0.16)] text-primary-400">
                      <Check size={12} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth"
                className={`${featured ? 'btn-primary' : 'btn-secondary'} mt-7 w-full`}
              >
                {t(`plans.${key}.cta`)}
                {featured && <span className="shine" />}
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}