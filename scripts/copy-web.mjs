/**
 * Copies the static web app (index.html, styles.css, app.js, rhythm-packs.js)
 * and the sounds/ directory into dist-web/, which Tauri bundles as the
 * frontend. Keeps the source files at the repo root so the browser/preview and
 * Electron flows keep working unchanged.
 */

import { copyFileSync, cpSync, mkdirSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, "dist-web");

const FILES = ["index.html", "styles.css", "app.js", "rhythm-packs.js"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of FILES) {
  copyFileSync(resolve(root, file), resolve(out, file));
}
// Without this, packaged Tauri apps ship no real samples and fall back to synth.
cpSync(resolve(root, "sounds"), resolve(out, "sounds"), { recursive: true });
console.log(`Copied ${FILES.length} files + sounds/ to ${out}`);
