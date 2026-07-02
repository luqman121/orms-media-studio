import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
      nav('/generate');
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'1.2rem' }}>
      <div className="glass auth-card" style={{ width:'100%', maxWidth:430 }}>
        <div style={{ textAlign:'center', marginBottom:'1.8rem' }}>
          <div style={{ width:64, height:64, margin:'0 auto 1rem', borderRadius:20,
            background:'linear-gradient(120deg,#7c3aed,#22d3ee)', display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:'1.8rem', color:'white', boxShadow:'0 12px 36px rgba(124,58,237,0.5)' }}>ORMS</div>
          <h1 style={{ fontSize:'1.6rem', margin:'0 0 0.3rem', fontWeight:800 }}>
            <span className="gradient-text">استوديو الصور والفيديو</span>
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.92rem' }}>بدفعًا واحدًا عبر OpenRouter</p>
        </div>

        <div style={{ display:'flex', background:'rgba(15,13,28,0.6)', padding:4, borderRadius:14, marginBottom:'1.4rem' }}>
          <button onClick={()=>{setMode('login'); setError('');}} style={{flex:1, padding:'0.6rem', borderRadius:11, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.9rem',
            background: mode==='login' ? 'linear-gradient(120deg,#7c3aed,#8b5cf6)' : 'transparent',
            color: mode==='login' ? 'white' : 'var(--text-secondary)' }}>دخول</button>
          <button onClick={()=>{setMode('register'); setError('');}} style={{flex:1, padding:'0.6rem', borderRadius:11, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.9rem',
            background: mode==='register' ? 'linear-gradient(120deg,#7c3aed,#8b5cf6)' : 'transparent',
            color: mode==='register' ? 'white' : 'var(--text-secondary)' }}>حساب جديد</button>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'0.9rem' }}>
          {mode === 'register' && (
            <div>
              <label className="lbl">الاسم (اختياري)</label>
              <input className="field" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="لوقمان" />
            </div>
          )}
          <div>
            <label className="lbl">البريد الإلكتروني</label>
            <input className="field" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="lbl">كلمة المرور</label>
            <input className="field" type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div style={{ background:'rgba(244,63,94,0.12)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:12, padding:'0.7rem 1rem', color:'#fda4af', fontSize:'0.88rem' }}>{error}</div>}
          <button type="submit" disabled={loading} className="btn-brand" style={{ width:'100%', marginTop:'0.5rem' }}>
            {loading ? 'جاري...' : (mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب')}
            <span className="shine" />
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.4rem', fontSize:'0.78rem', color:'var(--text-secondary)' }}>
          ⚡ البلوكات الخلفية: Stable Diffusion • Flux • Veo • Sora • Wan • Kling
        </p>
      </div>
    </div>
  );
}