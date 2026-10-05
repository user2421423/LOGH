# Galactic Command visual assets

Generated artwork (built-in image generation, WC4 screenshot used only as a style reference; no WC4 sprites extracted).

| File | Layout | Status in this repo |
|---|---|---|
| `assets/fleet-atlas.png` | 4×4, RGBA. Row 1: corvette, torpedo, boarding, vanguard · Row 2: transport, light, heavy, battleship · Row 3: flagship, beam, siege, missile · Row 4: battery, shipyard station, fortress, capital | **Missing — please add** |
| `assets/terrain-atlas.png` | 4×4, RGBA. Row 1: asteroids ×4 · Row 2: nebulae ×4 · Row 3: planets ×4 · Row 4: dock, debris, explosion, impact burst | **Missing — please add** |
| `assets/admiral-atlas.png` | 4×2, RGB 1254×1254. Row 1: Reinhard, Yang, Mittermeyer, Reuenthal · Row 2: Kircheis, Attenborough, Fischer, Schönkopf | Present |

`art.js` holds hand-tuned source rectangles (`fleetRects`, `terrainRects`) and clip masks for frames 12–13, because some generated
silhouettes cross the nominal grid cells. Known art issues: the torpedo squadron shows two ships instead of three, and the
flagship faces the opposite way (compensated on the canvas by a 180° rotation in `ART.draw`).

Without the two missing atlases the game still runs: units fall back to their two-letter class code and terrain props are not drawn.
