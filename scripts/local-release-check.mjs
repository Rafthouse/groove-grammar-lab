import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const url = process.argv[2] || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });

async function checkDesktop() {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await expectText(page, "Groove Grammar Lab");
  await page.click("#generateButton");
  await page.click("#mutateButton");
  await page.click("#analyzeButton");
  await page.click("#compareButton");
  assert.ok(await page.locator(".step-cell").count() > 0, "step grid rendered");

  const midiPromise = page.waitForEvent("download");
  await page.click("#midiButton");
  const midi = await midiPromise;
  assert.match(midi.suggestedFilename(), /\.mid$/i, "MIDI export downloads .mid");

  const wavPromise = page.waitForEvent("download", { timeout: 15000 });
  await page.click("#wavButton");
  const wav = await wavPromise;
  assert.match(wav.suggestedFilename(), /\.wav$/i, "WAV export downloads .wav");

  assert.deepEqual(consoleErrors, [], "no critical console errors on desktop flow");
  await context.close();
}

async function checkMobile() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  await page.goto(url, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => ({
    title: document.title,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    gridCells: document.querySelectorAll(".step-cell").length,
    axeTarget: Boolean(document.querySelector("#grid[tabindex='0'][role='region']"))
  }));
  assert.equal(metrics.overflow, false, "mobile has no page-level horizontal overflow");
  assert.ok(metrics.gridCells > 0, "mobile renders grid");
  assert.equal(metrics.axeTarget, true, "scrollable grid is keyboard focusable");
  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(axe.violations, [], "no axe violations on mobile");
  assert.deepEqual(consoleErrors, [], "no critical console errors on mobile");
  await context.close();
}

async function expectText(page, text) {
  await page.locator(`text=${text}`).first().waitFor({ timeout: 5000 });
}

await checkDesktop();
await checkMobile();
await browser.close();
console.log("Local release check passed: page, generation, MIDI/WAV export, mobile layout, axe, console.");
