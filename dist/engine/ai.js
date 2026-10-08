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
      const corridor = s.name === 'Iserlohn' || s.name === 'Fezzan',
        strategic = s.capital || s.fort || corridor;
      // On the large galaxy, high command expands from its current network instead of planning against every
      // far-side world at once. The two navigation corridors are always strategic objectives.
      if (corridor || nearOwn(s)) {
        list.push({
          key: 's' + s.id,
          c: s.c,
          r: s.r,
          name: s.name,
          owner: s.owner,
          value: stationValue(s) + (s.owner === 'neutral' ? 8 : 0),
          seed: strategic ? -6 : -2,
          fortified: !!(s.fort || s.capital),
          corridor,
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
      f.vital = defend.some(o => o.vital) || f.objectives.some(o => o.corridor);
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

    // Admirals such as Mittermeyer and Bittenfeld may earn movement after firing. Use it to continue toward
    // the assigned front without granting another attack.
    if (!g.over && u.repositionTurn === g.turn && u.reposition > 0 && !u.moved) {
      const p = bestMove(g, u, destination, plan || {});
      if (p) {
        const moved = E.move(g, id, p.c, p.r);
        if (moved.ok) events.push({ kind: 'move', ...moved, id, maneuver: true });
      }
    }
    return events;
  }

  function aiAirStrikes(g) {
    const side = g.phase, economy = g.economy[side];
    if (!economy || g.over) return [];
    const bases = g.stations.filter(st => st.owner === side && (st.air || 0) > 0),
      opposing = () => g.units.filter(u => u.hp > 0 && u.side !== side),
      reports = [];
    if (!bases.length) return reports;
    const emergency = g.units.some(u => u.hp > 0 && u.side !== side &&
      g.stations.some(st => st.owner === side && E.distance(u, st) <= 4));
    const initial = { credits: economy.credits, industry: economy.industry },
      reserveCredits = Math.floor(initial.credits * (emergency ? 0.75 : 0.8)),
      reserveIndustry = Math.floor(initial.industry * (emergency ? 0.7 : 0.8));
    // No hard sortie limit. Every loop consumes resources, removes targets or stops.
    while (!g.over) {
      const targets = [
        ...opposing().map(u => ({ c: u.c, r: u.r })),
        ...g.stations.filter(st => st.owner !== side && st.shield > 0).map(st => ({ c: st.c, r: st.r })),
      ];
      let best = null;
      for (const station of bases) for (const [type, strike] of Object.entries(E.AIR_STRIKES)) {
        if ((station.air || 0) < strike.level) continue;
        const price = E.airStrikeCost(g, side, type);
        if (economy.credits - price.credits < reserveCredits ||
            economy.industry - price.industry < reserveIndustry) continue;
        for (const point of targets) {
          if (E.distance(station, point) > E.airStrikeRange(g, side, type)) continue;
          const view = E.airStrikePreview(g, station.id, type, point.c, point.r);
          if (!view) continue;
          const unit = E.unitAt(g, point), defendedStation = E.stationAt(g, point);
          const effectiveUnit = unit && unit.side !== side ? Math.min(unit.hp, view.unit) : 0,
            effectiveShield = defendedStation && defendedStation.owner !== side ?
              Math.min(defendedStation.shield, view.shield) : 0;
          let priority = effectiveUnit + effectiveShield * 0.75;
          if (unit && unit.side !== side && effectiveUnit >= unit.hp) priority += 25;
          if (defendedStation && defendedStation.owner !== side && defendedStation.shield > 0)
            priority += defendedStation.capital || defendedStation.fort ? 18 : 7;
          if (unit?.admiral && unit.side !== side) priority += 10;
          const efficiency = priority / Math.max(1, price.credits + price.industry * 2.2);
          if (efficiency > 0.2 && (!best || efficiency > best.score))
            best = { station, type, point, score: efficiency };
        }
      }
      if (!best) break;
      const fired = E.airStrike(g, best.station.id, best.type, best.point.c, best.point.r);
      if (!fired.ok) break;
      reports.push({ station: best.station.name, type: best.type, c: best.point.c, r: best.point.r,
        damage: fired.unitDamage, shields: fired.shieldDamage });
      (g.strikes ||= []).push(fired);
    }
    return reports;
  }

  const PROD = {
    mix: { 'Battle Line': 0.5, Escort: 0.25, Artillery: 0.25 },
    constructionIndustry: 0.4,
    constructionCredits: 0.18,
    emergencyRange: 4,
    dreadnoughts: 2,
  };

  const branchOfType = type => E.TYPES[type]?.air ? 'Air' : E.TYPES[type]?.branch;
  const sumStrength = units => units.reduce((n, u) => n + unitStrength(u), 0);
  const branchStrength = units => {
    const out = { 'Battle Line': 0, Escort: 0, Artillery: 0, Air: 0 };
    for (const u of units) {
      const b = branchOfType(u.type);
      if (out[b] != null) out[b] += unitStrength(u);
    }
    return out;
  };
  const normalizeMix = mix => {
    const out = { ...mix },
      total = Object.values(out).reduce((n, v) => n + Math.max(0.01, v), 0);
    for (const k of Object.keys(out)) out[k] = Math.max(0.01, out[k]) / total;
    return out;
  };
  const difficultyMind = g =>
    g.difficulty === 'challenge'
      ? { counter: 1, local: 1, cycle: 1, reserve: 1.2 }
      : g.difficulty === 'hard'
        ? { counter: 0.72, local: 0.85, cycle: 0.45, reserve: 1.08 }
        : { counter: 0.35, local: 0.65, cycle: 0, reserve: 1 };

  function routeDistance(g, p, destination, unit = null) {
    if (!p || !destination) return 999;
    const field = E.routeField ? E.routeField(g, destination, unit || { type: 'heavy' }) : null;
    return field?.get(E.key(p)) ?? E.distance(p, destination);
  }

  function frontEnemyUnits(g, side, front, radius = 6) {
    const enemy = hostileSide(side);
    return alive(g, enemy).filter(u =>
      front?.objectives?.some(o => routeDistance(g, u, o, u) <= radius || E.distance(u, o) <= radius),
    );
  }

  function compositionTarget(g, side, front) {
    const mind = difficultyMind(g),
      mix = { ...PROD.mix },
      enemies = front ? frontEnemyUnits(g, side, front) : alive(g, hostileSide(side)),
      enemy = branchStrength(enemies),
      total = Math.max(1, Object.values(enemy).reduce((n, v) => n + v, 0)),
      ratio = Object.fromEntries(Object.entries(enemy).map(([k, v]) => [k, v / total])),
      fortified = !!front?.objectives?.some(o => o.fortified),
      defensive = front?.type === 'defensive';

    // Counter-production: screens hunt artillery, fighters/screens answer air, frigates/artillery crack battle lines.
    mix.Escort += mind.counter * (ratio.Artillery * 0.55 + ratio.Air * 0.3 + ratio['Battle Line'] * 0.08);
    mix.Artillery += mind.counter * (ratio['Battle Line'] * 0.24 + (fortified ? 0.12 : 0));
    mix['Battle Line'] += mind.counter * (ratio.Escort * 0.1 + (defensive ? 0.08 : 0));
    return { mix: normalizeMix(mix), enemy, enemyRatio: ratio, fortified, enemies };
  }

  function frontProductionNeed(g, side, front) {
    const target = compositionTarget(g, side, front),
      assigned = front?.assigned || [],
      have = branchStrength(assigned),
      totalHave = Math.max(1, sumStrength(assigned)),
      strengthGoal = Math.max(front?.need || 2, totalHave),
      deficit = {};
    for (const branch of Object.keys(PROD.mix))
      deficit[branch] = Math.max(0, strengthGoal * target.mix[branch] - have[branch]);
    return { ...target, have, deficit, strengthGoal };
  }

  function emergencyState(g, side, plan) {
    const enemies = alive(g, hostileSide(side)),
      capital = plan?.capital,
      vitalStations = g.stations.filter(
        s => s.owner === side && (s.capital || s.fort || s.name === 'Iserlohn' || s.name === 'Fezzan'),
      );
    let level = 0,
      target = null;
    if (capital) {
      const d = enemies.length ? Math.min(...enemies.map(u => routeDistance(g, u, capital, u))) : 999;
      if (d <= PROD.emergencyRange) {
        level = 2;
        target = capital;
      }
    }
    for (const s of vitalStations) {
      const d = enemies.length ? Math.min(...enemies.map(u => routeDistance(g, u, s, u))) : 999;
      if (d <= 3 && level < 2) {
        level = 2;
        target = s;
      } else if (d <= 5 && level < 1) {
        level = 1;
        target = s;
      }
    }
    const defensive = plan?.fronts?.find(f => f.vital && f.type === 'defensive');
    if (defensive && level < 1) {
      level = 1;
      target = defensive.anchor;
    }
    return { level, target, front: defensive || null };
  }

  function reserveStatus(g, side, plan) {
    const ownUnits = alive(g, side),
      total = sumStrength(ownUnits),
      reserveUnits = ownUnits.filter(u => plan?.assignments?.[u.id]?.front === 'reserve'),
      strength = sumStrength(reserveUnits),
      target = total * FRONT.reserve * difficultyMind(g).reserve;
    return { units: reserveUnits, strength, target, deficit: Math.max(0, target - strength) };
  }

  function yardPlan(g, side, station, plan) {
    const fronts = plan?.fronts || [],
      probe = { type: 'heavy' };
    let best = null;
    for (const f of fronts) {
      const destination = f.rally || f.anchor,
        distance = routeDistance(g, station, destination, probe);
      if (!best || distance < best.distance) best = { front: f, distance, destination };
    }
    const reserve = reserveStatus(g, side, plan),
      frontDistances = fronts.map(f => routeDistance(g, station, f.anchor, probe)).filter(Number.isFinite),
      minFront = frontDistances.length ? Math.min(...frontDistances) : 999,
      forward = minFront <= 7,
      rear = minFront >= 11;
    if (reserve.deficit > 0 && rear)
      return {
        kind: 'reserve',
        distance: minFront,
        destination: plan?.capital,
        front: null,
        fallbackFront: best?.front || null,
        fallbackDestination: best?.destination || plan?.capital,
        forward,
        rear,
      };
    return { kind: 'front', ...(best || { front: null, distance: 999, destination: plan?.capital }), forward, rear };
  }

  function globalDeficits(g, side) {
    const units = alive(g, side),
      have = branchStrength(units),
      total = Math.max(1, sumStrength(units)),
      deficit = {};
    for (const branch of Object.keys(PROD.mix)) deficit[branch] = Math.max(0, total * PROD.mix[branch] - have[branch]);
    return { have, total, deficit };
  }

  function typeSpecialtyScore(g, side, type, need, context) {
    const t = E.TYPES[type],
      branch = branchOfType(type),
      er = need.enemyRatio || {},
      fortified = need.fortified,
      emergency = context.emergency.level,
      front = context.yard.front;
    let score = 0;

    if (type === 'destroyer') score += 120 * (er.Artillery || 0) + 95 * (er.Air || 0);
    if (type === 'frigate') score += 70 * (er['Battle Line'] || 0) + 60 * (er.Artillery || 0) + 45 * (er.Air || 0) + (fortified ? 14 : 0);
    if (type === 'fighter') score += 170 * (er.Air || 0);
    if (branch === 'Artillery' && ((er.Artillery || 0) > 0.45 || (er.Air || 0) > 0.35))
      score -= 90 * Math.max(er.Artillery || 0, er.Air || 0);
    if (type === 'missile') score += 35 * (er['Battle Line'] || 0) + (fortified ? 12 : 0);
    if (type === 'siege') score += fortified ? 55 : 8;
    if (type === 'bomber') score += fortified ? 36 : 8;
    if (type === 'strategic') score += fortified ? 44 : 6;
    if (type === 'heavy') score += 10;
    if (type === 'battleship') score += 16;

    if (emergency) {
      if (['destroyer', 'light', 'heavy', 'frigate', 'corvette', 'fighter'].includes(type)) score += 28 * emergency;
      if (['flagship', 'siege', 'strategic'].includes(type)) score -= 18 * emergency;
    }
    if (context.yard.forward) {
      if (branch === 'Battle Line' || branch === 'Escort') score += 18;
      if (type === 'siege' || type === 'strategic') score -= 10;
    }
    if (context.yard.rear) {
      if (branch === 'Artillery' || branch === 'Air') score += 16;
      if (type === 'flagship') score += 12;
    }
    if (front?.type === 'defensive' && ['heavy', 'battleship', 'frigate', 'fighter'].includes(type)) score += 10;
    return score;
  }

  function combatEfficiency(type, stack) {
    const t = E.TYPES[type],
      hpFactor = 1 + 0.7 * (stack - 1),
      fireFactor = 1 + 0.45 * (stack - 1),
      range = (t.max || 1) + (t.noCounter ? 0.6 : 0),
      value = t.attack * fireFactor + t.hp * hpFactor * 0.12 + t.armor * 2 + t.move * 7 + range * 8;
    return value;
  }

  function chooseDeployment(g, side, station, type, destination) {
    const spots = E.recruitOptions(g, station, side);
    if (!spots.length) return null;
    const branch = branchOfType(type),
      enemies = alive(g, hostileSide(side)),
      field = destination && E.routeField ? E.routeField(g, destination, { type }) : null,
      stationRoute = field?.get(E.key(station)) ?? (destination ? E.distance(station, destination) : 0);
    let best = spots[0],
      bestScore = -Infinity;
    for (const p of spots) {
      const route = field?.get(E.key(p)) ?? (destination ? E.distance(p, destination) : 0),
        progress = stationRoute - route,
        danger = enemies.filter(u => E.distance(u, p) <= 1).length,
        nearestEnemy = enemies.length ? Math.min(...enemies.map(u => E.distance(u, p))) : 12;
      let score = progress * 14 - danger * 40;
      if (branch === 'Artillery') {
        score -= Math.max(0, 2 - nearestEnemy) * 35;
        if (progress > 0) score -= 8;
      } else if (branch === 'Escort') score += progress * 5;
      else score += progress * 3;
      if (E.stationAt(g, p) === station) score += branch === 'Artillery' ? 8 : -2;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  function candidateBuilds(g, side, station, context) {
    const e = g.economy[side],
      mind = difficultyMind(g),
      global = context.global,
      need = context.need,
      desired = context.yard.kind === 'reserve'
        ? { 'Battle Line': 1.2, Escort: 1.05, Artillery: 0.25 }
        : need.deficit,
      lastBranch = context.planState.productionHistory?.[context.yard.front?.id || 'reserve'],
      types = Object.keys(E.TYPES).filter(type => !E.TYPES[type].elite && !E.TYPES[type].air),
      candidates = [];

    for (const type of types) {
      const branch = branchOfType(type);
      if (!['Battle Line', 'Escort', 'Artillery', 'Air'].includes(branch)) continue;
      for (let stack = 1; stack <= 3; stack++) {
        if (!E.canBuy(g, station, type, stack)) continue;
        const cost = E.price(type, stack, g, side);
        if (cost.credits > e.credits || cost.industry > e.industry) continue;
        const localNeed = Number(desired[branch] || 0),
          globalNeed = Number(global.deficit[branch] || 0),
          efficiency = combatEfficiency(type, stack) / Math.max(40, cost.credits + cost.industry * 1.7);
        let score = localNeed * 32 * mind.local + globalNeed * 10 + efficiency * 22;
        score += typeSpecialtyScore(g, side, type, need, context);

        // Larger stacks trade resource efficiency for density. Favor them only when a front is pressured and the economy is healthy.
        score += (stack - 1) * (context.emergency.level ? 9 : context.yard.forward ? 4 : -5);
        if (stack > 1 && cost.credits > e.credits * 0.58) score -= 24;
        if (stack > 1 && cost.industry > e.industry * 0.58) score -= 18;

        // Challenge high command deliberately alternates combat and support arms to assemble combined forces.
        if (mind.cycle && lastBranch) {
          const support = branch === 'Artillery' || branch === 'Air',
            lastSupport = lastBranch === 'Artillery' || lastBranch === 'Air';
          if (support !== lastSupport) score += 18 * mind.cycle;
          else score -= 7 * mind.cycle;
        }

        // Rear reserve production should be flexible rather than specialist-heavy.
        if (context.yard.kind === 'reserve') {
          if (['heavy', 'destroyer', 'fighter'].includes(type)) score += 35;
          if (['siege', 'strategic', 'flagship'].includes(type)) score -= 20;
        }
        candidates.push({ type, stack, branch, cost, score });
      }
    }
    return candidates.sort((a, b) => b.score - a.score || a.cost.credits - b.cost.credits);
  }

  function reinforcementScore(g, u, plan) {
    const t = E.TYPES[u.type],
      assignment = plan?.assignments?.[u.id],
      front = assignment && assignment.front !== 'reserve' ? plan.byId[assignment.front] : null;
    let score = t.cost / 12 + (u.admiral ? 35 : 0) + (u.type === 'flagship' ? 45 : u.type === 'battleship' ? 28 : 0);
    if (front?.vital) score += 16;
    if (front?.type === 'defensive') score += 10;
    if (t.branch === 'Artillery') score += 10;
    if (t.branch === 'Escort' && !u.admiral) score -= 18;
    score -= (u.stack - 1) * 12;
    return score;
  }

  function shouldSaveForDreadnought(g, side, plan, emergency, reserve) {
    const e = g.economy[side],
      ownUnits = alive(g, side),
      flagships = ownUnits.filter(u => u.type === 'flagship').length,
      tier3 = g.stations.filter(s => s.owner === side && s.tier >= 3),
      inc = E.income(g, side),
      frontsStable = !(plan?.fronts || []).some(f => f.vital && f.type === 'defensive');
    if (g.turn < 4 || flagships >= PROD.dreadnoughts || !tier3.length || emergency.level || !frontsStable) return false;
    if (reserve.deficit > Math.max(0.5, reserve.target * 0.35)) return false;
    return e.credits >= 220 && e.industry >= 65 && inc.credits >= 120 && inc.industry >= 55;
  }

  function productionSummary(g, side) {
    const p = g.ai?.[side]?.procurement;
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  function aiProduction(g) {
    const side = g.phase,
      e = g.economy[side],
      enemy = hostileSide(side),
      own = () => alive(g, side),
      enemyUnits = alive(g, enemy),
      planState = ((g.ai ||= {})[side] ||= {}),
      plan = g.mode === 'conquest' ? planFor(g, side) : null,
      emergency = emergencyState(g, side, plan),
      reserve = reserveStatus(g, side, plan),
      global = globalDeficits(g, side),
      bases = g.stations.filter(s => s.owner === side),
      usableYards = bases.filter(s => E.recruitOptions(g, s, side).length),
      yardPlans = new Map(bases.map(s => [s.id, yardPlan(g, side, s, plan)])),
      built = [],
      reinforced = [],
      upgraded = [];

    planState.productionHistory ||= {};
    g.strikes = [];

    // Fortresses always fire before spending resources.
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

    // Preserve crippled fleets before procurement, but do not drain the treasury below a minimal construction floor.
    const repairCreditFloor = emergency.level ? 25 : Math.min(90, Math.floor(e.credits * 0.18));
    for (const u of own()
      .filter(u => u.hp / E.maxHP(u) < 0.55 && g.stations.some(s => s.owner === side && E.distance(s, u) <= 1))
      .sort((a, b) => a.hp / E.maxHP(a) - b.hp / E.maxHP(b))) {
      if (!E.repairReason(g, u) && e.credits - E.repairCost(u, g) >= repairCreditFloor) E.repair(g, u.id);
    }

    // Reserve most of the treasury for production; do not pre-empt emergency defenses.
    const airstrikes = emergency.level >= 2 ? [] : aiAirStrikes(g);
    const flagPrice = E.price('flagship'),
      tier3 = bases.filter(s => s.tier >= 3),
      strategicSave = shouldSaveForDreadnought(g, side, plan, emergency, reserve);
    planState.saving = strategicSave;

    // Healthy theaters deliberately save for a second dreadnought. Emergencies cancel saving immediately.
    if (strategicSave && e.credits >= flagPrice.credits && e.industry >= flagPrice.industry) {
      const yard = tier3
        .filter(s => E.canBuy(g, s, 'flagship', 1))
        .sort((a, b) => (yardPlans.get(b.id)?.distance || 0) - (yardPlans.get(a.id)?.distance || 0))[0];
      if (yard) {
        const yp = yardPlans.get(yard.id),
          position = chooseDeployment(g, side, yard, 'flagship', yp?.destination),
          r = E.recruit(g, yard.id, 'flagship', 1, position);
        if (r.ok) {
          const frontId = yp?.front?.id || 'reserve';
          if (plan) plan.assignments[r.unit.id] = { front: frontId, until: g.turn + FRONT.sticky };
          built.push({ id: r.unit.id, station: yard.id, type: 'flagship', stack: 1, front: frontId });
          planState.productionHistory[frontId] = 'Battle Line';
          planState.saving = false;
        }
      }
    }

    const constructionIndustry =
        usableYards.length && !emergency.level ? Math.floor(e.industry * PROD.constructionIndustry) : 0,
      constructionCredits =
        usableYards.length && !emergency.level ? Math.floor(e.credits * PROD.constructionCredits) : 0,
      dreadCredits = planState.saving ? Math.min(e.credits, flagPrice.credits) : 0,
      dreadIndustry = planState.saving ? Math.min(e.industry, flagPrice.industry) : 0,
      supportAffordable = cost =>
        e.credits - (cost.credits || 0) >= Math.max(constructionCredits, dreadCredits) &&
        e.industry - (cost.industry || 0) >= Math.max(constructionIndustry, dreadIndustry);

    // Infrastructure is a rear-area investment. Never upgrade while a vital front is in emergency.
    if (!emergency.level && !planState.saving && g.turn >= 2) {
      const safe = bases
        .slice()
        .sort((a, b) => (yardPlans.get(b.id)?.distance || 999) - (yardPlans.get(a.id)?.distance || 999));
      for (const s of safe) {
        const yp = yardPlans.get(s.id),
          need = yp?.front ? frontProductionNeed(g, side, yp.front) : compositionTarget(g, side, null),
          airNeed = g.units.some(u => u.hp > 0 && u.side !== side && E.distance(u, s) <= 10)
            || g.stations.some(v => v.owner !== side && E.distance(v, s) <= 9) ? 4 : 0;
        const options = ['shipyard', 'air', 'lab']
          .map(kind => ({
            kind,
            level: E.buildingLevel(s, kind),
            cost: E.buildCost(s, kind),
            score:
              (kind === 'air' ? airNeed * 12 : 0) +
              (kind === 'shipyard' && s.tier < 2 ? 30 : 0) +
              (kind === 'lab' ? 5 : 0) -
              E.buildingLevel(s, kind) * 3,
          }))
          .filter(o => o.level < 3 && supportAffordable(o.cost))
          .sort((a, b) => b.score - a.score);
        if (options[0] && e.credits - options[0].cost.credits >= Math.max(160, constructionCredits)) {
          const up = E.build(g, s.id, options[0].kind);
          if (up.ok) upgraded.push({ station: s.id, kind: options[0].kind });
          break;
        }
      }
    }

    // Reinforcement is selective: protect admirals/capital ships and pressured fronts, but preserve new-build industry.
    for (const u of own()
      .filter(
        u =>
          u.stack < 3 &&
          !u.moved &&
          !u.attacked &&
          u.hp / E.maxHP(u) >= 0.7 &&
          g.stations.some(s => s.owner === side && E.distance(s, u) <= 1),
      )
      .sort((a, b) => reinforcementScore(g, b, plan) - reinforcementScore(g, a, plan))) {
      const cost = E.reinforceCost(u.type),
        score = reinforcementScore(g, u, plan);
      if (score < (emergency.level ? 30 : 42)) continue;
      if (!E.reinforceReason(g, u) && supportAffordable(cost)) {
        const r = E.reinforce(g, u.id);
        if (r.ok) reinforced.push(u.id);
      }
    }

    // Build by strategic demand rather than a fixed hull list. Each yard is tied to its nearest reachable front
    // (or to the reserve), so Iserlohn and Fezzan can request different force mixes.
    const buildOrder = usableYards.slice().sort((a, b) => {
      const ya = yardPlans.get(a.id),
        yb = yardPlans.get(b.id);
      if (emergency.level) {
        const da = emergency.target ? routeDistance(g, a, emergency.target) : ya?.distance || 999,
          db = emergency.target ? routeDistance(g, b, emergency.target) : yb?.distance || 999;
        return da - db;
      }
      if (reserve.deficit > 0 && ya?.kind !== yb?.kind) return ya?.kind === 'reserve' ? -1 : 1;
      return (ya?.distance || 999) - (yb?.distance || 999);
    });

    for (const s of buildOrder) {
      if (s.producedTurn === g.turn) continue;
      const originalYard = yardPlans.get(s.id) || { kind: 'reserve', destination: plan?.capital, front: null },
        liveReserve = reserveStatus(g, side, plan),
        yp =
          originalYard.kind === 'reserve' && liveReserve.deficit <= 0 && originalYard.fallbackFront
            ? {
                ...originalYard,
                kind: 'front',
                front: originalYard.fallbackFront,
                destination: originalYard.fallbackDestination,
              }
            : originalYard,
        targetFront = emergency.front && emergency.level >= 2 ? emergency.front : yp?.front,
        liveGlobal = globalDeficits(g, side),
        need = targetFront
          ? frontProductionNeed(g, side, targetFront)
          : { ...compositionTarget(g, side, null), deficit: liveGlobal.deficit },
        context = { yard: yp, need, global: liveGlobal, emergency, planState },
        candidates = candidateBuilds(g, side, s, context);
      let choice = null;
      for (const cand of candidates) {
        // During dreadnought saving, spend only true surplus unless there is an emergency.
        const creditFloor = !emergency.level && planState.saving ? dreadCredits : 0,
          industryFloor = !emergency.level && planState.saving ? dreadIndustry : 0;
        if (e.credits - cand.cost.credits < creditFloor || e.industry - cand.cost.industry < industryFloor) continue;
        choice = cand;
        break;
      }
      if (!choice) continue;

      const destination = emergency.level >= 2 && emergency.target ? emergency.target : yp?.destination,
        position = chooseDeployment(g, side, s, choice.type, destination),
        result = E.recruit(g, s.id, choice.type, choice.stack, position);
      if (!result.ok) continue;

      let frontId = yp?.kind === 'reserve' ? 'reserve' : targetFront?.id || 'reserve';
      if (emergency.front && emergency.level >= 2) frontId = emergency.front.id;
      if (plan) {
        plan.assignments[result.unit.id] = { front: frontId, until: g.turn + FRONT.sticky };
        if (frontId !== 'reserve' && targetFront) targetFront.assigned.push(result.unit);
      }
      planState.productionHistory[frontId] = choice.branch;
      built.push({
        id: result.unit.id,
        station: s.id,
        type: choice.type,
        stack: choice.stack,
        branch: choice.branch,
        front: frontId,
        score: Math.round(choice.score),
      });
    }

    // Emergency spending first: air support can only use funds remaining after new ships.
    if (emergency.level >= 2 && !g.over) airstrikes.push(...aiAirStrikes(g));
    planState.procurement = {
      turn: g.turn,
      emergency: emergency.level,
      savingForDreadnought: !!planState.saving,
      constructionReserve: { credits: constructionCredits, industry: constructionIndustry },
      reserve: { strength: reserve.strength, target: reserve.target, deficit: reserve.deficit },
      fronts: (plan?.fronts || []).map(f => {
        const need = frontProductionNeed(g, side, f);
        return { id: f.id, name: f.anchor.name, type: f.type, desiredMix: need.mix, deficit: need.deficit };
      }),
      yards: bases.map(s => ({
        id: s.id,
        name: s.name,
        role: yardPlans.get(s.id)?.kind || 'front',
        front: yardPlans.get(s.id)?.front?.anchor?.name || null,
        route: yardPlans.get(s.id)?.distance ?? null,
        forward: !!yardPlans.get(s.id)?.forward,
        rear: !!yardPlans.get(s.id)?.rear,
      })),
      built,
      reinforced,
      upgraded,
      airstrikes,
    };

    // New construction has an explicit assignment immediately; rebuilding keeps that sticky assignment while
    // incorporating the new strength into rally and reserve calculations.
    planState._planTurn = null;
    if (g.mode === 'conquest') planFor(g, side);
  }

  root.GalacticAI = { FRONT, PROD, unitStrength, frontObjectives, planFronts, frontSummary, productionSummary, aiProduction, aiOrder };
  Object.assign(E, { FRONT, PROD, frontSummary, productionSummary, planFronts });
})(typeof window !== 'undefined' ? window : globalThis);
