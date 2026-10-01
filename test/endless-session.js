'use strict';
/* Regression test: a round is endless — no fixed batch of 10, no end screen.
   Questions keep coming (refilling from the level) until the player leaves,
   and the scoreboard shows how many were answered correctly.
   Run: node test/endless-session.js */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* ---------- DOM mock (same recipe as smoke.js, plus geometry for fx) ---------- */
function fakeEl() {
  const el = {
    _h: '',
    style: {}, dataset: {}, children: [], firstChild: null,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, force) { const on = force !== undefined ? force : !this._s.has(c); on ? this._s.add(c) : this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); },
    },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._h; },
    set(v) { el._h = String(v); },
  });
  el.appendChild = c => { el.children.push(c); return c; };
  el.removeChild = c => { el.children = el.children.filter(x => x !== c); return c; };
  el.remove = () => {};
  el.focus = () => {};
  el.blur = () => {};
  el.addEventListener = () => {};
  el.removeEventListener = () => {};
  el.insertAdjacentHTML = (pos, h) => { el._h += String(h); };
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
  el.querySelector = sel => { if (!el._q) el._q = {}; if (!el._q[sel]) el._q[sel] = fakeEl(); return el._q[sel]; };
  el.querySelectorAll = () => [];
  el.closest = () => null;
  el.contains = () => false;
  el.disabled = false;
  el.textContent = '';
  return el;
}

const storeData = {};
const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp, Error,
  Promise, Set, Map, WeakMap, Symbol,
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => 0,
  innerWidth: 800, innerHeight: 600,
  location: { hash: '#/' },
  addEventListener: () => {},
  scrollTo: () => {},
  localStorage: {
    getItem: k => (k in storeData ? storeData[k] : null),
    setItem: (k, v) => { storeData[k] = String(v); },
    removeItem: k => { delete storeData[k]; },
  },
  fakeEl,
  document: {
    body: fakeEl(),
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });
const run = code => vm.runInContext(code, sandbox);

/* ---------- tiny test levels + a task stub that just reports the answer ---------- */
run(`
  __view = null;
  __pending = null;
  /* swap every real task renderer for a stub that just reports the answer
     (the const binding cannot be reassigned, so mutate the object) */
  __taskFn = function (mount, o) { __pending = o; return null; };
  Object.keys(tasks).forEach(k => { delete tasks[k]; });
  Object.keys(FORMATS).forEach(kind => FORMATS[kind].forEach(f => { tasks[f] = __taskFn; }));
  tasks['type-en'] = __taskFn;
  function __mkLevel(name, n) {
    DATA[name] = {
      words: [], sentences: [], verbSentences: [], dialogues: [], reading: [], flashcards: [],
      grammar: Array.from({ length: n }, (_, i) => ({
        id: name + '-g-' + i, en: 'rule ' + i,
        correct: 'Bien ' + i, wrongs: ['Mal ' + i + 'a', 'Mal ' + i + 'b'],
      })),
    };
    DATA.levels.push(name);
  }
  __mkLevel('T1', 6);
  __mkLevel('T2', 5);
  __mkLevel('T3', 4);
  function __start(gameId, level) {
    __view = fakeEl();
    __pending = null;
    GAMES.find(g => g.id === gameId).start(__view, level);
    return __view;
  }
`);

const view = () => sandbox.__view;
const pending = () => sandbox.__pending;

function answer(ok) {
  if (!pending()) throw new Error('no question was served');
  pending().onSubmit(ok !== false);
  const next = view().querySelector('#next');
  if (!next || typeof next.onclick !== 'function') throw new Error('no Next button after answering');
  next.onclick();
}
const text = id => view().querySelector('#' + id).textContent;

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

console.log('== endless round ==');
run('__start("grammar", "T1")');
t('a question is served immediately', !!pending());
t('the round does not advertise a fixed length', !/·\s*<b>1<\/b>\s*\/\s*\d+/.test(view().innerHTML)
  && /sin fin/.test(view().innerHTML));

let ok = true;
for (let i = 0; i < 30; i++) {
  answer(true);
  if (!pending()) { ok = false; break; }
  if (/endcard|Again 🔁/.test(view().innerHTML)) { ok = false; break; }
}
t('30 answers in a row with a 6-item deck never ends the round', ok && !!pending());
t('no end card / “Again” button is ever rendered', !/endcard|Again 🔁/.test(view().innerHTML));
t('question 31 is still a live question', /format-chip/.test(view().innerHTML) && !!pending());

console.log('== live scoreboard ==');
run('__start("grammar", "T1")');
for (let i = 0; i < 12; i++) answer(true);
t('scoreboard counts 12 correct answers', text('sbCorrect') === '12' && text('sbAnswered') === '12');
t('scoreboard shows 0 to review after a clean run', text('sbWrong') === '0');
t('accuracy reads 100%', text('sbPct') === '100%');
t('racha (combo) tracks the streak', text('sbCombo') === '12');
answer(false);
answer(false);
answer(true);
t('a wrong answer is counted and resets the racha',
  text('sbWrong') === '2' && text('sbCorrect') === '13' && text('sbAnswered') === '15' && text('sbCombo') === '1');
t('accuracy reads 87%', text('sbPct') === '87%');
t('XP counter grows', Number(text('sbXp')) > 0);
t('accuracy bar reflects the score', view().querySelector('#sbBar').style.width === '87%');

console.log('== queue keeps refilling, mastered items retire ==');
run('__start("grammar", "T2")');
const counts = {};
for (let i = 0; i < 25; i++) {
  const id = pending().entry.id;
  counts[id] = (counts[id] || 0) + 1;
  answer(true);
}
t('every one of the 5 items is drilled exactly 5 times before any repeat',
  Object.keys(counts).length === 5 && Object.values(counts).every(n => n === 5));
t('5 items locked in', text('sbLocked') === '5' && text('sbLeft') === '0');
answer(true);
t('once everything is locked in the round keeps going in free-practice mode',
  !!pending() && /free practice/.test(view().innerHTML) && !/endcard/.test(view().innerHTML));

console.log('== XP is banked when the player leaves ==');
run('__start("grammar", "T3")');
const xpBefore = run('player.data.xpTotal');
for (let i = 0; i < 12; i++) answer(true);
t('XP is checkpointed during a long session', run('player.data.xpTotal') > xpBefore);
const xpMid = run('player.data.xpTotal');
t('the unbanked remainder is still pending', run('!!pendingXP && pendingXP.xp > 0') === true);
run('runCleanup()');
t('leaving the game banks the rest of the session XP', run('player.data.xpTotal') > xpMid);
t('nothing is left pending after leaving', run('pendingXP') === null);

console.log('== empty deck still says “todo aprendido” ==');
run('__start("flashcards", "T1")');
t('a level with no items of that kind shows the completion card', /endcard/.test(view().innerHTML));

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
