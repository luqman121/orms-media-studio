// Models routes — list image / video models from OpenRouter (cached)
const express = require('express');
const { auth } = require('../middleware/auth');
const { listImageModels, listVideoModels } = require('../services/openrouter');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const type = req.query.type; // 'image' | 'video' | undefined (both)
  try {
    const out = {};
    if (!type || type === 'image') out.images = await listImageModels();
    if (!type || type === 'video') out.videos = await listVideoModels();
    res.json(out);
  } catch (e) {
    console.error('models:', e.message);
    res.status(502).json({ error: 'فشل جلب النماذج من OpenRouter', detail: e.message });
  }
});

router.get('/image', auth, async (req, res) => {
  try { res.json({ data: await listImageModels() }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});

router.get('/video', auth, async (req, res) => {
  try { res.json({ data: await listVideoModels() }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});

module.exports = router;