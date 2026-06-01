# Groove Grammar Lab

Groove Grammar Lab is a self-contained educational drum machine prototype.
It generates phrase-aware drum patterns, explains why events exist, visualizes
layers, and plays the result through the browser Web Audio API.

## What it demonstrates

- 1, 2, 4, 8, and 16 bar phrase generation.
- Meter-aware generation for 2/4, 3/4, 4/4, 5/4, 5/8, 6/8, 7/8,
  9/8, 10/8, 11/8, 12/8, and 13/8.
- The Style school selector changes by meter, so odd and compound meters use
  rhythm families that actually belong to those meters.
- Style schools: Afro-Cuban, salsa/mambo, afrobeat, European dance, disco,
  Balkan dance, American funk, jazz swing, New Orleans second line, Berlin
  techno, house, electro, breakbeat, jungle/drum and bass, halftime bass,
  reggae/dub, dancehall, odd meter lab, experimental minimalism, classical
  waltz, jazz waltz, mazurka, jazz 5/4, Balkan 5/4 aksak, progressive 5/4,
  bembe 6/8, Irish jig, blues 6/8, tarantella, rachenitsa 7/8,
  kalamatianos 7/8, progressive 7/8, karsilama 9/8, Balkan 9/8,
  march 2/4, polka 2/4, samba 2/4, paidushko 5/8, Greek 5/8,
  progressive 5/8, Turkish 10/8, Balkan 10/8, progressive 10/8,
  kopanitsa 11/8, Gankino 11/8, progressive 11/8, blues 12/8,
  gospel 12/8, Afro-Cuban 12/8, Balkan 13/8, progressive 13/8,
  and Carnatic 13/8 study.
- Core beat, ornaments, fill layer, texture, and accent layers.
- Ghost notes, fills, syncopation, swing, density, humanization, and mutation.
- Explanation mode with phrase maps and style principles.
- Pattern comparison for studying how two grooves differ.
- Rhythm affinity map that shows related styles by shared rhythmic grammar,
  family, tags, and tempo zone.
- Style info box with a very short description of the selected rhythm,
  its meter, family, tags, and accent grouping.

## Run (web)

Open `index.html` in a browser. No install step is required.

Playback starts only after pressing `Play`, as required by browser audio
policies.

## Desktop app (Windows 11)

The same code is packaged as a desktop app with Electron.

Prerequisites: Node.js 18+ and npm.

```
npm install
npm start        # run in a desktop window
npm run dist     # build Windows installer + portable into release/
```

`npm run dist` produces two x64 artifacts in `release/`:

- `Groove Grammar Lab Setup 1.0.0.exe` — NSIS installer (lets you pick the
  install directory, adds Start Menu and desktop shortcuts).
- `Groove Grammar Lab 1.0.0 Portable.exe` — single-file portable build that
  runs without installation.

The builds are unsigned, so Windows SmartScreen may show a "Windows protected
your PC" notice on first launch. Choose **More info → Run anyway**. Saved
patterns live in the per-user app data folder and survive updates.

The Electron build uses `asar`, `compression: maximum`, and a single bundled
locale (`en-US`) to keep the artifacts small (~70 MB).

## Desktop app — Tauri variant (smaller, ~6–10 MB)

A Tauri (Rust + system WebView2) configuration lives in `src-tauri/`. It
produces a much smaller installer because it uses the WebView2 runtime already
present on Windows 11 instead of bundling Chromium.

Extra prerequisites (one-time):

- [Rust toolchain](https://rustup.rs) (`rustup`, includes `cargo`).
- Visual Studio Build Tools with the "Desktop development with C++" workload.
- WebView2 runtime — preinstalled on Windows 11.

Build:

```
npm install
npm run tauri:icons   # regenerate icons from resources/icon.png (run once)
npm run tauri:build   # builds installer into src-tauri/target/release/bundle/
```

Outputs:

- NSIS installer in `src-tauri/target/release/bundle/nsis/`.
- The raw `groove-grammar-lab.exe` in `src-tauri/target/release/` works as a
  portable executable (requires the WebView2 runtime).

The Tauri build copies the static web files into `dist-web/` automatically via
`scripts/copy-web.mjs`; the source files stay at the repo root so the browser
and Electron flows are unaffected.

## Size comparison

| Build | Artifact | Size |
|---|---|---|
| Electron (installer) | `Groove Grammar Lab Setup 1.0.0.exe` | ~71 MB |
| Electron (portable) | `Groove Grammar Lab 1.0.0 Portable.exe` | ~71 MB |
| **Tauri (installer)** | `Groove Grammar Lab_1.0.0_x64-setup.exe` | **~1 MB** |

The Tauri build is ~70× smaller because it uses the WebView2 runtime already
bundled with Windows 11 instead of shipping Chromium.

## GitHub Pages (web version)

The app deploys automatically to GitHub Pages on every push to `main` via
`.github/workflows/pages.yml`. To enable it:

1. Push the repo to GitHub.
2. Go to **Settings → Pages → Source** and select **GitHub Actions**.
3. The next push to `main` will deploy the site.

The web version includes a PWA manifest (`manifest.json`) so it can be
installed from the browser as a local app. Saved patterns use `localStorage`
and survive page reloads. Share links work via the `#g=…` URL hash.
