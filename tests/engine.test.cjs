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
test('All 10 permanent hulls and 3 airstrike descriptors exist and hex distance is symmetric', () => {
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
test('A cruiser kill preserves unused movement while granting its extra shot, up to the cap', () => {
  const g = blank(),
    a = E.newUnit(g, 'heavy', 'alliance', 2, 2, 3);
  const b = E.newUnit(g, 'corvette', 'empire', 3, 2);
  b.hp = 1;
  let r = E.attack(g, a.id, 3, 2);
  assert(r.breakthrough);
  assert(!a.moved && !a.attacked);
  assert(E.reachable(g, a).size > 0);
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
    assert(!a.moved, 'unused movement survives every kill that permits another attack');

    // A kill must not restore movement that was already spent earlier in the turn.
    a.moved = true;
    const extra = E.newUnit(g, 'corvette', 'empire', 5, 5);
    extra.hp = 1;
    const spent = E.attack(g, a.id, 5, 5);
    assert(spent.destroyed && spent.breakthrough);
    assert(a.moved, 'spent movement is not restored by a kill');
  }
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
test('Standing courses reject gravity rifts and keep blocked routes queued', () => {
  const g = blank(),
    u = E.newUnit(g, 'corvette', 'alliance', 2, 2);
  E.tile(g, 4, 2).terrain = 'rift';
  assert.match(E.setDestination(g, u.id, 4, 2).reason, /gravity rift/i);
  assert(E.setDestination(g, u.id, 5, 2).ok);
  E.newUnit(g, 'corvette', 'alliance', 3, 2);
  E.newUnit(g, 'corvette', 'alliance', 2, 3);
  E.newUnit(g, 'corvette', 'alliance', 1, 2);
  const result = E.advanceDestination(g, u.id);
  assert(!result.ok || result.standing);
  if (!result.ok) assert.deepEqual(u.destination, { c: 5, r: 2 });
});
test('Conquest AI forms theater fronts around corridors and keeps persistent assignments', () => {
  const g = E.createGame('empire', 'normal', 'conquest:frontier', 12345);
  E.beginTurn(g, 'alliance', false);
  E.aiProduction(g);
  const fronts = E.frontSummary(g, 'alliance');
  assert(fronts.length >= 2);
  assert(fronts.some(f => f.name === 'Iserlohn'));
  assert(fronts.some(f => f.name === 'Fezzan'));
  const assignments = g.ai.alliance.assignments;
  assert(Object.keys(assignments).length > 0);
  const assigned = Object.entries(assignments).find(([, a]) => a.front !== 'reserve');
  assert(assigned);
  const [id, before] = assigned;
  E.planFronts(g, 'alliance');
  assert.equal(g.ai.alliance.assignments[id].front, before.front, 'front assignments should remain sticky');
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
test('Reworked admirals use maneuver, pursuit, formation and target-designation mechanics', () => {
  // Mittermeyer: attack after moving, then reposition up to 2 hexes without regaining the attack.
  let g = blank();
  g.phase = 'empire';
  const mit = E.newUnit(g, 'heavy', 'empire', 2, 2, 1, 'mittermeyer'),
    durable = E.newUnit(g, 'flagship', 'alliance', 4, 2, 3);
  assert(E.move(g, mit.id, 3, 2).ok);
  durable.hp = E.maxHP(durable);
  const mitShot = E.attack(g, mit.id, durable.c, durable.r);
  assert(mitShot.ok && durable.hp > 0);
  assert(mit.attacked);
  const reposition = E.reachable(g, mit);
  assert(reposition.size > 0);
  assert(Math.max(...reposition.values()) <= 2);
  const [mitHex] = reposition.keys();
  const [mc, mr] = mitHex.split(',').map(Number);
  assert(E.move(g, mit.id, mc, mr).ok);
  assert.equal(E.reachable(g, mit).size, 0);

  // Fischer: nearby fleets get +1 movement; Fischer himself is not a generic damage aura.
  g = blank();
  const fleet = E.newUnit(g, 'heavy', 'alliance', 4, 4),
    baseMove = E.movement(g, fleet);
  E.newUnit(g, 'light', 'alliance', 5, 4, 1, 'fischer');
  assert.equal(E.movement(g, fleet), baseMove + 1);

  // Reinhard: first kill inspires adjacent allies for the rest of the turn.
  g = blank();
  g.phase = 'empire';
  const rein = E.newUnit(g, 'heavy', 'empire', 4, 4, 1, 'reinhard'),
    ally = E.newUnit(g, 'heavy', 'empire', 3, 4),
    victim = E.newUnit(g, 'corvette', 'alliance', 5, 4);
  victim.hp = 1;
  ally.morale = -1;
  assert(E.attack(g, rein.id, victim.c, victim.r).destroyed);
  assert.equal(ally.inspiredTurn, g.turn);
  assert.equal(ally.morale, 0);

  // Bittenfeld: wounded targets take more damage; first kill opens a pursuit move even on non-line hulls.
  g = blank();
  g.phase = 'empire';
  const bit = E.newUnit(g, 'beam', 'empire', 3, 3, 1, 'bittenfeld'),
    prey = E.newUnit(g, 'heavy', 'alliance', 4, 3, 3);
  const full = E.preview(g, bit.id, prey.c, prey.r).unit;
  prey.hp = Math.floor(E.maxHP(prey) * 0.4);
  const wounded = E.preview(g, bit.id, prey.c, prey.r).unit;
  assert(wounded > full);
  prey.hp = 1;
  assert(E.attack(g, bit.id, prey.c, prey.r).destroyed);
  assert(bit.attacked);
  assert(E.reachable(g, bit).size > 0);

  // Müller: adjacent admiral-led fleets are protected.
  g = blank();
  g.phase = 'alliance';
  const guarded = E.newUnit(g, 'heavy', 'empire', 4, 4, 2, 'reuenthal'),
    muller = E.newUnit(g, 'heavy', 'empire', 3, 4, 1, 'muller'),
    attacker = E.newUnit(g, 'heavy', 'alliance', 5, 4, 2);
  const protectedDamage = E.preview(g, attacker.id, guarded.c, guarded.r).unit;
  muller.hp = 0;
  const exposedDamage = E.preview(g, attacker.id, guarded.c, guarded.r).unit;
  assert(protectedDamage < exposedDamage);

  // Lutz: his hit marks a surviving target for subsequent friendly fire.
  g = blank();
  g.phase = 'empire';
  const lutz = E.newUnit(g, 'heavy', 'empire', 4, 4, 1, 'lutz'),
    follow = E.newUnit(g, 'heavy', 'empire', 4, 5),
    marked = E.newUnit(g, 'flagship', 'alliance', 5, 4, 3);
  const beforeMark = E.preview(g, follow.id, marked.c, marked.r).unit;
  assert(E.attack(g, lutz.id, marked.c, marked.r).ok);
  assert(marked.hp > 0 && marked.markSide === 'empire');
  assert(E.preview(g, follow.id, marked.c, marked.r).unit > beforeMark);

  // Lennenkampf: line formation raises attack and defense only while another Battle Line fleet is adjacent.
  g = blank();
  g.phase = 'empire';
  const len = E.newUnit(g, 'heavy', 'empire', 4, 4, 1, 'lennenkampf'),
    foe = E.newUnit(g, 'heavy', 'alliance', 5, 4, 1);
  const soloAttack = E.preview(g, len.id, foe.c, foe.r).unit,
    soloIncoming = E.preview(g, foe.id, len.c, len.r).unit;
  E.newUnit(g, 'light', 'empire', 3, 4);
  assert(E.preview(g, len.id, foe.c, foe.r).unit > soloAttack);
  assert(E.preview(g, foe.id, len.c, len.r).unit < soloIncoming);

  // Borodin: below half hull he becomes harder to kill and his counter-fire strengthens.
  g = blank();
  g.phase = 'empire';
  const borodin = E.newUnit(g, 'heavy', 'alliance', 4, 4, 2, 'borodin'),
    aggressor = E.newUnit(g, 'heavy', 'empire', 5, 4, 2);
  const healthy = E.preview(g, aggressor.id, borodin.c, borodin.r);
  borodin.hp = Math.floor(E.maxHP(borodin) * 0.4);
  const lastStand = E.preview(g, aggressor.id, borodin.c, borodin.r);
  assert(lastStand.unit < healthy.unit);
  assert(lastStand.counter > healthy.counter);
});
test('Second-wave admirals use flanking, protection, withdrawal, combined strikes and defensive formations', () => {
  // Reuenthal: a second friendly axis adjacent to the target improves both damage and penetration.
  let g = blank();
  g.phase = 'empire';
  const reu = E.newUnit(g, 'heavy', 'empire', 4, 4, 1, 'reuenthal'),
    reuTarget = E.newUnit(g, 'heavy', 'alliance', 5, 4, 2);
  const reuSolo = E.preview(g, reu.id, reuTarget.c, reuTarget.r);
  const flankHex = E.adjacent(g, reuTarget).find(p => !E.unitAt(g, p) && E.key(p) !== E.key(reu));
  E.newUnit(g, 'corvette', 'empire', flankHex.c, flankHex.r);
  const reuFlank = E.preview(g, reu.id, reuTarget.c, reuTarget.r);
  assert(reuFlank.unit > reuSolo.unit);
  assert(reuFlank.armorPen > reuSolo.armorPen);

  // Kircheis: adjacent admiral fleets are protected, with stronger protection for Reinhard.
  g = blank();
  g.phase = 'alliance';
  const rein = E.newUnit(g, 'heavy', 'empire', 4, 4, 1, 'reinhard'),
    kir = E.newUnit(g, 'frigate', 'empire', 3, 4, 1, 'kircheis'),
    kirAttacker = E.newUnit(g, 'heavy', 'alliance', 5, 4, 2);
  const loyalGuard = E.preview(g, kirAttacker.id, rein.c, rein.r).unit;
  kir.hp = 0;
  const unguarded = E.preview(g, kirAttacker.id, rein.c, rein.r).unit;
  assert(loyalGuard < unguarded);

  // Attenborough: surviving counter-fire opens a 2-hex flexible reposition without another attack.
  g = blank();
  const att = E.newUnit(g, 'heavy', 'alliance', 4, 4, 1, 'attenborough'),
    attTarget = E.newUnit(g, 'flagship', 'empire', 5, 4, 3);
  const attShot = E.attack(g, att.id, attTarget.c, attTarget.r);
  assert(attShot.counter > 0 && attTarget.hp > 0);
  assert.equal(attShot.reposition, 2);
  assert.equal(attShot.maneuverSkill, E.ADMIRALS.attenborough.skill);
  assert(att.attacked);
  assert(E.reachable(g, att).size > 0);
  assert(Math.max(...E.reachable(g, att).values()) <= 2);

  // Kempff: his air hit cues artillery, and his artillery hit cues air.
  g = blank();
  g.phase = 'empire';
  const kAir = E.newUnit(g, 'fighter', 'empire', 4, 4, 1, 'kempff'),
    artillery = E.newUnit(g, 'beam', 'empire', 4, 5),
    comboTarget = E.newUnit(g, 'flagship', 'alliance', 5, 4, 3);
  const artyBefore = E.preview(g, artillery.id, comboTarget.c, comboTarget.r).unit;
  assert(E.attack(g, kAir.id, comboTarget.c, comboTarget.r).ok);
  assert(comboTarget.hp > 0);
  assert(E.preview(g, artillery.id, comboTarget.c, comboTarget.r).unit > artyBefore);

  g = blank();
  g.phase = 'empire';
  const kArt = E.newUnit(g, 'beam', 'empire', 4, 4, 1, 'kempff'),
    air = E.newUnit(g, 'fighter', 'empire', 4, 5),
    reverseTarget = E.newUnit(g, 'flagship', 'alliance', 5, 4, 3);
  const airBefore = E.preview(g, air.id, reverseTarget.c, reverseTarget.r).unit;
  assert(E.attack(g, kArt.id, reverseTarget.c, reverseTarget.r).ok);
  assert(reverseTarget.hp > 0);
  assert(E.preview(g, air.id, reverseTarget.c, reverseTarget.r).unit > airBefore);

  // Eisenach: formed fleets inside his 2-hex command net take less damage and return stronger fire.
  g = blank();
  g.phase = 'alliance';
  const formed = E.newUnit(g, 'heavy', 'empire', 4, 4, 2),
    wing = E.newUnit(g, 'light', 'empire', 3, 4),
    eisenach = E.newUnit(g, 'heavy', 'empire', 4, 5, 1, 'eisenach'),
    eAttacker = E.newUnit(g, 'heavy', 'alliance', 5, 4, 2);
  const coordinated = E.preview(g, eAttacker.id, formed.c, formed.r);
  eisenach.hp = 0;
  const loose = E.preview(g, eAttacker.id, formed.c, formed.r);
  assert(coordinated.unit < loose.unit);
  assert(coordinated.counter > loose.counter);
  assert(wing.hp > 0);

  // Wahlen: a stationary Wahlen anchors himself and adjacent friendly fleets.
  g = blank();
  g.phase = 'alliance';
  const held = E.newUnit(g, 'heavy', 'empire', 4, 4, 2),
    wahlen = E.newUnit(g, 'heavy', 'empire', 3, 4, 1, 'wahlen'),
    wAttacker = E.newUnit(g, 'heavy', 'alliance', 5, 4, 2);
  const stationary = E.preview(g, wAttacker.id, held.c, held.r).unit;
  wahlen.lastMoveTurn = g.turn;
  const afterManeuver = E.preview(g, wAttacker.id, held.c, held.r).unit;
  assert(stationary < afterManeuver);

  // Kessler: a guarded friendly station regenerates 22% rather than the normal 12%.
  g = blank();
  g.phase = 'empire';
  const post = station(g, 4, 4, 'empire', 0, 2);
  post.shield = 0;
  post.maxShield = 200;
  E.newUnit(g, 'frigate', 'empire', 5, 4, 1, 'kessler');
  E.beginTurn(g, 'empire', false);
  assert.equal(post.shield, 44);

  // Ulanhu: an adjacent fleet that spends its shot without breakthrough may withdraw one hex.
  g = blank();
  const ulanhu = E.newUnit(g, 'heavy', 'alliance', 3, 4, 1, 'ulanhu'),
    rear = E.newUnit(g, 'heavy', 'alliance', 4, 4),
    rearTarget = E.newUnit(g, 'flagship', 'empire', 5, 4, 3);
  const withdraw = E.attack(g, rear.id, rearTarget.c, rearTarget.r);
  assert(withdraw.ok && rearTarget.hp > 0);
  assert.equal(withdraw.reposition, 1);
  assert.equal(withdraw.maneuverSkill, E.ADMIRALS.ulanhu.skill);
  assert(rear.attacked);
  assert(E.reachable(g, rear).size > 0);
  assert(Math.max(...E.reachable(g, rear).values()) <= 1);
  assert(ulanhu.hp > 0);

  // Poplin: first kill by his air wing grants a 2-hex evasive maneuver.
  g = blank();
  const poplin = E.newUnit(g, 'fighter', 'alliance', 4, 4, 1, 'poplin'),
    popTarget = E.newUnit(g, 'corvette', 'empire', 5, 4);
  popTarget.hp = 1;
  const popShot = E.attack(g, poplin.id, popTarget.c, popTarget.r);
  assert(popShot.destroyed);
  assert.equal(popShot.reposition, 2);
  assert.equal(popShot.maneuverSkill, E.ADMIRALS.poplin.skill);
  assert(E.reachable(g, poplin).size > 0);

  // Nguyen: isolated targets are more vulnerable than screened targets.
  g = blank();
  const nguyen = E.newUnit(g, 'heavy', 'alliance', 4, 4, 1, 'nguyen'),
    raiderTarget = E.newUnit(g, 'heavy', 'empire', 5, 4, 2);
  const isolated = E.preview(g, nguyen.id, raiderTarget.c, raiderTarget.r).unit;
  const screenHex = E.adjacent(g, raiderTarget).find(p => !E.unitAt(g, p) && E.key(p) !== E.key(nguyen));
  E.newUnit(g, 'corvette', 'empire', screenHex.c, screenHex.r);
  const screened = E.preview(g, nguyen.id, raiderTarget.c, raiderTarget.r).unit;
  assert(isolated > screened);
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
  assert.equal(E.income(g, 'alliance').credits, 474);
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
  // On the 44-system Conquest map a dreadnought still costs about a full turn of income.
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
test('Airstrike shields, costs, range, research and gravity rift behavior', () => {
  const g = blank(), base = station(g, 2, 2, 'alliance', 150, 3);
  base.air = 3;
  const fort = station(g, 4, 2, 'empire', 500, 3);
  const preview = E.airStrikePreview(g, base.id, 'strategic', fort.c, fort.r);
  assert(preview.shield > 0);
  g.tech.alliance['air.guns'] = 5;
  g.tech.alliance['air.bombing'] = 2;
  assert(E.airStrikePreview(g, base.id, 'strategic', fort.c, fort.r).shield > preview.shield);
  const cost = E.airStrikeCost(g, 'alliance', 'bomber');
  g.tech.alliance['air.fuel'] = 3;
  assert(E.airStrikeCost(g, 'alliance', 'bomber').credits < cost.credits);
  assert.equal(E.airStrikeRange(g, 'alliance', 'fighter'), 5);
  g.tech.alliance['air.carrier'] = 2;
  assert.equal(E.airStrikeRange(g, 'alliance', 'fighter'), 8);
  assert(E.airStrike(g, base.id, 'strategic', fort.c, fort.r).ok);
  assert(fort.shield < 500);
  const hostile = E.newUnit(g, 'corvette', 'empire', 8, 8);
  assert.equal(E.airStrikePreview(g, base.id, 'fighter', hostile.c, hostile.r), null);
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
test('HQ artillery range and long-range sortie research operate correctly', () => {
  const g = blank(), artillery = E.newUnit(g, 'missile', 'alliance', 2, 2);
  assert.equal(E.rangeOf(g, artillery).max, 2);
  g.tech.alliance['artillery.fire'] = 2;
  assert.equal(E.rangeOf(g, artillery).max, 3);
  assert.equal(E.airStrikeRange(g, 'alliance', 'fighter'), 5);
  g.tech.alliance['air.carrier'] = 2;
  assert.equal(E.airStrikeRange(g, 'alliance', 'fighter'), 8);
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
test('Old campaign saves convert permanent air wings into reimbursements', () => {
  const g = blank(), air = E.newUnit(g, 'fighter', 'alliance', 2, 2);
  g.rulesVersion = 11;
  const before = g.economy.alliance.credits, price = E.price('fighter');
  const migrated = E.migrateSave(g);
  assert.equal(migrated.rulesVersion, 12);
  assert(!migrated.units.some(u => E.TYPES[u.type].air));
  assert.equal(migrated.economy.alliance.credits, before + price.credits);
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
    [-1, 0, 1, 2, 3, 4],
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
  assert.equal(E.movement(g, u), E.TYPES.heavy.move + 2);
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
test('Frontier rift provides three navigable rows at Iserlohn and Fezzan only', () => {
  const g = E.createGame('empire', 'normal', 'conquest:frontier', 3);
  for (const col of [24, 25, 26]) {
    for (const row of [5, 6, 7, 21, 22, 23])
      assert.notEqual(E.tile(g, col, row).terrain, 'rift', `hex ${col},${row} should be traversable`);
    for (const row of [0, 4, 8, 14, 20, 24, 28])
      assert.equal(E.tile(g, col, row).terrain, 'rift', `hex ${col},${row} should remain impassable`);
  }
  assert.equal(g.stations.length, 44);
  assert.deepEqual(E.income(g, 'empire'), E.income(g, 'alliance'));
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

test('Conquest is a 51 × 29, 44-system galaxy with only the Iserlohn and Fezzan corridors', () => {
  const g = E.createGame('empire', 'normal', 'conquest', 3);
  assert.equal(g.cols, 51);
  assert.equal(g.rows, 29);
  assert.equal(g.stations.length, 44);
  assert.equal(g.stations.filter(s => s.owner === 'empire').length, 21);
  assert.equal(g.stations.filter(s => s.owner === 'alliance').length, 21);
  assert.deepEqual(E.income(g, 'empire'), E.income(g, 'alliance'));
  for (const c of [24, 25, 26]) {
    assert.equal(E.tile(g, c, 14).terrain, 'rift');
    for (const row of [5, 6, 7, 21, 22, 23])
      assert.notEqual(E.tile(g, c, row).terrain, 'rift');
  }
  assert.equal(g.units.filter(u => u.side === 'empire').length, 16);
  assert.equal(g.units.filter(u => u.side === 'alliance').length, 16);
  const lip = E.createGame('empire', 'normal', 'lippstadt_e', 3);
  assert.equal(lip.mode, 'lippstadt_e');
  assert(lip.units.some(u => u.side === 'neutral'));
  assert.equal(lip.rules.rebelBounty, 150);
  const rag = E.createGame('empire', 'normal', 'ragnarok_a', 3);
  assert.equal(rag.player, 'alliance');
  assert(!rag.stations.some(s => s.name === 'Vermilion'));
});
