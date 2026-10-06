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
- **Station buildings:** every station has a Shipyard (larger hulls, +10 industry per level), a Research station (+8 research per level; research banked at victory becomes command tokens) and an Air base, each upgradable to level 3.
- **Air wings:** Fighter, Bomber and Strategic Bomber wings from air bases. They ignore terrain, cannot capture, are immune to artillery, only take return fire from escorts and fighters, and need a friendly air base within 3 hexes.
- **Conquest start dates:** the standard frontier plus Astarte, the Amritsar offensive, the Lippstadt War (rebel stations and garrisons) and Operation Ragnarök.
- **Scenarios:** Assault on Iserlohn, Battle of Astarte, Hold Amritsar and Battle of Vermilion, each with one objective, a turn limit and a saved 1–3 star rating.
- **HQ research with command tokens:** as in World Conqueror 4, technology is bought at Command HQ with command tokens and kept across every operation and side. Tokens come only from the first victory in each operation at each difficulty (250, plus 50 per star or 150 for a Conquest, plus 1 per 5 research banked; ×1.5 on Hard, ×2 on Challenge; 150 extra for the first win ever). Replays pay nothing. 37 technologies in five trees: Escort, Battle Line, Artillery, Aerospace and Stations. They cover weapons, armor, hull, engines, class counters, Assault Doctrine breakthroughs, Fire Control, Carrier Operations, Fortification and Thor Overcharge. Tiers II–IV open after 2, 4 and 7 victories.
- **Difficulty (Normal / Hard / Challenge):** Normal is each operation as designed. Hard gives every enemy side all tier I–II HQ research, upgrades every other enemy fleet one class (escort → light cruiser, cruiser → heavier hull, artillery and air wings likewise), adds one fleet per four and makes enemy admirals one rank higher. Challenge gives them every technology, upgrades every fleet with an extra stack, adds one fleet per two, two admiral ranks and +25% enemy income. Best stars and rewards are tracked per difficulty.
- **General Info and token stars:** click any admiral portrait (map, panel, dock or Admirals menu) for a WC4-style card. As WC4 spends medals, command tokens buy extra branch stars (60 / 120 / 220 / 360 tokens for the 3rd–6th star, up to 6). Stars are saved with the officer and carry into every mode and difficulty.
- **Recruitable admirals:** 22 more admirals, none placed in any operation, recruitable in HQ → Generals. Empire: Bittenfeld, Müller, Fahrenheit, Kempff, Eisenach, Oberstein, Wahlen, Lutz, Mecklinger, Kessler, Steinmetz, Lennenkampf. Alliance: Bucock, Merkatz, Ulanhu, Borodin, Cazerne, Poplin, Konev, Murai, Patrichev, Nguyen. Each has one signature ability.
- **Campaigns (WC4-style):** an Empire campaign (Third Battle of Tiamat, Astarte, Amritsar Counteroffensive, Eighth Battle of Iserlohn with Geiersburg, Operation Ragnarök, Vermilion: Hold the Line, Rantemario, the Corridor) and an Alliance campaign (Astarte: The Second Fleet, Seventh Battle of Iserlohn, Hold Amritsar, Defense of Iserlohn, Vermilion, Mar-Adetta, the Corridor). Chapters unlock in order once the previous one is won on any difficulty; the map shows wins per difficulty, best stars, rewards still on offer and the next chapter. Conquest start dates are in their own dropdown.
- **Air supply overlay:** selecting an air wing tints every hex inside friendly air supply blue; reachable hexes beyond coverage turn amber with a warning, the hover caption explains the 10%-per-turn attrition, and moving there takes a confirming second click.
- **Your generals vs. scenario commanders (WC4-style):** admirals that come with a scenario or Conquest start date stay on their fleets with fixed stats and cannot be upgraded. Your own generals live in HQ → Generals (start menu or in-game Admirals menu): two per side to start (Reinhard and Mittermeyer, Yang and Attenborough), the rest recruited once with command tokens (400 five-star, 300 four-star, 200 three-star recruitables). Promote them through eleven naval ranks (fleet hull 112% to 160%), buy branch stars and equip medals there; assign them to any fleet in any operation on their side, even beside the scenario's own version.
- **Clear disabled orders:** unaffordable costs turn red on the resource you are short of; other unavailable buttons say why, e.g. "Already fired", "No friendly station nearby".
- **Economy:** both sides start with 300 credits and 250/turn. Escorts give the most firepower per credit, flagships the most per hex at about two turns of income; extra stacks cost 85% of a hull, field reinforcement a full hull, repairs a fifth of the fleet's price.

Saves from earlier versions are not loaded (rules version 11).

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
