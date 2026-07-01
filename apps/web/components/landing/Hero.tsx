'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Image as ImageIcon, Video, Wand2, Play, ArrowLeft } from 'lucide-react';

const modes = [
  { key: 'image', label: 'صورة', icon: ImageIcon, placeholder: 'إعلان سينمائي لعطر فاخر على خلفية بنفسجية مضيئة، إضاءة درامية، دقة 4K' },
  { key: 'video', label: 'فيديو', icon: Video, placeholder: 'مشهد بطيء لقطرة ماء تتساقط على ثمرة فراولة، حركة كاميرا ناعمة، إضاءة استوديو' },
  { key: 'ad', label: 'إعلان', icon: Sparkles, placeholder: 'إعلان منتج عناية بالبشرة، خلفية نظيفة، ألوان فاتحة، أسلوب احترافي' },
  { key: '3d', label: '3D', icon: Wand2, placeholder: 'مجسّم ثلاثي الأبعاد لعبوة منتج، خامة زجاجية، انعكاسات ناعمة، خلفية داكنة' },
] as const;

export default function Hero() {
  const [mode, setMode] = useState<(typeof modes)[number]['key']>('image');
  const active = modes.find((m) => m.key === mode)!;

  return (
    <section className="relative overflow-hidden pt-[72px]">
      {/* background effects */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-70" />
      <div aria-hidden className="glow-orb h-[520px] w-[520px] -top-40 right-[-8%] animate-drift-gradient" />
      <div
        aria-hidden
        className="glow-orb h-[420px] w-[420px] left-[-6%] top-40 animate-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(54,196,240,0.22), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-[1280px] px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-[920px] text-center">
          <span className="badge mx-auto animate-fade-up">
            <Sparkles size={13} className="text-cyan-500" />
            مولّد الصور والفيديو بالذكاء الاصطناعي عبر OpenRouter
          </span>

          <h1
            className="font-display mt-6 text-balance text-[clamp(2.6rem,7vw,4.5rem)] font-extrabold leading-[1.05] animate-fade-up"
            style={{ animationDelay: '60ms' }}
          >
            حوّل فكرة واحدة إلى
            <br className="hidden sm:block" /> <span className="gradient-text">صور وفيديوهات</span> احترافية
          </h1>

          <p
            className="mx-auto mt-6 max-w-[640px] text-balance text-[clamp(1rem,2.2vw,1.15rem)] leading-relaxed text-text-200 animate-fade-up"
            style={{ animationDelay: '120ms' }}
          >
            منصة ORMS تجمع أقوى نماذج الذكاء الاصطناعي في واجهة عربية واحدة — لتوليد الصور، الفيديوهات،
            الإعلانات والمحتوى الإبداعي خلال ثوانٍ.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '180ms' }}>
            <Link href="/generate" className="btn-primary w-full sm:w-auto">
              <Sparkles size={18} /> ابدأ التوليد الآن
              <span className="shine" />
            </Link>
            <a href="#demo" className="btn-secondary w-full sm:w-auto">
              <Play size={16} /> شاهد كيف يعمل
            </a>
          </div>
        </div>

        {/* Prompt preview card */}
        <div id="demo" className="relative mx-auto mt-16 max-w-[860px] animate-fade-up" style={{ animationDelay: '240ms' }}>
          <div className="card glow-soft p-4 sm:p-6">
            <div className="segmented mb-4 max-w-md">
              {modes.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`segmented-tab ${m.key === mode ? 'is-active' : ''}`}
                  >
                    <Icon size={15} /> {m.label}
                  </button>
                );
              })}
            </div>

            <div className="prompt-box flex flex-col justify-between text-right" role="textbox" aria-readonly>
              <p className="text-text-200">{active.placeholder}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="badge badge-cyan">OpenRouter</span>
                  <span className="badge">HD</span>
                </div>
                <Link href="/generate" className="btn-primary !min-h-[44px] !px-5 text-sm">
                  توليد <ArrowLeft size={16} />
                  <span className="shine" />
                </Link>
              </div>
            </div>
          </div>

          {/* floating stat cards */}
          <FloatCard className="right-[-14px] top-8 sm:right-[-40px]" delay="0s">
            ⚡ توليد فوري
          </FloatCard>
          <FloatCard className="left-[-14px] top-24 sm:left-[-40px]" delay="1.2s">
            🎬 فيديو جاهز
          </FloatCard>
          <FloatCard className="left-6 bottom-[-16px] sm:left-16" delay="0.6s">
            🖼️ دقة 4K
          </FloatCard>
        </div>
      </div>
    </section>
  );
}

function FloatCard({ children, className = '', delay }: { children: React.ReactNode; className?: string; delay: string }) {
  return (
    <div
      className={`absolute hidden items-center gap-2 rounded-full border border-[rgba(169,154,241,0.18)] bg-surface-850/90 px-3.5 py-2 text-sm font-semibold text-text-100 shadow-glow backdrop-blur-md animate-float sm:flex ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}
