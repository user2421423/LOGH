/* Scenario and Conquest setup; dependencies injected by the deterministic engine. */
(function (root) {
  'use strict';
  (root.GalacticData ||= {}).createGameFactory = function createGameFactory(deps) {
    const { ERAS, SCENARIOS, DIFFICULTIES, TYPES, ADMIRALS, opponent, random, tile, adjacent, newUnit,
      income, harden, maxHP, defaultOfficer, log, bindObjectiveFleet } = deps;
  function createGame(player = 'alliance', difficulty = 'normal', mode = 'conquest', seed = 246801) {
    let era = null,
      scen = null;
    if (mode === 'conquest' || String(mode).startsWith('conquest:')) era = String(mode).split(':')[1] || 'frontier';
    else scen = String(mode).replace('scenario:', '');
    if (era && !ERAS[era]) era = 'frontier';
    if (scen && !SCENARIOS[scen]) scen = 'iserlohn';
    const def = scen ? SCENARIOS[scen] : null,
      // Some scenarios are fought on a former Conquest start date's map (conquestMap), with their own objective.
      mapEra = era || def?.conquestMap || null;
    if (def?.side) player = def.side;
    const g = {
      version: 2,
      rulesVersion: 12,
      player,
      difficulty,
      mode: era ? 'conquest' : scen,
      era,
      objective: def ? { ...def.objective } : null,
      retired: (mapEra && ERAS[mapEra].retired) || def?.retired || [],
      seed,
      cols: def ? def.cols : ERAS[era].cols || 17,
      rows: def ? def.rows : ERAS[era].rows || 11,
      turn: 1,
      phase: player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      strikes: [],
      economy: {
        empire: { credits: 300, industry: 120, science: 40 },
        alliance: { credits: 300, industry: 120, science: 40 },
      },
      tech: { empire: {}, alliance: {}, neutral: {} },
      officers: Object.fromEntries(Object.keys(ADMIRALS).map(k => [k, defaultOfficer(k)])),
      roster: {},
      medalInventory: [],
      medalsEarned: [],
      over: null,
      stats: {},
    };
    const enemy = opponent(player);
    // Each Conquest start date has its own geography: terrain mix, rift crossings and asteroid belts.
    const eraSpec = mapEra ? ERAS[mapEra] : null,
      mix = eraSpec?.terrain || { nebula: 0.085, asteroid: 0.075 },
      rift = eraSpec ? (eraSpec.rift === undefined ? { col: 8, open: [2, 5, 8] } : eraSpec.rift) : null;
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const n = random(g);
        let terrain = n < mix.nebula ? 'nebula' : n < mix.nebula + mix.asteroid ? 'asteroid' : 'space';
        const riftCols = rift ? (rift.cols || [rift.col]) : [];
        if (rift && riftCols.includes(c) && !rift.open.includes(r)) terrain = 'rift';
        if (eraSpec?.band?.cols.includes(c) && random(g) < eraSpec.band.chance) terrain = eraSpec.band.terrain;
        g.tiles.push({
          c,
          r,
          terrain,
          owner: mapEra
            ? c < (g.cols - 1) / 2 - 1
              ? 'empire'
              : c > (g.cols - 1) / 2 + 1
                ? 'alliance'
                : 'neutral'
            : 'neutral',
        });
      }
    function claim(p, owner) {
      for (const t of [tile(g, p.c, p.r), ...adjacent(g, p)]) if (t.terrain !== 'rift') t.owner = owner;
    }
    function station(name, c, r, owner, tier, capital = false, fort = false) {
      const s = {
        id: g.stations.length,
        name,
        c,
        r,
        owner,
        tier,
        lab: capital ? 1 : 0,
        air: capital || fort ? 1 : 0,
        capital,
        fort,
        shield: fort ? 450 : capital ? 260 : 150,
        maxShield: fort ? 450 : capital ? 260 : 150,
        income: capital ? 60 : fort ? 40 : 25 + 15 * tier,
        industry: capital ? 30 : 10 * tier,
        science: capital ? 10 : 6,
        producedTurn: 0,
      };
      g.stations.push(s);
      tile(g, c, r).terrain = 'space';
      tile(g, c, r).owner = owner;
      return s;
    }
    // The galactic frontier is data-driven from engine/galaxy.js so the large Conquest map stays out of the rules core.
    function buildFrontier() {
      const spec = ERAS.frontier,
        W = g.cols - 1;
      for (const [name, c, r, owner, tier, capital = false, fort = false] of spec.stations || [])
        claim(station(name, c, r, owner, tier, capital, fort), owner);

      // Keep ordinary frontier worlds economically meaningful without letting 44 shipyards create runaway income.
      // Capitals / fortresses retain their normal yields; minor hubs are scaled down for the expanded map.
      for (const s of g.stations) {
        if (s.capital || s.fort || s.owner === 'neutral') continue;
        s.income = s.tier >= 2 ? 26 : 18;
        s.industry = s.tier >= 2 ? 14 : 8;
        s.science = s.tier >= 2 ? 5 : 3;
      }

      const leads = {
        empire: ['reinhard', 'mittermeyer', 'reuenthal', 'kircheis'],
        alliance: ['yang', 'attenborough', 'fischer', 'schonkopf'],
      };
      for (const side of ['empire', 'alliance']) {
        const at = x => (side === 'empire' ? x : W - x),
          admirals = leads[side];
        for (const [type, x, r, stack, admiralIndex] of spec.fleets || [])
          if (!TYPES[type].air) newUnit(g, type, side, at(x), r, stack, admiralIndex == null ? null : admirals[admiralIndex]);
      }

      // The expanded front starts with a little more treasury, but total income is intentionally kept near the
      // old map's scale so the extra shipyards create strategic choice rather than exponential fleet spam.
      // Equalize base-map per-turn yields despite asymmetric named fortresses.
      const impYield = income(g, 'empire'),
        allyYield = income(g, 'alliance'),
        weaker = impYield.credits + impYield.industry + impYield.science > allyYield.credits + allyYield.industry + allyYield.science
          ? g.stations.find(s => s.name === 'Heinessen')
          : g.stations.find(s => s.name === 'Odin'),
        strong = weaker.owner === 'alliance' ? impYield : allyYield,
        weak = weaker.owner === 'alliance' ? allyYield : impYield;
      weaker.income += strong.credits - weak.credits;
      weaker.industry += strong.industry - weak.industry;
      weaker.science += strong.science - weak.science;

      g.economy.empire = { credits: 500, industry: 180, science: 45 };
      g.economy.alliance = { credits: 500, industry: 180, science: 45 };
    }
    const place = ([side, type, c, r, stack = 1, admiral = null, art = null]) => {
      if (TYPES[type].air) return null;
      const u = newUnit(g, type, side, c, r, stack, admiral);
      if (art) u.art = art;
      return u;
    };
    const setEconomy = eco => {
      for (const [side, [credits, industry]] of Object.entries(eco || {}))
        Object.assign(g.economy[side], { credits, industry });
    };
    if (mapEra === 'frontier') buildFrontier();
    else if (mapEra) {
      station('Odin', 1, 5, 'empire', 3, true);
      station('Valhalla', 3, 8, 'empire', 2);
      station('Geiersburg', 4, 2, 'empire', 2, false, true);
      station('Kempff', 5, 5, 'empire', 1);
      station('Iserlohn', 8, 2, 'neutral', 3, false, true);
      station('Fezzan', 8, 8, 'neutral', 2);
      station('Vermilion', 8, 5, 'neutral', 1);
      station('El Facil', 11, 2, 'alliance', 1);
      station('Rantemario', 11, 7, 'alliance', 2);
      station('Amritsar', 13, 4, 'alliance', 2);
      station('Heinessen', 15, 6, 'alliance', 3, true);
      station('Doria', 14, 9, 'alliance', 1);
      // The Alliance holds one extra hub; Imperial worlds yield more so both sides start with equal income.
      const ally = income(g, 'alliance'),
        imp = income(g, 'empire'),
        valhalla = g.stations.find(s => s.name === 'Valhalla'),
        kempff = g.stations.find(s => s.name === 'Kempff');
      valhalla.income += Math.ceil((ally.credits - imp.credits) / 2);
      kempff.income += Math.floor((ally.credits - imp.credits) / 2);
      kempff.industry += ally.industry - imp.industry;
      valhalla.science += ally.science - imp.science;
      const spec = ERAS[mapEra];
      g.rules = spec.rules || null;
      for (const name of spec.removeStations || []) {
        const gone = g.stations.find(s => s.name === name);
        if (rift && (rift.cols || [rift.col]).includes(gone.c)) tile(g, gone.c, gone.r).terrain = 'rift';
        g.stations = g.stations.filter(s => s !== gone);
      }
      g.stations.forEach((s, i) => (s.id = i));
      for (const [name, owner] of Object.entries(spec.owners || {})) {
        const s = g.stations.find(s => s.name === name);
        s.owner = owner;
        claim(s, owner);
        if (owner === 'neutral' && g.rules?.rebelShield)
          s.maxShield = s.shield = Math.round(s.maxShield * g.rules.rebelShield);
      }
      spec.units.forEach(place);
      // Astarte: the Imperial fleets open the battle with high morale.
      if (g.rules?.morale) {
        for (const u of g.units) if (u.side === g.rules.morale.side) u.morale = g.rules.morale.value;
      }
      setEconomy(spec.economy);
    } else if (def?.layout) {
      const L = def.layout;
      g.tiles.forEach(t => (t.owner = t.c < L.split ? L.owners[0] : L.owners[1]));
      for (const [name, c, r, owner, tier, capital = false, fort = false, shield] of L.stations) {
        const st = station(name, c, r, owner, tier, capital, fort);
        if (shield) st.maxShield = st.shield = shield;
        claim(st, owner);
      }
      L.units.forEach(place);
      g.economy[L.owners[0]] = { credits: 0, industry: 0, science: 0 };
      g.economy[L.owners[1]] = { credits: 0, industry: 0, science: 0 };
      setEconomy(L.economy);
    } else if (scen === 'iserlohn') {
      g.tiles.forEach(t => (t.owner = t.c < 4 ? player : enemy));
      station('Forward Base', 1, 4, player, 3, true);
      station('Iserlohn', 8, 4, enemy, 3, false, true);
      station('Outer Dock', 8, 1, enemy, 1);
      newUnit(g, 'flagship', player, 2, 4, 1, player === 'alliance' ? 'yang' : 'reinhard');
      newUnit(g, 'frigate', player, 3, 3, 2, player === 'alliance' ? 'schonkopf' : 'kircheis');
      newUnit(g, 'heavy', player, 3, 5, 2);
      newUnit(g, 'siege', player, 2, 2, 2);
      newUnit(g, 'missile', player, 2, 6, 1);
      newUnit(g, 'beam', player, 1, 3, 2);
      newUnit(g, 'corvette', player, 4, 4, 1);
      newUnit(g, 'battleship', enemy, 7, 4, 2, enemy === 'empire' ? 'reuenthal' : 'attenborough');
      newUnit(g, 'heavy', enemy, 6, 2, 1);
      newUnit(g, 'light', enemy, 6, 6, 2);
      newUnit(g, 'beam', enemy, 8, 3, 2);
      newUnit(g, 'missile', enemy, 8, 5, 1);
      g.economy[enemy] = { credits: 140, industry: 70, science: 0 };
    } else if (scen === 'astarte') {
      claim(station('Brünhild Anchorage', 1, 4, 'empire', 2, true), 'empire');
      [
        ['empire', 'flagship', 5, 4, 1, 'reinhard'],
        ['empire', 'heavy', 5, 3, 2, 'kircheis'],
        ['empire', 'battleship', 6, 5, 1],
        ['empire', 'heavy', 4, 5, 1],
        ['empire', 'light', 6, 3, 2],
        ['empire', 'beam', 4, 4, 2],
        ['empire', 'missile', 4, 3, 1],
        ['empire', 'corvette', 5, 5, 2],
        ['empire', 'destroyer', 3, 4, 1],
        ['alliance', 'heavy', 8, 0, 2],
        ['alliance', 'light', 9, 1, 2],
        ['alliance', 'beam', 9, 0, 1],
        ['alliance', 'corvette', 7, 1, 1],
        ['alliance', 'heavy', 8, 8, 2],
        ['alliance', 'light', 9, 7, 2],
        ['alliance', 'missile', 9, 8, 1],
        ['alliance', 'corvette', 7, 7, 1],
        ['alliance', 'flagship', 12, 4, 1, 'yang'],
        ['alliance', 'heavy', 11, 4, 2],
        ['alliance', 'light', 11, 3, 1],
        ['alliance', 'beam', 12, 5, 2],
        ['alliance', 'frigate', 11, 5, 1],
      ].forEach(place);
      g.economy.alliance = { credits: 0, industry: 0, science: 0 };
    } else if (scen === 'amritsar') {
      const hold = station('Amritsar', 3, 4, 'alliance', 2, true);
      hold.maxShield = hold.shield = 320;
      claim(hold, 'alliance');
      claim(station('Supply Depot', 0, 1, 'alliance', 1), 'alliance');
      claim(station('Imperial Staging', 11, 4, 'empire', 2), 'empire');
      [
        ['alliance', 'flagship', 4, 4, 1, 'yang'],
        ['alliance', 'heavy', 4, 3, 2, 'attenborough'],
        ['alliance', 'light', 4, 5, 2, 'fischer'],
        ['alliance', 'heavy', 3, 3, 1],
        ['alliance', 'beam', 2, 4, 2],
        ['alliance', 'missile', 2, 5, 1],
        ['alliance', 'corvette', 5, 4, 2],
        ['alliance', 'destroyer', 3, 5, 1],
        ['alliance', 'frigate', 2, 3, 1],
        ['empire', 'flagship', 10, 4, 1, 'reinhard'],
        ['empire', 'heavy', 8, 3, 2, 'mittermeyer'],
        ['empire', 'battleship', 8, 5, 2, 'reuenthal'],
        ['empire', 'frigate', 9, 2, 2, 'kircheis'],
        ['empire', 'heavy', 9, 6, 1],
        ['empire', 'light', 8, 4, 2],
        ['empire', 'missile', 10, 3, 1],
        ['empire', 'siege', 10, 5, 1],
        ['empire', 'corvette', 7, 2, 2],
        ['empire', 'destroyer', 7, 6, 1],
      ].forEach(place);
      setEconomy({ alliance: [150, 60], empire: [200, 80] });
    } else if (scen === 'vermilion') {
      claim(station('Forward Base', 0, 4, 'alliance', 1, true), 'alliance');
      claim(station('Vermilion Depot', 12, 4, 'empire', 2), 'empire');
      [
        ['alliance', 'flagship', 2, 4, 1, 'yang'],
        ['alliance', 'heavy', 3, 3, 2, 'attenborough'],
        ['alliance', 'light', 3, 5, 2, 'fischer'],
        ['alliance', 'heavy', 2, 3, 1],
        ['alliance', 'missile', 1, 4, 1],
        ['alliance', 'beam', 2, 5, 2],
        ['alliance', 'corvette', 4, 4, 2],
        ['alliance', 'destroyer', 3, 4, 1],
        ['alliance', 'frigate', 1, 3, 1],
        ['empire', 'flagship', 11, 4, 1, 'reinhard'],
        ['empire', 'heavy', 10, 3, 2],
        ['empire', 'heavy', 10, 5, 2],
        ['empire', 'battleship', 9, 4, 1],
        ['empire', 'light', 9, 2, 2],
        ['empire', 'light', 9, 6, 2],
        ['empire', 'beam', 11, 3, 1],
        ['empire', 'missile', 11, 5, 1],
        ['empire', 'corvette', 8, 3, 1],
        ['empire', 'corvette', 8, 5, 1],
        ['empire', 'destroyer', 10, 4, 1],
      ].forEach(place);
      setEconomy({ alliance: [250, 90], empire: [220, 80] });
    }
    for (const u of g.units) tile(g, u.c, u.r).terrain = 'space';
    if (DIFFICULTIES[difficulty]?.level) harden(g, DIFFICULTIES[difficulty]);
    for (const u of g.units)
      if (u.admiral) {
        u.cmdRank = g.officers[u.admiral].rank;
        u.hp = maxHP(u);
      }
    bindObjectiveFleet(g);
    g.startFleets = {
      empire: g.units.filter(u => u.side === 'empire').length,
      alliance: g.units.filter(u => u.side === 'alliance').length,
    };
    log(g, era ? ERAS[era].desc : def.desc, player);
    if (mapEra && ERAS[mapEra].rulesText) log(g, ERAS[mapEra].rulesText, player);
    return g;
  }
    return createGame;
  };
})(typeof window !== 'undefined' ? window : globalThis);
