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

console.log('== 200-verb deck: 5-in-a-row, full-pass rotation, wrong answers return ==');
/* the deck game works on the real A2 verb-card bank */
run('__start("verbcards", "A2")');
const firstId = pending().entry.id;
answer(true);
t('a correct answer counts 1/5 (not mastered)',
  run(`engine.get('A2','verbCard','${firstId}').streak`) === 1
  && !run(`engine.get('A2','verbCard','${firstId}').streak >= 5`));

/* answering correct cards should not repeat them until the whole deck has
   been through once */
const seen = new Set();
let repeatEarly = 0;
for (let i = 0; i < 60; i++) {
  const id = pending().entry.id;
  if (seen.has(id)) repeatEarly++;
  seen.add(id);
  answer(true);
}
t('60 correct answers serve 60 different cards — a right card waits for the full pass',
  repeatEarly === 0 && seen.size === 60);

/* a wrong answer resets the counter and comes back within a few questions */
run('__start("verbcards", "A2")');
const missId = pending().entry.id;
answer(false);
let cameBack = -1;
for (let i = 0; i < 40; i++) {
  if (pending().entry.id === missId) { cameBack = i; break; }
  answer(true);
}
t('a card answered wrong is put back into rotation within a few questions',
  cameBack >= 0 && cameBack < 30);
t('the wrong answer reset its counter to 0',
  run(`engine.get('A2','verbCard','${missId}').streak`) === 0);
answer(true);
t('answering it correctly restarts its counter at 1/5',
  run(`engine.get('A2','verbCard','${missId}').streak`) === 1);

/* 5 in a row locks a card; a wrong answer inside those 5 wipes it.
   (A right answer keeps the card out for the rest of the pass, so this part
   drives the mastery counter directly.) */
run('__start("verbcards", "A2")');
const lockId = pending().entry.id;
const leftBefore = run('engine.unmastered("A2","verbCard").length');
let res5 = null;
for (let i = 0; i < 5; i++) res5 = run(`engine.result('A2','verbCard','${lockId}',true,'verb-card')`);
t('the fifth correct answer in a row locks the card',
  res5.justMastered === true && res5.streak === 5 && res5.target === 5);
t('the locked card leaves the “left to lock in” count',
  run('engine.unmastered("A2","verbCard").length') === leftBefore - 1);
const resetId = run(`DATA.A2.verbCards.find(c => c.id !== '${lockId}').id`);
for (let i = 0; i < 3; i++) run(`engine.result('A2','verbCard','${resetId}',true,'verb-card')`);
run(`engine.result('A2','verbCard','${resetId}',false,'verb-card')`);
t('a wrong answer inside the 5 wipes the card back to 0/5',
  run(`engine.get('A2','verbCard','${resetId}').streak`) === 0
  && run(`engine.masteryTarget('verbCard')`) === 5);

console.log('== pass model on a toy 3-card deck: one look per pass, 5 passes to lock ==');
run(`
  DATA.TC = { words: [], sentences: [], verbSentences: [], dialogues: [], reading: [], flashcards: [], grammar: [],
    verbCards: [0, 1, 2].map(i => ({ id: 'TC-c' + i, es: 'es' + i, en: 'en' + i, answer: 'a' + i, prompt: 'p' + i, badge: 'b', options: ['a' + i, 'b', 'c', 'd'] })) };
  DATA.levels.push('TC');
  __view = fakeEl(); __pending = null;
  runRound(__view, { id: 'tc', icon: '📚', title: 'Toy deck', level: 'TC', kind: 'verbCard', batchSize: 5, retryWrong: true });
`);
const servedIds = [];
for (let i = 0; i < 15; i++) { servedIds.push(pending().entry.id); answer(true); }
const laps = [0, 3, 6, 9, 12].map(i => servedIds.slice(i, i + 3));
t('every pass shows the 3 cards exactly once (never twice in a pass)',
  laps.every(l => new Set(l).size === 3));
t('a card that was answered right is not repeated until the pass is over',
  laps[0].every(id => laps[1].includes(id)) && laps[1].every(id => laps[2].includes(id)));
t('after 5 clean passes all 3 cards are locked (5 correct in a row each)',
  run(`DATA.TC.verbCards.every(c => engine.get('TC','verbCard',c.id).streak === 5)`) === true
  && run(`engine.unmastered('TC','verbCard').length`) === 0);

console.log('== empty deck still says “todo aprendido” ==');
run('__start("flashcards", "T1")');
t('a level with no items of that kind shows the completion card', /endcard/.test(view().innerHTML));

console.log('== home page panel counts the deck per verb ==');
/* re-render the home page against one stable #view element */
sandbox.__stableView = sandbox.fakeEl();
run(`
  document.getElementById = () => __stableView;
  document.querySelector = sel => (sel === '#view' ? __stableView : null);
  store.set('level', 'A2');   /* the deck panel belongs to A2 */
`);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8'), sandbox, { filename: 'app.js' });
const homeHtml = sandbox.__stableView.innerHTML;
t('the A2 panel describes the deck with 28 / 44 cards per verb',
  /200 Verbs &amp; Glue Words/.test(homeHtml) && /<b>28<\/b>/.test(homeHtml) && /<b>44<\/b>/.test(homeHtml));
t('the panel lists all 190 verbs with their locked count', (homeHtml.match(/verb-progress-row/g) || []).length === 190);
t('every row shows a card counter (x/28 or x/44)',
  /\d+\/28/.test(homeHtml) && /\d+\/44/.test(homeHtml));

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
