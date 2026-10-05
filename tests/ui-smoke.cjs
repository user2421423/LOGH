const vm = require('node:vm'),
  fs = require('node:fs'),
  assert = require('node:assert/strict');
const nodes = new Map(),
  events = {},
  storage = {},
  registered = [];
const drawContext = new Proxy(
  {},
  {
    get: (o, p) => (p === 'createRadialGradient' ? () => ({ addColorStop() {} }) : o[p] || (() => {})),
    set: (o, p, v) => ((o[p] = v), true),
  },
);
function node(id) {
  if (!nodes.has(id)) {
    const n = {
      id,
      innerHTML: '',
      textContent: '',
      value: '',
      style: { setProperty() {} },
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: {},
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      getBoundingClientRect() {
        return { width: 1000, height: 640, left: 0, top: 0 };
      },
      getContext() {
        return drawContext;
      },
      setPointerCapture() {},
      focus() {},
    };
    Object.defineProperty(n, 'children', { get: () => (n.innerHTML ? [{}] : []) });
    nodes.set(id, n);
  }
  return nodes.get(id);
}
const document = {
  getElementById: node,
  documentElement: node('root'),
  addEventListener: (k, fn) => (events[k] = fn),
  querySelectorAll() {
    return [];
  },
  modelContext: { registerTool: t => registered.push(t) },
};
const env = {
  document,
  localStorage: { getItem: k => storage[k] || null, setItem: (k, v) => (storage[k] = v) },
  setTimeout: fn => {
    fn();
    return 1;
  },
  clearTimeout() {},
  requestAnimationFrame() {},
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: true }),
  console,
  structuredClone,
  Date,
  Math,
  JSON,
  Promise,
};
env.window = env;
const context = vm.createContext(env);
for (const file of ['engine.js', 'art.js', 'icons.js', 'audio.js', 'game.js'])
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../dist', file), 'utf8'), context);
const run = s => vm.runInContext(s, context);
(async () => {
  assert(node('modal-root').innerHTML.includes('One galaxy.'));
  for (const side of ['empire', 'alliance']) {
    run(`setup={side:'${side}',mode:'conquest',difficulty:'normal'};newGame();draw(0,.016);`);
    assert(node('app').innerHTML.includes('The galactic frontier'));
    assert(run('game.player') === side);
    assert(run('getSave().player') === side);
    run('nextFleet();updateSelection();');
    assert(node('side').innerHTML.includes('Hull integrity'));
    assert(node('side').innerHTML.includes('assets/' + side + '-fleet.png'));
    assert(node('selection-dock').innerHTML.includes('assets/' + side + '-fleet.png'));
    run('selectUnit(game.units.find(u=>u.side!==game.player).id)');
    assert(node('side').innerHTML.includes('assets/' + (side === 'empire' ? 'alliance' : 'empire') + '-fleet.png'));
    run('nextFleet()');
    run('researchDialog()');
    assert(node('modal-root').innerHTML.includes('Warp Drive Efficiency'));
    run('admiralDialog()');
    assert(node('modal-root').innerHTML.includes('Fleet admirals'));
    run('archiveDialog("Artillery")');
    assert(node('modal-root').innerHTML.includes('Siege Cannon Monitor'));
    run('openShop(game.stations.find(s=>s.owner===game.player).id,"Artillery")');
    assert(node('modal-root').innerHTML.includes('Commission a fleet'));
    assert(node('modal-root').innerHTML.includes('assets/' + side + '-fleet.png'));
    assert(!node('modal-root').innerHTML.includes('assets/fleet-atlas.png'));
    assert.equal((node('modal-root').innerHTML.match(/data-recruit=/g) || []).length, 3);
    for (const branch of ['Escort', 'Battle Line']) {
      run('openShop(game.stations.find(s=>s.owner===game.player).id,"' + branch + '")');
      assert.equal((node('modal-root').innerHTML.match(/data-recruit=/g) || []).length, branch === 'Escort' ? 3 : 4);
      assert(node('modal-root').innerHTML.includes('assets/' + side + '-fleet.png'));
    }
    run('helpDialog()');
    assert(node('modal-root').innerHTML.includes('War on a hex grid'));
    run('closeModal()');
    await run('endTurn(true)');
    assert.equal(run('game.turn'), 2);
    assert.equal(run('game.phase'), side);
    assert.equal(run('getSave().turn'), 2);
    run('draw(16,.016)');
  }
  run('setup={side:"alliance",mode:"iserlohn",difficulty:"normal"};newGame();');
  assert(node('app').innerHTML.includes('Assault on Iserlohn'));
  run('selectUnit(game.units.find(u=>u.type==="siege"&&u.side===game.player).id);');
  assert(node('side').innerHTML.includes('Siege Cannon Monitor'));
  const read = registered[0].execute({});
  assert.equal(read.player, 'alliance');
  registered[1].execute({ unitId: run('ownUnits()[0].id') });
  assert.throws(() => registered[1].execute({ unitId: -1 }), /Invalid/);
  run('game.over={winner:game.player,reason:"Test victory"};resultDialog();');
  assert(node('modal-root').innerHTML.includes('The galaxy remembers.'));
  console.log(
    'PASS: UI renders for both factions, controls open all dialogs, map draw completes, enemy turn completes, save/restore is coherent, structured-tool mock valid/invalid inputs pass.',
  );
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
