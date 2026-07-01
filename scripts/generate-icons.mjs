// Generates solid-color PWA icons using only Node.js built-ins (no external deps).
// Run once: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '..', 'apps', 'web', 'public', 'icons');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// CRC32 table for PNG chunk checksums.
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0);
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4);
  lb.writeUInt32BE(data.length, 0);
  const cb = Buffer.alloc(4);
  cb.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([lb, tb, data, cb]);
}

function solidPNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB color type

  // Raw image: per row = filter byte (0=None) + w*3 RGB bytes.
  const rowStride = 1 + w * 3;
  const raw = Buffer.alloc(h * rowStride);
  for (let y = 0; y < h; y++) {
    const o = y * rowStride;
    raw[o] = 0;
    for (let x = 0; x < w; x++) {
      raw[o + 1 + x * 3] = r;
      raw[o + 1 + x * 3 + 1] = g;
      raw[o + 1 + x * 3 + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Brand violet #864FF2 = rgb(134, 79, 242)
const [r, g, b] = [134, 79, 242];

writeFileSync(join(outDir, 'icon-192.png'), solidPNG(192, 192, r, g, b));
writeFileSync(join(outDir, 'icon-512.png'), solidPNG(512, 512, r, g, b));
writeFileSync(join(outDir, 'apple-touch-icon.png'), solidPNG(180, 180, r, g, b));

console.log('PWA icons generated in apps/web/public/icons/');
