// Generate routes: image + video via OpenRouter
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { auth } = require('../middleware/auth');
const { getDB } = require('../db/database');
const orouter = require('../services/openrouter');

const router = express.Router();

// Persistent upload storage
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../../data/uploads');
const ASSETS_DIR = process.env.ASSETS_DIR || path.join(__dirname, '../../../data/assets');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

function relPath(abs) { return path.relative(ASSETS_DIR, abs); }

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.png').toLowerCase();
      cb(null, `up_${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB upload cap
});

// ============ IMAGE GENERATION ============

// POST /api/generate/image
// body: { model, prompt, n?, resolution?, aspect_ratio?, quality?, output_format?, background?, seed?, stream? }
// files (multipart): image (optional reference image)
// Supports both JSON and multipart/form-data.
router.post('/image', auth, upload.single('image'), async (req, res) => {
  const t0 = Date.now();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (!body.model || !body.prompt) {
    return res.status(400).json({ error: 'النموذج والبرومبت مطلوبان' });
  }
  const db = getDB();
  const wantStream = body.stream === true || body.stream === 'true';
  const params = {
    model: body.model,
    prompt: body.prompt
  };
  for (const k of ['n','resolution','aspect_ratio','quality','output_format','background','seed']) {
    if (body[k] !== undefined && body[k] !== '') {
      const v = body[k];
      if (k === 'n' || k === 'seed') {
        const num = Number(v);
        if (!Number.isNaN(num)) params[k] = num; // skip non-numeric instead of forwarding NaN
      } else {
        params[k] = v;
      }
    }
  }
  // Optional reference image
  let uploadedPath = null, uploadedMime = null;
  if (req.file) {
    uploadedPath = req.file.path;
    uploadedMime = req.file.mimetype;
    try {
      const dataUrl = orouter.fileToDataUrl(uploadedPath, uploadedMime);
      params.input_references = [{ type: 'image_url', image_url: { url: dataUrl } }];
    } catch (e) { return res.status(400).json({ error: 'فشل قراءة الصورة المرجعية' }); }
  }

  // Create DB record as pending
  const recordId = db.prepare(`INSERT INTO generations
    (user_id, type, model_id, model_name, prompt, params_json, status)
    VALUES (?, 'image', ?, ?, ?, ?, 'pending')`).run(
      req.userId, body.model, body.model, body.prompt, JSON.stringify(params)
  ).lastInsertRowid;

  if (wantStream) {
    return streamImage(req, res, db, recordId, params, body, t0);
  }

  // Non-streaming
  try {
    const result = await orouter.generateImage(params);
    const items = result.data || [];
    const saved = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.b64_json) continue;
      const buf = Buffer.from(it.b64_json, 'base64');
      // Detect format from magic bytes — Gemini sometimes returns JPEG under image/png
      const isJpeg = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
      const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      let mediaType, ext;
      if (isJpeg) { mediaType = 'image/jpeg'; ext = '.jpg'; }
      else if (isPng) { mediaType = 'image/png'; ext = '.png'; }
      else if (it.media_type === 'image/webp') { mediaType = 'image/webp'; ext = '.webp'; }
      else if (it.media_type === 'image/svg+xml') { mediaType = 'image/svg+xml'; ext = '.svg'; }
      else { mediaType = it.media_type || 'image/png'; ext = '.png'; }
      const fname = `img_${recordId}_${i}${ext}`;
      fs.writeFileSync(path.join(ASSETS_DIR, fname), buf);
      saved.push({ filename: fname, media_type: mediaType });
    }
    if (saved.length === 0) throw new Error('لم يُرجع الموديل أي صورة');
    const cost = result.usage?.cost ? String(result.usage.cost) : null;
    const assets = saved.map(s => s.filename).join(',');
    const mediaTypes = saved.map(s => s.media_type).join(',');
    db.prepare(`UPDATE generations SET status='completed', asset_path=?, asset_media_type=?, cost=?, duration_ms=?, updated_at=datetime('now') WHERE id=?`).run(
      assets, mediaTypes, cost, Date.now()-t0, recordId
    );
    res.json({
      id: recordId,
      status: 'completed',
      duration_ms: Date.now()-t0,
      cost,
      assets: saved,
      usage: result.usage,
    });
  } catch (e) {
    console.error('image gen error:', e.message);
    db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(e.message, recordId);
    res.status(502).json({ id: recordId, error: 'فشل توليد الصورة', detail: e.message });
  }
});

// Streaming version — SSE
function streamImage(req, res, db, recordId, params, body, t0) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // We use fetch directly to consume SSE
  const fetch = require('node-fetch');
  const streamParams = { ...params, stream: true };
  fetch(`${orouter.BASE}/images`, {
    method: 'POST',
    headers: orouter.headers(),
    body: JSON.stringify(streamParams),
  }).then(async (upstream) => {
    if (!upstream.ok) {
      const t = await upstream.text();
      db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(t, recordId);
      send({ type: 'error', error: { message: t } });
      return res.end();
    }
    upstream.body.setEncoding('utf8');
    let buf = '';
    let finalItem = null;
    for await (const chunk of upstream.body) {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line || !line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') { send({ type: 'done' }); continue; }
        try {
          const evt = JSON.parse(payload);
          // Forward partial events raw to client
          if (evt.type === 'image_generation.partial_image') {
            send({ type: 'partial', index: evt.partial_image_index, b64: evt.b64_json });
          } else if (evt.type === 'image_generation.completed') {
            finalItem = evt;
            const mediaType = evt.media_type || 'image/png';
            const ext = mediaType === 'image/jpeg' ? '.jpg'
              : mediaType === 'image/webp' ? '.webp'
              : mediaType === 'image/svg+xml' ? '.svg' : '.png';
            const fname = `img_${recordId}_0${ext}`;
            fs.writeFileSync(path.join(ASSETS_DIR, fname), Buffer.from(evt.b64_json, 'base64'));
            const cost = evt.usage?.cost ? String(evt.usage.cost) : null;
            db.prepare(`UPDATE generations SET status='completed', asset_path=?, asset_media_type=?, cost=?, duration_ms=?, updated_at=datetime('now') WHERE id=?`).run(
              fname, mediaType, cost, Date.now()-t0, recordId
            );
            send({ type: 'completed', id: recordId, filename: fname, cost });
          } else if (evt.type === 'error') {
            db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(JSON.stringify(evt.error), recordId);
            send({ type: 'error', error: evt.error });
          } else {
            send(evt);
          }
        } catch (e) { /* ignore non-JSON */ }
      }
    }
    res.end();
  }).catch(e => {
    db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(e.message, recordId);
    send({ type: 'error', error: { message: e.message } });
    res.end();
  });
}

// ============ VIDEO GENERATION ============

// POST /api/generate/video
router.post('/video', auth, upload.single('image'), async (req, res) => {
  const t0 = Date.now();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (!body.model || !body.prompt) return res.status(400).json({ error: 'النموذج والبرومبت مطلوبان' });
  const db = getDB();
  const params = { model: body.model, prompt: body.prompt };
  for (const k of ['duration','resolution','aspect_ratio','size']) {
    if (body[k] !== undefined && body[k] !== '') {
      if (k === 'duration') {
        const num = Number(body[k]);
        if (!Number.isNaN(num)) params[k] = num; // skip non-numeric instead of forwarding NaN
      } else {
        params[k] = body[k];
      }
    }
  }
  // Optional image -> as frame_image (first_frame) for image-to-video
  let uploadedPath = null;
  if (req.file) {
    uploadedPath = req.file.path;
    try {
      const dataUrl = orouter.fileToDataUrl(req.file.path, req.file.mimetype);
      params.frame_images = [{ type: 'image_url', image_url: { url: dataUrl }, frame_type: 'first_frame' }];
    } catch (e) { return res.status(400).json({ error: 'فشل قراءة الصورة المرجعية' }); }
  }

  // Insert record as pending
  const recordId = db.prepare(`INSERT INTO generations
    (user_id, type, model_id, model_name, prompt, params_json, status)
    VALUES (?, 'video', ?, ?, ?, ?, 'pending')`).run(
      req.userId, body.model, body.model, body.prompt, JSON.stringify(params)
  ).lastInsertRowid;

  try {
    const submit = await orouter.submitVideo(params);
    const jobId = submit.id;
    const pollingUrl = submit.polling_url;
    db.prepare(`UPDATE generations SET status='pending', job_id=?, polling_url=?, updated_at=datetime('now') WHERE id=?`).run(jobId, pollingUrl, recordId);
    // Don't block forever; return job_id, client polls /api/generations/:id
    res.json({
      id: recordId,
      job_id: jobId,
      polling_url: pollingUrl,
      status: 'pending',
      message: 'تم استلام طلب الفيديو — استخدم GET /api/generations/' + recordId + ' للمتابعة'
    });
    // Fire-and-forget background poll to auto-update
    pollAndDownloadVideo(recordId, jobId, t0).catch(e => {
      console.error('background poll failed:', e.message);
    });
  } catch (e) {
    console.error('video submit error:', e.message);
    db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(e.message, recordId);
    res.status(502).json({ id: recordId, error: 'فشل إرسال طلب الفيديو', detail: e.message });
  }
});

// Background poll loop: poll every 10s for up to ~15 minutes, then download the file
async function pollAndDownloadVideo(recordId, jobId, t0) {
  const db = getDB();
  const MAX_POLLS = 90; // 15 min @ 10s
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, 10000));
    let resp;
    try { resp = await orouter.pollVideo(jobId); }
    catch (e) { console.warn(`poll ${recordId}/${jobId} #${i}: ${e.message}`); continue; }
    const status = resp.status;
    db.prepare(`UPDATE generations SET status=?, updated_at=datetime('now') WHERE id=?`).run(status === 'in_progress' ? 'in_progress' : status, recordId);
    if (status === 'completed') {
      const urls = resp.unsigned_urls || [];
      if (urls.length === 0) break;
      // Download first video
      try {
        const buf = await orouter.downloadVideoContent(jobId, 0);
        const fname = `vid_${recordId}_0.mp4`;
        fs.writeFileSync(path.join(ASSETS_DIR, fname), buf);
        const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
        db.prepare(`UPDATE generations SET status='completed', asset_path=?, asset_media_type='video/mp4', cost=?, duration_ms=?, updated_at=datetime('now') WHERE id=?`).run(
          fname, cost, Date.now()-t0, recordId
        );
      } catch (e) {
        db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run('download failed: ' + e.message, recordId);
      }
      return;
    } else if (status === 'failed') {
      db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(resp.error || 'generation failed', recordId);
      return;
    }
  }
  db.prepare(`UPDATE generations SET status='failed', error='timeout waiting for video', updated_at=datetime('now') WHERE id=?`).run(recordId);
}

// ============ HISTORY ============
router.get('/generations', auth, (req, res) => {
  const db = getDB();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const type = req.query.type;
  let q = 'SELECT id, type, model_id, model_name, prompt, status, asset_path, asset_media_type, cost, thumbnail_path, error, duration_ms, created_at, updated_at FROM generations WHERE user_id=?';
  const args = [req.userId];
  if (type) { q += ' AND type=?'; args.push(type); }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);
  const rows = db.prepare(q).all(...args);
  // Convert comma-separated asset_path -> array of URLs
  const items = rows.map(r => {
    const assets = (r.asset_path || '').split(',').filter(Boolean).map(fn => `/api/assets/${fn}`);
    return { ...r, asset_urls: assets };
  });
  res.json({ data: items, limit, offset });
});

router.get('/generations/:id', auth, (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  const assets = (row.asset_path || '').split(',').filter(Boolean).map(fn => `/api/assets/${fn}`);
  res.json({ ...row, asset_urls: assets });
});

// Force-update video status from OpenRouter (used by client polling)
router.post('/generations/:id/poll', auth, async (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  if (row.type !== 'video' || !row.job_id) return res.status(400).json({ error: 'ليس طلب فيديو صالح' });
  if (row.status === 'completed' || row.status === 'failed') return res.json({ status: row.status, id: row.id });
  try {
    const resp = await orouter.pollVideo(row.job_id);
    const status = resp.status;
    if (status === 'completed') {
      const urls = resp.unsigned_urls || [];
      if (urls.length > 0) {
        const buf = await orouter.downloadVideoContent(row.job_id, 0);
        const fname = `vid_${row.id}_0.mp4`;
        fs.writeFileSync(path.join(ASSETS_DIR, fname), buf);
        const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
        db.prepare(`UPDATE generations SET status='completed', asset_path=?, asset_media_type='video/mp4', cost=?, updated_at=datetime('now') WHERE id=?`).run(
          fname, cost, row.id
        );
        return res.json({ id: row.id, status: 'completed' });
      }
    }
    db.prepare(`UPDATE generations SET status=?, updated_at=datetime('now') WHERE id=?`).run(
      status === 'in_progress' ? 'in_progress' : status, row.id
    );
    res.json({ id: row.id, status });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Delete a generation
router.delete('/generations/:id', auth, (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  // Delete asset files
  for (const fn of (row.asset_path || '').split(',')) {
    if (!fn) continue;
    const p = path.join(ASSETS_DIR, fn);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('DELETE FROM generations WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;