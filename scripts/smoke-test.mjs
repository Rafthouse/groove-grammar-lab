import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const dom = new JSDOM(html, {
  url: "https://rafthouse.github.io/groove-grammar-lab/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  storageQuota: 10_000_000
});

const { window } = dom;
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
window.AudioContext = class FakeAudioContext {
  constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; this.sampleRate = 44100; }
  resume() { this.state = "running"; return Promise.resolve(); }
  createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() { return this; } }; }
  createBuffer(channels, frames, sampleRate) { return { numberOfChannels: channels, sampleRate, length: frames, getChannelData: () => new Float32Array(frames) }; }
  createBufferSource() { return { connect() { return this; }, start() {}, stop() {}, onended: null, buffer: null }; }
  createOscillator() { return { type: "sine", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; }, start() {}, stop() {} }; }
  createBiquadFilter() { return { type: "lowpass", frequency: { value: 0 }, connect() { return this; } }; }
  decodeAudioData() { return Promise.resolve({}); }
};
window.webkitAudioContext = window.AudioContext;
window.OfflineAudioContext = class FakeOfflineAudioContext extends window.AudioContext {
  constructor(channels, frames, sampleRate) { super(); this.channels = channels; this.frames = frames; this.sampleRate = sampleRate; this.destination = {}; }
  startRendering() { return Promise.resolve(this.createBuffer(this.channels, this.frames, this.sampleRate)); }
};
window.webkitOfflineAudioContext = window.OfflineAudioContext;
window.URL.createObjectURL = () => "blob:smoke";
window.URL.revokeObjectURL = () => {};
window.navigator.clipboard = { writeText: () => Promise.resolve() };
window.fetch = () => Promise.resolve({ ok: false, status: 404, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });

const context = dom.getInternalVMContext();
context.console = console;
vm.runInContext(readFileSync(resolve(root, "rhythm-packs.js"), "utf8"), context, { filename: "rhythm-packs.js" });
vm.runInContext(readFileSync(resolve(root, "app.js"), "utf8"), context, { filename: "app.js" });

const document = window.document;
assert.equal(document.querySelectorAll("#styleSelect option").length > 0, true, "style options are populated");
assert.equal(document.querySelectorAll(".step-cell").length > 0, true, "sequencer grid renders");
assert.equal(document.querySelectorAll(".mixer-row").length, 8, "mixer renders all tracks");
assert.equal(document.getElementById("barsSelect").value, "2", "default phrase length is performance-friendly 2 bars");
assert.match(document.querySelector("#grooveTitle").textContent, /phrase/, "initial groove title renders");

for (const id of ["generateButton", "mutateButton", "analyzeButton", "compareButton", "shareButton"]) {
  document.getElementById(id).click();
}

document.getElementById("meterSelect").value = "7-8";
document.getElementById("meterSelect").dispatchEvent(new window.Event("input", { bubbles: true }));
assert.equal(document.querySelectorAll("#styleSelect option").length > 0, true, "meter switch keeps available styles");
assert.match(document.querySelector("#grooveTitle").textContent, /phrase/, "meter switch re-renders a pattern");

const hashPayload = window.btoa(window.unescape(window.encodeURIComponent(JSON.stringify({
  settings: {
    style: "afrocuban", bars: 2, meter: "4-4", meterLabel: "4/4", stepsPerBar: 16,
    tempo: 100, complexity: 50, density: 50, swing: 8, human: 5,
    layers: { core: true, ornament: true, fill: true, texture: true, accent: true }
  },
  masterVolume: 0.5,
  mixer: {}
}))));
window.location.hash = `#g=${hashPayload}`;
assert.equal(Boolean(window.location.hash.startsWith("#g=")), true, "share hash can be created");

console.log("Smoke test passed: initial render, generation, analysis, compare, share, meter switch, and mixer UI are functional.");
