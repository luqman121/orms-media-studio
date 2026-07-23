'use client';
// Settings & usage — read-only account details + spend summary from existing
// endpoints (GET /api/users/me/usage). No billing backend; upgrade CTA is marketing.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { User, Mail, Calendar, LogOut, Image as ImageIcon, Video as VideoIcon, Coins, Crown } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';

interface Usage {
  total_generations: number;
  total_completed: number;
  total_cost_usd: number;
  by_type: Record<string, { count: number; completed: number; cost_usd: number }>;
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[rgba(169,154,241,0.10)] py-3.5 last:border-0">
      <span className="flex items-center gap-2.5 text-sm text-text-400">
        {icon} {label}
      </span>
      <span dir="ltr" className="truncate text-sm font-semibold text-text-100">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { user, logout } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Usage>('/api/users/me/usage')
      .then(setUsage)
      .catch(() => setUsage(null))
      .finally(() => setLoading(false));
  }, []);

  function doLogout() {
    logout();
    router.push('/auth');
  }

  const created = user?.created_at ? new Date(user.created_at).toLocaleDateString('ar', { dateStyle: 'long' }) : '—';

  return (
    <div className="mx-auto max-w-[840px]">
      <div className="mb-6">
        <h1 className="font-display text-[1.7rem] font-extrabold text-text-100">{t('title')}</h1>
        <p className="mt-1 text-sm text-text-400">{t('subtitle')}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Account */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-lg font-bold text-white">
              {(user?.email?.[0] || 'U').toUpperCase()}
            </span>
            <div>
              <div className="font-bold text-text-100">{user?.name || t('defaultName')}</div>
              <Badge tone="cyan" className="mt-1">{t('activeAccount')}</Badge>
            </div>
          </div>
          <Row icon={<User size={16} />} label={t('name')} value={user?.name || '—'} />
          <Row icon={<Mail size={16} />} label={t('email')} value={user?.email || '—'} />
          <Row icon={<Calendar size={16} />} label={t('joined')} value={created} />
          <Button variant="danger" fullWidth className="mt-5" onClick={doLogout} leftIcon={<LogOut size={16} />}>
            {t('logout')}
          </Button>
        </Card>

        {/* Usage */}
        <Card className="p-6">
          <h2 className="mb-4 font-bold text-text-100">{t('usageTitle')}</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <>
              <Row
                icon={<ImageIcon size={16} className="text-blue-500" />}
                label={t('images')}
                value={String(usage?.by_type?.image?.count ?? 0)}
              />
              <Row
                icon={<VideoIcon size={16} className="text-cyan-500" />}
                label={t('videos')}
                value={String(usage?.by_type?.video?.count ?? 0)}
              />
              <Row
                icon={<Coins size={16} className="text-warning-500" />}
                label={t('totalCost')}
                value={`$${(usage?.total_cost_usd ?? 0).toFixed(4)}`}
              />
              <Row
                icon={<Crown size={16} className="text-primary-400" />}
                label={t('completedOps')}
                value={`${usage?.total_completed ?? 0} / ${usage?.total_generations ?? 0}`}
              />
            </>
          )}
        </Card>
      </div>

      {/* Upgrade */}
      <Card featured className="relative mt-5 overflow-hidden p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-text-100">{t('upgradeTitle')}</h2>
            <p className="mt-1 text-sm text-text-400">{t('upgradeDesc')}</p>
          </div>
          <Link href="/#pricing" className="btn-primary text-sm">
            <Crown size={16} /> {t('viewPlans')}
            <span className="shine" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
