'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, FolderKanban, Images, Sparkles } from 'lucide-react';
import { api } from '../../../../lib/api';
import type { Asset, Generation, Project } from '../../../../lib/studio-types';
import Badge from '../../../../components/ui/Badge';
import Card from '../../../../components/ui/Card';
import Skeleton from '../../../../components/ui/Skeleton';
import { EmptyState, ErrorNotice } from '../../../../components/ui/StudioStates';

type ProjectResponse = Project | { project: Project };

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations('projectDetail');
  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ projectId: params.id });
      const [projectResponse, assetResponse, generationResponse] = await Promise.all([
        api.get<ProjectResponse>(`/api/projects/${params.id}`),
        api.get<{ data: Asset[] }>(`/api/library/assets?${query}&page=1&pageSize=8`),
        api.get<{ data: Generation[] }>(`/api/generate/generations?${query}&limit=8`),
      ]);
      setProject('project' in projectResponse ? projectResponse.project : projectResponse);
      setAssets(assetResponse.data ?? []);
      setGenerations(generationResponse.data ?? []);
    } catch (caught) {
      setError((caught as Error).message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t('loading')} className="mx-auto max-w-[1280px] space-y-6">
        <Skeleton className="h-28" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-square" />)}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <ErrorNotice onRetry={load} retryLabel={t('retry')}>{error || t('notFound')}</ErrorNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="mb-3 inline-flex items-center gap-2 text-sm text-text-400 hover:text-text-100">
            <ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-mdx bg-primary-500/15 text-primary-400">
              <FolderKanban size={24} />
            </span>
            <div>
              <h1 className="font-display text-3xl font-extrabold text-text-100">{project.name}</h1>
              <p className="mt-1 text-sm text-text-500">{t('updatedAt', { date: new Date(project.updated_at).toLocaleString() })}</p>
            </div>
          </div>
        </div>
        <Link href={`/generate?projectId=${project.id}`} className="btn-primary text-sm">
          <Sparkles size={17} /> {t('createInProject')}
        </Link>
      </header>

      <section aria-labelledby="project-assets-title">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="project-assets-title" className="text-xl font-bold text-text-100">{t('assetsTitle')}</h2>
          <Link href={`/assets?projectId=${project.id}`} className="text-sm font-semibold text-primary-400 hover:text-primary-400/80">{t('viewAll')}</Link>
        </div>
        {assets.length === 0 ? (
          <EmptyState icon={<Images size={25} />} title={t('assetsEmptyTitle')} description={t('assetsEmptyDescription')} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {assets.map((asset) => (
              <Link key={asset.id} href={`/assets?projectId=${project.id}`} className="group overflow-hidden rounded-lgx border border-border-700 bg-surface-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500">
                <div className="aspect-square bg-bg-950">
                  {asset.kind === 'video' ? (
                    <video src={asset.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <img src={asset.url} alt={asset.name || t('assetAlt')} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="truncate text-sm text-text-200">{asset.name || t('untitledAsset')}</span>
                  <Badge tone={asset.kind === 'video' ? 'cyan' : 'default'}>{asset.kind === 'video' ? t('video') : t('image')}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="project-generations-title">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="project-generations-title" className="text-xl font-bold text-text-100">{t('generationsTitle')}</h2>
          <Link href={`/history?projectId=${project.id}`} className="text-sm font-semibold text-primary-400 hover:text-primary-400/80">{t('viewAll')}</Link>
        </div>
        {generations.length === 0 ? (
          <EmptyState icon={<Sparkles size={25} />} title={t('generationsEmptyTitle')} description={t('generationsEmptyDescription')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {generations.map((generation) => (
              <Card key={generation.id} as="article" hover className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-text-100">{generation.prompt || t('untitledGeneration')}</h3>
                    <p dir="ltr" className="mt-1 truncate text-start text-xs text-text-500">{generation.model_name || generation.model_id}</p>
                  </div>
                  <Badge tone={generation.status === 'completed' ? 'success' : generation.status === 'failed' ? 'danger' : 'warning'}>
                    {t(`status.${generation.status}`)}
                  </Badge>
                </div>
                <Link href={`/history/${generation.id}`} className="btn-secondary mt-4 min-h-10 px-4 text-sm">{t('openGeneration')}</Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
