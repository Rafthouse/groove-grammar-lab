/**
 * Generates social cards and PWA icons for Groove Grammar Lab.
 * Style direction: vintage paper, warm beige palette, premium minimalism,
 * Apple + Material 3 rounded geometry.
 */

import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const COLORS = {
  paper: "#f2ead7",
  paper2: "#e5d5b8",
  ink: "#211b14",
  muted: "#725f45",
  green: "#3f6f57",
  gold: "#b8893f",
  rust: "#b96341",
  cream: "#fff8e8"
};

function svgCard(width, height, variant = "wide") {
  const isSquare = width === height;
  const pad = isSquare ? 88 : 72;
  const titleSize = isSquare ? 86 : 72;
  const subtitleSize = isSquare ? 34 : 30;
  const titleY = isSquare ? 380 : 170;
  const markX = pad;
  const markY = isSquare ? 112 : 92;
  const mark = isSquare ? 184 : 156;
  const titleX = isSquare ? pad : pad + mark + 56;
  const linesTop = isSquare ? 670 : 410;
  const stripeY = height - (isSquare ? 150 : 120);
  const grainOpacity = variant === "twitter" ? 0.09 : 0.12;

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${COLORS.cream}"/>
        <stop offset="0.55" stop-color="${COLORS.paper}"/>
        <stop offset="1" stop-color="${COLORS.paper2}"/>
      </linearGradient>
      <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="7"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="table" tableValues="0 ${grainOpacity}"/></feComponentTransfer>
      </filter>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#4d3520" flood-opacity="0.18"/>
      </filter>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#paper)"/>
    <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.45"/>
    <circle cx="${width - pad}" cy="${pad}" r="${isSquare ? 260 : 210}" fill="${COLORS.green}" opacity="0.08"/>
    <circle cx="${pad + 80}" cy="${height - pad}" r="${isSquare ? 220 : 170}" fill="${COLORS.rust}" opacity="0.08"/>

    <g filter="url(#shadow)">
      <rect x="${markX}" y="${markY}" width="${mark}" height="${mark}" rx="${mark * 0.22}" fill="${COLORS.ink}"/>
      <clipPath id="markClip"><rect x="${markX + mark * 0.08}" y="${markY + mark * 0.08}" width="${mark * 0.84}" height="${mark * 0.84}" rx="${mark * 0.15}"/></clipPath>
      <g clip-path="url(#markClip)">
        ${Array.from({ length: 9 }, (_, i) => {
          const sw = (mark * 0.84) / 9;
          const x = markX + mark * 0.08 + i * sw;
          const c = [COLORS.gold, COLORS.green, COLORS.rust][i % 3];
          return `<rect x="${x}" y="${markY + mark * 0.08}" width="${sw + 1}" height="${mark * 0.84}" fill="${c}"/>`;
        }).join("")}
        <rect x="${markX + mark * 0.44}" y="${markY + mark * 0.08}" width="${mark * 0.12}" height="${mark * 0.84}" fill="${COLORS.ink}" opacity="0.82"/>
      </g>
    </g>

    <text x="${titleX}" y="${titleY}" fill="${COLORS.ink}" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="${titleSize}" font-weight="800" letter-spacing="-2.5">
      <tspan x="${titleX}" dy="0">Groove</tspan>
      <tspan x="${titleX}" dy="${titleSize * 0.98}">Grammar Lab</tspan>
    </text>

    <text x="${pad}" y="${linesTop}" fill="${COLORS.muted}" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="${subtitleSize}" font-weight="600">
      <tspan x="${pad}" dy="0">Educational rhythm generator</tspan>
      <tspan x="${pad}" dy="${subtitleSize * 1.45}">70+ styles · 12 meters · MIDI/WAV export</tspan>
    </text>

    <g transform="translate(${pad}, ${stripeY})">
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const x = i * (isSquare ? 112 : 94);
        const w = isSquare ? 78 : 64;
        const h = [80, 42, 64, 98, 52, 74, 38, 88][i] * (isSquare ? 1.15 : 1);
        const c = [COLORS.gold, COLORS.green, COLORS.rust][i % 3];
        return `<rect x="${x}" y="${100 - h}" width="${w}" height="${h}" rx="${w / 2}" fill="${c}" opacity="0.92"/>`;
      }).join("")}
    </g>

    <text x="${width - pad}" y="${height - pad}" text-anchor="end" fill="${COLORS.ink}" opacity="0.72" font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="${isSquare ? 28 : 24}" font-weight="700">rafthouse.github.io/groove-grammar-lab</text>
  </svg>`;
}

function iconSvg(size) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${COLORS.cream}"/><stop offset="1" stop-color="${COLORS.paper2}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
    <rect x="${size * 0.12}" y="${size * 0.12}" width="${size * 0.76}" height="${size * 0.76}" rx="${size * 0.16}" fill="${COLORS.ink}"/>
    <clipPath id="clip"><rect x="${size * 0.18}" y="${size * 0.18}" width="${size * 0.64}" height="${size * 0.64}" rx="${size * 0.11}"/></clipPath>
    <g clip-path="url(#clip)">
      ${Array.from({ length: 9 }, (_, i) => {
        const sw = (size * 0.64) / 9;
        const x = size * 0.18 + i * sw;
        const c = [COLORS.gold, COLORS.green, COLORS.rust][i % 3];
        return `<rect x="${x}" y="${size * 0.18}" width="${sw + 1}" height="${size * 0.64}" fill="${c}"/>`;
      }).join("")}
      <rect x="${size * 0.456}" y="${size * 0.18}" width="${size * 0.088}" height="${size * 0.64}" fill="${COLORS.ink}" opacity="0.84"/>
    </g>
  </svg>`;
}

async function writePng(file, svg, width, height) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(resolve(root, file));
  console.log(`  ${file} (${width}x${height})`);
}

console.log("Generating web assets:");
await writePng("favicon-32.png", iconSvg(32), 32, 32);
await writePng("favicon-192.png", iconSvg(192), 192, 192);
await writePng("favicon-512.png", iconSvg(512), 512, 512);
await writePng("apple-touch-icon.png", iconSvg(180), 180, 180);
await writePng("og-image.png", svgCard(1200, 630, "og"), 1200, 630);
await writePng("twitter-card.png", svgCard(1200, 630, "twitter"), 1200, 630);
await writePng("square-preview.png", svgCard(1200, 1200, "square"), 1200, 1200);
console.log("Done.");
