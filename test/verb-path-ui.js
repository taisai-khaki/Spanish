'use strict';
/* Verb Path UI walkthrough. Run: node test/verb-path-ui.js
   Boots the real app in a DOM sandbox and plays the game: root → presente →
   pretérito → the 11 magic combos → word order, including a deliberate miss
   that must save the run (the verb comes back at the missed step, never from
   the top). */
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
const progress = es => JSON.parse(run(`JSON.stringify(verbPathProgress.get(${JSON.stringify(es)}))`));
const answerTyped = value => { mount('#vpInput').value = value; mount('#vpCheck').onclick(); };
const next = () => view('#vpNext').onclick();
const hashOf = s => { let h = 0; String(s).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 99991; }); return h; };

function openPath(verb) {
  VIEW = fakeEl();
  sandbox.__uiView = VIEW;
  run(`GAMES.find(g => g.id === 'verbpath').start(__uiView, 'A2', ${JSON.stringify(verb || '')})`);
  const startHtml = VIEW.innerHTML;
  view('#vpGo').onclick();          // the setup screen's Start button
  return startHtml;
}

/* ---------- start screen ---------- */
console.log('== start screen ==');
const startHtml = openPath('comer');
t('the start screen advertises the five steps and the resume rule',
  /Verb Path/.test(startHtml) && /1 · Root/.test(startHtml) && /5 · Word order/.test(startHtml)
  && /never from the beginning/.test(startHtml) && /190 handout verbs/.test(startHtml));

console.log('== step 1 · root ==');
t('the header does not leak the Spanish verb before the root answer',
  !/>comer</.test(VIEW.innerHTML) && /handout verb #28/.test(VIEW.innerHTML));
t('the root step asks for the Spanish of “to eat” and is step 1 of 5',
  /Step 1\/5 · Root/.test(taskHtml()) && /to eat/.test(taskHtml()) && /Type the Spanish verb/.test(taskHtml()));
answerTyped('comer');
t('typing the infinitive is correct and the step is locked in',
  /¡Correcto!/.test(feedback()) && /Root learned/.test(feedback()) && progress('comer').step === 1);

console.log('== step 2 · presente (shown part + typed ending) ==');
next();
t('the presente step shows the part that stays and asks for the rest',
  /Step 2\/5 · Presente/.test(taskHtml()) && /"vp-shown">com</.test(taskHtml()) && /I eat · presente/.test(taskHtml()));
answerTyped('o');
t('typing the ending builds the form and passes the step',
  /¡Correcto!/.test(feedback()) && /como/.test(feedback()) && progress('comer').step === 2 && progress('comer').magicDone === 0);

console.log('== step 3 · pretérito (accents forgiven) ==');
next();
t('the pretérito step is the same drill in the simple past',
  /Step 3\/5 · Pretérito/.test(taskHtml()) && /"vp-shown">com</.test(taskHtml()) && /I eat · simple past/.test(taskHtml()));
answerTyped('i');   // "comí" typed without the accent
t('an accent-less answer still counts', /¡Correcto!/.test(feedback()) && progress('comer').step === 3);

console.log('== step 4 · the 11 magic combos ==');
next();
t('the combos start with the first frame',
  /Step 4\/5 · Magic combos · combo 1\/11/.test(taskHtml()) && /I need to eat/.test(taskHtml())
  && /Magic combos 1\/11/.test(VIEW.innerHTML));
answerTyped('Necesito comer');
t('the first combination counts and the step remembers how far it got',
  /¡Correcto!/.test(feedback()) && progress('comer').step === 3 && progress('comer').magicDone === 1);
next();
t('the next combo is served (2/11)',
  /combo 2\/11/.test(taskHtml()) && /I have to eat/.test(taskHtml()));

console.log('== a miss saves the run instead of restarting the verb ==');
answerTyped('nope');
t('the wrong answer is reported with the right combination',
  /Not yet/.test(feedback()) && feedback().indexOf('Tengo que comer') >= 0);
t('the verb stays on the combos step with its combo counter untouched',
  progress('comer').step === 3 && progress('comer').magicDone === 1 && progress('comer').wrong === 1);
next();
t('the turn passes to another verb', !/Tengo que comer/.test(taskHtml()) && !/combo 2\/11/.test(taskHtml()));

console.log('== coming back: the path resumes at the missed step ==');
run('verbPathProgress.set("comer", { step: 3, magicDone: 1 })');
openPath('comer');
t('the verb is served at the step that failed — combo 2/11, not the top',
  /Step 4\/5 · Magic combos · combo 2\/11/.test(taskHtml()) && /I have to eat/.test(taskHtml())
  && !/Step 1\/5/.test(taskHtml()));

console.log('== finish the verb ==');
for (let i = 0; i < 10; i++) {
  const combos = run('VERB_PATH.byEs.comer.steps[3].combos');
  const at = progress('comer').magicDone;
  answerTyped(combos[at].es);
  if (progress('comer').magicDone === 0) break;   // the 11th finished the step
  next();
}
next();   // the last combo hands the turn to the word-order step
t('all 11 magic combinations passed and the word-order step is served',
  progress('comer').step === 4 && /Step 5\/5 · Word order/.test(taskHtml()));

console.log('== step 5 · build the real sentence ==');
const attempts = progress('comer').attempts;
const items = run('VERB_PATH.byEs.comer.steps[4].items');
const item = items[(hashOf('comer') + attempts) % items.length];
const orderMount = view('#task').querySelector('#vpOrder');
const row = orderMount.children[0];
const bank = orderMount.children[1];
t('the builder serves a real A2 sentence with distractor words',
  /Tap the words in the right order/.test(taskHtml()) && bank.children.length === item.ans.length + item.distr.length);
for (const word of item.ans) {
  const chip = bank.children.find(c => c.textContent === word && row.children.indexOf(c) < 0);
  if (!chip) throw new Error('missing chip: ' + word);
  chip.onclick();
}
t('the sentence is assembled in the slot row',
  row.children.map(c => c.textContent).join(' ') === item.ans.join(' '));
const checkBtn = orderMount.querySelector('#tcheck');
t('the builder enables Check once the sentence is placed', checkBtn.disabled === false);
checkBtn.onclick();
t('the built sentence is accepted and the verb is learned',
  /¡Correcto!/.test(feedback()) && /All five steps passed/.test(feedback()) && /Next verb →/.test(feedback())
  && progress('comer').step === 5 && progress('comer').learned === true && progress('comer').wrong === 1);
t('the scoreboard counts one verb locked in and 189 left',
  view('#sbLocked').textContent === '1' && view('#sbLeft').textContent === '189');

console.log('== XP & leaving ==');
t('the session earned XP and it is already banked at the checkpoint',
  run('player.data.xpTotal') > 0 && run('!!pendingXP') === true);
const xpMid = run('player.data.xpTotal');
run('runCleanup()');
t('the rest of the XP is banked when the player leaves the path',
  run('player.data.xpTotal') > xpMid && run('pendingXP') === null);

console.log('== “Practice this verb” opens the path on that verb ==');
openPath('comer');
t('a learned verb opens from the root again without losing its saved steps',
  /Step 1\/5 · Root/.test(taskHtml()) && progress('comer').learned === true && progress('comer').step === 5);
answerTyped('comer');
t('the practice answer counts and the verb stays learned',
  /¡Correcto!/.test(feedback()) && progress('comer').learned === true && progress('comer').step === 5);

console.log('== a learned verb is retired from the queue ==');
const attemptsBefore = progress('comer').attempts;
openPath('');
for (let i = 0; i < 12; i++) {
  if (!mount('#vpInput')) break;
  answerTyped('zzz');       // every other verb is missed on purpose
  next();
}
t('the learned verb is never served again while other verbs are pending',
  progress('comer').attempts === attemptsBefore && run('verbPathProgress.stats().learned') === 1);
t('a miss on the root step keeps that verb at step 0 (root is the step to pass next)',
  run('verbPathProgress.stats().learned') === 1 && run('verbPathProgress.stats().fresh') === 189
  && run('verbPathProgress.stats().started') === 0);

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
