# Galactic Command: handoff

This document is for whoever picks up the project next, human or AI. It explains what the game is, how the
code is organised, every system built so far, and the working conventions the owner expects.

- Repository: `user2421423/LOGH`
- Working branch: `claude/galactic-command-code-review-7oka9v` (also the repository's default branch)
- Live site: https://user2421423.github.io/LOGH/ (GitHub Pages, deployed from `dist/` on every push)

## 1. Premise

Galactic Command is a browser turn-based hex strategy game in the style of **World Conqueror 4** (EasyTech),
themed on **Legend of the Galactic Heroes** (LOGH). The Galactic Empire (Reinhard, Mittermeyer, Reuenthal,
Kircheis…) fights the Free Planets Alliance (Yang, Attenborough, Fischer, Schönkopf…) across hex maps of
space, with WC4's core loop:

- Move each fleet once and attack once per turn; click a green hex to move, a red hex to attack immediately.
- Fleets are 1–3 stacks; admirals ride on fleets and give bonuses; morale, terrain and counter-fire matter.
- Capture stations for income, build fleets at shipyards, upgrade stations, research technology.
- Play **campaigns** (a chapter sequence per side, each chapter a historical LOGH battle with one objective,
  a turn limit and a 1–3 star rating) or **Conquest** (a large galaxy, take both capitals).
- Between operations, **command tokens** (the game's equivalent of WC4 medals) buy permanent HQ research,
  recruit admirals, promote them and buy their stars. This progression persists in the browser.

The game began as a ChatGPT Sites project and was moved to a standalone static site with no build step.
It is an unofficial fan game; see `ASSETS.md` for art sources and permissions.

## 2. Running, testing and deploying

- **Run locally:** serve `dist/` with any static server (e.g. `npx serve dist` or `python3 -m http.server -d dist`)
  and open it. Opening `dist/index.html` directly also works in most browsers.
- **Tests (local only):** `node --test tests/engine.test.cjs` (44 engine tests) and `node tests/ui-smoke.cjs`
  (loads all UI scripts in a stubbed DOM and clicks through every dialog for both factions). Node 22.
- **Deploy:** `.github/workflows/pages.yml` uploads `dist/` to GitHub Pages on every push to the working branch.
  It deliberately does **not** run the tests (owner's choice).
- **Formatting:** Prettier with `.prettierrc` (`printWidth 120`, `singleQuote`, `arrowParens: avoid`).

## 3. Code layout

Everything ships from `dist/`; there is no bundler. Scripts load in this order from `index.html`:

| File | Role |
|---|---|
| `dist/engine.js` | The deterministic rules engine (`window.Galactic`, aliased `E` in the UI; `module.exports` for Node). No DOM. Unit types, admirals, tech tree, combat, AI, maps, scenarios, campaigns, profile/roster logic. Seeded LCG via `random(g)`. |
| `dist/art.js` | `ART`: sprite atlases (fleet, faction fleets, terrain, admiral portraits), air-wing PNGs, admiral portrait photos, drawn placeholder busts, canvas and SVG/HTML renderers. |
| `dist/icons.js` | `ICONS`: inline SVG sprite (credits $ coin, industry, research, command token, attack/defense/move/range, air base, air wings) and the HP ring. |
| `dist/audio.js` | `SFX`: Web Audio synthesized sounds (weapons per hull class and faction voice, explosions, crits, Thor's Hammer, fleet movement, air fly-by). Mute persists. |
| `dist/game.js` | The whole UI: start screen, campaign map, canvas map renderer and input, panels, dock, dialogs (shipyard, HQ research, admirals, Admiral Info, units archive, field manual, results), effects, AI turn playback, saving. |
| `dist/style.css`, `dist/battlefield.css` | Base styles and the WC4-style reskin (later sections appended at the end of `battlefield.css`). |
| `dist/assets/` | Atlases, `air/` air-wing sprites, `portraits/` recruitable-admiral portraits. |
| `tests/` | `engine.test.cjs`, `ui-smoke.cjs`. |
| `README.md` | Player-facing feature list. `ASSETS.md`: asset sources. `REVIEW.md`: the original code review. |

### Engine conventions

- Game state `g` is plain JSON (saved whole to `localStorage`). Key fields: `player`, `phase`, `turn`, `mode`
  (`'conquest'` or a scenario id), `era`, `objective`, `cols/rows`, `tiles`, `units`, `stations`, `economy`,
  `tech` (per side, `{ 'line.armor': 2, … }`), `officers` (scenario commanders), `roster` (copy of your admirals),
  `rules` (map-specific rules), `difficulty`, `log`, `over`.
- Hex grid: odd-r offset coordinates (`c`, `r`), distance via axial conversion (`distance`, `adjacent`).
- Every player action has a `…Reason(g, …)` function returning `null` or a human-readable reason; the UI shows it
  on disabled buttons. Shortfalls read "Need N more credits / command tokens" and render as red costs instead.
- Saves are gated by `rulesVersion` (currently 11) in `migrateSave`; bump it when save shape or rules change.
- `createGame(player, difficulty, mode, seed)`: `mode` is `'conquest'`, `'conquest:<era>'` or a scenario id.

### Browser storage keys

| Key | Contents |
|---|---|
| `galactic-command-officers` | The persistent **profile**: `tokens`, `wins`, `cleared` (`'<operation>:<difficulty>': true`), `research`, `roster` (your admirals: rank, ratings, medals), `medals` (medal case). |
| `galactic-command-hex-v2` | The current game save. |
| `galactic-command-stars` | Best star rating per scenario (and per difficulty, `id:hard`). |
| `galactic-command-sound` | `'on'` / `'off'`. |

## 4. Systems

### Units (13 classes)
- **Escort:** Corvette, Frigate (boarding: +55% vs Battle Line and stations), Destroyer (5 movement).
- **Battle Line:** Light Cruiser, Heavy Cruiser, Battleship, Dreadnought. Cruiser kills grant one extra shot per
  turn (no extra movement). Battleships and Dreadnoughts fire again after every kill; their first kill each turn
  also restores movement. Mittermeyer, Attenborough and Nguyen allow two cruiser re-fires.
- **Artillery:** Artillery Frigate (range 1), Artillery Cruiser (exactly range 2, splash 45%), Siege Cannon
  (exactly range 2, +100% vs stations). Artillery suppresses counter-fire and cannot capture.
- **Air:** Fighter, Bomber, Strategic Bomber wings, built at station air bases (levels 1–3). They ignore terrain,
  cannot capture, are immune to artillery, draw return fire only from escorts and fighters, and lose 10% hull per
  turn outside air supply (3 hexes from a friendly air base, 5 with Carrier Operations). Selecting a wing shows a
  blue supply overlay; reachable hexes outside supply turn amber and need a confirming second click.
- Stacks 1–3 (+70% HP, +45% attack per extra stack; each extra stack costs 85% of a hull). Veterancy 0–5 from kills.

### Combat, morale, terrain
- `power()` / `preview()` compute damage with armor penetration, crits, morale (high +25%, low −25%, diminished −50%,
  confused cannot act), command auras, terrain (asteroids −15% damage, nebulae 2.5% attrition, both cost 2 moves,
  rifts impassable), branch ratings, medals and HQ tech. Hover a red hex to see expected damage and counter-fire.
- Fortresses (Iserlohn, Geiersburg) have a player-fired main gun (Thor's Hammer): range 3, 40% of target hull,
  2-turn recharge, silenced while shields are down. Nothing fires automatically.
- A fleet whose only remaining order is "hold position" is dimmed and excluded from the ready count and Next fleet.

### Economy and stations
- Resources: credits, industry, research (research banked at victory converts to command tokens, 5 : 1).
- Stations have three buildings, each upgradable to level 3: Shipyard (unlocks hull tiers, +industry),
  Research station (+research), Air base (air wings). One fleet per station per turn; new fleets act next turn.
- Repairs (+35% hull) cost a fifth of the fleet price; reinforcing a stack costs a full hull.

### Admirals
- **Two kinds, as in WC4.** *Scenario commanders* come with an operation, stay on their fleets with fixed stats and
  cannot be upgraded. *Your admirals* (the persistent roster in the profile) are recruited once with command tokens,
  upgraded in **HQ → Admirals**, and can be assigned (for credits) to any fleet in any operation on their side, even
  beside the scenario's own version of the same admiral (`u.personal`).
- Starting roster: Reinhard and Mittermeyer (Empire), Yang and Attenborough (Alliance). Recruit prices: 400 tokens
  for five-star, 300 for four-star, 200 for the three-star recruitables.
- 30 admirals in total, each with one signature ability (e.g. Reinhard's Fleet Leader, Yang's Magician with the
  Confusion order, Bittenfeld's Black Lancers, Müller's Iron Wall, Cazerne's Quartermaster, Poplin's Spartanian Ace).
  The 22 later additions (Bittenfeld, Müller, Fahrenheit, Kempff, Eisenach, Oberstein, Wahlen, Lutz, Mecklinger,
  Kessler, Steinmetz, Lennenkampf; Bucock, Merkatz, Ulanhu, Borodin, Cazerne, Poplin, Konev, Murai, Patrichev,
  Nguyen) are never placed in operations; they exist only as recruitable admirals.
- Eleven naval ranks bought with tokens set the commanded fleet's hull: Ensign 112%, Lieutenant JG 116%,
  Lieutenant 120%, Lt Commander 124%, Commander 128%, Captain 133%, Commodore 138%, Rear Admiral 143%,
  Vice Admiral 148%, Admiral 154%, Fleet Admiral 160%.
- Branch star ratings (Escort, Battle Line, Artillery, Aerospace), up to 6 stars, bought with tokens; each star above
  3 adds 4% damage and cuts damage taken 3% for that branch. A fifth rating, **Movement** (up to 6 stars, same
  token prices), changes the commanded fleet's movement: 1★ −1 hex, 2★ ±0, 3★ +1, 4★ +2, 5★ +3, 6★ +4, on top of signature
  abilities such as Mittermeyer's +2. Defaults sit in `RATINGS[k].move`; older saves and profiles are backfilled. Medals (Valor, Laurel, Conqueror's Star, Marksman,
  Campaign) are earned in operations and worn in limited slots. There is no XP or skill-point system.
- Clicking any portrait (map pin, panel, dock, admirals lists) opens the WC4-style **Admiral Info** card.

### HQ research and command tokens
- 37 technologies in five trees (Escort, Battle Line, Artillery, Aerospace, Stations) adapted from WC4's HQ tree:
  weapons, armor, hull, engines, class counters, Assault Doctrine, Fire Control, Carrier Operations, Fortification,
  Thor Overcharge and more. Tiers II–IV open after 2, 4 and 7 victories; some nodes have prerequisites.
  Research is permanent, applies only to the player's side, in every operation.
- Tokens are paid only for the **first** victory in each operation at each difficulty: 250 + 50 per star
  (150 for Conquest) + banked research, ×1.5 on Hard and ×2 on Challenge, plus 150 for the first win ever.

### Difficulty
- Normal: the operation as designed. Hard: enemies get all tier I–II research, every other enemy fleet is upgraded
  one class, +1 fleet per four, enemy commanders one rank higher. Challenge: enemies get all research, every fleet
  upgraded with an extra stack, +1 fleet per two, two ranks higher, +25% enemy income.

### Campaigns (WC4-style)
Chapters unlock in order once the previous one is won on any difficulty. The start screen shows each side's
chapter map with completion, best stars, remaining rewards and the next chapter.

- **Empire:** Third Battle of Tiamat; Battle of Astarte; Amritsar Counteroffensive; Lippstadt War; Eighth Battle of
  Iserlohn (Geiersburg); Operation Ragnarök; Vermilion: Hold the Line; Battle of Rantemario; Battle of the Corridor.
- **Alliance:** Astarte: The Second Fleet; Seventh Battle of Iserlohn; Hold Amritsar; Alliance Civil War;
  Defense of Iserlohn; Ragnarök: Defend Heinessen; Battle of Vermilion; Battle of Mar-Adetta; Battle of the Corridor.
- Objective types: capture, destroy, kill (an admiral's flagship), hold (stations through a turn), survive.
- Scenarios are defined in `SCENARIOS` in `engine.js`. Most use a data `layout` (territory split, stations, units,
  economy); the Lippstadt and Ragnarök chapters use `conquestMap` to reuse an older start-date map from `ERAS`
  with its special rules (rebel bounty and tougher rebel strongholds; Vermilion crossing closed and Imperial blitz).
  `CAMPAIGNS` lists the chapter order per side.

### Conquest
- Only **The galactic frontier**: a mirrored 31 × 19 galaxy of 24 named worlds (Odin, Valhalla, Freya, Brauschweig,
  Lippstadt, Geiersburg… against Heinessen, Rantemario, Palmeren, Dagon, Doria, Vermilion…), split by a rift crossed
  at Iserlohn and Fezzan (both neutral at the start). 14 fleets per side. Win by taking both capitals, or by
  holding more stations at the 80-turn armistice.

### AI
- `aiProduction` (fortress fire, repairs, saving for dreadnoughts, upgrades, research is not used by the AI,
  stacked fleet production, no fleet cap) and `aiOrder` (per-fleet move/attack scoring, air supply aware,
  chains up to 8 attacks). The AI never appoints admirals.

### Presentation
- WC4-style HUD: resource bar with gold $ coin, faction-coloured unit plates (Empire navy/gold, Alliance
  crimson/silver, rebels purple), HP rings, stack bars, admiral portrait pins, red/green hex overlays, undo move (Z).
- Combat juice: floating damage and CRIT popups, morale and supply alerts, camera shake, synthesized faction sounds.
- Painted air-wing formations and Die Neue These portraits for 20 recruitable admirals (Ulanhu and Borodin use a
  drawn placeholder bust).

## 5. Working with the owner

- Treat the owner as the commander: carry out requests fully and report plainly what changed.
- **Do not run tests or browser checks unless the owner asks.** Keep the test files consistent with rule changes
  anyway, since the owner may ask for a test run.
- Commit and push each completed request to `claude/galactic-command-code-review-7oka9v`; deploys happen automatically.
- Terminology: say **admirals**, not generals. The **Empire** is the default side on the start screen.
- Keep explanations short and concrete; tables are welcome for lists of changes.
- When numbers are first-pass balance guesses, say so so the owner can tune them.
