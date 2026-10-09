'use strict';
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
function holdReason(u) {
  return E.hasOrders(game, u) ? null : 'Orders complete';
}
function moveStatus(u) {
  if (u.side !== game.player || game.phase !== game.player) return u.moved ? 'Moved' : 'Move ready';
  if (E.reachable(game, u).size) return 'Move ready';
  return u.attacked && !u.sortie ? 'Fired · cannot move' : u.moved ? 'Moved' : 'No open hex';
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
// Fleets that still have an order besides holding position, refreshed whenever the selection or map changes.
let readyIds = new Set();
function hasOrders(u) {
  return game.phase === game.player ? readyIds.has(u.id) : !u.attacked;
}
function updateSelection() {
  readyIds = new Set(
    ownUnits()
      .filter(u => E.hasOrders(game, u))
      .map(u => u.id),
  );
  const u = selectedUnit();
  readyCache = u && u.side === game.player ? E.reachable(game, u) : new Map();
  supplyCache = null;
  airWarned = null;
  const st = selectedStation();
  targetCache = new Set(
    u && u.side === game.player && !u.attacked && u.morale > -3
      ? E.targets(game, u).map(E.key)
      : st && st.owner === game.player && interactive()
        ? airOrder?.stationId === st.id ? E.airStrikeTargets(game, st.id, airOrder.type).map(E.key) : E.fortressTargets(game, st).map(E.key)
        : [],
  );
  $('side').innerHTML =
    '<button class="drawer-close small" data-action="close-panel" aria-label="Close orders panel">×</button>' + panel();
  $('side').classList.toggle('open', detailOpen);
  $('selection-dock').innerHTML = dockHTML();
  const ready = readyIds.size;
  $('turn-status').innerHTML = game.over
    ? 'Operation concluded'
    : `${ready} fleets ready <small>${E.FACTIONS[game.player].short} · ${E.DIFFICULTIES[game.difficulty]?.name || 'Normal'} · ${saveOk ? 'autosaved' : 'not saved'}</small>`;
  $('map-banner').textContent =
    OrdersUI.active() != null
      ? 'SET COURSE · Click a destination sector · Esc to cancel'
      : airOrder && interactive()
      ? `AIRSTRIKE · ${E.AIR_STRIKES[airOrder.type].name} · Click a red target · Esc cancels`
      : game.phase !== game.player
      ? 'Enemy fleets are maneuvering…'
      : game.over
        ? 'Operation concluded'
        : st && stationView === 'air'
          ? `${st.name} · Aerospace command · choose a sortie`
        : u?.side === game.player
          ? `${u.admiral ? E.ADMIRALS[u.admiral].short + ' · ' : ''}${E.TYPES[u.type].short} ×${u.stack}${u.morale <= -3 ? ' · In confusion' : u.side === game.player && !hasOrders(u) ? ' · Orders complete' : ''}`
          : selectedStation()
            ? `${selectedStation().name} · ${selectedStation().owner === game.player ? 'Shipyard and air sorties available' : 'Breach shields before capture'}`
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
        `<option value="${v.id}" ${u?.id === v.id ? 'selected' : ''}>${v.admiral ? E.ADMIRALS[v.admiral].short + ' · ' : ''}${E.TYPES[v.type].short} ×${v.stack} [${v.c},${v.r}]${!hasOrders(v) ? ' · spent' : ''}</option>`,
    )
    .join('')}</select>`;
  if (s && stationView === 'air' && s.owner === game.player) return airPanel(s);
  let main = '';
  if (u) {
    const t = E.TYPES[u.type],
      ours = u.side === game.player,
      st = E.stationAt(game, u),
      a = E.ADMIRALS[u.admiral];
    main = `<section>${fleetPicker}<div class="side-title"><span class="label">${t.branch}</span><span class="chip" style="color:${E.FACTIONS[u.side].color}">${E.FACTIONS[u.side].short}</span></div>${ART.ship(u.type, 'panel-ship', artSide(u))}<h2 class="unit-name">${a && u.type === 'flagship' ? a.hull : t.name}</h2><p class="description">${a && u.type === 'flagship' ? t.name + ' · ' : ''}${t.desc}</p><div class="hp-row">${ICONS.hp(u.hp, E.maxHP(u), 'hp-ring-lg')}<span>Hull integrity</span><span class="mono">${Math.ceil(u.hp)} / ${E.maxHP(u)}</span></div><div class="stat-grid"><div><span class="label">${ICONS.use('atk')} Attack</span><b>${Math.round(t.attack * (1 + 0.45 * (u.stack - 1)))}</b></div><div><span class="label">${ICONS.use('def')} Armor</span><b>${t.armor}</b></div><div><span class="label">${ICONS.use('mov')} Move</span><b>${E.movement(game, u)}</b></div><div><span class="label">${ICONS.use('rng')} Range</span><b>${rangeText(u)}</b></div><div><span class="label">Stack</span><b>${u.stack}/${t.elite ? 1 : 3}</b></div><div><span class="label">Veteran</span><b>${u.xp}/5</b></div></div><div class="status-line"><span class="status ${moveStatus(u) === 'Move ready' ? 'ready' : 'spent'}">${moveStatus(u)}</span><span class="status ${fireStatus(u) === 'Fire ready' ? 'ready' : 'spent'}">${fireStatus(u)}</span><span class="status">${moraleName(u.morale)}</span></div>${a ? admiralCard(u) : ''}${ours ? `<div class="actions">${!a ? act('data-action="assign"', 'Assign admiral', phaseReason(), 'Choose an officer') : ''}${a?.trait === 'magician' ? act('data-action="confuse"', 'Confusion', phaseReason() || E.confuseReason(game, u), '−2 morale · 2 hex radius', '', false) : ''}${act('data-action="reinforce"', 'Add a stack', phaseReason() || E.reinforceReason(game, u), costHTML(E.reinforceCost(u.type)))}${act('data-action="repair"', 'Repair fleet', phaseReason() || E.repairReason(game, u), '+35% HP · ' + costHTML({ credits: E.repairCost(u, game) }))}${act('data-action="course"', OrdersUI.label(u), phaseReason(), OrdersUI.detail(u), '', false)}${u.destination ? act('data-action="course-clear"', 'Clear course (C)', phaseReason(), 'Stop automatic movement · C', '', false) : ''}${act('data-action="wait"', 'Hold position', phaseReason() || holdReason(u), 'Finish this fleet’s turn')}</div><p class="description" style="font-size:11px">Repair and stacking require a friendly station within 1 hex and consume this fleet’s turn.</p>` : ''}${st ? `<div class="section-divider"><span class="label">Station beneath fleet</span><div class="station-buttons"><button data-station="${st.id}">${st.name} · Tier ${st.tier}</button>${st.owner === game.player ? `<button data-shop="${st.id}" ${!interactive() ? 'disabled' : ''}>Shipyard</button>` : ''}</div></div>` : ''}</section>`;
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
      )}</div>${ours ? `<div class="actions">${act(`data-shop="${s.id}"`, 'Open shipyard', shipyardReason(s), 'Build a fleet', 'primary')}${act('data-action="air-sorties"', 'Aircraft Sorties', phaseReason(), `Open air operations · Air Base ${s.air || 0}`, 'small')}</div><p class="description">One fleet per station per turn. New fleets act next turn. Garrisons repair 8% hull here each turn.</p>` : '<p class="description">Reduce defenses to zero and eliminate any garrison, then enter with an Escort or Battle Line unit to capture. Artillery cannot capture stations.</p>'}</section>`;
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
    `<section class="section-divider"><span class="label">${selectedTile ? 'Hex ' + selectedTile.c + ', ' + selectedTile.r : 'Theater intelligence'}</span><p class="description">${selectedTile ? terrainDescription(selectedTile) : 'Iserlohn and Fezzan are the only crossings through the central gravity rift.'}</p><label class="label" for="station-select">Station directory</label><select class="select unit-select" id="station-select"><option value="">Inspect station…</option>${game.stations.map(s => `<option value="${s.id}">${s.name} · ${E.FACTIONS[s.owner].short}</option>`).join('')}</select></section><section class="section-divider dispatches"><span class="label">Command dispatches</span>${game.log
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
function airPanel(station) {
  if (station.owner !== game.player) return '';
  const active = airOrder?.stationId === station.id ? airOrder.type : null;
  return `<section class="air-operations"><div class="airstrike-heading">
    <button class="small ghost airstrike-back" data-action="station-overview">← Station overview</button>
    <span class="label">Aerospace command · ${esc(station.name)}</span>
    <h2>Aircraft Sorties</h2>
    <p class="description">Air Base Level ${station.air || 0} · Unlimited sorties per turn, with a resource cost for each launch. Click a type, then a red hex on the map.</p>
    <div class="cost">${costHTML(game.economy[game.player], true)}</div>
    </div>
    <div class="airstrike-panel"><h3>Available sorties</h3>
    <div class="airstrike-options">${Object.entries(E.AIR_STRIKES).map(([type, strike]) => {
      const price = E.airStrikeCost(game, game.player, type),
        locked = (station.air || 0) < strike.level, funds = game.economy[game.player],
        poor = price.credits > funds.credits || price.industry > funds.industry,
        why = phaseReason() || (locked ? `Requires Air Base ${strike.level}` : poor ? 'Insufficient resources' : null);
      return `<div class="airstrike-option ${active === type ? 'armed' : ''}">
        ${ART.ship(type, 'airstrike-thumbnail', game.player)}
        <div class="airstrike-info"><b>${strike.name}</b><small>Air Base ${strike.level} · Range ${E.airStrikeRange(game, game.player, type)} · ${strike.desc}</small>${costHTML(price)}</div>
        <button class="small ${active === type ? 'primary' : ''}" data-air-type="${type}" data-air-station="${station.id}" ${why ? `disabled title="${esc(why)}"` : ''}>${active === type ? 'Targeting…' : 'Select'}</button>
      </div>`;
    }).join('')}</div>
    ${active ? '<button class="small ghost" data-action="cancel-air">Cancel targeting</button><p>Click a red target. You can launch again immediately.</p>' : ''}
  </div></section>`;
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

function dockHTML() {
  const u = selectedUnit(),
    s = selectedStation();
  if (u) {
    const t = E.TYPES[u.type],
      a = E.ADMIRALS[u.admiral],
      ours = u.side === game.player,
      canUndo = ours && interactive() && undoStack.at(-1)?.unitId === u.id;
    return `<div class="dock-visual">${ART.ship(u.type, '', artSide(u))}${a ? generalPortrait(u.admiral, 'dock-portrait', !!u.personal) : ''}<span class="faction-flag ${u.side}">${u.side === 'empire' ? 'I' : u.side === 'alliance' ? 'A' : 'R'}</span></div><div class="dock-unit"><span class="label">${a ? a.short + ' · ' : ''}${t.branch} · ×${u.stack}</span><strong>${a && u.type === 'flagship' ? a.hull : t.short}</strong><div class="dock-stats">${ICONS.hp(u.hp, E.maxHP(u))}${statRow(u, t)}</div><p>${Math.ceil(u.hp)} / ${E.maxHP(u)} hull · ${moraleName(u.morale)}${ours ? ' · ' + fireStatus(u) : ''}</p></div><div class="dock-actions">${canUndo ? '<button class="small undo-button" data-action="undo">↶ Undo move</button>' : ''}<button class="small" data-action="details">${ours ? 'Orders & upgrades' : 'Fleet details'}</button>${ours && !u.admiral ? '<button class="small" data-action="assign">Assign admiral</button>' : ''}${ours && u.admiral === 'yang' ? act('data-action="confuse"', 'Confusion', phaseReason() || E.confuseReason(game, u), '', 'small', false) : ''}${ours ? act('data-action="course"', OrdersUI.label(u), phaseReason(), OrdersUI.detail(u), 'small', false) : ''}${ours && u.destination ? act('data-action="course-clear"', 'Clear course (C)', phaseReason(), '', 'small ghost', false) : ''}${ours ? act('data-action="wait"', 'Hold position', phaseReason() || holdReason(u), '', 'small ghost') : ''}</div>`;
  }
  if (s) {
    const ours = s.owner === game.player;
    return `<div class="dock-visual">${ART.ship(s.capital ? 'capital' : s.fort ? 'fortress' : 'station')}<span class="faction-flag ${s.owner}">${s.owner === 'empire' ? 'I' : s.owner === 'alliance' ? 'A' : 'N'}</span></div><div class="dock-unit"><span class="label">${s.fort ? 'Fortress' : s.capital ? 'Capital' : 'Sector hub'} · Shipyard ${s.tier}</span><strong>${s.name}</strong><div class="dock-health"><div class="bar"><i style="width:${(s.shield / s.maxShield) * 100}%"></i></div><span>${Math.ceil(s.shield)} / ${s.maxShield} DEF</span></div><p>Income +${s.income} &nbsp; Industry +${s.industry}</p></div><div class="dock-actions">${ours ? act(`data-shop="${s.id}"`, 'Shipyard', shipyardReason(s), '', 'primary') : ''}${ours ? '<button class="small" data-action="air-sorties">Air Sorties</button>' : ''}<button class="small" data-action="station-overview">Station details</button></div>`;
  }
  return `<div class="dock-idle"><span class="label">Fleet command</span><strong>Select a fleet or station</strong><p>Click a ship to move and attack. Click a station to build.</p></div><div class="dock-actions"><button class="small" data-action="next">Select a ready fleet</button><button class="small ghost" data-action="details">Fleet directory</button></div>`;
}
const artSide = u => u.art || (u.side === 'neutral' ? 'empire' : u.side);
