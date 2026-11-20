# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/DianChairo/vice-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/DianChairo/vice-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photos into GTA 6-style cover art — the multi-panel poster look with a Vice City neon-sunset grade — right in your browser, offline, with nothing uploaded. Add up to four photos, pick a layout, grade and caption, and export a share-ready PNG.

## What it does

- **Four layouts** — Hero + 3 (one big panel over three), Full-bleed, Grid 2×2, and Triptych.
- **Any photo** — load up to four photos from your machine; click a panel to select it, drag to reposition the photo inside it, scroll or use the sliders to zoom and shift. One button fills every panel with the selected photo. Two free sample photos ship with the app so you can try it instantly.
- **Four grades** — Neon Sunset, Vice Nights, Golden Hour, and Palm Noir: gradient-map colour grades over every panel, plus film grain, vignette, and a white poster frame.
- **Caption lettering** — a bold title and subtitle in four styles (Block, Outline, Sunset fill, Neon script), top or bottom banner, with a glowing sunset disc and a badge ribbon.
- **One-step export** — PNG in 1080 × 1080, 1080 × 1350, or 1920 × 1080, or all three at once.

Everything is original artwork drawn by the app itself — no game logos, artwork, or fonts. Photos never leave your machine.

## How to run

No build step, no network. Serve `app/` with any static server and open it in desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `app/index.html` directly from the file system.

## How to use it

1. Click **Add photos from your machine** (or try a sample photo).
2. Pick a **layout** and a **grade**.
3. Click a panel on the cover, drag the photo into place, zoom with the slider or scroll wheel.
4. Type your **title** and **subtitle**, pick a lettering style.
5. Choose a size and hit **Export PNG**.

## Files

- `app/index.html` — the editor page
- `app/style.css` — the editor chrome
- `app/src/cover.js` — the cover render engine (layouts, grades, lettering)
- `app/src/main.js` — UI wiring: photos, panel selection, drag-to-crop, export
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`)
- `app/samples/` — two free sample photos
- `main.ts` — hands `app/` and `screenshots/` in as the make.fun entry (Node 22)

## License

MIT — see [LICENSE](LICENSE).
