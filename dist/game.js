'use strict';
const E = Galactic,
  $ = id => document.getElementById(id),
  app = $('app'),
  modal = $('modal-root');
let game = E.createGame('alliance'),
  selection = null,
  undoStack = [],
  hover = null,
  canvas,
  ctx,
  zoom = 1,
  pan = { x: 0, y: 0 },
  fitScale = 1,
  offset = { x: 0, y: 0 },
  mapSize = { w: 0, h: 0 },
  effects = [],
  setup = { side: 'alliance', mode: 'conquest', difficulty: 'normal' },
  shop = { station: null, branch: 'Escort', stack: 1 },
  lastTime = 0,
  toastTimer,
  aiToken = 0,
  pointer = null,
  readyCache = new Map(),
  targetCache = new Set();
let detailOpen = false,
  saveOk = true,
  shake = 0;
const R = 43,
  SQ = Math.sqrt(3),
  count = n => Math.round(n).toLocaleString('en-US'),
  esc = s =>
    String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ownUnits = () => game.units.filter(u => u.hp > 0 && u.side === game.player),
  selectedUnit = () => (selection?.kind === 'unit' ? game.units.find(u => u.id === selection.id && u.hp > 0) : null),
  selectedStation = () => (selection?.kind === 'station' ? game.stations.find(s => s.id === selection.id) : null);
const interactive = () => !game.over && game.phase === game.player;
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3500);
}
// The admiral whose General Info card is open, so officer orders can refresh it.
let generalOpen = null;
const PROFILE_KEY = 'galactic-command-officers';
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) {
    toast('This browser could not save your command records.');
  }
}
function save() {
  if (game.phase !== game.player) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(E.exportProfile(game, loadProfile())));
    localStorage.setItem('galactic-command-hex-v2', JSON.stringify(game));
    saveOk = true;
  } catch (e) {
    saveOk = false;
    toast('This browser could not save progress. Keep this tab open.');
  }
}
function getSave() {
  try {
    const g = JSON.parse(localStorage.getItem('galactic-command-hex-v2'));
    if (g?.version === 2 && g.tiles?.length === g.cols * g.rows && g.units && g.stations && E.FACTIONS[g.player])
      return E.migrateSave(g);
  } catch (e) {}
  return null;
}
function focusDialog() {
  setTimeout(() => modal.querySelector('button:not(:disabled),select')?.focus(), 15);
}
function closeModal() {
  generalOpen = null;
  modal.innerHTML = '';
  canvas?.focus({ preventScroll: true });
}
function newGame() {
  aiToken++;
  game = E.applyProfile(E.createGame(setup.side, setup.difficulty, setup.mode, Date.now() >>> 0), loadProfile());
  selection = { kind: 'unit', id: ownUnits().find(u => u.admiral)?.id };
  undoStack = [];
  effects = [];
  zoom = 1;
  pan = { x: 0, y: 0 };
  closeModal();
  render();
  save();
  toast('Select a fleet: green hexes move it, red hexes attack immediately.');
}
function startMenu() {
  const saved = getSave();
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Campaign setup"><div class="eyebrow">Legend of the Galactic Heroes · WC4-inspired tactics</div><h1>One galaxy.<br>Every hex contested.</h1><p>Build a fleet. Appoint your admirals. Break the enemy line with coordinated firepower—and take the stations that keep the war alive.</p><div class="choice-grid"><button class="faction empire ${setup.side === 'empire' ? 'active' : ''}" data-faction="empire">${ART.portrait('reinhard', 'faction-portrait')}<span class="label gold">The golden lion</span><h3>Galactic Empire</h3><p>Reinhard, Mittermeyer, Reuenthal, and Kircheis. Decisive offensives and rapid breakthroughs.</p><span class="select-mark">${setup.side === 'empire' ? '✓ Command selected' : 'Select the Empire'}</span></button><button class="faction alliance ${setup.side === 'alliance' ? 'active' : ''}" data-faction="alliance">${ART.portrait('yang', 'faction-portrait')}<span class="label cyan">The magician’s fleet</span><h3>Free Planets Alliance</h3><p>Yang, Attenborough, Fischer, and Schönkopf. Counterattacks, maneuver, and boarding operations.</p><span class="select-mark">${setup.side === 'alliance' ? '✓ Command selected' : 'Select the Alliance'}</span></button></div><div class="setup-row"><div><label for="mode-select">Operation</label><select class="select" id="mode-select">${modeOptions()}</select>${modeNote()}</div><div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(
    E.DIFFICULTIES,
  )
    .map(
      ([k, d]) =>
        `<option value="${k}" ${setup.difficulty === k ? 'selected' : ''}>${d.name}${d.tokens > 1 ? ` · ×${d.tokens} tokens` : ''}</option>`,
    )
    .join(
      '',
    )}</select><p class="mode-note">${E.DIFFICULTIES[setup.difficulty]?.desc || ''}</p></div><div class="hq-summary"><span class="label">Command HQ</span><b>${ICONS.use('token', 'cost-ico')} ${loadProfile().tokens || 0} tokens</b><small>${loadProfile().wins || 0} victories · ${Object.values(loadProfile().research || {}).reduce((a, l) => a + l, 0)} research levels</small><button class="small" data-action="research">HQ research</button></div></div><div class="badge-row"><span class="badge">13 fleet classes</span><span class="badge">8 admirals with naval ranks</span><span class="badge">${Object.keys(E.TECH_NODES).length} HQ technologies</span><span class="badge">1–3-stack fleets</span></div><div class="dialog-footer"><div><button class="primary" data-action="start">Launch operation</button>${saved ? '<button data-action="continue">Continue saved game</button>' : ''}<button class="ghost" data-action="help">Field manual</button></div><small>Unofficial fan game. Alternate-history scenarios.<br>Saved in this browser. A new operation replaces your hex-campaign save.</small></div></section></div>`;
  focusDialog();
}
function bestStars() {
  try {
    return JSON.parse(localStorage.getItem('galactic-command-stars')) || {};
  } catch (e) {
    return {};
  }
}
// Best stars and first-victory rewards are tracked per operation and difficulty; Normal keeps the plain key.
function starKey(mode, difficulty) {
  return difficulty && difficulty !== 'normal' ? `${mode}:${difficulty}` : mode;
}
function starText(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}
function modeOptions() {
  const best = bestStars(),
    cleared = loadProfile().cleared || {},
    open = key => (cleared[`${key}:${setup.difficulty}`] ? '' : ' · ◆ reward'),
    sel = v => (setup.mode === v || (v === 'conquest:frontier' && setup.mode === 'conquest') ? 'selected' : '');
  const eras = Object.entries(E.ERAS)
    .map(
      ([k, e]) =>
        `<option value="conquest:${k}" ${sel('conquest:' + k)}>${e.name} · ${e.year}${open('conquest:' + k)}</option>`,
    )
    .join('');
  const scens = Object.entries(E.SCENARIOS)
    .map(
      ([k, sc]) =>
        `<option value="${k}" ${sel(k)}>${sc.name} · ${sc.objective.turns} turns${best[starKey(k, setup.difficulty)] ? ' · ' + starText(best[starKey(k, setup.difficulty)]) : ''}${open(k)}</option>`,
    )
    .join('');
  return `<optgroup label="Conquest · 17 × 11 galaxy">${eras}</optgroup><optgroup label="Scenarios">${scens}</optgroup>`;
}
function modeNote() {
  const sc = E.SCENARIOS[setup.mode],
    era = E.ERAS[String(setup.mode).split(':')[1] || (setup.mode === 'conquest' ? 'frontier' : '')];
  const text = sc ? `${sc.desc}${sc.side ? ` Played as the ${E.FACTIONS[sc.side].name}.` : ''}` : era ? era.desc : '';
  return text ? `<p class="mode-note">${text}</p>` : '';
}
function render() {
  const mapFocused = !!canvas && document.activeElement === canvas;
  document.documentElement.style.setProperty('--own', E.FACTIONS[game.player].color);
  const e = game.economy[game.player],
    inc = E.income(game, game.player),
    stations = game.stations.filter(s => s.owner === game.player).length;
  app.innerHTML = `<header class="topbar"><div class="brand"><span class="mark" aria-hidden="true">⬡</span><div><h1>Galactic Command</h1><small>LEGEND OF THE GALACTIC HEROES</small></div></div><div class="resources">${resource('credits', 'Credits', 'Credits', e.credits, inc.credits)}${resource('industry', 'Industry', 'Alloy · Shipyard Industry', e.industry, inc.industry)}${resource('research', 'Research', 'Data Chips · Research. Banked research becomes command tokens when you win (5 research = 1 token)', e.science, inc.science)}${resource('token', 'Tokens', 'Command tokens · spent on HQ research, earned by winning operations', loadProfile().tokens || 0)}<div class="resource"><span class="label">Stations</span><b>${stations} <small>/ ${game.stations.length}</small></b></div></div><nav class="top-actions" aria-label="Command menus"><button class="small" data-action="research">Research</button><button class="small" data-action="admirals" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Admirals</button><button class="small ghost" data-action="archive">Units</button><button class="small ghost sound-toggle" data-action="sound" aria-pressed="${SFX.enabled}" aria-label="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}" title="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}">${SFX.enabled ? '🔊' : '🔇'}</button><button class="small ghost" data-action="help" aria-label="Field manual">?</button><button class="small ghost" data-action="menu" ${game.phase !== game.player ? 'disabled' : ''}>Menu</button></nav></header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label" style="color:${E.FACTIONS[game.phase].color}">Turn ${String(game.turn).padStart(2, '0')} · ${E.FACTIONS[game.phase].short} phase</span><h2>${E.modeTitle(game)}</h2></div><p class="objective">${E.objectiveText(game)}${game.objective && game.mode !== 'conquest' ? ` <b>Turn ${game.turn} / ${game.objective.turns}</b>` : ''}</p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="Hex battlefield. Select your fleet using the fleet selector or N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green hex or attacks a red hex. Z undoes the last move. Drag to pan; plus and minus zoom."></canvas><div class="map-banner" id="map-banner">${game.phase !== game.player ? 'Enemy fleets are maneuvering…' : 'Select a fleet to reveal its movement and firing range.'}</div><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit">Fit</button><button data-action="zoom-in" aria-label="Zoom in">+</button></div><div class="map-legend"><span style="color:var(--gold)"><i class="legend-dot"></i>Empire</span><span style="color:var(--cyan)"><i class="legend-dot"></i>Alliance</span><span style="color:#b8a9cf"><i class="legend-dot"></i>Nebula</span><span>◇ Station</span><span>× Gravity rift</span></div></div><div class="map-caption"><span id="map-caption">Green hex: move · Red hex: attack · Undo takes back a move before firing</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next fleet</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="turn-status" id="turn-status"></div><div class="footer-actions"><button class="small" data-action="details">Fleet orders</button><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved fleet to where it started (Z)' : 'No move to undo')}">↶ Undo move <span class="kbd">Z</span></button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next fleet <span class="kbd">N</span></button><button class="primary end" data-action="end" ${!interactive() ? 'disabled' : ''}>${game.phase === game.player ? 'End turn' : 'Enemy turn…'}</button></div></footer>`;
  canvas = $('map');
  ctx = canvas.getContext('2d');
  attachMap();
  updateSelection();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Why the player cannot act right now (enemy phase or finished operation).
function phaseReason() {
  return game.over ? 'Operation over' : game.phase !== game.player ? 'Enemy turn' : null;
}
// A button that explains itself: when the order is unavailable its reason replaces the cost line.
// A lack of funds is shown by the cost itself, with the missing resources in red.
const isShortfall = why => /^Need \d+ more /.test(why || '');
// showWhy = false keeps a blocked button plain: disabled, with the reason only on hover.
function act(attrs, label, why, detail = '', cls = '', showWhy = true) {
  const note =
    why && showWhy && !isShortfall(why)
      ? `<small class="why">${esc(why)}</small>`
      : detail && (showWhy || !why)
        ? `<small>${detail}</small>`
        : '';
  return `<button class="${cls}${why ? ' blocked' : ''}" ${attrs} ${why ? `disabled${isShortfall(why) ? '' : ` title="${esc(why)}"`}` : ''}>${label}${note}</button>`;
}
function fireStatus(u) {
  if (u.attacked) return 'Already fired';
  if (u.morale <= -3) return 'Confused · cannot act';
  if (u.side === game.player && !E.targets(game, u).length) return 'No target in range';
  return 'Fire ready';
}
function rangeText(u) {
  const r = E.rangeOf(game, u);
  return r.min === r.max ? r.max : r.min + '–' + r.max;
}
function resource(icon, label, title, value, perTurn) {
  const rate = perTurn == null ? '' : ` · +${perTurn}/turn`;
  return `<div class="resource" title="${title}${rate}">${ICONS.use(icon, 'res-icon')}<span class="label">${label}</span><b>${count(value)} ${perTurn == null ? '' : `<small>+${perTurn}/turn</small>`}</b></div>`;
}
// Costs render as WC4 resource tokens; zero amounts are omitted unless all is set.
// Prices (not balances, which pass all) turn red for each resource the player cannot cover.
function costHTML(c, all = false) {
  const have = game?.economy?.[game.player] || {},
    parts = [
      ['credits', c.credits, 'credits'],
      ['industry', c.industry, 'industry'],
      ['research', c.science, 'science'],
    ].filter(([, v]) => v != null && (all || v > 0));
  return `<span class="cost-line">${parts.map(([k, v, f]) => `<span class="cost-item${!all && v > (have[f] || 0) ? ' short' : ''}">${ICONS.use(k, 'cost-ico')}${count(v)}</span>`).join('')}</span>`;
}
function statRow(u, t) {
  const range = rangeText(u);
  return `<span class="stat" title="Attack">${ICONS.use('atk')}${Math.round(t.attack * (1 + 0.45 * (u.stack - 1)))}</span><span class="stat" title="Armor">${ICONS.use('def')}${t.armor}</span><span class="stat" title="Movement">${ICONS.use('mov')}${E.movement(game, u)}</span><span class="stat" title="Range">${ICONS.use('rng')}${range}</span>`;
}
function updateSelection() {
  const u = selectedUnit();
  readyCache = u && u.side === game.player ? E.reachable(game, u) : new Map();
  const st = selectedStation();
  targetCache = new Set(
    u && u.side === game.player && !u.attacked && u.morale > -3
      ? E.targets(game, u).map(E.key)
      : st && st.owner === game.player && interactive()
        ? E.fortressTargets(game, st).map(E.key)
        : [],
  );
  $('side').innerHTML =
    '<button class="drawer-close small" data-action="details" aria-label="Close fleet orders">×</button>' + panel();
  $('side').classList.toggle('open', detailOpen);
  $('selection-dock').innerHTML = dockHTML();
  const ready = ownUnits().filter(u => !u.attacked && u.morale > -3).length;
  $('turn-status').innerHTML = game.over
    ? 'Operation concluded'
    : `${ready} fleets ready <small>${E.FACTIONS[game.player].short} · ${E.DIFFICULTIES[game.difficulty]?.name || 'Normal'} · ${saveOk ? 'autosaved' : 'not saved'}</small>`;
  $('map-banner').textContent =
    game.phase !== game.player
      ? 'Enemy fleets are maneuvering…'
      : game.over
        ? 'Operation concluded'
        : u?.side === game.player
          ? `${u.admiral ? E.ADMIRALS[u.admiral].short + ' · ' : ''}${E.TYPES[u.type].short} ×${u.stack}${u.morale <= -3 ? ' · In confusion' : u.attacked ? ' · Orders complete' : ''}`
          : selectedStation()
            ? `${selectedStation().name} · ${selectedStation().owner === game.player ? 'Select Shipyard to build fleets' : 'Breach shields before capture'}`
            : 'Select a fleet to reveal movement and firing range.';
}
function moraleName(n) {
  return n >= 1
    ? 'High (+25%)'
    : n === 0
      ? 'Steady'
      : n === -1
        ? 'Low (−25%)'
        : n === -2
          ? 'Diminished (−50%)'
          : 'Confused';
}
function panel() {
  const u = selectedUnit(),
    s = selectedStation();
  const fleetPicker = `<label class="label" for="fleet-select">Your fleets</label><select class="select unit-select" id="fleet-select"><option value="">Select a fleet…</option>${ownUnits()
    .map(
      v =>
        `<option value="${v.id}" ${u?.id === v.id ? 'selected' : ''}>${v.admiral ? E.ADMIRALS[v.admiral].short + ' · ' : ''}${E.TYPES[v.type].short} ×${v.stack} [${v.c},${v.r}]${v.attacked ? ' · spent' : ''}</option>`,
    )
    .join('')}</select>`;
  let main = '';
  if (u) {
    const t = E.TYPES[u.type],
      ours = u.side === game.player,
      st = E.stationAt(game, u),
      a = E.ADMIRALS[u.admiral];
    main = `<section>${fleetPicker}<div class="side-title"><span class="label">${t.branch}</span><span class="chip" style="color:${E.FACTIONS[u.side].color}">${E.FACTIONS[u.side].short}</span></div>${ART.ship(u.type, 'panel-ship', artSide(u))}<h2 class="unit-name">${a && u.type === 'flagship' ? a.hull : t.name}</h2><p class="description">${a && u.type === 'flagship' ? t.name + ' · ' : ''}${t.desc}</p><div class="hp-row">${ICONS.hp(u.hp, E.maxHP(u), 'hp-ring-lg')}<span>Hull integrity</span><span class="mono">${Math.ceil(u.hp)} / ${E.maxHP(u)}</span></div><div class="stat-grid"><div><span class="label">${ICONS.use('atk')} Attack</span><b>${Math.round(t.attack * (1 + 0.45 * (u.stack - 1)))}</b></div><div><span class="label">${ICONS.use('def')} Armor</span><b>${t.armor}</b></div><div><span class="label">${ICONS.use('mov')} Move</span><b>${E.movement(game, u)}</b></div><div><span class="label">${ICONS.use('rng')} Range</span><b>${rangeText(u)}</b></div><div><span class="label">Stack</span><b>${u.stack}/${t.elite ? 1 : 3}</b></div><div><span class="label">Veteran</span><b>${u.xp}/5</b></div></div><div class="status-line"><span class="status ${u.moved ? 'spent' : 'ready'}">${u.moved ? 'Moved' : 'Move ready'}</span><span class="status ${fireStatus(u) === 'Fire ready' ? 'ready' : 'spent'}">${fireStatus(u)}</span><span class="status">${moraleName(u.morale)}</span></div>${a ? admiralCard(u.admiral) : ''}${ours ? `<div class="actions">${!a ? act('data-action="assign"', 'Assign admiral', phaseReason(), 'Choose an officer') : ''}${a?.trait === 'magician' ? act('data-action="confuse"', 'Confusion', phaseReason() || E.confuseReason(game, u), '−2 morale · 2 hex radius', '', false) : ''}${act('data-action="reinforce"', 'Add a stack', phaseReason() || E.reinforceReason(game, u), costHTML(E.reinforceCost(u.type)))}${act('data-action="repair"', 'Repair fleet', phaseReason() || E.repairReason(game, u), '+35% HP · ' + costHTML({ credits: E.repairCost(u) }))}${act('data-action="wait"', 'Hold position', phaseReason() || (u.attacked ? 'Already fired' : null), 'Finish this fleet’s turn')}</div><p class="description" style="font-size:11px">Repair and stacking require a friendly station within 1 hex and consume this fleet’s turn.</p>` : ''}${st ? `<div class="section-divider"><span class="label">Station beneath fleet</span><div class="station-buttons"><button data-station="${st.id}">${st.name} · Tier ${st.tier}</button>${st.owner === game.player ? `<button data-shop="${st.id}" ${!interactive() ? 'disabled' : ''}>Shipyard</button>` : ''}</div></div>` : ''}</section>`;
  } else if (s) {
    const ours = s.owner === game.player;
    main = `<section>${fleetPicker}<div class="side-title"><span class="label">${s.capital ? 'Capital' : s.fort ? 'Orbital fortress' : 'Sector hub'}</span><span class="chip" style="color:${E.FACTIONS[s.owner].color}">${E.FACTIONS[s.owner].short}</span></div>${ART.ship(s.capital ? 'capital' : s.fort ? 'fortress' : 'station', 'panel-ship')}<h2 class="unit-name">${s.name}</h2><p class="description">${s.fort ? 'Fortress defenses protect this strategic corridor.' : s.capital ? 'The seat of government and a major industrial center.' : 'Capture and hold this station to fund your fleets.'}</p><div class="hp-row"><span>Station defenses</span><span class="mono">${Math.ceil(s.shield)} / ${s.maxShield}</span></div><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%;background:${E.FACTIONS[s.owner].color}"></i></div><div class="stat-grid"><div><span class="label">${ICONS.use('credits')} Credits</span><b>+${s.income}</b></div><div><span class="label">${ICONS.use('industry')} Industry</span><b>+${s.industry}</b></div><div><span class="label">${ICONS.use('research')} Research</span><b>+${s.science}</b></div></div>${fortressPanel(s)}<div class="buildings">${Object.entries(
      E.BUILDINGS,
    )
      .map(([k, b]) => {
        const l = E.buildingLevel(s, k);
        return `<div class="building"><span class="label">${ICONS.use(k === 'shipyard' ? 'industry' : k === 'lab' ? 'research' : 'airbase')} ${b.name}</span><span class="level">${'▮'.repeat(l)}${'▯'.repeat(3 - l)}</span><small>${b.desc}</small>${ours ? act(`data-build="${k}" data-station-id="${s.id}"`, l >= 3 ? 'Maximum level' : (l ? 'Upgrade to level ' : 'Build level ') + (l + 1), l >= 3 ? null : phaseReason() || E.buildReason(game, s, k), costHTML(E.buildCost(s, k)), 'small') : ''}</div>`;
      })
      .join(
        '',
      )}</div>${ours ? `<div class="actions">${act(`data-shop="${s.id}"`, 'Open shipyard', shipyardReason(s), 'Build a fleet', 'primary')}</div><p class="description">One fleet per station per turn. New fleets act next turn. Garrisons repair 8% hull here each turn.</p>` : '<p class="description">Reduce defenses to zero and eliminate any garrison, then enter with an Escort or Battle Line unit to capture. Artillery cannot capture stations.</p>'}</section>`;
  } else {
    main = `<section>${fleetPicker}<div class="empty-panel"><span class="eyebrow">Command the frontier</span><h3>Position.<br>Concentrate.<br>Break through.</h3><p class="description">Select a fleet to see its movement and attack range. Select a station to build new ships.</p><div class="info-strip">Green hexes move, red hexes attack with one click. Undo takes back a move until the fleet fires. A Battle Line kill can refresh both actions.</div><button data-action="next">Select a ready fleet</button></div></section>`;
  }
  const selectedTile =
    selection?.kind === 'tile'
      ? E.tile(game, selection.c, selection.r)
      : u
        ? E.tile(game, u.c, u.r)
        : s
          ? E.tile(game, s.c, s.r)
          : null;
  // A selected fleet or station gets the whole panel; hex details, the directory and dispatches show otherwise.
  if (u || s) return main;
  return (
    main +
    `<section class="section-divider"><span class="label">${selectedTile ? 'Hex ' + selectedTile.c + ', ' + selectedTile.r : 'Theater intelligence'}</span><p class="description">${selectedTile ? terrainDescription(selectedTile) : 'Iserlohn, Vermilion, and Fezzan form three crossings through the gravity rifts.'}</p><label class="label" for="station-select">Station directory</label><select class="select unit-select" id="station-select"><option value="">Inspect station…</option>${game.stations.map(s => `<option value="${s.id}">${s.name} · ${E.FACTIONS[s.owner].short}</option>`).join('')}</select></section><section class="section-divider dispatches"><span class="label">Command dispatches</span>${game.log
      .slice(0, 4)
      .map(l => `<p class="dispatch"><b>T${l.turn}</b> ${esc(l.text)}</p>`)
      .join('')}</section>`
  );
}
function shipyardReason(s) {
  return (
    phaseReason() ||
    (s.producedTurn === game.turn ? 'Already built here this turn' : null) ||
    (!E.recruitOptions(game, s, game.player).length ? 'No free hex next to the station' : null)
  );
}
function fortressPanel(s) {
  if (!s.fort) return '';
  const ours = s.owner === game.player,
    ready = E.fortressReady(game, s),
    status =
      s.shield <= 0
        ? 'Offline: shields down'
        : (s.gunReady || 0) > game.turn
          ? `Recharging · ready on turn ${s.gunReady}`
          : ours
            ? 'Ready to fire'
            : 'Charged';
  return `<div class="target-box fortress-gun"><span class="label">Fortress main gun</span><h3>${E.fortressName(s)}</h3><p>Range ${E.FORTRESS_GUN.range} · ${Math.round(E.FORTRESS_GUN.share * 100)}% of the target's hull · recharges for ${E.fortressRecharge(game, s)} turn${E.fortressRecharge(game, s) > 1 ? 's' : ''}. Silenced while shields are down.</p><p><b>${status}</b>${ours && ready && interactive() ? (targetCache.size ? ' — click a red hex to fire.' : ' — no enemy fleet in range.') : ''}</p></div>`;
}
function terrainDescription(t) {
  return t.terrain === 'nebula'
    ? 'Nebula · Movement cost 2. Fleets lose 2.5% maximum HP at the start of their turn. Yang ignores the movement penalty.'
    : t.terrain === 'asteroid'
      ? 'Asteroid field · Movement cost 2. Incoming damage reduced by 15%. Yang ignores the movement penalty.'
      : t.terrain === 'rift'
        ? 'Gravity rift · Impassable. Reach the central crossings to pass between territories.'
        : 'Deep space · Movement cost 1. No terrain defense or attrition.';
}
function selectUnit(id, center = false) {
  const u = game.units.find(v => v.id === id && v.hp > 0);
  if (!u) return;
  selection = { kind: 'unit', id };
  updateSelection();
  if (center) centerOn(u);
}
function selectStation(id, center = false) {
  const s = game.stations.find(v => v.id === id);
  if (!s) return;
  selection = { kind: 'station', id };
  updateSelection();
  if (center) centerOn(s);
}
function nextFleet() {
  const ready = ownUnits().filter(u => !u.attacked && u.morale > -3);
  if (!ready.length) {
    toast('All fleets have completed their orders. End the turn to continue.');
    return;
  }
  const i = ready.findIndex(u => u.id === selection?.id);
  selectUnit(ready[(i + 1) % ready.length].id, true);
}
function refreshAndSave(keepUndo = false) {
  if (!keepUndo) undoStack = [];
  render();
  save();
  if (game.over) resultDialog();
}
function doAction(fn) {
  if (!interactive()) return;
  const before = unitSnapshot(),
    result = fn();
  if (!result?.ok) {
    toast(result?.reason || 'Order unavailable.');
    return;
  }
  moralePopups(before);
  refreshAndSave();
}
function attackHex(p) {
  const u = selectedUnit();
  if (!u || !p || !interactive()) return;
  const before = unitSnapshot(),
    result = E.attack(game, u.id, p.c, p.r);
  if (!result.ok) {
    toast(result.reason);
    return;
  }
  addCombatEffects(result, u);
  moralePopups(before);
  refreshAndSave();
  if (result.breakthrough) toast('Breakthrough! This fleet can move and attack again.');
}
// WC4-style undo: a fleet that moved but has not fired returns to where it started.
function undoMove() {
  if (!interactive() || !undoStack.length) return;
  const { snapshot, unitId } = undoStack.pop();
  game = JSON.parse(snapshot);
  effects = effects.filter(e => e.kind !== 'move');
  selection = { kind: 'unit', id: unitId };
  render();
  save();
  toast('Move undone.');
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = ms => new Promise(resolve => setTimeout(resolve, reducedMotion() ? 15 : ms));
async function endTurn(force = false) {
  if (!interactive()) return;
  const ready = ownUnits().filter(u => !u.attacked && u.morale > -3).length;
  if (ready && !force) {
    modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="End turn"><div class="eyebrow">Review orders</div><h2>${ready} fleets still have orders.</h2><p>You can end the turn now and leave them holding position, or return to issue their orders.</p><div class="dialog-footer"><button data-action="close">Return to the map</button><button class="primary" data-action="end-confirm">End turn</button></div></section></div>`;
    focusDialog();
    return;
  }
  closeModal();
  undoStack = [];
  save();
  const token = ++aiToken;
  const enemy = E.opponent(game.player);
  let before = unitSnapshot();
  E.beginTurn(game, enemy, game.turn > 1);
  turnStartPopups(before, enemy);
  E.aiProduction(game);
  (game.strikes || []).forEach((s, i) => strikeEffects(s, i * 0.5));
  render();
  if (game.strikes?.length) await pause(1100);
  const ids = game.units.filter(u => u.hp > 0 && u.side === enemy && !u.attacked).map(u => u.id);
  for (const id of ids) {
    if (token !== aiToken || game.over) break;
    const u = game.units.find(u => u.id === id);
    if (!u) continue;
    before = unitSnapshot();
    const orders = E.aiOrder(game, id);
    moralePopups(before);
    for (const o of orders) {
      if (o.kind === 'attack') addCombatEffects(o, u);
      else
        effects.push({
          kind: 'move',
          unitId: id,
          from: o.from,
          to: o.to,
          color: E.FACTIONS[enemy].color,
          life: 0.5,
          max: 0.5,
        });
    }
    if (orders.length) {
      updateSelection();
      await pause(orders.some(o => o.kind === 'attack') ? 420 : 150);
    }
  }
  if (token !== aiToken) return;
  game.turn++;
  before = unitSnapshot();
  E.beginTurn(game, game.player, true);
  turnStartPopups(before, game.player);
  render();
  save();
  if (game.over) resultDialog();
  else toast(`Turn ${game.turn}. Income collected; fleet orders refreshed.`);
}
// A won operation pays command tokens into the profile exactly once.
function claimReward() {
  if (game.over?.winner !== game.player || game.reward) return;
  const p = E.exportProfile(game, loadProfile()),
    r = E.missionReward(game, p.wins || 0, p.cleared || {});
  if (!r.repeat) {
    p.tokens = (p.tokens || 0) + r.total;
    p.wins = (p.wins || 0) + 1;
    (p.cleared ||= {})[E.operationKey(game)] = true;
  }
  game.reward = r;
  undoStack = [];
  saveProfile(p);
  try {
    localStorage.setItem('galactic-command-hex-v2', JSON.stringify(game));
  } catch (e) {}
}
function resultDialog() {
  claimReward();
  const win = game.over.winner === game.player;
  if (win && game.mode !== 'conquest' && game.over.stars) {
    const best = bestStars(),
      key = starKey(game.mode, game.difficulty);
    if ((best[key] || 0) < game.over.stars) {
      best[key] = game.over.stars;
      try {
        localStorage.setItem('galactic-command-stars', JSON.stringify(best));
      } catch (e) {}
    }
  }
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Operation result"><div class="eyebrow">${win ? 'Operation successful' : game.over.winner === 'draw' ? 'Armistice' : 'Operation ended'}</div><h2>${win ? 'The galaxy remembers.' : game.over.winner === 'draw' ? 'A fragile peace.' : 'The fleet’s last order.'}</h2>${game.mode !== 'conquest' ? `<div class="star-rating" aria-label="${win ? game.over.stars : 0} of 3 stars">${starText(win ? game.over.stars || 1 : 0)}</div>` : ''}<p>${game.over.reason}</p>${(game.medalsEarned || []).length ? `<div class="medal-case"><span class="label">Medals earned</span>${game.medalsEarned.map(m => `<span class="medal-chip" title="${esc(m.reason)}">🎖 ${E.MEDALS[m.id].name}</span>`).join('')}</div>` : ''}${game.reward ? (game.reward.repeat ? `<div class="reward"><span class="label">No command tokens</span><small>Tokens are paid only for the first victory in each operation at each difficulty. Try ${game.difficulty === 'challenge' ? 'another operation' : 'a harder difficulty'} for more.</small></div>` : `<div class="reward"><span class="label">Command tokens earned</span><b>${ICONS.use('token', 'cost-ico')} +${game.reward.total}</b><small>${game.reward.parts.map(([k, v]) => (v ? `${k} +${v}` : k)).join(' · ')}</small></div>`) : ''}<p class="description">Officer ranks, stars and medals are saved for your next operation. Spend command tokens on HQ research, promotions and admiral stars.</p><div class="result-numbers"><div><b>${game.turn}</b><small>Turns elapsed</small></div><div><b>${game.stations.filter(s => s.owner === game.player).length}</b><small>Stations held</small></div><div><b>${ownUnits().length}</b><small>Fleets remaining</small></div></div><div class="dialog-footer"><button data-action="close">Inspect battlefield</button><button data-action="research">HQ research</button><button class="primary" data-action="new">New operation</button></div></section></div>`;
  focusDialog();
}
function openShop(id, branch = shop.branch) {
  const s = game.stations.find(s => s.id === id);
  if (!s || s.owner !== game.player || !interactive()) return;
  shop.station = id;
  shop.branch = branch;
  const free = E.recruitOptions(game, s, game.player);
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Shipyard"><div class="dialog-head"><div><div class="eyebrow">${E.FACTIONS[s.owner].name} · ${s.name} · Shipyard tier ${s.tier}</div><h2>Commission a fleet</h2><p>${costHTML({ credits: game.economy[game.player].credits, industry: game.economy[game.player].industry }, true)}</p></div><button class="small close" data-action="close">Close</button></div><div class="toolbar-row"><div class="tabs">${['Escort', 'Battle Line', 'Artillery', 'Air'].map(b => `<button data-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div><label for="stack-select">Fleet strength &nbsp;</label><select class="select" id="stack-select">${[1, 2, 3].map(n => `<option value="${n}" ${shop.stack === n ? 'selected' : ''}>${n} ${n === 1 ? 'stack' : 'stacks'}</option>`).join('')}</select></div></div>${s.producedTurn === game.turn ? '<div class="info-strip">This shipyard has completed production for this turn.</div>' : !free.length ? '<div class="info-strip">No free deployment hex. Move friendly fleets away from the station.</div>' : '<p class="description">One fleet per station per turn. Deployment uses the station hex, or a free adjacent hex. New fleets act next turn.</p>'}<div class="cards">${Object.entries(
    E.TYPES,
  )
    .filter(([k, t]) => t.branch === branch)
    .map(([k, t]) => {
      const n = t.elite ? 1 : shop.stack,
        p = E.price(k, n, game, game.player),
        can = E.canBuy(game, s, k, n);
      return `<article class="unit-card ${(t.air ? s.air || 0 : s.tier) < t.tier ? 'locked' : ''}">${ART.ship(k, 'catalog-ship', s.owner)}<span class="unit-code">${t.code} · Tier ${t.tier} · ×${n}</span><h3>${t.name}</h3>${t.weapon ? `<span class="weapon-focus">${t.weapon}</span>` : ''}<p>${t.desc}</p><div class="unit-spec"><span>HP ${Math.round(t.hp * (1 + 0.7 * (n - 1)))}</span><span>${ICONS.use('atk')}${Math.round(t.attack * (1 + 0.45 * (n - 1)))}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span><span>${ICONS.use('rng')}${rangeText({ type: k, side: game.player })}</span></div><div class="cost">${costHTML(p)}</div>${act(`data-recruit="${k}"`, t.elite ? 'Commission fleet · 1 stack' : 'Commission fleet', can ? null : E.buyReason(game, s, k, n))}</article>`;
    })
    .join('')}</div></section></div>`;
  focusDialog();
}
let researchBranch = 'escort',
  researchBack = 'game';
function tokenCost(n, have) {
  return `<span class="cost-line"><span class="cost-item${n > have ? ' short' : ''}">${ICONS.use('token', 'cost-ico')}${count(n)}</span></span>`;
}
// HQ research: command tokens from victories buy permanent technology kept across every operation.
function researchDialog(branch = researchBranch) {
  researchBranch = branch;
  const p = loadProfile(),
    research = p.research || {},
    tokens = p.tokens || 0,
    wins = p.wins || 0,
    tree = E.TECH_TREE[branch];
  const tiers = [1, 2, 3, 4]
    .map(
      t =>
        `<span class="tier ${wins >= E.TECH_TIERS[t] ? 'open' : ''}">Tier ${E.ROMAN[t]} · ${E.TECH_TIERS[t] ? (wins >= E.TECH_TIERS[t] ? 'unlocked' : `${E.TECH_TIERS[t]} victories`) : 'open'}</span>`,
    )
    .join('');
  const cards = Object.keys(tree.nodes)
    .map(k => {
      const id = `${branch}.${k}`,
        n = E.TECH_NODES[id],
        l = research[id] || 0,
        done = l >= n.max,
        req = n.req ? E.TECH_NODES[`${branch}.${n.req[0]}`] : null;
      return `<section class="tech-card hq"><span class="label">${tree.name} · Level ${l} / ${n.max}</span><h3>${n.name}</h3><ol class="doctrine">${n.values.map((v, i) => `<li class="${i < l ? 'unlocked' : ''}"><b>${E.ROMAN[i + 1]}</b> ${n.text(v)} <small>Tier ${E.ROMAN[n.tiers[i]]}</small></li>`).join('')}</ol>${req ? `<small class="req">Requires ${req.name} ${E.ROMAN[n.req[1]]}</small>` : ''}<div class="tech-levels">${n.values.map((_, i) => `<i class="${i < l ? 'unlocked' : ''}"></i>`).join('')}</div>${act(`data-research="${id}"`, done ? 'Fully researched' : `Research ${E.ROMAN[l + 1]}`, done ? 'Fully researched' : E.researchReason(p, id), done ? '' : tokenCost(E.researchCost(id, l), tokens), '', !done)}</section>`;
    })
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="HQ research"><div class="dialog-head"><div><div class="eyebrow">Command HQ · kept across every operation and side</div><h2>HQ research</h2><p class="hq-balance">${ICONS.use('token', 'cost-ico')} <b>${count(tokens)}</b> command tokens · ${wins} ${wins === 1 ? 'victory' : 'victories'}</p></div><button class="small close" data-action="research-close">Close</button></div>${tokens || Object.keys(research).length ? '' : `<div class="info-strip">Command tokens are earned by the first victory in each operation at each difficulty: ${E.TOKEN_REWARD.victory} per victory, plus ${E.TOKEN_REWARD.star} per star (or ${E.TOKEN_REWARD.conquest} for a Conquest) and 1 per ${E.TOKEN_REWARD.research} research banked, ×1.5 on Hard and ×2 on Challenge, and ${E.TOKEN_REWARD.first} more for your first win ever.</div>`}<div class="tier-row">${tiers}</div><div class="tabs">${Object.entries(
    E.TECH_TREE,
  )
    .map(([k, b]) => `<button data-research-branch="${k}" class="${k === branch ? 'active' : ''}">${b.name}</button>`)
    .join('')}</div><p class="description">${tree.desc}</p><div class="tech-grid">${cards}</div></section></div>`;
  focusDialog();
}
function ratingStars(n) {
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, E.MAX_RATING - n));
}
// A clickable portrait: opens the WC4-style General Info card for that admiral.
function generalPortrait(k, cls = '') {
  return ART.portrait(k, cls).replace(
    '<span ',
    `<span data-general="${k}" role="button" tabindex="0" title="${esc(E.ADMIRALS[k].name)}: general info" `,
  );
}
const BRANCH_ICONS = { escort: 'destroyer', line: 'battleship', artillery: 'siege', air: 'fighter' };
// A token-priced button. When unavailable it stays hoverable (aria-disabled) so the reason shows as a tooltip.
function tokenButton(attrs, cost, why, label = '', cls = '') {
  const have = loadProfile().tokens || 0;
  return `<button class="small token-buy ${cls}${why ? ' blocked' : ''}" ${attrs} ${why ? `aria-disabled="true" title="${esc(why)}"` : ''}>${label}${tokenCost(cost, have)}</button>`;
}
// General Info: portrait, naval rank and hull bonus on the left; branch stars and the signature ability on the right.
function generalDialog(k) {
  const a = E.ADMIRALS[k],
    o = E.officer(game, k),
    own = a.side === game.player,
    profile = loadProfile(),
    fleet = game.units.find(u => u.hp > 0 && u.admiral === k),
    top = o.rank >= E.RANKS.length - 1,
    stars = n => Array.from({ length: E.MAX_RATING }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  generalOpen = k;
  const ratings = Object.entries(E.BRANCH_NAMES)
    .map(
      ([b, name]) =>
        `<div class="gi-rating" title="${name}: ${o.ratings[b]} of ${E.MAX_RATING} stars. Each star above 3 adds 4% damage and cuts damage taken 3% in this branch."><span class="gi-badge">${ART.ship(BRANCH_ICONS[b], '', a.side)}</span><span class="gi-rating-info"><span class="gi-name">${name}</span><span class="gi-stars">${stars(o.ratings[b])}</span></span>${own && o.ratings[b] < E.MAX_RATING ? tokenButton(`data-buy-star="${b}" data-officer="${k}" aria-label="Buy a ${name} star"`, E.starCost(game, k, b), E.starReason(game, profile, k, b)) : ''}</div>`,
    )
    .join('');
  modal.innerHTML = `<div class="overlay"><section class="dialog wide general-info ${a.side}" role="dialog" aria-modal="true" aria-label="General info"><div class="gi-head"><button class="small close" data-action="general-close" aria-label="Close">✕</button><h2>General Info</h2></div><div class="gi-body"><div class="gi-left"><div class="gi-nameplate"><span class="gi-stars-top">${'★'.repeat(a.stars)}</span><b>${a.name}</b></div><div class="gi-portrait">${ART.portrait(k, 'gi-portrait-art')}</div><div class="gi-rank"><div class="gi-rank-line"><span class="gi-insignia">⚓</span><span>${E.RANKS[o.rank]}</span></div><div class="gi-rank-line"><span class="gi-heart">❤</span><span>${Math.round(E.RANK_HP[o.rank] * 100)}% fleet hull</span></div></div></div><div class="gi-right"><div class="gi-ratings">${ratings}</div><div class="gi-ability"><span class="label">${a.skill}</span><p>${a.desc}</p><small>${a.role} specialist${fleet ? ` · Commanding ${E.TYPES[fleet.type].short} ×${fleet.stack}` : ''}${game.missionKills?.[k] ? ` · ${game.missionKills[k]} kills this operation` : ''}</small></div><div class="gi-ladder"><span class="label">Naval rank · ${o.rank + 1} of ${E.RANKS.length}</span><div class="gi-pips">${E.RANKS.map((r, i) => `<i class="${i < o.rank ? 'done' : i === o.rank ? 'now' : ''}" title="${r} · ${Math.round(E.RANK_HP[i] * 100)}% fleet hull${i ? ` · ${E.PROMOTE_COST[i]} tokens` : ''}"></i>`).join('')}</div></div>${own && !top ? `<div class="gi-promote-row"><div><span class="label">Next rank</span><b>${E.RANKS[o.rank + 1]}</b><small>Fleet hull ${Math.round(E.RANK_HP[o.rank] * 100)}% → ${Math.round(E.RANK_HP[o.rank + 1] * 100)}%</small></div>${tokenButton(`data-promote="${k}"`, E.promoteCost(o), E.promoteReason(game, profile, k), 'Promote ')}</div>` : top ? '<div class="gi-promote-row"><b>Highest rank</b></div>' : ''}</div></div>${own ? `<div class="gi-foot"><button class="small" data-action="admirals">All admirals</button></div>` : `<p class="description gi-enemy">Enemy officer · ${E.FACTIONS[a.side].name}.</p>`}</section></div>`;
  focusDialog();
}
function admiralCard(k) {
  const a = E.ADMIRALS[k],
    o = E.officer(game, k);
  return `<div class="admiral-card">${generalPortrait(k)}<b>${E.RANKS[o.rank]} ${a.name}</b><p>${a.skill} · ${a.desc}</p><p class="officer-line">${Math.round(E.RANK_HP[o.rank] * 100)}% hull · ${Object.entries(
    E.BRANCH_NAMES,
  )
    .map(([b, name]) => `${name} ${o.ratings[b]}★`)
    .join(' · ')}${o.medals.length ? ' · ' + o.medals.map(m => E.MEDALS[m].name).join(', ') : ''}</p></div>`;
}
function admiralDialog() {
  if (!interactive()) return;
  generalOpen = null;
  const u = selectedUnit(),
    own = u?.side === game.player ? u : null,
    inventory = game.medalInventory || [],
    counts = inventory.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Fleet admirals"><div class="dialog-head"><div><div class="eyebrow">High command · ${E.FACTIONS[game.player].name}</div><h2>Fleet admirals</h2><p>${costHTML({ credits: game.economy[game.player].credits }, true)} available · ${own && !own.admiral ? 'Assign an officer to ' + E.TYPES[own.type].name + ' ×' + own.stack : 'Select one of your fleets without an admiral to assign a commander.'}</p></div><button class="small close" data-action="close">Close</button></div><div class="info-strip">Click a portrait for General Info. Command tokens promote admirals through eleven naval ranks (fleet hull 112% for an Ensign up to 160% for a Fleet Admiral) and buy branch stars up to six. Each admiral has one signature ability. Medals are earned in operations and worn in limited slots. Officer records carry into every operation.</div><div class="medal-case"><span class="label">Medal case</span>${
    inventory.length
      ? Object.entries(counts)
          .map(
            ([id, n]) =>
              `<span class="medal-chip" title="${E.MEDALS[id].desc}">🎖 ${E.MEDALS[id].name}${n > 1 ? ' ×' + n : ''}</span>`,
          )
          .join('')
      : '<small>No unassigned medals. Earn them in battle: ' +
        Object.values(E.MEDALS)
          .map(m => `${m.name} (${m.earn.toLowerCase()})`)
          .join(' · ') +
        '</small>'
  }</div><div class="admiral-grid officers">${Object.entries(E.ADMIRALS)
    .filter(([k, a]) => a.side === game.player)
    .map(([k, a]) => officerCard(k, a, own, counts))
    .join('')}</div></section></div>`;
  focusDialog();
}
function officerCard(k, a, own, counts) {
  const o = E.officer(game, k),
    slots = E.medalSlots(o),
    top = o.rank >= E.RANKS.length - 1;
  const ratings = Object.entries(E.BRANCH_NAMES)
    .map(
      ([b, name]) =>
        `<div class="rating"><span>${name}</span><span class="stars">${ratingStars(o.ratings[b])}</span></div>`,
    )
    .join('');
  const worn = Array.from({ length: slots }, (_, i) => {
    const m = o.medals[i];
    return m
      ? `<span class="medal-slot filled" title="${E.MEDALS[m].desc}">🎖 ${E.MEDALS[m].name} ${act(`data-unequip="${m}" data-officer="${k}"`, '×', phaseReason(), '', 'small mini')}</span>`
      : '<span class="medal-slot">Empty slot</span>';
  }).join('');
  const equip = Object.keys(counts)
    .map(id =>
      act(
        `data-equip="${id}" data-officer="${k}"`,
        `Wear ${E.MEDALS[id].name}`,
        E.equipReason(game, k, id),
        E.MEDALS[id].desc,
        'small',
      ),
    )
    .join('');
  return `<section class="officer">${generalPortrait(k, 'officer-portrait')}<span class="stars">${'★'.repeat(a.stars)}</span><h3>${a.name}</h3><span class="label">${E.RANKS[o.rank]} · ${Math.round(E.RANK_HP[o.rank] * 100)}% hull · ${a.skill}</span><p>${a.desc}</p><div class="ratings">${ratings}</div><div class="medals"><span class="label">Medals ${o.medals.length}/${slots}</span>${worn}${equip}</div><div class="officer-actions">${top ? '<button class="small" disabled>Highest rank</button>' : tokenButton(`data-promote="${k}"`, E.promoteCost(o), E.promoteReason(game, loadProfile(), k), `Promote to ${E.RANKS[o.rank + 1]} `)}${act(`data-admiral="${k}"`, 'Assign to selected fleet', E.assignReason(game, own, k), costHTML({ credits: a.cost }))}</div></section>`;
}
function archiveDialog(branch = 'Escort') {
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Unit archive"><div class="dialog-head"><div><div class="eyebrow">Order of battle</div><h2>The fleet arsenal</h2><p>${E.FACTIONS[game.player].name} hulls. Values shown for one stack.</p></div><button class="small close" data-action="close">Close</button></div><div class="tabs">${['Escort', 'Battle Line', 'Artillery', 'Air'].map(b => `<button data-archive-branch="${b}" class="${b === branch ? 'active' : ''}">${b}</button>`).join('')}</div><div class="cards">${Object.entries(
    E.TYPES,
  )
    .filter(([k, t]) => t.branch === branch)
    .map(
      ([k, t]) =>
        `<article class="unit-card">${ART.ship(k, 'catalog-ship', game.player)}<span class="unit-code">${t.code} · Tier ${t.tier}</span><h3>${t.name}</h3><span class="label">${t.wc} equivalent</span>${t.weapon ? `<span class="weapon-focus">${t.weapon}</span>` : ''}<p style="margin-top:12px">${t.desc}</p><div class="unit-spec"><span>HP ${t.hp}</span><span>${ICONS.use('atk')}${t.attack}</span><span>${ICONS.use('def')}${t.armor}</span><span>${ICONS.use('mov')}${t.move}</span><span>${ICONS.use('rng')}${t.min === t.max ? t.max : t.min + '–' + t.max}</span></div><div class="cost">${costHTML({ credits: t.cost, industry: t.industry })}</div></article>`,
    )
    .join('')}</div></section></div>`;
  focusDialog();
}
function helpDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-label="Field manual"><div class="dialog-head"><div><div class="eyebrow">Field manual</div><h2>War on a hex grid</h2></div><button class="small close" data-action="help-close">Close</button></div><div class="help-grid"><div><b>Movement & firing</b><p>Every fleet can move once, then attack once per turn. Attacking spends its movement too. Select a fleet, click a green hex to move, and click a red hex to attack at once; hover a red hex to see the expected damage. Undo (Z) returns a fleet that moved but has not fired.</p></div><div><b>Capture stations</b><p>Destroy station defenses and remove its garrison, then move an Escort or Battle Line fleet onto the hex. Artillery cannot capture. Friendly stations produce resources and repair garrisons by 8% HP each turn.</p></div><div><b>Artillery & counter-fire</b><p>Artillery Frigates fire at range 1. Artillery Cruisers and Siege Cannons fire at exactly 2 hexes and cannot hit adjacent targets, so screen them with escorts. Artillery Cruisers splash enemies next to the target for 45% damage; Siege Cannons deal +100% station damage. All artillery attacks suppress enemy counter-fire. Escorts and Battle Line hulls exchange counter-fire when in range. Only Battleships and Dreadnoughts have range 2 in the Battle Line; all escorts and other cruisers have range 1.</p></div><div><b>Stacking & breakthroughs</b><p>Build 1–3-stack fleets. Each extra stack adds 70% HP and 45% attack. Add stacks near friendly stations. Battle Line kills refresh movement and fire once per turn; Mittermeyer and Attenborough allow two refreshes.</p></div><div><b>Admirals & morale</b><p>Attach officers to any fleet. Each admiral has one signature ability and branch ratings (up to 6 stars) that raise damage and cut damage taken for that branch. Click any portrait for General Info: command tokens buy stars and promote admirals through eleven naval ranks, Ensign to Fleet Admiral, raising their fleet's hull from 112% to 160%. Records carry into every mode. High morale grants +25% damage; low −25%, diminished −50%. Confused fleets cannot act or retaliate. Two adjacent enemies lower morale; three diminish it. Yang’s Confusion reduces nearby enemy morale by 2.</p></div><div><b>Terrain & supply</b><p>Nebulae cost 2 movement and cause 2.5% attrition each turn. Asteroids cost 2 movement and reduce damage by 15%. Yang ignores terrain movement costs. Gravity rifts are impassable. Capture the three crossings to invade the other side.</p></div><div><b>Shipyards</b><p>Each station builds one fleet per turn. New units act next turn. Upgrade yards through tier 3 to unlock heavy hulls. Artillery unlocks in order: Artillery Frigates at tier 1, Artillery Cruisers at tier 2, Siege Cannons at tier 3.</p></div><div><b>HQ research & command tokens</b><p>As in World Conqueror 4, technology is researched at Command HQ with command tokens and is kept across every operation and side. The first victory in each operation at each difficulty earns tokens: 250, plus 50 per star (150 for a Conquest) and 1 per 5 research banked, ×1.5 on Hard and ×2 on Challenge, with 150 extra for your first win ever. Replays pay nothing. Five trees (Escort, Battle Line, Artillery, Aerospace, Stations) hold weapons, armor, hull, engine and class-ability upgrades. Higher tiers open after 2, 4 and 7 operations won.</p></div><div><b>Difficulty</b><p>Every operation has three difficulties. Normal is the operation as designed. Hard gives the enemy all tier I–II research, upgrades half of their fleets one class (an escort becomes a light cruiser, a cruiser a heavier hull) and adds a fleet for every four. Challenge gives them every technology, upgrades every fleet and adds a stack, adds a fleet for every two, and raises their income 25%. Enemy admirals also start one or two ranks higher.</p></div><div><b>Fortresses & Thor's Hammer</b><p>Iserlohn and Geiersburg carry main guns. Select your fortress and click a red hex to fire at an enemy fleet within 3 hexes for 40% of its hull and a morale hit. The gun then recharges for 2 turns and is silenced while the fortress shields are down. The enemy fires its fortresses the same way.</p></div><div><b>Station buildings</b><p>Every station has a Shipyard (unlocks larger hulls, +10 industry per level), a Research station (+8 research per level; research banked when you win becomes command tokens) and an Air base (air wings). Each upgrades to level 3 from the station panel.</p></div><div><b>Air wings</b><p>Air bases build Fighter wings (level 1), Bomber wings (level 2) and Strategic Bomber wings (level 3). Air wings ignore terrain and cannot capture. Fighters deal +60% to air, bombers +40% to Battle Line and Artillery hulls, strategic bombers +120% to station defenses. Only escorts and fighters return fire against air wings, escorts deal +50% to them, and artillery cannot target them. Wings lose 10% hull each turn they start more than 3 hexes from a friendly air base.</p></div><div><b>Start dates & scenarios</b><p>Conquest offers the standard frontier plus four start dates: Astarte, the Amritsar offensive, the Lippstadt War (rebel stations and garrisons on both sides) and Operation Ragnarök. Scenarios have one objective, a turn limit and a 1–3 star rating; your best rating is shown in the operation list.</p></div><div><b>Economy</b><p>A turn's income buys roughly one cruiser. Escorts give the most firepower per credit; flagships are the strongest ships per hex but cost about two turns of income. Extra stacks cost 85% of a hull, reinforcing in the field costs a full hull, and repairs cost a fifth of the fleet's price.</p></div><div><b>Your objectives</b><p>Conquest: hold both capitals, or hold more stations at the 50-turn armistice. Scenarios: complete the objective before the turn limit; finish faster, or with more fleets intact when holding, for more stars.</p></div></div><div class="info-strip">Controls: N cycles ready fleets · Click or Enter on a red hex attacks · Z undoes the last move · Escape clears the selection or closes a menu · Arrow keys move the hex cursor and Enter selects · Drag or WASD pans · Scroll / + / − zooms · 0 fits the map.</div><p style="font-size:12px">Unofficial fan game. Original code and alternate-history scenarios, using the requested ship-class mappings. Gameplay draws on <a href="https://apps.apple.com/sg/app/world-conqueror-4/id1258468290" target="_blank" rel="noopener noreferrer">EasyTech’s World Conqueror 4</a>; <a href="https://world-conqueror-4.fandom.com/wiki/Units" target="_blank" rel="noopener noreferrer">unit reference</a>. Numbers and some abilities are adapted for this game.</p></section></div>`;
  focusDialog();
}
function menuDialog() {
  modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="Game menu"><div class="eyebrow">Command headquarters</div><h2>Your orders, Admiral.</h2><p>Your current operation is saved automatically in this browser. The previous real-time game’s save is kept separately.</p><div class="dialog-footer"><div><button class="primary" data-action="close">Resume</button><button data-action="new">New operation</button><button data-action="help">Field manual</button></div></div></section></div>`;
  focusDialog();
}
function hexCenter(p) {
  return { x: SQ * R * (p.c + 0.5 * (p.r & 1)) + R, y: R * 1.5 * p.r + R };
}
function computeView() {
  const rect = canvas.getBoundingClientRect();
  mapSize = { w: rect.width, h: rect.height };
  const width = SQ * R * (game.cols + 0.5) + R,
    height = R * 1.5 * (game.rows - 1) + 2 * R;
  const compact = rect.width < 700;
  const top = compact ? 120 : 130,
    bottom = compact ? 205 : 175;
  fitScale = Math.min((rect.width - 70) / width, (rect.height - top - bottom) / height);
  fitScale = Math.max(0.22, fitScale);
  const scale = fitScale * zoom;
  offset = {
    x: (rect.width - width * scale) / 2 + pan.x,
    y: top + (rect.height - top - bottom - height * scale) / 2 + pan.y,
  };
  return scale;
}
function centerOn(p) {
  const scale = computeView(),
    c = hexCenter(p);
  pan.x += mapSize.w / 2 - (c.x * scale + offset.x);
  pan.y += mapSize.h / 2 - (c.y * scale + offset.y);
}
// Admiral portraits float up and to the left of their fleet (see drawAdmiralPin).
function hitPin(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(),
    scale = computeView(),
    x = (clientX - rect.left - offset.x) / scale,
    y = (clientY - rect.top - offset.y) / scale,
    k = Math.min(1.6, Math.max(1, 0.85 / scale));
  return game.units.find(u => {
    if (u.hp <= 0 || !u.admiral) return false;
    const p = animatedPosition(u),
      dx = x - (p.x - 22),
      dy = y - (p.y - 40);
    return Math.abs(dx) <= 15 * k && dy >= -18 * k && dy <= 25 * k;
  });
}
function hitHex(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(),
    scale = computeView(),
    x = (clientX - rect.left - offset.x) / scale,
    y = (clientY - rect.top - offset.y) / scale;
  let nearest = null,
    best = R;
  for (const t of game.tiles) {
    const p = hexCenter(t),
      d = Math.hypot(p.x - x, p.y - y);
    if (d < best) {
      best = d;
      nearest = t;
    }
  }
  return nearest;
}
function changeZoom(factor, anchor) {
  const oldScale = computeView(),
    oldOffset = { ...offset };
  zoom = E.clamp(zoom * factor, 0.7, 3.2);
  const newScale = computeView();
  if (anchor) {
    const wx = (anchor.x - oldOffset.x) / oldScale,
      wy = (anchor.y - oldOffset.y) / oldScale;
    pan.x += anchor.x - (wx * newScale + offset.x);
    pan.y += anchor.y - (wy * newScale + offset.y);
  }
}
function fireFortressAt(s, p) {
  const before = unitSnapshot(),
    r = E.fireFortress(game, s.id, p.c, p.r);
  if (!r.ok) {
    toast(r.reason);
    return;
  }
  strikeEffects(r);
  moralePopups(before);
  refreshAndSave();
}
function activateHex(p) {
  if (!p) return;
  const fort = selectedStation();
  if (fort && interactive() && targetCache.has(E.key(p))) {
    fireFortressAt(fort, p);
    return;
  }
  const u = selectedUnit(),
    hit = E.unitAt(game, p),
    station = E.stationAt(game, p);
  if (u?.side === game.player && interactive()) {
    if (targetCache.has(E.key(p))) {
      attackHex(p);
      return;
    }
    if (readyCache.has(E.key(p))) {
      const snapshot = JSON.stringify(game),
        result = E.move(game, u.id, p.c, p.r);
      if (result.ok) {
        undoStack.push({ snapshot, unitId: u.id });
        effects.push({
          kind: 'move',
          unitId: u.id,
          from: result.from,
          to: result.to,
          color: E.FACTIONS[u.side].color,
          life: 0.45,
          max: 0.45,
        });
        refreshAndSave(true);
        if (result.captured) toast(`${result.captured} captured. +40 credits.`);
        return;
      }
    }
  }
  if (hit) selectUnit(hit.id);
  else if (station) selectStation(station.id);
  else {
    selection = { kind: 'tile', c: p.c, r: p.r };
    updateSelection();
  }
}
function attachMap() {
  canvas.onpointerdown = e => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    canvas.focus({ preventScroll: true });
    pointer = { x: e.clientX, y: e.clientY, pan: { ...pan }, dragged: false, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = e => {
    if (pointer) {
      const dx = e.clientX - pointer.x,
        dy = e.clientY - pointer.y;
      if (Math.hypot(dx, dy) > 5) pointer.dragged = true;
      if (pointer.dragged) {
        pan.x = pointer.pan.x + dx;
        pan.y = pointer.pan.y + dy;
        canvas.style.cursor = 'grabbing';
      }
    }
    hover = hitHex(e.clientX, e.clientY);
    if (hover && !pointer?.dragged) {
      canvas.style.cursor = readyCache.has(E.key(hover)) || targetCache.has(E.key(hover)) ? 'pointer' : 'default';
      const u = E.unitAt(game, hover),
        s = E.stationAt(game, hover),
        own = selectedUnit(),
        fort = selectedStation(),
        pr = own && targetCache.has(E.key(hover)) ? E.preview(game, own.id, hover.c, hover.r) : null;
      $('map-caption').textContent =
        fort && u && targetCache.has(E.key(hover))
          ? `Click to fire ${E.fortressName(fort)} at ${E.TYPES[u.type].short} · ~${E.fortressDamage(game, u, fort.owner)} damage`
          : pr
            ? `Click to attack ${u ? E.TYPES[u.type].short : s.name} · ~${pr.unit || pr.shield} damage · ${pr.counterAllowed ? pr.counter + ' counter-fire' : 'no counter-fire'}`
            : `Hex ${hover.c}, ${hover.r} · ${u ? E.TYPES[u.type].short + ' · ' : ''}${s ? s.name + ' · ' : ''}${hover.terrain === 'space' ? 'Deep space' : hover.terrain === 'rift' ? 'Impassable rift' : hover.terrain === 'nebula' ? 'Nebula · cost 2 · attrition' : 'Asteroids · cost 2 · −15% damage'}`;
    }
  };
  canvas.onpointerup = e => {
    if (pointer && !pointer.dragged) {
      // A click on an admiral's map portrait opens their General Info, unless it lands on a move or attack hex.
      const p = hitHex(e.clientX, e.clientY),
        pin = hitPin(e.clientX, e.clientY);
      if (pin && !(p && (targetCache.has(E.key(p)) || readyCache.has(E.key(p))))) generalDialog(pin.admiral);
      else activateHex(p);
    }
    pointer = null;
    canvas.style.cursor = 'default';
  };
  canvas.onpointercancel = () => (pointer = null);
  canvas.onpointerleave = () => {
    if (!pointer) hover = null;
  };
  canvas.onwheel = e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    changeZoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  canvas.oncontextmenu = e => e.preventDefault();
}
const HEAVY_SHAKE = {
  siege: 10,
  battleship: 6,
  flagship: 7,
  strategic: 6,
  missile: 4,
  bomber: 3,
  heavy: 2.5,
  light: 1.5,
};
function bump(amount) {
  if (!reducedMotion()) shake = Math.max(shake, amount);
}
function popup(at, text, color, opts = {}) {
  const life = opts.life || 1.6;
  effects.push({
    kind: 'text',
    to: { c: at.c, r: at.r },
    text,
    color,
    life,
    max: life,
    dy: opts.dy || 0,
    size: opts.size || 14,
    pop: !!opts.pop,
  });
}
function unitSnapshot() {
  return new Map(game.units.filter(u => u.hp > 0).map(u => [u.id, { hp: u.hp, morale: u.morale }]));
}
function moraleLabel(m) {
  return m <= -3 ? 'CONFUSED!' : m === -2 ? 'MORALE ↓↓' : 'MORALE ↓';
}
// Morale drops over units: Confused, or a falling-morale tag.
function moralePopups(before) {
  for (const u of game.units) {
    const b = before.get(u.id);
    if (b && u.hp > 0 && u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2 });
  }
}
// Start-of-turn events: nebula attrition (Low Supply), morale shifts and fortress strikes.
function turnStartPopups(before, side) {
  const struck = new Set((game.strikes || []).map(s => s.id));
  for (const u of game.units) {
    const b = before.get(u.id);
    if (!b || u.hp <= 0 || struck.has(u.id)) continue;
    if (u.side === side && u.hp < b.hp) popup(u, `LOW SUPPLY −${Math.round(b.hp - u.hp)}`, '#f2b35c', { life: 2.1 });
    if (u.morale < b.morale) popup(u, moraleLabel(u.morale), '#d9a6ff', { dy: 30, life: 2.1 });
  }
  (game.strikes || []).forEach((s, i) => strikeEffects(s, i * 0.5));
}
function strikeEffects(s, delay = 0) {
  effects.push({
    kind: 'beam',
    heavy: true,
    from: s.from,
    to: s.to,
    color: '#fff3a0',
    life: 1.2 + delay,
    max: 1.2 + delay,
  });
  popup(s.to, s.name.toUpperCase() + '!', '#ffe27a', { dy: 34, size: 16, life: 2.4, pop: true });
  popup(s.to, '−' + s.damage, '#ff4b3e', { size: 22, life: 2.2, pop: true });
  if (s.destroyed) effects.push({ kind: 'boom', to: s.to, life: 1, max: 1 });
  for (const h of s.hit || []) popup(h, '−' + h.damage, '#ff4b3e', { size: 18, life: 2, pop: true });
  SFX.play('thor', 'empire', delay);
  setTimeout(() => bump(16), reducedMotion() ? 0 : delay * 1000 + 550);
}
function addCombatEffects(result, attacker) {
  const side = attacker.side,
    type = attacker.type;
  effects.push({
    kind: 'beam',
    heavy: ['battleship', 'flagship', 'siege'].includes(type),
    from: result.from,
    to: result.to,
    color: E.FACTIONS[side].color,
    life: 0.75,
    max: 0.75,
  });
  SFX.play(SFX.weapon(type), side);
  if (result.crit) SFX.play('crit', side, 0.08);
  if (result.destroyed) {
    SFX.play('explosion', side, 0.2);
    effects.push({ kind: 'boom', to: result.to, life: 1, max: 1 });
  }
  bump((HEAVY_SHAKE[type] || 0) + (result.crit ? 4 : 0) + (result.destroyed ? 4 : 0));
  // Blue tag: station defenses knocked down.
  if (result.shieldDamage) popup(result.to, `−${result.shieldDamage} DEF`, '#7cc8ff', { dy: 20, size: 14 });
  for (const h of result.hit || []) {
    const main = h.c === result.to.c && h.r === result.to.r;
    if (main && result.crit) popup(h, `−${h.damage} CRIT!`, '#ff3b30', { size: 21, life: 1.9, pop: true });
    else popup(h, '−' + h.damage, main ? '#ffb3a3' : '#ff9a7a', { size: main ? 15 : 13 });
  }
  if (result.counter) popup(result.from, `↩ −${result.counter}`, '#ffb3a3', { size: 13 });
}
const stars = Array.from({ length: 160 }, (_, i) => ({
  x: (((Math.sin(i * 127.1 + 1) * 43758.5453) % 1) + 1) % 1,
  y: (((Math.sin(i * 311.7 + 7) * 19731.234) % 1) + 1) % 1,
  a: 0.1 + (i % 7) * 0.05,
}));
function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30),
      px = x + r * Math.cos(a),
      py = y + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawLine(x, y, tx, ty, color, width = 1, dash = []) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
}
/* Battlefield renderer is supplied below. */
function frame(time) {
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;
  draw(time, dt);
  requestAnimationFrame(frame);
}
let helpBack = 'game';
document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'mode-select') {
    setup.mode = e.target.value;
    startMenu();
    $('mode-select')?.focus();
  }
  if (id === 'difficulty-select') {
    setup.difficulty = e.target.value;
    setup.mode = $('mode-select').value;
    startMenu();
    $('difficulty-select')?.focus();
  }
  if (id === 'fleet-select' && e.target.value) selectUnit(+e.target.value, true);
  if (id === 'station-select' && e.target.value) selectStation(+e.target.value, true);
  if (id === 'stack-select') {
    shop.stack = +e.target.value;
    openShop(shop.station);
  }
});
document.addEventListener('click', e => {
  const portrait = e.target.closest('[data-general]');
  if (portrait && !e.target.closest('button')) {
    generalDialog(portrait.dataset.general);
    return;
  }
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.faction) {
    setup.side = d.faction;
    setup.mode = $('mode-select').value;
    startMenu();
    return;
  }
  if (d.station) {
    selectStation(+d.station);
    return;
  }
  if (d.shop) {
    openShop(+d.shop);
    return;
  }
  if (d.branch) {
    openShop(shop.station, d.branch);
    return;
  }
  if (d.build) {
    doAction(() => E.build(game, +d.stationId, d.build));
    return;
  }
  if (d.archiveBranch) {
    archiveDialog(d.archiveBranch);
    return;
  }
  if (d.recruit) {
    const r = E.recruit(game, shop.station, d.recruit, E.TYPES[d.recruit].elite ? 1 : shop.stack);
    if (r.ok) {
      selection = { kind: 'unit', id: r.unit.id };
      closeModal();
      refreshAndSave();
      toast('Fleet commissioned. It will be ready next turn.');
    } else toast(r.reason);
    return;
  }
  if (d.researchBranch) {
    researchDialog(d.researchBranch);
    return;
  }
  if (d.research) {
    const p = loadProfile(),
      r = E.research(p, d.research);
    if (r.ok) {
      saveProfile(p);
      // In an operation the new technology applies at once; from the start menu it applies to the next launch.
      if (researchBack !== 'start') {
        E.applyTech(game, p.research);
        undoStack = [];
        render();
        save();
      }
      researchDialog();
      toast(`${E.TECH_NODES[d.research].name} ${E.ROMAN[r.level]} researched.`);
    } else toast(r.reason);
    return;
  }
  if (b.getAttribute('aria-disabled') === 'true') return;
  if (d.buyStar || d.promote) {
    const p = loadProfile(),
      r = d.buyStar ? E.buyStar(game, p, d.officer, d.buyStar) : E.promote(game, p, d.promote);
    if (r.ok) {
      // Tokens and the officer's new star are written to the profile at once, whoever's turn it is.
      saveProfile(E.exportProfile(game, p));
      undoStack = [];
      render();
      save();
      if (generalOpen) generalDialog(generalOpen);
      else admiralDialog();
      toast(
        d.buyStar
          ? `${E.ADMIRALS[d.officer].short}: ${r.stars}★ ${E.BRANCH_NAMES[d.buyStar]}.`
          : `${E.ADMIRALS[d.promote].short} promoted to ${E.RANKS[E.officer(game, d.promote).rank]}.`,
      );
    } else toast(r.reason);
    return;
  }
  const officerOrder =
    (d.equip && (() => E.equipMedal(game, d.officer, d.equip))) ||
    (d.unequip && (() => E.unequipMedal(game, d.officer, d.unequip)));
  if (officerOrder) {
    const r = officerOrder();
    if (r.ok) {
      undoStack = [];
      render();
      save();
      if (generalOpen) generalDialog(generalOpen);
      else admiralDialog();
    } else toast(r.reason);
    return;
  }
  if (d.admiral) {
    const u = selectedUnit(),
      r = u ? E.assign(game, u.id, d.admiral) : { ok: false, reason: 'Select a fleet first.' };
    if (r.ok) {
      closeModal();
      refreshAndSave();
      toast(`${E.ADMIRALS[d.admiral].short} assumes command.`);
    } else toast(r.reason);
    return;
  }
  switch (d.action) {
    case 'details':
      detailOpen = !detailOpen;
      updateSelection();
      break;
    case 'start':
      setup.mode = $('mode-select').value;
      newGame();
      break;
    case 'continue': {
      const s = getSave();
      if (s) {
        aiToken++;
        game = E.applyTech(s, loadProfile().research);
        selection = null;
        undoStack = [];
        zoom = 1;
        pan = { x: 0, y: 0 };
        closeModal();
        render();
        if (game.over) resultDialog();
      }
      break;
    }
    case 'new':
      startMenu();
      break;
    case 'close':
      closeModal();
      break;
    case 'help':
      helpBack = $('mode-select') ? 'start' : 'game';
      helpDialog();
      break;
    case 'help-close':
      if (helpBack === 'start') startMenu();
      else closeModal();
      break;
    case 'menu':
      menuDialog();
      break;
    case 'next':
      nextFleet();
      break;
    case 'undo':
      undoMove();
      break;
    case 'sound':
      toast(SFX.toggle() ? 'Sound on.' : 'Sound off.');
      render();
      break;
    case 'research':
      researchBack = $('mode-select')
        ? 'start'
        : modal.querySelector('[aria-label="Operation result"]')
          ? 'result'
          : 'game';
      researchDialog();
      break;
    case 'research-close':
      if (researchBack === 'start') startMenu();
      else if (researchBack === 'result') resultDialog();
      else closeModal();
      break;
    case 'general-close':
      closeModal();
      break;
    case 'admirals':
    case 'assign':
      admiralDialog();
      break;
    case 'archive':
      archiveDialog();
      break;
    case 'end':
      endTurn();
      break;
    case 'end-confirm':
      endTurn(true);
      break;
    case 'confuse': {
      const u = selectedUnit();
      if (u) doAction(() => E.confuse(game, u.id));
      break;
    }
    case 'reinforce': {
      const u = selectedUnit();
      if (u) doAction(() => E.reinforce(game, u.id));
      break;
    }
    case 'repair': {
      const u = selectedUnit();
      if (u) doAction(() => E.repair(game, u.id));
      break;
    }
    case 'upgrade': {
      const s = selectedStation();
      if (s) doAction(() => E.build(game, s.id, 'shipyard'));
      break;
    }
    case 'wait': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive()) {
        u.moved = u.attacked = true;
        refreshAndSave();
        nextFleet();
      }
      break;
    }
    case 'zoom-in':
      changeZoom(1.2);
      break;
    case 'zoom-out':
      changeZoom(1 / 1.2);
      break;
    case 'fit':
      zoom = 1;
      pan = { x: 0, y: 0 };
      break;
  }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.general) {
    e.preventDefault();
    generalDialog(e.target.dataset.general);
    return;
  }
  if (modal.children.length) {
    if (e.key === 'Tab') {
      const list = [...modal.querySelectorAll('button:not(:disabled),select,a[href]')],
        first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    if (e.key === 'Escape' && !$('mode-select')) {
      if (helpBack === 'start' && modal.querySelector('[aria-label="Field manual"]')) startMenu();
      else closeModal();
    }
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'n') {
    e.preventDefault();
    nextFleet();
  }
  if (k === 'z') {
    e.preventDefault();
    undoMove();
  }
  if (k === 'escape') {
    selection = null;
    updateSelection();
  }
  if (k === '+' || k === '=') changeZoom(1.2);
  if (k === '-') changeZoom(1 / 1.2);
  if (k === '0') {
    zoom = 1;
    pan = { x: 0, y: 0 };
  }
  if (['w', 'a', 's', 'd'].includes(k)) {
    e.preventDefault();
    pan.x += k === 'a' ? 70 : k === 'd' ? -70 : 0;
    pan.y += k === 'w' ? 70 : k === 's' ? -70 : 0;
  }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const p = hover ||
      selectedUnit() ||
      selectedStation() || { c: Math.floor(game.cols / 2), r: Math.floor(game.rows / 2) };
    hover = E.tile(
      game,
      E.clamp(p.c + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0), 0, game.cols - 1),
      E.clamp(p.r + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0), 0, game.rows - 1),
    );
  }
  if (k === 'enter' && document.activeElement === canvas) {
    e.preventDefault();
    activateHex(hover);
  }
});
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const defs = [
    {
      name: 'read_hex_campaign',
      description: 'Read current hex campaign resources, fleets, stations, and whose turn it is.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => ({
        turn: game.turn,
        phase: game.phase,
        player: game.player,
        resources: game.economy[game.player],
        stations: game.stations,
        units: game.units.filter(u => u.hp > 0),
        result: game.over,
      }),
    },
    {
      name: 'select_hex_fleet',
      description: 'Select a living fleet on the map. Does not move or attack.',
      inputSchema: {
        type: 'object',
        properties: { unitId: { type: 'integer' } },
        required: ['unitId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: input => {
        if (modal.children.length) throw new Error('Close the open dialog first.');
        if (!Number.isInteger(input.unitId) || !game.units.some(u => u.id === input.unitId && u.hp > 0))
          throw new Error('Invalid unit ID.');
        selectUnit(input.unitId, true);
        return { selectedUnitId: input.unitId };
      },
    },
  ];
  for (const t of defs) {
    try {
      Promise.resolve(context.registerTool(t)).catch(() => {});
    } catch (e) {}
  }
}
/* INITIALIZE_GAME */
function dockHTML() {
  const u = selectedUnit(),
    s = selectedStation();
  if (u) {
    const t = E.TYPES[u.type],
      a = E.ADMIRALS[u.admiral],
      ours = u.side === game.player,
      canUndo = ours && interactive() && undoStack.at(-1)?.unitId === u.id;
    return `<div class="dock-visual">${ART.ship(u.type, '', artSide(u))}${a ? generalPortrait(u.admiral, 'dock-portrait') : ''}<span class="faction-flag ${u.side}">${u.side === 'empire' ? 'I' : u.side === 'alliance' ? 'A' : 'R'}</span></div><div class="dock-unit"><span class="label">${a ? a.short + ' · ' : ''}${t.branch} · ×${u.stack}</span><strong>${a && u.type === 'flagship' ? a.hull : t.short}</strong><div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u, t)}</div><p>${Math.ceil(u.hp)} / ${E.maxHP(u)} hull · ${moraleName(u.morale)}${ours ? ' · ' + fireStatus(u) : ''}</p></div><div class="dock-actions">${canUndo ? '<button class="small undo-button" data-action="undo">↶ Undo move</button>' : ''}<button class="small" data-action="details">${ours ? 'Orders & upgrades' : 'Fleet details'}</button>${ours && !u.admiral ? '<button class="small" data-action="assign">Assign admiral</button>' : ''}${ours && u.admiral === 'yang' ? act('data-action="confuse"', 'Confusion', phaseReason() || E.confuseReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="wait"', 'Hold position', phaseReason() || (u.attacked ? 'Already fired' : null), '', 'small ghost') : ''}</div>`;
  }
  if (s) {
    const ours = s.owner === game.player;
    return `<div class="dock-visual">${ART.ship(s.capital ? 'capital' : s.fort ? 'fortress' : 'station')}<span class="faction-flag ${s.owner}">${s.owner === 'empire' ? 'I' : s.owner === 'alliance' ? 'A' : 'N'}</span></div><div class="dock-unit"><span class="label">${s.fort ? 'Fortress' : s.capital ? 'Capital' : 'Sector hub'} · Shipyard ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>Income +${s.income} &nbsp; Industry +${s.industry}</p></div><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Shipyard', shipyardReason(s), '', 'primary') : ''}<button class="small" data-action="details">Station details</button></div>`;
  }
  return `<div class="dock-idle"><span class="label">Fleet command</span><strong>Select a fleet or station</strong><p>Click a ship to move and attack. Click a station to build.</p></div><div class="dock-actions"><button class="small" data-action="next">Select a ready fleet</button><button class="small ghost" data-action="details">Fleet directory</button></div>`;
}
const artSide = u => u.art || (u.side === 'neutral' ? 'empire' : u.side);
const PLATE = {
  neutral: { light: '#7a7290', mid: '#3d3850', dark: '#1f1b2b', trim: '#c9c2d8', bar: '#b0a8c2' },
  empire: { light: '#3a4f8c', mid: '#16244f', dark: '#0a1430', trim: '#e6c56a', bar: '#d9b45a' },
  alliance: { light: '#a3333f', mid: '#5c1219', dark: '#33070c', trim: '#d3dbe2', bar: '#c4ccd3' },
};
function starPath(x, y, ro, ri) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro,
      a = ((36 * i - 90) * Math.PI) / 180;
    i ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}
// Selected tile: glowing teal hex outline with pulsing inner corners.
function selectedHex(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 260);
  ctx.save();
  hexPath(p.x, p.y, R - 2);
  ctx.fillStyle = '#3ff2c41c';
  ctx.fill();
  ctx.shadowColor = '#3ff2c4';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#3ff2c4';
  ctx.lineWidth = Math.max(2.5, 2 / scale);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const inset = R - 7 - pulse * 3,
    len = 8;
  ctx.strokeStyle = `rgba(160,255,225,${0.55 + 0.45 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.6 / scale);
  const vertex = i => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return { x: p.x + inset * Math.cos(a), y: p.y + inset * Math.sin(a) };
  };
  for (let i = 0; i < 6; i++) {
    const v = vertex(i);
    for (const j of [-1, 1]) {
      const n = vertex(i + j),
        d = Math.hypot(n.x - v.x, n.y - v.y);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(v.x + ((n.x - v.x) * len) / d, v.y + ((n.y - v.y) * len) / d);
      ctx.stroke();
    }
  }
  ctx.restore();
}
// Attackable hexes: pulsing red crosshair drawn above the fleets.
function drawCrosshair(p, time, scale) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 200),
    r = 11 + pulse * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y - 4);
  ctx.strokeStyle = `rgba(255,80,60,${0.65 + 0.35 * pulse})`;
  ctx.lineWidth = Math.max(2, 1.8 / scale);
  ctx.shadowColor = '#ff3b2f';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd0c4';
  ctx.fill();
  ctx.restore();
}
// Hover estimate shown above a red hex before the one-click attack.
function drawEstimate(p, pr, scale) {
  const text = `~${pr.unit || pr.shield} dmg · ${pr.counterAllowed ? '↩ ' + pr.counter : 'no counter'}`;
  ctx.save();
  ctx.translate(p.x, p.y - R + 2);
  ctx.scale(1 / scale, 1 / scale);
  ctx.font = "bold 12px 'Trebuchet MS'";
  const w = (ctx.measureText(text)?.width || text.length * 7) + 16;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2, -24, w, 22, 5);
  else ctx.rect(-w / 2, -24, w, 22);
  ctx.fillStyle = '#3b0f0ee8';
  ctx.fill();
  ctx.strokeStyle = '#ff7a62';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff1e8';
  ctx.fillText(text, 0, -9);
  ctx.restore();
}
// WC4 base token: Imperial navy with gold trim, Alliance crimson with silver trim, ringed by hull integrity.
function drawPlate(u, scale) {
  const c = PLATE[u.side],
    cy = 14,
    rx = 31,
    ry = 18,
    f = Math.max(0, Math.min(1, u.hp / E.maxHP(u)));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, cy + 3, rx + 3, ry + 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#00000080';
  ctx.fill();
  const g = ctx.createRadialGradient(-7, cy - 6, 2, 0, cy, rx);
  g.addColorStop(0, c.light);
  g.addColorStop(0.65, c.mid);
  g.addColorStop(1, c.dark);
  ctx.beginPath();
  ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = c.trim;
  ctx.lineWidth = Math.max(2, 1.6 / scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, cy, rx - 4.5, ry - 3, 0, 0, Math.PI * 2);
  ctx.strokeStyle = c.trim + '66';
  ctx.lineWidth = Math.max(0.8, 0.8 / scale);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#061019e0';
  ctx.lineWidth = Math.max(4.2, 3.2 / scale);
  ctx.stroke();
  if (f > 0) {
    ctx.beginPath();
    ctx.ellipse(0, cy, rx + 6, ry + 6, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.strokeStyle = ICONS.hpColor(f);
    ctx.lineWidth = Math.max(2.8, 2.2 / scale);
    ctx.stroke();
  }
  ctx.restore();
}
// Stack strength: 1–3 metallic bars hung from the bottom of the token ring.
function drawStackBars(n, side, scale) {
  const c = PLATE[side],
    w = 9,
    gap = 3,
    total = n * w + (n - 1) * gap,
    y = 41;
  for (let i = 0; i < n; i++) {
    const x = -total / 2 + i * (w + gap);
    ctx.fillStyle = '#05090d';
    ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = c.bar;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#ffffffb0';
    ctx.fillRect(x, y, w, 1.2);
    ctx.fillStyle = '#00000055';
    ctx.fillRect(x, y + 2.8, w, 1.2);
  }
}
// WC4 general pin: the admiral's framed portrait standing above the fleet, with rank stars.
function drawAdmiralPin(u, p, scale, sel) {
  const a = E.ADMIRALS[u.admiral],
    img = ART.images.portraits;
  ctx.save();
  ctx.translate(p.x - 22, p.y - 40);
  const k = Math.min(1.6, Math.max(1, 0.85 / scale));
  ctx.scale(k, k);
  const w = 26,
    h = 32;
  ctx.shadowColor = '#000c';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (ART.ready.portraits && img) {
    const [sx, sy, sw, sh] = ART.rect('portraits', ART.officers[u.admiral]),
      crop = sw * (h / w) < sh ? sw * (h / w) : sh;
    ctx.drawImage(img, sx, sy, sw, crop, -w / 2, -h / 2, w, h);
  } else outlinedText('★', 0, 4, 14, '#e9c366', scale);
  ctx.strokeStyle = sel ? '#3ff2c4' : '#e6c56a';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
  ctx.fillStyle = '#5c1219';
  ctx.fillRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  ctx.strokeStyle = '#e6c56a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-w / 2 - 2, h / 2 + 1, w + 4, 7);
  for (let i = 0; i < a.stars; i++) {
    starPath((i - (a.stars - 1) / 2) * 5, h / 2 + 4.6, 2.3, 0.95);
    ctx.fillStyle = '#ffe08a';
    ctx.fill();
  }
  ctx.restore();
  if (sel || scale > 0.8) outlinedText(a.short, p.x - 22, p.y - 40 - (h / 2 + 7) * k, 10, '#f7e5ad', scale);
}
function mapBadge(x, y, side, scale) {
  const radius = Math.max(7, 7 / scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = side === 'empire' ? PLATE.empire.mid : side === 'alliance' ? PLATE.alliance.mid : '#665774';
  ctx.fill();
  ctx.strokeStyle = side === 'empire' ? PLATE.empire.trim : side === 'alliance' ? PLATE.alliance.trim : '#eee6c5';
  ctx.lineWidth = 1.4 / scale;
  ctx.stroke();
  ctx.font = `bold ${Math.max(9, 8 / scale)}px Georgia`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8df';
  ctx.fillText(side === 'empire' ? 'I' : side === 'alliance' ? 'A' : 'N', 0, 3 / scale);
  ctx.restore();
}
function outlinedText(text, x, y, size, color, scale, font = 'Trebuchet MS', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${Math.max(size, size / scale)}px '${font}'`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = '#06121fdd';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function animatedPosition(u) {
  const p = hexCenter(u),
    fx = effects.find(e => e.kind === 'move' && e.unitId === u.id && e.life > 0);
  if (!fx) return p;
  const start = hexCenter(fx.from),
    t = 1 - fx.life / fx.max,
    ease = 1 - Math.pow(1 - t, 3);
  return { x: start.x + (p.x - start.x) * ease, y: start.y + (p.y - start.y) * ease };
}
function draw(time, dt) {
  if (!canvas || !ctx) return;
  const scale = computeView(),
    { w, h } = mapSize,
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#102b3e';
  ctx.fillRect(0, 0, w, h);
  const wash = ctx.createRadialGradient(w * 0.48, h * 0.5, 50, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
  wash.addColorStop(0, '#244658');
  wash.addColorStop(0.6, '#142f43');
  wash.addColorStop(1, '#071423');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.11;
    ART.draw(
      ctx,
      'terrain',
      4 + (i % 4),
      w * ((i * 0.317 + 0.12) % 1),
      h * ((i * 0.463 + 0.21) % 1),
      w * 0.6,
      h * 0.65,
    );
  }
  ctx.globalAlpha = 1;
  for (const star of stars) {
    ctx.fillStyle = `rgba(211,229,229,${star.a * 0.75})`;
    ctx.fillRect(star.x * w, star.y * h, 1.2, 1.2);
  }
  const jolt = shake ? { x: (Math.random() * 2 - 1) * shake, y: (Math.random() * 2 - 1) * shake } : { x: 0, y: 0 };
  shake = Math.max(0, shake - dt * 30);
  ctx.save();
  ctx.translate(offset.x + jolt.x, offset.y + jolt.y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 0.65 / scale;
  for (const t of game.tiles) {
    const p = hexCenter(t);
    hexPath(p.x, p.y, R);
    ctx.fillStyle =
      t.terrain === 'rift'
        ? '#07131e'
        : t.owner === 'empire'
          ? '#a59a602c'
          : t.owner === 'alliance'
            ? '#358b9c26'
            : '#78829b0a';
    ctx.fill();
    ctx.strokeStyle = '#b5c8cf13';
    ctx.stroke();
  }
  // Territorial borders remain visible when the tactical grid is subtle.
  for (const t of game.tiles) {
    if (t.terrain === 'rift') continue;
    const p = hexCenter(t);
    for (const n of E.adjacent(game, t)) {
      if (n.owner === t.owner && n.terrain !== 'rift') continue;
      const q = hexCenter(n),
        angle = Math.atan2(q.y - p.y, q.x - p.x),
        i = Math.round(angle / (Math.PI / 3)),
        a = ((i * 60 - 30) * Math.PI) / 180,
        b = ((i * 60 + 30) * Math.PI) / 180;
      drawLine(
        p.x + R * Math.cos(a),
        p.y + R * Math.sin(a),
        p.x + R * Math.cos(b),
        p.y + R * Math.sin(b),
        n.terrain === 'rift' ? '#93a9b35a' : t.owner === 'empire' ? '#d2ba7a8f' : '#5bb9d899',
        1.4 / scale,
      );
    }
  }
  // Painted terrain props are actual raster assets, kept separate from hit regions.
  for (const t of game.tiles) {
    const p = hexCenter(t);
    if (t.terrain === 'nebula') {
      ctx.globalAlpha = 0.65;
      ART.draw(ctx, 'terrain', 4 + ((t.c + t.r) % 4), p.x, p.y, R * 2.6, R * 2.6);
      ctx.globalAlpha = 1;
    } else if (t.terrain === 'asteroid') {
      ART.draw(ctx, 'terrain', (t.c + t.r) % 4, p.x, p.y - 3, R * 1.9, R * 1.9);
    } else if (t.terrain === 'rift') {
      ctx.globalAlpha = 0.36;
      ART.draw(ctx, 'terrain', 13, p.x, p.y, R * 1.8, R * 1.8);
      ctx.globalAlpha = 1;
      outlinedText('×', p.x, p.y + 3, 11, '#93a6b66b', scale);
    }
    const k = E.key(t);
    if (readyCache.has(k)) {
      hexPath(p.x, p.y, R - 1.5);
      ctx.fillStyle = '#3ddc7a38';
      ctx.fill();
      ctx.strokeStyle = '#6dffa5aa';
      ctx.lineWidth = 1.2 / scale;
      ctx.stroke();
    }
    if (targetCache.has(k)) {
      hexPath(p.x, p.y, R - 1.5);
      ctx.fillStyle = '#e8343048';
      ctx.fill();
      ctx.strokeStyle = '#ff6a5acc';
      ctx.lineWidth = 1.4 / scale;
      ctx.stroke();
    }
  }
  const selTile =
    selection?.kind === 'unit'
      ? selectedUnit()
      : selection?.kind === 'station'
        ? selectedStation()
        : selection?.kind === 'tile'
          ? selection
          : null;
  if (selTile) selectedHex(hexCenter(selTile), time, scale);
  for (const s of game.stations) {
    const p = hexCenter(s),
      col = E.FACTIONS[s.owner].color,
      garrison = E.unitAt(game, s),
      index = s.capital ? 15 : s.fort ? 14 : 13;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = garrison ? 0.75 : 1;
    ctx.shadowColor = '#0008';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 5;
    ART.draw(
      ctx,
      'fleet',
      index,
      0,
      s.fort ? -8 : -4,
      s.capital ? R * 2.8 : s.fort ? R * 2.45 : R * 2.2,
      s.capital ? R * 2.8 : s.fort ? R * 2.45 : R * 2.2,
    );
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#071623';
    ctx.fillRect(-20, 27, 40, 4);
    ctx.fillStyle = '#bcb778';
    ctx.fillRect(-20, 27, (40 * s.shield) / s.maxShield, 4);
    outlinedText(s.name, 0, garrison ? 49 : 43, 11, '#e8e7cc', scale);
    if (!garrison) {
      mapBadge(-25, 20, s.owner, scale);
      for (let i = 0; i < s.tier; i++) {
        ctx.fillStyle = '#d8c581';
        ctx.fillRect(25, 10 - i * 5, 3, 3);
      }
    }
    ctx.restore();
  }
  // WC4-style tokens drawn back to front: base plate, hull ring, ships, stack bars and admiral pins.
  for (const u of game.units.filter(u => u.hp > 0).sort((a, b) => a.r - b.r || a.c - b.c)) {
    const p = animatedPosition(u),
      t = E.TYPES[u.type],
      col = E.FACTIONS[u.side].color,
      sel = selection?.kind === 'unit' && selection.id === u.id,
      spent = u.moved && u.attacked;
    ctx.save();
    ctx.translate(p.x, p.y);
    drawPlate(u, scale);
    ctx.globalAlpha = spent ? 0.62 : 1;
    // Extra hull silhouettes visualize stacks without hiding the readable front hull.
    const size =
      u.type === 'siege'
        ? R * 2.3
        : u.type === 'flagship'
          ? R * 2.2
          : t.branch === 'Battle Line' || t.air
            ? R * 2.0
            : R * 1.85;
    ctx.shadowColor = '#000a';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 4;
    // Air wings are already drawn as a formation, so their stack shows only in the stack bars.
    for (let i = t.air ? 0 : Math.min(u.stack - 1, 2); i >= 0; i--)
      ART.drawShip(
        ctx,
        u.type,
        artSide(u),
        (i ? i * 7 : 0) - 2,
        -6 - i * 8,
        size * (i ? 0.88 : 1),
        size * (i ? 0.88 : 1),
      );
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    if (!t.air && !ART.ready[artSide(u)]) outlinedText(t.code, 0, 3, 13, col, scale);
    drawStackBars(u.stack, u.side, scale);
    if (!u.attacked && u.side === game.player && interactive()) {
      ctx.beginPath();
      ctx.arc(36, 8, Math.max(3, 2.4 / scale), 0, Math.PI * 2);
      ctx.fillStyle = '#6dffa5';
      ctx.fill();
      ctx.strokeStyle = '#06301a';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    if (u.morale < 0) outlinedText(u.morale === -3 ? '!' : '↓', 31, -14, 13, '#ffb78c', scale);
    ctx.restore();
  }
  for (const u of game.units)
    if (u.hp > 0 && u.admiral)
      drawAdmiralPin(u, animatedPosition(u), scale, selection?.kind === 'unit' && selection.id === u.id);
  for (const k of targetCache) {
    const [c, r] = k.split(',').map(Number);
    drawCrosshair(hexCenter({ c, r }), time, scale);
  }
  if (hover) {
    const p = hexCenter(hover),
      u = selectedUnit();
    hexPath(p.x, p.y, R - 1);
    ctx.strokeStyle = '#dcebe769';
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke();
    const pr = u && targetCache.has(E.key(hover)) ? E.preview(game, u.id, hover.c, hover.r) : null;
    if (pr) {
      const a = hexCenter(u);
      drawLine(a.x, a.y, p.x, p.y, '#ff9a6ac0', 1.4 / scale, [6, 6]);
      drawEstimate(p, pr, scale);
    }
  }
  for (const e of effects) {
    e.life -= dt;
    const a = e.from ? hexCenter(e.from) : null,
      b = hexCenter(e.to);
    ctx.globalAlpha = Math.max(0, e.life / e.max);
    if (e.kind === 'beam') {
      drawLine(a.x, a.y, b.x, b.y, e.color, (e.heavy ? 9 : 4) / scale);
      drawLine(a.x, a.y, b.x, b.y, '#fff6dd', (e.heavy ? 3.2 : 1.6) / scale);
      ART.draw(
        ctx,
        'terrain',
        15,
        b.x,
        b.y,
        95 * (1.15 - (e.life / e.max) * 0.45),
        95 * (1.15 - (e.life / e.max) * 0.45),
      );
    } else if (e.kind === 'boom') {
      const grow = 1 - e.life / e.max;
      ART.draw(ctx, 'terrain', 14, b.x, b.y - 6, 70 + grow * 90, 70 + grow * 90);
    } else if (e.kind === 'move') {
      drawLine(a.x, a.y, b.x, b.y, e.color, 2 / scale, [7, 6]);
    } else if (e.kind === 'text') {
      const age = 1 - e.life / e.max,
        pop = e.pop ? 1 + Math.max(0, 1 - age * 7) * 0.7 : 1;
      outlinedText(
        e.text,
        b.x,
        b.y - 28 - age * 28 - (e.dy || 0),
        (e.size || 14) * pop,
        e.color,
        scale,
        'Trebuchet MS',
        true,
      );
    }
    ctx.globalAlpha = 1;
  }
  effects = effects.filter(e => e.life > 0);
  ctx.restore();
}
render();
startMenu();
registerTools();
requestAnimationFrame(frame);
