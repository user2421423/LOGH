const test = require('node:test'),
  assert = require('node:assert/strict'),
  E = require('../dist/engine.js');
function blank() {
  const g = E.createGame('alliance', 'normal', 'conquest', 123);
  g.cols = 9;
  g.rows = 9;
  g.tiles = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) g.tiles.push({ c, r, terrain: 'space', owner: 'neutral' });
  g.units = [];
  g.stations = [];
  g.mode = 'conquest';
  g.stations = [
    {
      id: 0,
      name: 'Friendly capital',
      c: 0,
      r: 0,
      owner: 'alliance',
      capital: true,
      tier: 1,
      shield: 100,
      maxShield: 100,
      income: 0,
      industry: 0,
      science: 0,
    },
    {
      id: 1,
      name: 'Enemy capital',
      c: 8,
      r: 8,
      owner: 'empire',
      capital: true,
      tier: 1,
      shield: 100,
      maxShield: 100,
      income: 0,
      industry: 0,
      science: 0,
    },
  ];
  g.phase = 'alliance';
  g.over = null;
  g.nextId = 1;
  g.economy.alliance = { credits: 5000, industry: 5000, science: 5000 };
  return g;
}
function station(g, c, r, owner = 'alliance', shield = 150, tier = 3) {
  const s = {
    id: g.stations.length,
    name: 'Test Station',
    c,
    r,
    owner,
    tier,
    shield,
    maxShield: 150,
    income: 50,
    industry: 25,
    science: 10,
    producedTurn: 0,
  };
  g.stations.push(s);
  return s;
}

test('Movement obeys terrain, occupancy, and one-move rule', () => {
  let g = blank();
  const u = E.newUnit(g, 'siege', 'alliance', 2, 2);
  E.tile(g, 3, 2).terrain = 'nebula';
  assert(!E.reachable(g, u).has('3,2'));
  E.tile(g, 3, 2).terrain = 'space';
  assert(E.move(g, u.id, 3, 2).ok);
  assert(!E.move(g, u.id, 4, 2).ok);
  g = blank();
  const a = E.newUnit(g, 'corvette', 'alliance', 2, 2);
  E.tile(g, 3, 2).terrain = 'rift';
  assert(!E.reachable(g, a).has('3,2'));
  E.newUnit(g, 'corvette', 'empire', 2, 3);
  assert(!E.reachable(g, a).has('2,3'));
});

test('Beam artillery suppresses adjacent retaliation; conventional ships take it', () => {
  const g = blank(),
    a = E.newUnit(g, 'beam', 'alliance', 2, 2),
    b = E.newUnit(g, 'heavy', 'empire', 3, 2, 3);
  const result = E.attack(g, a.id, 3, 2);
  assert.equal(result.counter, 0);
  assert.equal(a.hp, E.maxHP(a));
  const g2 = blank(),
    c = E.newUnit(g2, 'light', 'alliance', 2, 2),
    d = E.newUnit(g2, 'heavy', 'empire', 3, 2, 3);
  assert(E.attack(g2, c.id, 3, 2).counter > 0);
  assert(c.hp < E.maxHP(c));
});

test('Station defenses must fall before occupation; artillery cannot capture', () => {
  const g = blank(),
    s = station(g, 3, 2, 'empire', 150),
    u = E.newUnit(g, 'corvette', 'alliance', 2, 2);
  assert(!E.move(g, u.id, 3, 2).ok);
  s.shield = 0;
  assert(E.move(g, u.id, 3, 2).ok);
  assert.equal(s.owner, 'alliance');
  const h = blank(),
    s2 = station(h, 3, 2, 'empire', 0),
    gun = E.newUnit(h, 'beam', 'alliance', 2, 2);
  assert(!E.move(h, gun.id, 3, 2).ok);
});

test('Production honors tier, costs, stacks, deployment, and one build per station turn', () => {
  const g = blank(),
    s = station(g, 2, 2, 'alliance', 150, 1);
  assert(!E.recruit(g, s.id, 'flagship').ok);
  const before = g.economy.alliance.credits,
    r = E.recruit(g, s.id, 'light', 3);
  assert(r.ok);
  assert.equal(r.unit.stack, 3);
  assert(r.unit.attacked && r.unit.moved);
  assert.equal(before - g.economy.alliance.credits, E.price('light', 3).credits);
  assert(!E.recruit(g, s.id, 'corvette').ok);
  s.producedTurn = 0;
  s.tier = 2;
  assert(!E.recruit(g, s.id, 'siege').ok);
  assert(E.recruit(g, s.id, 'missile').ok);
  s.producedTurn = 0;
  s.tier = 3;
  assert(E.recruit(g, s.id, 'siege', 2).ok);
});

test('Standing courses move at turn start, keep the attack action, and clear on arrival', () => {
  const g = blank(),
    u = E.newUnit(g, 'heavy', 'alliance', 2, 2, 1);
  assert(E.setDestination(g, u.id, 5, 2).ok);
  assert.deepEqual(u.destination, { c: 5, r: 2 });
  const events = E.runStandingOrders(g, 'alliance');
  assert.equal(events.length, 1);
  assert.equal(u.c, 5);
  assert.equal(u.r, 2);
  assert(u.moved);
  assert(!u.attacked, 'automatic movement must leave the fleet able to fire');
  assert.equal(u.destination, undefined, 'arrival clears the standing course');

  E.beginTurn(g, 'alliance', false);
  assert(E.setDestination(g, u.id, 8, 2).ok);
  const next = E.runStandingOrders(g, 'alliance');
  assert.equal(next.length, 1);
  assert(u.c > 5 && u.c <= 8);
  assert(!u.attacked);
});

test('AI completes turns legally without resource underflow or stacked hexes', () => {
  for (const mode of ['conquest', 'iserlohn', 'conquest:lippstadt', 'vermilion']) {
    const g = E.createGame('alliance', 'normal', mode, 15);
    for (let turn = 0; turn < 8 && !g.over; turn++) {
      for (const side of ['alliance', 'empire']) {
        E.beginTurn(g, side);
        E.aiProduction(g);
        for (const u of [...g.units]) if (u.side === side && u.hp > 0) E.aiOrder(g, u.id);
        const seen = new Set();
        for (const u of g.units.filter(u => u.hp > 0)) {
          assert(!seen.has(E.key(u)));
          seen.add(E.key(u));
          assert(Number.isFinite(u.hp));
        }
        Object.values(g.economy).forEach(e => Object.values(e).forEach(x => assert(x >= 0)));
      }
      g.turn++;
    }
    console.log(mode + ': turn ' + g.turn + ', ' + g.units.filter(u => u.hp > 0).length + ' fleets, ' + g.log[0].text);
  }
});

test('Airstrikes launch from station bases, consume resources and have no sortie cap', () => {
  const g = blank(), s = station(g, 2, 2, 'alliance', 150, 3);
  s.air = 1;
  const enemy = E.newUnit(g, 'heavy', 'empire', 4, 2);
  assert(!E.canBuy(g, s, 'fighter'));
  assert(!E.airStrike(g, s.id, 'bomber', enemy.c, enemy.r).ok);
  const first = E.airStrike(g, s.id, 'fighter', enemy.c, enemy.r);
  assert(first.ok);
  assert(first.unitDamage > 0 && enemy.hp < E.maxHP(enemy));
  const second = E.airStrike(g, s.id, 'fighter', enemy.c, enemy.r);
  assert(second.ok, 'same station must be able to fire repeatedly on the same turn');
  assert.equal(g.economy.alliance.credits, 5000 - E.airStrikeCost(g, 'alliance', 'fighter').credits * 2);
  assert.equal(g.economy.alliance.industry, 5000 - E.airStrikeCost(g, 'alliance', 'fighter').industry * 2);
  assert.equal(g.units.filter(u => E.TYPES[u.type].air).length, 0);
});

test('Both corridor flank lanes require station shields down, in both directions', () => {
  for (const [name, row] of [['Iserlohn', 6], ['Fezzan', 22]])
    for (const side of ['empire', 'alliance']) {
      const g = E.createGame(side, 'normal', 'conquest:frontier', 33),
        gate = g.stations.find(st => st.name === name),
        entrance = { c: side === 'empire' ? 23 : 27, r: row - 1 },
        farBank = { c: side === 'empire' ? 27 : 23, r: row },
        flank = { c: 25, r: row - 1 };
      g.units = [];
      g.phase = side;
      const ship = E.newUnit(g, 'destroyer', side, entrance.c, entrance.r);
      assert(E.corridorLocked(g, flank, side), name + ' should defend its flanking lanes');
      assert(!E.reachable(g, ship).has(E.key(flank)), 'shield must prevent entering the side passage');
      assert.equal(E.routeField(g, farBank, ship).get(E.key(ship)), undefined,
        'route planner must also see the shielded gate as closed');
      assert.match(E.setDestination(g, ship.id, flank.c, flank.r).reason, /corridor station shields/i);

      gate.shield = 0;
      assert(!E.corridorLocked(g, flank, side));
      assert(E.reachable(g, ship).has(E.key(flank)), 'flank must open as soon as shields fall');
      assert.notEqual(E.routeField(g, farBank, ship).get(E.key(ship)), undefined,
        'route cache must update after the fortress shields fall');
      assert(E.move(g, ship.id, flank.c, flank.r).ok);
      E.beginTurn(g, side, false);
      assert(E.reachable(g, ship).has(E.key(farBank)), 'fleet must be able to reach the opposite bank');
      assert(E.move(g, ship.id, farBank.c, farBank.r).ok);
      gate.owner = side;
      gate.shield = gate.maxShield;
      assert(!E.corridorLocked(g, flank, side), 'the station owner always has passage rights');
      assert(E.corridorLocked(g, flank, E.opponent(side)), 'opponents still need to break the shields');
    }
});

test('Existing Conquest saves acquire wider corridors without losing progress', () => {
  const g = E.createGame('alliance', 'normal', 'conquest:frontier', 60);
  const originalFleet = g.units[0], originalId = originalFleet.id,
    originalLocation = { c: originalFleet.c, r: originalFleet.r },
    originalCredit = g.economy.alliance.credits;
  g.turn = 13;
  g.stations.find(st => st.name === 'Fezzan').owner = 'alliance';
  g.stations.find(st => st.name === 'Fezzan').shield = 36;
  for (const col of [24, 25, 26])
    for (const row of [5, 7, 21, 23]) E.tile(g, col, row).terrain = 'rift';
  const save = JSON.parse(JSON.stringify(g)), loaded = E.migrateSave(save);
  assert(loaded);
  for (const col of [24, 25, 26])
    for (const row of [5, 7, 21, 23])
      assert.equal(E.tile(loaded, col, row).terrain, 'space');
  assert.equal(E.tile(loaded, 25, 14).terrain, 'rift', 'other rift tiles must stay blocked');
  assert.equal(loaded.turn, 13);
  assert.deepEqual({ c: loaded.units[0].c, r: loaded.units[0].r }, originalLocation);
  assert.equal(loaded.units[0].id, originalId);
  assert.equal(loaded.economy.alliance.credits, originalCredit);
  assert.equal(loaded.stations.find(st => st.name === 'Fezzan').owner, 'alliance');
  assert.equal(loaded.stations.find(st => st.name === 'Fezzan').shield, 36);
  assert.equal(E.migrateSave(loaded), loaded, 'migration should be safe on repeated loads');
});
