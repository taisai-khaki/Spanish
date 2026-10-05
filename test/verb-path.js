'use strict';
/* Verb Path regression test. Run: node test/verb-path.js
   Checks the four-step model built from the 200-verb deck (root, presente,
   pretérito, word order), the "show what stays / type what changes" rule for
   regular, irregular, reflexive and impersonal verbs, the accent-tolerant
   answer checking, and the save/resume rule: a mistake keeps every step
   already passed and resumes at the step that failed. */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const storage = {};
const sandbox = {
  console,
  localStorage: {
    getItem: key => (key in storage ? storage[key] : null),
    setItem: (key, value) => { storage[key] = String(value); },
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const file of ['js/data.js', 'js/data-exam.js', 'js/data-sentences.js', 'js/data-verbs200.js',
  'js/data-verbpath.js', 'js/core.js', 'js/engine.js', 'js/games/verbpath.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

function run(code) { return vm.runInContext(code, sandbox); }
function test(name, condition) {
  assert(condition, name);
  console.log('✓', name);
}
const j = code => JSON.parse(run(`JSON.stringify(${code})`));

/* ---------------- the model ---------------- */
const model = j(`{
  meta: DATA.A2.verbPathMeta,
  verbs: DATA.A2.verbPath.length,
  stepIds: Array.from(new Set(DATA.A2.verbPath.map(v => v.steps.map(s => s.id).join(',')))),
  fourSteps: DATA.A2.verbPath.every(v => v.steps.length === 4
    && v.steps.map(s => s.n).join(',') === '1,2,3,4'
    && v.steps.map(s => s.id).join(',') === 'root,presente,preterito,order'),
  rootAnswers: DATA.A2.verbPath.every(v => v.steps[0].answer === v.es),
  reflexiveAccepts: DATA.A2.verbPath.filter(v => v.reflexive)
    .every(v => v.steps[0].accept.length === 2 && v.steps[0].accept[1] === v.es.slice(0, -2)),
  splitsAssemble: DATA.A2.verbPath.every(v => v.steps.slice(1, 3)
    .every(s => s.shown + s.answer === s.full && s.answer.length > 0)),
  everyVerbHasSplits: DATA.A2.verbPath.every(v => v.steps[1].full && v.steps[2].full),
  orderCounts: Array.from(new Set(DATA.A2.verbPath.map(v => v.steps[3].items.length))),
  orderItemsComplete: DATA.A2.verbPath.every(v => v.steps[3].items.every(it => it.es && it.en && it.ans.length && it.distr.length >= 3)),
  orderPerson: Array.from(new Set(DATA.A2.verbPath.map(v => Array.from(new Set(v.steps[3].items.map(i => i.personId))).length))),
  verbsMatchDeck: (function () {
    const deckVerbs = Array.from(new Set(DATA.A2.verbCards.filter(c => c.verbEs).map(c => c.verbEs))).sort();
    const pathVerbs = DATA.A2.verbPath.map(v => v.es).sort();
    return deckVerbs.length === pathVerbs.length && deckVerbs.every((v, i) => v === pathVerbs[i]);
  })(),
  noCombosLeft: DATA.A2.verbPath.every(v => v.steps.every(s => s.combos === undefined)),
  regularsShowTheStem: DATA.A2.verbPath.filter(v => !v.irregular && !v.defective).every(function (v) {
    const inf = v.es.replace(/se$/, '');
    const stem = inf.slice(0, -2);
    return v.steps[1].shown === (v.reflexive ? v.steps[1].clitic : '') + stem
      && v.steps[1].answer === (inf.slice(-2) === 'ar' ? 'o' : 'o');
  })
}`);

test('the path covers all 190 handout verbs from the deck', model.verbs === 190 && model.meta.verbs === 190 && model.verbsMatchDeck);
test('every verb has the same four steps in order', model.fourSteps && model.stepIds.length === 1 && model.noCombosLeft);
test('step 1 (root) asks for the infinitive, and reflexives also accept the bare verb',
  model.rootAnswers && model.reflexiveAccepts);
test('presente + pretérito always show a piece and the typed piece finishes the form',
  model.splitsAssemble && model.everyVerbHasSplits);
test('regular verbs show the stem only — hablar → [habl] + "o"', model.regularsShowTheStem);
test('step 4 is the word-order bank for that verb (66 sentences, distractors included)',
  model.orderCounts.length === 1 && model.orderCounts[0] === 66 && model.orderItemsComplete && model.orderPerson[0] === 6);
test('85 irregular / 105 regular, no build problems', model.meta.irregular === 85 && model.meta.regular === 105
  && model.meta.problems.length === 0);

/* ---------------- what the player sees and types ---------------- */
const splits = j(`{
  regular: ['hablar','comer','vivir','trabajar'].map(function (es) {
    const v = VERB_PATH.byEs[es];
    return es + ' presente [' + v.steps[1].shown + '] + (' + v.steps[1].answer + ') = ' + v.steps[1].full;
  }),
  irregular: ['tener','poder','estar','pedir','hacer','venir','conocer'].map(function (es) {
    const v = VERB_PATH.byEs[es];
    return es + ' presente [' + v.steps[1].shown + '] + (' + v.steps[1].answer + ') = ' + v.steps[1].full;
  }),
  whole: ['ir','ser','oír','vivir'].map(function (es) {
    const v = VERB_PATH.byEs[es];
    return es + ' pretérito [' + v.steps[2].shown + '] + (' + v.steps[2].answer + ') = ' + v.steps[2].full;
  }),
  reflexive: ['sentirse','irse','reírse','vestirse'].map(function (es) {
    const v = VERB_PATH.byEs[es];
    return es + ' presente [' + v.steps[1].shown + '] + (' + v.steps[1].answer + ') = ' + v.steps[1].full;
  }),
  impersonal: ['llover','nevar'].map(function (es) {
    const v = VERB_PATH.byEs[es];
    return es + ' presente [' + v.steps[1].shown + '] + (' + v.steps[1].answer + ') = ' + v.steps[1].full
      + ' / pretérito [' + v.steps[2].shown + '] + (' + v.steps[2].answer + ') = ' + v.steps[2].full;
  }),
  accents: VERB_PATH.byEs.continuar.steps[1].shown + '|' + VERB_PATH.byEs.continuar.steps[1].answer
}`, null);

test('a regular verb shows the stem and the player types the ending',
  splits.regular.join(' ; ') === 'hablar presente [habl] + (o) = hablo ; comer presente [com] + (o) = como ; vivir presente [viv] + (o) = vivo ; trabajar presente [trabaj] + (o) = trabajo');
test('an irregular verb keeps only the piece of the stem that survives',
  splits.irregular.join(' ; ') === 'tener presente [ten] + (go) = tengo ; poder presente [p] + (uedo) = puedo ; estar presente [est] + (oy) = estoy ; pedir presente [p] + (ido) = pido ; hacer presente [ha] + (go) = hago ; venir presente [ven] + (go) = vengo ; conocer presente [cono] + (zco) = conozco');
test('when something is left the player always types it (vivir → [viv] + "í")',
  splits.whole[3] === 'vivir pretérito [viv] + (í) = viví');
test('when nothing survives the box is empty and the form is typed whole (ir → voy / fui, ser → fui)',
  splits.whole[0] === 'ir pretérito [] + (fui) = fui' && splits.whole[1] === 'ser pretérito [] + (fui) = fui'
  && run(`VERB_PATH.byEs.ir.steps[1].shown === '' && VERB_PATH.byEs.ir.steps[1].answer === 'voy'`));
test('reflexives keep the pronoun with the person', splits.reflexive.join(' ; ')
  === 'sentirse presente [me s] + (iento) = me siento ; irse presente [me ] + (voy) = me voy ; reírse presente [me r] + (ío) = me río ; vestirse presente [me v] + (isto) = me visto');
test('impersonal verbs use the 3rd person (llover → [ll] + "ueve", nevar → [n] + "ieva")',
  splits.impersonal.join(' ; ') === 'llover presente [ll] + (ueve) = llueve / pretérito [llov] + (ió) = llovió ; nevar presente [n] + (ieva) = nieva / pretérito [nev] + (ó) = nevó');
test('accented verbs keep the accent in the shown piece (continúo)', splits.accents === 'continú|o');

/* ---------------- answer checking ---------------- */
const check = (es, stepIndex, typed) =>
  run(`(function () {
    const v = VERB_PATH.byEs[${JSON.stringify(es)}];
    return verbPathAnswerOk(v.steps[${stepIndex}], ${JSON.stringify(typed)});
  })()`);
test('typed answers forgive accents, case and punctuation',
  check('hablar', 0, 'HABLAR') && check('hablar', 1, 'o') && check('comer', 2, 'i')
  && check('continuar', 1, 'o') && check('comer', 0, 'comer.'));
test('typing the whole form on a split step also counts', check('comer', 1, 'como') && check('vivir', 2, 'viví'));
test('wrong or empty answers are rejected', !check('comer', 1, 'es') && !check('comer', 1, '')
  && !check('comer', 0, 'comer comida') && !check('tener', 1, 'tenemos'));

/* ---------------- progress: a miss never restarts the verb ---------------- */
const progress = j(`(function () {
  const v = VERB_PATH.byEs.comer;
  const out = [];
  const snap = label => out.push(label + ': step=' + verbPathProgress.get('comer').step
    + ' learned=' + verbPathProgress.get('comer').learned
    + ' correct=' + verbPathProgress.get('comer').correct
    + ' wrong=' + verbPathProgress.get('comer').wrong);
  snap('fresh');
  verbPathProgress.record(v, true, 0);  snap('root passed');
  verbPathProgress.record(v, true, 1);  snap('presente passed');
  verbPathProgress.record(v, false, 2); snap('pretérito missed');
  verbPathProgress.record(v, false, 2); snap('pretérito missed again');
  verbPathProgress.record(v, true, 2);  snap('pretérito passed (resumed there)');
  verbPathProgress.record(v, false, 3); snap('word order missed');
  verbPathProgress.record(v, true, 3);  snap('word order passed');
  verbPathProgress.record(v, false, 3); snap('a miss on a learned verb');
  return out;
})()`, null);

test('a fresh verb starts at the root step', progress[0] === 'fresh: step=0 learned=false correct=0 wrong=0');
test('each passed step is saved and moves the verb forward',
  progress[1] === 'root passed: step=1 learned=false correct=1 wrong=0'
  && progress[2] === 'presente passed: step=2 learned=false correct=2 wrong=0');
test('a mistake freezes the verb at the failed step — nothing already passed is lost',
  progress[3] === 'pretérito missed: step=2 learned=false correct=2 wrong=1'
  && progress[4] === 'pretérito missed again: step=2 learned=false correct=2 wrong=2'
  && progress[5] === 'pretérito passed (resumed there): step=3 learned=false correct=3 wrong=2');
test('a miss on the last step keeps the verb there, unlearned',
  progress[6] === 'word order missed: step=3 learned=false correct=3 wrong=3');
test('passing the word-order step learns the verb',
  progress[7] === 'word order passed: step=4 learned=true correct=4 wrong=3');
test('a miss after learning never un-learns the verb',
  progress[8] === 'a miss on a learned verb: step=4 learned=true correct=4 wrong=4');

const resume = j(`(function () {
  verbPathProgress.reset();
  const v = VERB_PATH.byEs.comer;
  verbPathProgress.record(v, true, 0);
  verbPathProgress.record(v, false, 1);       // miss on the presente step
  const saved = verbPathProgress.get('comer');
  return {
    step: saved.step,
    stepId: v.steps[saved.step].id,
    learned: saved.learned,
    keys: Object.keys(verbPathProgress.all()).length,
    stats: verbPathProgress.stats(),
    storageKey: verbPathProgress.key(),
    raw: JSON.parse(localStorage.getItem('spanlab.' + verbPathProgress.key()) || '{}'),
  };
})()`, null);

test('the verb resumes at the step that failed (root passed, presente missed → presente again)',
  resume.step === 1 && resume.stepId === 'presente' && resume.learned === false);
test('progress is written to localStorage under spanlab.verbPath.A2 and survives a reload',
  resume.storageKey === 'verbPath.A2' && resume.raw.comer
  && resume.raw.comer.step === 1 && resume.raw.comer.wrong === 1 && resume.keys === 1);
const reloaded = run(`store.get('verbPath.A2', {})['comer'].step`);
test('a fresh engine reads the saved step back', reloaded === 1);
test('stats split learned / in progress / new', resume.stats.total === 190
  && resume.stats.learned === 0 && resume.stats.started === 1 && resume.stats.fresh === 189);

/* simulate a whole session on one verb through the public API only */
const full = j(`(function () {
  verbPathProgress.reset();
  const v = VERB_PATH.byEs.ir;
  const order = [0, 1, 2, 3];
  order.forEach(i => verbPathProgress.record(v, true, i));
  const p = verbPathProgress.get('ir');
  return { step: p.step, learned: p.learned, correct: p.correct, wrong: p.wrong, remaining: DATA.A2.verbPath.filter(x => !verbPathProgress.get(x.es).learned).length };
})()`, null);
test('a full clean run: 3 typed steps + 1 sentence = learned', full.step === 4 && full.learned
  && full.correct === 4 && full.wrong === 0 && full.remaining === 189);

console.log('\nVerb Path: all checks passed ✅');
