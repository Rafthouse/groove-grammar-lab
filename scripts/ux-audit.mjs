import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const url = process.argv[2] || "http://127.0.0.1:4173/";
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1000 }
];

const browser = await chromium.launch({ headless: true });
const report = [];
let failures = 0;

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) consoleErrors.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: `audit-${viewport.name}.png`, fullPage: true });

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = window.innerWidth;
    const visible = [...document.querySelectorAll("body *")].filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    });
    const clipped = visible
      .filter((el) => {
        if (el.closest(".sequencer-grid")) return false;
        const r = el.getBoundingClientRect();
        return r.right > vw + 2 || r.left < -2;
      })
      .slice(0, 12)
      .map((el) => ({ tag: el.tagName, id: el.id, cls: String(el.className), text: el.textContent.trim().slice(0, 60), rect: el.getBoundingClientRect().toJSON() }));
    const smallTargets = [...document.querySelectorAll("button, select, input[type=checkbox], input[type=range]")]
      .filter((el) => {
        if (el.matches('input[type="range"]')) return false;
        if (el.matches('input[type="checkbox"]') && el.closest('label')?.getBoundingClientRect().height >= 24) return false;
        const r = el.getBoundingClientRect();
        return (r.width < 24 || r.height < 24) && window.getComputedStyle(el).display !== "none";
      })
      .map((el) => ({ tag: el.tagName, id: el.id, cls: String(el.className), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
    return {
      title: document.title,
      innerWidth: vw,
      scrollWidth: doc.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      horizontalOverflow: doc.scrollWidth > vw + 2,
      clipped,
      smallTargets
    };
  });

  const axe = await new AxeBuilder({ page }).analyze();
  const row = { viewport: viewport.name, metrics, axeViolations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })), consoleErrors };
  report.push(row);

  if (metrics.horizontalOverflow || metrics.clipped.length || axe.violations.length || consoleErrors.length) failures += 1;
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
if (failures) process.exit(1);
