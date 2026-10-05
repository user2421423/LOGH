# Code review: Galactic Command · Hex Conquest

Scope: the complete site source (`dist/`, `tests/`), published source commit `9fe16dc`, packaged 5 October 2026.
This version has rules version 3, 10 ship classes, faction-specific Empire and Alliance fleet art, and save migration.

Method: read all files, ran the project's own tests (`node --test tests/engine.test.cjs`: 17/17 pass; `node tests/ui-smoke.cjs`: PASS),
then confirmed each finding below by running `dist/engine.js` in Node or the page in headless Chromium.

## Overall

This is a well-built single-page game. The rules engine is cleanly separated from the UI, uses no DOM and is deterministic:
a seeded LCG drives combat, so games can be replayed and the engine can be tested in Node, as the tests do. The hex math
(odd-r offset ↔ axial) is consistent across `distance`, `adjacent` and `hexCenter`. Reachability is a correct Dijkstra search.
Old saves are migrated (`migrateSave`). Dialogs trap focus, respect `prefers-reduced-motion`, and the AI turn uses a
cancellation token. The remaining issues are a handful of rule bugs, a few descriptions that don't match the numbers, and
minified one-line code that is hard to maintain.

## Bugs (confirmed in this version)

| # | Severity | Where | Problem | Evidence |
|---|---|---|---|---|
| 1 | Medium | `engine.js` `power()` | The marine-pod +55% bonus is meant for "Battle Line hulls and stations", but `st` is truthy whenever the *target* stands on any station. A frigate therefore gets +55% against **any** garrison, including corvettes. In `preview()` the counter-fire call passes `stationAt(g,a)`, so a defending frigate also gets +55% whenever the *attacker* is on a station. | Frigate vs. corvette: 75 damage on a station, 48 off it. |
| 2 | Medium | `engine.js` `beginTurn()` | The morale aura uses `g.units.find(...)` and takes the **first** admiral in range. Kircheis's +2 recovery is lost whenever another admiral (e.g. Reinhard) is found first. | A fleet at −2 next to Reinhard and Kircheis recovers to 0; expected +1. |
| 3 | Low | `engine.js` `repair()`, `reinforce()` | Neither function checks `isReady`, so a fleet in Confusion (morale −3, which "cannot act") can still repair or add stacks. | `repair()` on a confused fleet returns `ok: true`. |
| 4 | Low | `engine.js` `createGame()` / `game.js` `endTurn()` | Turn 1 favours the AI: the player starts turn 1 without collecting income, but the AI collects a full income in `beginTurn` before its first move. | AI starts its first phase with 700 credits versus the player's 430. |
| 5 | Low | `game.js` `render()` | Every action rebuilds `#app` with `innerHTML`, which destroys the focused canvas. After a keyboard move, Enter no longer works until the user clicks the map again, which breaks the advertised arrow-keys-and-Enter controls. | After an Arrow+Enter move, `document.activeElement` is `BODY`. |
| 6 | Low | `game.js` keydown handler | On the start screen, opening Field manual and pressing Escape closes the modal entirely. The player lands in the unconfigured default game and skips setup. | The start menu is gone after Help → Esc. |

Fixed by this version (present in the earlier live snapshot): the flagship sprite's 180° rotation, and the
torpedo escort's "20% evasion" text, which really meant 10%. The torpedo class was removed.

## Fixes applied on this branch

All six bugs are fixed, plus two text and label corrections. The project tests pass (`engine.test.cjs` 22/22, including 5 new tests; `ui-smoke.cjs` PASS).
Four of the new tests fail on the unfixed engine; the fifth is a guard that the station-shield bonus is kept.

| # | Fix | Verified by |
|---|---|---|
| 1 | `power()` grants the marine-pod bonus against a Battle Line target, or against a station only when no garrison is the target. `preview()` keeps the +55% on the station-shield share when a frigate hits a garrisoned station. | 3 new engine tests |
| 2 | `beginTurn()` prefers Kircheis's +2 aura when several admirals are in range. | New engine test |
| 3 | `repair()` and `reinforce()` require `isReady`, so confused fleets can't use them. | New engine test |
| 4 | The AI no longer collects income at the start of its turn 1 (`game.js` `endTurn`), matching the player. The engine API is unchanged. | Browser: AI has 430 credits on turn 1 |
| 5 | `render()` restores canvas focus if the map had it, so keyboard play keeps working after every action. | Browser: three Arrow/Enter moves in a row |
| 6 | Escape in the Field manual opened from the start screen returns to setup. | Browser |
| — | Mittermeyer and Attenborough text now says "refresh actions twice per turn". | Code |
| — | The footer shows "not saved" when the last `localStorage` write failed. | Browser, with `setItem` forced to throw |

Not changed (design decisions for the author): admiral aura morale stacking and the command-arrays aura wording.

## Descriptions that don't match the code (as found)

- **Mittermeyer and Attenborough: "refresh actions after two kills".** The code allows **two refreshes** per turn (`cap = 2`); it does not require two kills.
- **The +8% damage aura from command arrays.** It comes from *any* admiral, regardless of comms research; the research only widens the radius.
- **Aura morale stacking.** Any fleet near an admiral gains +1 morale every turn, even when 2 enemies are adjacent. That means a +25% damage bonus nearly all the time, which contradicts "Two adjacent enemies lower morale".
- **"Autosaved" in the footer.** It is always shown, even when `localStorage` writes fail.

## Maintainability and performance

- **Minified, one-line code.** `game.js` and `engine.js` are mostly single lines several kilobytes long. Formatting them (e.g. Prettier) would make review and diffs practical.
- **Full DOM rebuild on every click** (`render()`). That works at this size, but it causes bug #5 and resets scroll positions in the side panel.
- **Per-frame work.** `draw()` runs every frame and calls `getBoundingClientRect` plus linear `unitAt`/`stationAt` scans for every tile. That's fine for 187 hexes.
- **Dead units are never pruned.** They grow the save and every `find`/`filter`.
- **Dead CSS.** `battlefield.css` still sets background-image sprites on `.ship-art`/`.portrait-art`, then resets them to `none`.
- **Test gaps.** The engine tests don't cover bugs 1–4; each is a small Node test to add.

## Security

There is no network I/O and no `eval`. Log text is escaped with `esc()`. Other interpolated strings come from constants or from the
player's own `localStorage` save, so the only injection risk is self-XSS through a hand-edited save. External links use
`rel="noopener noreferrer"`. `registerTools()` exposes read and select tools through `document.modelContext` (WebMCP); neither can move,
attack or spend resources.
