# Galactic Command · Hex Conquest

Unofficial Legend of the Galactic Heroes fan game — World Conqueror 4–style hex tactics in a single static page.
Live: https://galactic-command.aveev5-pankaj.chatgpt.site

## Run locally
Any static server works, e.g. `python3 -m http.server` and open http://localhost:8000.

## Files
- `engine.js` — deterministic rules (units, combat, AI, economy, victory). No DOM; also loadable from Node (`require('./engine.js')`).
- `game.js` — UI, canvas renderer, input, dialogs, `localStorage` save (`galactic-command-hex-v2`).
- `art.js` — sprite-atlas source rectangles and drawing helpers.
- `style.css`, `battlefield.css` — base styles and the battlefield HUD overrides.
- `assets/` — sprite atlases (see `ASSETS.md`).

See `REVIEW.md` for the code review.

![Battlefield](screenshot.png)
