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
test('All 13 classes (10 hulls, 3 air wings) exist and hex distance is symmetric', () => {
  assert.equal(Object.keys(E.TYPES).length, 13);
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
test('A cruiser kill grants one extra shot (no extra movement), up to the cap', () => {
  const g = blank(),
    a = E.newUnit(g, 'heavy', 'alliance', 2, 2, 3);
  const b = E.newUnit(g, 'corvette', 'empire', 3, 2);
  b.hp = 1;
  let r = E.attack(g, a.id, 3, 2);
  assert(r.breakthrough);
  assert(a.moved && !a.attacked);
  const c = E.newUnit(g, 'corvette', 'empire', 2, 3);
  c.hp = 1;
  r = E.attack(g, a.id, 2, 3);
  assert(!r.breakthrough);
  assert(a.attacked);
});
test('Battleships and dreadnoughts always fire again after a kill', () => {
  for (const type of ['battleship', 'flagship']) {
    const g = blank(),
      a = E.newUnit(g, type, 'alliance', 4, 4, 1);
    for (const [c, r] of [
      [5, 4],
      [3, 4],
      [4, 3],
      [4, 5],
    ]) {
      E.newUnit(g, 'corvette', 'empire', c, r).hp = 1;
      const res = E.attack(g, a.id, c, r);
      assert(res.destroyed && res.breakthrough, type + ' kill at ' + c + ',' + r);
      assert(!a.attacked, type + ' may fire again');
    }
    assert(a.moved, 'movement refreshes only within the breakthrough cap');
  }
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
test('HQ research spends command tokens, respects tiers and prerequisites, and applies to the player only', () => {
  const p = { tokens: 0, wins: 0, research: {} };
  assert.equal(E.researchReason(p, 'line.armor'), 'Need 50 more command tokens');
  p.tokens = 1000;
  assert.match(E.researchReason(p, 'line.drives'), /^Tier 2: win 2 more operations$/);
  p.wins = 2;
  assert.equal(E.researchReason(p, 'line.secondary'), 'Requires Main Batteries I');
  assert(E.research(p, 'line.guns').ok);
  assert(E.research(p, 'line.hull').ok);
  assert(E.research(p, 'line.drives').ok);
  assert(E.research(p, 'station.fort').ok);
  assert.equal(p.tokens, 1000 - 50 - 50 - 150 - 40);
  assert.deepEqual(p.research, { 'line.guns': 1, 'line.hull': 1, 'line.drives': 1, 'station.fort': 1 });
  const g = blank(),
    own = g.stations[0].maxShield,
    foe = g.stations[1].maxShield;
  E.applyTech(g, p.research);
  assert.equal(g.stations[0].maxShield, own + 20);
  assert.equal(g.stations[1].maxShield, foe);
  const u = E.newUnit(g, 'heavy', 'alliance', 2, 2),
    v = E.newUnit(g, 'heavy', 'empire', 5, 5);
  assert.equal(E.movement(g, u), E.TYPES.heavy.move + 1);
  assert.equal(E.movement(g, v), E.TYPES.heavy.move);
  assert.equal(u.hp, Math.round(E.TYPES.heavy.hp * 1.06));
  assert.equal(v.hp, E.TYPES.heavy.hp);
  const next = E.applyProfile(E.createGame('alliance', 'normal', 'conquest', 4), p);
  assert.deepEqual(next.tech.alliance, p.research);
  assert.deepEqual(next.tech.empire, {});
});
test('Only victories pay command tokens, with a first-win bonus', () => {
  const w = blank();
  w.economy.alliance.science = 50;
  w.stations[1].owner = 'alliance';
  E.checkVictory(w);
  assert.equal(E.missionReward(w, 0).total, 250 + 150 + 10 + 150);
  assert.equal(E.missionReward(w, 3).total, 250 + 150 + 10);
  const l = blank();
  l.stations[0].owner = 'empire';
  l.units = [];
  E.checkVictory(l);
  assert.equal(l.over.winner, 'empire');
  assert.equal(E.missionReward(l, 0).total, 0);
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
  for (const v of [undefined, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
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
  assert.equal(E.income(g, 'alliance').credits, 505);
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
  // On the 24-world Conquest map a dreadnought still costs about a full turn of income.
  assert(E.price('flagship').credits > E.income(g, 'alliance').credits * 0.9);
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
test("Thor's Hammer is fired by its owner, never automatically, and recharges for two turns", () => {
  const g = blank(),
    fort = station(g, 4, 4, 'empire', 150);
  fort.fort = true;
  fort.name = 'Iserlohn';
  const near = E.newUnit(g, 'flagship', 'alliance', 5, 4),
    far = E.newUnit(g, 'battleship', 'alliance', 8, 7);
  E.beginTurn(g, 'empire', false);
  assert.equal(near.hp, E.maxHP(near));
  assert.deepEqual(E.fortressTargets(g, fort).map(E.key), [E.key(near)]);
  const shot = E.fireFortress(g, fort.id, near.c, near.r);
  assert(shot.ok);
  assert.equal(shot.name, "Thor's Hammer");
  assert.equal(near.hp, E.maxHP(near) - shot.damage);
  assert.equal(near.morale, -1);
  assert(!E.fireFortress(g, fort.id, near.c, near.r).ok);
  g.turn += 2;
  assert(!E.fireFortress(g, fort.id, far.c, far.r).ok);
  fort.shield = 0;
  assert(!E.fireFortress(g, fort.id, near.c, near.r).ok);
  fort.shield = 100;
  assert(E.fireFortress(g, fort.id, near.c, near.r).ok);
});
test('Station buildings upgrade to level 3 and raise industry and research', () => {
  const g = blank(),
    s = station(g, 2, 2);
  s.tier = 1;
  s.lab = 0;
  s.air = 0;
  const industry = s.industry,
    science = s.science;
  assert(E.build(g, s.id, 'shipyard').ok);
  assert.equal(s.tier, 2);
  assert.equal(s.industry, industry + 10);
  assert(E.build(g, s.id, 'lab').ok);
  assert.equal(s.lab, 1);
  assert.equal(s.science, science + 8);
  for (let i = 0; i < 3; i++) assert(E.build(g, s.id, 'air').ok);
  assert.equal(s.air, 3);
  assert(!E.build(g, s.id, 'air').ok);
});
test('Air wings: built at air bases, ignore terrain, immune to artillery, escorts return fire, need supply', () => {
  assert.equal(Object.values(E.TYPES).filter(t => t.air).length, 3);
  const g = blank(),
    s = station(g, 2, 2);
  s.air = 0;
  assert(!E.canBuy(g, s, 'fighter'));
  s.air = 1;
  assert(E.canBuy(g, s, 'fighter'));
  assert(!E.canBuy(g, s, 'bomber'));
  const f = E.newUnit(g, 'fighter', 'alliance', 4, 4);
  E.tile(g, 5, 4).terrain = 'nebula';
  assert.equal(E.reachable(g, f).get('5,4'), 1);
  assert(!E.canCapture(f));
  const arty = E.newUnit(g, 'beam', 'empire', 4, 5);
  assert.equal(E.preview(g, arty.id, f.c, f.r), null);
  const bomber = E.newUnit(g, 'bomber', 'alliance', 6, 6),
    heavy = E.newUnit(g, 'heavy', 'empire', 7, 6),
    corvette = E.newUnit(g, 'corvette', 'empire', 6, 7);
  assert.equal(E.preview(g, bomber.id, heavy.c, heavy.r).counterAllowed, false);
  assert.equal(E.preview(g, bomber.id, corvette.c, corvette.r).counterAllowed, true);
  const stray = E.newUnit(g, 'strategic', 'alliance', 8, 1);
  E.beginTurn(g, 'alliance');
  assert.equal(stray.hp, E.maxHP(stray) - Math.round(E.maxHP(stray) * 0.1));
  assert.equal(f.hp, E.maxHP(f));
});
test('Every conquest start date and scenario starts legally and unfinished', () => {
  const modes = [...Object.keys(E.ERAS).map(k => 'conquest:' + k), ...Object.keys(E.SCENARIOS)];
  for (const mode of modes)
    for (const side of ['empire', 'alliance']) {
      const g = E.createGame(side, 'normal', mode, 12),
        keys = new Set();
      for (const u of g.units) {
        assert(!keys.has(E.key(u)), mode + ' duplicate ' + E.key(u));
        keys.add(E.key(u));
        assert(E.tile(g, u.c, u.r), mode + ' off map ' + E.key(u));
        assert.notEqual(E.tile(g, u.c, u.r).terrain, 'rift');
        const st = E.stationAt(g, u);
        assert(!st || st.owner === u.side, mode + ' unit on a foreign station ' + E.key(u));
      }
      assert.equal(E.checkVictory(g), null, mode);
      if (E.SCENARIOS[mode]?.side) assert.equal(g.player, E.SCENARIOS[mode].side);
    }
  const lip = E.createGame('empire', 'normal', 'conquest:lippstadt', 3);
  assert(lip.units.some(u => u.side === 'neutral'));
  assert(lip.stations.some(s => s.owner === 'neutral' && s.name === 'Geiersburg'));
});
test('Scenario objectives award 1–3 stars by speed, or by fleets kept when holding', () => {
  const a = E.createGame('alliance', 'normal', 'astarte', 5);
  assert.equal(a.player, 'empire');
  a.units.filter(u => u.side === 'alliance').forEach(u => (u.hp = 0));
  a.turn = 7;
  assert.equal(E.checkVictory(a).winner, 'empire');
  assert.equal(a.over.stars, 3);
  const v = E.createGame('empire', 'normal', 'vermilion', 5);
  v.units.find(u => u.admiral === 'reinhard').hp = 0;
  v.turn = 13;
  assert.equal(E.checkVictory(v).winner, 'alliance');
  assert.equal(v.over.stars, 1);
  const h = E.createGame('alliance', 'normal', 'amritsar', 5);
  h.turn = 13;
  assert.equal(E.checkVictory(h).winner, 'alliance');
  assert.equal(h.over.stars, 3);
  const lost = E.createGame('alliance', 'normal', 'amritsar', 5);
  lost.stations.find(s => s.name === 'Amritsar').owner = 'empire';
  assert.equal(E.checkVictory(lost).winner, 'empire');
});
test('Admirals outside your roster cannot be appointed', () => {
  const g = E.createGame('empire', 'normal', 'conquest:ragnarok', 5),
    u = g.units.find(u => u.side === 'empire' && !u.admiral);
  g.economy.empire.credits = 9999;
  assert(!E.assign(g, u.id, 'kircheis').ok);
});
test('Disabled orders report a specific reason', () => {
  const g = blank(),
    u = E.newUnit(g, 'light', 'alliance', 4, 4);
  u.hp -= 50;
  assert.equal(E.repairReason(g, u), 'No friendly station nearby');
  station(g, 4, 5);
  g.economy.alliance.credits = 10;
  assert.match(E.repairReason(g, u), /^Need \d+ more credits$/);
  g.economy.alliance.credits = 5000;
  assert.equal(E.repairReason(g, u), null);
  u.attacked = true;
  assert.equal(E.repairReason(g, u), 'Already fired');
  assert.equal(E.attack(g, u.id, 5, 4).reason, 'Already fired');
  u.attacked = false;
  u.stack = 3;
  assert.equal(E.reinforceReason(g, u), 'Already at 3 stacks');
  const s = g.stations.at(-1);
  s.tier = 1;
  assert.equal(E.buyReason(g, s, 'battleship'), 'Requires shipyard tier 3');
  g.economy.alliance.industry = 0;
  assert.match(E.buyReason(g, s, 'corvette'), /more industry/);
  assert.equal(
    E.shortfall({ credits: 10, industry: 0 }, { credits: 40, industry: 5 }),
    'Need 30 more credits and 5 more industry',
  );
});
test('HQ class abilities: Fire Control range and Carrier Operations hit-and-run', () => {
  const g = blank(),
    arty = E.newUnit(g, 'missile', 'alliance', 2, 2);
  assert.equal(E.rangeOf(g, arty).max, 2);
  g.tech.alliance['artillery.fire'] = 2;
  assert.equal(E.rangeOf(g, arty).max, 3);
  assert.equal(E.airSupply(g, 'alliance'), 3);
  g.tech.alliance['air.carrier'] = 2;
  assert.equal(E.airSupply(g, 'alliance'), 5);
  const wing = E.newUnit(g, 'fighter', 'alliance', 6, 6),
    foe = E.newUnit(g, 'corvette', 'empire', 7, 6);
  assert(E.attack(g, wing.id, foe.c, foe.r).ok);
  assert(!wing.moved && wing.attacked);
  assert(E.reachable(g, wing).size > 0);
});
test('Medals are awarded for defeating an enemy admiral and for winning', () => {
  const g = blank(),
    a = E.newUnit(g, 'battleship', 'alliance', 2, 2, 3, 'yang'),
    v = E.newUnit(g, 'corvette', 'empire', 3, 2, 1, 'reinhard');
  v.hp = 1;
  assert(E.attack(g, a.id, 3, 2).destroyed);
  assert(g.medalInventory.includes('valor'));
  g.stations[1].owner = 'alliance';
  E.checkVictory(g);
  assert.equal(g.over.winner, 'alliance');
  assert(g.medalInventory.includes('campaign'));
});
test('Hard and Challenge strengthen only the enemy, and tokens are paid only for the first clear', () => {
  const n = E.createGame('alliance', 'normal', 'iserlohn', 7),
    h = E.createGame('alliance', 'hard', 'iserlohn', 7),
    c = E.createGame('alliance', 'challenge', 'iserlohn', 7),
    foes = g => g.units.filter(u => u.side === 'empire'),
    own = g => g.units.filter(u => u.side === 'alliance').map(u => u.type + u.stack);
  assert(foes(h).length > foes(n).length);
  assert(foes(c).length > foes(h).length);
  assert(foes(h).some(u => u.type === 'siege') && !foes(n).some(u => u.type === 'siege'));
  assert.deepEqual(own(h), own(n));
  assert.deepEqual(h.tech.alliance, {});
  assert.equal(h.tech.empire['line.armor'], 3);
  assert.equal(h.tech.empire['line.drives'], 1);
  assert.equal(c.tech.empire['line.armor'], 5);
  assert.equal(c.tech.empire['station.overcharge'], 2);
  for (const mode of [...Object.keys(E.ERAS).map(k => 'conquest:' + k), ...Object.keys(E.SCENARIOS)])
    for (const level of ['hard', 'challenge']) {
      const g = E.createGame('empire', level, mode, 11),
        keys = new Set();
      for (const u of g.units) {
        assert(!keys.has(E.key(u)), mode + ' ' + level + ' duplicate ' + E.key(u));
        keys.add(E.key(u));
        assert.notEqual(E.tile(g, u.c, u.r).terrain, 'rift');
        assert.equal(u.hp, E.maxHP(u));
      }
      assert.equal(E.checkVictory(g), null, mode + ' ' + level);
    }
  const w = blank();
  w.difficulty = 'hard';
  w.economy.alliance.science = 0;
  w.stations[1].owner = 'alliance';
  E.checkVictory(w);
  assert.equal(E.missionReward(w, 3).total, Math.round((250 + 150) * 1.5));
  const again = E.missionReward(w, 3, { [E.operationKey(w)]: true });
  assert.equal(again.total, 0);
  assert(again.repeat);
});
test('Air supply covers hexes within range of a friendly air base, and Carrier Operations widens it', () => {
  const g = blank(),
    s = station(g, 2, 2);
  s.air = 0;
  assert(!E.airSupplied(g, 'alliance', { c: 2, r: 3 }));
  s.air = 1;
  assert(E.airSupplied(g, 'alliance', { c: 4, r: 2 }));
  assert(!E.airSupplied(g, 'alliance', { c: 7, r: 2 }));
  assert(!E.airSupplied(g, 'empire', { c: 2, r: 3 }));
  g.tech.alliance['air.carrier'] = 1;
  assert(E.airSupplied(g, 'alliance', { c: 7, r: 2 }));
});
test('Each side has a campaign of its own scenarios, every chapter legal for that side', () => {
  assert.equal(E.CAMPAIGNS.empire.length, 9);
  assert.equal(E.CAMPAIGNS.alliance.length, 9);
  for (const [side, ids] of Object.entries(E.CAMPAIGNS))
    for (const id of ids) {
      assert.equal(E.SCENARIOS[id].side, side, id);
      for (const level of ['normal', 'challenge']) {
        const g = E.createGame(side === 'empire' ? 'alliance' : 'empire', level, id, 9);
        assert.equal(g.player, side);
        assert.equal(E.checkVictory(g), null, id);
      }
    }
  const s = E.createGame('alliance', 'normal', 'astarte_a', 4);
  s.turn = 11;
  assert.equal(E.checkVictory(s).winner, 'alliance');
  const dead = E.createGame('alliance', 'normal', 'astarte_a', 4);
  dead.units.find(u => u.admiral === 'yang').hp = 0;
  assert.equal(E.checkVictory(dead).winner, 'empire');
  assert(E.createGame('empire', 'normal', 'rantemario', 4).retired.includes('kircheis'));
});
test('Your admirals start with two per side, promote and buy stars with tokens, and keep their records', () => {
  const p = { tokens: 10 };
  assert.deepEqual(Object.keys(E.roster(p)).sort(), ['attenborough', 'mittermeyer', 'reinhard', 'yang']);
  assert.equal(E.RANKS.length, 11);
  assert.deepEqual(E.RANK_HP, [1.12, 1.16, 1.2, 1.24, 1.28, 1.33, 1.38, 1.43, 1.48, 1.54, 1.6]);
  assert.equal(E.roster(p).attenborough.rank, 0);
  assert.equal(E.promoteReason(p, 'attenborough'), 'Need 40 more command tokens');
  assert.match(E.promoteReason(p, 'fischer'), /^Recruit for 300 command tokens first$/);
  p.tokens = 1000;
  assert(E.promote(p, 'attenborough').ok);
  assert.equal(E.roster(p).attenborough.rank, 1);
  assert.equal(E.starCost(p, 'attenborough', 'line'), 220);
  assert(E.buyStar(p, 'attenborough', 'line').ok);
  assert(E.buyStar(p, 'attenborough', 'line').ok);
  assert.equal(E.roster(p).attenborough.ratings.line, 6);
  assert.equal(E.starReason(p, 'attenborough', 'line'), 'Already 6 stars');
  assert.equal(p.tokens, 1000 - 50 - 220 - 360);
  p.medals = ['valor'];
  assert(E.equipMedal(p, 'attenborough', 'valor').ok);
  assert.deepEqual(p.medals, []);
  assert.equal(E.equipReason(p, 'attenborough', 'valor'), 'Not in your medal case');
  const saved = JSON.parse(JSON.stringify(p));
  for (const mode of ['conquest:astarte', 'iserlohn', 'corridor_a']) {
    const g = E.applyProfile(E.createGame('alliance', 'hard', mode, 3), saved);
    assert.equal(g.roster.attenborough.rank, 1);
    assert.equal(g.roster.attenborough.ratings.line, 6);
  }
});
test('Every admiral has a Movement rating out of 6 stars that adds hexes', () => {
  const fresh = blank();
  for (const k of Object.keys(E.ADMIRALS)) assert(E.officer(fresh, k).ratings.move > 0, k);
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(n => E.moveBonus({ ratings: { move: n } })),
    [-1, 0, 0, 1, 1, 2],
  );
  // Older profiles without a Movement rating get the admiral's default.
  const p = {
    tokens: 1000,
    roster: { yang: { rank: 0, ratings: { escort: 4, line: 5, artillery: 4, air: 4 }, medals: [] } },
  };
  assert.equal(E.roster(p).yang.ratings.move, 3);
  assert.equal(E.starCost(p, 'yang', 'move'), 120);
  assert(E.buyStar(p, 'yang', 'move').ok);
  assert.equal(E.roster(p).yang.ratings.move, 4);
  const g = E.applyProfile(blank(), p),
    u = E.newUnit(g, 'heavy', 'alliance', 4, 4, 1, 'yang');
  u.personal = true;
  assert.equal(E.movement(g, u), E.TYPES.heavy.move + 1);
});
test('Scenario commanders are fixed; your own version can serve beside them', () => {
  const p = { tokens: 1000 };
  E.promote(p, 'yang');
  E.promote(p, 'yang');
  const g = E.applyProfile(E.createGame('alliance', 'normal', 'iserlohn', 4), p),
    scenarioYang = g.units.find(u => u.admiral === 'yang');
  assert(scenarioYang && !scenarioYang.personal);
  assert.equal(E.officerOf(g, scenarioYang).rank, E.officer(g, 'yang').rank);
  const fleet = g.units.find(u => u.side === 'alliance' && !u.admiral);
  g.economy.alliance.credits = 5000;
  assert.equal(E.assignReason(g, fleet, 'yang'), null);
  assert(E.assign(g, fleet.id, 'yang').ok);
  assert(fleet.personal);
  assert.equal(fleet.cmdRank, 3);
  assert.equal(E.maxHP(fleet), Math.round(E.TYPES[fleet.type].hp * (1 + 0.7 * (fleet.stack - 1)) * E.RANK_HP[3]));
  assert.notEqual(scenarioYang.cmdRank, fleet.cmdRank);
  assert.match(
    E.assignReason(
      g,
      g.units.find(u => u.side === 'alliance' && !u.admiral),
      'yang',
    ),
    /^Commanding /,
  );
  assert.match(E.assignReason(g, fleet, 'fischer'), /^Not one of your admirals/);
});
test('Recruiting adds an admiral to the roster once; recruitable admirals start in no operation', () => {
  assert.equal(Object.values(E.ADMIRALS).filter(a => a.recruit).length, 22);
  for (const mode of [...Object.keys(E.ERAS).map(k => 'conquest:' + k), ...Object.keys(E.SCENARIOS)])
    for (const side of ['empire', 'alliance'])
      assert(!E.createGame(side, 'normal', mode, 5).units.some(u => E.ADMIRALS[u.admiral]?.recruit), mode);
  const p = { tokens: 250 };
  assert.equal(E.recruitReason(p, 'bucock'), 'Need 50 more command tokens');
  assert.equal(E.recruitPrice('kircheis'), 300);
  assert.equal(E.recruitPrice('reuenthal'), 400);
  p.tokens = 500;
  assert(E.recruitAdmiral(p, 'bucock').ok);
  assert.equal(p.tokens, 200);
  assert.equal(E.recruitReason(p, 'bucock'), 'Already one of your admirals');
  const g = E.applyProfile(blank(), p),
    u = E.newUnit(g, 'heavy', 'alliance', 2, 2);
  g.economy.alliance.credits = 5000;
  assert(E.assign(g, u.id, 'bucock').ok);
  assert.equal(E.moraleFloor(g, u), 0);
  // Cazerne halves repair costs while he commands a fleet.
  const c = E.newUnit(g, 'light', 'alliance', 5, 5),
    full = E.repairCost(c, g);
  E.recruitAdmiral(Object.assign(p, { tokens: 500 }), 'cazerne');
  E.applyRoster(g, p);
  assert(E.assign(g, c.id, 'cazerne').ok);
  assert.equal(E.repairCost(c, g), Math.max(10, Math.round(full / 2)));
});
test('A fleet whose only order is holding position has no orders left', () => {
  const g = blank(),
    u = E.newUnit(g, 'heavy', 'alliance', 4, 4);
  assert(E.hasOrders(g, u));
  u.moved = true;
  assert(!E.hasOrders(g, u));
  E.newUnit(g, 'corvette', 'empire', 5, 4);
  assert(E.hasOrders(g, u));
  u.attacked = true;
  assert(!E.hasOrders(g, u));
  // Yang's free Confusion does not keep a fleet that has moved and fired (or held position) active.
  u.admiral = 'yang';
  assert(!E.hasOrders(g, u));
  u.attacked = false;
  assert(E.hasOrders(g, u));
});
test('Conquest is a WC4-scale mirrored galaxy; Lippstadt and Ragnarok are campaign chapters', () => {
  const g = E.createGame('empire', 'normal', 'conquest', 3);
  assert.equal(g.cols, 31);
  assert.equal(g.rows, 19);
  assert.equal(g.stations.length, 24);
  assert.deepEqual(E.income(g, 'empire'), E.income(g, 'alliance'));
  assert.equal(E.tile(g, 15, 9).terrain, 'rift');
  const lip = E.createGame('empire', 'normal', 'lippstadt_e', 3);
  assert.equal(lip.mode, 'lippstadt_e');
  assert(lip.units.some(u => u.side === 'neutral'));
  assert.equal(lip.rules.rebelBounty, 150);
  const rag = E.createGame('empire', 'normal', 'ragnarok_a', 3);
  assert.equal(rag.player, 'alliance');
  assert(!rag.stations.some(s => s.name === 'Vermilion'));
});
