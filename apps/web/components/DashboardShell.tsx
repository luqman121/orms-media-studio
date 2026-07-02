'use client';
// Dashboard shell — premium navy media-studio layout (ref screen 1):
// RTL sidebar (right) with logo + blue Create CTA + nav, breadcrumb top bar
// with user chip, mobile drawer. Auth/logout/navigation behaviour unchanged.
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Wand2, Images, Settings, LogOut, Menu, X, Plus, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './ui/Logo';

const navItems = [
  { to: '/dashboard', label: 'الرئيسية', icon: Home },
  { to: '/generate', label: 'المولّد', icon: Wand2 },
  { to: '/history', label: 'المعرض', icon: Images },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

const crumbLabels: Record<string, string> = {
  '/dashboard': 'الرئيسية',
  '/generate': 'إنشاء',
  '/history': 'المعرض',
  '/settings': 'الإعدادات',
};

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            href={it.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`dz-nav-item ${active ? 'is-active' : ''}`}
          >
            <Icon size={18} /> {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function doLogout() {
    logout();
    router.push('/auth');
  }

  const crumb = crumbLabels[pathname] || '';

  const SidebarInner = (
    <>
      <div className="px-5 pb-4 pt-5">
        <Logo href="/dashboard" subtitle="Media Studio" />
      </div>
      <div className="px-3 pb-2">
        <Link href="/generate" className="btn-primary w-full !min-h-[46px] text-sm">
          <Plus size={17} /> إنشاء جديد
          <span className="shine" />
        </Link>
      </div>
      <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
      <div className="border-t border-[var(--dz-border)] p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2f6df6,#28d7ff)] text-sm font-bold text-white">
            {(user?.email?.[0] || 'U').toUpperCase()}
          </span>
          <span dir="ltr" className="truncate text-right text-xs text-[var(--dz-text-2)]">
            {user?.email}
          </span>
        </div>
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-[var(--dz-border)] bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[#fda4af] transition-colors hover:bg-[rgba(255,91,110,0.08)]"
        >
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <div className="dz flex min-h-screen">
      {/* Desktop sidebar — first child renders on the right in RTL */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-l border-[var(--dz-border)] bg-[var(--dz-sidebar)] lg:flex">
        {SidebarInner}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: mobile menu + breadcrumb, user avatar at the end */}
        <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-[var(--dz-border)] bg-[rgba(23,26,44,0.72)] px-4 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="btn-ghost !p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="القائمة"
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
                <Home size={15} /> الرئيسية
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
            <aside className="fixed inset-y-0 right-0 z-50 flex w-[260px] flex-col border-l border-[var(--dz-border)] bg-[var(--dz-sidebar)] lg:hidden">
              <div className="flex items-center justify-end px-3 pt-3">
                <button className="btn-ghost !p-2" onClick={() => setOpen(false)} aria-label="إغلاق">
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
