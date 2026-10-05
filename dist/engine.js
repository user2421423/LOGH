/* Galactic Command: deterministic hex tactics rules. No UI or network dependencies. */
(function (root) {
  'use strict';
  const FACTIONS = {
    empire: { name: 'Galactic Empire', short: 'Empire', color: '#e3b46f' },
    alliance: { name: 'Free Planets Alliance', short: 'Alliance', color: '#65cfdf' },
    neutral: { name: 'Independent', short: 'Neutral', color: '#9b9bb5' },
  };
  const TYPES = {
    corvette: {
      name: 'Corvette',
      short: 'Corvette',
      code: 'CV',
      branch: 'Escort',
      wc: 'Light Infantry',
      hp: 150,
      attack: 37,
      armor: 9,
      move: 4,
      min: 1,
      max: 1,
      cost: 60,
      industry: 10,
      tier: 1,
      crit: 0.08,
      pen: 0.08,
      desc: 'Low-cost fleet screen and fast station capture. Range 1; exchanges counter-fire.',
    },
    frigate: {
      name: 'Frigate',
      short: 'Frigate',
      code: 'FF',
      branch: 'Escort',
      wc: 'Assault Infantry',
      hp: 210,
      attack: 53,
      armor: 16,
      move: 3,
      min: 1,
      max: 1,
      cost: 110,
      industry: 25,
      tier: 1,
      crit: 0.12,
      pen: 0.45,
      boarding: true,
      desc: 'Marine assault pods: +55% damage to Battle Line hulls and stations. Range 1; exchanges counter-fire.',
    },
    destroyer: {
      name: 'Destroyer',
      short: 'Destroyer',
      code: 'DD',
      branch: 'Escort',
      wc: 'Motorized Infantry',
      hp: 200,
      attack: 47,
      armor: 15,
      move: 5,
      min: 1,
      max: 1,
      cost: 115,
      industry: 25,
      tier: 2,
      crit: 0.1,
      pen: 0.15,
      desc: 'Five-hex movement for rapid flanking and station raids. Range 1; exchanges counter-fire.',
    },
    light: {
      name: 'Light Cruiser',
      short: 'Light cruiser',
      code: 'LC',
      branch: 'Battle Line',
      wc: 'Light Tank',
      hp: 245,
      attack: 57,
      armor: 23,
      move: 4,
      min: 1,
      max: 1,
      cost: 135,
      industry: 30,
      tier: 1,
      crit: 0.12,
      pen: 0.2,
      breakthrough: true,
      desc: 'Balanced early combatant. A kill refreshes its attack and movement once per turn.',
    },
    heavy: {
      name: 'Heavy Cruiser',
      short: 'Heavy cruiser',
      code: 'HC',
      branch: 'Battle Line',
      wc: 'Medium Tank',
      hp: 330,
      attack: 71,
      armor: 32,
      move: 3,
      min: 1,
      max: 1,
      cost: 215,
      industry: 55,
      tier: 2,
      crit: 0.14,
      pen: 0.3,
      breakthrough: true,
      desc: 'The fleet backbone. Heavy armor and breakthrough on a kill.',
    },
    battleship: {
      name: 'Battleship',
      short: 'Battleship',
      code: 'BB',
      branch: 'Battle Line',
      wc: 'Heavy Tank',
      hp: 440,
      attack: 89,
      armor: 42,
      move: 3,
      min: 1,
      max: 2,
      cost: 330,
      industry: 90,
      tier: 3,
      crit: 0.18,
      pen: 0.42,
      breakthrough: true,
      desc: 'Heavy armor penetration and 1–2 hex guns. Exchanges counter-fire; a kill triggers breakthrough.',
    },
    flagship: {
      name: 'Dreadnought / Fleet Flagship',
      short: 'Dreadnought',
      code: 'DN',
      branch: 'Battle Line',
      wc: 'Super Heavy Tank',
      hp: 590,
      attack: 108,
      armor: 52,
      move: 2,
      min: 1,
      max: 2,
      cost: 500,
      industry: 140,
      tier: 3,
      crit: 0.22,
      pen: 0.48,
      breakthrough: true,
      desc: 'Brünhild or Hyperion-class command vessel. Immense armor, 1–2 hex guns, counter-fire and breakthrough.',
    },
    beam: {
      name: 'Artillery Frigate',
      short: 'Artillery frigate',
      code: 'AF',
      branch: 'Artillery',
      wc: 'Field Artillery',
      weapon: 'Forward Neutron Accelerator',
      hp: 150,
      attack: 59,
      armor: 10,
      move: 2,
      min: 1,
      max: 1,
      cost: 130,
      industry: 30,
      tier: 1,
      crit: 0.12,
      pen: 0.45,
      noCounter: true,
      desc: 'Range 1 neutron accelerator. Suppresses enemy counter-fire; protect its vulnerable hull with escorts.',
    },
    missile: {
      name: 'Artillery Cruiser',
      short: 'Artillery cruiser',
      code: 'AC',
      branch: 'Artillery',
      wc: 'Rocket Artillery',
      weapon: 'Mass Fusion Torpedo Racks',
      hp: 185,
      attack: 77,
      armor: 12,
      move: 3,
      min: 2,
      max: 2,
      cost: 235,
      industry: 70,
      tier: 2,
      crit: 0.12,
      pen: 0.55,
      noCounter: true,
      splash: 0.45,
      desc: 'Range 2 fusion salvos; cannot fire at adjacent targets. 45% splash damage and morale loss to enemies next to the target. Suppresses counter-fire.',
    },
    siege: {
      name: 'Siege Cannon',
      short: 'Siege cannon',
      code: 'SC',
      branch: 'Artillery',
      wc: 'Gustav / Siege',
      weapon: 'Fortress-Class Spinal Cannon',
      hp: 280,
      attack: 112,
      armor: 23,
      move: 1,
      min: 2,
      max: 2,
      cost: 380,
      industry: 110,
      tier: 3,
      crit: 0.25,
      critMult: 1.9,
      pen: 0.8,
      noCounter: true,
      siege: 2,
      desc: 'Range 2 fortress cannon; cannot fire at adjacent targets. +100% station damage, 80% armor penetration, movement 1. Suppresses counter-fire.',
    },
  };
  const ADMIRALS = {
    reinhard: {
      name: 'Reinhard von Lohengramm',
      short: 'Reinhard',
      side: 'empire',
      stars: 5,
      cost: 210,
      role: 'Battle Line',
      hull: 'Brünhild',
      skill: 'Fleet Leader',
      desc: 'Battle Line: +30% critical chance, +1 movement. Morale never falls below steady.',
      trait: 'leader',
    },
    yang: {
      name: 'Yang Wen-li',
      short: 'Yang',
      side: 'alliance',
      stars: 5,
      cost: 210,
      role: 'Battle Line',
      hull: 'Hyperion',
      skill: 'The Magician',
      desc: '−20% damage taken, +65% counter-fire. Ignores terrain movement costs. Confusion lowers nearby enemy morale by 2.',
      trait: 'magician',
    },
    mittermeyer: {
      name: 'Wolfgang Mittermeyer',
      short: 'Mittermeyer',
      side: 'empire',
      stars: 5,
      cost: 160,
      role: 'Battle Line',
      hull: 'Beowulf',
      skill: 'Gale Wolf',
      desc: '+2 movement. Battle Line can refresh actions twice per turn.',
      trait: 'gale',
    },
    reuenthal: {
      name: 'Oskar von Reuenthal',
      short: 'Reuenthal',
      side: 'empire',
      stars: 5,
      cost: 160,
      role: 'Battle Line',
      hull: 'Tristan',
      skill: 'Twin Pillar',
      desc: '+25% armor penetration. Reflects 20% of counter-fire received.',
      trait: 'reflection',
    },
    kircheis: {
      name: 'Siegfried Kircheis',
      short: 'Kircheis',
      side: 'empire',
      stars: 4,
      cost: 145,
      role: 'Escort',
      hull: 'Barbarossa',
      skill: 'Unwavering Loyalty',
      desc: '+20% escort damage. Nearby friendly fleets recover one extra morale step each turn.',
      trait: 'loyal',
    },
    attenborough: {
      name: 'Dusty Attenborough',
      short: 'Attenborough',
      side: 'alliance',
      stars: 4,
      cost: 145,
      role: 'Battle Line',
      hull: 'Triglaph',
      skill: 'Flexible Command',
      desc: '+1 movement, +15% damage. Breakthrough-capable hulls refresh actions twice per turn.',
      trait: 'flexible',
    },
    fischer: {
      name: 'Edwin Fischer',
      short: 'Fischer',
      side: 'alliance',
      stars: 4,
      cost: 125,
      role: 'Battle Line',
      hull: 'Patroklos',
      skill: 'Fleet Maneuver',
      desc: '+1 movement. Nearby units gain +10% damage from the command aura.',
      trait: 'maneuver',
    },
    schonkopf: {
      name: 'Walter von Schönkopf',
      short: 'Schönkopf',
      side: 'alliance',
      stars: 4,
      cost: 145,
      role: 'Escort',
      hull: 'Rosen Ritter',
      skill: 'Boarding Specialist',
      desc: 'Escort hulls deal +35% damage. Capturing a station restores 30% of the fleet’s maximum HP.',
      trait: 'boarding',
    },
  };
  const TECHS = {
    warp: {
      name: 'Warp Drive Efficiency',
      short: 'Warp drives',
      desc: 'Each level adds +1 movement to Battle Line hulls. Escorts and artillery are unaffected.',
      base: 115,
    },
    armor: {
      name: 'Liquid Metal Armor & Shielding',
      short: 'Armor & shielding',
      desc: 'Each level reduces damage by 8%; artillery damage by 12%.',
      base: 125,
    },
    laser: {
      name: 'Seft Armor-Piercing Lasers',
      short: 'Armor-piercing lasers',
      desc: 'Each level adds 10% penetration and +0.15 critical damage multiplier.',
      base: 135,
    },
    comms: {
      name: 'Sub-Space Communication Arrays',
      short: 'Command arrays',
      desc: 'Each level expands admiral aura by 1 hex. Nearby fleets deal +8% damage and recover morale.',
      base: 105,
    },
  };
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const axial = p => ({ q: p.c - Math.floor(p.r / 2), r: p.r });
  const distance = (a, b) => {
    a = axial(a);
    b = axial(b);
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  };
  const key = p => p.c + ',' + p.r;
  const opponent = s => (s === 'empire' ? 'alliance' : 'empire');
  function tile(g, c, r) {
    return c >= 0 && r >= 0 && c < g.cols && r < g.rows ? g.tiles[r * g.cols + c] : null;
  }
  function adjacent(g, p) {
    const a = axial(p);
    return DIRS.map(d => {
      const r = a.r + d[1],
        c = a.q + d[0] + Math.floor(r / 2);
      return tile(g, c, r);
    }).filter(Boolean);
  }
  function unitAt(g, p) {
    return g.units.find(u => u.hp > 0 && u.c === p.c && u.r === p.r);
  }
  function stationAt(g, p) {
    return g.stations.find(s => s.c === p.c && s.r === p.r);
  }
  function random(g) {
    g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
    return g.seed / 4294967296;
  }
  function log(g, text, side) {
    g.log.unshift({ turn: g.turn, text, side: side || g.phase });
    g.log = g.log.slice(0, 30);
  }
  function funds(g, side) {
    return g.economy[side];
  }
  function maxHP(u) {
    return Math.round(TYPES[u.type].hp * (1 + 0.7 * (u.stack - 1)));
  }
  // Saves from earlier rules versions are not carried forward.
  function migrateSave(g) {
    if (!g || g.version !== 2 || g.rulesVersion !== 5 || !Array.isArray(g.units)) return null;
    return g.units.every(u => TYPES[u.type]) ? g : null;
  }
  function newUnit(g, type, side, c, r, stack = 1, admiral = null, ready = true) {
    const u = {
      id: g.nextId++,
      type,
      side,
      c,
      r,
      stack,
      hp: 0,
      morale: 0,
      moved: !ready,
      attacked: !ready,
      admiral,
      kills: 0,
      chain: 0,
      xp: 0,
      confusionCD: 0,
    };
    u.hp = maxHP(u);
    g.units.push(u);
    return u;
  }
  function movement(g, u) {
    const t = TYPES[u.type];
    if (t.elite) return 1;
    let n = t.move + (t.branch === 'Battle Line' ? g.tech[u.side].warp : 0);
    if (u.admiral === 'reinhard' && t.branch === 'Battle Line') n++;
    if (u.admiral === 'mittermeyer') n += 2;
    if (['attenborough', 'fischer'].includes(u.admiral)) n++;
    return n;
  }
  function terrainCost(g, u, t) {
    return u.admiral === 'yang' ? 1 : t.terrain === 'nebula' || t.terrain === 'asteroid' ? 2 : 1;
  }
  function canCapture(u) {
    return TYPES[u.type].branch !== 'Artillery';
  }
  function isReady(g, u) {
    return !g.over && g.phase === u.side && u.hp > 0 && u.morale > -3;
  }
  function reachable(g, u) {
    const found = new Map();
    if (!isReady(g, u) || u.moved || u.attacked) return found;
    const start = key(u),
      costs = new Map([[start, 0]]),
      queue = [{ p: tile(g, u.c, u.r), cost: 0 }];
    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const { p, cost } = queue.shift();
      if (cost > costs.get(key(p))) continue;
      for (const n of adjacent(g, p)) {
        if (n.terrain === 'rift') continue;
        const occ = unitAt(g, n),
          st = stationAt(g, n);
        if (occ && occ.side !== u.side) continue;
        if (st && st.owner !== u.side && (st.shield > 0 || !canCapture(u))) continue;
        const nc = cost + terrainCost(g, u, n);
        if (nc > movement(g, u) || nc >= (costs.get(key(n)) ?? Infinity)) continue;
        costs.set(key(n), nc);
        queue.push({ p: n, cost: nc });
        if (!occ && key(n) !== start) found.set(key(n), nc);
      }
    }
    return found;
  }
  function inRange(a, p) {
    const t = TYPES[a.type],
      d = distance(a, p);
    return d >= t.min && d <= t.max;
  }
  function hostileTarget(g, u, p) {
    const target = unitAt(g, p),
      st = stationAt(g, p);
    return target ? target.side !== u.side : !!st && st.owner !== u.side && st.shield > 0;
  }
  function targets(g, u) {
    return g.tiles.filter(p => hostileTarget(g, u, p) && inRange(u, p));
  }
  function move(g, id, c, r) {
    const u = g.units.find(u => u.id === id);
    if (!u) return { ok: false, reason: 'Fleet not found.' };
    const dest = tile(g, c, r);
    if (!dest || !reachable(g, u).has(key(dest))) return { ok: false, reason: 'That hex is not reachable this turn.' };
    const from = { c: u.c, r: u.r };
    u.c = c;
    u.r = r;
    u.moved = true;
    dest.owner = u.side;
    const s = stationAt(g, u);
    let captured = null;
    if (s && s.owner !== u.side && canCapture(u)) {
      s.owner = u.side;
      s.shield = 0;
      s.capturedTurn = g.turn;
      captured = s.name;
      u.morale = 1;
      funds(g, u.side).credits += 40;
      if (u.admiral === 'schonkopf') u.hp = Math.min(maxHP(u), u.hp + maxHP(u) * 0.3);
      log(g, `${ADMIRALS[u.admiral]?.short || TYPES[u.type].short} captures ${s.name}.`, u.side);
    }
    checkVictory(g);
    return { ok: true, from, to: { c, r }, captured };
  }
  function auraBonus(g, u) {
    let bonus = 0;
    for (const a of g.units) {
      if (a.hp <= 0 || a.side !== u.side || !a.admiral || a.id === u.id) continue;
      if (distance(a, u) <= 1 + g.tech[u.side].comms) bonus = Math.max(bonus, a.admiral === 'fischer' ? 0.1 : 0.08);
    }
    return bonus;
  }
  function power(g, u, target, st, counter = false) {
    const t = TYPES[u.type],
      victim = target ? TYPES[target.type] : null;
    let attack = t.attack * (1 + 0.45 * (u.stack - 1)) * (1 + 0.07 * Math.min(5, u.xp));
    attack *= u.morale >= 1 ? 1.25 : u.morale === -1 ? 0.75 : u.morale === -2 ? 0.5 : u.morale <= -3 ? 0 : 1;
    attack *= u.hp / maxHP(u) < 0.5 ? 0.72 : 1;
    attack *= 1 + auraBonus(g, u);
    if (u.admiral === 'kircheis' && t.branch === 'Escort') attack *= 1.2;
    if (u.admiral === 'schonkopf' && t.branch === 'Escort') attack *= 1.35;
    if (u.admiral === 'attenborough') attack *= 1.15;
    if (counter && u.admiral === 'yang') attack *= 1.65;
    if (t.boarding && (target ? victim.branch === 'Battle Line' : !!st)) attack *= 1.55;
    const pen = clamp(t.pen + g.tech[u.side].laser * 0.1 + (u.admiral === 'reuenthal' ? 0.25 : 0), 0, 0.95);
    const armor = target ? victim.armor : 35;
    attack *= 100 / (100 + armor * (1 - pen) * 2);
    if (target) {
      attack *= 1 - g.tech[target.side].armor * (t.branch === 'Artillery' ? 0.12 : 0.08);
      if (target.admiral === 'yang') attack *= 0.8;
      const terrain = tile(g, target.c, target.r).terrain;
      if (terrain === 'asteroid') attack *= 0.85;
      if (victim.evasion) attack *= 1 - victim.evasion * 0.5;
    }
    if (counter) attack *= 0.65;
    return Math.max(1, Math.round(attack));
  }
  function preview(g, id, c, r) {
    const a = g.units.find(u => u.id === id),
      p = tile(g, c, r);
    if (!a || !p || !hostileTarget(g, a, p) || !inRange(a, p)) return null;
    const t = TYPES[a.type],
      d = unitAt(g, p),
      s = stationAt(g, p);
    const base = power(g, a, d, s),
      shield = s && s.owner !== a.side && s.shield > 0;
    const unitDmg = d ? Math.round(base * (shield ? 0.55 : 1)) : 0;
    const shieldDmg = shield
      ? Math.round(
          base *
            (t.boarding && d && TYPES[d.type].branch !== 'Battle Line' ? 1.55 : 1) *
            (t.siege || 1) *
            (d ? 0.8 : 1.45),
        )
      : 0;
    const counter = !!d && !t.noCounter && d.morale > -3 && inRange(d, a);
    const crit = clamp(t.crit + (a.admiral === 'reinhard' && t.branch === 'Battle Line' ? 0.3 : 0), 0, 0.85);
    return {
      unit: unitDmg,
      shield: shieldDmg,
      counter: counter ? power(g, d, a, stationAt(g, a), true) : 0,
      counterAllowed: counter,
      crit,
      critMult: (t.critMult || 1.55) + g.tech[a.side].laser * 0.15,
      splash: t.splash || 0,
      armorPen: clamp(t.pen + g.tech[a.side].laser * 0.1 + (a.admiral === 'reuenthal' ? 0.25 : 0), 0, 0.95),
    };
  }
  function kill(g, v, attacker) {
    if (v.hp > 0) return;
    v.hp = 0;
    if (attacker) {
      attacker.kills++;
      attacker.xp = Math.min(5, attacker.xp + 1);
      attacker.morale = clamp(attacker.morale + 1, -3, 1);
    }
    if (v.admiral) log(g, `${ADMIRALS[v.admiral].short}'s command fleet is lost.`, v.side);
  }
  function attack(g, id, c, r) {
    const a = g.units.find(u => u.id === id);
    if (!a || !isReady(g, a) || a.attacked) return { ok: false, reason: 'This fleet cannot fire again this turn.' };
    const pr = preview(g, id, c, r);
    if (!pr) return { ok: false, reason: 'No hostile target within firing range.' };
    const p = tile(g, c, r),
      d = unitAt(g, p),
      s = stationAt(g, p),
      crit = random(g) < pr.crit,
      mult = (0.92 + random(g) * 0.16) * (crit ? pr.critMult : 1),
      hit = [];
    a.attacked = true;
    a.moved = true;
    let dmg = 0,
      sd = 0;
    if (d) {
      dmg = Math.round(pr.unit * mult);
      d.hp = Math.max(0, d.hp - dmg);
      hit.push({ id: d.id, c, r, damage: dmg });
    }
    if (s && pr.shield) {
      sd = Math.min(s.shield, Math.round(pr.shield * mult));
      s.shield -= sd;
    }
    let retaliation = 0;
    if (d && d.hp > 0 && pr.counterAllowed) {
      retaliation = Math.round(pr.counter * (0.94 + random(g) * 0.12));
      a.hp = Math.max(0, a.hp - retaliation);
      if (a.admiral === 'reuenthal') {
        d.hp = Math.max(0, d.hp - Math.round(retaliation * 0.2));
      }
      kill(g, a, d);
    }
    if (pr.splash) {
      for (const v of g.units) {
        if (v.hp <= 0 || v.side === a.side || v.id === d?.id || distance(v, p) !== 1) continue;
        const amount = Math.round(power(g, a, v, stationAt(g, v)) * pr.splash);
        v.hp = Math.max(0, v.hp - amount);
        v.morale = Math.max(v.admiral === 'reinhard' ? 0 : -3, v.morale - 1);
        hit.push({ id: v.id, c: v.c, r: v.r, damage: amount });
        kill(g, v, a);
      }
    }
    const destroyed = !!d && d.hp <= 0;
    if (destroyed) kill(g, d, a);
    const cap = ['mittermeyer', 'attenborough'].includes(a.admiral) ? 2 : 1;
    let breakthrough = false;
    if (destroyed && a.hp > 0 && TYPES[a.type].breakthrough && a.chain < cap) {
      a.chain++;
      a.attacked = false;
      a.moved = false;
      breakthrough = true;
    }
    log(
      g,
      `${ADMIRALS[a.admiral]?.short || TYPES[a.type].short}: ${crit ? 'critical hit · ' : ''}${dmg ? dmg + ' hull damage' : ''}${sd ? (dmg ? ' + ' : '') + sd + ' station damage' : ''}${destroyed ? ' · enemy destroyed' : ''}${breakthrough ? ' · breakthrough' : ''}${retaliation ? ' · ' + retaliation + ' counter-fire' : ''}.`,
      a.side,
    );
    checkVictory(g);
    return {
      ok: true,
      from: { c: a.c, r: a.r },
      to: { c, r },
      damage: dmg,
      shieldDamage: sd,
      crit,
      counter: retaliation,
      hit,
      destroyed,
      breakthrough,
    };
  }
  function income(g, side) {
    return g.stations
      .filter(s => s.owner === side)
      .reduce(
        (a, s) => ({
          credits: a.credits + s.income,
          industry: a.industry + s.industry,
          science: a.science + s.science,
        }),
        { credits: 0, industry: 0, science: 0 },
      );
  }
  function recruitOptions(g, s, side) {
    if (s.owner !== side) return [];
    return [tile(g, s.c, s.r), ...adjacent(g, s)].filter(
      p => p && p.terrain !== 'rift' && !unitAt(g, p) && (!stationAt(g, p) || stationAt(g, p).owner === side),
    );
  }
  function price(type, stack = 1) {
    const t = TYPES[type];
    return {
      credits: Math.round(t.cost * (1 + 0.85 * (stack - 1))),
      industry: Math.round(t.industry * (1 + 0.85 * (stack - 1))),
    };
  }
  function canBuy(g, s, type, stack = 1) {
    const t = TYPES[type],
      e = funds(g, s.owner),
      cost = price(type, stack);
    return (
      !!t &&
      s.owner === g.phase &&
      !g.over &&
      s.tier >= t.tier &&
      (!t.elite || stack === 1) &&
      stack >= 1 &&
      stack <= 3 &&
      e.credits >= cost.credits &&
      e.industry >= cost.industry &&
      s.producedTurn !== g.turn &&
      recruitOptions(g, s, s.owner).length > 0
    );
  }
  function recruit(g, stationId, type, stack = 1, position) {
    const s = g.stations.find(s => s.id === stationId);
    if (!s || !TYPES[type] || !Number.isInteger(stack) || !canBuy(g, s, type, stack))
      return { ok: false, reason: 'Check shipyard tier, resources, free hexes, and production this turn.' };
    const options = recruitOptions(g, s, s.owner);
    const p = position ? options.find(p => p.c === position.c && p.r === position.r) : options[0];
    if (!p) return { ok: false, reason: 'Deployment hex unavailable.' };
    const cost = price(type, stack);
    funds(g, s.owner).credits -= cost.credits;
    funds(g, s.owner).industry -= cost.industry;
    s.producedTurn = g.turn;
    const u = newUnit(g, type, s.owner, p.c, p.r, stack, null, false);
    log(g, `${TYPES[type].short} ×${stack} commissioned at ${s.name}. Ready next turn.`, s.owner);
    return { ok: true, unit: u };
  }
  function reinforceCost(type) {
    return { credits: TYPES[type].cost, industry: TYPES[type].industry };
  }
  // Repairs restore 35% hull for a fifth of the fleet's build price.
  function repairCost(u) {
    return Math.max(20, Math.round(price(u.type, u.stack).credits * 0.2));
  }
  function reinforce(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u) || TYPES[u.type].elite || u.stack >= 3 || u.moved || u.attacked)
      return { ok: false, reason: 'A ready fleet below 3 stacks is required.' };
    const st = g.stations.find(s => s.owner === u.side && distance(s, u) <= 1);
    if (!st) return { ok: false, reason: 'Reinforce on or next to a friendly station.' };
    const cost = reinforceCost(u.type),
      e = funds(g, u.side);
    if (e.credits < cost.credits || e.industry < cost.industry) return { ok: false, reason: 'Not enough resources.' };
    e.credits -= cost.credits;
    e.industry -= cost.industry;
    const old = maxHP(u);
    u.stack++;
    u.hp += maxHP(u) - old;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} reinforced to ${u.stack} stacks.`, u.side);
    return { ok: true };
  }
  function repair(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u) || u.hp >= maxHP(u) || u.moved || u.attacked)
      return { ok: false, reason: 'A damaged fleet with unused actions is required.' };
    if (!g.stations.some(s => s.owner === u.side && distance(s, u) <= 1))
      return { ok: false, reason: 'Repair on or next to a friendly station.' };
    const cost = repairCost(u);
    if (funds(g, u.side).credits < cost) return { ok: false, reason: 'Not enough credits.' };
    funds(g, u.side).credits -= cost;
    const amount = Math.min(maxHP(u) - u.hp, Math.round(maxHP(u) * 0.35));
    u.hp += amount;
    u.moved = u.attacked = true;
    log(g, `${TYPES[u.type].short} repairs ${amount} HP.`, u.side);
    return { ok: true, amount };
  }
  function upgradeCost(s) {
    return { credits: 160 * s.tier, industry: 40 * s.tier };
  }
  function upgrade(g, id) {
    const s = g.stations.find(s => s.id === id);
    if (!s || s.owner !== g.phase || g.over || s.tier >= 3)
      return { ok: false, reason: 'Shipyard is already maximum tier or not yours.' };
    const cost = upgradeCost(s).credits,
      e = funds(g, s.owner);
    if (e.credits < cost || e.industry < upgradeCost(s).industry)
      return { ok: false, reason: 'Insufficient credits or industry.' };
    e.credits -= cost;
    e.industry -= upgradeCost(s).industry;
    s.tier++;
    s.income += 15;
    s.industry += 10;
    s.maxShield += 60;
    s.shield = Math.min(s.maxShield, s.shield + 60);
    log(g, `${s.name} upgraded to tier ${s.tier}.`, s.owner);
    return { ok: true };
  }
  function researchCost(g, side, k) {
    const l = g.tech[side][k];
    return { credits: TECHS[k].base * (l + 1), science: 40 + 35 * l };
  }
  function research(g, k) {
    if (!TECHS[k] || g.over || g.tech[g.phase][k] >= 3) return { ok: false, reason: 'Research unavailable.' };
    const e = funds(g, g.phase),
      c = researchCost(g, g.phase, k);
    if (e.credits < c.credits || e.science < c.science)
      return { ok: false, reason: 'Insufficient credits or research points.' };
    e.credits -= c.credits;
    e.science -= c.science;
    g.tech[g.phase][k]++;
    log(g, `${TECHS[k].short} reaches level ${g.tech[g.phase][k]}.`, g.phase);
    return { ok: true };
  }
  function assign(g, id, admiral) {
    const u = g.units.find(u => u.id === id),
      a = ADMIRALS[admiral];
    if (
      !u ||
      !a ||
      u.side !== g.phase ||
      a.side !== u.side ||
      u.admiral ||
      g.over ||
      g.units.some(v => v.hp > 0 && v.admiral === admiral)
    )
      return { ok: false, reason: 'That admiral cannot be assigned to this fleet.' };
    if (funds(g, u.side).credits < a.cost) return { ok: false, reason: 'Insufficient credits.' };
    funds(g, u.side).credits -= a.cost;
    u.admiral = admiral;
    log(g, `${a.short} assumes command of ${TYPES[u.type].short}.`, u.side);
    return { ok: true };
  }
  function confuse(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u) || u.admiral !== 'yang' || u.confusionCD > 0)
      return { ok: false, reason: 'Confusion is not ready.' };
    const victims = g.units.filter(v => v.hp > 0 && v.side !== u.side && distance(u, v) <= 2);
    if (!victims.length) return { ok: false, reason: 'No hostile fleets within 2 hexes.' };
    victims.forEach(v => (v.morale = Math.max(v.admiral === 'reinhard' ? 0 : -3, v.morale - 2)));
    u.confusionCD = 3;
    log(g, `Yang's feint disrupts ${victims.length} enemy fleets.`, u.side);
    return { ok: true, affected: victims.length };
  }
  function beginTurn(g, side, collect = true) {
    g.phase = side;
    if (collect) {
      const inc = income(g, side),
        e = funds(g, side),
        modifier = side !== g.player ? (g.difficulty === 'hard' ? 1.2 : g.difficulty === 'easy' ? 0.8 : 1) : 1;
      e.credits += Math.round(inc.credits * modifier);
      e.industry += Math.round(inc.industry * modifier);
      e.science += Math.round(inc.science * modifier);
    }
    for (const u of g.units) {
      if (u.hp <= 0 || u.side !== side) continue;
      u.moved = false;
      u.attacked = false;
      u.chain = 0;
      u.confusionCD = Math.max(0, u.confusionCD - 1);
      const nearby = g.units.filter(v => v.hp > 0 && v.side !== side && distance(u, v) === 1).length;
      let desired = nearby >= 3 ? -2 : nearby >= 2 ? -1 : 0;
      if (u.admiral === 'reinhard') desired = Math.max(0, desired);
      if (u.morale < desired) u.morale++;
      else if (u.morale > desired) u.morale--;
      if (nearby >= 2) u.morale = Math.min(u.morale, desired);
      const auras = g.units.filter(
          v => v.hp > 0 && v.side === side && v.admiral && v.id !== u.id && distance(u, v) <= 1 + g.tech[side].comms,
        ),
        aura = auras.find(v => v.admiral === 'kircheis') || auras[0];
      if (aura && nearby < 3) u.morale = Math.min(1, u.morale + (aura.admiral === 'kircheis' ? 2 : 1));
      const t = tile(g, u.c, u.r);
      if (t.terrain === 'nebula') u.hp = Math.max(1, u.hp - Math.round(maxHP(u) * 0.025));
      const s = stationAt(g, u);
      if (s?.owner === side) u.hp = Math.min(maxHP(u), u.hp + Math.round(maxHP(u) * 0.08));
    }
    fortressFire(g, side);
    for (const s of g.stations) {
      if (s.owner === side) s.shield = Math.min(s.maxShield, s.shield + Math.round(s.maxShield * 0.12));
    }
    checkVictory(g);
  }
  // A fortress with its shields up fires its main gun at the strongest enemy fleet within 2 hexes.
  function fortressFire(g, side) {
    g.strikes = [];
    for (const s of g.stations) {
      if (!s.fort || s.owner !== side || s.shield <= 0) continue;
      const foe = g.units
        .filter(u => u.hp > 0 && u.side !== side && distance(s, u) <= 2)
        .sort((a, b) => b.hp - a.hp || a.id - b.id)[0];
      if (!foe) continue;
      const damage = Math.max(1, Math.round(maxHP(foe) * 0.3 * (1 - g.tech[foe.side].armor * 0.08)));
      foe.hp = Math.max(0, foe.hp - damage);
      foe.morale = Math.max(foe.admiral === 'reinhard' ? 0 : -3, foe.morale - 1);
      const name = s.name === 'Iserlohn' ? "Thor's Hammer" : `${s.name} main cannon`;
      g.strikes.push({
        name,
        from: { c: s.c, r: s.r },
        to: { c: foe.c, r: foe.r },
        id: foe.id,
        damage,
        destroyed: foe.hp <= 0,
      });
      log(g, `${name} strikes ${TYPES[foe.type].short} for ${damage}.`, side);
      kill(g, foe, null);
    }
    return g.strikes;
  }
  function checkVictory(g) {
    if (g.over) return g.over;
    if (g.mode === 'iserlohn') {
      const s = g.stations.find(s => s.name === 'Iserlohn');
      if (s.owner === g.player)
        g.over = { winner: g.player, reason: 'Iserlohn Fortress has fallen. The corridor is open.' };
      else if (!g.units.some(u => u.hp > 0 && u.side === g.player && canCapture(u)))
        g.over = { winner: opponent(g.player), reason: 'No assault-capable fleets remain to capture the fortress.' };
      else if (g.turn > 18)
        g.over = { winner: opponent(g.player), reason: 'The fortress held until enemy reinforcements arrived.' };
    } else {
      for (const side of ['empire', 'alliance']) {
        const capitals = g.stations.filter(s => s.capital);
        if (capitals.every(s => s.owner === side))
          g.over = { winner: side, reason: 'Both capitals are under one command. The war is over.' };
        else if (!g.stations.some(s => s.owner === side) && !g.units.some(u => u.hp > 0 && u.side === side))
          g.over = { winner: opponent(side), reason: 'The last enemy fleets and stations have fallen.' };
      }
      if (g.turn > 50 && !g.over) {
        const a = g.stations.filter(s => s.owner === g.player).length,
          b = g.stations.filter(s => s.owner === opponent(g.player)).length;
        g.over = {
          winner: a === b ? 'draw' : a > b ? g.player : opponent(g.player),
          reason: `The 50-turn armistice: ${a} stations held against ${b}.`,
        };
      }
    }
    return g.over;
  }
  function createGame(player = 'alliance', difficulty = 'normal', mode = 'conquest', seed = 246801) {
    const g = {
      version: 2,
      rulesVersion: 5,
      player,
      difficulty,
      mode,
      seed,
      cols: mode === 'iserlohn' ? 11 : 17,
      rows: mode === 'iserlohn' ? 9 : 11,
      turn: 1,
      phase: player,
      nextId: 1,
      tiles: [],
      units: [],
      stations: [],
      log: [],
      economy: {
        empire: { credits: 300, industry: 120, science: 40 },
        alliance: { credits: 300, industry: 120, science: 40 },
      },
      tech: { empire: { warp: 0, armor: 0, laser: 0, comms: 0 }, alliance: { warp: 0, armor: 0, laser: 0, comms: 0 } },
      over: null,
      stats: {},
    };
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++) {
        const n = random(g);
        let terrain = n < 0.085 ? 'nebula' : n < 0.16 ? 'asteroid' : 'space';
        if (mode === 'conquest' && c === 8 && ![2, 5, 8].includes(r)) terrain = 'rift';
        g.tiles.push({
          c,
          r,
          terrain,
          owner: c < (g.cols - 1) / 2 - 1 ? 'empire' : c > (g.cols - 1) / 2 + 1 ? 'alliance' : 'neutral',
        });
      }
    function station(name, c, r, owner, tier, capital = false, fort = false) {
      const s = {
        id: g.stations.length,
        name,
        c,
        r,
        owner,
        tier,
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
    if (mode === 'conquest') {
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
      for (const side of ['empire', 'alliance']) {
        const mirror = c => (side === 'empire' ? c : 16 - c);
        newUnit(g, 'flagship', side, mirror(4), 5, 1, side === 'empire' ? 'reinhard' : 'yang');
        newUnit(g, 'heavy', side, mirror(5), 3, 2, side === 'empire' ? 'mittermeyer' : 'attenborough');
        newUnit(g, 'light', side, mirror(5), 7, 2);
        newUnit(g, 'beam', side, mirror(4), 4, 2);
        newUnit(g, 'siege', side, mirror(5), 1, 1);
        newUnit(g, 'missile', side, mirror(3), 6, 1);
        newUnit(g, 'frigate', side, mirror(6), 2, 1);
        newUnit(g, 'corvette', side, mirror(6), 8, 2);
        newUnit(g, 'destroyer', side, mirror(3), 9, 1);
      }
      // The Alliance holds one extra hub; Imperial worlds yield more so both sides start with equal income.
      const ally = income(g, 'alliance'),
        imp = income(g, 'empire'),
        valhalla = g.stations.find(s => s.name === 'Valhalla'),
        kempff = g.stations.find(s => s.name === 'Kempff');
      valhalla.income += Math.ceil((ally.credits - imp.credits) / 2);
      kempff.income += Math.floor((ally.credits - imp.credits) / 2);
      kempff.industry += ally.industry - imp.industry;
      valhalla.science += ally.science - imp.science;
    } else {
      const enemy = opponent(player);
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
    }
    for (const u of g.units) tile(g, u.c, u.r).terrain = 'space';
    if (difficulty === 'easy') {
      g.economy[player].credits += 150;
      g.economy[player].industry += 50;
    }
    log(
      g,
      mode === 'iserlohn'
        ? 'Breach the fortress shields, eliminate the garrison, then occupy Iserlohn with an Escort or Battle Line fleet.'
        : 'Secure the three central corridors. Capture the enemy capital while defending your own.',
      player,
    );
    return g;
  }
  function aiProduction(g) {
    const side = g.phase,
      e = funds(g, side);
    if (g.mode === 'conquest' && g.turn % 3 === 0) {
      const k = ['laser', 'armor', 'warp', 'comms'][Math.floor(random(g) * 4)];
      research(g, k);
    }
    const fleetCount = g.units.filter(u => u.hp > 0 && u.side === side).length;
    const max = g.mode === 'iserlohn' ? 12 : 24;
    if (fleetCount >= max) return;
    const bases = g.stations
      .filter(s => s.owner === side)
      .sort((a, b) => {
        const foes = g.units.filter(u => u.hp > 0 && u.side !== side);
        const score = s => Math.min(...foes.map(u => distance(u, s)), 99);
        return score(a) - score(b);
      });
    for (const s of bases) {
      if (g.units.filter(u => u.hp > 0 && u.side === side).length >= max) break;
      const menu =
        s.tier >= 3
          ? ['battleship', 'siege', 'missile', 'heavy', 'frigate', 'corvette']
          : s.tier === 2
            ? ['missile', 'heavy', 'destroyer', 'corvette']
            : ['beam', 'light', 'frigate', 'corvette'];
      const preferred = menu[Math.floor(random(g) * Math.min(menu.length, 3))];
      const order = [preferred, ...menu.filter(x => x !== preferred)];
      for (const type of order) {
        if (canBuy(g, s, type, 1)) {
          recruit(g, s.id, type, 1);
          break;
        }
      }
    }
  }
  function aiOrder(g, id) {
    const u = g.units.find(u => u.id === id);
    if (!u || !isReady(g, u)) return [];
    const events = [];
    if (u.admiral === 'yang' && u.confusionCD === 0) confuse(g, id);
    const choose = () =>
      targets(g, u)
        .map(p => {
          const d = unitAt(g, p),
            s = stationAt(g, p),
            pr = preview(g, id, p.c, p.r);
          const score =
            pr.unit +
            pr.shield * 0.7 +
            (d && pr.unit >= d.hp ? 130 : 0) +
            (s ? 35 : 0) +
            (d?.admiral ? 30 : 0) -
            pr.counter * 0.5;
          return { p, score };
        })
        .sort((a, b) => b.score - a.score)[0];
    if (!u.moved && !u.attacked) {
      const spots = [...reachable(g, u).keys()].map(k => {
        const [c, r] = k.split(',').map(Number);
        return tile(g, c, r);
      });
      const enemies = g.units.filter(v => v.hp > 0 && v.side !== u.side);
      const goals = g.stations.filter(s => s.owner !== u.side);
      const old = { c: u.c, r: u.r };
      let best = null,
        bestScore = -Infinity;
      for (const p of spots) {
        const station = stationAt(g, p);
        let sc = station && station.owner !== u.side && station.shield === 0 ? 400 : 0;
        const nearestGoal = Math.min(...goals.map(s => distance(p, s)), 15),
          nearestEnemy = Math.min(...enemies.map(v => distance(p, v)), 15);
        sc -= nearestGoal * 8;
        const danger = enemies.filter(v => distance(v, p) <= 1).length;
        if (TYPES[u.type].branch === 'Artillery') {
          sc -= danger * 28;
          sc -= Math.abs(nearestEnemy - TYPES[u.type].max) * 6;
        } else sc -= nearestEnemy * 2;
        u.c = p.c;
        u.r = p.r;
        const shot = choose();
        u.c = old.c;
        u.r = old.r;
        if (shot) sc += shot.score * 0.6;
        if (station?.owner === u.side && u.hp / maxHP(u) < 0.5) sc += 20;
        if (sc > bestScore) {
          bestScore = sc;
          best = p;
        }
      }
      const current = choose();
      if (
        best &&
        (!current || bestScore > current.score * 0.6 - Math.min(...goals.map(s => distance(u, s)), 15) * 8 + 6)
      ) {
        const m = move(g, id, best.c, best.r);
        if (m.ok) events.push({ kind: 'move', ...m, id });
      }
    }
    for (let chain = 0; chain < 3 && !u.attacked && !g.over; chain++) {
      const shot = choose();
      if (!shot) break;
      const a = attack(g, id, shot.p.c, shot.p.r);
      if (a.ok) events.push({ kind: 'attack', ...a, id });
      else break;
    }
    return events;
  }
  root.Galactic = {
    FACTIONS,
    reinforceCost,
    repairCost,
    upgradeCost,
    fortressFire,
    TYPES,
    ADMIRALS,
    TECHS,
    clamp,
    key,
    distance,
    opponent,
    tile,
    adjacent,
    unitAt,
    stationAt,
    random,
    log,
    maxHP,
    migrateSave,
    newUnit,
    movement,
    reachable,
    targets,
    preview,
    move,
    attack,
    income,
    price,
    canBuy,
    recruitOptions,
    recruit,
    reinforce,
    repair,
    upgrade,
    researchCost,
    research,
    assign,
    confuse,
    beginTurn,
    checkVictory,
    createGame,
    aiProduction,
    aiOrder,
    canCapture,
  };
  if (typeof module !== 'undefined') module.exports = root.Galactic;
})(typeof window !== 'undefined' ? window : globalThis);
