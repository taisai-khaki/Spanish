'use strict';
/* Verb Path rotation test. Run: node test/verb-path-rotation.js
   The rule under test: a verb missed at ANY step goes to the back of the
   rotation — it is not served again until every other verb that is still not
   learned has had its turn (190 pending → a miss on the first verb comes back
   only after the other 189), and it resumes at the step that failed.
   Boots the real app in a DOM sandbox and plays it through its own handlers. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* ---------- DOM mock: querySelector remembers elements so handlers stick ---------- */
function fakeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    _h: '', _q: {}, style: {}, dataset: {}, children: [], firstChild: null,
    value: '', disabled: false, hidden: false, textContent: '', className: '', type: '',
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
  el.querySelector = sel => { if (!el._q[sel]) el._q[sel] = fakeEl(); return el._q[sel]; };
  el.querySelectorAll = () => [];
  el.closest = () => null;
  el.contains = () => false;
  return el;
}

const storeData = {};
const byId = {};
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
    getElementById: id => { if (!byId[id]) byId[id] = fakeEl(); return byId[id]; },
    createElement: tag => fakeEl(tag),
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

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

/* ---------- helpers to play the game through its own DOM ---------- */
let VIEW = null;
const view = sel => VIEW.querySelector(sel);
const taskHtml = () => view('#task').innerHTML;
const mount = sel => view('#task').querySelector(sel);
const feedback = () => view('#fb').innerHTML;
const answerTyped = value => { mount('#vpInput').value = value; mount('#vpCheck').onclick(); };
const next = () => view('#vpNext').onclick();

/* the handout number in the header identifies the verb that is being served */
const servedNo = () => {
  const m = /vp-verb-name">([\s\S]*?)<\/span>/.exec(VIEW.innerHTML);
  const n = /#(\d+)/.exec(m ? m[1] : '');
  return n ? Number(n[1]) : null;
};
const onOrderStep = () => /#vpOrder/.test(taskHtml());

function openPath(verb) {
  VIEW = fakeEl();
  sandbox.__uiView = VIEW;
  run(`GAMES.find(g => g.id === 'verbpath').start(__uiView, 'A2', ${JSON.stringify(verb || '')})`);
  const startHtml = VIEW.innerHTML;
  view('#vpGo').onclick();          // the setup screen's Start button
  return startHtml;
}

/* answer wrong on purpose and hand the turn over */
function miss() {
  if (onOrderStep()) throw new Error('unexpected word-order step in this scenario');
  answerTyped('zzz');
  next();
}

const TOTAL = run('DATA.A2.verbPath.length');
const esByNo = {};
run(`DATA.A2.verbPath`).forEach(v => { esByNo[v.handoutNo] = v.es; });

/* ======================================================================= */
console.log('== a missed verb waits for the whole rotation ==');
run('verbPathProgress.reset()');
openPath('');
const first = servedNo();
t('the path opens on a handout verb', first !== null && TOTAL === 190);
answerTyped('zzz');
t('the miss tells the player how long the verb waits',
  /after the other 189 verbs have had their turn/.test(feedback()));
next();

/* one full pass: 189 more servings, none of them a repeat */
const seen = [first];
for (let i = 0; i < TOTAL - 1; i++) {
  seen.push(servedNo());
  miss();
}
t('every one of the 190 pending verbs is served once before any repeats',
  new Set(seen).size === TOTAL && seen.length === TOTAL);
t('the verb missed first comes back only after the other 189', servedNo() === first);
t('and it resumes at the step it failed — the root, not a later step',
  /Step 1\/4 · Root/.test(taskHtml()));

/* the second pass is the same rotation, in the order the verbs were missed */
const seen2 = [];
for (let i = 0; i < TOTAL; i++) {
  seen2.push(servedNo());
  miss();
}
t('the second pass is the same 190 verbs, still one turn each',
  new Set(seen2).size === TOTAL && seen2.join(',') === seen.join(','));

/* ======================================================================= */
console.log('== the verb missed at step 2 comes back at step 2, one pass later ==');
run('verbPathProgress.reset()');
openPath('');
const no = servedNo();
answerTyped(esByNo[no]);            // pass the root …
next();                             // … and the run moves on to the next step
t('the root is passed and the presente step follows in the same turn',
  servedNo() === no && /Step 2\/4 · Presente/.test(taskHtml()));
answerTyped('zzz');                 // … and miss the presente
t('the miss on the presente also waits for the rotation',
  /after the other 189 verbs have had their turn/.test(feedback()));
next();
const pass2 = [];
for (let i = 0; i < TOTAL - 1; i++) {
  pass2.push(servedNo());
  miss();
}
t('189 other verbs are shown before the missed one returns',
  pass2.length === TOTAL - 1 && !pass2.includes(no) && new Set(pass2).size === TOTAL - 1);
t('it returns at the presente step — the root it passed stays saved',
  servedNo() === no && /Step 2\/4 · Presente/.test(taskHtml()));

/* ======================================================================= */
console.log('== a learned verb leaves the rotation, the pass shrinks with it ==');
run('verbPathProgress.reset()');
run('verbPathProgress.set("comer", { step: 4 })');
openPath('');
const shortPass = [];
for (let i = 0; i < TOTAL - 1; i++) {
  shortPass.push(servedNo());
  miss();
}
t('the learned verb is never served and the pass is 189 long',
  shortPass.length === TOTAL - 1 && new Set(shortPass).size === TOTAL - 1
  && !shortPass.includes(run('DATA.A2.verbPath.find(v => v.es === "comer").handoutNo')));
t('the rotation of the remaining verbs starts over with the first of them',
  servedNo() === shortPass[0]);

/* ======================================================================= */
console.log('== one verb left: nothing else to wait for, it comes straight back ==');
run('verbPathProgress.reset()');
run(`DATA.A2.verbPath.forEach(v => { if (v.es !== 'comer') verbPathProgress.set(v.es, { step: 4 }); })`);
openPath('');
t('the only pending verb is served', servedNo() === run('DATA.A2.verbPath.find(v => v.es === "comer").handoutNo'));
answerTyped('zzz');
t('the feedback says there is nothing else waiting',
  /Nothing else is waiting, so it comes straight back/.test(feedback()));
next();
t('the same verb is served again', servedNo() === run('DATA.A2.verbPath.find(v => v.es === "comer").handoutNo'));

/* ======================================================================= */
console.log('== review mode (everything learned) rotates the same way ==');
run('verbPathProgress.reset()');
run('DATA.A2.verbPath.forEach(v => verbPathProgress.set(v.es, { step: 4 }))');
const reviewHtml = openPath('');
t('free practice is announced when every verb is learned', /free practice/.test(VIEW.innerHTML));
const rFirst = servedNo();
answerTyped('zzz');
next();
t('a miss in free practice hands the turn to a different verb', servedNo() !== rFirst);

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
