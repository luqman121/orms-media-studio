import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Wand2, History, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/generate', label: 'توليد', icon: Wand2 },
  { to: '/history', label: 'السجل', icon: History },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 800);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 800);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  // Mobile top bar — shows when sidebar is hidden
  const MobileTopBar = !isDesktop && (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.8rem 1rem', borderBottom:'1px solid var(--border-subtle)', background:'rgba(15,13,28,0.6)' }}>
      <button onClick={()=>setOpen(!open)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text-primary)' }}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontWeight:700 }}>
        <Sparkles size={18} /> Media Studio
      </div>
      <div style={{ width:22 }} />
    </div>
  );

  const SidebarBox = (
    <aside style={{ width: 260, flexShrink: 0, background:'linear-gradient(180deg, #100e1d 0%, #0a070f 100%)', borderInlineStart:'1px solid var(--border-subtle)',
      display:'flex', flexDirection:'column', height: isDesktop ? '100vh' : 'auto' }}>
      <div style={{ padding:'1.4rem 1.2rem', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:'0.6rem' }}>
        <div style={{ width:42, height:42, borderRadius:14, background:'linear-gradient(120deg,#7c3aed,#22d3ee)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Sparkles size={22} color="white" />
        </div>
        <div>
          <div style={{ fontWeight:800, fontSize:'1.05rem' }}>Media Studio</div>
          <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>OpenRouter</div>
        </div>
      </div>
      <nav style={{ flex:1, padding:'1rem 0.8rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
        {navItems.map(it => {
          const Icon = it.icon;
          return (
            <NavLink key={it.to} to={it.to} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'0.8rem',
              padding:'0.75rem 1rem', borderRadius:14, fontWeight:600, fontSize:'0.95rem',
              textDecoration:'none', border:'1px solid transparent',
              background: isActive ? 'linear-gradient(120deg, rgba(124,58,237,0.18), rgba(34,211,238,0.06))' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderColor: isActive ? 'rgba(124,58,237,0.35)' : 'transparent',
              boxShadow: isActive ? '0 0 25px rgba(124,58,237,0.15)' : 'none',
              transition:'all 0.2s ease',
            })}>
              <Icon size={18} /> {it.label}
            </NavLink>
          );
        })}
      </nav>
      <div style={{ padding:'1rem 1.2rem', borderTop:'1px solid var(--border-subtle)' }}>
        <div style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'0.8rem', direction:'ltr', textAlign:'right' }}>{user?.email}</div>
        <button onClick={() => { logout(); nav('/auth'); }} style={{ display:'flex', alignItems:'center', gap:'0.6rem', width:'100%',
          padding:'0.65rem 1rem', borderRadius:12, border:'1px solid var(--border-subtle)', background:'transparent', color:'#fda4af',
          cursor:'pointer', fontWeight:600, fontSize:'0.88rem' }}>
          <LogOut size={16} /> تسجيل الخروج
        </button>
      </div>
    </aside>
  );

  if (isDesktop) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'row-reverse' }}>
        {SidebarBox}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          <main className="main-content" style={{ flex:1, overflow:'auto' }}>
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // Mobile: top bar + slide down nav + content
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {MobileTopBar}
      {open && (
        <div className="glass" style={{ margin:'0.6rem', padding:'0.6rem', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
          {navItems.map(it => {
            const Icon = it.icon;
            return (
              <NavLink key={it.to} to={it.to} style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.7rem 0.8rem', borderRadius:12, textDecoration:'none',
                background: isActive ? 'rgba(124,58,237,0.18)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight:600
              })}>
                <Icon size={16} /> {it.label}
              </NavLink>
            );
          })}
          <button onClick={() => { logout(); nav('/auth'); }} style={{ display:'flex', alignItems:'center', gap:'0.6rem', width:'100%',
            padding:'0.7rem 0.8rem', borderRadius:12, border:'1px solid var(--border-subtle)', background:'rgba(244,63,94,0.06)', color:'#fda4af',
            cursor:'pointer', fontWeight:600, fontSize:'0.85rem', justifyContent:'flex-start' }}>
            <LogOut size={14} /> تسجيل الخروج
          </button>
        </div>
      )}
      <main className="main-content" style={{ flex:1, overflow:'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}