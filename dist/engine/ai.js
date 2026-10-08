/* Galactic Command strategic AI: theater planning, reserves, rallying and tactical execution. */
(function (root) {
  'use strict';
  const E = root.Galactic;
  if (!E) throw new Error('Galactic core must load before engine/ai.js');

  const FRONT = {
    radius: 6,
    near: 10,
    max: 3,
    sticky: 5,
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
            key: 'p' + s.id,
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
          key: 'p' + s.id,
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
      f.transition = prev.type === 'offensive' && f.type === 'defensive';
      f.state = f.type === 'offensive' && prev.type === 'offensive' && prev.state === 'attacking'
        ? 'attacking' : (f.type === 'offensive' ? 'assembling' : 'defending');
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
    // Admirals must lead active formations. A small ordinary-fleet reserve is
    // sufficient; keeping Yang at Heinessen wastes his strongest abilities.
    const candidates = units
      .filter(u => !u.admiral)
      .sort((a, b) => {
        const da = capital ? E.distance(a, capital) : 0,
          db = capital ? E.distance(b, capital) : 0;
        return da - db || unitStrength(a) - unitStrength(b);
      });
    const reserveIds = new Set();
    for (const u of candidates) {
      if (reserveStrength >= reserveTarget) break;
      reserveIds.add(u.id);
      reserveStrength += unitStrength(u);
    }

    // A captured corridor changes from an offensive to a defensive objective.
    // Keep a local garrison, but continue the rest of its assault force toward
    // stations on the far side instead of recalling everyone to the new fort.
    const previous = new Map(units.map(u => [u.id, assignments[u.id]]));
    const garrison = new Map();
    const unassigned = [];
    for (const u of units) {
      if (reserveIds.has(u.id)) {
        assignments[u.id] = { front: 'reserve', until: g.turn + 1 };
        continue;
      }
      const old = assignments[u.id], front = old && byId[old.front];
      if (front?.transition) {
        const nearby = E.distance(u, front.anchor) <= 3;
        const slots = garrison.get(front.id) || 0;
        // Prefer a small, expendable garrison; committed admirals continue the breakthrough.
        if (nearby && !u.admiral && slots < 2) {
          front.assigned.push(u);
          garrison.set(front.id, slots + 1);
          assignments[u.id] = { front: front.id, until: g.turn + FRONT.sticky, garrison: true };
          continue;
        }
      } else if (front && (old.until >= g.turn ||
          (old.garrison && front.type === 'defensive' &&
            E.distance(u, front.anchor) <= 5))) {
        front.assigned.push(u);
        continue;
      }
      unassigned.push(u);
    }

    const assignedStrength = f => f.assigned.reduce((n, u) => n + unitStrength(u), 0);
    const routeTo = (u, p) => {
      const field = E.routeField?.(g, p, u);
      return field?.get(E.key(u)) ?? Infinity;
    };
    for (const u of unassigned) {
      const old = previous.get(u.id), oldFront = old && saved[old.front];
      const oldAnchor = oldFront?.anchor;
      const captured = oldFront?.type === 'offensive' && oldAnchor &&
        ownStations.some(st => st.c === oldAnchor.c && st.r === oldAnchor.r);
      const nearCorridor = captured && (oldAnchor.name === 'Iserlohn' || oldAnchor.name === 'Fezzan');
      const farSide = p => nearCorridor &&
        (side === 'empire' ? p.c >= 27 : p.c <= 23);
      const nextFronts = fronts.filter(f => f.type === 'offensive' && farSide(f.anchor));
      const continuation = nearCorridor && nextFronts.length
        ? nextFronts.slice().sort((a,b) => E.distance(a.anchor, oldAnchor) - E.distance(b.anchor, oldAnchor))[0]
        : null;

      const options = fronts
        .map(f => {
          const distance = routeTo(u, f.anchor);
          if (!Number.isFinite(distance)) return null;
          const deficit = Math.max(FRONT.floor, f.need - assignedStrength(f));
          const sameTheater = oldFront?.anchor &&
            E.distance(f.anchor, oldFront.anchor) <= FRONT.radius + 5;
          let score = deficit / (1 + distance * 0.25);
          if (old?.front === f.id && f.type === 'offensive') score *= 2.2;
          if (continuation && f.id === continuation.id) score *= 3.5;
          if (sameTheater && f.type === 'offensive') score *= 1.3;
          // Avoid sending the offensive force from one corridor to defend the other.
          if (nearCorridor && f.type === 'defensive' && f.anchor.name !== oldAnchor.name)
            score *= 0.25;
          return { f, score };
        })
        .filter(Boolean)
        .sort((a,b) => b.score - a.score);
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
        // Once an assault is underway it remains underway until the objective
        // changes, even if reinforcements have not reached the rally point.
        if (f.state === 'attacking' || contact || strength === 0 ||
            massed >= Math.max(1, strength * 0.6) || f.wait >= FRONT.wait) {
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
    if (f.state === 'assembling') {
      const rally = f.rally || f.anchor;
      // Never order a fleet that already advanced beyond the rally point back to base.
      if (E.distance(u, f.anchor) > E.distance(rally, f.anchor) + 1) return rally;
    }
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
      currentRoute = field?.get(E.key(u));
    // A shielded gate can make a goal temporarily unreachable. Do not march
    // toward it using misleading straight-line distance instead of a legal route.
    if (field && currentRoute == null) return null;
    let best = null,
      bestScore = -Infinity;

    for (const p of spots) {
      const route = field ? field.get(E.key(p)) : E.distance(p, destination);
      if (route == null) continue;
      let score = ((currentRoute ?? E.distance(u, destination)) - route) * 18;
      if (u.aiLastFrom && u.aiLastMoveTurn >= g.turn - 2 &&
          E.key(u.aiLastFrom) === E.key(p)) score -= 80;
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
      // Flagship admirals should reach the battlefield early, but remain with
      // their escorts and avoid advancing into concentrated fire alone.
      if (u.admiral && u.type === 'flagship') {
        const support = allies.filter(v => E.distance(v, p) <= 2 && v.hp > 0).length;
        score += Math.min(3, support) * 12;
        if (nearestEnemy <= 4) {
          score -= danger * 75;
          if (support === 0) score -= 125;
          else if (support < 2) score -= 65;
        }
      }
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
        if (moved.ok) {
          u.aiLastFrom = moved.from;
          u.aiLastMoveTurn = g.turn;
          events.push({ kind: 'move', ...moved, id });
        }
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
        if (moved.ok) {
          u.aiLastFrom = moved.from;
          u.aiLastMoveTurn = g.turn;
          events.push({ kind: 'move', ...moved, id, maneuver: true });
        }
      }
    }
    return events;
  }

  // Paid strikes are strictly secondary to recruiting, repairing and reinforcing fleets.
  // Never impose a per-turn sortie count; affordable, worthwhile attacks determine the count.
  function aiAirStrikes(g, options = {}) {
    const side = g.phase, bank = g.economy[side];
    if (!bank || g.over) return [];
    const bases = g.stations.filter(s => s.owner === side && s.air > 0);
    if (!bases.length) return [];
    const reports = [];
    const frigate = E.price('frigate');
    // Protect both the next turn's fleet purchase and a portion of the remaining treasury.
    // Never spend the last fleet's worth of resources on air support.
    const creditFloor = Math.max(frigate.credits, Math.floor(bank.credits * 0.55),
      options.savingForDreadnought ? E.price('flagship').credits : 0);
    const industryFloor = Math.max(frigate.industry, Math.floor(bank.industry * 0.5),
      options.savingForDreadnought ? E.price('flagship').industry : 0);
    const canPay = (credits, industry) =>
      bank.credits - credits >= creditFloor && bank.industry - industry >= industryFloor;

    const opportunities = (target, unitOnly = false) => {
      const out = [];
      for (const base of bases) for (const [type, strike] of Object.entries(E.AIR_STRIKES)) {
        if (base.air < strike.level || E.distance(base, target) > E.airStrikeRange(g, side, type)) continue;
        const view = E.airStrikePreview(g, base.id, type, target.c, target.r);
        if (view && (unitOnly ? view.unit > 0 : view.shield > 0))
          out.push({ base, type, view, credits: view.cost.credits, industry: view.cost.industry,
            weight: view.cost.credits + view.cost.industry * 2.2 });
      }
      return out;
    };

    // Find the least expensive mixture of fighters/bombers/strategic bombers
    // that can deliver a meaningful *same-turn* shield salvo, not a futile
    // fighter tap erased by enemy shield regeneration.
    const shieldSalvo = (station, possibilities) => {
      if (!possibilities.length) return null;
      const regen = Math.round(station.maxShield *
        (g.units.some(u => u.hp > 0 && u.side === station.owner &&
          u.admiral === 'kessler' && E.distance(u, station) <= 1) ? 0.22 : 0.12));
      const nearFleet = g.units.some(u => u.hp > 0 && u.side === side && E.distance(u, station) <= 3);
      if (!nearFleet) return null; // Breaching a station without approaching fleets is wasted money.
      const bestByType = Object.values(possibilities.reduce((acc, p) => {
        if (!acc[p.type] || p.view.shield / p.weight > acc[p.type].view.shield / acc[p.type].weight)
          acc[p.type] = p;
        return acc;
      }, {}));
      // Prefer breaching all shields when we can afford it. Otherwise a volley
      // must exceed next-turn regeneration by a meaningful margin.
      const budgetCredits = Math.max(0, bank.credits - creditFloor),
        budgetIndustry = Math.max(0, bank.industry - industryFloor);
      const solve = threshold => {
        const sorted = bestByType.slice().sort((a,b) => a.type.localeCompare(b.type));
        const [first, second, third] = [sorted[0], sorted[1], sorted[2]];
        let best = null;
        const limit = p => p ? Math.min(Math.ceil(threshold / p.view.shield),
          Math.floor(budgetCredits / p.credits), Math.floor(budgetIndustry / p.industry)) : 0;
        for (let i = 0; i <= limit(first); i++) for (let j = 0; j <= limit(second); j++) {
          const dealt = i * first.view.shield + (second ? j * second.view.shield : 0);
          const remain = Math.max(0, threshold - dealt);
          const k = remain > 0 && third ? Math.ceil(remain / third.view.shield) : 0;
          if (remain > 0 && !third) {
            if (dealt < threshold) continue;
          }
          if (third && k > limit(third)) continue;
          const credits = i * first.credits + (second ? j * second.credits : 0) + (third ? k * third.credits : 0),
            industry = i * first.industry + (second ? j * second.industry : 0) + (third ? k * third.industry : 0);
          if (!credits || credits > budgetCredits || industry > budgetIndustry) continue;
          const weight = credits + industry * 2.2;
          if (!best || weight < best.weight) {
            best = { weight, credits, industry, actions: [
              ...Array(i).fill(first), ...(second ? Array(j).fill(second) : []),
              ...(third ? Array(k).fill(third) : []),
            ] };
          }
        }
        return best;
      };
      const full = solve(station.shield);
      const threshold = Math.min(station.shield, regen + Math.max(22, Math.round(station.maxShield * 0.06)));
      const selected = full || solve(threshold);
      if (!selected) return null;
      const expectedDamage = Math.min(station.shield, selected.actions.reduce((n,p)=>n+p.view.shield,0));
      const net = full ? expectedDamage : Math.max(0, expectedDamage - regen);
      const relevance = station.capital || station.fort ? 1.3 : 1;
      const score = (net * 0.85 * relevance) / selected.weight;
      return { score, station, actions: selected.actions, cost: selected };
    };

    // Re-evaluate after each attack: enemies die, budgets shrink and shields drop.
    // We may launch any number of cost-effective sorties; no arbitrary sortie cap.
    while (!g.over) {
      const budget = bank.credits - creditFloor;
      if (budget < Math.min(...Object.values(E.AIR_STRIKES).map(t => t.credits * 0.8))) break;
      let best = null;
      const enemies = g.units.filter(u => u.hp > 0 && u.side !== side);
      for (const foe of enemies) {
        for (const p of opportunities(foe, true)) {
          if (!canPay(p.credits, p.industry)) continue;
          const effective = Math.min(foe.hp, p.view.unit);
          const nearHome = bases.some(s => E.distance(s, foe) <= 4);
          const threat = nearHome ? 1.2 : 1;
          const kill = effective >= foe.hp ? 1.4 : 1;
          const elite = foe.admiral ? 1.15 : 1;
          const score = effective * threat * kill * elite / p.weight;
          if (score > 0.17 && (!best || score > best.score)) best = { score, actions: [p] };
        }
      }
      for (const station of g.stations.filter(s => s.owner !== side && s.shield > 0)) {
        // If a garrison is present, focus hull damage first; shield damage is secondary.
        if (g.units.some(u => u.hp > 0 && u.side !== side && u.c === station.c && u.r === station.r))
          continue;
        const salvo = shieldSalvo(station, opportunities(station));
        if (salvo && salvo.score > 0.13 && (!best || salvo.score > best.score)) best = salvo;
      }
      if (!best) break;
      let launched = false;
      for (const p of best.actions) {
        if (g.over || !canPay(p.credits, p.industry)) break;
        const target = best.station || E.unitAt(g, p.view.to);
        if (!target) break;
        const fired = E.airStrike(g, p.base.id, p.type, target.c, target.r);
        if (!fired.ok) break;
        reports.push({ station: p.base.name, type: p.type, c: target.c, r: target.r,
          damage: fired.unitDamage, shields: fired.shieldDamage, credits: fired.cost.credits,
          industry: fired.cost.industry });
        (g.strikes ||= []).push(fired);
        launched = true;
        if (best.station && best.station.shield <= 0) break;
      }
      if (!launched) break;
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

    // Shipbuilding and emergency reinforcements always have priority over air support.
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
          // Do not pin important commanders to the rear for consecutive
          // reinforcement turns; move them toward their front first.
          (!u.admiral || !plan || (() => {
            const f = plan.byId[plan.assignments[u.id]?.front];
            return !f || E.distance(u, f.anchor) <= 12 ||
              enemyUnits.some(v => E.distance(v, u) <= 5);
          })()) &&
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

    // Invest in higher-grade air bases only AFTER purchasing all available fleets.
    // A new bomber/strategic base is valuable only if it can support actual nearby
    // operations. Keep enough cash and alloy to buy another frigate next turn.
    if (!emergency.level && !planState.saving && !upgraded.length && g.turn >= 3) {
      const nextFleet = E.price('frigate');
      const upgradeBases = bases.filter(s => s.air > 0 && s.air < 3 &&
        own().some(u => E.distance(u, s) <= 5))
        .map(st => {
          const nextType = st.air === 1 ? 'bomber' : 'strategic';
          const reach = E.airStrikeRange(g, side, nextType);
          const enemyFleet = enemyUnits.some(u => u.hp > 0 && E.distance(st, u) <= reach),
            enemyStation = g.stations.some(t => t.owner !== side && E.distance(st, t) <= reach &&
              own().some(u => E.distance(u, t) <= 5));
          return { st, value: (enemyFleet ? 2 : 0) + (enemyStation ? 1 : 0) + st.air * 0.1 };
        }).filter(o => o.value >= 1)
        .sort((a,b) => b.value - a.value);
      for (const { st } of upgradeBases) {
        const price = E.buildCost(st, 'air');
        if (e.credits - price.credits < Math.max(175, nextFleet.credits) ||
            e.industry - price.industry < nextFleet.industry || E.buildReason(g, st, 'air'))
          continue;
        const result = E.build(g, st.id, 'air');
        if (result.ok) upgraded.push({ station: st.id, kind: 'air' });
        break;
      }
    }

    // Only genuinely surplus cash is available for airstrikes; fleets have already been purchased.
    const airstrikes = aiAirStrikes(g, { savingForDreadnought: planState.saving });
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

  root.GalacticAI = { aiAirStrikes, FRONT, PROD, unitStrength, frontObjectives, planFronts, frontSummary, productionSummary, aiProduction, aiOrder };
  Object.assign(E, { FRONT, PROD, frontSummary, productionSummary, planFronts });
})(typeof window !== 'undefined' ? window : globalThis);
