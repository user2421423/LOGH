# Galactic Command — complete site source

This contains the complete published game, including the new Empire and Alliance artwork, ten ship classes, updated combat rules, and saved-campaign migration.

## Play online

https://user2421423.github.io/LOGH/ — deployed automatically from `dist/` by `.github/workflows/pages.yml` after the tests pass.

## WC4-style controls and HUD

- **One-click attacks:** click (or press Enter on) a red hex to fire immediately. Hover first to see the expected damage and counter-fire.
- **Undo move:** a fleet that has moved but not fired can be sent back with the **Undo move** button or **Z**. Any attack, purchase or other order locks in earlier moves.
- **Resources:** Credits (gold $ coin), Industry (gear and ingot) and Research (microchip).
- **Map tokens:** Imperial fleets stand on navy plates with gold trim, Alliance fleets on crimson plates with silver trim, ringed by a green → yellow → red hull gauge. Metallic bars show 1–3 stacks, and admirals appear as framed portraits with rank stars above their fleets.
- **Combat juice:** synthesized weapon sounds per hull class and faction (🔊 button mutes), floating damage with red **CRIT!** numbers, blue station-defense tags, **MORALE ↓ / CONFUSED / LOW SUPPLY** alerts, and camera shake on heavy hits.
- **Fortress main guns:** select your own Iserlohn (Thor's Hammer) or Geiersburg and click a red hex to strike an enemy fleet within 3 hexes for 40% of its hull. Two-turn recharge; silenced while shields are down. Nothing fires automatically.
- **Station buildings:** every station has a Shipyard (larger hulls, +10 industry per level), a Research station (+8 research per level) and an Air base, each upgradable to level 3.
- **Air wings:** Fighter, Bomber and Strategic Bomber wings from air bases. They ignore terrain, cannot capture, are immune to artillery, only take return fire from escorts and fighters, and need a friendly air base within 3 hexes.
- **Conquest start dates:** the standard frontier plus Astarte, the Amritsar offensive, the Lippstadt War (rebel stations and garrisons) and Operation Ragnarök.
- **Scenarios:** Assault on Iserlohn, Battle of Astarte, Hold Amritsar and Battle of Vermilion, each with one objective, a turn limit and a saved 1–3 star rating.
- **Branch technology trees:** Escort, Battle Line, Artillery and Aerospace each have Drives, Plating and Weapons upgrades plus a Doctrine with class abilities (Picket Screen, Breakthrough Doctrine, Fire Control with +1 artillery range, Carrier Operations with hit-and-run air wings).
- **Admiral development:** XP from combat, five ranks (+6% fleet hull each), skill points for six upgradeable skills or branch star ratings, and five medals to earn and wear. Officer records are saved in the browser and carry between operations.
- **Clear disabled orders:** unaffordable costs turn red on the resource you are short of; other unavailable buttons say why, e.g. "Already fired", "No friendly station nearby".
- **Economy:** both sides start with 300 credits and 250/turn. Escorts give the most firepower per credit, flagships the most per hex at about two turns of income; extra stacks cost 85% of a hull, field reinforcement a full hull, repairs a fifth of the fleet's price.

Saves from earlier versions are not loaded (rules version 7).

## Run the game

1. Extract this ZIP.
2. Open a terminal in the extracted `galactic-command` folder.
3. Run:

```sh
python3 -m http.server 8000 --directory dist
```

4. Open http://localhost:8000 in your browser.
5. Press Ctrl+C in the terminal to stop the server.

There are no npm dependencies, build steps, API keys, or external services required to play. The game runs entirely in the browser. Python is used only to serve the files locally. Any other static web server works too.

You can also try opening `dist/index.html` directly in your browser. Serving the folder as above is recommended for consistent browser handling of assets and saved games.

## Files

- `dist/index.html` — entry page
- `dist/engine.js` — game rules, unit roster, combat, AI, economy, and save migration
- `dist/game.js` — interface, controls, battlefield rendering, and browser saves
- `dist/art.js` — artwork loading and sprite definitions
- `dist/style.css`, `dist/battlefield.css` — interface styling
- `dist/assets/empire-fleet.png` — white/gold Imperial ships
- `dist/assets/alliance-fleet.png` — olive/teal Alliance ships
- `dist/assets/fleet-atlas.png` — stations, fortresses, and capitals
- `dist/assets/terrain-atlas.png` — terrain and effects
- `dist/assets/admiral-atlas.png` — admiral portraits
- `tests/engine.test.cjs` — gameplay tests
- `tests/ui-smoke.cjs` — interface smoke checks
- `ASSETS.md` — artwork notes, sprite mappings, and generation prompts
- `.openai/hosting.json` — existing Sites deployment configuration

## Edit or host elsewhere

Edit the files in `dist/`, then refresh the browser. To host the game elsewhere, upload the entire contents of `dist/` while preserving the `assets/` folder. The `.openai/hosting.json` project ID refers to the original Site; it is not needed by other static hosts.

## Optional tests

With Node.js installed, run from this folder:

```sh
node --test tests/engine.test.cjs
node tests/ui-smoke.cjs
```

## Saved games

Progress lives in the browser's local storage under `galactic-command-hex-v2`. This package includes the code to migrate older campaigns, but it does not include your browser's save data. The hosted Site and localhost use separate save storage.

## Source snapshot

Published source commit: 9fe16dc9205f02ddf6e32ddb9c83ae01dedac584
Packaged: 5 October 2026

Unofficial Legend of the Galactic Heroes fan game with WC4-inspired rules and original generated artwork.

## Screenshot

![Battlefield](screenshot.png)

## Code review

See [REVIEW.md](REVIEW.md).
