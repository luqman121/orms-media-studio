'use client';
// Generator studio. UI rebuilt on the ORMS design system; all generation logic
// (model loading, image sync/streaming, async video poll, params) is unchanged
// and calls the exact same API contracts as before.
import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  Download,
  RefreshCw,
  Sparkles,
  Wallpaper,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { api, getToken, type ApiError } from '../../../lib/api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Tabs from '../../../components/ui/Tabs';
import { Field, Select } from '../../../components/ui/Field';
import Skeleton from '../../../components/ui/Skeleton';

const modelsURL = '/api/models';

interface Model {
  id: string;
  name: string;
  supported_parameters?: Record<string, unknown>;
  supports_streaming?: boolean;
  supported_resolutions?: string[];
  supported_aspect_ratios?: string[];
}

interface ResultState {
  status: string;
  assets: string[];
  cost?: string | number;
  id?: number;
}

function downloadAsset(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function GeneratePage() {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [models, setModels] = useState<{ images: Model[]; videos: Model[] }>({ images: [], videos: [] });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');

  const [prompt, setPrompt] = useState('');
  const [n, setN] = useState(1);
  const [resolution, setResolution] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [quality, setQuality] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [duration, setDuration] = useState('');

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState('');
  const [useStreaming, setUseStreaming] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [partialProgress, setPartialProgress] = useState(0);
  const [pollingText, setPollingText] = useState('');
  const [error, setError] = useState('');

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filePRef = useRef<HTMLInputElement | null>(null);

  const curModels = mode === 'image' ? models.images : models.videos;
  const currentModel = curModels.find((m) => m.id === selectedModelId);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError('');
    try {
      const d = await api.get<{ images?: Model[]; videos?: Model[] }>(modelsURL);
      const imgs = d.images || [];
      const vids = d.videos || [];
      setModels({ images: imgs, videos: vids });
      if (mode === 'image' && imgs.length && !selectedModelId) setSelectedModelId(imgs[0].id);
      else if (mode === 'video' && vids.length && !selectedModelId) setSelectedModelId(vids[0].id);
    } catch (e) {
      setModelsError((e as Error).message || 'فشل جلب النماذج');
    } finally {
      setModelsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const list = mode === 'image' ? models.images : models.videos;
    if (list.length && !list.find((m) => m.id === selectedModelId)) {
      setSelectedModelId(list[0].id);
    } else if (!list.length) {
      setSelectedModelId('');
    }
    setResult(null);
    setError('');
    setPollingText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, models]);

  function onFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setReferenceImage(f);
    const reader = new FileReader();
    reader.onload = (ev) => setRefPreview(String(ev.target?.result || ''));
    reader.readAsDataURL(f);
  }
  function clearRef() {
    setReferenceImage(null);
    setRefPreview('');
    if (filePRef.current) filePRef.current.value = '';
  }

  const supportsStream = mode === 'image' && !!currentModel?.supports_streaming;

  async function runImage() {
    if (!prompt || !selectedModelId) return setError('البرومبت والنموذج مطلوبان');
    setRunning(true);
    setError('');
    setResult(null);
    setPartialProgress(0);
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
        const token = getToken();
        const r = await fetch('/api/generate/image', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
        if (!r.ok || !r.body) {
          const t = await r.text();
          throw new Error(t || `HTTP ${r.status}`);
        }
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        const collected: string[] = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.type === 'partial') {
                setPartialProgress((p) => p + 1);
              } else if (evt.type === 'completed') {
                collected.push(`/api/assets/${evt.filename}`);
                setResult({ status: 'completed', assets: [...collected], cost: evt.cost, id: evt.id });
              } else if (evt.type === 'error') {
                throw new Error(evt.error?.message || 'خطأ في السحب المباشر');
              }
            } catch (e) {
              if ((e as Error).message.includes('خطأ')) throw e;
            }
          }
        }
      } else {
        const r = await api.post<{ assets?: { filename: string }[]; cost?: string; id?: number }>('/api/generate/image', fd);
        const assets = (r.assets || []).map((a) => `/api/assets/${a.filename}`);
        setResult({ status: 'completed', assets, cost: r.cost, id: r.id });
      }
    } catch (e) {
      const err = e as ApiError;
      const detail = (err.data as { detail?: string } | undefined)?.detail;
      const base = err.message || 'فشل توليد الصورة';
      setError(detail && detail !== base ? `${base} — ${detail}` : base);
    } finally {
      setRunning(false);
      setPartialProgress(0);
    }
  }

  async function runVideo() {
    if (!prompt || !selectedModelId) return setError('البرومبت والنموذج مطلوبان');
    setRunning(true);
    setError('');
    setResult(null);
    setPollingText('إرسال الطلب...');
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    const fd = new FormData();
    if (referenceImage) fd.append('image', referenceImage);
    fd.append('model', selectedModelId);
    fd.append('prompt', prompt);
    if (duration) fd.append('duration', String(duration));
    if (resolution) fd.append('resolution', resolution);
    if (aspectRatio) fd.append('aspect_ratio', aspectRatio);

    try {
      const r = await api.post<{ id: number }>('/api/generate/video', fd);
      setPollingText('في قائمة الانتظار...');
      const genId = r.id;
      pollTimerRef.current = setInterval(async () => {
        try {
          const p = await api.post<{ status: string }>(`/api/generate/generations/${genId}/poll`);
          if (p.status === 'completed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            const detail = await api.get<{ asset_urls?: string[]; cost?: string }>(`/api/generate/generations/${genId}`);
            const assets = detail.asset_urls || [];
            setResult({ status: 'completed', assets, cost: detail.cost, id: genId });
            setPollingText('');
            setRunning(false);
          } else if (p.status === 'failed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            // Surface the stored failure reason (provider error, R2 upload, timeout…).
            let reason = '';
            try {
              const detail = await api.get<{ error?: string }>(`/api/generate/generations/${genId}`);
              reason = detail.error || '';
            } catch {
              /* fall back to generic message */
            }
            setError(reason ? `فشل توليد الفيديو — ${reason}` : 'فشل توليد الفيديو');
            setPollingText('');
            setRunning(false);
          } else {
            setPollingText(p.status === 'in_progress' ? 'النموذج يولّد الفيديو...' : 'في الانتظار...');
          }
        } catch {
          // ignore network blips, keep polling
        }
      }, 8000);
    } catch (e) {
      const err = e as ApiError;
      const detail = (err.data as { detail?: string } | undefined)?.detail;
      const base = err.message || 'فشل إرسال طلب الفيديو';
      setError(detail && detail !== base ? `${base} — ${detail}` : base);
      setRunning(false);
      setPollingText('');
    }
  }

  useEffect(
    () => () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    },
    [],
  );

  function submit() {
    if (mode === 'image') runImage();
    else runVideo();
  }

  const supportedKeys = currentModel?.supported_parameters ? Object.keys(currentModel.supported_parameters) : [];
  const videoResolutions = currentModel?.supported_resolutions || [];
  const videoRatios = currentModel?.supported_aspect_ratios || [];

  const commonRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '9:21'];
  const imageResolutions = ['512', '1K', '2K', '4K'];
  const videoResolutionLabels = videoResolutions.length ? videoResolutions : ['720p', '1080p', '480p', '4K'];
  const ratioOptions = mode === 'video' ? (videoRatios.length ? videoRatios : commonRatios) : commonRatios;

  return (
    <div className="gen-layout">
      {/* SETTINGS (right in RTL) */}
      <Card className="glass-mobile-sm">
        <div className="mb-5">
          <h2 className="font-display text-xl font-extrabold text-text-100">إنشاء جديد</h2>
          <p className="mt-1 text-sm text-text-400">اختر النوع والنموذج، اكتب البرومبت — واحصل على النتيجة بخطوة واحدة.</p>
        </div>

        <Tabs
          ariaLabel="نوع التوليد"
          className="mb-5"
          value={mode}
          onChange={setMode}
          disabled={running}
          items={[
            { value: 'image', label: 'توليد صورة', icon: <ImageIcon size={16} /> },
            { value: 'video', label: 'توليد فيديو', icon: <VideoIcon size={16} /> },
          ]}
        />

        {/* Model */}
        <div className="mb-4">
          <Field label="النموذج" htmlFor="model-select" hint={currentModel ? <span dir="ltr">{currentModel.id}</span> : undefined}>
            {modelsLoading ? (
              <Skeleton className="h-[50px]" />
            ) : modelsError ? (
              <div className="flex items-center gap-2 rounded-mdx border border-[rgba(255,92,122,0.3)] bg-[rgba(255,92,122,0.1)] px-3 py-2.5 text-sm text-[#fda4af]">
                <AlertCircle size={15} /> {modelsError}
              </div>
            ) : (
              <Select id="model-select" value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} disabled={running}>
                {curModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {/* Prompt */}
        <div className="mb-4">
          <label className="lbl" htmlFor="prompt">البرومبت</label>
          <textarea
            id="prompt"
            className="prompt-box !min-h-[120px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={running}
            placeholder={mode === 'image' ? 'اكتب وصف الصورة التي تريد إنشاءها...' : 'اكتب مشهد الفيديو، الحركة، الإضاءة، والأسلوب...'}
          />
        </div>

        {/* Params */}
        <div className="param-grid mb-4">
          {mode === 'image' && supportedKeys.includes('n') && (
            <Field label="عدد الصور">
              <Select value={n} onChange={(e) => setN(Number(e.target.value))} disabled={running}>
                {[1, 2, 3, 4].map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </Select>
            </Field>
          )}
          {mode === 'video' && (
            <Field label="المدة (ثانية)">
              <input className="field" type="number" min={1} max={20} value={duration} onChange={(e) => setDuration(e.target.value)} disabled={running} placeholder="تلقائي" />
            </Field>
          )}
          {(mode === 'image' && supportedKeys.includes('resolution')) || mode === 'video' ? (
            <Field label="الدقة">
              <Select value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={running}>
                <option value="">تلقائي</option>
                {(mode === 'video' ? videoResolutionLabels : imageResolutions).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="نسبة الأبعاد">
            <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={running}>
              <option value="">تلقائي</option>
              {ratioOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          {mode === 'image' && supportedKeys.includes('quality') && (
            <Field label="الجودة">
              <Select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={running}>
                <option value="">تلقائي</option>
                {['low', 'medium', 'high', 'auto'].map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </Select>
            </Field>
          )}
          {mode === 'image' && supportedKeys.includes('output_format') && (
            <Field label="الصيغة">
              <Select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} disabled={running}>
                <option value="">تلقائي (PNG)</option>
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </Select>
            </Field>
          )}
        </div>

        {/* Reference image */}
        <div className="mb-5">
          <label className="lbl">صورة مرجعية (اختياري) — {mode === 'image' ? 'img2img' : 'image-to-video'}</label>
          {!referenceImage ? (
            <>
              <input ref={filePRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" />
              <button
                onClick={() => filePRef.current?.click()}
                disabled={running}
                className="flex w-full items-center justify-center gap-2 rounded-mdx border border-dashed border-[rgba(134,79,242,0.4)] bg-[rgba(134,79,242,0.06)] px-4 py-4 text-sm text-text-400 transition-colors hover:bg-[rgba(134,79,242,0.1)] disabled:opacity-50"
              >
                <Upload size={18} /> ارفع صورة مرجعية
              </button>
            </>
          ) : (
            <div className="relative overflow-hidden rounded-mdx border border-[rgba(169,154,241,0.14)]">
              <img src={refPreview} alt="مرجع" className="block max-h-52 w-full object-cover" />
              <button
                onClick={clearRef}
                disabled={running}
                className="absolute left-2 top-2 flex items-center gap-1.5 rounded-mdx bg-black/70 px-2.5 py-1.5 text-xs text-white"
              >
                <X size={14} /> حذف
              </button>
            </div>
          )}
        </div>

        {/* Streaming toggle */}
        {mode === 'image' && supportsStream && (
          <label className="mb-5 flex cursor-pointer items-center gap-2.5 rounded-mdx border border-[rgba(54,196,240,0.2)] bg-[rgba(54,196,240,0.06)] px-3.5 py-2.5">
            <input type="checkbox" checked={useStreaming} onChange={(e) => setUseStreaming(e.target.checked)} disabled={running} className="accent-[#36C4F0]" />
            <span className="text-sm text-text-200">
              <Sparkles size={14} className="ml-1.5 inline text-cyan-500" />
              السحب المباشر (Streaming) — يعرض الصورة تدريجيًا أثناء التوليد
            </span>
          </label>
        )}

        <Button fullWidth size="lg" onClick={submit} loading={running} disabled={!prompt || modelsLoading} leftIcon={mode === 'image' ? <ImageIcon size={18} /> : <VideoIcon size={18} />}>
          {running ? pollingText || 'جاري التوليد...' : mode === 'image' ? 'توليد الصورة' : 'توليد الفيديو'}
          <span className="shine" />
        </Button>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-mdx border border-[rgba(255,92,122,0.3)] bg-[rgba(255,92,122,0.1)] px-3.5 py-3 text-sm text-[#fda4af]">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </Card>

      {/* PREVIEW (left in RTL) */}
      <Card className={`glass-mobile-sm flex min-h-[440px] flex-col ${running ? 'gen-border-active' : ''}`}>
        <h3 className="mb-4 font-display text-lg font-bold text-text-100">النتيجة</h3>

        {running && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="spin-slow h-16 w-16 rounded-full" style={{ border: '4px solid rgba(134,79,242,0.18)', borderTopColor: 'var(--primary-500)' }} />
            <div className="text-sm text-text-400">{pollingText || 'جاري التوليد...'}</div>
            {mode === 'image' && useStreaming && supportsStream && partialProgress > 0 && (
              <div className="text-xs text-cyan-500">تم استلام {partialProgress} تحديثًا...</div>
            )}
          </div>
        )}

        {!running && !result && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[rgba(134,79,242,0.1)]">
              <Wallpaper size={30} className="text-text-400/60" />
            </span>
            <div className="text-sm text-text-400">النتيجة ستظهر هنا بعد التوليد</div>
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {['سينمائي', 'واقعي', 'إعلان منتج', '3D'].map((t) => (
                <span key={t} className="badge">{t}</span>
              ))}
            </div>
          </div>
        )}

        {result && !running && (
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2 text-sm text-success-500">
              <CheckCircle2 size={16} /> تم بنجاح {result.cost != null && <>— التكلفة: ${Number(result.cost).toFixed(4)}</>}
            </div>
            <div className={`grid gap-4 ${result.assets.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {result.assets.map((a, i) => (
                <div key={i} className="relative overflow-hidden rounded-mdx border border-[rgba(169,154,241,0.14)] bg-bg-950">
                  {mode === 'image' ? (
                    <img src={a} alt={`نتيجة ${i + 1}`} className="block w-full" />
                  ) : (
                    <video src={a} controls playsInline className="block w-full" />
                  )}
                  <button
                    onClick={() => downloadAsset(a, `orms-${result.id}-${i}.${mode === 'image' ? 'png' : 'mp4'}`)}
                    className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-mdx bg-black/70 px-2.5 py-1.5 text-xs text-white"
                  >
                    <Download size={14} /> تنزيل
                  </button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="mt-5" onClick={() => setResult(null)} leftIcon={<RefreshCw size={14} />}>
              توليد آخر
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
