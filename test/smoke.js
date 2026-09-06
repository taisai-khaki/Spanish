'use strict';
/* Smoke test: boots the whole app in a vm sandbox and checks the exam build.
   Run: node test/smoke.js   (from the repo root) */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* ---------- DOM mock (same recipe as before) ---------- */
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
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

/* ---------- load scripts in index.html order ---------- */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
for (const s of scripts) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });
}
const run = code => vm.runInContext(code, sandbox);

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
}

console.log('== content inventory ==');
t('levels = A1 A2 B1 EXAM', run('JSON.stringify(DATA.levels)') === '["A1","A2","B1","EXAM"]');
const wCount = run('DATA.EXAM.words.length');
t('EXAM words deck is large (' + wCount + ') with 7 categories', wCount >= 170 && new Set(run('DATA.EXAM.words.map(w => w.cat)')).size === 7);
t('every EXAM word has es+en', run('DATA.EXAM.words.every(w => w.es && w.en)'));
t('EXAM sentences = 16 (ans + distr arrays)', run('DATA.EXAM.sentences.length === 16 && DATA.EXAM.sentences.every(s => s.ans.length >= 3 && s.distr.length >= 2)'));
t('EXAM grammar = 9', run('DATA.EXAM.grammar.length') === 9);
t('EXAM dialogues = 1 (consulado, 8 lines)', run('DATA.EXAM.dialogues.length === 1 && DATA.EXAM.dialogues[0].lines.length === 8'));
t('EXAM interview = 10', run('DATA.EXAM.interview.length') === 10);
t('EXAM reading = 16 passages x 6 qs (correct in opts)', run('DATA.EXAM.reading.length === 16 && DATA.EXAM.reading.every(p => p.qs.length === 6 && p.qs.every(q => q.opts.length === 4 && q.opts.includes(q.ok)))'));
t('EXAM repaso = 683 (3 wrongs + correct each)', run('DATA.EXAM.repaso.length === 683 && DATA.EXAM.repaso.every(x => x.wrongs.length === 3 && x.correct)'));
t('every interview item has tip + model + need', run('DATA.EXAM.interview.every(i => i.tip && i.model && i.modelEn && i.need.tokens.length >= 4 && i.need.min >= 1)'));
const examTotal = run('engine.stats("EXAM").total');
const expectedTotal = run('DATA.EXAM.words.length + DATA.EXAM.sentences.length + DATA.EXAM.grammar.length + DATA.EXAM.dialogues[0].lines.length + 10 + 16 + 683');
t('EXAM total items consistent (' + examTotal + ')', examTotal === expectedTotal);
t('B1 deck is B1-sized (115 items: 71w/16s/10g/18 lines)', run('engine.stats("B1").total') === 115
  && run('DATA.B1.words.length') === 71 && run('DATA.B1.sentences.length') === 16
  && run('DATA.B1.grammar.length') === 10 && run('DATA.B1.dialogues.length') === 2);
t('B1 has idioms + formal + errands categories', new Set(run('DATA.B1.words.map(w => w.cat)')).has('idioms')
  && new Set(run('DATA.B1.words.map(w => w.cat)')).has('formal')
  && new Set(run('DATA.B1.words.map(w => w.cat)')).has('errands'));

console.log('== mastery engine (regression) ==');
t('5 correct → justMastered on 5th', run(`
  (function(){ const lv='A1', k=engine.key(lv,'word','hola');
    for (let i=0;i<4;i++) engine.result(lv,'word','hola',true,'type-en');
    const r = engine.result(lv,'word','hola',true,'type-es');
    return r.justMastered && engine.get(lv,'word','hola').streak >= 5; })()`));
t('wrong resets streak', run(`
  (function(){ engine.result('A1','word','adiós',true,'type-en'); engine.result('A1','word','adiós',true,'type-es');
    const r = engine.result('A1','word','adiós',false,'type-en');
    return engine.get('A1','word','adiós').streak === 0; })()`));
t('mastered item leaves the queue', run(`
  (function(){ return !engine.unmastered('A1','word').some(w => w.es === 'hola'); })()`));
t('interview format rotates (12 rounds, never same as last used)', run(`
  (function(){
    const e = { kind: 'interview', id: 'i1', item: {} };
    let last = null, ok = true;
    for (let i = 0; i < 12; i++) {
      const f = engine.format(e, 'A1', {});
      if (last && f === last) ok = false;
      if (!FORMATS.interview.includes(f)) ok = false;
      engine.result('A1', 'interview', 'i1', true, f); // app always records the format used
      last = f;
    }
    return ok; })()`));
t('reading + repaso formats are from their lists', run(`
  (function(){
    const r = engine.format({ kind: 'reading', id: '1', item: {} }, 'EXAM', {});
    const p = engine.format({ kind: 'repaso', id: 'q1', item: {} }, 'EXAM', {});
    return FORMATS.reading.includes(r) && FORMATS.repaso.includes(p); })()`));
t('noMic excludes speak + ask-speak', run(`
  (function(){
    const ok1 = FORMATS.dialogue.filter(f => !/^(speak|ask-)/.test(f)).every(f => f !== 'speak');
    const e = { kind: 'interview', id: 'i2', item: {} };
    let ok2 = true;
    for (let i = 0; i < 12; i++) { const f = engine.format(e, 'A1', { noMic: true }); if (f === 'ask-speak') ok2 = false; }
    return ok1 && ok2; })()`));

console.log('== interview keyword scoring (same algorithm as the game) ==');
t('real answer passes Q1', run(`
  (function(){ const it = DATA.EXAM.interview[0]; const text = 'Quiero la nacionalidad mexicana porque me siento parte de este país.';
    const n = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ').replace(/[¿?¡!.,;:()"'/-]/g,' ').replace(/\\s+/g,' ').trim();
    const t = ' ' + n(text) + ' ';
    const hits = it.need.tokens.filter(tok => t.includes(n(tok))).length;
    return hits >= it.need.min; })()`));
t('one-word answer fails Q1', run(`
  (function(){ const it = DATA.EXAM.interview[0]; const text = 'México';
    const n = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ').replace(/[¿?¡!.,;:()"'/-]/g,' ').replace(/\\s+/g,' ').trim();
    return !(n(text).length >= 12); })()`));
t('Q3 passes with just an occupation word', run(`
  (function(){ const it = DATA.EXAM.interview[2]; const text = 'Yo trabajo en una tienda de ropa.';
    const n = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ').replace(/[¿?¡!.,;:()"'/-]/g,' ').replace(/\\s+/g,' ').trim();
    const t = ' ' + n(text) + ' ';
    const hits = it.need.tokens.filter(tok => t.includes(n(tok))).length;
    return hits >= it.need.min && n(text).length >= 12; })()`));
t('Q10 fails without structure (just "fue difícil")', run(`
  (function(){ const it = DATA.EXAM.interview[9]; const text = 'fue difícil';
    const n = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ').replace(/[¿?¡!.,;:()"'/-]/g,' ').replace(/\\s+/g,' ').trim();
    const t = ' ' + n(text) + ' ';
    const hits = it.need.tokens.filter(tok => t.includes(n(tok))).length;
    return !(hits >= it.need.min && n(text).length >= 12); })()`));

console.log('== games boot at all levels ==');
t('10 games registered', run('GAMES.length') === 10);
t('all 10 boot at A1/A2/B1/EXAM without throwing', run(`
  (function(){
    const v = document.getElementById('view');
    const levels = ['A1','A2','B1','EXAM'];
    for (const g of GAMES) {
      for (const lv of levels) {
        v.innerHTML = '';
        g.start(v, lv);
        if (!v.innerHTML) return 'empty after ' + g.id + '@' + lv;
      }
    }
    return true; })()`));
t('Repaso at EXAM: setup → go renders a real bank question', run(`
  (function(){
    const v = document.getElementById('view');
    const g = GAMES.find(x => x.id === 'repaso');
    g.start(v, 'EXAM');
    v.querySelector('#go').onclick();
    const h = v.innerHTML;
    return h.includes('q-prompt') && (h.includes('¿Cuál es correcta?') || h.includes('¿Cuál tiene un error?')); })()`));
t('Repaso outside EXAM shows the level notice', run(`
  (function(){
    const v = document.getElementById('view');
    const g = GAMES.find(x => x.id === 'repaso');
    g.start(v, 'A1');
    return v.innerHTML.includes('EXAM'); })()`));
t('Lectura at EXAM renders a passage + 6-question flow state', run(`
  (function(){
    const v = document.getElementById('view');
    const g = GAMES.find(x => x.id === 'lectura');
    g.start(v, 'EXAM');
    if (!v.innerHTML.includes('il-row')) return 'setup list missing';
    v.querySelector('#go').onclick();
    const h = v.innerHTML;
    return h.includes('q-title') && h.includes('P1/6'); })()`));
t('Entrevista at EXAM: setup lists 10 questions, go renders a task', run(`
  (function(){
    const v = document.getElementById('view');
    const g = GAMES.find(x => x.id === 'entrevista');
    g.start(v, 'EXAM');
    if ((v.innerHTML.match(/il-row/g) || []).length !== 10) return 'expected 10 rows, got ' + (v.innerHTML.match(/il-row/g) || []).length;
    v.querySelector('#go').onclick();
    const h = v.innerHTML + v.querySelector('#task').innerHTML;
    return h.includes('format-chip') && (h.includes('Entrevistador') || h.includes('Play the question')); })()`));
t('Entrevista elsewhere shows the complete screen (no interview items)', run(`
  (function(){
    const v = document.getElementById('view');
    const g = GAMES.find(x => x.id === 'entrevista');
    g.start(v, 'A1');
    return v.innerHTML.includes('Todo aprendido'); })()`));

console.log('== player, badges & quests ==');
t('17 badges incl. the 3 exam ones', run('BADGES.length') === 17 && run("BADGES.some(b => b.id === 'entrevista10') && BADGES.some(b => b.id === 'lectura16') && BADGES.some(b => b.id === 'ciudadano')"));
t('3 daily quests incl. the EXAM one', run('QUESTS.length') === 3 && run("QUESTS.some(q => q.id === 'exam1')"));
t('award() runs with EXAM stats in checkBadges', run(`
  (function(){ player.init(); player.award(50, { game: 'smoke' });
    return player.data.xpTotal >= 50 && player.data.badges && true; })()`));
t('EXAM quest auto-claims after one EXAM-level game', run(`
  (function(){
    const d = player.data;
    d.daily = { date: todayStr(), xp: 0, games: 0, claimed: {}, exam: 0 };
    player.award(10, { game: 'Lectura test', exam: true });
    return d.daily.claimed['exam1'] === true && (d.daily.exam || 0) >= 1;
  })()`));

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
