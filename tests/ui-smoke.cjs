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
for (const file of ['engine/admirals.js', 'engine/research.js', 'engine/galaxy.js', 'engine/campaign.js', 'engine.js', 'engine/orders.js', 'engine/ai.js', 'art.js', 'icons.js', 'audio.js', 'ui/orders.js', 'game.js'])
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../dist', file), 'utf8'), context);
const run = s => vm.runInContext(s, context);
(async () => {
  assert(node('modal-root').innerHTML.includes('One galaxy.'), 'start menu must load');
  for (const side of ['empire', 'alliance']) {
    run(`setup={side:'${side}',mode:'conquest',difficulty:'normal'};newGame();draw(0,.016);`);
    assert.equal(run('game.player'), side);
    assert.equal(run('getSave().player'), side, 'game should save and reload');
    run('nextFleet();updateSelection();');
    assert(node('selection-dock').innerHTML.includes('data-action="course"'));

    // One essential keyboard shortcut: C cancels a standing course, while
    // Ctrl+C continues to work as a browser shortcut.
    run('selectedUnit().destination={c:selectedUnit().c+1,r:selectedUnit().r};updateSelection();');
    const key = (letter, ctrlKey = false) => events.keydown({
      key: letter, ctrlKey, metaKey: false, altKey: false,
      target: { tagName: 'CANVAS', dataset: {} }, preventDefault() {},
    });
    key('c', true);
    assert(run('selectedUnit().destination'), 'Ctrl+C must not clear a course');
    key('c');
    assert(!run('selectedUnit().destination'), 'C must clear a course');
    assert(!run('getSave().units.find(u=>u.id===selectedUnit().id).destination'));

    await run('endTurn(true)');
    assert.equal(run('game.turn'), 2, 'enemy turn must finish');
    assert.equal(run('game.phase'), side, 'control must return to the player');
    assert.equal(run('getSave().turn'), 2);
  }
  console.log('PASS: startup, both factions, map rendering, save/load, C shortcut and turn transition.');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
