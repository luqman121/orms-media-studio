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
import { getTranslations } from 'next-intl/server';
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
// Brand/model names — English technical terms, kept literal (no localization).
const strip = ['OpenRouter', 'Image Models', 'Video Models', 'Upscale', 'Prompt Builder', 'Creative Studio', 'Flux', 'Veo', 'Sora', 'Kling'];

export function ModelStrip() {
  return (
    <div className="relative overflow-hidden border-y border-[rgba(169,154,241,0.10)] bg-bg-950/40 py-6">
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-24 bg-gradient-to-l from-bg-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-24 bg-gradient-to-r from-bg-950 to-transparent" />
      <div className="flex w-max animate-marquee gap-10 pe-10">
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
// Structural metadata (icon + seed + catalog key); titles/descs come from the
// `landing.sections.useCase*` catalog keys.
const useCases = [
  { icon: Megaphone, titleKey: 'useCaseAdsTitle', descKey: 'useCaseAdsDesc', seed: 1 },
  { icon: Camera, titleKey: 'useCaseSocialTitle', descKey: 'useCaseSocialDesc', seed: 2 },
  { icon: Clapperboard, titleKey: 'useCaseVideoTitle', descKey: 'useCaseVideoDesc', seed: 3 },
  { icon: ShoppingBag, titleKey: 'useCaseStoreTitle', descKey: 'useCaseStoreDesc', seed: 4 },
] as const;

export async function UseCases() {
  const t = await getTranslations('landing.sections');
  return (
    <SectionWrap>
      <Heading
        eyebrow={t('useCasesEyebrow')}
        title={t('useCasesTitle')}
        subtitle={t('useCasesSubtitle')}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {useCases.map((u) => {
          const Icon = u.icon;
          const title = t(u.titleKey);
          return (
            <Card key={title} hover className="group overflow-hidden p-0">
              <GradientArt seed={u.seed} className="h-40 w-full" />
              <div className="p-5">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-mdx bg-[rgba(134,79,242,0.14)] text-primary-400">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-text-100">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-500">{t(u.descKey)}</p>
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
  { icon: ImageIcon, titleKey: 'featureImageTitle', descKey: 'featureImageDesc' },
  { icon: Video, titleKey: 'featureVideoTitle', descKey: 'featureVideoDesc' },
  { icon: Wand2, titleKey: 'featurePromptTitle', descKey: 'featurePromptDesc' },
  { icon: Layers, titleKey: 'featureModelsTitle', descKey: 'featureModelsDesc' },
  { icon: Images, titleKey: 'featureSaveTitle', descKey: 'featureSaveDesc' },
  { icon: Download, titleKey: 'featureExportTitle', descKey: 'featureExportDesc' },
] as const;

export async function Features() {
  const t = await getTranslations('landing.sections');
  return (
    <SectionWrap id="features">
      <Heading eyebrow={t('featuresEyebrow')} title={t('featuresTitle')} subtitle={t('featuresSubtitle')} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          const title = t(f.titleKey);
          return (
            <Card key={title} hover className="p-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-mdx bg-gradient-brand text-white shadow-[0_10px_28px_rgba(134,79,242,0.3)]">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-bold text-text-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-400">{t(f.descKey)}</p>
            </Card>
          );
        })}
      </div>
    </SectionWrap>
  );
}

/* ================= Prompt builder ================= */
export async function PromptBuilder() {
  const t = await getTranslations('landing.sections');
  const checklist = t.raw('checklist') as string[];
  return (
    <SectionWrap>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="badge">{t('promptBuilderBadge')}</span>
          <h2 className="font-display mt-4 text-balance text-[clamp(1.8rem,4vw,2.4rem)] font-extrabold leading-tight">
            {t('promptBuilderTitle', { highlight: t('promptBuilderHighlight') })}
          </h2>
          <p className="mt-4 leading-relaxed text-text-400">
            {t('promptBuilderDesc')}
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
            <div className="text-xs font-semibold text-text-500">{t('promptBuilderBefore')}</div>
            <div className="rounded-mdx border border-[rgba(169,154,241,0.14)] bg-bg-900 p-3 text-sm text-text-500">
              {t('promptBuilderBeforeText')}
            </div>
            <div className="flex justify-center py-1 text-primary-400">
              <Wand2 size={20} />
            </div>
            <div className="text-xs font-semibold text-cyan-500">{t('promptBuilderAfter')}</div>
            <div className="rounded-mdx border border-[rgba(134,79,242,0.32)] bg-[linear-gradient(180deg,rgba(134,79,242,0.08),transparent)] p-3 text-sm leading-relaxed text-text-100">
              {t('promptBuilderAfterText')}
            </div>
          </div>
        </Card>
      </div>
    </SectionWrap>
  );
}

/* ================= Gallery ================= */
export async function Gallery() {
  const t = await getTranslations('landing.sections');
  const galleryPrompts = t.raw('galleryPrompts') as string[];
  return (
    <SectionWrap id="gallery">
      <Heading eyebrow={t('galleryEyebrow')} title={t('galleryTitle')} subtitle={t('gallerySubtitle')} />
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
