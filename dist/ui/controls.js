'use strict';
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
      canvas.style.cursor = OrdersUI.active() != null ? 'crosshair' : readyCache.has(E.key(hover)) || targetCache.has(E.key(hover)) ? 'pointer' : 'default';
      const u = E.unitAt(game, hover),
        s = E.stationAt(game, hover),
        own = selectedUnit(),
        fort = selectedStation(),
        pr = own && targetCache.has(E.key(hover)) ? E.preview(game, own.id, hover.c, hover.r) : null,
        sortie = fort && airOrder?.stationId === fort.id && targetCache.has(E.key(hover))
          ? E.airStrikePreview(game, fort.id, airOrder.type, hover.c, hover.r) : null;
      $('map-caption').textContent =
        OrdersUI.active() != null
          ? 'Set course: click a navigable sector · Esc cancels'
          : supplyCache && readyCache.has(E.key(hover)) && !supplyCache.has(E.key(hover)) && own?.admiral !== 'konev'
          ? `⚠ Outside air supply · −10% hull at the start of each turn here · nearest coverage ${E.airSupply(game, own.side)} hexes from a friendly air base`
          : sortie
            ? `${E.AIR_STRIKES[airOrder.type].name} · ~${sortie.unit} hull / ${sortie.shield} shield damage · ${sortie.cost.credits} credits / ${sortie.cost.industry} industry`
          : fort && !airOrder && u && targetCache.has(E.key(hover))
            ? `Click to fire ${E.fortressName(fort)} at ${E.TYPES[u.type].short} · ~${E.fortressDamage(game, u, fort.owner)} damage`
            : pr
              ? `Click to attack ${u ? E.TYPES[u.type].short : s.name} · ~${pr.unit || pr.shield} damage · ${pr.counterAllowed ? pr.counter + ' counter-fire' : 'no counter-fire'}`
              : E.corridorLocked(game, hover, own?.side || game.player)
                ? `Hex ${hover.c}, ${hover.r} · Shielded corridor gate: bombard Iserlohn or Fezzan to open flanking lanes`
                : `Hex ${hover.c}, ${hover.r} · ${u ? E.TYPES[u.type].short + ' · ' : ''}${s ? s.name + ' · ' : ''}${hover.terrain === 'space' ? 'Deep space' : hover.terrain === 'rift' ? 'Impassable rift' : hover.terrain === 'nebula' ? 'Nebula · cost 2 · attrition' : 'Asteroids · cost 2 · −15% damage'}`;
    }
  };
  canvas.onpointerup = e => {
    if (pointer && !pointer.dragged) {
      // A click on an admiral's map portrait opens their Admiral Info, unless it lands on a move or attack hex.
      const p = hitHex(e.clientX, e.clientY),
        pin = hitPin(e.clientX, e.clientY);
      if (pin && OrdersUI.active() == null && !(p && (targetCache.has(E.key(p)) || readyCache.has(E.key(p)))))
        generalDialog(pin.admiral, !!pin.personal);
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

let helpBack = 'game';
// Close buttons and Escape follow the same navigation path through HQ and setup.
function dismissDialog(action = 'close') {
  if (action === 'help-close' && helpBack === 'start') startMenu();
  else if (action === 'research-close' && researchBack === 'start') startMenu();
  else if (action === 'research-close' && researchBack === 'result') resultDialog();
  else if (action === 'general-close' && hqBack === 'start') generalsDialog();
  else if (action === 'generals-close' && hqBack === 'start') startMenu();
  else closeModal();
}
document.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'mode-select' && e.target.tagName === 'SELECT') {
    setup.mode = e.target.value;
    startMenu();
    $('mode-select')?.focus();
  }
  if (id === 'conquest-select') {
    setup.conquest = e.target.value;
    startMenu();
    $('conquest-select')?.focus();
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
    generalDialog(portrait.dataset.general, portrait.dataset.personal === '1');
    return;
  }
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.action === 'enemy-speed') { enemyPlayback = enemyPlayback === 1 ? 2 : enemyPlayback === 2 ? 4 : 1; render(); return; }
  if (d.action === 'skip-enemy') { skipEnemyPlayback = true; effects = []; toast('Completing enemy turn…'); return; }
  if (d.campaign) {
    (setup.chapter ||= {})[setup.side] = d.campaign;
    startMenu();
    return;
  }
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
  if (d.airType) {
    const station = game.stations.find(s => s.id === +d.airStation), strike = E.AIR_STRIKES[d.airType];
    if (!station || !strike || station.owner !== game.player || !interactive() || (station.air || 0) < strike.level) return;
    cancelTargeting();
    airOrder = { stationId: station.id, type: d.airType };
    stationView = 'air';
    detailOpen = true;
    selection = { kind: 'station', id: station.id };
    updateSelection();
    toast(`${strike.name}: select a red target to pay and launch. Unlimited sorties.`);
    canvas?.focus({ preventScroll: true }); return;
  }
  if (d.shop) { openShop(+d.shop); return; }
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
      cancelTargeting();
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
  // HQ orders work on the profile; inside an operation, your admirals there are refreshed at once.
  const hqOrder =
    (d.recruitAdmiral && (p => E.recruitAdmiral(p, d.recruitAdmiral))) ||
    (d.buyStar && (p => E.buyStar(p, d.officer, d.buyStar))) ||
    (d.promote && (p => E.promote(p, d.promote))) ||
    (d.equip && (p => E.equipMedal(p, d.officer, d.equip))) ||
    (d.unequip && (p => E.unequipMedal(p, d.officer, d.unequip)));
  if (hqOrder) {
    const p = loadProfile(),
      r = hqOrder(p);
    if (!r.ok) {
      toast(r.reason);
      return;
    }
    saveProfile(p);
    if (hqBack === 'game') {
      E.applyRoster(game, p);
      undoStack = [];
      render();
      save();
    }
    if (generalOpen) generalDialog(generalOpen.k, generalOpen.personal);
    else generalsDialog();
    const k = d.recruitAdmiral || d.officer || d.promote,
      name = E.ADMIRALS[k].short;
    toast(
      d.recruitAdmiral
        ? `${E.ADMIRALS[k].name} joins your admirals.`
        : d.buyStar
          ? `${name}: ${r.stars}★ ${E.RATING_NAMES[d.buyStar]}.`
          : d.promote
            ? `${name} promoted to ${E.RANKS[r.rank]}.`
            : `${name}'s medals updated.`,
    );
    return;
  }
  if (d.generalOpen) {
    generalDialog(d.generalOpen, true);
    return;
  }
  if (d.generalsSide) {
    generalsDialog(d.generalsSide);
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
    case 'air-sorties': {
      const station = selectedStation();
      if (!station || station.owner !== game.player || !interactive()) break;
      cancelTargeting();
      stationView = 'air';
      detailOpen = true;
      updateSelection();
      break;
    }
    case 'station-overview':
      stationView = 'overview';
      cancelTargeting();
      detailOpen = true;
      updateSelection();
      break;
    case 'cancel-air':
      cancelTargeting();
      updateSelection();
      break;
    case 'close-panel':
      detailOpen = false;
      stationView = 'overview';
      cancelTargeting();
      updateSelection();
      break;
    case 'details':
      detailOpen = !detailOpen;
      updateSelection();
      break;
    case 'start':
      setup.mode = $('mode-select').value;
      newGame();
      break;
    case 'start-chapter': {
      const side = E.SCENARIOS[d.chapter]?.side,
        i = E.CAMPAIGNS[side]?.indexOf(d.chapter);
      if (i == null || i < 0 || !chapterUnlocked(side, i)) {
        toast('Win the previous chapter first.');
        break;
      }
      setup.side = side;
      setup.mode = d.chapter;
      newGame();
      break;
    }
    case 'start-conquest':
      setup.conquest = $('conquest-select').value;
      setup.mode = setup.conquest;
      newGame();
      break;
    case 'continue': {
      const s = getSave();
      if (s) {
        aiToken++;
        hqBack = 'game';
        game = E.applyProfile(s, loadProfile());
        cancelTargeting();
        stationView = 'overview';
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
      dismissDialog(d.action);
      break;
    case 'help':
      helpBack = $('mode-select') ? 'start' : 'game';
      helpDialog();
      break;
    case 'help-close':
      dismissDialog(d.action);
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
      dismissDialog(d.action);
      break;
    case 'general-close':
      dismissDialog(d.action);
      break;
    case 'generals':
      generalsDialog(hqBack === 'game' ? game.player : generalsSide);
      break;
    case 'generals-start':
      hqBack = 'start';
      generalsDialog(setup.side);
      break;
    case 'generals-close':
      dismissDialog(d.action);
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
    case 'course': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive()) {
        cancelTargeting();
        OrdersUI.begin(u.id);
        updateSelection();
        canvas?.focus({ preventScroll: true });
        toast('Set course: click any navigable sector. The fleet will move toward it at the start of future turns.');
      }
      break;
    }
    case 'course-clear':
      clearSelectedCourse();
      break;
    case 'wait': {
      const u = selectedUnit();
      if (u && u.side === game.player && interactive()) {
        E.clearDestination(game, u.id);
        OrdersUI.cancel();
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
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset?.general) {
    e.preventDefault();
    generalDialog(e.target.dataset.general, e.target.dataset.personal === '1');
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
      const close = modal.querySelector('button.close[data-action]');
      dismissDialog(close?.dataset.action || 'close');
    }
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const u = selectedUnit();
    if (u?.destination && u.side === game.player && interactive()) {
      e.preventDefault();
      clearSelectedCourse();
    }
  }
  if (k === 'g') {
    const u = selectedUnit();
    if (u && u.side === game.player && interactive()) {
      e.preventDefault();
      cancelTargeting();
      OrdersUI.begin(u.id);
      updateSelection();
      toast('Set course: click a navigable sector. Esc cancels.');
    }
  }
  if (k === 'n') {
    e.preventDefault();
    nextFleet();
  }
  if (k === 'z') {
    e.preventDefault();
    undoMove();
  }
  if (k === 'escape') {
    if (airOrder) {
      airOrder = null; updateSelection(); toast('Sortie targeting cancelled.');
    } else if (OrdersUI.active() != null) {
      OrdersUI.cancel();
      updateSelection();
      toast('Standing order cancelled.');
    } else {
      selection = null;
      updateSelection();
    }
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
