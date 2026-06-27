// Load .env from project root
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Express server — bootstrap API routes + serve built frontend in production
const express = require('express');
const cors = require('cors');
const path = require('path');

// Init DB eagerly so migrations run before requests
const { getDB } = require('./db/database');
getDB();

const authRoutes = require('./routes/auth');
const modelsRoutes = require('./routes/models');
const generateRoutes = require('./routes/generate');
const assetsRoutes = require('./routes/assets');

const app = express();
app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/generations', (req, res, next) => next()); // fall-through handled by generate router

// SPA static + fallback — try several candidate dirs in order
const fs = require('fs');
const candidates = [
  process.env.STATIC_DIR,
  path.join(__dirname, '../public'),          // Docker: frontend/dist → ./public
  path.join(__dirname, '../../frontend/dist'), // Dev: serve built bundle
].filter(Boolean);
let staticDir = null;
for (const c of candidates) {
  if (c && fs.existsSync(c)) { staticDir = c; break; }
}

if (staticDir) {
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });
  console.log('[static] Serving frontend from', staticDir);
} else {
  console.log('[static] No frontend build found — API-only mode.');
}

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`OpenRouter Media Studio backend listening on :${PORT}`);
});