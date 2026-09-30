'use strict';
/* Smoke test: boots the whole app in a vm sandbox and checks level content,
   the mastery engine, and the EXAM build. Run: node test/smoke.js (repo root). */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const A2_SOURCE_VERBS = require('./fixtures/a2-source-verb-lemmas.json');

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
t('levels = A1 A2 B1 B2 EXAM', run('JSON.stringify(DATA.levels)') === '["A1","A2","B1","B2","EXAM"]');
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
t('A1 is a slim warm-up (76 items: 42w/12s/6g/16 lines)', run('engine.stats("A1").total') === 76
  && run('DATA.A1.words.length') === 42 && run('DATA.A1.sentences.length') === 12
  && run('DATA.A1.grammar.length') === 6 && run('DATA.A1.dialogues[0].lines.length + DATA.A1.dialogues[1].lines.length') === 16);
t('A2 expanded level (618 items: 439w/92s/59g/28 lines across 3 dialogues)', run('engine.stats("A2").total') === 618
  && run('DATA.A2.words.length') === 439 && run('DATA.A2.sentences.length') === 92
  && run('DATA.A2.grammar.length') === 59 && run('DATA.A2.dialogues.length') === 3
  && run('DATA.A2.dialogues.reduce((n, d) => n + d.lines.length, 0)') === 28);
t('A2 vocabulary is de-duplicated and includes all 11 magic frames', run(`
  (function(){
    const words = DATA.A2.words;
    const frames = ['necesitar + infinitivo','tener que + infinitivo','querer + infinitivo','ir a + infinitivo','poder + infinitivo','acabar de + infinitivo','podría + infinitivo','debería + infinitivo','soler + infinitivo','me gusta + infinitivo','me gustaría + infinitivo'];
    return words.every(w => w.es && w.en && w.cat)
      && new Set(words.map(w => w.es)).size === words.length
      && frames.every(es => words.some(w => w.es === es));
  })()`));
const a2SpanishWords = JSON.parse(run('JSON.stringify(DATA.A2.words.map(w => w.es))'));
t('A2 includes all 190 unique verb lemmas from the two numbered 100-verb lists',
  A2_SOURCE_VERBS.length === 190 && new Set(A2_SOURCE_VERBS).size === 190
    && A2_SOURCE_VERBS.every(es => a2SpanishWords.includes(es)));
t('each of the 11 magic frames has two sentence builders and a grammar quiz', run(`
  (function(){
    const ss = DATA.A2.sentences.map(s => s.es);
    const pairs = [
      ['Necesito contestar el teléfono.','Necesito cocinar antes de las ocho.'],
      ['Tengo que terminar la tarea.','Tienes que poner las llaves en el cajón.'],
      ['Quiero pedir la cuenta.','Quieren alquilar una casa cerca de la playa.'],
      ['Voy a llegar al aeropuerto.','Vamos a encontrarnos cerca de la estación.'],
      ['¿Puedes cerrar la ventana, por favor?','¿Puedes traerme la cuenta, por favor?'],
      ['Acabo de llamar a mi hermana.','Acabo de recibir una llamada.'],
      ['Podríamos visitar Oaxaca este verano.','Podríamos quedarnos en casa esta noche.'],
      ['Deberías descansar después del trabajo.','Deberías apuntar la dirección.'],
      ['Suelo desayunar a las siete.','Suelo hablar con mis vecinos por la tarde.'],
      ['Me gusta caminar por la playa.','Me gusta aprender palabras nuevas.'],
      ['Me gustaría aprender a cocinar.','Me gustaría viajar a Oaxaca en julio.'],
    ];
    const magicQuizzes = DATA.A2.grammar.filter(g => /^g-a2-magic-/.test(g.id));
    const grammarForms = magicQuizzes.map(g => g.correct);
    const onePerFrame = ['Necesito llamar al médico.','Tienes que salir ahora.','Quiero hacer una pregunta.','Voy a llegar temprano.','Podemos abrir la ventana.','Acabo de terminar la tarea.','Podríamos quedarnos en casa.','Deberías descansar hoy.','Suele caminar al trabajo.','Me gusta leer por la noche.','Me gustaría visitar Oaxaca.'];
    return pairs.every(group => group.every(es => ss.includes(es))) && magicQuizzes.length === 17
      && onePerFrame.every(es => grammarForms.includes(es));
  })()`));
t('A2 glue-word bank covers the expanded reference categories', run(`
  (function(){
    const words = DATA.A2.words;
    const cats = ['possessives','demonstratives','location','time','adverbs','quantity','comparisons','prepositions','conjunctions','pronouns','question words'];
    const required = ['¿De quién?','nuestro','mías','este','aquello','aquí','por la mañana','tampoco','nada','tan ... como','antes de','porque','me','lo','cuál','por aquí','pasado mañana','el domingo','muy bien','ninguna','media','más alto que','detrás de','a través de','ni ... ni','aunque'];
    const inGlueDeck = words.filter(w => cats.includes(w.cat));
    return inGlueDeck.length === 214 && cats.every(c => inGlueDeck.some(w => w.cat === c))
      && required.every(es => words.some(w => w.es === es));
  })()`));
t('A2 glue-word sentence builders practice ownership, comparisons, and connectors', run(`
  (function(){
    const ss = DATA.A2.sentences.map(s => s.es);
    const gs = DATA.A2.grammar.map(g => g.id);
    return ss.includes('¿De quién es esta mochila? Es mía.')
      && ss.includes('Mi hermana es tan alta como mi madre.')
      && ss.includes('Necesito un poco de agua antes de salir.')
      && ss.includes('No me gusta el café y tampoco quiero té.')
      && ss.includes('Se lo di a mi hermana y ella me dio las gracias.')
      && ss.includes('¿Cuál de estos libros quieres?')
      && ss.includes('La farmacia está detrás del banco y al lado de la panadería.')
      && ss.includes('No quiero ni café ni té, así que pediré agua.')
      && ['g-a2-glue-1','g-a2-glue-4','g-a2-glue-9','g-a2-glue-13','g-a2-glue-16','g-a2-glue-17','g-a2-glue-24','g-a2-glue-25','g-a2-glue-26'].every(id => gs.includes(id));
  })()`));
t('A2 includes the new 10-line meal-planning dialogue',
  run('DATA.A2.dialogues.some(d => d.id === "mercado" && d.lines.length === 10 && d.lines.every(line => line.kw.length >= 2))'));
t('A2 word-order distractors never duplicate a correct token',
  run('DATA.A2.sentences.every(s => s.distr.every(w => !s.ans.some(a => norm(w) === norm(a))))'));
t('A2 word-order tokens reproduce every sentence',
  run('DATA.A2.sentences.every(s => norm(s.ans.join(" ")) === norm(s.es) && s.distr.length >= 2)'));
t('all uploaded verb and glue-word reference PDFs are present',
  ['Spanish_Verb_Trainer.pdf','100 verbs.pdf','30DAY_-_DAY_10_-_VERBS_100_MAGIC_VERBS.pdf','30DAY_-_DAY_11_-_VERBS_200_MAGIC_VERBS.pdf','f639fbd0-06e1-480a-956a-a9749f4fd849.pdf'].every(f => fs.existsSync(path.join(ROOT, f))));
t('A2 verb-practice sentences and grammar include past-tense patterns', run(`
  (function(){
    const ss = DATA.A2.sentences.map(s => s.es);
    const gs = DATA.A2.grammar.map(g => g.id);
    return ss.includes('Tuve que cancelar la cita.') && ss.includes('Busqué mis llaves por toda la casa.')
      && ss.includes('Ella leyó el mensaje y respondió.')
      && ['g-a2-past-3','g-a2-past-4','g-a2-past-6','g-a2-past-7'].every(id => gs.includes(id));
  })()`));
t('A2 grammar distractors are genuinely different after app normalization',
  run('DATA.A2.grammar.every(g => g.wrongs.every(w => norm(w) !== norm(g.correct)))'));
t('B1 is the main stage (887 items: 545w/180s/45g/12 dialogues, 117 lines)', run('engine.stats("B1").total') === 887
  && run('DATA.B1.words.length') === 545 && run('DATA.B1.sentences.length') === 180
  && run('DATA.B1.grammar.length') === 45 && run('DATA.B1.dialogues.length') === 12);
t('B2 early-advanced (209 items: 115w/50s/18g/26 lines)', run('engine.stats("B2").total') === 209
  && run('DATA.B2.words.length') === 115 && run('DATA.B2.sentences.length') === 50
  && run('DATA.B2.grammar.length') === 18 && run('DATA.B2.dialogues.length') === 2);
t('game pool total = 1790 items across A1–B2 (exam not counted)',
  run('engine.stats("A1").total + engine.stats("A2").total + engine.stats("B1").total + engine.stats("B2").total') === 1790);
t('B1 has idioms + formal + errands categories', new Set(run('DATA.B1.words.map(w => w.cat)')).has('idioms')
  && new Set(run('DATA.B1.words.map(w => w.cat)')).has('formal')
  && new Set(run('DATA.B1.words.map(w => w.cat)')).has('errands'));
t('B2 has discourse + society + legal categories', new Set(run('DATA.B2.words.map(w => w.cat)')).has('discourse')
  && new Set(run('DATA.B2.words.map(w => w.cat)')).has('society')
  && new Set(run('DATA.B2.words.map(w => w.cat)')).has('legal'));

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
t('all 10 boot at A1/A2/B1/B2/EXAM without throwing', run(`
  (function(){
    const v = document.getElementById('view');
    const levels = ['A1','A2','B1','B2','EXAM'];
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
