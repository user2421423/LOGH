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
});

test('shipyards use route distance to split production between Iserlohn and Fezzan', () => {
  const g = frontier();
  E.aiProduction(g);
  const yards = E.productionSummary(g, 'alliance').yards;
  const shampool = yards.find(y => y.name === 'Shampool');
  const nephthys = yards.find(y => y.name === 'Nephthys');
  const heinessen = yards.find(y => y.name === 'Heinessen');
  assert.equal(shampool.front, 'Iserlohn');
  assert.equal(shampool.route, 0);
  assert.equal(nephthys.front, 'Fezzan');
  assert.equal(nephthys.route, 0);
  assert(heinessen.route > shampool.route);
});

test('support spending preserves the construction industry reserve', () => {
  const g = frontier();
  const industry = g.economy.alliance.industry;
  E.aiProduction(g);
  const p = E.productionSummary(g, 'alliance');
  assert.equal(p.constructionReserve.industry, Math.floor(industry * E.PROD.constructionIndustry));
  assert(p.built.length > 0);
});

test('difficulty changes production planning, not only enemy starting statistics', () => {
  const decisions = {};
  for (const difficulty of ['normal', 'hard', 'challenge']) {
    const g = frontier(difficulty);
    E.aiProduction(g);
    const p = E.productionSummary(g, 'alliance');
    decisions[difficulty] = p.built.map(x => x.type + ':' + x.front).join('|');
  }
  assert.notEqual(decisions.normal, decisions.hard);
  assert.notEqual(decisions.hard, decisions.challenge);
});

test('hard AI counters artillery-heavy and air-heavy fleets with screens', () => {
  for (const enemyType of ['missile', 'fighter']) {
    const g = frontier('hard', 2222);
    for (const u of g.units.filter(u => u.side === 'empire' && u.hp > 0)) {
      u.type = enemyType;
      u.stack = 1;
      u.hp = E.maxHP(u);
    }
    E.aiProduction(g);
    const built = E.productionSummary(g, 'alliance').built;
    assert(built.length > 0);
    assert(built.some(x => E.TYPES[x.type].branch === 'Escort'));
    assert(!built.every(x => E.TYPES[x.type].branch === 'Artillery'));
  }
});

test('challenge AI replenishes an understrength strategic reserve', () => {
  const g = frontier('challenge');
  E.aiProduction(g);
  const p = E.productionSummary(g, 'alliance');
  if (p.reserve.deficit > 0) {
    assert(p.yards.some(y => y.role === 'reserve'));
    assert(p.built.some(x => x.front === 'reserve'));
  } else assert(p.reserve.strength >= p.reserve.target);
});

test('capital emergency cancels dreadnought saving and prioritizes immediate ships', () => {
  const g = frontier('challenge', 4567);
  g.turn = 5;
  g.economy.alliance.credits = 1200;
  g.economy.alliance.industry = 500;
  const invader = g.units.find(u => u.side === 'empire' && u.hp > 0);
  invader.c = 45;
  invader.r = 14;
  E.aiProduction(g);
  const p = E.productionSummary(g, 'alliance');
  assert.equal(p.emergency, 2);
  assert.equal(p.savingForDreadnought, false);
  assert(p.built.length > 0);
});

test('stable rich theater deliberately commissions a second dreadnought', () => {
  const g = frontier('normal', 9876);
  g.turn = 5;
  g.economy.alliance.credits = 1500;
  g.economy.alliance.industry = 600;
  E.aiProduction(g);
  assert(E.productionSummary(g, 'alliance').built.some(x => x.type === 'flagship'));
});

test('combat fleets use front-facing deployment hexes when available', () => {
  const g = frontier('hard');
  E.aiProduction(g);
  const p = E.productionSummary(g, 'alliance');
  let checked = false;
  for (const rec of p.built) {
    const unit = g.units.find(u => u.id === rec.id);
    const station = g.stations.find(s => s.id === rec.station);
    const yard = p.yards.find(y => y.id === rec.station);
    if (!unit || !station || !yard?.front || !['Escort', 'Battle Line'].includes(E.TYPES[unit.type].branch)) continue;
    const target = g.stations.find(s => s.name === yard.front);
    const field = E.routeField(g, target, unit);
    const stationRoute = field.get(E.key(station));
    const unitRoute = field.get(E.key(unit));
    if (stationRoute != null && unitRoute != null && E.distance(unit, station) === 1) {
      assert(unitRoute <= stationRoute);
      checked = true;
      break;
    }
  }
  assert(checked);
});
