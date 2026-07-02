import { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Video as VideoIcon, Upload, Download, RefreshCw, Loader2, Sparkles, Wallpaper, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { api, fetchEventSource, getToken } from '../lib/api';
import Spinner from '../components/Spinner.jsx';

const generateURL = '/api/generate';
const modelsURL = '/api/models';

// Helpers
function downloadAsset(url, name) {
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

export default function GeneratePage() {
  const [mode, setMode] = useState('image'); // image | video
  const [models, setModels] = useState({ images: [], videos: [] });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');

  const [prompt, setPrompt] = useState('');
  const [n, setN] = useState(1);
  const [resolution, setResolution] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [quality, setQuality] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [duration, setDuration] = useState(''); // video

  const [referenceImage, setReferenceImage] = useState(null);
  const [refPreview, setRefPreview] = useState('');
  const [useStreaming, setUseStreaming] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);  // last result
  const [partialProgress, setPartialProgress] = useState(0);
  const [pollingText, setPollingText] = useState(''); // video status
  const [error, setError] = useState('');

  const pollTimerRef = useRef(null);
  const filePRef = useRef(null);

  // Get the current model object
  const curModels = mode === 'image' ? models.images : models.videos;
  const currentModel = curModels.find(m => m.id === selectedModelId);

  // Fetch model lists once on mount
  const loadModels = useCallback(async () => {
    setModelsLoading(true); setModelsError('');
    try {
      const d = await api.get(modelsURL);
      const imgs = d.images || [];
      const vids = d.videos || [];
      setModels({ images: imgs, videos: vids });
      if (mode === 'image' && imgs.length && !selectedModelId) setSelectedModelId(imgs[0].id);
      else if (mode === 'video' && vids.length && !selectedModelId) setSelectedModelId(vids[0].id);
    } catch (e) {
      setModelsError(e.message || 'فشل جلب النماذج');
    } finally { setModelsLoading(false); }
  }, []);

  useEffect(() => { loadModels(); }, []);
  // When user toggles mode, pick first model in that group
  useEffect(() => {
    const list = mode === 'image' ? models.images : models.videos;
    if (list.length && !list.find(m => m.id === selectedModelId)) {
      setSelectedModelId(list[0].id);
    } else if (!list.length) {
      setSelectedModelId('');
    }
    setResult(null); setError(''); setPollingText('');
  }, [mode, models]);

  // Pick reference image
  function onFileSelected(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setReferenceImage(f);
    const reader = new FileReader();
    reader.onload = ev => setRefPreview(ev.target.result);
    reader.readAsDataURL(f);
  }
  function clearRef() { setReferenceImage(null); setRefPreview(''); if (filePRef.current) filePRef.current.value=''; }

  // Whether this image model supports streaming
  const supportsStream = mode === 'image' && currentModel?.supports_streaming;

  // ============ IMAGE GENERATE ============
  async function runImage() {
    if (!prompt || !selectedModelId) return setError('البرومبت والنموذج مطلوبان');
    setRunning(true); setError(''); setResult(null); setPartialProgress(0);
    const fd = new FormData();
    if (referenceImage) fd.append('image', referenceImage);
    fd.append('model', selectedModelId);
    fd.append('prompt', prompt);
    if (n) fd.append('n', String(n));
    if (resolution) fd.append('resolution', resolution);
    if (aspectRatio) fd.append('aspect_ratio', aspectRatio);
    if (quality) fd.append('quality', quality);
    if (outputFormat) fd.append('output_format', outputFormat);
    if (useStreaming) fd.append('stream', 'true');

    try {
      if (useStreaming && supportsStream) {
        // Use fetch() with FormData + Bearer; read SSE
        const token = getToken();
        const r = await fetch('/api/generate/image', { method:'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
        if (!r.ok || !r.body) {
          const t = await r.text(); throw new Error(t || `HTTP ${r.status}`);
        }
        const reader = r.body.getReader(); const dec = new TextDecoder(); let buf='';
        let collected = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream:true });
          let idx;
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0,idx).trim(); buf = buf.slice(idx+1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === 'partial') {
                setPartialProgress(p => p + 1);
              } else if (evt.type === 'completed') {
                collected.push(`/api/assets/${evt.filename}`);
                setResult({ status:'completed', assets: collected, cost: evt.cost, id: evt.id });
              } else if (evt.type === 'error') {
                throw new Error(evt.error?.message || 'خطأ في السحب المباشر');
              }
            } catch (e) { if (e.message.includes('خطأ')) throw e; }
          }
        }
      } else {
        const r = await api.post('/api/generate/image', fd);
        const assets = (r.assets || []).map(a => `/api/assets/${a.filename}`);
        setResult({ ...r, assets });
      }
    } catch (e) {
      setError(e.message || 'فشل توليد الصورة');
    } finally {
      setRunning(false); setPartialProgress(0);
    }
  }

  // ============ VIDEO GENERATE ============
  async function runVideo() {
    if (!prompt || !selectedModelId) return setError('البرومبت والنموذج مطلوبان');
    setRunning(true); setError(''); setResult(null); setPollingText('إرسال الطلب...');
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    const fd = new FormData();
    if (referenceImage) fd.append('image', referenceImage);
    fd.append('model', selectedModelId);
    fd.append('prompt', prompt);
    if (duration) fd.append('duration', String(duration));
    if (resolution) fd.append('resolution', resolution);
    if (aspectRatio) fd.append('aspect_ratio', aspectRatio);

    try {
      const r = await api.post('/api/generate/video', fd);
      // r.id is the local record id; r.job_id is OpenRouter job
      setPollingText('في قائمة الانتظار...');
      const genId = r.id;
      // Start polling
      pollTimerRef.current = setInterval(async () => {
        try {
          const p = await api.post(`/api/generate/generations/${genId}/poll`);
          if (p.status === 'completed') {
            clearInterval(pollTimerRef.current); pollTimerRef.current = null;
            const detail = await api.get(`/api/generate/generations/${genId}`);
            const assets = detail.asset_urls || [];
            setResult({ status:'completed', assets, cost: detail.cost, id: genId });
            setPollingText('');
            setRunning(false);
          } else if (p.status === 'failed') {
            clearInterval(pollTimerRef.current); pollTimerRef.current = null;
            setError('فشل توليد الفيديو');
            setPollingText('');
            setRunning(false);
          } else {
            setPollingText(p.status === 'in_progress' ? 'النموذج يولّد الفيديو...' : 'في الانتظار...');
          }
        } catch (e) {
          // ignore network blips, keep polling
        }
      }, 8000);
    } catch (e) {
      setError(e.message || 'فشل إرسال طلب الفيديو');
      setRunning(false); setPollingText('');
    }
  }

  useEffect(() => () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); }, []);

  function submit() {
    if (mode === 'image') runImage();
    else runVideo();
  }

  // Supported parameters for the selected image model
  let supportedKeys = currentModel?.supported_parameters ? Object.keys(currentModel.supported_parameters) : [];
  // Video model supported resolutions + ratios
  const videoResolutions = currentModel?.supported_resolutions || [];
  const videoRatios = currentModel?.supported_aspect_ratios || [];

  const commonRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21'];
  const imageResolutions = ['512', '1K', '2K', '4K'];
  const videoResolutionLabels = videoResolutions.length ? videoResolutions : ['720p', '1080p', '480p', '4K'];
  const ratioOptions = mode === 'video' ? (videoRatios.length ? videoRatios : commonRatios) : commonRatios;

  return (
    <div className="gen-layout">
      {/* LEFT — controls */}
      <div className="glass glass-mobile-sm">
        <div style={{ marginBottom:'1.2rem' }}>
          <h2 style={{ fontSize:'1.4rem', fontWeight:800, margin:'0 0 0.3rem' }}>إنشاء جديد</h2>
          <p style={{ margin:0, color:'var(--text-secondary)', fontSize:'0.88rem' }}>اختر النوع، الموديل، اكتب البرومبت — واحصل على النتيجة بخطوة واحدة</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display:'flex', background:'rgba(15,13,28,0.6)', padding:4, borderRadius:14, marginBottom:'1.3rem' }}>
          <button onClick={()=>setMode('image')} disabled={running} style={{ flex:1, padding:'0.7rem', borderRadius:11, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', fontWeight:700, fontSize:'0.95rem',
            background: mode==='image' ? 'linear-gradient(120deg,#7c3aed,#8b5cf6)' : 'transparent', color: mode==='image' ? 'white' : 'var(--text-secondary)', transition:'all .2s' }}>
            <ImageIcon size={18} /> توليد صورة
          </button>
          <button onClick={()=>setMode('video')} disabled={running} style={{ flex:1, padding:'0.7rem', borderRadius:11, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', fontWeight:700, fontSize:'0.95rem',
            background: mode==='video' ? 'linear-gradient(120deg,#22d3ee,#0ea5e9)' : 'transparent', color: mode==='video' ? 'white' : 'var(--text-secondary)' }}>
            <VideoIcon size={18} /> توليد فيديو
          </button>
        </div>

        {/* Model selector */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="lbl">الموديل</label>
          {modelsLoading ? <Spinner label="جلب القوائم..." /> :
            modelsError ? <div style={{ color:'#fda4af', fontSize:'0.85rem' }}>{modelsError}</div> :
            <select className="field" value={selectedModelId} onChange={e=>setSelectedModelId(e.target.value)} disabled={running}>
              {(mode==='image'?models.images:models.videos).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>}
          {currentModel && <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:'0.4rem', direction:'ltr', textAlign:'right' }}>{currentModel.id}</div>}
        </div>

        {/* Prompt */}
        <div style={{ marginBottom:'1rem' }}>
          <label className="lbl">البرومبت</label>
          <textarea className="field" rows={4} value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={running} placeholder={mode==='image' ? 'اصف الصورة اللي تريدها...' : 'اصف المشهد اللي تريده في الفيديو...'} style={{ resize:'vertical' }} />
        </div>

        {/* Params grid */}
        <div className="param-grid" style={{ marginBottom:'1rem' }}>
          {mode === 'image' && supportedKeys.includes('n') && (
            <div>
              <label className="lbl">عدد الصور (n)</label>
              <select className="field" value={n} onChange={e=>setN(Number(e.target.value))} disabled={running}>
                {[1,2,3,4].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          )}
          {mode === 'video' && (
            <div>
              <label className="lbl">المدة (ثانية)</label>
              <input className="field" type="number" min={1} max={20} value={duration} onChange={e=>setDuration(e.target.value)} disabled={running} placeholder="تلقائي" />
            </div>
          )}
          {(mode==='image' && supportedKeys.includes('resolution')) || mode==='video' ? (
            <div>
              <label className="lbl">الدقة</label>
              <select className="field" value={resolution} onChange={e=>setResolution(e.target.value)} disabled={running}>
                <option value="">تلقائي</option>
                {(mode==='video'?videoResolutionLabels:imageResolutions).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ) : null}
          <div>
            <label className="lbl">نسبة الأبعاد</label>
            <select className="field" value={aspectRatio} onChange={e=>setAspectRatio(e.target.value)} disabled={running}>
              <option value="">تلقائي</option>
              {ratioOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {mode==='image' && supportedKeys.includes('quality') && (
            <div>
              <label className="lbl">الجودة</label>
              <select className="field" value={quality} onChange={e=>setQuality(e.target.value)} disabled={running}>
                <option value="">تلقائي</option>
                {['low','medium','high','auto'].map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          )}
          {mode==='image' && supportedKeys.includes('output_format') === false ? null : (
            // The 'output_format' key actually lives in supported_parameters as `output_format` for some models
            supportedKeys.includes('output_format') ? (
              <div>
                <label className="lbl">الصيغة</label>
                <select className="field" value={outputFormat} onChange={e=>setOutputFormat(e.target.value)} disabled={running}>
                  <option value="">تلقائي (PNG)</option>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
            ) : null
          )}
        </div>

        {/* Reference image (img2img / image-to-video) */}
        <div style={{ marginBottom:'1.2rem' }}>
          <label className="lbl">صورة مرجعية (اختياري) — {mode==='image' ? 'img2img' : 'image-to-video'}</label>
          {!referenceImage ? (
            <>
              <input ref={filePRef} type="file" accept="image/*" onChange={onFileSelected} style={{ display:'none' }} />
              <button onClick={()=>filePRef.current?.click()} disabled={running} style={{ width:'100%', padding:'1rem', borderRadius:14, border:'1.5px dashed rgba(124,58,237,0.4)', background:'rgba(124,58,237,0.06)', color:'var(--text-secondary)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem', fontSize:'0.9rem' }}>
                <Upload size={18} /> ارفع صورة مرجعية
              </button>
            </>
          ) : (
            <div style={{ position:'relative', borderRadius:14, overflow:'hidden', border:'1px solid var(--border-subtle)' }}>
              <img src={refPreview} alt="ref" style={{ width:'100%', maxHeight:200, objectFit:'cover', display:'block' }} />
              <button onClick={clearRef} disabled={running} style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.7)', color:'white', border:'none', borderRadius:10, padding:'0.4rem 0.7rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.82rem' }}>
                <X size={14} /> حذف
              </button>
            </div>
          )}
        </div>

        {/* Image-only: streaming toggle */}
        {mode==='image' && supportsStream && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1.2rem', padding:'0.7rem 1rem', background:'rgba(34,211,238,0.06)', borderRadius:12, border:'1px solid rgba(34,211,238,0.2)' }}>
            <input type="checkbox" id="stream-cb" checked={useStreaming} onChange={e=>setUseStreaming(e.target.checked)} disabled={running} />
            <label htmlFor="stream-cb" style={{ fontSize:'0.88rem', cursor:'pointer' }}>
              <Sparkles size={14} style={{ display:'inline', marginLeft:6 }} />
              السحب المباشر (Streaming) — يعرض الصورة تدريجياً أثناء التوليد
            </label>
          </div>
        )}

        {/* Submit */}
        <button onClick={submit} disabled={running || (!prompt) || modelsLoading} className="btn-brand" style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem' }}>
          {running ? <Loader2 size={18} className="spin-slow" /> : mode==='image' ? <ImageIcon size={18} /> : <VideoIcon size={18} />}
          {running ? (pollingText || 'جاري التوليد...') : (mode==='image'?'توليد الصورة':'توليد الفيديو')}
          <span className="shine" />
        </button>

        {error && <div style={{ marginTop:'1rem', padding:'0.8rem 1rem', background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:12, color:'#fda4af', fontSize:'0.88rem', display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <AlertCircle size={16} /> {error}
        </div>}
      </div>

      {/* RIGHT — result */}
      <div className="glass glass-mobile-sm" style={{ minHeight:420, display:'flex', flexDirection:'column' }}>
        <h3 style={{ marginTop:0, marginBottom:'1rem' }}>النتيجة</h3>

        {running && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem' }}>
            <div className="spin-slow" style={{ width:60, height:60, borderRadius:'50%', border:'4px solid rgba(124,58,237,0.18)', borderTopColor:'var(--accent)' }} />
            <div style={{ fontSize:'0.95rem', color:'var(--text-secondary)' }}>{pollingText || 'جاري التوليد...'}</div>
            {mode==='image' && useStreaming && supportsStream && partialProgress > 0 && (
              <div style={{ fontSize:'0.82rem', color:'#22d3ee' }}>تم استلام {partialProgress} تحديثاً...</div>
            )}
          </div>
        )}

        {!running && !result && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'0.7rem', color:'var(--text-secondary)' }}>
            <Wallpaper size={48} color="rgba(180,172,207,0.4)" />
            <div style={{ fontSize:'0.9rem' }}>النتيجة ستظهر هنا بعد التوليد</div>
          </div>
        )}

        {result && !running && (
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.8rem', fontSize:'0.85rem', color:'#86efac' }}>
              <CheckCircle2 size={16} /> تم بنجاح {result.cost && (<>— التكلفة: ${Number(result.cost).toFixed(4)}</>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns: result.assets.length>1 ? '1fr 1fr' : '1fr', gap:'1rem' }}>
              {result.assets.map((a, i) => (
                <div key={i} style={{ position:'relative', borderRadius:14, overflow:'hidden', border:'1px solid var(--border-subtle)', background:'#0a070f' }}>
                  {mode==='image' ? (
                    <img src={a} alt={`res-${i}`} style={{ width:'100%', display:'block' }} />
                  ) : (
                    <video src={a} controls playsInline style={{ width:'100%', display:'block' }} />
                  )}
                  <a href={a} download onClick={e=>{ e.preventDefault(); downloadAsset(a, `result-${result.id}-${i}.${mode==='image'?'png':'mp4'}`); }}
                    style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.7)', color:'white', borderRadius:10, padding:'0.4rem 0.7rem', textDecoration:'none', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'0.3rem' }}>
                    <Download size={14} /> تنزيل
                  </a>
                </div>
              ))}
            </div>
            <button onClick={()=>setResult(null)} className="btn-brand" style={{ marginTop:'1.2rem', display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.55rem 1.2rem', fontSize:'0.88rem' }}>
              <RefreshCw size={14} /> توليد آخر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}