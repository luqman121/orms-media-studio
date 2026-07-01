'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const plans = [
  {
    name: 'Starter',
    tagline: 'مناسب للتجربة والبداية',
    monthly: 0,
    yearly: 0,
    priceLabel: 'مجانًا',
    features: ['رصيد شهري محدود', 'توليد صور أساسي', 'معرض شخصي', 'دقة قياسية'],
    featured: false,
    cta: 'ابدأ مجانًا',
  },
  {
    name: 'Creator',
    tagline: 'الأفضل للمصممين وصنّاع المحتوى',
    monthly: 19,
    yearly: 15,
    features: ['رصيد أعلى شهريًا', 'صور + فيديو', 'قوالب برومبت جاهزة', 'أولوية في قائمة الانتظار', 'دقة عالية HD'],
    featured: true,
    cta: 'ابدأ الآن',
  },
  {
    name: 'Pro Studio',
    tagline: 'للشركات والفرق الإبداعية',
    monthly: 49,
    yearly: 39,
    features: ['رصيد كبير', 'نماذج Pro المتقدمة', 'مساحة عمل للفريق', 'إعدادات علامة تجارية', 'دعم ذو أولوية'],
    featured: false,
    cta: 'ترقية إلى Pro',
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative mx-auto max-w-[1280px] scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mx-auto mb-10 max-w-[680px] text-center">
        <span className="badge mx-auto">الباقات</span>
        <h2 className="font-display mt-4 text-balance text-[clamp(1.9rem,4.5vw,2.6rem)] font-extrabold leading-tight">
          باقات تناسب كل مستوى
        </h2>
        <p className="mt-4 leading-relaxed text-text-400">ابدأ مجانًا وارتقِ عندما تحتاج المزيد من القدرة الإبداعية.</p>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[rgba(169,154,241,0.14)] bg-bg-900 p-1">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${!annual ? 'bg-gradient-brand text-white' : 'text-text-400'}`}
          >
            شهري
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all ${annual ? 'bg-gradient-brand text-white' : 'text-text-400'}`}
          >
            سنوي
            <span className={`text-[0.65rem] ${annual ? 'text-white/80' : 'text-success-500'}`}>-20%</span>
          </button>
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const price = annual ? p.yearly : p.monthly;
          return (
            <Card
              key={p.name}
              featured={p.featured}
              hover={!p.featured}
              className={`flex flex-col p-7 ${p.featured ? 'lg:-translate-y-3' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-extrabold text-text-100">{p.name}</h3>
                {p.featured && <Badge tone="cyan">الأكثر اختيارًا</Badge>}
              </div>
              <p className="mt-1 text-sm text-text-500">{p.tagline}</p>

              <div className="mt-5 flex items-end gap-1">
                {p.priceLabel && price === 0 ? (
                  <span className="font-display text-4xl font-extrabold text-text-100">{p.priceLabel}</span>
                ) : (
                  <>
                    <span className="font-display text-4xl font-extrabold text-text-100">${price}</span>
                    <span className="mb-1 text-sm text-text-500">/ شهريًا</span>
                  </>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-text-200">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[rgba(134,79,242,0.16)] text-primary-400">
                      <Check size={12} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth"
                className={`${p.featured ? 'btn-primary' : 'btn-secondary'} mt-7 w-full`}
              >
                {p.cta}
                {p.featured && <span className="shine" />}
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
