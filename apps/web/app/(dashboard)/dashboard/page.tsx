'use client';
// Dashboard home — premium gallery (ref screen 1): search, category chips,
// status filter and a masonry grid of the user's generations, plus compact
// usage stat pills. Same endpoints as before (usage + generations) — the
// filtering/search is purely client-side. No new backend behaviour.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Download,
  Coins,
  Layers,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import GradientArt from '../../../components/ui/GradientArt';

interface Usage {
  total_generations: number;
  total_completed: number;
  total_cost_usd: number;
  by_type: Record<string, { count: number; completed: number; cost_usd: number }>;
}
interface Gen {
  id: number;
  type: 'image' | 'video';
  prompt?: string;
  status: string;
  created_at: string;
  cost?: string | null;
  asset_urls?: string[];
}

type TypeFilter = 'all' | 'image' | 'video';
type StatusFilter = 'all' | 'completed' | 'in_progress' | 'pending' | 'failed';

const statusLabel: Record<string, string> = {
  completed: 'مكتمل',
  pending: 'قيد الانتظار',
  in_progress: 'قيد التوليد',
  failed: 'فشل',
};

function downloadAsset(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Varied-height skeletons so the loading state already looks like a masonry. */
const SKELETON_HEIGHTS = [220, 300, 180, 260, 320, 200, 280, 240];

export default function DashboardHome() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [items, setItems] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, g] = await Promise.all([
          api.get<Usage>('/api/users/me/usage').catch(() => null),
          api.get<{ data: Gen[] }>('/api/generate/generations').catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        if (u) setUsage(u);
        setItems(g.data || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (type !== 'all' && it.type !== type) return false;
      if (status !== 'all' && it.status !== status) return false;
      if (needle && !(it.prompt || '').toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, type, status]);

  const name = user?.name || user?.email?.split('@')[0] || '';

  return (
    <div className="mx-auto max-w-[1440px]">
      {/* Header: greeting + search + stats */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[1.45rem] font-extrabold text-white">أهلًا{name ? `، ${name}` : ' بك'} 👋</h1>
          <p className="mt-0.5 text-sm text-[var(--dz-text-3)]">معرض أعمالك المُولّدة بالذكاء الاصطناعي.</p>
        </div>
        <div className="relative mr-auto w-full max-w-[340px] min-w-[200px]">
          <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--dz-text-3)]" />
          <input
            className="field !min-h-[44px] !rounded-[12px] !py-2.5 !pr-10 text-sm"
            placeholder="ابحث في أعمالك..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="بحث"
          />
        </div>
      </div>

      {/* Stat pills */}
      {usage && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="dz-chip !cursor-default">
            <Layers size={13} className="text-[var(--dz-blue-hover)]" /> {usage.total_generations} توليد
          </span>
          <span className="dz-chip !cursor-default">
            <ImageIcon size={13} className="text-[var(--dz-cyan)]" /> {usage.by_type?.image?.count ?? 0} صورة
          </span>
          <span className="dz-chip !cursor-default">
            <VideoIcon size={13} className="text-[var(--dz-green)]" /> {usage.by_type?.video?.count ?? 0} فيديو
          </span>
          <span className="dz-chip !cursor-default">
            <Coins size={13} className="text-[#ffd166]" /> ${(usage.total_cost_usd ?? 0).toFixed(4)}
          </span>
        </div>
      )}

      {/* Category chips + status filter (ref: All/Abstract/… + Filter dropdown) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="تصفية حسب النوع">
          {(
            [
              { v: 'all', label: 'الكل' },
              { v: 'image', label: 'صور' },
              { v: 'video', label: 'فيديو' },
            ] as { v: TypeFilter; label: string }[]
          ).map((c) => (
            <button
              key={c.v}
              role="tab"
              aria-selected={type === c.v}
              className={`dz-chip ${type === c.v ? 'is-active' : ''}`}
              onClick={() => setType(c.v)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--dz-text-2)]">
          <SlidersHorizontal size={15} className="text-[var(--dz-text-3)]" />
          <select
            className="field !w-auto !min-h-[38px] !rounded-[10px] !px-3 !py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label="تصفية حسب الحالة"
          >
            <option value="all">كل الحالات</option>
            <option value="completed">مكتمل</option>
            <option value="in_progress">قيد التوليد</option>
            <option value="pending">قيد الانتظار</option>
            <option value="failed">فشل</option>
          </select>
        </label>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="dz-masonry">
          {SKELETON_HEIGHTS.map((h, i) => (
            <div key={i} className="dz-mitem" style={{ height: h }}>
              <Skeleton className="h-full w-full !rounded-[18px]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-[22px] border border-[var(--dz-border)]">
          <GradientArt seed={3} className="absolute inset-0 opacity-40" />
          <div className="relative flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[rgba(47,109,246,0.2)] text-[var(--dz-blue-hover)]">
              <Sparkles size={26} />
            </span>
            <h3 className="text-lg font-bold text-white">
              {items.length === 0 ? 'أنشئ أول عمل لك' : 'لا نتائج مطابقة'}
            </h3>
            <p className="max-w-sm text-sm text-[var(--dz-text-2)]">
              {items.length === 0
                ? 'اكتب وصفًا بسيطًا، اختر صورة أو فيديو، وسيتكفّل ORMS بالباقي.'
                : 'جرّب تعديل البحث أو الفلاتر.'}
            </p>
            {items.length === 0 && (
              <Link href="/generate" className="btn-primary mt-2 text-sm">
                <Sparkles size={16} /> افتح المولّد
                <span className="shine" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="dz-masonry">
          {filtered.map((it) => {
            const url = it.asset_urls?.[0];
            const isVideo = it.type === 'video';
            const busy = it.status === 'pending' || it.status === 'in_progress';
            return (
              <article
                key={it.id}
                className="dz-mitem group overflow-hidden rounded-[18px] border border-[var(--dz-border)] bg-[var(--dz-card)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--dz-border-strong)] hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
              >
                <div className="relative bg-[var(--dz-panel)]">
                  {url ? (
                    isVideo ? (
                      <video src={url} muted playsInline loop preload="metadata" className="block w-full" />
                    ) : (
                      // Natural height so the masonry flows like the reference
                      <img src={url} alt={it.prompt || 'عمل مولّد'} loading="lazy" className="block w-full" />
                    )
                  ) : (
                    <GradientArt seed={it.id} className="aspect-[4/5] w-full">
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/80">
                        {busy ? <Loader2 size={22} className="spin-slow" /> : <ImageIcon size={22} />}
                        <span className="text-xs font-semibold">{statusLabel[it.status] || it.status}</span>
                      </div>
                    </GradientArt>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <Badge tone={isVideo ? 'cyan' : 'default'}>
                      {isVideo ? <VideoIcon size={11} /> : <ImageIcon size={11} />}
                      {isVideo ? 'فيديو' : 'صورة'}
                    </Badge>
                  </div>
                  {it.status === 'failed' && (
                    <div className="absolute left-2 top-2">
                      <Badge tone="danger">فشل</Badge>
                    </div>
                  )}
                  {url && it.status === 'completed' && (
                    <button
                      onClick={() => downloadAsset(url, `orms-${it.id}${isVideo ? '.mp4' : '.png'}`)}
                      title="تنزيل"
                      aria-label="تنزيل"
                      className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-[10px] bg-black/65 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Download size={13} /> تنزيل
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2.5 p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2f6df6,#28d7ff)] text-[0.65rem] font-bold text-white">
                    {(user?.email?.[0] || 'U').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p dir="rtl" className="truncate text-xs font-semibold text-[#dbe0ef]">{it.prompt || '—'}</p>
                    <p className="mt-0.5 text-[0.68rem] text-[var(--dz-text-3)]">
                      {new Date(it.created_at).toLocaleDateString('ar', { dateStyle: 'medium' })}
                      {it.cost != null && <> · ${Number(it.cost).toFixed(4)}</>}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
