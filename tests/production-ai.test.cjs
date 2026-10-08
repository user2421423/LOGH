const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');

function frontier(difficulty = 'normal', seed = 12345) {
  const g = E.createGame('empire', difficulty, 'conquest:frontier', seed);
  E.beginTurn(g, 'alliance', false);
  return g;
}

test('production AI builds fleets and immediately assigns them to theaters', () => {
  const g = frontier();
  const before = new Set(g.units.map(u => u.id));
  E.aiProduction(g);
  const p = E.productionSummary(g, 'alliance');
  assert(p?.built.length > 0);
  for (const rec of p.built) {
    assert(!before.has(rec.id));
    const u = g.units.find(v => v.id === rec.id);
    assert(u && u.moved && u.attacked, 'commissioned fleet should wait until next turn');
    assert.equal(g.ai.alliance.assignments[rec.id].front, rec.front);
    assert.equal(g.stations.find(s => s.id === rec.station).producedTurn, g.turn);
  }
  // A commander flagship must lead a live front, not idle as a capital reserve.
  const yang = g.units.find(u => u.admiral === 'yang');
  const approach = { c: 25, r: 6 };
  const beforeDistance = E.distance(yang, approach);
  assert.notEqual(g.ai.alliance.assignments[yang.id]?.front, 'reserve');
  const orders = E.aiOrder(g, yang.id);
  assert(orders.some(o => o.kind === 'move'), 'Yang should deploy toward Iserlohn immediately');
  assert(E.distance(yang, approach) < beforeDistance);
});

test('airstrike spending never reduces same-turn ship purchases', () => {
  const initial = frontier('normal', 9911);
  const base = initial.stations.find(s => s.name === 'Heinessen');
  E.newUnit(initial, 'heavy', 'empire', base.c - 5, base.r);
  initial.economy.alliance.credits = 9000;
  initial.economy.alliance.industry = 2500;
  const withoutAir = JSON.parse(JSON.stringify(initial)),
    withAir = JSON.parse(JSON.stringify(initial)),
    preview = E.airStrikePreview;
  try {
    E.airStrikePreview = () => null;
    E.aiProduction(withoutAir);
  } finally { E.airStrikePreview = preview; }
  E.aiProduction(withAir);
  const onlyShips = E.productionSummary(withoutAir, 'alliance'),
    combined = E.productionSummary(withAir, 'alliance');
  assert.deepEqual(combined.built, onlyShips.built,
    'airstrikes must not reduce the number or type of purchased fleets');
  assert.deepEqual(combined.reinforced, onlyShips.reinforced,
    'airstrikes must not displace reinforcements');
  assert(combined.airstrikes.length > 0, 'the surplus must still fund air support');
  const nextFleet = E.price('frigate');
  assert(withAir.economy.alliance.credits >= nextFleet.credits);
  assert(withAir.economy.alliance.industry >= nextFleet.industry);
});

test('AI avoids futile shield strikes and launches coordinated shield-breaking salvos', () => {
  const make = nearby => {
    const g = E.createGame('alliance', 'normal', 'conquest:frontier', 44);
    g.phase = 'alliance';
    g.units = [];
    const base = g.stations.find(s => s.owner === 'alliance' && s.capital);
    base.air = 3;
    for (const s of g.stations) if (s !== base && s.owner === 'alliance') s.air = 0;
    const enemy = g.stations.find(s => s.owner === 'empire' && !s.fort && !s.capital);
    enemy.c = base.c - 5; enemy.r = base.r; enemy.shield = 650; enemy.maxShield = 650;
    if (nearby) E.newUnit(g, 'corvette', 'alliance', enemy.c - 1, enemy.r);
    g.economy.alliance = { credits: 5000, industry: 5000, science: 0 };
    return { g, enemy };
  };
  const alone = make(false);
  assert.equal(globalThis.GalacticAI.aiAirStrikes(alone.g).length, 0,
    'do not waste credits on defended stations without friendly fleets approaching');
  const frontline = make(true), before = frontline.g.economy.alliance.credits;
  const shots = globalThis.GalacticAI.aiAirStrikes(frontline.g);
  assert(shots.length > 0);
  assert(shots.some(s => s.type === 'strategic'), 'use available strategic bombers for defenses');
  assert.equal(frontline.enemy.shield, 0, 'finish a shield-breaking volley when affordable');
  assert(frontline.g.economy.alliance.credits >= E.price('frigate').credits);
  assert(before - frontline.g.economy.alliance.credits > 0);
});
