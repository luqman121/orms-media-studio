'use client';
// Generator studio — premium create screen (ref screens 2–3): large preview
// panel + side settings panel with Properties/Info tabs and a success state.
// ALL generation logic (model loading, image sync/streaming, async video poll,
// prompt enhancer, params) is unchanged and calls the exact same API contracts.
import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
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
  Wand2,
  Undo2,
  Copy,
  Check,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { api, getToken, type ApiError } from '../../../lib/api';
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
  at?: number;
}

// Style/colour presets (ref screen 3 chips). Selected presets are appended to
// the prompt text at submit time only — the generation pipeline is untouched.
// Labels are localized via the `generate.stylePreset.*` / `generate.colorPreset.*`
// catalog keys; `kw` (English keywords appended to the prompt) and `hex` are
// structural and stay literal.
const STYLE_PRESETS = [
  { key: 'cinematic', kw: 'cinematic style, dramatic lighting' },
  { key: 'photorealistic', kw: 'photorealistic, ultra detailed' },
  { key: 'abstract', kw: 'abstract art style' },
  { key: 'scifi', kw: 'sci-fi futuristic style' },
  { key: 'nature', kw: 'lush nature scenery' },
  { key: 'product', kw: 'premium commercial product shot' },
] as const;
const COLOR_PRESETS = [
  { key: 'blue', hex: '#2f6df6', kw: 'blue tones' },
  { key: 'red', hex: '#ff5b6e', kw: 'red tones' },
  { key: 'orange', hex: '#ff9a3d', kw: 'orange tones' },
  { key: 'pink', hex: '#ff9ad5', kw: 'pink tones' },
  { key: 'yellow', hex: '#ffd166', kw: 'golden yellow tones' },
  { key: 'cyan', hex: '#28d7ff', kw: 'cyan teal tones' },
  { key: 'mono', hex: '#cbd5e1', kw: 'black and white monochrome' },
] as const;

function downloadAsset(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function GeneratePage() {
  const t = useTranslations('generate');
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

  const [enhancing, setEnhancing] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);
  const busy = running || enhancing;

  const [styles, setStyles] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [panelTab, setPanelTab] = useState<'props' | 'info'>('props');
  const [copied, setCopied] = useState(false);

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
      setModelsError((e as Error).message || t('errModels'));
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
    setPreviousPrompt(null);
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

  function toggleIn(list: string[], kw: string): string[] {
    return list.includes(kw) ? list.filter((k) => k !== kw) : [...list, kw];
  }

  // Final prompt = user prompt + selected style/colour keywords (text-only append).
  function composePrompt(): string {
    const parts = [prompt.trim()];
    if (styles.length) parts.push(styles.join(', '));
    if (colors.length) parts.push(`dominant colors: ${colors.join(', ')}`);
    return parts.filter(Boolean).join(', ');
  }

  // Calls the prompt-enhancer API; throws with a user-facing message on failure.
  async function callEnhanceApi(text: string, type: 'image' | 'video'): Promise<string> {
    try {
      const r = await api.post<{ enhancedPrompt: string }>('/api/enhance-prompt', { prompt: text, type });
      return r.enhancedPrompt;
    } catch (e) {
      const err = e as ApiError;
      const detail = (err.data as { detail?: string } | undefined)?.detail;
      const base = err.message || t('errEnhance');
      throw new Error(detail && detail !== base ? `${base} — ${detail}` : base);
    }
  }

  async function handleEnhanceClick() {
    if (!prompt.trim()) return setError(t('errNeedPromptEnhance'));
    setEnhancing(true);
    setError('');
    try {
      const enhanced = await callEnhanceApi(prompt, mode);
      setPreviousPrompt(prompt);
      setPrompt(enhanced);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnhancing(false);
    }
  }

  function handleUndoEnhance() {
    if (previousPrompt === null) return;
    setPrompt(previousPrompt);
    setPreviousPrompt(null);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function runImage() {
    if (!prompt || !selectedModelId) return setError(t('errNeedPromptModel'));
    setError('');
    let finalPrompt = composePrompt();
    if (autoEnhance) {
      setEnhancing(true);
      try {
        finalPrompt = await callEnhanceApi(finalPrompt, 'image');
        setPreviousPrompt(prompt);
        setPrompt(finalPrompt);
      } catch (e) {
        setEnhancing(false);
        setError((e as Error).message);
        return;
      }
      setEnhancing(false);
    }
    setRunning(true);
    setResult(null);
    setPartialProgress(0);
    const fd = new FormData();
    if (referenceImage) fd.append('image', referenceImage);
    fd.append('model', selectedModelId);
    fd.append('prompt', finalPrompt);
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
                // The browser cannot attach a Bearer header to <img src>, so
                // fetch short-lived signed asset_urls from the authenticated
                // generation detail endpoint (mirrors the video poll path).
                try {
                  const detail = await api.get<{ asset_urls?: string[]; cost?: string }>(`/api/generate/generations/${evt.id}`);
                  const assets = detail.asset_urls || [];
                  setResult({ status: 'completed', assets, cost: detail.cost ?? evt.cost, id: evt.id, at: Date.now() });
                } catch {
                  setResult({ status: 'completed', assets: [...collected], cost: evt.cost, id: evt.id, at: Date.now() });
                }
              } else if (evt.type === 'error') {
                throw new Error(evt.error?.message || t('errStream'));
              }
            } catch (e) {
              if ((e as Error).message.includes(t('errStream'))) throw e;
            }
          }
        }
      } else {
        const r = await api.post<{ assets?: { filename: string }[]; cost?: string; id?: number }>('/api/generate/image', fd);
        // Fetch short-lived signed asset_urls from the authenticated generation
        // detail endpoint so <img src> works without a Bearer header.
        const detail = await api.get<{ asset_urls?: string[]; cost?: string }>(`/api/generate/generations/${r.id}`);
        const assets = detail.asset_urls || [];
        setResult({ status: 'completed', assets, cost: detail.cost ?? r.cost, id: r.id, at: Date.now() });
      }
    } catch (e) {
      const err = e as ApiError;
      const detail = (err.data as { detail?: string } | undefined)?.detail;
      const base = err.message || t('errImageFailed');
      setError(detail && detail !== base ? `${base} — ${detail}` : base);
    } finally {
      setRunning(false);
      setPartialProgress(0);
    }
  }

  async function runVideo() {
    if (!prompt || !selectedModelId) return setError(t('errNeedPromptModel'));
    setError('');
    let finalPrompt = composePrompt();
    if (autoEnhance) {
      setEnhancing(true);
      try {
        finalPrompt = await callEnhanceApi(finalPrompt, 'video');
        setPreviousPrompt(prompt);
        setPrompt(finalPrompt);
      } catch (e) {
        setEnhancing(false);
        setError((e as Error).message);
        return;
      }
      setEnhancing(false);
    }
    setRunning(true);
    setResult(null);
    setPollingText(t('pollSending'));
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    const fd = new FormData();
    if (referenceImage) fd.append('image', referenceImage);
    fd.append('model', selectedModelId);
    fd.append('prompt', finalPrompt);
    if (duration) fd.append('duration', String(duration));
    if (resolution) fd.append('resolution', resolution);
    if (aspectRatio) fd.append('aspect_ratio', aspectRatio);

    try {
      const r = await api.post<{ id: number }>('/api/generate/video', fd);
      setPollingText(t('pollQueued'));
      const genId = r.id;
      pollTimerRef.current = setInterval(async () => {
        try {
          const p = await api.post<{ status: string }>(`/api/generate/generations/${genId}/poll`);
          if (p.status === 'completed') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
            const detail = await api.get<{ asset_urls?: string[]; cost?: string }>(`/api/generate/generations/${genId}`);
            const assets = detail.asset_urls || [];
            setResult({ status: 'completed', assets, cost: detail.cost, id: genId, at: Date.now() });
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
            setError(reason ? t('errVideoFailedReason', { reason }) : t('errVideoFailed'));
            setPollingText('');
            setRunning(false);
          } else {
            setPollingText(p.status === 'in_progress' ? t('pollInProgress') : t('pollPending'));
          }
        } catch {
          // ignore network blips, keep polling
        }
      }, 8000);
    } catch (e) {
      const err = e as ApiError;
      const detail = (err.data as { detail?: string } | undefined)?.detail;
      const base = err.message || t('errVideoSend');
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
    if (busy) return;
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

  const showSuccess = !!result && !running;

  /* ---------- Side panel: Properties form ---------- */
  const PropertiesForm = (
    <>
      <Tabs
        ariaLabel={t('modeLabel')}
        className="mb-4"
        value={mode}
        onChange={setMode}
        disabled={busy}
        items={[
          { value: 'image', label: t('modeImage'), icon: <ImageIcon size={16} /> },
          { value: 'video', label: t('modeVideo'), icon: <VideoIcon size={16} /> },
        ]}
      />

      {/* Model */}
      <div className="mb-4">
        <Field label={t('modelLabel')} htmlFor="model-select" hint={currentModel ? <span dir="ltr">{currentModel.id}</span> : undefined}>
          {modelsLoading ? (
            <Skeleton className="h-[50px]" />
          ) : modelsError ? (
            <div className="flex items-center gap-2 rounded-[12px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.1)] px-3 py-2.5 text-sm text-[#fda4af]">
              <AlertCircle size={15} /> {modelsError}
            </div>
          ) : (
            <Select id="model-select" value={selectedModelId} onChange={(e) => setSelectedModelId(e.target.value)} disabled={busy}>
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
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="lbl !mb-0" htmlFor="prompt">{t('promptLabel')}</label>
          <div className="flex items-center gap-2">
            {previousPrompt !== null && (
              <button
                type="button"
                onClick={handleUndoEnhance}
                disabled={busy}
                className="flex items-center gap-1 text-xs text-[var(--dz-text-3)] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Undo2 size={12} /> {t('undo')}
              </button>
            )}
            <button
              type="button"
              onClick={handleEnhanceClick}
              disabled={busy || !prompt.trim()}
              className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(47,109,246,0.4)] bg-[rgba(47,109,246,0.12)] px-2.5 py-1.5 text-xs font-bold text-[#9db9ff] transition-colors hover:bg-[rgba(47,109,246,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enhancing ? (
                <span className="h-3 w-3 animate-spin-slow rounded-full border-2 border-[#9db9ff]/30 border-t-[#9db9ff]" />
              ) : (
                <Wand2 size={13} />
              )}
              {t('enhance')}
            </button>
          </div>
        </div>
        <textarea
          id="prompt"
          className="prompt-box !min-h-[110px]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
          placeholder={mode === 'image' ? t('promptPlaceholderImage') : t('promptPlaceholderVideo')}
        />
        <p className="mt-1.5 text-xs text-[var(--dz-text-3)]">
          {t('promptHint')}
        </p>
      </div>

      {/* Auto-enhance toggle */}
      <label className="mb-4 flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-[rgba(47,109,246,0.25)] bg-[rgba(47,109,246,0.08)] px-3.5 py-2.5">
        <input type="checkbox" checked={autoEnhance} onChange={(e) => setAutoEnhance(e.target.checked)} disabled={busy} className="accent-[#2f6df6]" />
        <span className="text-sm text-[#dbe0ef]">
          <Wand2 size={14} className="ms-1.5 inline text-[var(--dz-blue-hover)]" />
          {t('autoEnhance')}
        </span>
      </label>

      {/* Style chips (ref screen 3 genres) */}
      <div className="mb-4">
        <label className="lbl">{t('styleLabel')}</label>
        <div className="flex flex-wrap gap-2">
          {STYLE_PRESETS.map((s) => (
            <button
              key={s.kw}
              type="button"
              disabled={busy}
              className={`dz-chip ${styles.includes(s.kw) ? 'is-active' : ''}`}
              onClick={() => setStyles((cur) => toggleIn(cur, s.kw))}
            >
              {t(`stylePreset.${s.key}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Params */}
      <div className="param-grid mb-4">
        {mode === 'image' && supportedKeys.includes('n') && (
          <Field label={t('countLabel')}>
            <Select value={n} onChange={(e) => setN(Number(e.target.value))} disabled={busy}>
              {[1, 2, 3, 4].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </Select>
          </Field>
        )}
        {mode === 'video' && (
          <Field label={t('durationLabel')}>
            <input className="field" type="number" min={1} max={20} value={duration} onChange={(e) => setDuration(e.target.value)} disabled={busy} placeholder={t('auto')} />
          </Field>
        )}
        {(mode === 'image' && supportedKeys.includes('resolution')) || mode === 'video' ? (
          <Field label={t('resolutionLabel')}>
            <Select value={resolution} onChange={(e) => setResolution(e.target.value)} disabled={busy}>
              <option value="">{t('auto')}</option>
              {(mode === 'video' ? videoResolutionLabels : imageResolutions).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label={t('aspectLabel')}>
          <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={busy}>
            <option value="">{t('auto')}</option>
            {ratioOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </Field>
        {mode === 'image' && supportedKeys.includes('quality') && (
          <Field label={t('qualityLabel')}>
            <Select value={quality} onChange={(e) => setQuality(e.target.value)} disabled={busy}>
              <option value="">{t('auto')}</option>
              {['low', 'medium', 'high', 'auto'].map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </Select>
          </Field>
        )}
        {mode === 'image' && supportedKeys.includes('output_format') && (
          <Field label={t('formatLabel')}>
            <Select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} disabled={busy}>
              <option value="">{t('autoPng')}</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </Select>
          </Field>
        )}
      </div>

      {/* Colour palette (ref screen 3) */}
      <div className="mb-4">
        <label className="lbl">{t('colorsLabel')}</label>
        <div className="flex flex-wrap items-center gap-2">
          {COLOR_PRESETS.map((c) => {
            const active = colors.includes(c.kw);
            const label = t(`colorPreset.${c.key}`);
            return (
              <button
                key={c.kw}
                type="button"
                disabled={busy}
                title={label}
                aria-label={label}
                aria-pressed={active}
                onClick={() => setColors((cur) => toggleIn(cur, c.kw))}
                className={`grid h-8 w-8 place-items-center rounded-full border-2 transition-transform disabled:opacity-50 ${
                  active ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: c.hex }}
              >
                {active && <Check size={14} className="text-black/70" />}
              </button>
            );
          })}
          {colors.length > 0 && (
            <button type="button" onClick={() => setColors([])} disabled={busy} className="dz-chip !px-2.5" aria-label={t('clearColors')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Reference image */}
      <div className="mb-4">
        <label className="lbl">{t('referenceImageLabel', { mode: mode === 'image' ? t('refModeImage') : t('refModeVideo') })}</label>
        {!referenceImage ? (
          <>
            <input ref={filePRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" />
            <button
              onClick={() => filePRef.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-[rgba(47,109,246,0.45)] bg-[rgba(47,109,246,0.06)] px-4 py-6 text-sm text-[var(--dz-text-2)] transition-colors hover:bg-[rgba(47,109,246,0.12)] disabled:opacity-50"
            >
              <Upload size={20} className="text-[var(--dz-blue-hover)]" />
              <span>{t('dropOrBrowse')} <span className="font-bold text-[var(--dz-blue-hover)]">{t('browse')}</span></span>
              <span className="text-[0.7rem] text-[var(--dz-text-3)]">{t('refFormats')}</span>
            </button>
          </>
        ) : (
          <div className="relative overflow-hidden rounded-[14px] border border-[var(--dz-border)]">
            <img src={refPreview} alt={t('refAlt')} className="block max-h-52 w-full object-cover" />
            <button
              onClick={clearRef}
              disabled={busy}
              className="absolute start-2 top-2 flex items-center gap-1.5 rounded-[10px] bg-black/70 px-2.5 py-1.5 text-xs text-white"
            >
              <X size={14} /> {t('remove')}
            </button>
          </div>
        )}
      </div>

      {/* Streaming toggle */}
      {mode === 'image' && supportsStream && (
        <label className="mb-4 flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-[rgba(40,215,255,0.22)] bg-[rgba(40,215,255,0.06)] px-3.5 py-2.5">
          <input type="checkbox" checked={useStreaming} onChange={(e) => setUseStreaming(e.target.checked)} disabled={busy} className="accent-[#28d7ff]" />
          <span className="text-sm text-[#dbe0ef]">
            <Sparkles size={14} className="ms-1.5 inline text-[var(--dz-cyan)]" />
            {t('streamingLabel')}
          </span>
        </label>
      )}

      <Button fullWidth size="lg" onClick={submit} loading={busy} disabled={!prompt || modelsLoading} leftIcon={mode === 'image' ? <ImageIcon size={18} /> : <VideoIcon size={18} />}>
        {enhancing ? t('btnEnhancing') : running ? pollingText || t('btnGenerating') : mode === 'image' ? t('btnGenerateImage') : t('btnGenerateVideo')}
        <span className="shine" />
      </Button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[rgba(255,91,110,0.3)] bg-[rgba(255,91,110,0.1)] px-3.5 py-3 text-sm text-[#fda4af]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
    </>
  );

  /* ---------- Side panel: Info tab ---------- */
  const InfoPanel = (
    <div className="space-y-4 text-sm">
      {currentModel ? (
        <>
          <div>
            <div className="lbl">{t('infoCurrentModel')}</div>
            <div className="rounded-[12px] border border-[var(--dz-border)] bg-[var(--dz-panel)] p-3">
              <div className="font-bold text-white">{currentModel.name}</div>
              <div dir="ltr" className="mt-1 truncate text-xs text-[var(--dz-text-3)]">{currentModel.id}</div>
              {supportsStream && (
                <span className="badge badge-cyan mt-2">
                  <Sparkles size={11} /> {t('supportsStream')}
                </span>
              )}
            </div>
          </div>
          {supportedKeys.length > 0 && (
            <div>
              <div className="lbl">{t('infoSupportedParams')}</div>
              <div className="flex flex-wrap gap-1.5">
                {supportedKeys.map((k) => (
                  <span key={k} dir="ltr" className="badge">{k}</span>
                ))}
              </div>
            </div>
          )}
          {mode === 'video' && videoResolutions.length > 0 && (
            <div>
              <div className="lbl">{t('infoSupportedResolutions')}</div>
              <div className="flex flex-wrap gap-1.5">
                {videoResolutions.map((r) => (
                  <span key={r} dir="ltr" className="badge">{r}</span>
                ))}
              </div>
            </div>
          )}
          {mode === 'video' && videoRatios.length > 0 && (
            <div>
              <div className="lbl">{t('infoSupportedRatios')}</div>
              <div className="flex flex-wrap gap-1.5">
                {videoRatios.map((r) => (
                  <span key={r} dir="ltr" className="badge">{r}</span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-[var(--dz-text-2)]">{t('infoEmpty')}</p>
      )}
      <div className="rounded-[12px] border border-[var(--dz-border)] bg-[var(--dz-panel)] p-3 text-xs leading-relaxed text-[var(--dz-text-2)]">
        {t('infoTip')}
      </div>
    </div>
  );

  /* ---------- Side panel: Success state (ref screen 2) ---------- */
  const SuccessPanel = result && (
    <div className="flex flex-col items-center pt-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-[rgba(53,214,122,0.4)] bg-[rgba(53,214,122,0.12)] text-[var(--dz-green)]">
        <CheckCircle2 size={28} />
      </span>
      <h3 className="mt-3 text-lg font-extrabold text-[var(--dz-green)]">{t('successTitle')}</h3>
      <p className="mt-1 text-xs text-[var(--dz-text-3)]">{t('successSubtitle')}</p>

      <div className="mt-5 w-full space-y-2.5">
        {result.assets.length > 0 && (
          <Button
            fullWidth
            onClick={() =>
              result.assets.forEach((a, i) => downloadAsset(a, `orms-${result.id}-${i}.${mode === 'image' ? 'png' : 'mp4'}`))
            }
            leftIcon={<Download size={17} />}
          >
            {result.assets.length > 1 ? t('downloadCount', { count: result.assets.length }) : t('download')}
            <span className="shine" />
          </Button>
        )}
        <Button fullWidth variant="secondary" onClick={() => setResult(null)} leftIcon={<RefreshCw size={16} />}>
          {t('regenerate')}
        </Button>
        <Button fullWidth variant="ghost" onClick={copyPrompt} leftIcon={copied ? <Check size={16} className="text-[var(--dz-green)]" /> : <Copy size={16} />}>
          {copied ? t('copied') : t('copyPrompt')}
        </Button>
      </div>

      {/* Metadata */}
      <dl className="mt-6 w-full space-y-2 border-t border-[var(--dz-border)] pt-4 text-sm">
        {(
          [
            [t('metaType'), mode === 'image' ? t('modeImage') : t('modeVideo')],
            [t('metaModel'), currentModel?.name || selectedModelId],
            [t('metaAssetCount'), String(result.assets.length)],
            result.cost != null ? [t('metaCost'), `$${Number(result.cost).toFixed(4)}`] : null,
            result.at ? [t('metaDate'), new Date(result.at).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' })] : null,
          ].filter(Boolean) as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-[var(--dz-text-3)]">{k}</dt>
            <dd className="truncate font-semibold text-[#dbe0ef]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <div className="gen-layout-v2">
      {/* PREVIEW PANEL — dominant, reading-start side (right in RTL) */}
      <section
        aria-label={t('previewLabel')}
        className={`relative flex min-h-[480px] flex-col overflow-hidden rounded-[22px] border border-[var(--dz-border)] bg-[var(--dz-panel)] p-4 lg:min-h-[620px] ${
          running ? 'gen-border-active' : ''
        }`}
      >
        {busy && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="spin-slow h-16 w-16 rounded-full" style={{ border: '4px solid rgba(47,109,246,0.2)', borderTopColor: 'var(--dz-blue)' }} />
            <div className="text-sm text-[var(--dz-text-2)]">{enhancing ? t('previewBusyEnhance') : pollingText || t('previewBusyGenerate')}</div>
            {mode === 'image' && useStreaming && supportsStream && partialProgress > 0 && (
              <div className="text-xs text-[var(--dz-cyan)]">{t('streamUpdates', { count: partialProgress })}</div>
            )}
          </div>
        )}

        {!busy && !result && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-[24px] bg-[rgba(47,109,246,0.12)]">
              <Wallpaper size={34} className="text-[var(--dz-blue-hover)]" />
            </span>
            <div className="text-sm font-semibold text-[#dbe0ef]">{t('previewEmptyTitle')}</div>
            <div className="max-w-xs text-xs leading-relaxed text-[var(--dz-text-3)]">
              {t('previewEmptyDesc')}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {[t('stylePreset.cinematic'), t('stylePreset.photorealistic'), t('stylePreset.product'), '3D'].map((c) => (
                <span key={c} className="dz-chip !cursor-default">{c}</span>
              ))}
            </div>
          </div>
        )}

        {showSuccess && result && (
          <div className="flex flex-1 flex-col">
            <div className={`grid flex-1 content-center gap-4 ${result.assets.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {result.assets.map((a, i) => (
                <div key={i} className="group relative overflow-hidden rounded-[16px] border border-[var(--dz-border)] bg-[var(--dz-bg)]">
                  {mode === 'image' ? (
                    <img src={a} alt={t('resultAlt', { index: i + 1 })} className="mx-auto block max-h-[70vh] w-auto max-w-full" />
                  ) : (
                    <video src={a} controls playsInline className="block max-h-[70vh] w-full" />
                  )}
                  <button
                    onClick={() => downloadAsset(a, `orms-${result.id}-${i}.${mode === 'image' ? 'png' : 'mp4'}`)}
                    className="absolute bottom-2 start-2 flex items-center gap-1.5 rounded-[10px] bg-black/70 px-2.5 py-1.5 text-xs text-white opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Download size={14} /> {t('download')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SIDE PANEL — Properties / Info tabs, or success state after completion */}
      <aside className="overflow-hidden rounded-[22px] border border-[var(--dz-border)] bg-[var(--dz-card)] p-5" aria-label={t('settingsLabel')}>
        {showSuccess ? (
          SuccessPanel
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-extrabold text-white">{t('createTitle')}</h2>
                <p className="mt-0.5 text-xs text-[var(--dz-text-3)]">{t('subtitle')}</p>
              </div>
              <div className="segmented !p-1" role="tablist" aria-label={t('panelTabsLabel')}>
                <button
                  role="tab"
                  aria-selected={panelTab === 'props'}
                  className={`segmented-tab !px-3 !py-1.5 !text-xs ${panelTab === 'props' ? 'is-active' : ''}`}
                  onClick={() => setPanelTab('props')}
                >
                  <SlidersHorizontal size={13} /> {t('tabProps')}
                </button>
                <button
                  role="tab"
                  aria-selected={panelTab === 'info'}
                  className={`segmented-tab !px-3 !py-1.5 !text-xs ${panelTab === 'info' ? 'is-active' : ''}`}
                  onClick={() => setPanelTab('info')}
                >
                  <Info size={13} /> {t('tabInfo')}
                </button>
              </div>
            </div>
            {panelTab === 'props' ? PropertiesForm : InfoPanel}
          </>
        )}
      </aside>
    </div>
  );
}
