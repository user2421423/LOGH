/* Galactic Command standing orders and route planning. */
(function (root) {
  'use strict';
  const E = root.Galactic;
  if (!E) throw new Error('Galactic core must load before engine/orders.js');

  // Route fields are reused heavily by the larger Conquest AI. Cache by game + destination + terrain mode,
  // and use a binary min-heap instead of sorting the whole queue after every expanded hex.
  const routeCache = new WeakMap();
  function routeField(g, destination, unit = null) {
    const dest = E.tile(g, destination?.c, destination?.r),
      field = new Map();
    // A shield-locked flank is not a valid destination. Shielded stations
    // themselves remain valid *goals* so fleets can route to and siege them.
    if (!dest || dest.terrain === 'rift' ||
        (E.corridorLocked(g, dest, unit?.side) && !E.stationAt(g, dest))) return field;
    const ignoresTerrain = !!unit && (E.TYPES[unit.type]?.air || unit.admiral === 'yang'),
      side = unit?.side,
      // Passage ownership and shields can change mid-turn. They must be part
      // of the cached route key or the AI will follow a stale blocked passage.
      gateState = g.era === 'frontier'
        ? g.stations.filter(s => s.name === 'Iserlohn' || s.name === 'Fezzan')
          .map(s => `${s.name}:${s.owner}:${s.shield > 0 ? 1 : 0}`).join(',')
        : '',
      cacheKey = E.key(dest) + ':' + (ignoresTerrain ? 1 : 0) + ':' +
        (side || '?') + ':' + gateState;
    let cache = routeCache.get(g);
    if (!cache) routeCache.set(g, (cache = new Map()));
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const heap = [];
    const push = item => {
      let i = heap.length;
      heap.push(item);
      while (i) {
        const p = (i - 1) >> 1;
        if (heap[p].cost <= item.cost) break;
        heap[i] = heap[p];
        i = p;
      }
      heap[i] = item;
    };
    const pop = () => {
      const root = heap[0],
        last = heap.pop();
      if (heap.length) {
        let i = 0;
        while (true) {
          let child = i * 2 + 1;
          if (child >= heap.length) break;
          if (child + 1 < heap.length && heap[child + 1].cost < heap[child].cost) child++;
          if (heap[child].cost >= last.cost) break;
          heap[i] = heap[child];
          i = child;
        }
        heap[i] = last;
      }
      return root;
    };

    field.set(E.key(dest), 0);
    push({ p: dest, cost: 0 });
    while (heap.length) {
      const cur = pop();
      if (cur.cost !== field.get(E.key(cur.p))) continue;
      for (const n of E.adjacent(g, cur.p)) {
        if (n.terrain === 'rift' || E.corridorLocked(g, n, side)) continue;
        const step = ignoresTerrain ? 1 : n.terrain === 'nebula' || n.terrain === 'asteroid' ? 2 : 1,
          cost = cur.cost + step,
          k = E.key(n);
        if (cost >= (field.get(k) ?? Infinity)) continue;
        field.set(k, cost);
        push({ p: n, cost });
      }
    }
    cache.set(cacheKey, field);
    return field;
  }

  function destinationReason(g, unit, c, r) {
    if (!unit || unit.hp <= 0) return 'Fleet not found.';
    if (g.over) return 'Operation over';
    if (unit.side !== g.player) return 'Only your fleets can receive standing orders.';
    const p = E.tile(g, c, r);
    if (!p) return 'That sector is outside the map.';
    if (p.terrain === 'rift') return 'A fleet cannot set course into a gravity rift.';
    if (E.corridorLocked(g, p, unit.side) && !E.stationAt(g, p))
      return 'Corridor station shields must fall before that flank opens.';
    if (!routeField(g, p, unit).has(E.key(unit))) return 'No navigable route reaches that sector.';
    return null;
  }

  function setDestination(g, id, c, r) {
    const unit = g.units.find(u => u.id === id);
    const why = destinationReason(g, unit, c, r);
    if (why) return { ok: false, reason: why };
    if (unit.c === c && unit.r === r) {
      delete unit.destination;
      return { ok: true, arrived: true, destination: { c, r } };
    }
    unit.destination = { c, r };
    return { ok: true, destination: { ...unit.destination } };
  }

  function clearDestination(g, id) {
    const unit = g.units.find(u => u.id === id);
    if (!unit) return { ok: false, reason: 'Fleet not found.' };
    const had = !!unit.destination;
    delete unit.destination;
    return { ok: true, cleared: had };
  }

  function advanceDestination(g, id) {
    const unit = g.units.find(u => u.id === id);
    if (!unit || unit.hp <= 0 || !unit.destination) return { ok: false, reason: 'No standing order.' };
    if (unit.side !== g.phase || g.over) return { ok: false, reason: 'Fleet is not ready for this phase.' };
    if (unit.c === unit.destination.c && unit.r === unit.destination.r) {
      const destination = { ...unit.destination };
      delete unit.destination;
      return { ok: true, arrived: true, destination };
    }
    const field = routeField(g, unit.destination, unit);
    const here = field.get(E.key(unit));
    if (here == null) return { ok: false, reason: 'No navigable route.', blocked: true };
    const reachable = E.reachable(g, unit);
    if (!reachable.size) return { ok: false, reason: 'No open route this turn.', blocked: true };

    let best = null;
    for (const [k, moveCost] of reachable) {
      const route = field.get(k);
      if (route == null || route >= here) continue;
      const [c, r] = k.split(',').map(Number);
      const p = E.tile(g, c, r);
      let score = route * 100 + moveCost;
      if (E.TYPES[unit.type]?.air && unit.admiral !== 'konev' && !E.airSupplied(g, unit.side, p)) score += 180;
      if (!best || score < best.score) best = { p, score, route };
    }
    if (!best) return { ok: false, reason: 'Route is temporarily blocked.', blocked: true };

    const moved = E.move(g, id, best.p.c, best.p.r);
    if (!moved.ok) return moved;
    const destination = { ...unit.destination };
    const arrived = unit.c === destination.c && unit.r === destination.r;
    if (arrived) delete unit.destination;
    return { ...moved, standing: true, arrived, destination };
  }

  function runStandingOrders(g, side = g.player) {
    if (g.over || g.phase !== side) return [];
    const events = [];
    const ids = g.units
      .filter(u => u.hp > 0 && u.side === side && u.destination)
      .sort((a, b) => (a.admiral ? -1 : 0) - (b.admiral ? -1 : 0) || a.id - b.id)
      .map(u => u.id);
    for (const id of ids) {
      const r = advanceDestination(g, id);
      if (r.ok) events.push({ id, ...r });
    }
    return events;
  }

  Object.assign(E, {
    routeField,
    destinationReason,
    setDestination,
    clearDestination,
    advanceDestination,
    runStandingOrders,
  });
})(typeof window !== 'undefined' ? window : globalThis);
