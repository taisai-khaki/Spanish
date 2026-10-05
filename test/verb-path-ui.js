'use strict';
/* Verb Path UI walkthrough. Run: node test/verb-path-ui.js
   Boots the real app in a DOM sandbox and plays the game: root → presente →
   pretérito → word order, including a deliberate miss that must save the run
   (the verb comes back at the missed step, never from the top). The rotation
   rule itself — a miss waits for every other unlearned verb — is covered by
   test/verb-path-rotation.js. */
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

/* the word-order builder: row = the slots, bank = the shuffled words */
const orderMount = () => view('#task').querySelector('#vpOrder');
const placeWords = words => {
  const bank = orderMount().children[1];
  const row = orderMount().children[0];
  for (const word of words) {
    const chip = bank.children.find(c => c.textContent === word && row.children.indexOf(c) < 0);
    if (!chip) throw new Error('missing chip: ' + word);
    chip.onclick();
  }
};

/* ---------- start screen ---------- */
console.log('== start screen ==');
const startHtml = openPath('comer');
t('the start screen advertises the four steps and the resume rule',
  /Verb Path/.test(startHtml) && /1 · Root/.test(startHtml) && /4 · Word order/.test(startHtml)
  && /never from the beginning/.test(startHtml) && /190 handout verbs/.test(startHtml));
t('the start screen states the rotation rule: one turn per verb per pass',
  /one turn per verb per pass/.test(startHtml) && /every other verb that is still not learned/.test(startHtml));

console.log('== step 1 · root ==');
t('the header does not leak the Spanish verb before the root answer',
  !/>comer</.test(VIEW.innerHTML) && /handout verb #28/.test(VIEW.innerHTML));
t('the root step asks for the Spanish of “to eat” and is step 1 of 4',
  /Step 1\/4 · Root/.test(taskHtml()) && /to eat/.test(taskHtml()) && /Type the Spanish verb/.test(taskHtml()));
answerTyped('comer');
t('typing the infinitive is correct and the step is locked in',
  /¡Correcto!/.test(feedback()) && /Root learned/.test(feedback()) && progress('comer').step === 1);

console.log('== step 2 · presente (shown part + typed ending) ==');
next();
t('the presente step shows the part that stays and asks for the rest',
  /Step 2\/4 · Presente/.test(taskHtml()) && /"vp-shown">com</.test(taskHtml()) && /I eat · presente/.test(taskHtml()));
answerTyped('o');
t('typing the ending builds the form and passes the step',
  /¡Correcto!/.test(feedback()) && /como/.test(feedback()) && progress('comer').step === 2);

console.log('== step 3 · pretérito (accents forgiven) ==');
next();
t('the pretérito step is the same drill in the simple past',
  /Step 3\/4 · Pretérito/.test(taskHtml()) && /"vp-shown">com</.test(taskHtml()) && /I eat · simple past/.test(taskHtml()));
answerTyped('i');   // "comí" typed without the accent
t('an accent-less answer still counts', /¡Correcto!/.test(feedback()) && progress('comer').step === 3);

console.log('== step 4 · build the real sentence ==');
next();
t('the word-order step is served last, over that verb’s own sentence bank',
  /Step 4\/4 · Word order/.test(taskHtml()) && /Tap the words in the right order/.test(taskHtml())
  && progress('comer').step === 3);
const items = run('VERB_PATH.byEs.comer.steps[3].items');
const item = items[(hashOf('comer') + progress('comer').attempts) % items.length];
const bank = orderMount().children[1];
t('the builder serves a real A2 sentence with distractor words',
  bank.children.length === item.ans.length + item.distr.length && item.distr.length >= 3);

console.log('== a miss saves the run instead of restarting the verb ==');
placeWords(item.ans.slice().reverse());
orderMount().querySelector('#tcheck').onclick();
t('the wrong order is reported with the right sentence',
  /Not yet/.test(feedback()) && feedback().indexOf(item.es) >= 0);
t('the miss tells the player the verb waits at the back of the rotation',
  /after the other \d+ verbs? ha(s|ve) had (its|their) turn/.test(feedback()));
t('the verb stays on the word-order step, unlearned',
  progress('comer').step === 3 && progress('comer').learned === false && progress('comer').wrong === 1);
next();
t('the turn passes to another verb, at its root step',
  /Step 1\/4 · Root/.test(taskHtml()) && !/handout verb #28/.test(VIEW.innerHTML));

console.log('== coming back: the path resumes at the missed step ==');
openPath('comer');
t('the verb is served at the step that failed — word order, not the top',
  /Step 4\/4 · Word order/.test(taskHtml()) && !/Step 1\/4/.test(taskHtml()));

console.log('== finish the verb ==');
const item2 = run('VERB_PATH.byEs.comer.steps[3].items')[(hashOf('comer') + progress('comer').attempts) % items.length];
placeWords(item2.ans);
const row = orderMount().children[0];
t('the sentence is assembled in the slot row',
  row.children.map(c => c.textContent).join(' ') === item2.ans.join(' '));
const checkBtn = orderMount().querySelector('#tcheck');
t('the builder enables Check once the sentence is placed', checkBtn.disabled === false);
checkBtn.onclick();
t('the built sentence is accepted and the verb is learned',
  /¡Correcto!/.test(feedback()) && /All four steps passed/.test(feedback()) && /Next verb →/.test(feedback())
  && progress('comer').step === 4 && progress('comer').learned === true && progress('comer').wrong === 1);
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
  /Step 1\/4 · Root/.test(taskHtml()) && progress('comer').learned === true && progress('comer').step === 4);
answerTyped('comer');
t('the practice answer counts and the verb stays learned',
  /¡Correcto!/.test(feedback()) && progress('comer').learned === true && progress('comer').step === 4);

console.log('== a learned verb is retired from the queue ==');
const attemptsBefore = progress('comer').attempts;
openPath('');
for (let i = 0; i < 20; i++) {
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
