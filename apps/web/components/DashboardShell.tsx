'use client';
// Dashboard shell — premium navy media-studio layout (ref screen 1):
// RTL sidebar (right) with logo + blue Create CTA + nav, breadcrumb top bar
// with user chip + locale switcher, mobile drawer. Auth/logout/navigation
// behaviour unchanged. All customer-facing strings come from next-intl catalogs
// (`nav`, `shell`, `locale` namespaces); mixed-script English (emails) keeps
// explicit `dir="ltr"` wrappers.
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Home, Wand2, Images, Settings, LogOut, Menu, X, Plus, ChevronLeft, FolderKanban, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './ui/Logo';
import { SUPPORTED_LOCALES, type Locale } from '../i18n/locale';

// Nav items map routes → catalog keys (`nav.*`) + icons. Only the label is
// localized; the route + icon mapping is structural.
const navItems = [
  { to: '/dashboard', key: 'dashboard', icon: Home },
  { to: '/generate', key: 'generate', icon: Wand2 },
  { to: '/projects', key: 'projects', icon: FolderKanban },
  { to: '/assets', key: 'assets', icon: Images },
  { to: '/history', key: 'history', icon: History },
  { to: '/settings', key: 'settings', icon: Settings },
] as const;

// Breadcrumb segment → `shell.crumb_*` key.
const crumbKeys: Record<string, string> = {
  '/dashboard': 'crumb_dashboard',
  '/generate': 'crumb_generate',
  '/projects': 'crumb_projects',
  '/assets': 'crumb_assets',
  '/history': 'crumb_history',
  '/settings': 'crumb_settings',
};

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const t_nav = useTranslations('nav');
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.to || pathname.startsWith(`${it.to}/`);
        return (
          <Link
            key={it.to}
            href={it.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`dz-nav-item ${active ? 'is-active' : ''}`}
          >
            <Icon size={18} /> {t_nav(it.key)}
          </Link>
        );
      })}
    </nav>
  );
}

// Compact segmented locale switcher (ar ↔ en). Persists via POST /api/locale
// (sets the NEXT_LOCALE cookie), then `router.refresh()` re-renders the server
// root layout so `<html lang dir>` flips. Token-driven styling (no stray hex),
// inherits the global cyan `:focus-visible` ring (globals.css §16).
function LocaleSwitcher() {
  const t_locale = useTranslations('locale');
  const current = useLocale() as Locale;
  const router = useRouter();
  const [pending, setPending] = useState<Locale | null>(null);

  async function switchTo(next: Locale) {
    if (next === current || pending) return;
    setPending(next);
    try {
      const res = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      if (!res.ok) throw new Error('locale set failed');
      // Re-render server components (root layout re-reads the cookie → dir flip).
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div
      role="group"
      aria-label={t_locale('switchTo')}
      className="flex items-center rounded-[10px] border border-[var(--dz-border)] bg-[rgba(255,255,255,0.03)] p-0.5"
    >
      {SUPPORTED_LOCALES.map((loc) => {
        const active = loc === current;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => switchTo(loc)}
            disabled={active || pending !== null}
            aria-pressed={active}
            aria-label={t_locale('switchTo') + ' — ' + t_locale(loc)}
            className={`min-w-[34px] rounded-[8px] px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-default ${
              active
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--dz-text-2)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
            }`}
          >
            {t_locale(loc)}
          </button>
        );
      })}
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t_shell = useTranslations('shell');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function doLogout() {
    logout();
    router.push('/auth');
  }

  const crumbKey = Object.entries(crumbKeys).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1];
  const crumb = crumbKey ? t_shell(crumbKey) : '';

  const SidebarInner = (
    <>
      <div className="px-5 pb-4 pt-5">
        <Logo href="/dashboard" subtitle="Media Studio" />
      </div>
      <div className="px-3 pb-2">
        <Link href="/generate" className="btn-primary w-full !min-h-[46px] text-sm">
          <Plus size={17} /> {t_shell('createNew')}
          <span className="shine" />
        </Link>
      </div>
      <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
      <div className="border-t border-[var(--dz-border)] p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2f6df6,#28d7ff)] text-sm font-bold text-white">
            {(user?.email?.[0] || 'U').toUpperCase()}
          </span>
          <span dir="ltr" className="truncate text-end text-xs text-[var(--dz-text-2)]">
            {user?.email}
          </span>
        </div>
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-[var(--dz-border)] bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[#fda4af] transition-colors hover:bg-[rgba(255,91,110,0.08)]"
        >
          <LogOut size={16} /> {t_shell('logout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="dz flex min-h-screen">
      {/* Desktop sidebar — first child renders on the right in RTL */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-e border-[var(--dz-border)] bg-[var(--dz-sidebar)] lg:flex">
        {SidebarInner}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: mobile menu + breadcrumb, locale switcher + user avatar at the end */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-[var(--dz-border)] bg-[rgba(23,26,44,0.72)] px-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="btn-ghost !p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={t_shell('openMenu')}
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="lg:hidden">
              <Logo href="/dashboard" showText={false} size={32} />
            </span>
            {/* Breadcrumb (ref screens 2–3) */}
            <div className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
              <Link href="/dashboard" className="flex items-center gap-1.5 text-[var(--dz-text-3)] transition-colors hover:text-white">
                <Home size={15} /> {t_shell('breadcrumbHome')}
              </Link>
              {crumb && pathname !== '/dashboard' && (
                <>
                  <ChevronLeft size={14} className="text-[var(--dz-text-3)]" />
                  <span className="truncate font-semibold text-white">{crumb}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <LocaleSwitcher />
            <span dir="ltr" className="hidden max-w-[200px] truncate text-xs text-[var(--dz-text-2)] md:block">
              {user?.email}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#2f6df6,#28d7ff)] text-sm font-bold text-white">
              {(user?.email?.[0] || 'U').toUpperCase()}
            </span>
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
            <aside className="fixed inset-y-0 start-0 z-50 flex w-[260px] flex-col border-e border-[var(--dz-border)] bg-[var(--dz-sidebar)] lg:hidden">
              <div className="flex items-center justify-end px-3 pt-3">
                <button className="btn-ghost !p-2" onClick={() => setOpen(false)} aria-label={t_shell('closeMenu')}>
                  <X size={20} />
                </button>
              </div>
              {SidebarInner}
            </aside>
          </>
        )}

        <main className="main-content flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
