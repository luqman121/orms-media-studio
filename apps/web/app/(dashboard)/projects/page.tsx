'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, FolderKanban, Pencil, Plus, Save, X } from 'lucide-react';
import { api } from '../../../lib/api';
import type { Project } from '../../../lib/studio-types';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Field';
import Skeleton from '../../../components/ui/Skeleton';
import { EmptyState, ErrorNotice } from '../../../components/ui/StudioStates';

type ProjectListResponse = { data?: Project[]; projects?: Project[] };

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<ProjectListResponse>('/api/projects');
      setProjects(response.data ?? response.projects ?? []);
    } catch (caught) {
      setError((caught as Error).message || t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post<Project | { project: Project }>('/api/projects', { name: trimmed });
      const project = 'project' in response ? response.project : response;
      setProjects((current) => [project, ...current]);
      setName('');
      setSuccess(t('createSuccess'));
    } catch (caught) {
      setError((caught as Error).message || t('createError'));
    } finally {
      setCreating(false);
    }
  }

  function startRename(project: Project) {
    setEditingId(project.id);
    setEditingName(project.name);
    setSuccess('');
  }

  async function renameProject(event: FormEvent, id: number) {
    event.preventDefault();
    const trimmed = editingName.trim();
    if (!trimmed || savingId !== null) return;
    setSavingId(id);
    setError('');
    setSuccess('');
    try {
      const response = await api.patch<Project | { project: Project }>(`/api/projects/${id}`, { name: trimmed });
      const project = 'project' in response ? response.project : response;
      setProjects((current) => current.map((item) => item.id === id ? project : item));
      setEditingId(null);
      setSuccess(t('renameSuccess'));
    } catch (caught) {
      setError((caught as Error).message || t('renameError'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-text-100">{t('title')}</h1>
        <p className="mt-1 text-sm text-text-400">{t('subtitle')}</p>
      </header>

      <Card as="section" featured className="p-5">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createProject}>
          <div className="min-w-0 flex-1">
            <label className="lbl" htmlFor="project-name">{t('nameLabel')}</label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={120}
              disabled={creating}
            />
          </div>
          <Button type="submit" leftIcon={<Plus size={18} />} loading={creating} disabled={!name.trim()}>
            {t('create')}
          </Button>
        </form>
      </Card>

      {error ? <ErrorNotice onRetry={load} retryLabel={t('retry')}>{error}</ErrorNotice> : null}
      {success ? (
        <div role="status" className="flex items-center gap-2 rounded-mdx border border-success-500/30 bg-success-500/10 p-4 text-sm text-success-500">
          <CheckCircle2 size={18} /> {success}
        </div>
      ) : null}

      {loading ? (
        <div aria-busy="true" aria-label={t('loading')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-48" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={26} />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} as="article" hover className="flex min-h-48 flex-col p-5">
              {editingId === project.id ? (
                <form onSubmit={(event) => renameProject(event, project.id)} className="flex h-full flex-col gap-4">
                  <div>
                    <label className="lbl" htmlFor={`project-${project.id}-name`}>{t('renameLabel')}</label>
                    <Input
                      id={`project-${project.id}-name`}
                      autoFocus
                      maxLength={120}
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      disabled={savingId === project.id}
                    />
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button type="submit" size="sm" leftIcon={<Save size={15} />} loading={savingId === project.id} disabled={!editingName.trim()}>
                      {t('save')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" leftIcon={<X size={15} />} disabled={savingId === project.id} onClick={() => setEditingId(null)}>
                      {t('cancel')}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-mdx bg-primary-500/15 text-primary-400">
                      <FolderKanban size={22} />
                    </span>
                    <button type="button" className="btn-ghost p-2" onClick={() => startRename(project)} aria-label={t('renameProject', { name: project.name })}>
                      <Pencil size={16} />
                    </button>
                  </div>
                  <h2 className="mt-4 truncate text-lg font-bold text-text-100">{project.name}</h2>
                  <p className="mt-1 text-xs text-text-500">
                    {t('updatedAt', { date: new Date(project.updated_at).toLocaleDateString() })}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5 text-xs text-text-400">
                    {project.asset_count != null ? <span>{t('assetCount', { count: project.asset_count })}</span> : null}
                    {project.generation_count != null ? <span>{t('generationCount', { count: project.generation_count })}</span> : null}
                  </div>
                  <Link href={`/projects/${project.id}`} className="btn-secondary mt-4 min-h-10 px-4 text-sm">
                    {t('open')}
                  </Link>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
