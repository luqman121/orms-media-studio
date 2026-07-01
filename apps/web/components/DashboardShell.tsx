'use client';
// Dashboard shell: right-aligned RTL sidebar (DESIGN.md §9.7) + top bar.
// Auth/logout/navigation behaviour is unchanged from the original port.
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Wand2, History, Settings, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './ui/Logo';

const navItems = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/generate', label: 'المولّد', icon: Wand2 },
  { to: '/history', label: 'السجل', icon: History },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1.5 p-3">
      {navItems.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            href={it.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex h-[46px] items-center gap-3 rounded-[14px] px-3.5 text-[0.95rem] font-semibold transition-all ${
              active
                ? 'border border-[rgba(134,79,242,0.28)] bg-[linear-gradient(135deg,rgba(134,79,242,0.22),rgba(54,196,240,0.10))] text-text-100 shadow-[0_0_25px_rgba(134,79,242,0.15)]'
                : 'border border-transparent text-text-400 hover:bg-[rgba(169,154,241,0.06)] hover:text-text-100'
            }`}
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

  const UserFooter = (
    <div className="border-t border-[rgba(169,154,241,0.10)] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-white">
          {(user?.email?.[0] || 'U').toUpperCase()}
        </span>
        <span dir="ltr" className="truncate text-right text-xs text-text-400">
          {user?.email}
        </span>
      </div>
      <button
        onClick={doLogout}
        className="flex w-full items-center gap-2.5 rounded-mdx border border-[rgba(169,154,241,0.14)] bg-transparent px-3.5 py-2.5 text-sm font-semibold text-[#fda4af] transition-colors hover:bg-[rgba(255,92,122,0.08)]"
      >
        <LogOut size={16} /> تسجيل الخروج
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-row-reverse">
      {/* Desktop sidebar (right for RTL) */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-l border-[rgba(169,154,241,0.10)] bg-[linear-gradient(180deg,#100C1B,#07040D)] lg:flex">
        <div className="flex h-[72px] items-center border-b border-[rgba(169,154,241,0.10)] px-5">
          <Logo href="/dashboard" />
        </div>
        <NavList pathname={pathname} />
        {UserFooter}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-[rgba(169,154,241,0.10)] bg-bg-950/70 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost !p-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="القائمة"
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="lg:hidden">
              <Logo href="/dashboard" showText={false} size={36} />
            </span>
          </div>
          <Link href="/generate" className="btn-primary !min-h-[42px] !px-4 text-sm">
            <Sparkles size={16} /> توليد جديد
            <span className="shine" />
          </Link>
        </header>

        {/* Mobile drawer */}
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-[260px] flex-col border-l border-[rgba(169,154,241,0.14)] bg-[linear-gradient(180deg,#100C1B,#07040D)] lg:hidden">
              <div className="flex h-[64px] items-center justify-between border-b border-[rgba(169,154,241,0.10)] px-4">
                <Logo href="/dashboard" size={36} />
                <button className="btn-ghost !p-2" onClick={() => setOpen(false)} aria-label="إغلاق">
                  <X size={20} />
                </button>
              </div>
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
              {UserFooter}
            </aside>
          </>
        )}

        <main className="main-content flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
