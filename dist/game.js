'use strict';
const E = Galactic,
  OrdersUI = GalacticOrdersUI,
  $ = id => document.getElementById(id),
  app = $('app'),
  modal = $('modal-root');
let game = E.createGame('empire'),
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
  setup = { side: 'empire', mode: 'conquest', difficulty: 'normal', chapter: {}, conquest: 'conquest:frontier' },
  shop = { station: null, branch: 'Escort', stack: 1 },
  lastTime = 0,
  toastTimer,
  aiToken = 0,
  pointer = null,
  readyCache = new Map(),
  // Air wings: hexes inside friendly air supply, and an out-of-supply move awaiting a second click.
  supplyCache = null,
  airWarned = null,
  targetCache = new Set();
let detailOpen = false,
  saveOk = true,
  shake = 0,
  enemyPlayback = 2,
  skipEnemyPlayback = false;
let airOrder = null,
  stationView = 'overview'; // Independent station overview / aerospace command pages
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
// The admiral whose Admiral Info card is open, so officer orders can refresh it.
let generalOpen = null;
function focusDialog() {
  setTimeout(() => modal.querySelector('button:not(:disabled),select')?.focus(), 15);
}
function closeModal() {
  generalOpen = null;
  modal.innerHTML = '';
  canvas?.focus({ preventScroll: true });
}
function cancelTargeting() {
  OrdersUI.cancel();
  airOrder = null;
}
function newGame() {
  aiToken++;
  hqBack = 'game';
  game = E.applyProfile(E.createGame(setup.side, setup.difficulty, setup.mode, Date.now() >>> 0), loadProfile());
  cancelTargeting();
  stationView = 'overview';
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
  cancelTargeting();
  const saved = getSave();
  modal.innerHTML = `<div class="overlay"><section class="dialog wide" role="dialog" aria-modal="true" aria-label="Campaign setup"><div class="eyebrow">Legend of the Galactic Heroes · WC4-inspired tactics</div><h1>One galaxy.<br>Every hex contested.</h1><p>Build a fleet. Appoint your admirals. Break the enemy line with coordinated firepower—and take the stations that keep the war alive.</p><div class="choice-grid"><button class="faction empire ${setup.side === 'empire' ? 'active' : ''}" data-faction="empire">${ART.portrait('reinhard', 'faction-portrait')}<span class="label gold">The golden lion</span><h3>Galactic Empire</h3><p>Reinhard, Mittermeyer, Reuenthal, and Kircheis. Decisive offensives and rapid breakthroughs.</p><span class="select-mark">${setup.side === 'empire' ? '✓ Command selected' : 'Select the Empire'}</span></button><button class="faction alliance ${setup.side === 'alliance' ? 'active' : ''}" data-faction="alliance">${ART.portrait('yang', 'faction-portrait')}<span class="label cyan">The magician’s fleet</span><h3>Free Planets Alliance</h3><p>Yang, Attenborough, Fischer, and Schönkopf. Counterattacks, maneuver, and boarding operations.</p><span class="select-mark">${setup.side === 'alliance' ? '✓ Command selected' : 'Select the Alliance'}</span></button></div>${campaignScreen()}${conquestRow()}<div class="setup-row"><div><label for="difficulty-select">Difficulty</label><select class="select" id="difficulty-select">${Object.entries(
    E.DIFFICULTIES,
  )
    .map(
      ([k, d]) =>
        `<option value="${k}" ${setup.difficulty === k ? 'selected' : ''}>${d.name}${d.tokens > 1 ? ` · ×${d.tokens} tokens` : ''}</option>`,
    )
    .join(
      '',
    )}</select><p class="mode-note">${E.DIFFICULTIES[setup.difficulty]?.desc || ''}</p></div><div class="hq-summary"><span class="label">Command HQ</span><b>${ICONS.use('token', 'cost-ico')} ${loadProfile().tokens || 0} tokens</b><small>${loadProfile().wins || 0} victories · ${Object.values(loadProfile().research || {}).reduce((a, l) => a + l, 0)} research levels</small><span class="hq-buttons"><button class="small" data-action="research">HQ research</button><button class="small" data-action="generals-start">Admirals</button></span></div></div><div class="badge-row"><span class="badge">${Object.values(E.TYPES).filter(t => !t.air).length} fleet classes · ${Object.keys(E.AIR_STRIKES).length} sortie types</span><span class="badge">${Object.keys(E.ADMIRALS).length} admirals · ${Object.values(E.ADMIRALS).filter(a => a.recruit).length} to recruit</span><span class="badge">${Object.keys(E.TECH_NODES).length} HQ technologies</span><span class="badge">1–3-stack fleets</span></div><div class="dialog-footer"><div>${saved ? '<button data-action="continue">Continue saved game</button>' : ''}<button class="ghost" data-action="help">Field manual</button></div><small>Unofficial fan game. Alternate-history scenarios.<br>Saved in this browser. A new operation replaces your hex-campaign save.</small></div></section></div>`;
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
// WC4-style campaigns: one chapter path per side. A chapter unlocks once the previous chapter is won on any
// difficulty; Conquest (the galactic frontier) is picked separately.
function clearedAny(id, profile = loadProfile()) {
  return Object.keys(E.DIFFICULTIES).some(d => (profile.cleared || {})[`${id}:${d}`]);
}
function chapterUnlocked(side, i, profile = loadProfile()) {
  return i === 0 || clearedAny(E.CAMPAIGNS[side][i - 1], profile);
}
// Tokens still on offer for a first victory at this difficulty (before banked research).
function campaignReward(key, conquest, difficulty, profile) {
  if ((profile.cleared || {})[`${key}:${difficulty}`]) return 0;
  const scale = E.DIFFICULTIES[difficulty]?.tokens || 1,
    t = E.TOKEN_REWARD;
  return Math.round((t.victory + (conquest ? t.conquest : t.star * 3)) * scale) + (profile.wins || 0 ? 0 : t.first);
}
function objectiveFor(id, side) {
  return E.objectiveText({ mode: id, objective: E.SCENARIOS[id].objective, player: side });
}
function campaignScreen() {
  const profile = loadProfile(),
    side = setup.side,
    diff = setup.difficulty,
    best = bestStars(),
    ids = E.CAMPAIGNS[side],
    done = (id, d = diff) => !!(profile.cleared || {})[`${id}:${d}`],
    levels = Object.keys(E.DIFFICULTIES),
    nextLevel = levels[levels.indexOf(diff) + 1],
    unlocked = ids.map((id, i) => chapterUnlocked(side, i, profile)),
    recommended = ids.find((id, i) => unlocked[i] && !done(id)) || null,
    chosen = setup.chapter?.[side],
    sel = chosen && unlocked[ids.indexOf(chosen)] ? chosen : recommended || ids[unlocked.lastIndexOf(true)],
    selIndex = ids.indexOf(sel),
    stars = id => best[starKey(id, diff)] || 0,
    pos = i => ({ x: 6 + (88 * i) / Math.max(1, ids.length - 1), y: i % 2 ? 32 : 68 });
  const path = ids.map((_, i) => `${pos(i).x},${pos(i).y}`).join(' '),
    trail = ids.findIndex(id => !clearedAny(id, profile)),
    reached = trail < 0 ? ids.length : trail + 1,
    donePath = ids
      .slice(0, reached)
      .map((_, i) => `${pos(i).x},${pos(i).y}`)
      .join(' ');
  const nodes = ids
    .map((id, i) => {
      const sc = E.SCENARIOS[id],
        p = pos(i),
        reward = unlocked[i] ? campaignReward(id, false, diff, profile) : 0,
        cls = [
          done(id) ? 'done' : clearedAny(id, profile) ? 'won' : '',
          unlocked[i] ? '' : 'locked',
          id === recommended ? 'recommended' : '',
          id === sel ? 'selected' : '',
        ].join(' ');
      return `<button class="camp-node ${cls}" style="left:${p.x}%;top:${p.y}%" data-campaign="${id}" ${unlocked[i] ? '' : `disabled title="Win chapter ${i} first"`} aria-label="Chapter ${i + 1}: ${esc(sc.name)}${done(id) ? ', completed' : ''}${unlocked[i] ? '' : ', locked'}"><span class="camp-dot">${!unlocked[i] ? '🔒' : done(id) ? '✓' : i + 1}</span><span class="camp-name">${sc.name}</span>${unlocked[i] ? `<span class="camp-stars">${starText(stars(id))}</span>` : ''}${reward ? `<span class="camp-reward">${ICONS.use('token', 'cost-ico')}${reward}</span>` : ''}${id === recommended ? '<span class="camp-flag">Next</span>' : ''}</button>`;
    })
    .join('');
  const sc = E.SCENARIOS[sel],
    selReward = campaignReward(sel, false, diff, profile),
    pips = levels
      .map(
        d =>
          `<span class="camp-pip ${done(sel, d) ? 'on' : ''}" title="${E.DIFFICULTIES[d].name}${done(sel, d) ? ' cleared' : ''}">${E.DIFFICULTIES[d].name[0]}</span>`,
      )
      .join(''),
    completed = ids.filter(id => clearedAny(id, profile)).length;
  const advice = recommended
    ? `Next chapter: <b>${E.SCENARIOS[recommended].name}</b>${recommended === sel ? '' : ` <button class="small" data-campaign="${recommended}">Select</button>`}`
    : nextLevel
      ? `Campaign complete on ${E.DIFFICULTIES[diff].name}. Replay it on <b>${E.DIFFICULTIES[nextLevel].name}</b> for more command tokens.`
      : 'Campaign complete on every difficulty.';
  return `<div class="campaign"><div class="camp-head"><span class="label">${E.FACTIONS[side].name} campaign · ${E.DIFFICULTIES[diff].name}</span><span>${completed} / ${ids.length} chapters won</span></div><div class="campaign-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${path}" class="camp-path"/>${reached > 1 ? `<polyline points="${donePath}" class="camp-path done"/>` : ''}</svg>${nodes}</div><div class="camp-advice">${advice}</div><div class="camp-brief"><span class="label">Chapter ${selIndex + 1} of ${ids.length} · ${sc.year || ''} · ${sc.objective.turns} turns</span><h3>${sc.name}</h3><p>${sc.desc}</p><p class="camp-objective">${objectiveFor(sel, side)}</p><div class="camp-meta"><span>Cleared ${pips}</span><span>Best ${starText(stars(sel))}</span><span>${selReward ? `Reward up to ${ICONS.use('token', 'cost-ico')} <b>${selReward}</b>` : 'Reward claimed at this difficulty'}</span></div><div class="camp-launch"><button class="primary" data-action="start-chapter" data-chapter="${sel}">Launch chapter ${selIndex + 1}</button></div></div><input type="hidden" id="mode-select" value="${sel}"></div>`;
}
function conquestRow() {
  const profile = loadProfile(),
    era = 'frontier',
    reward = campaignReward('conquest:' + era, true, setup.difficulty, profile);
  return `<div class="conquest-row"><div><label for="conquest-select">Conquest · ${E.ERAS.frontier.cols} × ${E.ERAS.frontier.rows} galaxy</label><select class="select" id="conquest-select">${Object.entries(
    E.ERAS,
  )
    .filter(([k]) => k === 'frontier')
    .map(([k, e]) => `<option value="conquest:${k}" ${era === k ? 'selected' : ''}>${e.name} · ${e.year}</option>`)
    .join(
      '',
    )}</select><p class="mode-note">${E.ERAS[era].desc} <b>${E.ERAS[era].rulesText || ''}</b> Played as the ${E.FACTIONS[setup.side].name}.${reward ? ` First win: up to ${reward} command tokens.` : ''}</p></div><button data-action="start-conquest">Launch conquest</button></div>`;
}
function render() {
  const mapFocused = !!canvas && document.activeElement === canvas;
  document.documentElement.style.setProperty('--own', E.FACTIONS[game.player].color);
  const e = game.economy[game.player],
    inc = E.income(game, game.player),
    stations = game.stations.filter(s => s.owner === game.player).length;
  const pageHTML = `<header class="topbar"><div class="brand"><span class="mark" aria-hidden="true">⬡</span><div><h1>Galactic Command</h1><small>LEGEND OF THE GALACTIC HEROES</small></div></div><div class="resources">${resource('credits', 'Credits', 'Credits', e.credits, inc.credits)}${resource('industry', 'Industry', 'Alloy · Shipyard Industry', e.industry, inc.industry)}${resource('research', 'Research', 'Data Chips · Research. Banked research becomes command tokens when you win (5 research = 1 token)', e.science, inc.science)}${resource('token', 'Tokens', 'Command tokens · spent on HQ research, earned by winning operations', loadProfile().tokens || 0)}<div class="resource"><span class="label">Stations</span><b>${stations} <small>/ ${game.stations.length}</small></b></div></div><nav class="top-actions" aria-label="Command menus"><button class="small" data-action="research">Research</button><button class="small" data-action="admirals" ${!interactive() ? `disabled title="${phaseReason()}"` : ''}>Admirals</button><button class="small ghost" data-action="archive">Units</button><button class="small ghost" data-action="enemy-speed" title="Enemy playback speed">AI ${enemyPlayback}×</button><button class="small ghost" data-action="skip-enemy" title="Finish enemy turn without animation waits">Skip AI</button><button class="small ghost sound-toggle" data-action="sound" aria-pressed="${SFX.enabled}" aria-label="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}" title="${SFX.enabled ? 'Mute sound' : 'Unmute sound'}">${SFX.enabled ? '🔊' : '🔇'}</button><button class="small ghost" data-action="help" aria-label="Field manual">?</button><button class="small ghost" data-action="menu" ${game.phase !== game.player ? 'disabled' : ''}>Menu</button></nav></header><div class="workbench"><main class="theater"><div class="theater-head"><div><span class="label" style="color:${E.FACTIONS[game.phase].color}">Turn ${String(game.turn).padStart(2, '0')} · ${E.FACTIONS[game.phase].short} phase</span><h2>${E.modeTitle(game)}</h2></div><p class="objective">${E.objectiveText(game)}${game.objective && game.mode !== 'conquest' ? ` <b>Turn ${game.turn} / ${game.objective.turns}</b>` : ''}</p></div><div class="map-wrap"><canvas id="map" tabindex="0" aria-label="Hex battlefield. Select your fleet using the fleet selector or N. Arrow keys move the hex cursor; Enter selects. Enter moves to a green hex or attacks a red hex. Z undoes the last move. G sets a standing course; C clears it. Drag to pan; plus and minus zoom."></canvas><div class="map-banner" id="map-banner">${game.phase !== game.player ? 'Enemy fleets are maneuvering…' : 'Select a fleet to reveal its movement and firing range.'}</div><div class="map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="fit">Fit</button><button data-action="zoom-in" aria-label="Zoom in">+</button></div><div class="map-legend"><span style="color:var(--gold)"><i class="legend-dot"></i>Empire</span><span style="color:var(--cyan)"><i class="legend-dot"></i>Alliance</span><span style="color:#b8a9cf"><i class="legend-dot"></i>Nebula</span><span>◇ Station</span><span>× Gravity rift</span></div></div><div class="map-caption"><span id="map-caption">Green hex: move · Red hex: attack · G: set standing course · C: clear course · Undo takes back a move before firing</span><span>Drag to pan · Scroll to zoom · <span class="kbd">N</span> next fleet · <span class="kbd">G</span> course · <span class="kbd">C</span> clear course</span></div></main><aside class="side" id="side"></aside><div class="selection-dock" id="selection-dock"></div></div><footer class="footer"><div class="turn-status" id="turn-status"></div><div class="footer-actions"><button class="small" data-action="details">Fleet orders</button><button class="small undo-button" data-action="undo" ${!interactive() || !undoStack.length ? 'disabled' : ''} title="${phaseReason() || (undoStack.length ? 'Return the last moved fleet to where it started (Z)' : 'No move to undo')}">↶ Undo move <span class="kbd">Z</span></button><button class="small" data-action="next" ${!interactive() ? 'disabled' : ''}>Next fleet <span class="kbd">N</span></button><button class="primary end" data-action="end" ${!interactive() ? 'disabled' : ''}>${game.phase === game.player ? 'End turn' : 'Enemy turn…'}</button></div></footer>`;
  // Preserve the live canvas, listeners, camera, and selection dock on routine updates.
  // Only the resource/navigation header and dynamic status sections need DOM replacement.
  if (!canvas || app.querySelector('#map') !== canvas) {
    app.innerHTML = pageHTML;
    canvas = $('map');
    ctx = canvas.getContext('2d');
    attachMap();
  } else {
    const template = document.createElement('template');
    template.innerHTML = pageHTML;
    for (const selector of ['.topbar', '.theater-head', '.map-caption', '.footer']) {
      const current = app.querySelector(selector);
      const next = template.content.querySelector(selector);
      if (current && next && current.innerHTML !== next.innerHTML) current.replaceWith(next);
    }
  }
  updateSelection();
  if (mapFocused) canvas.focus({ preventScroll: true });
}
// Why the player cannot act right now (enemy phase or finished operation).
function selectUnit(id, center = false) {
  const u = game.units.find(v => v.id === id && v.hp > 0);
  if (!u) return;
  cancelTargeting();
  stationView = 'overview';
  selection = { kind: 'unit', id };
  updateSelection();
  if (center) centerOn(u);
}
function selectStation(id, center = false) {
  const s = game.stations.find(v => v.id === id);
  if (!s) return;
  OrdersUI.cancel();
  if (selection?.kind !== 'station' || selection.id !== id) {
    airOrder = null;
    stationView = 'overview';
  }
  selection = { kind: 'station', id };
  updateSelection();
  if (center) centerOn(s);
}
function nextFleet() {
  const ready = ownUnits().filter(u => readyIds.has(u.id));
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
  if (result.breakthrough)
    toast(
      result.canMove ? 'Breakthrough! This fleet can move and fire again.' : 'Breakthrough! This fleet can fire again.',
    );
  else if (result.reposition)
    toast(
      `${result.maneuverSkill || E.ADMIRALS[u.admiral]?.skill || 'Maneuver'}: reposition up to ${result.reposition} hex${result.reposition > 1 ? 'es' : ''}.`,
    );
}
// WC4-style undo: a fleet that moved but has not fired returns to where it started.
// Shared command for the Clear Course button and keyboard shortcut C.
function clearSelectedCourse() {
  const u = selectedUnit();
  if (!u || u.side !== game.player || !interactive() || !u.destination) return false;
  const result = E.clearDestination(game, u.id);
  if (!result.ok) { toast(result.reason); return false; }
  OrdersUI.cancel();
  refreshAndSave();
  toast('Standing course cleared.');
  return true;
}
function undoMove() {
  if (!interactive() || !undoStack.length) return;
  cancelTargeting();
  const { snapshot, unitId } = undoStack.pop();
  game = JSON.parse(snapshot);
  effects = effects.filter(e => e.kind !== 'move');
  selection = { kind: 'unit', id: unitId };
  render();
  save();
  toast('Move undone.');
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pause = ms => new Promise(resolve => setTimeout(resolve, skipEnemyPlayback || reducedMotion() ? 0 : Math.round(ms / enemyPlayback)));
async function endTurn(force = false) {
  if (!interactive()) return;
  const ready = ownUnits().filter(u => E.hasOrders(game, u)).length;
  if (ready && !force) {
    modal.innerHTML = `<div class="overlay"><section class="dialog narrow" role="dialog" aria-modal="true" aria-label="End turn"><div class="eyebrow">Review orders</div><h2>${ready} fleets still have orders.</h2><p>You can end the turn now and leave them holding position, or return to issue their orders.</p><div class="dialog-footer"><button data-action="close">Return to the map</button><button class="primary" data-action="end-confirm">End turn</button></div></section></div>`;
    focusDialog();
    return;
  }
  closeModal();
  cancelTargeting();
  stationView = 'overview';
  undoStack = [];
  skipEnemyPlayback = false;
  save();
  const token = ++aiToken;
  const enemy = E.opponent(game.player);
  let before = unitSnapshot();
  E.beginTurn(game, enemy, game.turn > 1);
  turnStartPopups(before, enemy);
  E.aiProduction(game);
  (game.strikes || []).forEach((s, i) => s.kind === 'air' ? addAirStrikeEffects(s, i * 0.12) : strikeEffects(s, i * 0.5));
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
      if (skipEnemyPlayback) continue;
      if (o.kind === 'attack') addCombatEffects(o, u);
      else {
        SFX.play(E.TYPES[u.type].air ? 'flyby' : 'move', enemy);
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
    }
    if (orders.length && !skipEnemyPlayback) {
      updateSelection();
      await pause(orders.some(o => o.kind === 'attack') ? 420 : 150);
    }
    if (skipEnemyPlayback && ids.indexOf(id) % 16 === 0) await pause(0);
  }
  if (token !== aiToken) return;
  skipEnemyPlayback = false;
  game.turn++;
  before = unitSnapshot();
  E.beginTurn(game, game.player, true);
  turnStartPopups(before, game.player);
  const standing = E.runStandingOrders(game, game.player);
  for (const o of standing) {
    const u = game.units.find(v => v.id === o.id);
    if (!u || !o.from || !o.to) continue;
    SFX.play(E.TYPES[u.type].air ? 'flyby' : 'move', u.side);
    effects.push({
      kind: 'move',
      unitId: u.id,
      from: o.from,
      to: o.to,
      color: E.FACTIONS[u.side].color,
      life: 0.5,
      max: 0.5,
    });
  }
  render();
  save();
  if (game.over) resultDialog();
  else toast(`Turn ${game.turn}. Income collected; fleet orders refreshed.`);
}
// When an operation ends, its medals join the profile's medal case and a win pays command tokens, exactly once.
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
  if (OrdersUI.active() != null) {
    const id = OrdersUI.active(),
      unit = game.units.find(u => u.id === id && u.hp > 0);
    if (!unit || unit.side !== game.player || !interactive() ||
        selection?.kind !== 'unit' || selection.id !== id) {
      OrdersUI.cancel();
      toast('Standing order cancelled.');
      updateSelection();
      return;
    }
    const order = E.setDestination(game, id, p.c, p.r);
    if (!order.ok) {
      toast(order.reason);
      return;
    }
    OrdersUI.cancel();
    selection = { kind: 'unit', id };
    refreshAndSave();
    toast(order.arrived ? 'Fleet is already at that sector.' : `Course set for [${p.c},${p.r}]. Automatic movement begins next turn.`);
    return;
  }
  const fort = selectedStation();
  if (fort && airOrder?.stationId === fort.id && interactive() && targetCache.has(E.key(p))) {
    const fired = E.airStrike(game, fort.id, airOrder.type, p.c, p.r);
    if (!fired.ok) { toast(fired.reason); updateSelection(); return; }
    addAirStrikeEffects(fired);
    refreshAndSave();
    toast(`${E.AIR_STRIKES[fired.type].name}: ${fired.unitDamage} hull, ${fired.shieldDamage} shield damage.`);
    return;
  }
  if (fort && !airOrder && interactive() && targetCache.has(E.key(p))) {
    fireFortressAt(fort, p); return;
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
      if (supplyCache && !supplyCache.has(E.key(p)) && u.admiral !== 'konev' && airWarned !== E.key(p)) {
        airWarned = E.key(p);
        toast(
          `⚠ Outside air supply (${E.airSupply(game, u.side)} hexes from an air base): this wing loses 10% hull each turn it starts there. Click again to move.`,
        );
        return;
      }
      const snapshot = JSON.stringify(game),
        result = E.move(game, u.id, p.c, p.r);
      if (result.ok) {
        SFX.play(E.TYPES[u.type].air ? 'flyby' : 'move', u.side);
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
  cancelTargeting();
  if (hit) selectUnit(hit.id);
  else if (station) selectStation(station.id);
  else {
    selection = { kind: 'tile', c: p.c, r: p.r };
    updateSelection();
  }
}
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

render();
startMenu();
registerTools();
requestAnimationFrame(frame);
