'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Coins, Copy, Download, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../../../../lib/api';
import { parseGenerationParams, type Generation } from '../../../../lib/studio-types';
import Badge from '../../../../components/ui/Badge';
import Card from '../../../../components/ui/Card';
import Skeleton from '../../../../components/ui/Skeleton';
import { ErrorNotice } from '../../../../components/ui/StudioStates';

function downloadAsset(url: string, name: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function GenerationDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations('generationDetail');
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGeneration(await api.get<Generation>(`/api/generate/generations/${params.id}`));
    } catch (caught) {
      setError((caught as Error).message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const generationParams = useMemo(() => parseGenerationParams(generation?.params_json), [generation?.params_json]);

  async function copyPrompt() {
    if (!generation?.prompt) return;
    await navigator.clipboard.writeText(generation.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('loading')} className="mx-auto max-w-[1100px] space-y-6">
        <Skeleton className="h-28" />
        <Skeleton className="aspect-video" />
      </div>
    );
  }

  if (error || !generation) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <ErrorNotice onRetry={load} retryLabel={t('retryLoad')}>{error || t('notFound')}</ErrorNotice>
      </div>
    );
  }

  const failedAndRetryable = generation.status === 'failed' && generation.retryable === true;
  const modelName = generation.model_name || generation.model_id;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <Link href="/history" className="mb-3 inline-flex items-center gap-2 text-sm text-text-400 hover:text-text-100">
          <ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-extrabold text-text-100">{t('title', { id: generation.id })}</h1>
              <Badge tone={generation.status === 'completed' ? 'success' : generation.status === 'failed' ? 'danger' : 'warning'}>
                {t(`status.${generation.status}`)}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-text-500">{new Date(generation.created_at).toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/generate?reuse=${generation.id}`} className="btn-secondary min-h-12 px-5 text-sm">
              <Sparkles size={17} /> {t('reuse')}
            </Link>
            {failedAndRetryable ? (
              <Link href={`/generate?retry=${generation.id}`} className="btn-primary min-h-12 px-5 text-sm">
                <RefreshCw size={17} /> {t('retryGeneration')}
              </Link>
            ) : null}
          </div>
        </div>
        {failedAndRetryable ? (
          <p className="mt-3 rounded-mdx border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-text-200">
            {t('retryExplanation')}
          </p>
        ) : null}
      </header>

      {generation.asset_urls?.length ? (
        <section aria-label={t('assetsTitle')} className={`grid gap-4 ${generation.asset_urls.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {generation.asset_urls.map((url, index) => (
            <Card key={url} className="group relative overflow-hidden p-2">
              {generation.type === 'video' ? (
                <video src={url} controls playsInline className="max-h-[70vh] w-full rounded-mdx bg-bg-950" />
              ) : (
                <img src={url} alt={t('assetAlt', { index: index + 1 })} className="max-h-[70vh] w-full rounded-mdx object-contain" />
              )}
              <button type="button" className="btn-secondary absolute bottom-4 start-4 min-h-10 px-3 text-xs opacity-0 focus-visible:opacity-100 group-hover:opacity-100" onClick={() => downloadAsset(url, `orms-${generation.id}-${index}.${generation.type === 'video' ? 'mp4' : 'png'}`)}>
                <Download size={15} /> {t('download')}
              </button>
            </Card>
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card as="section" className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text-100">{t('promptTitle')}</h2>
            <button type="button" className="btn-ghost p-2" onClick={copyPrompt} disabled={!generation.prompt} aria-label={t('copyPrompt')}>
              <Copy size={17} /> <span className="text-sm">{copied ? t('copied') : t('copyPrompt')}</span>
            </button>
          </div>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-text-200">{generation.prompt || t('noPrompt')}</p>
          {generation.error ? (
            <div role="alert" className="mt-5 rounded-mdx border border-danger-500/30 bg-danger-500/10 p-4 text-sm text-text-200">
              <span className="font-semibold text-danger-500">{t('failureReason')}</span>
              <p className="mt-1">{generation.error}</p>
            </div>
          ) : null}
        </Card>

        <Card as="section" className="p-5">
          <h2 className="text-lg font-bold text-text-100">{t('metadataTitle')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-text-500">{t('model')}</dt><dd dir="ltr" className="truncate text-start font-semibold text-text-200">{modelName}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-text-500">{t('type')}</dt><dd className="text-text-200">{generation.type === 'video' ? t('video') : t('image')}</dd></div>
            {generation.project_id ? <div className="flex justify-between gap-4"><dt className="text-text-500">{t('project')}</dt><dd><Link href={`/projects/${generation.project_id}`} className="text-primary-400 hover:text-primary-400/80">{t('openProject')}</Link></dd></div> : null}
            {generation.duration_ms != null ? <div className="flex justify-between gap-4"><dt className="text-text-500">{t('duration')}</dt><dd className="text-text-200">{t('milliseconds', { count: generation.duration_ms })}</dd></div> : null}
          </dl>
          <div className="mt-5 border-t border-border-700 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-text-100"><Coins size={16} className="text-warning-500" /> {t('creditsTitle')}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-text-500">{t('estimated')}</dt><dd className="text-text-200">{generation.estimated_credits ?? t('notAvailable')}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-500">{t('reserved')}</dt><dd className="text-text-200">{generation.reserved_credits ?? t('notAvailable')}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-text-500">{t('final')}</dt><dd className="text-text-200">{generation.final_credits ?? t('notAvailable')}</dd></div>
            </dl>
          </div>
        </Card>
      </div>

      {Object.keys(generationParams).length ? (
        <Card as="section" className="p-5">
          <h2 className="text-lg font-bold text-text-100">{t('paramsTitle')}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(generationParams).map(([key, value]) => (
              <div key={key} className="rounded-mdx border border-border-700 bg-bg-900 p-3">
                <dt dir="ltr" className="text-start text-xs text-text-500">{key}</dt>
                <dd dir="ltr" className="mt-1 truncate text-start text-sm text-text-200">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
