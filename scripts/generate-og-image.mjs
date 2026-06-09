/**
 * Generates og-image.png (1200x630) — the social-share / promo card.
 * Hipster-vintage poster style: aged paper, sunburst, slab-serif type,
 * a faux sequencer strip and a rubber-stamp seal.
 *
 * Rasterized from a hand-built SVG via sharp (resvg). Run: node scripts/generate-og-image.mjs
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 1200, H = 630;

/* Vintage palette */
const C = {
  paper:  "#efe3c6",
  paper2: "#e3d2ab",
  ink:    "#2b2722",
  orange: "#c75d39",
  teal:   "#2f7d6e",
  ochre:  "#d6a23e",
  red:    "#a83a2b",
  cream:  "#f7efd8"
};

const CX = W / 2;

/* ---- sunburst rays around a point ---- */
function sunburst(cx, cy, count, radius, color, opacity) {
  let out = "";
  const step = (Math.PI * 2) / count;
  const half = step * 0.34;
  for (let i = 0; i < count; i += 2) {
    const a = i * step;
    const x1 = cx + Math.cos(a - half) * radius;
    const y1 = cy + Math.sin(a - half) * radius;
    const x2 = cx + Math.cos(a + half) * radius;
    const y2 = cy + Math.sin(a + half) * radius;
    out += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${color}" opacity="${opacity}"/>`;
  }
  return out;
}

/* ---- five-point star ---- */
function star(cx, cy, r, fill, rot = -90) {
  let pts = "";
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = (rot + i * 36) * Math.PI / 180;
    pts += `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return `<polygon points="${pts.trim()}" fill="${fill}"/>`;
}

/* ---- faux sequencer strip (drum-machine motif) ---- */
function sequencer(x, y, cols, cellW, cellH, gap) {
  const dotColors = [C.ochre, C.teal, C.orange];
  // deterministic-ish "groove" so it reads like a real pattern
  const rowsPattern = [
    [0, 4, 6, 8, 12, 14],          // ride-ish
    [0, 3, 6, 10, 12],             // clave-ish
    [2, 6, 10, 14]                 // perc
  ];
  let out = "";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x + c * (cellW + gap);
      const cy = y + r * (cellH + gap);
      out += `<rect x="${cx}" y="${cy}" width="${cellW}" height="${cellH}" rx="2" fill="none" stroke="${C.ink}" stroke-opacity="0.28" stroke-width="1.5"/>`;
      if (rowsPattern[r].includes(c)) {
        out += `<circle cx="${cx + cellW / 2}" cy="${cy + cellH / 2}" r="${cellH * 0.32}" fill="${dotColors[r]}"/>`;
      }
    }
  }
  return out;
}

/* ---- rubber-stamp seal ---- */
function seal(cx, cy, r) {
  // circular text via pre-placed glyphs is overkill; use two rings + star + label
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.red}" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 9}" fill="none" stroke="${C.red}" stroke-width="2" stroke-dasharray="3 4"/>`;
  const tickMarks = Array.from({ length: 36 }, (_, i) => {
    const a = (i * 10) * Math.PI / 180;
    const r1 = r - 14, r2 = r - 19;
    return `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}" stroke="${C.red}" stroke-width="1.4"/>`;
  }).join("");
  return `<g transform="rotate(-12 ${cx} ${cy})" opacity="0.92">
    ${ring}${tickMarks}
    ${star(cx, cy - r * 0.36, r * 0.2, C.red)}
    <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Rockwell, serif" font-weight="bold" font-size="22" fill="${C.red}" letter-spacing="1">PHRASE</text>
    <text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="Rockwell, serif" font-weight="bold" font-size="22" fill="${C.red}" letter-spacing="1">AWARE</text>
  </g>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="vig" cx="50%" cy="38%" r="75%">
      <stop offset="0%"  stop-color="${C.cream}"/>
      <stop offset="62%" stop-color="${C.paper}"/>
      <stop offset="100%" stop-color="${C.paper2}"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0"/>
    </filter>
    <filter id="softsh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="${C.orange}" flood-opacity="0.55"/>
    </filter>
  </defs>

  <!-- paper -->
  <rect width="${W}" height="${H}" fill="url(#vig)"/>

  <!-- sunburst -->
  <g>${sunburst(CX, 250, 44, 760, C.ochre, 0.10)}</g>
  <g>${sunburst(CX, 250, 44, 760, C.teal, 0.05)}</g>

  <!-- grain overlay -->
  <rect width="${W}" height="${H}" filter="url(#grain)"/>

  <!-- double frame -->
  <rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${C.ink}" stroke-width="3"/>
  <rect x="31" y="31" width="${W - 62}" height="${H - 62}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>

  <!-- top ribbon -->
  <g transform="translate(${CX} 96)">
    <rect x="-250" y="-21" width="500" height="42" fill="${C.ink}"/>
    <path d="M-250 -21 L-272 0 L-250 21 Z" fill="${C.ink}"/>
    <path d="M250 -21 L272 0 L250 21 Z" fill="${C.ink}"/>
    <text x="0" y="7" text-anchor="middle" font-family="Rockwell, serif" font-weight="bold" font-size="22" letter-spacing="5" fill="${C.cream}">EDUCATIONAL DRUM MACHINE</text>
  </g>

  <!-- est line -->
  <text x="${CX}" y="158" text-anchor="middle" font-family="Courier New, monospace" font-size="18" letter-spacing="7" fill="${C.teal}">— EST. 2026 · RAFTHOUSE —</text>

  <!-- title -->
  <text x="${CX}" y="258" text-anchor="middle" font-family="Rockwell, Impact, serif" font-weight="bold" font-size="96" letter-spacing="2" fill="${C.ink}" filter="url(#softsh)">GROOVE GRAMMAR</text>

  <!-- LAB with flanking stars -->
  <g transform="translate(${CX} 322)">
    ${star(-150, 0, 16, C.orange)}
    ${star(150, 0, 16, C.orange)}
    <line x1="-118" y1="0" x2="-46" y2="0" stroke="${C.ink}" stroke-width="2"/>
    <line x1="118" y1="0" x2="46" y2="0" stroke="${C.ink}" stroke-width="2"/>
    <text x="0" y="14" text-anchor="middle" font-family="Rockwell, Impact, serif" font-weight="bold" font-size="44" letter-spacing="10" fill="${C.orange}">LAB</text>
  </g>

  <!-- sequencer strip (centered: 16*38 + 15*6 = 698 wide) -->
  <g>${sequencer((W - 698) / 2, 374, 16, 38, 18, 6)}</g>

  <!-- subtitle between rules -->
  <line x1="200" y1="500" x2="1000" y2="500" stroke="${C.ink}" stroke-width="1.4"/>
  <text x="${CX}" y="534" text-anchor="middle" font-family="Rockwell, serif" font-size="26" letter-spacing="3" fill="${C.ink}">50+ RHYTHM STYLES &#160;·&#160; 12 METERS &#160;·&#160; MIDI &amp; WAV EXPORT</text>
  <line x1="200" y1="554" x2="1000" y2="554" stroke="${C.ink}" stroke-width="1.4"/>

  <!-- url -->
  <text x="${CX}" y="588" text-anchor="middle" font-family="Courier New, monospace" font-size="17" letter-spacing="3" fill="${C.teal}">rafthouse.github.io/groove-grammar-lab</text>

  <!-- corner seal -->
  ${seal(1080, 150, 66)}
</svg>`;

await sharp(Buffer.from(svg))
  .png({ palette: true, colours: 200, dither: 0.6, effort: 9 })
  .toFile(resolve(__dirname, "../og-image.png"));

const { size } = await import("fs").then((fs) => fs.statSync(resolve(__dirname, "../og-image.png")));
console.log(`og-image.png written (1200x630, ${(size / 1024).toFixed(0)} KB)`);
