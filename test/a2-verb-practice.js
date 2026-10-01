'use strict';
/* A2 tagged verb-variation regression test. Run: node test/a2-verb-practice.js */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_VERBS = require('./fixtures/a2-source-verb-lemmas.json');
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

for (const file of ['js/data.js', 'js/data-exam.js', 'js/data-sentences.js', 'js/core.js', 'js/engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

function run(code) { return vm.runInContext(code, sandbox); }
function test(name, condition) {
  assert(condition, name);
  console.log('✓', name);
}

const inventory = JSON.parse(run(`JSON.stringify({
  verbCount: DATA.A2.verbs.length,
  uniqueVerbs: new Set(DATA.A2.verbs.map(v => v.es)).size,
  sentenceCount: DATA.A2.verbSentences.length,
  uniqueSentenceIds: new Set(DATA.A2.verbSentences.map(s => s.id)).size,
  uniqueLinkedVerbs: new Set(DATA.A2.verbSentences.map(s => s.verbId)).size,
  frames: new Set(DATA.A2.verbSentences.map(s => s.frameId)).size,
  persons: new Set(DATA.A2.verbSentences.map(s => s.personId)).size,
  framesPerVerb: DATA.A2.verbs.every(v => {
    const examples = DATA.A2.verbSentences.filter(s => s.verbId === v.es);
    return examples.length === 66 && new Set(examples.map(s => s.frameId)).size === 11
      && new Set(examples.map(s => s.personId)).size === 6
      && new Set(examples.map(s => s.frameId + '/' + s.personId)).size === 66;
  }),
  shapeCorrect: DATA.A2.verbSentences.every(s => norm(s.ans.join(' ')) === norm(s.es) && s.ans.every(a => !/[¿?¡!.,]/.test(a))),
  safeDistractors: DATA.A2.verbSentences.every(s => s.distr.length === 8 && s.distr.every(d => !s.ans.some(a => norm(a) === norm(d)))),
  clearPrompts: DATA.A2.verbSentences.every(s => /^[A-Z“]/.test(s.en))
    && DATA.A2.verbSentences.find(s => s.frameId === 'necesitar' && s.personId === 'tu').en !== DATA.A2.verbSentences.find(s => s.frameId === 'necesitar' && s.personId === 'ustedes').en,
  curatedSentences: DATA.A2.sentences.length,
  curatedDistractorsOk: DATA.A2.sentences.every(s => s.distr.length >= 8 && s.ans.every(a => !/[¿?¡!.,]/.test(a)) && s.distr.every(d => !s.ans.some(a => norm(a) === norm(d)))),
  glueWords: DATA.A2.words.filter(w => ['possessives','demonstratives','location','time','adverbs','quantity','comparisons','prepositions','conjunctions','pronouns','question words'].includes(w.cat)).length,
  glueExamples: ['¿De quién es esta mochila? Es mía.','Mi hermana es tan alta como mi madre.','Necesito un poco de agua antes de salir.','No me gusta el café y tampoco quiero té.']
    .every(es => DATA.A2.sentences.some(s => s.es === es)),
  examSentences: DATA.EXAM.sentences.length
})`));
test('all 190 unique handout verbs are in A2', inventory.verbCount === 190 && inventory.uniqueVerbs === 190
  && SOURCE_VERBS.length === 190 && SOURCE_VERBS.every(es => run(`DATA.A2.verbs.some(v => v.es === ${JSON.stringify(es)})`)));
test('12,540 unique generated examples link to all 190 verbs', inventory.sentenceCount === 12540
  && inventory.uniqueSentenceIds === 12540 && inventory.uniqueLinkedVerbs === 190 && inventory.frames === 11 && inventory.framesPerVerb);
test('generated answer tokens reconstruct each Spanish sentence without duplicate distractors', inventory.shapeCorrect && inventory.safeDistractors);
test('English prompts are capitalized and distinguish tú from ustedes', inventory.clearPrompts);
test('curated A2 sentences and all glue-word practice remain; generated sentences do not leak into EXAM', inventory.curatedSentences >= 92 && inventory.curatedDistractorsOk && inventory.glueWords === 214 && inventory.glueExamples && inventory.examSentences === 16);

test('the same generator can build a tagged future-level set', run(`
  (function(){
    const items = buildVerbSentenceBank('B1', [{ es: 'hablar', en: 'to speak' }]);
    return items.length === 66 && items.every(s => s.id.startsWith('B1-verb-hablar-') && s.verbId === 'hablar');
  })()`));

test('magic frame conjugation and reflexive placement are correct', run(`
  (function(){
    const find = (verb, frame, person) => DATA.A2.verbSentences.find(s => s.verbId === verb && s.frameId === frame && s.personId === person).es;
    return find('pagar','tener-que','yo') === 'Yo tengo que pagar.'
      && find('contestar','querer','el') === 'Él quiere contestar.'
      && find('pagar','gustar','ustedes') === 'A ustedes les gusta pagar.'
      && find('bañarse','necesitar','yo') === 'Yo necesito bañarme.';
  })()`));

test('one correct answer completes a generated sentence, a wrong answer does not', run(`
  (function(){
    const done = DATA.A2.verbSentences[0], miss = DATA.A2.verbSentences[1];
    const a = engine.result('A2','verbSentence',done.id,true,'word-order');
    const b = engine.result('A2','verbSentence',miss.id,false,'word-order');
    return a.justMastered && a.target === 1 && a.streak === 1
      && !b.mastered && engine.unmastered('A2','verbSentence').some(p => p.id === miss.id)
      && !engine.unmastered('A2','verbSentence').some(p => p.id === done.id);
  })()`));

test('a verb shows learned only after all 66 of its linked sentences are correct', run(`
  (function(){
    const first = DATA.A2.verbSentences[0];
    const group = DATA.A2.verbSentences.filter(s => s.verbId === first.verbId);
    group.slice(1).forEach(s => engine.result('A2','verbSentence',s.id,true,'word-order'));
    const p = engine.verbProgress('A2').find(x => x.verb.es === first.verbId);
    return p.total === 66 && p.done === 66 && p.learned;
  })()`));

console.log('A2 verb practice checks passed.');
