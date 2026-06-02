/**
 * Validation harness for Groove Grammar Lab.
 *
 * Loads rhythm-packs.js + app.js inside a minimal fake-DOM sandbox, then for
 * every style in STYLE_LIBRARY checks:
 *   • the style has a meter
 *   • that meter exists in METER_LIBRARY
 *   • the style has a subtitle
 *   • createPattern() produces no event with localStep >= stepsPerBar
 *   • createPattern() produces no event with step >= totalSteps
 *
 * Run:  node scripts/validate-styles.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/* ── Minimal fake DOM (robust no-throw element via Proxy) ────────────────── */

function makeEl() {
  const store = {
    value: "",
    textContent: "",
    innerHTML: "",
    checked: false,
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    options: []
  };
  return new Proxy(store, {
    get(t, prop) {
      if (prop in store) return store[prop];
      if (prop === "querySelectorAll" || prop === "getElementsByTagName") return () => [];
      if (prop === "querySelector" || prop === "closest") return () => null;
      if (prop === "appendChild" || prop === "append" || prop === "insertBefore") return (x) => x;
      if (prop === "getAttribute") return () => null;
      if (prop === Symbol.toPrimitive) return () => "";
      return () => makeEl(); // addEventListener, remove, click, setAttribute, etc.
    },
    set(t, prop, val) { store[prop] = val; return true; }
  });
}

const fakeDocument = {
  getElementById: () => makeEl(),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener: () => {},
  removeEventListener: () => {},
  body: makeEl(),
  documentElement: makeEl(),
  hidden: false
};

const sandbox = {
  document: fakeDocument,
  navigator: { clipboard: null },
  location: { hash: "", origin: "", pathname: "/" },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  structuredClone: (x) => JSON.parse(JSON.stringify(x)),
  console,
  Math,
  Date,
  JSON
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);

// Load rhythm pack first (sets window.EXTRA_RHYTHMS), then app.js, then test code
// — all in one script so the test can reach app.js's lexical const bindings.
const packSrc = readFileSync(resolve(root, "rhythm-packs.js"), "utf8");
const appSrc = readFileSync(resolve(root, "app.js"), "utf8");

const testSrc = `
;(function () {
  const result = { styleCount: 0, errors: [], meters: new Set() };
  const layers = { core: true, ornament: true, fill: true, texture: true, accent: true };

  for (const [key, style] of Object.entries(STYLE_LIBRARY)) {
    result.styleCount++;

    if (!style.meter) { result.errors.push(key + ": missing meter"); continue; }
    if (!METER_LIBRARY[style.meter]) { result.errors.push(key + ": meter '" + style.meter + "' not in METER_LIBRARY"); continue; }
    if (!style.subtitle) result.errors.push(key + ": missing subtitle");

    const meter = METER_LIBRARY[style.meter];
    result.meters.add(style.meter);

    const settings = {
      style: key, bars: 4, meter: style.meter, meterLabel: meter.label,
      stepsPerBar: meter.stepsPerBar, tempo: 120, complexity: 70, density: 70,
      swing: style.swing || 0, human: 20, layers
    };

    let pattern;
    try { pattern = createPattern(settings, "new"); }
    catch (e) { result.errors.push(key + ": createPattern threw " + e.message); continue; }

    for (const ev of pattern.events) {
      if (ev.localStep >= meter.stepsPerBar || ev.localStep < 0) {
        result.errors.push(key + ": localStep " + ev.localStep + " out of [0," + meter.stepsPerBar + ")");
      }
      if (ev.step >= pattern.totalSteps || ev.step < 0) {
        result.errors.push(key + ": step " + ev.step + " out of [0," + pattern.totalSteps + ")");
      }
    }
  }

  result.meters = [...result.meters].sort();
  globalThis.__TEST__ = result;
})();
`;

vm.runInContext(packSrc + "\n" + appSrc + "\n" + testSrc, ctx, { filename: "combined.js" });

const r = sandbox.__TEST__;
const EXPECTED_METERS = ["2-4", "3-4", "4-4", "5-4", "5-8", "6-8", "7-8", "9-8", "10-8", "11-8", "12-8", "13-8"];

console.log("─".repeat(56));
console.log("Groove Grammar Lab — style validation");
console.log("─".repeat(56));
console.log("Styles checked     :", r.styleCount);
console.log("Meters represented :", r.meters.length, "→", r.meters.join(", "));

const missingMeters = EXPECTED_METERS.filter((m) => !r.meters.includes(m));
if (missingMeters.length) console.log("⚠ meters with no styles:", missingMeters.join(", "));

if (r.errors.length) {
  console.log("\n✗ " + r.errors.length + " problem(s):");
  r.errors.forEach((e) => console.log("   -", e));
} else {
  console.log("\n✓ No problems found.");
}

const ok = r.errors.length === 0 && r.styleCount >= 70 && missingMeters.length === 0;
console.log("\nStyle count >= 70  :", r.styleCount >= 70 ? "PASS (" + r.styleCount + ")" : "FAIL (" + r.styleCount + ")");
console.log("All 12 meters used :", missingMeters.length === 0 ? "PASS" : "FAIL");
console.log("Pattern bounds OK  :", r.errors.length === 0 ? "PASS" : "FAIL");
console.log("─".repeat(56));
console.log(ok ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(ok ? 0 : 1);
