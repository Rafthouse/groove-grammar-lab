/**
 * Generates resources/icon.png with no external dependencies (raw PNG via zlib).
 *
 * Motif mirrors the in-app brand mark: a rounded dark tile with repeating
 * core / ornament / fill vertical stripes and a darker centre notch.
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = resolve(__dirname, "../resources/icon.png");
const SIZE = 256;

const BG = [16, 18, 20]; // #101214
const PANEL = [24, 27, 31]; // #181b1f
const STRIPES = [
  [246, 200, 95], // core   #f6c85f
  [94, 196, 166], // ornament #5ec4a6
  [232, 109, 109] // fill   #e86d6d
];

// ── CRC32 ──
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, "ascii");
  const lb = Buffer.alloc(4);
  lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4);
  cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

const pixels = new Uint8Array(SIZE * SIZE * 3);
function set(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 3;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
}

// background
for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) set(x, y, BG);

// rounded-rect tile
const PAD = 22;
const R = 44;
function inRoundRect(x, y) {
  const x1 = PAD;
  const y1 = PAD;
  const x2 = SIZE - PAD;
  const y2 = SIZE - PAD;
  if (x < x1 || x >= x2 || y < y1 || y >= y2) return false;
  const checks = [
    [x1 + R, y1 + R, x <= x1 + R, y <= y1 + R],
    [x2 - R, y1 + R, x >= x2 - R, y <= y1 + R],
    [x1 + R, y2 - R, x <= x1 + R, y >= y2 - R],
    [x2 - R, y2 - R, x >= x2 - R, y >= y2 - R]
  ];
  for (const [cx, cy, inX, inY] of checks) {
    if (inX && inY && Math.hypot(x - cx, y - cy) > R) return false;
  }
  return true;
}

const inner = SIZE - 2 * PAD;
const stripeW = inner / 9; // nine vertical stripes
const notchStart = PAD + inner * 0.43;
const notchEnd = PAD + inner * 0.57;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inRoundRect(x, y)) continue;
    if (x >= notchStart && x < notchEnd) {
      set(x, y, PANEL); // centre notch
      continue;
    }
    const band = Math.floor((x - PAD) / stripeW);
    set(x, y, STRIPES[band % STRIPES.length]);
  }
}

// ── build PNG (RGB, filter None) ──
const rows = [];
for (let y = 0; y < SIZE; y++) {
  rows.push(0);
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 3;
    rows.push(pixels[i], pixels[i + 1], pixels[i + 2]);
  }
}

const idat = deflateSync(Buffer.from(rows), { level: 6 });
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 2;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0))
]);

mkdirSync(resolve(__dirname, "../resources"), { recursive: true });
writeFileSync(OUT_FILE, png);
console.log(`Icon written: ${OUT_FILE} (${png.length} bytes)`);
