/* Galactic Command strategic AI: theater planning, reserves, rallying and tactical execution. */
(function (root) {
  'use strict';
  const E = root.Galactic;
  if (!E) throw new Error('Galactic core must load before engine/ai.js');

  const FRONT = {
    radius: 6,
    near: 10,
    max: 3,
    sticky: 3,
    rally: 2,
    reserve: 0.12,
    wait: 2,
    pull: 9,
    floor: 0.35,
  };

  const hostileSide = side => E.opponent(side);
  const alive = (g, side) => g.units.filter(u => u.hp > 0 && u.side === side);
  const stationValue = s =>
    s.capital ? 90 : s.name === 'Iserlohn' || s.name === 'Fezzan' ? 70 : s.fort ? 55 : 12 + (s.tier || 1) * 8;

  function unitStrength(u) {
    const t = E.TYPES[u.type];
    return (
      u.stack *
      Math.max(0.2, u.hp / E.maxHP(u)) *
      (1 + 0.22 * Math.max(0, (t.tier || 1) - 1)) *
      (u.admiral ? 1.45 : 1)
    );
  }

  function frontObjectives(g, side) {
    const foe = hostileSide(side),
      ownStations = g.stations.filter(s => s.owner === side),
      enemyUnits = alive(g, foe),
      list = [];
    const nearOwn = p => ownStations.some(s => E.distance(s, p) <= FRONT.near);
    const threatened = p => enemyUnits.some(u => E.distance(u, p) <= (p.capital || p.fort ? 6 : 4));

    for (const s of g.stations) {
      if (s.owner === side) {
        if (threatened(s)) {
          list.push({
            key: 'd' + s.id,
            c: s.c,
            r: s.r,
            name: s.name,
            defend: true,
            vital: !!(s.capital || s.fort || s.name === 'Iserlohn' || s.name === 'Fezzan'),
            value: stationValue(s) + (s.capital ? 30 : 0),
            seed: -5,
          });
        }
        continue;
      }
      const strategic = s.capital || s.fort || s.name === 'Iserlohn' || s.name === 'Fezzan';
      if (s.owner === foe || strategic || nearOwn(s)) {
        list.push({
          key: 's' + s.id,
          c: s.c,
          r: s.r,
          name: s.name,
          owner: s.owner,
          value: stationValue(s) + (s.owner === 'neutral' ? 8 : 0),
          seed: strategic ? -6 : -2,
          fortified: !!(s.fort || s.capital),
        });
      }
    }
    return list;
  }

  function clusterObjectives(g, objectives) {
    const remaining = objectives.slice(),
      fronts = [];
    while (remaining.length) {
      const anchor = remaining.shift(),
        group = [anchor];
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (E.distance(anchor, remaining[i]) <= FRONT.radius) group.push(...remaining.splice(i, 1));
      }
      fronts.push({ id: anchor.key, anchor, objectives: group });
    }
    return fronts;
  }

  function nearestStation(stations, p) {
    return stations.slice().sort((a, b) => E.distance(a, p) - E.distance(b, p))[0] || null;
  }

  function planFronts(g, side) {
    const state = ((g.ai ||= {})[side] ||= {}),
      saved = (state.fronts ||= {}),
      assignments = (state.assignments ||= {}),
      foe = hostileSide(side),
      ownStations = g.stations.filter(s => s.owner === side),
      enemyUnits = alive(g, foe),
      units = alive(g, side),
      objectives = frontObjectives(g, side).sort((a, b) => b.value - a.value),
      totalStrength = units.reduce((n, u) => n + unitStrength(u), 0);

    let fronts = clusterObjectives(g, objectives);
    for (const f of fronts) {
      const attack = f.objectives.filter(o => !o.defend),
        defend = f.objectives.filter(o => o.defend),
        attackWorth = attack.reduce((n, o) => n + o.value, 0),
        defendWorth = defend.reduce((n, o) => n + o.value, 0),
        enemies = enemyUnits.filter(v => f.objectives.some(o => E.distance(v, o) <= 5)),
        enemyStrength = enemies.reduce((n, u) => n + unitStrength(u), 0),
        nearestHome = ownStations.length ? Math.min(...ownStations.map(s => E.distance(s, f.anchor))) : 20;
      f.type = defend.some(o => o.vital) || defendWorth > attackWorth ? 'defensive' : 'offensive';
      f.vital = defend.some(o => o.vital);
      f.score = attackWorth + defendWorth * 1.15 - nearestHome * 1.5;
      f.need = Math.max(2, enemyStrength * (f.type === 'defensive' ? 1.05 : 1.2) + attack.length * 0.7);
      f.rally = nearestStation(ownStations, f.anchor);
      f.assigned = [];
      const prev = saved[f.id] || {};
      f.wait = prev.wait || 0;
      f.state = prev.state || (f.type === 'offensive' ? 'assembling' : 'defending');
    }

    const vital = fronts.filter(f => f.vital);
    const others = fronts
      .filter(f => !f.vital)
      .sort((a, b) => b.score - a.score)
      .slice(0, FRONT.max);
    fronts = [...vital, ...others.filter(f => !vital.includes(f))];
    const byId = Object.fromEntries(fronts.map(f => [f.id, f]));

    // Keep a modest strategic reserve near the capital unless an emergency front exists.
    const capital = ownStations.find(s => s.capital) || ownStations[0] || null;
    const emergency = fronts.some(f => f.vital && f.type === 'defensive');
    const reserveTarget = emergency ? 0 : totalStrength * FRONT.reserve;
    let reserveStrength = 0;
    const candidates = units
      .slice()
      .sort((a, b) => {
        const da = capital ? E.distance(a, capital) : 0,
          db = capital ? E.distance(b, capital) : 0;
        return da - db || unitStrength(a) - unitStrength(b);
      });
    const reserveIds = new Set();
    for (const u of candidates) {
      if (reserveStrength >= reserveTarget) break;
      if (u.admiral && unitStrength(u) > totalStrength * 0.18) continue;
      reserveIds.add(u.id);
      reserveStrength += unitStrength(u);
    }

    // Preserve front assignments for a few turns unless that front disappears or becomes an emergency elsewhere.
    const unassigned = [];
    for (const u of units) {
      if (reserveIds.has(u.id)) {
        assignments[u.id] = { front: 'reserve', until: g.turn + 1 };
        continue;
      }
      const old = assignments[u.id];
      if (old && old.front !== 'reserve' && old.until >= g.turn && byId[old.front]) {
        byId[old.front].assigned.push(u);
      } else unassigned.push(u);
    }

    const assignedStrength = f => f.assigned.reduce((n, u) => n + unitStrength(u), 0);
    for (const u of unassigned) {
      const options = fronts
        .map(f => ({
          f,
          deficit: Math.max(FRONT.floor, f.need - assignedStrength(f)),
          distance: E.distance(u, f.rally || f.anchor),
        }))
        .sort((a, b) => b.deficit / (1 + b.distance * 0.08) - a.deficit / (1 + a.distance * 0.08));
      const pick = options[0]?.f;
      if (pick) {
        pick.assigned.push(u);
        assignments[u.id] = { front: pick.id, until: g.turn + FRONT.sticky };
      } else assignments[u.id] = { front: 'reserve', until: g.turn + 1 };
    }

    for (const f of fronts) {
      if (f.type !== 'offensive') {
        f.state = 'defending';
        f.wait = 0;
      } else {
        const rally = f.rally || f.anchor,
          strength = assignedStrength(f),
          massed = f.assigned
            .filter(u => E.distance(u, rally) <= FRONT.rally)
            .reduce((n, u) => n + unitStrength(u), 0),
          contact = enemyUnits.some(v => f.assigned.some(u => E.distance(u, v) <= 3));
        if (contact || strength === 0 || massed >= Math.max(1, strength * 0.6) || f.wait >= FRONT.wait) {
          f.state = 'attacking';
          f.wait = 0;
        } else {
          f.state = 'assembling';
          f.wait++;
        }
      }
      saved[f.id] = {
        state: f.state,
        wait: f.wait,
        anchor: { c: f.anchor.c, r: f.anchor.r, name: f.anchor.name },
        type: f.type,
      };
    }

    for (const id of Object.keys(saved)) if (!byId[id]) delete saved[id];
    state.lastPlan = g.turn;
    state.frontList = fronts.map(f => ({
      id: f.id,
      type: f.type,
      state: f.state,
      name: f.anchor.name,
      assigned: f.assigned.map(u => u.id),
      need: Math.round(f.need * 10) / 10,
    }));
    return { fronts, byId, assignments, capital, reserveIds };
  }

  function frontSummary(g, side) {
    const state = g.ai?.[side];
    return (state?.frontList || []).map(f => ({ ...f }));
  }

  function planFor(g, side) {
    const state = ((g.ai ||= {})[side] ||= {});
    if (state._planTurn !== g.turn) {
      state._plan = planFronts(g, side);
      state._planTurn = g.turn;
    }
    return state._plan;
  }

  function chooseTarget(g, u) {
    return E.targets(g, u)
      .map(p => {
        const d = E.unitAt(g, p),
          s = E.stationAt(g, p),
          pr = E.preview(g, u.id, p.c, p.r);
        const score =
          pr.unit +
          pr.shield * 0.75 +
          (d && pr.unit >= d.hp ? 140 : 0) +
          (d?.admiral ? 35 : 0) +
          (s ? stationValue(s) * 0.55 : 0) -
          pr.counter * 0.5;
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)[0];
  }

  function tacticalDestination(g, u, plan) {
    const assignment = plan.assignments[u.id];
    if (!assignment || assignment.front === 'reserve') return plan.capital;
    const f = plan.byId[assignment.front];
    if (!f) return plan.capital;
    if (f.type === 'defensive') return f.anchor;
    if (f.state === 'assembling') return f.rally || f.anchor;
    return f.objectives
      .filter(o => !o.defend)
      .sort((a, b) => b.value - a.value)[0] || f.anchor;
  }

  function bestMove(g, u, destination, plan) {
    const spots = [...E.reachable(g, u).keys()].map(k => {
      const [c, r] = k.split(',').map(Number);
      return E.tile(g, c, r);
    });
    if (!spots.length || !destination) return null;
    const field = E.routeField ? E.routeField(g, destination, u) : null,
      foes = alive(g, hostileSide(u.side)),
      allies = alive(g, u.side).filter(v => v.id !== u.id),
      old = { c: u.c, r: u.r },
      currentRoute = field?.get(E.key(u)) ?? E.distance(u, destination);
    let best = null,
      bestScore = -Infinity;

    for (const p of spots) {
      const route = field?.get(E.key(p)) ?? E.distance(p, destination);
      let score = (currentRoute - route) * 18;
      const st = E.stationAt(g, p);
      if (st && st.owner !== u.side && st.shield === 0) score += 300 + stationValue(st);
      const danger = foes.filter(v => E.distance(v, p) <= 1).length,
        nearestEnemy = foes.length ? Math.min(...foes.map(v => E.distance(v, p))) : 20;
      if (E.TYPES[u.type].branch === 'Artillery') {
        score -= danger * 35;
        score -= Math.abs(nearestEnemy - E.rangeOf(g, u).max) * 5;
      } else score -= danger * 10;
      if (E.TYPES[u.type].branch === 'Battle Line')
        score += Math.min(3, allies.filter(v => E.TYPES[v.type].branch === 'Battle Line' && E.distance(v, p) === 1).length) * 8;
      if (E.TYPES[u.type].air && u.admiral !== 'konev' && !E.airSupplied(g, u.side, p)) score -= 100;
      if (st?.owner === u.side && u.hp / E.maxHP(u) < 0.5) score += 25;

      u.c = p.c;
      u.r = p.r;
      const shot = chooseTarget(g, u);
      u.c = old.c;
      u.r = old.r;
      if (shot) score += shot.score * 0.55;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return bestScore > 1 ? best : null;
  }

  function aiOrder(g, id) {
    const u = g.units.find(v => v.id === id);
    if (!u || u.hp <= 0 || u.side !== g.phase || g.over) return [];
    const events = [];
    if (u.admiral === 'yang' && !E.confuseReason(g, u)) E.confuse(g, id);

    const plan = g.mode === 'conquest' ? planFor(g, u.side) : null,
      destination = plan
        ? tacticalDestination(g, u, plan)
        : g.stations
            .filter(s => s.owner !== u.side)
            .sort((a, b) => E.distance(u, a) - E.distance(u, b))[0];

    if (!u.moved && !u.attacked) {
      const p = bestMove(g, u, destination, plan || {});
      if (p) {
        const moved = E.move(g, id, p.c, p.r);
        if (moved.ok) events.push({ kind: 'move', ...moved, id });
      }
    }

    for (let chain = 0; chain < 8 && !u.attacked && !g.over; chain++) {
      const shot = chooseTarget(g, u);
      if (!shot) break;
      const fired = E.attack(g, id, shot.p.c, shot.p.r);
      if (!fired.ok) break;
      events.push({ kind: 'attack', ...fired, id });
    }
    return events;
  }

  function aiProduction(g) {
    const side = g.phase,
      e = g.economy[side],
      own = () => alive(g, side),
      enemy = hostileSide(side),
      enemyUnits = alive(g, enemy),
      frontDistance = p => (enemyUnits.length ? Math.min(...enemyUnits.map(u => E.distance(u, p))) : 99),
      bases = g.stations.filter(s => s.owner === side).sort((a, b) => frontDistance(a) - frontDistance(b)),
      planState = ((g.ai ||= {})[side] ||= {});

    g.strikes = [];
    for (const s of bases) {
      const target = E.fortressTargets(g, s)
        .map(p => E.unitAt(g, p))
        .filter(Boolean)
        .sort((a, b) => b.hp - a.hp)[0];
      if (target) {
        const shot = E.fireFortress(g, s.id, target.c, target.r);
        if (shot.ok) g.strikes.push(shot);
      }
    }

    for (const u of own()
      .filter(u => u.hp / E.maxHP(u) < 0.55 && g.stations.some(s => s.owner === side && E.distance(s, u) <= 1))
      .sort((a, b) => a.hp / E.maxHP(a) - b.hp / E.maxHP(b))) {
      if (!E.repairReason(g, u) && e.credits - E.repairCost(u, g) >= 60) E.repair(g, u.id);
    }

    const flagships = own().filter(u => u.type === 'flagship').length,
      tier3 = bases.filter(s => s.tier >= 3),
      flagPrice = E.price('flagship');
    if (!tier3.length || flagships >= 2) planState.saving = false;
    else if (!planState.saving && g.turn >= 3 && E.random(g) < 0.3) planState.saving = true;
    if (planState.saving) {
      const yard = tier3.find(s => E.canBuy(g, s, 'flagship', 1));
      if (yard && e.credits >= flagPrice.credits && e.industry >= flagPrice.industry) {
        E.recruit(g, yard.id, 'flagship', 1);
        planState.saving = false;
      }
    }

    const reserveCredits = planState.saving ? Math.min(e.credits, flagPrice.credits) : 70,
      reserveIndustry = planState.saving ? Math.min(e.industry, flagPrice.industry) : 0,
      affordable = cost =>
        e.credits - (cost.credits || 0) >= reserveCredits &&
        e.industry - (cost.industry || 0) >= reserveIndustry;

    if (!planState.saving && g.turn >= 2) {
      const safe = bases.slice().sort((a, b) => frontDistance(b) - frontDistance(a));
      for (const s of safe) {
        const options = ['shipyard', 'lab', 'air']
          .map(kind => ({ kind, level: E.buildingLevel(s, kind), cost: E.buildCost(s, kind) }))
          .filter(o => o.level < 3 && affordable(o.cost))
          .sort((a, b) => a.level - b.level);
        if (options[0] && e.credits - options[0].cost.credits >= 180) {
          E.build(g, s.id, options[0].kind);
          break;
        }
      }
    }

    for (const u of own()
      .filter(
        u =>
          u.stack < 3 &&
          !u.moved &&
          !u.attacked &&
          E.TYPES[u.type].branch !== 'Escort' &&
          u.hp / E.maxHP(u) >= 0.7 &&
          g.stations.some(s => s.owner === side && E.distance(s, u) <= 1),
      )
      .sort((a, b) => E.TYPES[b.type].cost - E.TYPES[a.type].cost)) {
      const cost = E.reinforceCost(u.type);
      if (!E.reinforceReason(g, u) && affordable(cost)) E.reinforce(g, u.id);
    }

    // Front-line yards favor line ships; rear yards provide artillery and air support.
    bases.forEach((s, i) => {
      if (s.producedTurn === g.turn) return;
      const forward = i < Math.ceil(bases.length / 2),
        ships =
          s.tier >= 3
            ? forward
              ? ['battleship', 'heavy', 'frigate', 'missile', 'siege', 'corvette']
              : ['siege', 'missile', 'battleship', 'heavy', 'beam', 'corvette']
            : s.tier === 2
              ? forward
                ? ['heavy', 'destroyer', 'missile', 'corvette']
                : ['missile', 'heavy', 'destroyer', 'corvette']
              : ['light', 'frigate', 'beam', 'corvette'],
        air = ['strategic', 'bomber', 'fighter'].filter(k => (s.air || 0) >= E.TYPES[k].tier),
        menu = forward ? [...ships, ...air] : [...air, ...ships];
      for (const type of menu) {
        let built = false;
        for (let n = 3; n >= 1; n--) {
          const cost = E.price(type, n, g, side);
          if (!E.canBuy(g, s, type, n) || !affordable(cost)) continue;
          if (n > 1 && cost.credits > Math.max(1, e.credits - reserveCredits) * 0.65) continue;
          E.recruit(g, s.id, type, n);
          built = true;
          break;
        }
        if (built) break;
      }
    });

    // Production changes the available force pool; rebuild the theater plan before fleets move.
    planState._planTurn = null;
    if (g.mode === 'conquest') planFor(g, side);
  }

  root.GalacticAI = { FRONT, unitStrength, frontObjectives, planFronts, frontSummary, aiProduction, aiOrder };
  Object.assign(E, { FRONT, frontSummary, planFronts });
})(typeof window !== 'undefined' ? window : globalThis);
