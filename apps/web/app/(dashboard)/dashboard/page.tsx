'use client';
// Dashboard home — usage stats (GET /api/users/me/usage) + recent generations.
// Read-only aggregation of existing endpoints; no new backend behaviour.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Coins,
  CheckCircle2,
  Layers,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/ui/Card';
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
  asset_urls?: string[];
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-mdx" style={{ background: tone }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-display text-2xl font-extrabold text-text-100">{value}</div>
        <div className="text-sm text-text-500">{label}</div>
      </div>
    </Card>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [recent, setRecent] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);

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
        setRecent((g.data || []).slice(0, 8));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const name = user?.name || user?.email?.split('@')[0] || '';
  const images = usage?.by_type?.image?.count ?? 0;
  const videos = usage?.by_type?.video?.count ?? 0;

  return (
    <div className="mx-auto max-w-[1280px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.7rem] font-extrabold text-text-100">
            أهلًا{name ? `، ${name}` : ' بك'} 👋
          </h1>
          <p className="mt-1 text-sm text-text-400">نظرة سريعة على نشاطك الإبداعي في ORMS.</p>
        </div>
        <Link href="/generate" className="btn-primary text-sm">
          <Sparkles size={16} /> أنشئ مشروع جديد
          <span className="shine" />
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Layers size={22} className="text-primary-400" />}
            label="إجمالي التوليدات"
            value={String(usage?.total_generations ?? 0)}
            tone="rgba(134,79,242,0.14)"
          />
          <StatCard
            icon={<ImageIcon size={22} className="text-blue-500" />}
            label="صور تم توليدها"
            value={String(images)}
            tone="rgba(81,149,237,0.14)"
          />
          <StatCard
            icon={<VideoIcon size={22} className="text-cyan-500" />}
            label="فيديوهات تم توليدها"
            value={String(videos)}
            tone="rgba(54,196,240,0.14)"
          />
          <StatCard
            icon={<Coins size={22} className="text-warning-500" />}
            label="إجمالي التكلفة"
            value={`$${(usage?.total_cost_usd ?? 0).toFixed(4)}`}
            tone="rgba(255,179,92,0.14)"
          />
        </div>
      )}

      {/* Quick generator banner */}
      <Card featured className="relative mt-6 overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-extrabold text-text-100">جاهز لصنع شيء جديد؟</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-400">
              اكتب وصفًا بسيطًا، اختر صورة أو فيديو، وسيتكفّل ORMS بالباقي.
            </p>
          </div>
          <Link href="/generate" className="btn-primary text-sm">
            <Wand2 size={16} /> افتح المولّد
            <span className="shine" />
          </Link>
        </div>
      </Card>

      {/* Recent */}
      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-text-100">أحدث الأعمال</h2>
        <Link href="/history" className="flex items-center gap-1 text-sm font-semibold text-primary-400 hover:text-primary-500">
          عرض الكل <ArrowLeft size={15} />
        </Link>
      </div>

      {loading ? (
        <div className="history-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3]" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[rgba(134,79,242,0.14)] text-primary-400">
            <Sparkles size={26} />
          </span>
          <h3 className="text-lg font-bold text-text-100">ابدأ أول مشروع إبداعي لك</h3>
          <p className="max-w-sm text-sm text-text-500">اكتب وصفًا بسيطًا، اختر صورة أو فيديو، وسيقوم ORMS بالباقي.</p>
          <Link href="/generate" className="btn-primary mt-2 text-sm">
            <Sparkles size={16} /> افتح المولّد
          </Link>
        </Card>
      ) : (
        <div className="history-grid">
          {recent.map((it) => {
            const url = it.asset_urls?.[0];
            const isVideo = it.type === 'video';
            return (
              <Card key={it.id} hover className="overflow-hidden p-0">
                <div className="relative aspect-[4/3] bg-bg-950">
                  {url ? (
                    isVideo ? (
                      <video src={url} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      <img src={url} alt={it.prompt || ''} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <GradientArt seed={it.id} className="h-full w-full" />
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge tone={isVideo ? 'cyan' : 'default'}>
                      {isVideo ? <VideoIcon size={11} /> : <ImageIcon size={11} />}
                    </Badge>
                  </div>
                </div>
                <div className="p-3">
                  <p dir="rtl" className="truncate text-xs text-text-400">{it.prompt || '—'}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
