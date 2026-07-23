'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Heart, Pencil, Save, Trash2, X } from 'lucide-react';
import type { Asset } from '../../lib/studio-types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Input } from '../ui/Field';

export default function AssetCard({
  asset,
  pending,
  onPreview,
  onFavorite,
  onRename,
  onDelete,
}: {
  asset: Asset;
  pending: boolean;
  onPreview: () => void;
  onFavorite: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
}) {
  const t = useTranslations('assets');
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(asset.name || '');

  async function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onRename(name.trim());
    setRenaming(false);
  }

  return (
    <Card as="article" hover className="group overflow-hidden">
      <button
        type="button"
        onClick={onPreview}
        className="relative block aspect-square w-full overflow-hidden bg-bg-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
        aria-label={t('previewAsset', { name: asset.name || t('untitled') })}
      >
        {asset.kind === 'video' ? (
          <video src={asset.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <img src={asset.url} alt={asset.name || t('assetAlt')} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-bg-950/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-900/90 text-text-100"><Eye size={20} /></span>
        </span>
        <span className="absolute end-3 top-3">
          <Badge tone={asset.kind === 'video' ? 'cyan' : 'default'}>{asset.kind === 'video' ? t('video') : t('image')}</Badge>
        </span>
      </button>

      <div className="p-4">
        {renaming ? (
          <form onSubmit={submitRename}>
            <label className="lbl" htmlFor={`asset-name-${asset.id}`}>{t('renameLabel')}</label>
            <Input
              id={`asset-name-${asset.id}`}
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              disabled={pending}
            />
            <div className="mt-3 flex gap-2">
              <Button type="submit" size="sm" leftIcon={<Save size={15} />} loading={pending} disabled={!name.trim()}>{t('save')}</Button>
              <Button type="button" size="sm" variant="ghost" leftIcon={<X size={15} />} disabled={pending} onClick={() => setRenaming(false)}>{t('cancel')}</Button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="truncate text-sm font-semibold text-text-100">{asset.name || t('untitled')}</h2>
            <p className="mt-1 text-xs text-text-500">{new Date(asset.created_at).toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                className={`btn-ghost p-2 ${asset.favorite ? 'text-danger-500' : ''}`}
                onClick={onFavorite}
                disabled={pending}
                aria-pressed={asset.favorite}
                aria-label={asset.favorite ? t('unfavorite') : t('favorite')}
              >
                <Heart size={17} fill={asset.favorite ? 'currentColor' : 'none'} />
              </button>
              <button type="button" className="btn-ghost p-2" onClick={() => setRenaming(true)} disabled={pending} aria-label={t('rename')}>
                <Pencil size={17} />
              </button>
              <button type="button" className="btn-ghost p-2 text-danger-500" onClick={onDelete} disabled={pending} aria-label={t('delete')}>
                <Trash2 size={17} />
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
