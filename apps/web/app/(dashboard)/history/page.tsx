'use client';
// History / recent generations. UI restyled; data flow (list, filter, delete,
// download) unchanged and uses the same endpoints.
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trash2, Download, Loader2, Image as ImageIcon, Video as VideoIcon, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';

interface HistoryItem {
  id: number;
  type: 'image' | 'video';
  prompt?: string;
  status: string;
  created_at: string;
  asset_urls?: string[];
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = filter !== 'all' ? `?type=${filter}` : '';
      const d = await api.get<{ data: HistoryItem[] }>(`/api/generate/generations${qs}`);
      setItems(d.data || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm('متأكد من الحذف؟')) return;
    try {
      await api.del(`/api/generate/generations/${id}`);
      setItems(items.filter((i) => i.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function downloadAsset(url: string, name: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  const statusLabel: Record<string, string> = {
    completed: 'مكتمل',
    pending: 'قيد الانتظار',
    in_progress: 'قيد التوليد',
    failed: 'فشل',
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.7rem] font-extrabold text-text-100">السجل</h1>
          <p className="mt-1 text-sm text-text-400">كل أعمالك المُولّدة في مكان واحد.</p>
        </div>
        <Tabs
          ariaLabel="تصفية"
          value={filter}
          onChange={setFilter}
          className="!w-auto"
          items={[
            { value: 'all', label: 'الكل' },
            { value: 'image', label: 'صور' },
            { value: 'video', label: 'فيديو' },
          ]}
        />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-mdx border border-[rgba(255,92,122,0.3)] bg-[rgba(255,92,122,0.1)] px-3.5 py-3 text-sm text-[#fda4af]">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="history-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[rgba(134,79,242,0.14)] text-primary-400">
            <Sparkles size={26} />
          </span>
          <h3 className="text-lg font-bold text-text-100">لا توجد نتائج بعد</h3>
          <p className="max-w-sm text-sm text-text-500">ابدأ بكتابة أول Prompt لك من المولّد وستظهر أعمالك هنا.</p>
          <Link href="/generate" className="btn-primary mt-2 text-sm">
            <Sparkles size={16} /> افتح المولّد
          </Link>
        </Card>
      ) : (
        <div className="history-grid">
          {items.map((it) => {
            const previewUrl = it.asset_urls?.[0];
            const isVideo = it.type === 'video';
            const busy = it.status === 'pending' || it.status === 'in_progress';
            return (
              <Card key={it.id} hover className="flex flex-col gap-2.5 p-2.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-mdx bg-bg-950">
                  {previewUrl ? (
                    isVideo ? (
                      <video src={previewUrl} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      <img src={previewUrl} alt={it.prompt} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-text-500">
                      {busy ? <Loader2 size={24} className="spin-slow" /> : <ImageIcon size={24} />}
                      <div className="text-xs">{statusLabel[it.status] || it.status}</div>
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge tone={isVideo ? 'cyan' : 'default'}>
                      {isVideo ? <VideoIcon size={11} /> : <ImageIcon size={11} />}
                    </Badge>
                  </div>
                  {busy && (
                    <div className="absolute left-2 top-2">
                      <Badge tone="warning">{statusLabel[it.status]}</Badge>
                    </div>
                  )}
                </div>

                <p dir="rtl" className="truncate px-1 text-sm text-text-400">{it.prompt || '—'}</p>

                <div className="flex items-center justify-between px-1" dir="ltr">
                  <span className="text-[0.7rem] text-text-500">
                    {new Date(it.created_at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <div className="flex gap-1.5">
                    {previewUrl && it.status === 'completed' && (
                      <button
                        onClick={() => downloadAsset(previewUrl, `orms-${it.id}${isVideo ? '.mp4' : '.png'}`)}
                        title="تنزيل"
                        aria-label="تنزيل"
                        className="rounded-mdx border border-[rgba(134,79,242,0.3)] bg-[rgba(134,79,242,0.15)] p-1.5 text-text-100 transition-colors hover:bg-[rgba(134,79,242,0.25)]"
                      >
                        <Download size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(it.id)}
                      title="حذف"
                      aria-label="حذف"
                      className="rounded-mdx border border-[rgba(255,92,122,0.25)] bg-[rgba(255,92,122,0.1)] p-1.5 text-[#fda4af] transition-colors hover:bg-[rgba(255,92,122,0.2)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
