import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function FinalCta() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6">
      <div className="card-featured relative overflow-hidden rounded-2xlx px-6 py-16 text-center sm:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div aria-hidden className="glow-orb left-1/2 top-0 h-80 w-80 -translate-x-1/2 animate-pulse-glow" />
        <div className="relative mx-auto max-w-[620px]">
          <h2 className="font-display text-balance text-[clamp(1.9rem,5vw,3rem)] font-extrabold leading-tight">
            ابدأ تحويل أفكارك إلى <span className="gradient-text">محتوى بصري</span> اليوم
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-balance leading-relaxed text-text-200">
            اكتب الفكرة، اختر نوع المحتوى، واترك ORMS يحوّلها إلى صورة أو فيديو جاهز للاستخدام.
          </p>
          <Link href="/generate" className="btn-primary mx-auto mt-8 w-full sm:w-auto">
            <Sparkles size={18} /> جرّب ORMS الآن
            <span className="shine" />
          </Link>
        </div>
      </div>
    </section>
  );
}
