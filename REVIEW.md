# Code review: Galactic Command · Hex Conquest

Scope: `engine.js`, `game.js`, `art.js`, `style.css`, `battlefield.css` as served from the live site.
Method: read all files, then confirmed each finding by running `engine.js` in Node or the page in headless Chromium.
An AI-vs-AI conquest game played to completion (turn 14) and an Iserlohn game ran with no exceptions and no console errors other than the missing atlases.

## Overall

This is a well-built single-page game. The rules engine is cleanly separated from the UI, uses no DOM and is deterministic:
a seeded LCG drives combat, so games can be replayed and the engine can be tested in Node. The hex math (odd-r offset ↔ axial)
is consistent across `distance`, `adjacent` and `hexCenter`. Reachability is a correct Dijkstra search. Dialogs trap focus,
respect `prefers-reduced-motion`, and the AI turn uses a cancellation token. The main weaknesses are a handful of rule bugs,
stated descriptions that don't match the numbers, and minified one-line code that is hard to maintain.

## Bugs (confirmed)

| # | Severity | Where | Problem | Evidence |
|---|---|---|---|---|
| 1 | Medium | `engine.js` `power()` | The boarding +55% bonus is meant for "Battle Line hulls and stations", but `st` is truthy whenever the *target* stands on any station. A boarding frigate therefore gets +55% against **any** garrison, including corvettes. In `preview()` the counter-fire call passes `stationAt(g,a)`, so a defending boarder also gets +55% whenever the *attacker* is on a station. | Boarding frigate vs. corvette: 75 damage on a station, 48 off it. |
| 2 | Medium | `engine.js` `beginTurn()` | The morale aura uses `g.units.find(...)` and takes the **first** admiral in range. Kircheis's +2 recovery is lost whenever another admiral (e.g. Reinhard) is found first. | A fleet at −2 next to Reinhard and Kircheis recovers to 0; expected +1. |
| 3 | Low | `engine.js` `repair()`, `reinforce()` | Neither function checks `isReady`, so a fleet in Confusion (morale −3, which "cannot act") can still repair or add stacks. | `repair()` on a confused fleet returns `ok: true`. |
| 4 | Low | `engine.js` `createGame()` / `game.js` `endTurn()` | Turn 1 favours the AI: the player starts turn 1 without collecting income, but the AI collects a full income in `beginTurn` before its first move. | AI starts its first phase with 700 credits versus the player's 430. |
| 5 | Low | `game.js` `render()` | Every action rebuilds `#app` with `innerHTML`, which destroys the focused canvas. After a keyboard move, Enter no longer works until the user clicks the map again, which breaks the advertised arrow-keys-and-Enter controls. | After an Arrow+Enter move, `document.activeElement` is `BODY`. |
| 6 | Low | `game.js` keydown handler | On the start screen, opening Field manual and pressing Escape closes the modal entirely. The player lands in the unconfigured default game (Alliance/Conquest) and skips setup. | The start menu is gone after Help → Esc. |
| 7 | Cosmetic | `art.js` | The flagship is rotated 180° on the canvas (`ART.draw`) but not in the SVG path (`ART.svg`), so it faces opposite directions on the map and in the panels. The 180° rotation also puts its lighting upside down. | Code inspection. |

## Descriptions that don't match the code

- **Torpedo escort "20% evasion".** It is actually a 10% damage reduction (`1 - evasion*0.5`), measured at a 0.90 ratio.
- **Mittermeyer and Attenborough: "refresh actions after two kills".** The code allows **two refreshes** per turn (`cap = 2`); it does not require two kills.
- **The +8% damage aura from command arrays.** It comes from *any* admiral, regardless of comms research; the research only widens the radius.
- **Aura morale stacking.** Any fleet near an admiral gains +1 morale every turn, even when 2 enemies are adjacent. That means a +25% damage bonus nearly all the time, which contradicts "Two adjacent enemies lower morale".
- **"Autosaved" in the footer.** It is always shown, even when `localStorage` writes fail.

## Maintainability and performance

- **Minified, one-line code.** `game.js` is mostly single lines several kilobytes long. Formatting it (e.g. Prettier) would make review and diffs practical.
- **Full DOM rebuild on every click** (`render()`). That works at this size, but it causes bug #5 and resets scroll positions in the side panel. Updating only the changed regions would fix both.
- **Per-frame work.** `draw()` runs every frame and calls `getBoundingClientRect` plus linear `unitAt`/`stationAt` scans for every tile. That's fine for 187 hexes. A per-frame occupancy map would help if maps grow.
- **Dead units are never pruned** (59 dead entries after a 14-turn game). They're harmless, but they grow the save and every `find`/`filter`.
- **Dead CSS.** `battlefield.css` sets `.ship-art`/`.portrait-art` background-image sprites, then line 7 sets them back to `none`, because the art is now inline SVG.
- **No tests.** The engine is already Node-loadable (`module.exports`), so a small `node --test` suite would be easy to add.

## Security

There is no network I/O and no `eval`. Log text is escaped with `esc()`. Other interpolated strings come from constants or from the
player's own `localStorage` save, so the only injection risk is self-XSS through a hand-edited save. External links use
`rel="noopener noreferrer"`. `registerTools()` exposes read and select tools through `document.modelContext` (WebMCP); neither can move,
attack or spend resources.

## Assets

`assets/fleet-atlas.png` and `assets/terrain-atlas.png` were not supplied, so locally ships render as two-letter codes and terrain props are not drawn.
See `ASSETS.md`.
