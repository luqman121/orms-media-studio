import { useState, useEffect, useCallback } from 'react';
import { Trash2, Download, Loader2, Image as ImageIcon, Video as VideoIcon, Filter } from 'lucide-react';
import { api } from '../lib/api';
import Spinner from '../components/Spinner.jsx';

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = filter !== 'all' ? `?type=${filter}` : '';
      const d = await api.get(`/api/generate/generations${qs}`);
      setItems(d.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [filter]);

  async function onDelete(id) {
    if (!confirm('متأكد من الحذف؟')) return;
    try { await api.del(`/api/generate/generations/${id}`); setItems(items.filter(i => i.id !== id)); }
    catch (e) { alert(e.message); }
  }

  function downloadAsset(url, name) {
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  }

  return (
    <div style={{ maxWidth:1280, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.2rem', flexWrap:'wrap', gap:'0.8rem' }}>
        <h2 style={{ fontSize:'1.4rem', fontWeight:800, margin:0 }}>السجل</h2>
        <div style={{ display:'flex', background:'rgba(15,13,28,0.6)', padding:4, borderRadius:12, border:'1px solid var(--border-subtle)' }}>
          {[['all','الكل'],['image','صور'],['video','فيديو']].map(([v,l]) => (
            <button key={v} onClick={()=>setFilter(v)} style={{ padding:'0.5rem 0.9rem', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.82rem',
              background: filter===v ? 'linear-gradient(120deg,#7c3aed,#8b5cf6)' : 'transparent', color: filter===v ? 'white' : 'var(--text-secondary)' }}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ color:'#fda4af', marginBottom:'1rem' }}>{error}</div>}

      {loading ? <Spinner label="" /> : items.length === 0 ? (
        <div className="glass" style={{ padding:'2rem', textAlign:'center', color:'var(--text-secondary)' }}>لا توجد عمليات بعد — ابدأ بالتوليد من تبويب «توليد»</div>
      ) : (
        <div className="history-grid">
          {items.map(it => {
            const previewUrl = it.asset_urls?.[0];
            const isVideo = it.type === 'video';
            return (
              <div key={it.id} className="glass" style={{ padding:'0.6rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                <div style={{ position:'relative', borderRadius:14, overflow:'hidden', background:'#0a070f', aspectRatio:'4/3' }}>
                  {previewUrl ? (
                    isVideo ? <video src={previewUrl} muted playsInline style={{ width:'100%', height:'100%', objectFit:'cover' }} /> :
                    <img src={previewUrl} alt={it.prompt} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'0.4rem', color:'var(--text-secondary)' }}>
                      {it.status==='pending' || it.status==='in_progress' ? <Loader2 size={24} className="spin-slow" /> : <ImageIcon size={24} />}
                      <div style={{ fontSize:'0.78rem' }}>{it.status==='completed'?'—':it.status}</div>
                    </div>
                  )}
                  <div style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.7)', color:'white', borderRadius:8, padding:'0.25rem 0.5rem', fontSize:'0.72rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                    {isVideo ? <VideoIcon size={12} /> : <ImageIcon size={12} />}
                  </div>
                </div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', direction:'rtl', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {it.prompt || '—'}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', direction:'ltr' }}>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)' }}>{new Date(it.created_at + 'Z').toLocaleString('ar', { dateStyle:'short', timeStyle:'short' })}</div>
                  <div style={{ display:'flex', gap:'0.3rem' }}>
                    {previewUrl && it.status==='completed' && <button onClick={()=>downloadAsset(previewUrl, `orms-${it.id}${isVideo?'.mp4':'.png'}`)} title="تنزيل" style={{ background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', borderRadius:9, padding:'0.35rem', color:'var(--text-primary)', cursor:'pointer' }}><Download size={14} /></button>}
                    <button onClick={()=>onDelete(it.id)} title="حذف" style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.25)', borderRadius:9, padding:'0.35rem', color:'#fda4af', cursor:'pointer' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}