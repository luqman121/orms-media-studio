'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Heart, Images, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Asset, Paginated, Project } from '../../../lib/studio-types';
import AssetCard from '../../../components/assets/AssetCard';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { Input, Select } from '../../../components/ui/Field';
import Skeleton from '../../../components/ui/Skeleton';
import { ConfirmDialog, EmptyState, ErrorNotice } from '../../../components/ui/StudioStates';

type AssetResponse = Partial<Paginated<Asset>> & { data: Asset[] };
type ProjectResponse = { data?: Project[]; projects?: Project[] };
const PAGE_SIZE = 12;

export default function AssetsPage() {
  const t = useTranslations('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [kind, setKind] = useState('');
  const [favorite, setFavorite] = useState('');
  const [projectId, setProjectId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const requestedProject = new URLSearchParams(window.location.search).get('projectId');
    if (requestedProject) setProjectId(requestedProject);
    api.get<ProjectResponse>('/api/projects')
      .then((response) => setProjects(response.data ?? response.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedQ) params.set('q', debouncedQ);
    if (kind) params.set('kind', kind);
    if (favorite) params.set('favorite', favorite);
    if (projectId) params.set('projectId', projectId);
    return params.toString();
  }, [debouncedQ, favorite, kind, page, projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<AssetResponse>(`/api/library/assets?${query}`);
      setAssets(response.data ?? []);
      setTotal(response.total ?? response.data?.length ?? 0);
      setTotalPages(Math.max(1, response.totalPages ?? Math.ceil((response.total ?? response.data?.length ?? 0) / PAGE_SIZE)));
    } catch (caught) {
      setError((caught as Error).message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchAsset(asset: Asset, update: { name?: string; favorite?: boolean }) {
    setPendingId(asset.id);
    setError('');
    try {
      const response = await api.patch<Asset | { asset: Asset }>(`/api/library/assets/${asset.id}`, update);
      const updated = 'asset' in response ? response.asset : response;
      setAssets((current) => current.map((item) => item.id === asset.id ? updated : item));
      if (preview?.id === asset.id) setPreview(updated);
    } catch (caught) {
      setError((caught as Error).message || t('updateError'));
      throw caught;
    } finally {
      setPendingId(null);
    }
  }

  async function deleteAsset() {
    if (!deleting) return;
    setPendingId(deleting.id);
    setError('');
    try {
      await api.del(`/api/library/assets/${deleting.id}`);
      setAssets((current) => current.filter((asset) => asset.id !== deleting.id));
      setTotal((current) => Math.max(0, current - 1));
      if (preview?.id === deleting.id) setPreview(null);
      setDeleting(null);
    } catch (caught) {
      setError((caught as Error).message || t('deleteError'));
    } finally {
      setPendingId(null);
    }
  }

  function clearFilters() {
    setQ('');
    setDebouncedQ('');
    setKind('');
    setFavorite('');
    setProjectId('');
    setPage(1);
  }

  const hasFilters = Boolean(q || kind || favorite || projectId);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-text-100">{t('title')}</h1>
        <p className="mt-1 text-sm text-text-400">{t('subtitle')}</p>
      </header>

      <Card as="section" className="p-4" aria-label={t('filtersLabel')}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search size={17} className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-text-500" />
            <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchLabel')} className="pe-11" />
          </div>
          <Select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }} aria-label={t('kindFilter')}>
            <option value="">{t('allKinds')}</option>
            <option value="image">{t('image')}</option>
            <option value="video">{t('video')}</option>
          </Select>
          <Select value={favorite} onChange={(event) => { setFavorite(event.target.value); setPage(1); }} aria-label={t('favoriteFilter')}>
            <option value="">{t('allFavorites')}</option>
            <option value="true">{t('favoritesOnly')}</option>
            <option value="false">{t('notFavorite')}</option>
          </Select>
          <Select value={projectId} onChange={(event) => { setProjectId(event.target.value); setPage(1); }} aria-label={t('projectFilter')}>
            <option value="">{t('allProjects')}</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </Select>
          <Button variant="ghost" leftIcon={hasFilters ? <X size={17} /> : <SlidersHorizontal size={17} />} onClick={clearFilters} disabled={!hasFilters}>
            {t('clearFilters')}
          </Button>
        </div>
      </Card>

      {error ? <ErrorNotice onRetry={load} retryLabel={t('retry')}>{error}</ErrorNotice> : null}

      {loading ? (
        <div aria-busy="true" aria-label={t('loading')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[4/5]" />)}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={favorite === 'true' ? <Heart size={26} /> : <Images size={26} />}
          title={hasFilters ? t('emptyFilteredTitle') : t('emptyTitle')}
          description={hasFilters ? t('emptyFilteredDescription') : t('emptyDescription')}
          action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>{t('clearFilters')}</Button> : undefined}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 text-sm text-text-500">
            <span>{t('resultCount', { count: total })}</span>
            <span>{t('pageCount', { page, totalPages })}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                pending={pendingId === asset.id}
                onPreview={() => setPreview(asset)}
                onFavorite={() => patchAsset(asset, { favorite: !asset.favorite })}
                onRename={(name) => patchAsset(asset, { name })}
                onDelete={() => setDeleting(asset)}
              />
            ))}
          </div>
          <nav className="flex items-center justify-center gap-3" aria-label={t('paginationLabel')}>
            <Button variant="secondary" size="sm" leftIcon={<ChevronRight size={16} />} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
              {t('previous')}
            </Button>
            <Button variant="secondary" size="sm" rightIcon={<ChevronLeft size={16} />} disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>
              {t('next')}
            </Button>
          </nav>
        </>
      )}

      {preview ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-bg-950/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t('previewTitle')} onMouseDown={() => setPreview(null)}>
          <div className="relative max-h-full max-w-5xl" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="btn-secondary absolute end-3 top-3 z-10 min-h-10 px-3" aria-label={t('close')} onClick={() => setPreview(null)}>
              <X size={18} />
            </button>
            {preview.kind === 'video' ? (
              <video src={preview.url} controls autoPlay playsInline className="max-h-[85vh] max-w-full rounded-lgx bg-bg-950" />
            ) : (
              <img src={preview.url} alt={preview.name || t('assetAlt')} className="max-h-[85vh] max-w-full rounded-lgx object-contain" />
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('deleteTitle')}
        description={t('deleteDescription', { name: deleting?.name || t('untitled') })}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        pending={Boolean(deleting && pendingId === deleting.id)}
        onConfirm={deleteAsset}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
