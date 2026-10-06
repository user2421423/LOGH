# Galactic Command visual assets

The assets were created with the built-in image generation tool using the supplied WC4 screenshot as a style reference. They are original game artwork; no WC4 sprite files were extracted.

## Integrated files

- Ships and structures: `/workspace/sites/galactic-command/dist/assets/fleet-atlas.png`
- Terrain and effects: `/workspace/sites/galactic-command/dist/assets/terrain-atlas.png`
- Admiral portraits: `/workspace/sites/galactic-command/dist/assets/admiral-atlas.png`

The intact atlases are consumed by `dist/art.js`, which defines source rectangles and runtime clipping for tight sprite boundaries. `dist/battlefield.css` provides the compact battlefield controls. The existing hex-combat rules and version-2 saves are retained.

## Generation record

# Asset generation provenance

Mode: built-in `image_gen__imagegen`; three generation requests issued in parallel, one request per asset, no variants. Each output was copied unchanged to this folder. No cropping or pixel editing was performed.

Reference inspected before generation: `/workspace/scratch/f74d1b5fc8b8/attachments/6e6c9c83-8a6c-4b04-9c93-2c20f79101dc/image.png`. Its painted miniature strategy-game visual quality informed the prompts; no reference-image argument was supplied to these new-image requests.

## 1. Ships and buildings

- Local file: `/workspace/scratch/f74d1b5fc8b8/visual-assets/ships-atlas.png`
- Original output: `/workspace/scratch/f74d1b5fc8b8/generated_images/exec-d282476a-f062-4519-83bb-6c185f739cb9.png`
- Dimensions: 1254 × 1254 pixels
- Format: RGBA; genuine transparent background
- Layout: 4 × 4; frame order is row-major, left to right, top to bottom.
- Tool argument: `transparent_background: true`

Row 1: corvette squadron; fast torpedo squadron; armed boarding frigate; vanguard destroyer.
Row 2: armored assault transport; light cruiser; heavy cruiser; broad heavy battleship.
Row 3: ivory command flagship; beam frigate; siege dreadnought; torpedo arsenal ship.
Row 4: mobile fortress spinal battery barge; orbital shipyard; spherical metallic fortress; planet with orbital capital ring.

Exact final prompt:

```text
Use case: stylized-concept.
Asset type: production sprite atlas for a Legend of the Galactic Heroes hex tactics browser game.
Create a square 4-column by 4-row sprite atlas with exactly 16 separate painted semi-realistic isometric spacecraft or orbital buildings. Each occupies its own exactly uniform cell centered at the 4x4 grid positions. Actual transparent alpha background. No drawn grid, labels, text, panels, border, hex bases, ground, stars, shadows spanning cells. Generous clear transparent gutters and outside margins; each object's full silhouette lies within the inner 70% of its cell. All ships use identical isometric camera and lighting, bows pointing upper-right. Muted gray and olive metal, warm upper-left highlights, painted miniature model detail like a classic World Conqueror 4 strategy battlefield reference, adapted to space opera; realistic dimensional miniature volume, no WWII vehicles, no screenshot UI. Readable silhouettes and detail even when shown at 70px.
Exact row-major subjects:
Row 1: a corvette squadron of 3 small ships; a fast torpedo squadron of 3 slim ships; an armed boarding frigate; a vanguard destroyer.
Row 2: an armored assault transport; a light cruiser; a heavy cruiser; a broad heavy battleship.
Row 3: a sleek ivory command flagship; a beam frigate with long spinal barrel; a heavy siege dreadnought with massive bow cannon; a torpedo arsenal ship with missile racks.
Row 4: a mobile fortress-class spinal battery barge; an orbital shipyard station; a spherical Iserlohn-style metallic fortress; a planet with an orbital capital ring.
Keep all 16 centered objects visually isolated, no content crossing cell boundaries. The spaces between and around objects must be truly transparent, never painted checkerboard.
```

## 2. Environment

- Local file: `/workspace/scratch/f74d1b5fc8b8/visual-assets/environment-atlas.png`
- Original output: `/workspace/scratch/f74d1b5fc8b8/generated_images/exec-281e38c4-429b-4fff-bb2d-5f185dd596a6.png`
- Dimensions: 1254 × 1254 pixels
- Format: RGBA; genuine transparent background
- Layout: 4 × 4; frame order is row-major, left to right, top to bottom.
- Tool argument: `transparent_background: true`

Row 1: small gray asteroids; large slate asteroids; iron asteroids; icy asteroids.
Row 2: cyan nebula; violet nebula; teal gas; warm dust.
Row 3: blue habitable planet; amber ringed planet; red rocky planet; ice planet.
Row 4: docking platform; space debris; projectile explosion; circular impact burst.

Exact final prompt:

```text
Use case: stylized-concept.
Asset type: production environment sprite atlas for a space opera hex tactics browser game.
Create a square atlas with exactly 4 columns and 4 rows: 16 painted miniature semi-3D game terrain props on true transparent alpha background. Uniform equal-size cells, each prop exactly centered in its cell, with generous 20% transparent gutters and outer margins. No visible grid, no hex bases, no text, no labels, no panels, no borders, no stars or background. Same isometric perspective, dimensional miniature volume and lighting across all objects, warm upper-left highlight. Match the painterly semi-realistic battlefield terrain look of classic strategy game World Conqueror 4, adapted entirely to space. Restrained muted palette.
Exact row-major subjects:
Row 1: scattered small gray asteroids; cluster of large rugged slate asteroids; warm iron asteroid cluster; bluish icy rock cluster.
Row 2: wispy muted cyan nebula patch; muted violet nebula patch; smoky teal gas patch; thin warm dust cloud. Each cloud is a small isolated translucent volumetric patch fading into actual alpha transparency, never filling the cell background.
Row 3: small blue habitable planet; amber planet with rings; muted red rocky planet; blue ice planet.
Row 4: small orbital docking platform; space debris field; small bright projectile explosion; fiery circular impact burst.
Each full object is confined to its cell, with no content spanning or touching cell boundaries. Ensure consistent equal-grid alignment and transparent space separating every sprite. No WWII vehicles, no copied UI, no painted checkerboard.
```

## 3. Admirals

- Local file: `/workspace/scratch/f74d1b5fc8b8/visual-assets/admirals-atlas.png`
- Original output: `/workspace/scratch/f74d1b5fc8b8/generated_images/exec-05c1cc0f-c2c6-49bb-bde5-be6581504b81.png`
- Dimensions: 1254 × 1254 pixels
- Format: RGB; opaque slate-blue portrait backgrounds
- Layout: 4 × 2; frame order is row-major, left to right, top to bottom.
- Tool argument: `transparent_background: false`

Row 1: Reinhard von Lohengramm; Yang Wen-li; Wolfgang Mittermeyer; Oskar von Reuenthal.
Row 2: Siegfried Kircheis; Dusty Attenborough; Edwin Fischer; Walter von Schönkopf.

Exact final prompt:

```text
Use case: stylized-concept.
Asset type: production portrait atlas for a Legend of the Galactic Heroes strategy browser game.
Create a SQUARE image arranged as precisely 4 columns by 2 rows, eight individual anime military admiral bust portraits, each occupying one exact equal rectangular cell. Classic hand-painted 1980s space opera anime style with clean cel-painted character forms, fine traditional linework, subtle painterly shading, muted tones, mature and dignified. Identical head-and-shoulders framing and studio lighting in each cell. Each cell has a flat muted slate-blue OPAQUE background. No text, labels, symbols over the portraits, frames, borders, dividing lines, or UI. All faces fully visible, no overlapping or crossing cells.
Row 1 from left to right:
1 Reinhard von Lohengramm: youthful handsome face, long flowing blonde hair, ornate dark Imperial military uniform.
2 Yang Wen-li: black hair, calm thoughtful face, casual green Alliance military uniform with black beret.
3 Wolfgang Mittermeyer: short honey-blond hair, attentive strong expression, dark Imperial uniform.
4 Oskar von Reuenthal: dark brown hair, visible heterochromatic eyes one blue one brown, refined stern expression, dark Imperial uniform.
Row 2 from left to right:
5 Siegfried Kircheis: short red hair, gentle expression, dark Imperial uniform.
6 Dusty Attenborough: short brown hair, younger adult, green Alliance uniform.
7 Edwin Fischer: older gray-haired man, square face, green Alliance uniform.
8 Walter von Schönkopf: rugged brown-haired adult, confident expression, green boarding regiment uniform.
Give each character a clear individual face while preserving the exact equal-cell contact sheet layout. All eight are separate busts with no body parts crossing cell boundaries.
```

## Inspection notes

Ships and environment contain real alpha transparency. Portrait ordering and 4 × 2 alignment are good. Ship and environment gutters are tighter than requested, and a few silhouettes cross nominal equal-cell boundaries; custom canvas source rectangles are advisable. The torpedo squadron has two visible ships rather than three. The ivory flagship faces opposite most ships. No further generation or corrections were performed.



## Faction fleet update · 5 October 2026

Empire: `dist/assets/empire-fleet.png`. Alliance: `dist/assets/alliance-fleet.png`. Each is an original generated 1983 × 793 RGBA atlas with 10 sprites, used in every shipyard, unit card, and battlefield. The older generic fleet atlas now supplies station/fortress/capital artwork only. Source pixels and transparency are unchanged. `dist/art.js` uses per-hull source rectangles and polygon clips to isolate neighboring sprites.

Both atlases use 5 columns × 2 rows. Row 1: Corvette, Frigate, Destroyer, Light Cruiser, Heavy Cruiser. Row 2: Battleship, Dreadnought, Spinal Beam Cruiser, Fusion Missile Arsenal Ship, Siege Cannon Monitor.

### Exact generation prompts

GALACTIC COMMAND — FACTION SHIP ATLAS PROVENANCE

Tool mode: built-in image_gen__imagegen.
Execution: exactly two generation requests in one parallel batch, one image per faction. No variants or retries.
Transparent background argument: true for both requests.
Dimensions: both images are 1983 × 793 pixels, RGBA.
Images copied unchanged; no cropping or pixel edits.

Empire saved PNG:
/workspace/scratch/f74d1b5fc8b8/visual-assets/factions/empire-ships.png
Empire original output:
/workspace/scratch/f74d1b5fc8b8/generated_images/exec-8fdc62b8-1ef3-43d4-9eb6-9117f63bfed4.png

FPA saved PNG:
/workspace/scratch/f74d1b5fc8b8/visual-assets/factions/fpa-ships.png
FPA original output:
/workspace/scratch/f74d1b5fc8b8/generated_images/exec-6a8fd64b-c676-475b-9e11-5dbc6e9f97b0.png

Shared frame mapping (5 columns × 2 rows, row-major):
Index 0: row 1, column 1 — Corvette
Index 1: row 1, column 2 — Frigate
Index 2: row 1, column 3 — Destroyer
Index 3: row 1, column 4 — Light Cruiser
Index 4: row 1, column 5 — Heavy Cruiser
Index 5: row 2, column 1 — Battleship
Index 6: row 2, column 2 — Dreadnought
Index 7: row 2, column 3 — Artillery Frigate (art generated as "Spinal Beam Cruiser")
Index 8: row 2, column 4 — Artillery Cruiser (art generated as "Fusion Missile Arsenal Ship")
Index 9: row 2, column 5 — Siege Cannon (art generated as "Siege Cannon Monitor")

Nominal equal cells: 396.6 pixels wide × 396.5 pixels high. Some larger silhouettes extend across nominal vertical cell boundaries; use carefully selected source rectangles if exact silhouette preservation is required.

Inspection: exactly 10 ships per atlas in requested reading order. Empire has bright white and gold curved hulls; FPA has olive and dark teal block hulls. Bows and artillery point upper-right, engines lower-left. Genuine alpha transparency present in both. Distinct artillery silhouettes. Gutters are narrower than the requested 30% cell clearance; no corrective editing performed.

EXACT EMPIRE PROMPT
------------------
Use case: stylized-concept.
Asset type: production transparent ship sprite atlas for Galactic Command, a Legend of the Galactic Heroes space tactics game.
Create ONE LANDSCAPE image, aspect ratio exactly 5:2, arranged as EXACTLY FIVE COLUMNS and TWO ROWS of equal square cells. Exactly TEN isolated individual spacecraft, one per cell. No title, words, labels, numbers, UI, borders, divider lines, ground, hex bases, stars, background scenery, cast shadows, or additional objects. Real transparent alpha background, never a painted checkerboard. Keep each ship's entire silhouette wholly inside the central 70% of its assigned square cell with broad clear transparent gutters and margins. Equally spaced, clean exact grid alignment. Camera: identical isometric three-quarter top-down for every ship. Every pointed bow and forward weapon points toward the UPPER RIGHT corner; stern engines at LOWER LEFT. The ten ships must look like different ship classes, not copies resized.
Medium: detailed painted 1990s space military strategy miniatures, semi-realistic dimensional modeling, crisp readable silhouettes at 70px, beautiful painted detail at 220px. Consistent upper-left studio light, subtle self-shadowing only, clean high-value contrast.
Frame order is mandatory, read left to right, top row then bottom:
TOP ROW: (1) Corvette, (2) Frigate, (3) Destroyer, (4) Light Cruiser, (5) Heavy Cruiser.
BOTTOM ROW: (6) Battleship, (7) Dreadnought, (8) Spinal Beam Cruiser, (9) Fusion Missile Arsenal Ship, (10) Siege Cannon Monitor.
Artillery distinctions: Spinal Beam Cruiser has a centered oversized forward neutron cannon along its main axis; Fusion Missile Arsenal Ship has dense paired exposed torpedo/missile racks; Siege Cannon Monitor has a squat wide heavy hull built around one enormous single fortress cannon. Every cannon points UPPER RIGHT. All ten ships centered separately and fully visible.
Faction: GALACTIC EMPIRE. Strong PORCELAIN-WHITE pristine hulls with rich restrained GOLD fittings and inset dark windows. Aristocratic sleek elegant smooth CURVED and tapered bodies, long sculpted contours and graceful needle prows. No olive, teal, gray/dieselpunk block ships, exposed industrial clutter, naval battleship decks, or shared Alliance silhouettes. Progressively varied elegant hull proportions across classes. The Dreadnought is an iconic Brünhild-like aristocratic needle palace ship, luminous ivory, elegant gold accents and finely sculpted spires. Even weapons and the squat siege monitor retain imperial white sculpted armor and gold trim. Use the painted miniature quality of the strategy-game style reference, but entirely replace the old gray hull designs with unmistakably distinct WHITE imperial spacecraft.

EXACT FPA PROMPT
---------------
Use case: stylized-concept.
Asset type: production transparent ship sprite atlas for Galactic Command, a Legend of the Galactic Heroes space tactics game.
Create ONE LANDSCAPE image, aspect ratio exactly 5:2, arranged as EXACTLY FIVE COLUMNS and TWO ROWS of equal square cells. Exactly TEN isolated individual spacecraft, one per cell. No title, words, labels, numbers, UI, borders, divider lines, ground, hex bases, stars, background scenery, cast shadows, or additional objects. Real transparent alpha background, never a painted checkerboard. Keep each ship's entire silhouette wholly inside the central 70% of its assigned square cell with broad clear transparent gutters and margins. Equally spaced, clean exact grid alignment. Camera: identical isometric three-quarter top-down for every ship. Every pointed bow and forward weapon points toward the UPPER RIGHT corner; stern engines at LOWER LEFT. The ten ships must look like different ship classes, not copies resized.
Medium: detailed painted 1990s space military strategy miniatures, semi-realistic dimensional modeling, crisp readable silhouettes at 70px, beautiful painted detail at 220px. Consistent upper-left studio light, subtle self-shadowing only, clean high-value contrast.
Frame order is mandatory, read left to right, top row then bottom:
TOP ROW: (1) Corvette, (2) Frigate, (3) Destroyer, (4) Light Cruiser, (5) Heavy Cruiser.
BOTTOM ROW: (6) Battleship, (7) Dreadnought, (8) Spinal Beam Cruiser, (9) Fusion Missile Arsenal Ship, (10) Siege Cannon Monitor.
Artillery distinctions: Spinal Beam Cruiser has a centered oversized forward neutron cannon along its main axis; Fusion Missile Arsenal Ship has dense paired exposed torpedo/missile racks; Siege Cannon Monitor has a squat wide heavy hull built around one enormous single fortress cannon. Every cannon points UPPER RIGHT. All ten ships centered separately and fully visible.
Faction: FREE PLANETS ALLIANCE (FPA). Strong OLIVE-GREEN and dark TEAL hull paint, utilitarian long BLOCKY BOX-SHAPED bodies with exposed greebles, stacked rectangular armor plating, inset recesses, turret batteries and forward gun batteries. Distinct rugged industrial space warships. No porcelain white, ivory, gold, imperial curves, smooth aristocratic needle ships, gray monochrome/dieselpunk ships, or shared Empire silhouettes. Progressively varied rectangular hull proportions across classes. The Dreadnought is a Hyperion-like broad dark teal and olive box-shaped command vessel with heavy utilitarian armor and a blunt armed prow pointing UPPER RIGHT. Spinal beam cruiser, missile arsenal and siege monitor retain the military olive and teal utilitarian box construction. Use the painted miniature quality of the strategy-game style reference, but replace the old gray hull designs with unmistakably distinct GREEN/TEAL Alliance spacecraft.


## Air wings

`dist/assets/air/{empire,alliance}-{fighter,bomber,strategic}.png` are painted, transparent formation sprites
(three interceptors, two torpedo bombers, one heavy strategic bomber) in the fleet artwork's upper-right isometric
view: Imperial porcelain-white armor with gold trim, Alliance olive-green and teal plating with exposed thrusters.
They come from the aerospace redesign package (built-in image generation with both fleet atlases as references),
trimmed to their content and scaled to 900 px wide for the web.

## Recruitable admiral portraits

`dist/assets/portraits/<id>.jpg` (300 × 400) are cropped from the official *Die Neue These* character pages
(gineiden-anime.com/character.html and character-fpdf.html), used with the copyright permission the project owner
obtained, for Bittenfeld, Müller, Fahrenheit, Kempff, Eisenach, Oberstein, Wahlen, Lutz, Mecklinger, Kessler,
Steinmetz, Lennenkampf, Bucock, Merkatz, Cazerne, Poplin, Konev, Murai, Patrichev and Nguyen. Ulanhu and Borodin
have no official portrait there and keep the drawn placeholder bust from `ART.portraitSVG`.
