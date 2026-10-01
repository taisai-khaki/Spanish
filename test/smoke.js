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
t('EXAM reading = 16 passages x 6 qs (correct in opts)', run('DATA.EXAM.reading.length === 16 && DATA.EXAM.reading.every(p => p.qs.length === 6 && p.qs.every(q => q.opts.length === 4 && q.opts.includes(q.ok)))'));
const examTotal = run('engine.stats("EXAM").total');
const expectedTotal = run('DATA.EXAM.words.length + DATA.EXAM.sentences.length + DATA.EXAM.grammar.length + DATA.EXAM.dialogues[0].lines.length + DATA.EXAM.reading.length');
t('EXAM total items consistent (' + examTotal + ')', examTotal === expectedTotal);
t('A1 warm-up includes complete word-order grammar coverage (84 items: 42w/12s/14g/16 lines)', run('engine.stats("A1").total') === 84
  && run('DATA.A1.words.length') === 42 && run('DATA.A1.sentences.length') === 12
  && run('DATA.A1.grammar.length') === 14 && run('DATA.A1.dialogues[0].lines.length + DATA.A1.dialogues[1].lines.length') === 16);
t('A2 expanded level (13174 items: 439w/92s/12540v/75g/28 lines across 3 dialogues)', run('engine.stats("A2").total') === 13174
  && run('DATA.A2.words.length') === 439 && run('DATA.A2.sentences.length') === 92
  && run('DATA.A2.verbSentences.length') === 12540
  && run('DATA.A2.grammar.length') === 75 && run('DATA.A2.dialogues.length') === 3
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
t('B1 is the main stage (893 items: 545w/180s/51g/12 dialogues, 117 lines)', run('engine.stats("B1").total') === 893
  && run('DATA.B1.words.length') === 545 && run('DATA.B1.sentences.length') === 180
  && run('DATA.B1.grammar.length') === 51 && run('DATA.B1.dialogues.length') === 12);
t('B2 early-advanced (213 items: 115w/50s/22g/26 lines)', run('engine.stats("B2").total') === 213
  && run('DATA.B2.words.length') === 115 && run('DATA.B2.sentences.length') === 50
  && run('DATA.B2.grammar.length') === 22 && run('DATA.B2.dialogues.length') === 2);
t('game pool total = 14364 items across A1–B2 (exam not counted)',
  run('engine.stats("A1").total + engine.stats("A2").total + engine.stats("B1").total + engine.stats("B2").total') === 14364);
t('B1 has idioms + formal + errands categories', new Set(run('DATA.B1.words.map(w => w.cat)')).has('idioms')
  && new Set(run('DATA.B1.words.map(w => w.cat)')).has('formal')
  && new Set(run('DATA.B1.words.map(w => w.cat)')).has('errands'));
t('B2 has discourse + society + legal categories', new Set(run('DATA.B2.words.map(w => w.cat)')).has('discourse')
  && new Set(run('DATA.B2.words.map(w => w.cat)')).has('society')
  && new Set(run('DATA.B2.words.map(w => w.cat)')).has('legal'));

console.log('== mastery engine (regression) ==');
t('5 correct → justMastered on 5th', run(`
  (function(){ const lv='A1', k=engine.key(lv,'word','hola');
    for (let i=0;i<4;i++) engine.result(lv,'word','hola',true,'listen-pick');
    const r = engine.result(lv,'word','hola',true,'pick-es');
    return r.justMastered && engine.get(lv,'word','hola').streak >= 5; })()`));
t('wrong resets streak', run(`
  (function(){ engine.result('A1','word','adiós',true,'listen-pick'); engine.result('A1','word','adiós',true,'pick-es');
    const r = engine.result('A1','word','adiós',false,'listen-pick');
    return engine.get('A1','word','adiós').streak === 0; })()`));
t('mastered item leaves the queue', run(`
  (function(){ return !engine.unmastered('A1','word').some(w => w.es === 'hola'); })()`));
t('Oído Sharp audio formats rotate for word, sentence, and dialogue (never same as last used)', run(`
  (function(){
    for (const kind of ['word', 'sentence', 'dialogue']) {
      const e = { kind, id: 'rot-' + kind, item: {} };
      let last = null;
      for (let i = 0; i < 12; i++) {
        const f = engine.format(e, 'A1', {});
        if (last && f === last) return false;
        if (!FORMATS[kind].includes(f)) return false;
        engine.result('A1', kind, e.id, true, f);
        last = f;
      }
    }
    return true; })()`));
t('reading + grammar formats are from their lists', run(`
  (function(){
    const r = engine.format({ kind: 'reading', id: '1', item: {} }, 'EXAM', {});
    const g = engine.format({ kind: 'grammar', id: 'g1', item: {} }, 'EXAM', {});
    return FORMATS.reading.includes(r) && FORMATS.grammar.includes(g); })()`));

console.log('== games boot at all levels ==');
t('3 games registered: Grammar Judge, Word Order, Level Flashcards', run('GAMES.length === 3 && JSON.stringify(GAMES.map(g => g.id)) === \'["grammar","sentences","flashcards"]\''));
t('all 3 boot at A1/A2/B1/B2/EXAM without throwing', run(`
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
t('Level Flashcards in A1–B2 covers verbs across all tenses/combinations plus all level nouns', run(`
  (function(){
    const g = GAMES.find(x => x.id === 'flashcards');
    return ['A1','A2','B1','B2'].every(lv => {
      const cards = DATA[lv].flashcards || [];
      const hasPresent = cards.some(c => c.cardType === 'verb' && c.subType === 'presente' && c.formsTable);
      const hasPast = cards.some(c => c.cardType === 'verb' && c.subType === 'pasado' && c.formsTable);
      const hasFuture = cards.some(c => c.cardType === 'verb' && c.subType === 'futuro' && c.formsTable);
      const hasCombos = cards.some(c => c.cardType === 'verb' && c.subType === 'combinaciones' && c.formsTable);
      const hasNouns = cards.some(c => c.cardType === 'noun' && c.genderInfo);
      return g.remaining(lv) === cards.length && hasPresent && hasPast && hasFuture && hasCombos && hasNouns;
    }); })()`));
t('Level Flashcards renders a flippable flashcard task with tense/combination details', run(`
  (function(){
    const v = document.getElementById('view');
    const g = GAMES.find(x => x.id === 'flashcards');
    g.start(v, 'A2');
    const h = v.innerHTML + v.querySelector('#task').innerHTML;
    return h.includes('fc-box') && h.includes('Flip card'); })()`));
t('Word Order in A2 has >=8 distractors per item and enables Check after placing 1 word', run(`
  (function(){
    const richBank = DATA.A2.sentences.every(s => s.distr.length >= 8 && s.ans.every(a => !/[¿?¡!.,]/.test(a)))
      && DATA.A2.verbSentences.every(s => s.distr.length === 8 && s.ans.every(a => !/[¿?¡!.,]/.test(a)));
    const mount = fakeEl();
    let submitted = null;
    const sample = DATA.A2.verbSentences[0];
    tasks['word-order'](mount, {
      entry: { kind: 'verbSentence', id: sample.id, item: sample },
      level: 'A2',
      onSubmit: ok => { submitted = ok; },
    });
    const bank = mount.children[1];
    const checkBtn = mount.querySelector('#tcheck');
    bank.children[0].onclick();
    const enabledAfterOne = checkBtn.disabled === false;
    checkBtn.onclick();
    return richBank && enabledAfterOne && submitted === false;
  })()`));

console.log('== player, badges & quests ==');
t('12 badges incl. the 2 exam ones (speak90 removed)', run('BADGES.length') === 12 && run("!BADGES.some(b => b.id === 'speak90') && BADGES.some(b => b.id === 'lectura16') && BADGES.some(b => b.id === 'ciudadano')"));
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
