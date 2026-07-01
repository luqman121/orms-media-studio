'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';

const links = [
  { href: '#features', label: 'المميزات' },
  { href: '#gallery', label: 'المعرض' },
  { href: '#pricing', label: 'الباقات' },
  { href: '#faq', label: 'الأسئلة' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-bg-950/70 backdrop-blur-xl border-b border-[rgba(169,154,241,0.10)]' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-mdx px-3.5 py-2 text-sm font-semibold text-text-400 transition-colors hover:bg-[rgba(169,154,241,0.08)] hover:text-text-100"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/auth" className="btn-ghost px-4 py-2 text-sm">
            تسجيل الدخول
          </Link>
          <Link href="/generate" className="btn-primary !min-h-[44px] !px-5 text-sm">
            ابدأ الآن
          </Link>
        </div>

        <button
          className="btn-ghost md:hidden !p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="mx-4 mb-3 rounded-lgx border border-[rgba(169,154,241,0.14)] bg-surface-900/95 p-3 backdrop-blur-xl md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-mdx px-3 py-2.5 text-sm font-semibold text-text-200 hover:bg-[rgba(169,154,241,0.08)]"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex gap-2 border-t border-[rgba(169,154,241,0.10)] pt-3">
            <Link href="/auth" className="btn-secondary flex-1 !min-h-[44px] text-sm">
              دخول
            </Link>
            <Link href="/generate" className="btn-primary flex-1 !min-h-[44px] text-sm">
              ابدأ الآن
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
