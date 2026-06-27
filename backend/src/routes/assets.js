// Static asset serving — /api/assets/<filename>
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const ASSETS_DIR = process.env.ASSETS_DIR || path.join(__dirname, '../../../data/assets');

router.get('/:filename', (req, res) => {
  // Refuse path traversal
  const fn = path.basename(req.params.filename);
  const abs = path.join(ASSETS_DIR, fn);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'الملف غير موجود' });
  const ext = path.extname(fn).toLowerCase();
  const types = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
  };
  res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(abs);
});

module.exports = router;