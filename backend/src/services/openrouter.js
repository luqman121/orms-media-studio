// OpenRouter API client — wrappers for image + video endpoints
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const BASE = process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY || '';
const APP_REFERER = process.env.APP_REFERER || 'http://localhost:3001';
const APP_TITLE = process.env.APP_TITLE || 'OpenRouter Media Studio';

if (!API_KEY) console.warn('[openrouter] WARNING: OPENROUTER_API_KEY not set — generation routes will 500.');

function headers(extra) {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': APP_REFERER,
    'X-Title': APP_TITLE,
    ...(extra || {})
  };
}

// Cache TTL for model list (1 hour)
const MODEL_CACHE_MS = 60 * 60 * 1000;

let _imageModelsCache = null;
let _imageModelsAt = 0;
let _videoModelsCache = null;
let _videoModelsAt = 0;

async function listImageModels() {
  if (_imageModelsCache && Date.now() - _imageModelsAt < MODEL_CACHE_MS) return _imageModelsCache;
  const r = await fetch(`${BASE}/images/models`, { headers: headers() });
  if (!r.ok) throw new Error(`Image models: ${r.status} ${await r.text()}`);
  const j = await r.json();
  _imageModelsCache = (j.data || []).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    supported_parameters: m.supported_parameters || {},
    supports_streaming: !!m.supports_streaming,
    type: 'image',
  }));
  _imageModelsAt = Date.now();
  return _imageModelsCache;
}

async function listVideoModels() {
  if (_videoModelsCache && Date.now() - _videoModelsAt < MODEL_CACHE_MS) return _videoModelsCache;
  const r = await fetch(`${BASE}/videos/models`, { headers: headers() });
  if (!r.ok) throw new Error(`Video models: ${r.status} ${await r.text()}`);
  const j = await r.json();
  _videoModelsCache = (j.data || []).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    supported_resolutions: m.supported_resolutions || [],
    supported_aspect_ratios: m.supported_aspect_ratios || [],
    supported_sizes: m.supported_sizes || [],
    pricing_skus: m.pricing_skus || {},
    allowed_passthrough_parameters: m.allowed_passthrough_parameters || [],
    type: 'video',
  }));
  _videoModelsAt = Date.now();
  return _videoModelsCache;
}

// Synchronous image generation — returns { data: [{b64_json}], usage }
async function generateImage(body) {
  const r = await fetch(`${BASE}/images`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Image gen ${r.status}: ${text}`);
  return JSON.parse(text);
}

// Async video generation — submit returns { id, polling_url, status }
async function submitVideo(body) {
  const r = await fetch(`${BASE}/videos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Video submit ${r.status}: ${text}`);
  return JSON.parse(text);
}

// Poll video job — returns full status object
async function pollVideo(jobId) {
  const r = await fetch(`${BASE}/videos/${jobId}`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) throw new Error(`Video poll ${r.status}: ${text}`);
  return JSON.parse(text);
}

// Download video content — returns Buffer
async function downloadVideoContent(jobId, index=0) {
  const r = await fetch(`${BASE}/videos/${jobId}/content?index=${index}`, { headers: headers() });
  if (!r.ok) throw new Error(`Video content ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

// Upload local image to OpenRouter (returns URL or data URL for input_references)
// OpenRouter accepts base64 data URLs; simpler to just inline.
function fileToDataUrl(filePath, mimeType) {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

module.exports = {
  headers, BASE, API_KEY,
  listImageModels, listVideoModels,
  generateImage, submitVideo, pollVideo, downloadVideoContent,
  fileToDataUrl,
};