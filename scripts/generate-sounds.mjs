/**
 * Groove Grammar Lab — drum sound synthesis
 * 44100 Hz · 16-bit · mono WAV, no external dependencies.
 *
 * Voices:
 *   kick          TR-808 style: sine pitch sweep 160→45 Hz, click transient
 *   snare         Noise + dual-sine tonal body (180 + 285 Hz)
 *   hihat-closed  6 metallic square oscillators, 80 ms decay
 *   hihat-open    Same oscillators, 750 ms decay  ← choke is very audible
 *   rim           Noise burst + 1600 Hz tone, punchy 60 ms
 *   tom           Sine sweep 175→75 Hz, 440 ms
 *   perc          Conga-like: sine sweep 430→300 Hz, 200 ms
 *   shaker        Shaped white noise, 110 ms
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../sounds");
const SR = 44100;

/* ── WAV encoder ──────────────────────────────────────────────────────────── */

function wav16(samples) {
  const N = samples.length;
  const b = Buffer.alloc(44 + N * 2);
  b.write("RIFF", 0);             b.writeUInt32LE(36 + N * 2, 4);
  b.write("WAVE", 8);             b.write("fmt ", 12);
  b.writeUInt32LE(16, 16);        b.writeUInt16LE(1, 20);   // PCM
  b.writeUInt16LE(1, 22);         b.writeUInt32LE(SR, 24);  // mono, SR
  b.writeUInt32LE(SR * 2, 28);    b.writeUInt16LE(2, 32);   // byteRate, blockAlign
  b.writeUInt16LE(16, 34);        b.write("data", 36);
  b.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return b;
}

/* ── Biquad filter factory ────────────────────────────────────────────────── */
// Returns a stateful function f(x) → y. Creates one closure per filter instance.

function biquad(type, freq, Q = 0.707) {
  const w0 = (2 * Math.PI * freq) / SR;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const alpha = sinW / (2 * Q);
  let b0, b1, b2;

  if (type === "hp") {
    b0 = (1 + cosW) / 2;  b1 = -(1 + cosW);  b2 = b0;
  } else if (type === "lp") {
    b0 = (1 - cosW) / 2;  b1 = 1 - cosW;     b2 = b0;
  } else {                            // "bp" skirt gain
    b0 = sinW / 2;         b1 = 0;            b2 = -sinW / 2;
  }

  const a0 = 1 + alpha;
  const [B0, B1, B2, A1, A2] = [
    b0 / a0, b1 / a0, b2 / a0,
    (-2 * cosW) / a0, (1 - alpha) / a0
  ];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  return (x) => {
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const alloc = (sec) => new Float32Array(Math.ceil(sec * SR));

function normalize(buf, peak = 0.92) {
  let m = 0;
  for (const v of buf) if (Math.abs(v) > m) m = Math.abs(v);
  if (m < 1e-7) return buf;
  const s = peak / m;
  for (let i = 0; i < buf.length; i++) buf[i] *= s;
  return buf;
}

// Fade the last `ms` milliseconds to silence to prevent end-of-sample clicks.
function fadeOut(buf, ms = 10) {
  const n = Math.min(buf.length, Math.ceil((ms * SR) / 1000));
  for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n;
  return buf;
}

/* ── Kick  ──────────────────────────────────────────────────────────────────
   TR-808 style: sine with fast pitch sweep, sub component, noise click.     */

function kick() {
  const s = alloc(0.60);
  const dcBlock   = biquad("hp",  28, 0.70);
  const clickFilt = biquad("hp", 900, 1.20);

  let phase = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;

    // Exponential pitch sweep: 160 Hz → 45 Hz
    const freq = 45 + 115 * Math.exp(-t / 0.052);
    phase += (2 * Math.PI * freq) / SR;

    // Envelopes
    const rise  = t < 0.005 ? t / 0.005 : 1;
    const body  = rise * Math.exp(-t / 0.22);    // main decay ~220 ms
    const click = Math.exp(-t / 0.006);           // snap click, gone by 20 ms

    // Components
    const sineBody   = Math.sin(phase) * body * 0.88;
    const noiseClick = clickFilt((Math.random() * 2 - 1) * click) * 0.48;

    s[i] = dcBlock(sineBody + noiseClick);
  }
  return normalize(fadeOut(s));
}

/* ── Snare  ─────────────────────────────────────────────────────────────────
   Dual-sine tonal body + bandpass noise + short attack transient.           */

function snare() {
  const s = alloc(0.28);
  const noiseBP  = biquad("bp", 2200, 0.85);
  const transHP  = biquad("hp",  850, 0.80);

  let p180 = 0, p285 = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    p180 += (2 * Math.PI * 180) / SR;
    p285 += (2 * Math.PI * 285) / SR;

    const rise     = t < 0.003 ? t / 0.003 : 1;
    const toneEnv  = rise * Math.exp(-t / 0.055);
    const noiseEnv = rise * Math.exp(-t / 0.075);
    const transEnv = Math.exp(-t / 0.004) * (t < 0.020 ? 1 : 0);

    const tone  = (Math.sin(p180) + Math.sin(p285) * 0.65) * toneEnv * 0.38;
    const noise = noiseBP((Math.random() * 2 - 1)) * noiseEnv * 0.74;
    const trans = transHP((Math.random() * 2 - 1) * transEnv) * 0.38;

    s[i] = tone + noise + trans;
  }
  return normalize(fadeOut(s));
}

/* ── Hi-hat core  ───────────────────────────────────────────────────────────
   Realistic hi-hat synthesis combining:
   • FM cross-modulation between metallic partials (TR-606 / TR-808 approach)
   • Filtered white noise for the "shhhh" component (cymbal body)
   • Two-stage envelope: sharp attack click + exponential ring decay
   • Multi-band shaping (HP @ 7-9 kHz, peak @ 8-10 kHz)

   The key insight: real hi-hats are ~70% bright noise, 30% inharmonic metallic
   ring. Pure oscillator stacks sound like toy chimes, not cymbals.            */

// Inharmonic ratios from physical cymbal modal analysis (not equal-tempered).
const HAT_PARTIALS = [1.0, 1.342, 1.781, 2.193, 2.658, 3.187, 3.794, 4.521];
const HAT_FUNDAMENTAL = 320; // Hz, where the partial series starts

function synthHat(decayTau, durationSec, brightness = 1.0) {
  const s = alloc(durationSec);

  // Noise path: very bright filtered noise — this is the "cymbal shimmer"
  const noiseHP1 = biquad("hp", 7200, 0.90);
  const noiseHP2 = biquad("hp", 9500, 1.10);   // dual HP for steeper rolloff
  const noiseLP  = biquad("lp", 16000, 0.70);

  // Metallic path: inharmonic partials with FM cross-modulation
  const metallicHP = biquad("hp", 5500, 0.85);
  const metallicLP = biquad("lp", 12000, 0.75);

  const phases  = HAT_PARTIALS.map(() => Math.random() * Math.PI * 2);
  const modPhase = [0, 0]; // FM modulators

  for (let i = 0; i < s.length; i++) {
    const t = i / SR;

    // Attack curve: sharp 1ms rise
    const rise = t < 0.001 ? t / 0.001 : 1;

    // Two-phase envelope: instant peak that drops to body level in 4ms,
    // then exponential decay. This matches real cymbal physics.
    const attackBoost = 1 + 1.8 * Math.exp(-t / 0.004);
    const body = Math.exp(-t / decayTau);
    const env = rise * body * attackBoost;

    // FM modulators (slow, deep) — gives the "metallic shimmer"
    modPhase[0] += (2 * Math.PI * 187) / SR;
    modPhase[1] += (2 * Math.PI * 251) / SR;
    const fm = Math.sin(modPhase[0]) * 0.6 + Math.sin(modPhase[1]) * 0.4;
    const fmDepth = 24 * Math.exp(-t / 0.05); // FM index drops fast

    // Metallic partials — inharmonic, FM-modulated
    let metallic = 0;
    for (let k = 0; k < HAT_PARTIALS.length; k++) {
      const f = HAT_FUNDAMENTAL * HAT_PARTIALS[k] * brightness;
      phases[k] += (2 * Math.PI * f) / SR;
      metallic += Math.sin(phases[k] + fm * fmDepth);
    }
    metallic = metallicLP(metallicHP(metallic / HAT_PARTIALS.length));

    // Noise — the dominant "shhhh" component
    const rawNoise = Math.random() * 2 - 1;
    const noise = noiseLP(noiseHP2(noiseHP1(rawNoise)));

    // Mix: 65% noise + 35% metallic ring — this ratio is what makes it sound
    // like a cymbal rather than a tonal instrument.
    s[i] = (noise * 0.65 + metallic * 0.35) * env;
  }
  return normalize(fadeOut(s, 8));
}

// Closed hat: very short decay, slightly brighter (tightly choked cymbal)
const closedHat = () => synthHat(0.018, 0.10, 1.08);

// Open hat: long ring, default brightness — choke from closed hat is very audible
const openHat = () => synthHat(0.28, 0.85, 1.0);

/* ── Rim shot  ──────────────────────────────────────────────────────────────
   Noise burst + 1600 Hz resonant tone, very short and punchy.               */

function rim() {
  const s = alloc(0.075);
  const noiseHP = biquad("hp", 900, 1.0);
  const toneBP  = biquad("bp", 1600, 5.0); // high-Q peak for "click" tone

  let pTone = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    pTone += (2 * Math.PI * 1600) / SR;

    const rise = t < 0.002 ? t / 0.002 : 1;
    const env  = rise * Math.exp(-t / 0.013);

    const noise = noiseHP((Math.random() * 2 - 1)) * 0.55;
    const tone  = toneBP(Math.sin(pTone)) * 0.55;

    s[i] = (noise + tone) * env;
  }
  return normalize(fadeOut(s, 5));
}

/* ── Tom  ───────────────────────────────────────────────────────────────────
   Sine pitch sweep 175 → 75 Hz with noise attack transient.                 */

function tom() {
  const s = alloc(0.46);
  const dcBlock = biquad("hp", 35, 0.70);
  const atkHP   = biquad("hp", 500, 0.80);

  let phase = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;

    const freq = 75 + 100 * Math.exp(-t / 0.095);
    phase += (2 * Math.PI * freq) / SR;

    const rise    = t < 0.005 ? t / 0.005 : 1;
    const bodyEnv = rise * Math.exp(-t / 0.165);
    const atkEnv  = Math.exp(-t / 0.010) * (t < 0.040 ? 1 : 0);

    const body = Math.sin(phase) * bodyEnv * 0.88;
    const atk  = atkHP((Math.random() * 2 - 1) * atkEnv) * 0.22;

    s[i] = dcBlock(body + atk);
  }
  return normalize(fadeOut(s));
}

/* ── Perc (conga-like)  ─────────────────────────────────────────────────────
   Fast sine sweep with a sharp attack click.                                 */

function perc() {
  const s = alloc(0.22);
  const dcBlock = biquad("hp", 100, 0.70);
  const atkHP   = biquad("hp", 2500, 1.00);

  let phase = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;

    const freq = 300 + 130 * Math.exp(-t / 0.028);
    phase += (2 * Math.PI * freq) / SR;

    const rise    = t < 0.003 ? t / 0.003 : 1;
    const bodyEnv = rise * Math.exp(-t / 0.058);
    const atkEnv  = Math.exp(-t / 0.005) * (t < 0.020 ? 1 : 0);

    const body = Math.sin(phase) * bodyEnv;
    const atk  = atkHP((Math.random() * 2 - 1) * atkEnv) * 0.28;

    s[i] = dcBlock(body + atk);
  }
  return normalize(fadeOut(s, 5));
}

/* ── Shaker  ────────────────────────────────────────────────────────────────
   White noise shaped by HP + LP, fast decay, subtle resonance.              */

function shaker() {
  const s = alloc(0.115);
  const hp = biquad("hp", 5500, 0.90);
  const lp = biquad("lp", 9800, 0.80);

  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const rise = t < 0.004 ? t / 0.004 : 1;
    const env  = rise * Math.exp(-t / 0.024);
    s[i] = lp(hp((Math.random() * 2 - 1))) * env;
  }
  return normalize(fadeOut(s, 5));
}

/* ── Generate all sounds ────────────────────────────────────────────────────  */

mkdirSync(OUT, { recursive: true });

const SOUNDS = [
  ["kick.wav",         kick],
  ["snare.wav",        snare],
  ["hihat-closed.wav", closedHat],
  ["hihat-open.wav",   openHat],
  ["rim.wav",          rim],
  ["tom.wav",          tom],
  ["perc.wav",         perc],
  ["shaker.wav",       shaker],
];

console.log("Generating drum sounds  44100 Hz · 16-bit · mono");
console.log("─".repeat(50));
for (const [name, fn] of SOUNDS) {
  const samples = fn();
  const ms = Math.round((samples.length / SR) * 1000);
  const kb = Math.round((samples.length * 2) / 1024);
  writeFileSync(resolve(OUT, name), wav16(samples));
  console.log(`  ${name.padEnd(20)}  ${String(ms).padStart(4)} ms  ${String(kb).padStart(4)} KB`);
}
console.log("─".repeat(50));
console.log("Done. Files written to sounds/");
