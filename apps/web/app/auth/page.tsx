'use client';
// Auth (login / register). UI redesigned on the ORMS design system; auth logic
// (useAuth login/register + redirect) is unchanged.
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import { Field, Input } from '../../components/ui/Field';

export default function AuthPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
      router.push('/generate');
    } catch (err) {
      setError((err as Error).message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade opacity-60" />
      <div aria-hidden className="glow-orb h-[420px] w-[420px] -top-24 right-[-10%] animate-drift-gradient" />
      <div
        aria-hidden
        className="glow-orb h-80 w-80 bottom-[-10%] left-[-8%] animate-float-slow"
        style={{ background: 'radial-gradient(circle, rgba(54,196,240,0.2), transparent 70%)' }}
      />

      <Card className="relative w-full max-w-[440px] p-8 sm:p-10">
        <div className="mb-7 text-center">
          <div
            className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[22px] font-display text-2xl font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg,#864FF2,#5195ED 55%,#36C4F0)', boxShadow: '0 18px 45px rgba(134,79,242,0.4)' }}
          >
            OR
          </div>
          <h1 className="font-display text-2xl font-extrabold">
            <span className="gradient-text">استوديو الصور والفيديو</span>
          </h1>
          <p className="mt-1.5 text-sm text-text-400">بدفعة واحدة عبر OpenRouter</p>
        </div>

        <Tabs
          ariaLabel="نوع الحساب"
          className="mb-6"
          value={mode}
          onChange={setMode}
          items={[
            { value: 'login', label: 'دخول' },
            { value: 'register', label: 'حساب جديد' },
          ]}
        />

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <Field label="الاسم (اختياري)" htmlFor="name">
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="لقمان" />
            </Field>
          )}
          <Field label="البريد الإلكتروني" htmlFor="email">
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="كلمة المرور" htmlFor="password">
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>

          {error && (
            <div className="flex items-center gap-2 rounded-mdx border border-[rgba(255,92,122,0.3)] bg-[rgba(255,92,122,0.12)] px-3.5 py-3 text-sm text-[#fda4af]">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading} className="mt-1" rightIcon={<ArrowRight size={18} />}>
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            <span className="shine" />
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-text-500">
          ⚡ النماذج الخلفية: Stable Diffusion • Flux • Veo • Sora • Wan • Kling
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-text-400 transition-colors hover:text-text-100">
            ← العودة للصفحة الرئيسية
          </Link>
        </p>
      </Card>
    </div>
  );
}
