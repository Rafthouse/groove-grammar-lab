/**
 * Generates favicon-32.png, favicon-192.png, favicon-512.png and og-image.png
 * using the same brand motif (stripes) as the Electron icon.
 * No external dependencies — pure Node.js zlib PNG encoding.
 */

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const BG       = [16, 18, 20];
const PANEL    = [24, 27, 31];
const STRIPES  = [[246, 200, 95], [94, 196, 166], [232, 109, 109]];
const TEXT_CLR = [240, 244, 240];
const MUTED    = [168, 176, 172];

// ── CRC32 / PNG helpers ────────────────────────────────────────────────────────
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
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}
function encodePNG(pixels, w, h) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      rows.push(pixels[i], pixels[i + 1], pixels[i + 2]);
    }
  }
  const idat = deflateSync(Buffer.from(rows), { level: 6 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))
  ]);
}

// ── Square icon (any size) ─────────────────────────────────────────────────────
function makeIcon(size) {
  const px = new Uint8Array(size * size * 3);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  };

  const PAD = Math.round(size * 0.085);
  const R   = Math.round(size * 0.17);
  const x1 = PAD, y1 = PAD, x2 = size - PAD, y2 = size - PAD;
  const inner = x2 - x1;
  const stripeW = inner / 9;
  const notchS = x1 + inner * 0.43;
  const notchE = x1 + inner * 0.57;

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < x1 || x >= x2 || y < y1 || y >= y2) continue;
      const corners = [[x1+R,y1+R,x<=x1+R,y<=y1+R],[x2-R,y1+R,x>=x2-R,y<=y1+R],
                       [x1+R,y2-R,x<=x1+R,y>=y2-R],[x2-R,y2-R,x>=x2-R,y>=y2-R]];
      if (corners.some(([cx,cy,inX,inY]) => inX && inY && Math.hypot(x-cx,y-cy) > R)) continue;
      if (x >= notchS && x < notchE) { set(x, y, PANEL); continue; }
      set(x, y, STRIPES[Math.floor((x - x1) / stripeW) % STRIPES.length]);
    }
  }
  return px;
}

// ── OG image 1200×630 ─────────────────────────────────────────────────────────
function makeOG(w, h) {
  const px = new Uint8Array(w * h * 3);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3;
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  };
  // background
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, BG);

  // three full-height stripe bands with dark gaps
  const stripeW = Math.round(w / 9);
  for (let y = 0; y < h; y++) {
    for (let band = 0; band < 9; band++) {
      const x0 = band * stripeW;
      const col = STRIPES[band % STRIPES.length];
      const dim = [Math.round(col[0]*0.28), Math.round(col[1]*0.28), Math.round(col[2]*0.28)];
      for (let x = x0; x < x0 + stripeW - 2 && x < w; x++) set(x, y, dim);
    }
  }

  // centre dark panel (logo area)
  const px0 = Math.round(w * 0.5) - 380;
  const py0 = Math.round(h * 0.5) - 160;
  const pw = 760, ph = 320;
  for (let y = py0; y < py0 + ph; y++)
    for (let x = px0; x < px0 + pw; x++) set(x, y, PANEL);

  // brand stripe block (mini icon, 140×140, centred left in panel)
  const iconX = px0 + 36, iconY = py0 + ph / 2 - 70, iconS = 140;
  const icon = makeIcon(iconS);
  for (let iy = 0; iy < iconS; iy++)
    for (let ix = 0; ix < iconS; ix++) {
      const i = (iy * iconS + ix) * 3;
      set(iconX + ix, iconY + iy, [icon[i], icon[i+1], icon[i+2]]);
    }

  // text lines — drawn with a minimal 5×7 bitmap font
  // Letters used: G r o v e  G a m a r L b
  const GLYPHS = {
    " ": [0,0,0,0,0],
    "G": [0b01110,0b10000,0b10111,0b10001,0b01110],
    "r": [0b00000,0b10110,0b11000,0b10000,0b10000],
    "o": [0b00000,0b01110,0b10001,0b10001,0b01110],
    "v": [0b00000,0b10001,0b10001,0b01010,0b00100],
    "e": [0b00000,0b01110,0b11111,0b10000,0b01110],
    "a": [0b00000,0b01110,0b10001,0b10011,0b01101],
    "m": [0b00000,0b11011,0b10101,0b10101,0b10001],
    "L": [0b10000,0b10000,0b10000,0b10000,0b11111],
    "b": [0b10000,0b10110,0b11001,0b10001,0b11110],
    "E": [0b11111,0b10000,0b11100,0b10000,0b11111],
    "d": [0b00001,0b01101,0b10011,0b10001,0b01101],
    "u": [0b00000,0b10001,0b10001,0b10011,0b01101],
    "c": [0b00000,0b01110,0b10000,0b10000,0b01110],
    "t": [0b01000,0b11100,0b01000,0b01001,0b00110],
    "i": [0b01000,0b00000,0b01000,0b01000,0b01110],
    "n": [0b00000,0b11010,0b10110,0b10010,0b10010],
    "l": [0b01100,0b00100,0b00100,0b00100,0b01110],
    "D": [0b11100,0b10010,0b10001,0b10010,0b11100],
    "M": [0b10001,0b11011,0b10101,0b10001,0b10001],
    "s": [0b00000,0b01110,0b01100,0b00110,0b11100],
    "h": [0b10000,0b10110,0b11001,0b10001,0b10001],
    "y": [0b00000,0b10001,0b01011,0b00101,0b11010],
    "R": [0b11110,0b10001,0b11110,0b10100,0b10010],
    "f": [0b00110,0b01000,0b11100,0b01000,0b01000],
    "p": [0b00000,0b11110,0b10001,0b11110,0b10000],
    "x": [0b00000,0b10001,0b01010,0b01010,0b10001],
    "W": [0b10001,0b10001,0b10101,0b11011,0b10001],
    "A": [0b01110,0b10001,0b11111,0b10001,0b10001],
    "I": [0b11111,0b00100,0b00100,0b00100,0b11111],
    "/": [0b00001,0b00010,0b00100,0b01000,0b10000],
    "-": [0b00000,0b00000,0b11111,0b00000,0b00000],
    ",": [0b00000,0b00000,0b00100,0b00100,0b01000],
    ".": [0b00000,0b00000,0b00000,0b01100,0b01100],
    "+": [0b00000,0b00100,0b11111,0b00100,0b00000],
    "0": [0b01110,0b10011,0b10101,0b11001,0b01110],
    "1": [0b00100,0b01100,0b00100,0b00100,0b01110],
    "2": [0b01110,0b10001,0b00110,0b01000,0b11111],
    "3": [0b01110,0b10001,0b00110,0b10001,0b01110],
    "4": [0b00110,0b01010,0b11111,0b00010,0b00010],
    "5": [0b11111,0b10000,0b11110,0b00001,0b11110],
    "6": [0b00110,0b01000,0b11110,0b10001,0b01110],
    "7": [0b11111,0b00010,0b00100,0b01000,0b01000],
    "8": [0b01110,0b10001,0b01110,0b10001,0b01110],
    "9": [0b01110,0b10001,0b01111,0b00001,0b01110],
    ":": [0b00000,0b01100,0b00000,0b01100,0b00000],
    "k": [0b10000,0b10100,0b11000,0b10100,0b10010],
  };

  function drawText(str, tx, ty, scale, col) {
    let cx = tx;
    for (const ch of str) {
      const glyph = GLYPHS[ch] || GLYPHS[" "];
      for (let gy = 0; gy < 7; gy++) {
        const row = gy < 5 ? glyph[gy] : 0;
        for (let gx = 0; gx < 5; gx++) {
          if (row & (1 << (4 - gx))) {
            for (let sy = 0; sy < scale; sy++)
              for (let sx = 0; sx < scale; sx++)
                set(cx + gx * scale + sx, ty + gy * scale + sy, col);
          }
        }
      }
      cx += (5 + 1) * scale;
    }
  }

  const tx = iconX + iconS + 36;
  const ty = py0 + 40;
  drawText("Groove Grammar Lab", tx, ty, 5, TEXT_CLR);
  drawText("Educational Drum Machine", tx, ty + 60, 3, MUTED);
  drawText("50+ rhythm styles  /  12 meters", tx, ty + 110, 2, MUTED);
  drawText("2/4 - 13/8  /  MIDI + WAV export", tx, ty + 140, 2, MUTED);
  drawText("Mixer  /  Phrase map  /  Affinity", tx, ty + 170, 2, MUTED);
  drawText("Open in browser - no install", tx, ty + 220, 2, [246, 200, 95]);

  return px;
}

// ── Write files ───────────────────────────────────────────────────────────────
function write(file, pixels, w, h) {
  const path = resolve(root, file);
  writeFileSync(path, encodePNG(pixels, w, h));
  console.log(`  ${file}`);
}

console.log("Generating web assets:");
write("favicon-32.png",  makeIcon(32),   32,   32);
write("favicon-192.png", makeIcon(192), 192,  192);
write("favicon-512.png", makeIcon(512), 512,  512);
write("og-image.png",    makeOG(1200, 630), 1200, 630);
console.log("Done.");
