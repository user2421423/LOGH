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
test('All 10 requested classes exist and hex distance is symmetric', () => {
  assert.equal(Object.keys(E.TYPES).length, 10);
  assert.equal(E.distance({ c: 2, r: 2 }, { c: 2, r: 3 }), 1);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      assert.equal(E.distance({ c, r }, { c: 5, r: 5 }), E.distance({ c: 5, r: 5 }, { c, r }));
});
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
test('Escort and Battle Line ranges allow normal counter-fire in both directions', () => {
  for (const type of ['corvette', 'frigate', 'destroyer', 'light', 'heavy', 'battleship', 'flagship']) {
    const g = blank(),
      a = E.newUnit(g, type, 'alliance', 2, 2),
      d = E.newUnit(g, 'flagship', 'empire', 3, 2, 3);
    assert(E.attack(g, a.id, 3, 2).counter > 0, type + ' should receive counter-fire');
    const h = blank(),
      attacker = E.newUnit(h, 'corvette', 'alliance', 2, 2);
    E.newUnit(h, type, 'empire', 3, 2, 3);
    assert(E.attack(h, attacker.id, 3, 2).counter > 0, type + ' should return fire');
    const long = blank(),
      u = E.newUnit(long, type, 'alliance', 2, 2);
    E.newUnit(long, 'flagship', 'empire', 4, 2, 3);
    E.newUnit(long, 'heavy', 'empire', 5, 2);
    assert.equal(!!E.preview(long, u.id, 4, 2), ['battleship', 'flagship'].includes(type));
    assert.equal(E.preview(long, u.id, 5, 2), null);
    if (['battleship', 'flagship'].includes(type))
      assert(E.attack(long, u.id, 4, 2).counter > 0, 'range-2 heavy hulls exchange fire');
  }
});
test('Artillery tiers, fixed range-2 guns, suppression, and siege station bonus match the roster', () => {
  for (const [type, tier, min, max] of [
    ['beam', 1, 1, 1],
    ['missile', 2, 2, 2],
    ['siege', 3, 2, 2],
  ]) {
    const g = blank(),
      u = E.newUnit(g, type, 'alliance', 2, 2);
    E.newUnit(g, 'flagship', 'empire', 3, 2, 3);
    E.newUnit(g, 'flagship', 'empire', 4, 2, 3);
    E.newUnit(g, 'flagship', 'empire', 5, 2, 3);
    assert.equal(E.TYPES[type].tier, tier);
    assert.equal(E.TYPES[type].min, min);
    assert.equal(E.TYPES[type].max, max);
    // Range-2 artillery cannot fire at an adjacent target.
    assert.equal(!!E.preview(g, u.id, 3, 2), min === 1);
    const shot = min === 1 ? [3, 2] : [4, 2];
    assert.equal(E.preview(g, u.id, ...shot).counterAllowed, false);
    assert.equal(E.attack(g, u.id, ...shot).counter, 0);
    assert.equal(!!E.preview(g, u.id, 4, 2), max === 2);
    assert.equal(E.preview(g, u.id, 5, 2), null);
  }
  const g = blank(),
    monitor = E.newUnit(g, 'siege', 'alliance', 2, 2),
    base = station(g, 4, 2, 'empire', 1000);
  const boosted = E.preview(g, monitor.id, 4, 2).shield;
  const multiplier = E.TYPES.siege.siege;
  try {
    E.TYPES.siege.siege = 1;
    assert.equal(boosted, 2 * E.preview(g, monitor.id, 4, 2).shield);
  } finally {
    E.TYPES.siege.siege = multiplier;
  }
  assert.equal(E.movement(g, monitor), 1);
});
test('Missile splash damages adjacent enemies and lowers morale, never friendlies', () => {
  const g = blank(),
    a = E.newUnit(g, 'missile', 'alliance', 2, 2),
    target = E.newUnit(g, 'heavy', 'empire', 4, 2, 3),
    adj = E.newUnit(g, 'corvette', 'empire', 5, 2),
    friend = E.newUnit(g, 'corvette', 'alliance', 4, 3),
    far = E.newUnit(g, 'corvette', 'empire', 7, 2);
  const result = E.attack(g, a.id, 4, 2);
  assert(result.ok);
  assert(adj.hp < E.maxHP(adj));
  assert.equal(adj.morale, -1);
  assert.equal(friend.hp, E.maxHP(friend));
  assert.equal(far.hp, E.maxHP(far));
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
test('Unit reinforcement and repair spend actions and require station access', () => {
  const g = blank(),
    u = E.newUnit(g, 'light', 'alliance', 2, 2);
  assert(!E.reinforce(g, u.id).ok);
  station(g, 2, 3);
  assert(E.reinforce(g, u.id).ok);
  assert.equal(u.stack, 2);
  assert.equal(u.hp, E.maxHP(u));
  assert(!E.reinforce(g, u.id).ok);
  u.moved = u.attacked = false;
  u.hp -= 100;
  assert(E.repair(g, u.id).ok);
  assert(u.moved && u.attacked);
});
test('Breakthrough grants an extra move and attack after a kill but has a cap', () => {
  const g = blank(),
    a = E.newUnit(g, 'battleship', 'alliance', 2, 2, 3);
  const b = E.newUnit(g, 'corvette', 'empire', 3, 2);
  b.hp = 1;
  let r = E.attack(g, a.id, 3, 2);
  assert(r.breakthrough);
  assert(!a.moved && !a.attacked);
  const c = E.newUnit(g, 'corvette', 'empire', 2, 3);
  c.hp = 1;
  r = E.attack(g, a.id, 2, 3);
  assert(!r.breakthrough);
  assert(a.attacked);
});
test('Admirals have distinct movement, terrain, penetration and morale abilities', () => {
  const g = blank(),
    a = E.newUnit(g, 'heavy', 'alliance', 2, 2, 1, 'yang');
  E.tile(g, 3, 2).terrain = 'nebula';
  assert.equal(E.reachable(g, a).get('3,2'), 1);
  const b = E.newUnit(g, 'heavy', 'empire', 3, 2, 1);
  assert(E.confuse(g, a.id).ok);
  assert.equal(b.morale, -2);
  assert(!E.confuse(g, a.id).ok);
  g.phase = 'empire';
  const r = E.newUnit(g, 'heavy', 'empire', 6, 6, 1, 'reinhard');
  E.newUnit(g, 'corvette', 'alliance', 5, 6);
  E.newUnit(g, 'corvette', 'alliance', 7, 6);
  E.beginTurn(g, 'empire', false);
  assert.equal(r.morale, 0);
});
test('Research charges resources and affects current units immediately', () => {
  const g = blank(),
    u = E.newUnit(g, 'heavy', 'alliance', 2, 2),
    old = E.movement(g, u);
  assert(E.research(g, 'warp').ok);
  assert.equal(E.movement(g, u), old + 1);
  assert.equal(g.tech.alliance.warp, 1);
  E.research(g, 'warp');
  E.research(g, 'warp');
  assert(!E.research(g, 'warp').ok);
});
test('Start of turn applies income, station regeneration, attrition, and resets actions', () => {
  const g = blank(),
    s = station(g, 2, 2),
    u = E.newUnit(g, 'heavy', 'alliance', 2, 2);
  s.shield = 0;
  u.hp -= 100;
  u.attacked = u.moved = true;
  const old = g.economy.alliance.credits;
  E.beginTurn(g, 'alliance');
  assert.equal(g.economy.alliance.credits, old + 50);
  assert(s.shield > 0);
  assert(u.hp > E.maxHP(u) - 100);
  assert(!u.moved && !u.attacked);
});
test('Initial maps have legal placements and no duplicate occupied hexes', () => {
  for (const mode of ['conquest', 'iserlohn'])
    for (const side of ['empire', 'alliance']) {
      const g = E.createGame(side, 'normal', mode, 12);
      const keys = new Set();
      g.units.forEach(u => {
        assert(!keys.has(E.key(u)));
        keys.add(E.key(u));
        assert.notEqual(E.tile(g, u.c, u.r).terrain, 'rift');
      });
      assert.equal(E.checkVictory(g), null);
    }
});
test('AI completes turns legally without resource underflow or stacked hexes', () => {
  for (const mode of ['conquest', 'iserlohn']) {
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
test('Scenario wins on fortress occupation and loses after the deadline', () => {
  const g = E.createGame('alliance', 'normal', 'iserlohn', 3);
  g.stations.find(s => s.name === 'Iserlohn').owner = 'alliance';
  assert.equal(E.checkVictory(g).winner, 'alliance');
  const h = E.createGame('alliance', 'normal', 'iserlohn', 3);
  h.turn = 19;
  assert.equal(E.checkVictory(h).winner, 'empire');
});

test('Saves from earlier rules versions are rejected; current saves load unchanged', () => {
  const g = E.createGame('alliance', 'normal', 'conquest', 9);
  const once = JSON.stringify(g);
  assert.equal(JSON.stringify(E.migrateSave(JSON.parse(once))), once);
  for (const v of [undefined, 2, 3, 4]) {
    const old = JSON.parse(once);
    if (v === undefined) delete old.rulesVersion;
    else old.rulesVersion = v;
    assert.equal(E.migrateSave(old), null);
  }
});
test('Frigate marine-pod bonus applies to Battle Line and undefended stations, not to escorts on a station', () => {
  const g = blank(),
    s = station(g, 4, 4, 'empire', 0),
    f = E.newUnit(g, 'frigate', 'alliance', 5, 4),
    v = E.newUnit(g, 'corvette', 'empire', 4, 4);
  const onStation = E.preview(g, f.id, 4, 4).unit;
  s.c = 0;
  s.r = 8;
  assert.equal(E.preview(g, f.id, 4, 4).unit, onStation);
  v.type = 'heavy';
  const vsLine = E.preview(g, f.id, 4, 4).unit;
  s.c = 4;
  s.r = 4;
  assert.equal(E.preview(g, f.id, 4, 4).unit, vsLine);
});
test('Frigate counter-fire gets no marine-pod bonus because the attacker stands on a station', () => {
  const g = blank();
  g.phase = 'empire';
  const a = E.newUnit(g, 'corvette', 'empire', 4, 4),
    f = E.newUnit(g, 'frigate', 'alliance', 5, 4);
  const open = E.preview(g, a.id, 5, 4).counter;
  station(g, 4, 4, 'empire', 150);
  assert.equal(E.preview(g, a.id, 5, 4).counter, open);
});
test('Frigate keeps its station bonus on the shield share when attacking a garrisoned station', () => {
  const g = blank(),
    f = E.newUnit(g, 'frigate', 'alliance', 5, 4);
  E.newUnit(g, 'corvette', 'empire', 4, 4);
  const s = station(g, 4, 4, 'empire', 150);
  const withBonus = E.preview(g, f.id, 4, 4).shield;
  E.TYPES.frigate.boarding = false;
  try {
    assert(withBonus > E.preview(g, f.id, 4, 4).shield);
  } finally {
    E.TYPES.frigate.boarding = true;
  }
});
test('Kircheis morale aura wins when several admirals are in range', () => {
  const g = blank();
  g.phase = 'empire';
  E.newUnit(g, 'flagship', 'empire', 3, 4, 1, 'reinhard');
  E.newUnit(g, 'light', 'empire', 5, 4, 1, 'kircheis');
  const u = E.newUnit(g, 'corvette', 'empire', 4, 4);
  u.morale = -2;
  E.beginTurn(g, 'empire', false);
  assert.equal(u.morale, 1);
});
test('Confused fleets cannot repair or reinforce', () => {
  const g = blank(),
    u = E.newUnit(g, 'heavy', 'alliance', 0, 0);
  u.hp = 50;
  u.morale = -3;
  assert(!E.repair(g, u.id).ok);
  assert(!E.reinforce(g, u.id).ok);
  u.morale = 0;
  assert(E.repair(g, u.id).ok);
});
test('Both sides start conquest with equal income', () => {
  const g = E.createGame('alliance', 'normal', 'conquest', 4);
  assert.deepEqual(E.income(g, 'empire'), E.income(g, 'alliance'));
  assert.equal(E.income(g, 'alliance').credits, 250);
});
test('Pricing makes escorts the most cost-efficient and flagships the strongest per hex', () => {
  const linear = (k, n = 1) => {
    const t = E.TYPES[k];
    return Math.sqrt(t.hp * (1 + 0.7 * (n - 1)) * (1 + t.armor / 80) * t.attack * (1 + 0.45 * (n - 1)));
  };
  const eff = (k, n = 1) => linear(k, n) / E.price(k, n).credits;
  assert(eff('corvette') > eff('light') && eff('light') > eff('heavy') && eff('heavy') > eff('battleship'));
  assert(eff('battleship') > eff('flagship'));
  assert(linear('flagship') > linear('battleship') && linear('battleship') > linear('heavy'));
  assert(eff('heavy', 2) < eff('heavy') && eff('heavy', 3) < eff('heavy', 2));
  const g = E.createGame('alliance', 'normal', 'conquest', 4);
  assert(E.price('flagship').credits > E.income(g, 'alliance').credits * 1.8);
});
test('Repairs cost a fifth of the fleet build price; reinforcing costs a full hull', () => {
  const g = blank(),
    u = E.newUnit(g, 'flagship', 'alliance', 0, 1, 2);
  u.hp -= 200;
  const before = g.economy.alliance.credits;
  assert(E.repair(g, u.id).ok);
  assert.equal(before - g.economy.alliance.credits, Math.round(E.price('flagship', 2).credits * 0.2));
  assert.deepEqual(E.reinforceCost('heavy'), { credits: E.TYPES.heavy.cost, industry: E.TYPES.heavy.industry });
});
test("Thor's Hammer fires from a shielded fortress at the strongest fleet in range", () => {
  const g = blank(),
    fort = station(g, 4, 4, 'empire', 150);
  fort.fort = true;
  fort.name = 'Iserlohn';
  const weak = E.newUnit(g, 'corvette', 'alliance', 4, 3),
    strong = E.newUnit(g, 'flagship', 'alliance', 5, 4),
    far = E.newUnit(g, 'battleship', 'alliance', 8, 8);
  E.beginTurn(g, 'empire', false);
  assert.equal(g.strikes.length, 1);
  assert.equal(g.strikes[0].name, "Thor's Hammer");
  assert.equal(g.strikes[0].id, strong.id);
  assert.equal(strong.hp, E.maxHP(strong) - g.strikes[0].damage);
  assert.equal(weak.hp, E.maxHP(weak));
  assert.equal(far.hp, E.maxHP(far));
  assert.equal(strong.morale, -1);
  fort.shield = 0;
  E.beginTurn(g, 'empire', false);
  assert.equal(g.strikes.length, 0);
});
