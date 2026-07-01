import {
  ImageIcon,
  Video,
  Wand2,
  Layers,
  Images,
  Download,
  Check,
  Sparkles,
  Megaphone,
  ShoppingBag,
  Clapperboard,
  Camera,
} from 'lucide-react';
import Card from '../ui/Card';
import GradientArt from '../ui/GradientArt';

/* ---------- shared section heading ---------- */
function Heading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-[680px] text-center">
      <span className="badge mx-auto">{eyebrow}</span>
      <h2 className="font-display mt-4 text-balance text-[clamp(1.9rem,4.5vw,2.6rem)] font-extrabold leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-balance leading-relaxed text-text-400">{subtitle}</p>}
    </div>
  );
}

const SectionWrap = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <section id={id} className="relative mx-auto max-w-[1280px] scroll-mt-24 px-4 py-20 sm:px-6">
    {children}
  </section>
);

/* ================= Model / trust strip ================= */
const strip = ['OpenRouter', 'Image Models', 'Video Models', 'Upscale', 'Prompt Builder', 'Creative Studio', 'Flux', 'Veo', 'Sora', 'Kling'];

export function ModelStrip() {
  return (
    <div className="relative overflow-hidden border-y border-[rgba(169,154,241,0.10)] bg-bg-950/40 py-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg-950 to-transparent" />
      <div className="flex w-max animate-marquee gap-10 pr-10">
        {[...strip, ...strip].map((s, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-text-500">
            <Sparkles size={14} className="text-primary-400" />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================= Use cases ================= */
const useCases = [
  { icon: Megaphone, title: 'إعلانات المنتجات', desc: 'صور إعلانية جاهزة للحملات بجودة عالية.', seed: 1 },
  { icon: Camera, title: 'صور السوشيال ميديا', desc: 'محتوى بصري متجدد لكل منصاتك.', seed: 2 },
  { icon: Clapperboard, title: 'فيديوهات قصيرة', desc: 'مقاطع جذابة من وصف نصي بسيط.', seed: 3 },
  { icon: ShoppingBag, title: 'تصاميم المتاجر', desc: 'واجهات وبانرات احترافية لمتجرك.', seed: 4 },
];

export function UseCases() {
  return (
    <SectionWrap>
      <Heading
        eyebrow="حالات الاستخدام"
        title="استخدم ORMS لكل أنواع المحتوى الإبداعي"
        subtitle="من الإعلانات إلى السوشيال ميديا والفيديو القصير — واجهة واحدة تغطي احتياجاتك البصرية."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {useCases.map((u) => {
          const Icon = u.icon;
          return (
            <Card key={u.title} hover className="group overflow-hidden p-0">
              <GradientArt seed={u.seed} className="h-40 w-full" />
              <div className="p-5">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-mdx bg-[rgba(134,79,242,0.14)] text-primary-400">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-text-100">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-500">{u.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </SectionWrap>
  );
}

/* ================= Features grid ================= */
const features = [
  { icon: ImageIcon, title: 'توليد الصور', desc: 'أنشئ صورًا واقعية وفنية بدقة عالية من وصف نصي.' },
  { icon: Video, title: 'توليد الفيديو', desc: 'حوّل الأفكار إلى مقاطع فيديو قصيرة بحركة سلسة.' },
  { icon: Wand2, title: 'تحسين البرومبت', desc: 'اقتراحات ذكية لكتابة وصف أقوى بدون خبرة تقنية.' },
  { icon: Layers, title: 'نماذج متعددة', desc: 'وصول إلى أفضل النماذج عبر OpenRouter من مكان واحد.' },
  { icon: Images, title: 'حفظ المشاريع', desc: 'سجل كامل لكل أعمالك مع معاينة ومعرض شخصي.' },
  { icon: Download, title: 'تصدير سريع', desc: 'نزّل نتائجك بجودة كاملة بنقرة واحدة.' },
];

export function Features() {
  return (
    <SectionWrap id="features">
      <Heading eyebrow="المميزات" title="كل ما تحتاجه لصناعة محتوى بصري" subtitle="أدوات متكاملة مصممة لصنّاع المحتوى، المسوقين، والمتاجر." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} hover className="p-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-mdx bg-gradient-brand text-white shadow-[0_10px_28px_rgba(134,79,242,0.3)]">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-text-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-400">{f.desc}</p>
            </Card>
          );
        })}
      </div>
    </SectionWrap>
  );
}

/* ================= Prompt builder ================= */
const checklist = [
  'اقتراحات فورية لتحسين الوصف',
  'اختيار الأسلوب البصري والإضاءة',
  'ضبط العدسة، الحركة، والألوان',
  'قوالب جاهزة للإعلانات والمحتوى',
  'تجنّب الكلمات الضعيفة وغير الواضحة',
];

export function PromptBuilder() {
  return (
    <SectionWrap>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="badge">مساعد البرومبت</span>
          <h2 className="font-display mt-4 text-balance text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold leading-tight">
            ابنِ <span className="gradient-text">Prompt أقوى</span> بدون خبرة تقنية
          </h2>
          <p className="mt-4 leading-relaxed text-text-400">
            مساعد ذكي يحوّل فكرتك البسيطة إلى وصف احترافي كامل — يضبط الأسلوب، الإضاءة والتفاصيل تلقائيًا.
          </p>
          <ul className="mt-6 space-y-3">
            {checklist.map((c) => (
              <li key={c} className="flex items-center gap-3 text-sm text-text-200">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[rgba(67,249,148,0.14)] text-success-500">
                  <Check size={14} />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <Card className="relative overflow-hidden p-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="relative space-y-3">
            <div className="text-xs font-semibold text-text-500">قبل</div>
            <div className="rounded-mdx border border-[rgba(169,154,241,0.14)] bg-bg-900 p-3 text-sm text-text-500">
              صورة سيارة
            </div>
            <div className="flex justify-center py-1 text-primary-400">
              <Wand2 size={20} />
            </div>
            <div className="text-xs font-semibold text-cyan-500">بعد التحسين</div>
            <div className="rounded-mdx border border-[rgba(134,79,242,0.32)] bg-[linear-gradient(180deg,rgba(134,79,242,0.08),transparent)] p-3 text-sm leading-relaxed text-text-100">
              صورة سينمائية لسيارة رياضية حمراء على طريق ساحلي وقت الغروب، إضاءة ذهبية دافئة، انعكاسات على الطلاء، عدسة 35mm، دقة 4K
            </div>
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

/* ================= Gallery ================= */
const galleryPrompts = [
  'عطر فاخر، إضاءة بنفسجية',
  'مشهد سينمائي ليلي',
  'منتج عناية بالبشرة',
  'شخصية ثلاثية الأبعاد',
  'طعام احترافي',
  'سيارة رياضية غروب',
  'أزياء تحريرية',
  'طبيعة خيالية',
];

export function Gallery() {
  return (
    <SectionWrap id="gallery">
      <Heading eyebrow="المعرض" title="معرض إلهام متجدد" subtitle="نماذج مما يمكن إنشاؤه — اكتب فكرتك وشاهد ORMS يحوّلها إلى نتيجة." />
      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {galleryPrompts.map((p, i) => (
          <GradientArt
            key={i}
            seed={i + 3}
            className="group block break-inside-avoid rounded-lgx border border-[rgba(169,154,241,0.14)]"
            style={{ height: 160 + (i % 3) * 60 }}
          >
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="text-sm font-semibold text-white">{p}</span>
            </div>
          </GradientArt>
        ))}
      </div>
    </SectionWrap>
  );
}
