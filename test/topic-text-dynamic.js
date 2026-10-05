'use strict';
/* Topic Text Studio must compose, not recall.
   These checks pin the behaviour the game promises: every generation of the
   same topic is a new text, the topic steers the vocabulary, and every
   marked form is a real level-bank verb in a tense that level teaches.
   Run: node test/topic-text-dynamic.js */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILES = ['js/data.js', 'js/data-bank.js', 'js/data-exam.js', 'js/data-sentences.js',
  'js/data-verbs200.js', 'js/core.js', 'js/topic-engine.js', 'js/games/topic-text.js'];

function el() {
  const node = { _h: '', style: {}, dataset: {}, value: '', hidden: false, disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    focus() {}, blur() {}, select() {}, appendChild() {}, remove() {},
    addEventListener() {}, contains() { return false; }, closest() { return null },
    querySelectorAll() { return []; }, querySelector(sel) { return byId(sel); } };
  Object.defineProperty(node, 'innerHTML', { get: () => node._h, set(v) { node._h = String(v); } });
  return node;
}
/* one shared node per selector, so a handler bound through the view can be
   triggered through document.getElementById in the test */
const registry = new Map();
function byId(sel) {
  if (!registry.has(sel)) registry.set(sel, el());
  return registry.get(sel);
}
const doc = { body: el(), hidden: false,
  getElementById: id => byId('#' + id), querySelector: sel => byId(sel),
  querySelectorAll: () => [], createElement: () => el(), addEventListener() {} };

const storage = {};
const sandbox = {
  console, Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp, Error, Promise,
  Set, Map, Symbol, isNaN, parseInt, parseFloat, setTimeout: () => 0, clearTimeout() {},
  setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0,
  innerWidth: 900, innerHeight: 700, location: { hash: '#/' }, scrollTo() {}, addEventListener() {},
  localStorage: { getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); } },
  document: doc,
  fx: { sfx() {}, shake() {}, confetti() {} }, player: { award() {} },
  speak: () => {}, say: () => {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const file of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}
const run = code => vm.runInContext(code, sandbox, { filename: 'inline' });

let pass = 0;
/* each check runs inside the app's own context and answers with `true`
   or with a short message that explains what went wrong */
function test(name, result) {
  assert(result === true, name + (result === false ? '' : ' → ' + result));
  pass++;
  console.log('✓', name);
}

const MARK = '{{verb}}';
const COUNT = { short: 4, long: 8, conversation: 8 };

/* ------------------------------------------------------------------ */
console.log('== the text is composed, not remembered ==');

test('the same topic + level + mode never repeats itself', run(`(() => {
  const seen = new Set(), firsts = new Set();
  for (let i = 0; i < 20; i++) {
    const p = topicTextGenerator.generate('la comida en Oaxaca', 'short', 'A1');
    seen.add(p.plainText); firsts.add(p.lines[0].plain);
  }
  return seen.size >= 18 || 'only ' + seen.size + ' of 20 texts were different';
})()`));

test('20 texts use most of the level bank instead of one fixed verb list', run(`(() => {
  const verbs = new Set(), answers = new Set();
  for (let i = 0; i < 20; i++) {
    topicTextGenerator.generate('la comida en Oaxaca', 'long', 'A2').lines.forEach(l => {
      verbs.add(l.verb); answers.add(l.answer);
    });
  }
  const bank = topicTextGenerator.availableVerbs('A2');
  return verbs.size >= 10 && answers.size >= 15
    || 'verbs=' + verbs.size + '/' + bank.length + ' answers=' + answers.size;
})()`));

test('the topic changes the sentences, not just one noun', run(`(() => {
  const food = topicTextGenerator.generate('la comida en Oaxaca', 'long', 'B1');
  const trip = topicTextGenerator.generate('viajar por México', 'long', 'B1');
  const overlap = food.lines.filter(a => trip.lines.some(b => b.plain === a.plain)).length;
  return overlap <= 2 || 'shared ' + overlap + ' identical sentences';
})()`));

test('the chosen field vocabulary actually shows up', run(`(() => {
  const p = topicTextGenerator.generate('la comida en Oaxaca', 'long', 'A1');
  const words = ['taco', 'mol', 'café', 'pan', 'sopa', 'frut', 'comida', 'cocin', 'postre', 'agua',
    'ingredient', 'salsa', 'fonda', 'aguacate', 'mercado'];
  return words.some(w => p.plainText.includes(w)) || 'no food vocabulary: ' + p.plainText;
})()`));

test('every generated text still names the topic', run(`(() => {
  const levels = ['A1', 'A2', 'B1', 'B2', 'EXAM'];
  const modes = ['short', 'long', 'conversation'];
  const topics = ['la comida en Oaxaca', 'viajar por México', 'redes sociales', 'el medio ambiente'];
  let bad = 0;
  levels.forEach(lv => modes.forEach(mode => topics.forEach(t => {
    const p = topicTextGenerator.generate(t, mode, lv);
    if (!p.plainText.includes(t)) bad++;
  })));
  return bad === 0 || bad + ' texts did not mention their topic';
})()`));

/* ------------------------------------------------------------------ */
console.log('== every line is a usable verb challenge ==');

test('line counts, marker and answer stay consistent in every mode', run(`(() => {
  const counts = ${JSON.stringify(COUNT)};
  for (const lv of ['A1', 'A2', 'B1', 'B2', 'EXAM']) {
    for (const mode of Object.keys(counts)) {
      const p = topicTextGenerator.generate('mi trabajo', mode, lv);
      if (p.lines.length !== counts[mode]) return 'lines ' + p.lines.length + ' for ' + mode;
      if (p.plainText.split('\\n').length && mode !== 'conversation' && /\\{\\{/.test(p.plainText)) return 'marker leaked';
      for (const line of p.lines) {
        if (line.text.split('${MARK}').length !== 2) return 'marker count';
        if (!line.plain.includes(line.answer)) return 'answer missing from plain text';
        if (!/^[^{}]*${MARK}[^{}]*$/.test(line.text)) return 'stray braces in ' + line.text;
      }
    }
  }
  return true;
})()`));

test('only verbs from the selected level bank are marked', run(`(() => {
  return ['A1', 'A2', 'B1', 'B2', 'EXAM'].every(lv => {
    const allowed = new Set(topicTextGenerator.availableVerbs(lv));
    if (!allowed.size) return 'empty bank for ' + lv;
    return ['short', 'long', 'conversation'].every(mode =>
      topicTextGenerator.generate('un tema de prueba', mode, lv).lines
        .every(line => allowed.has(line.verb)));
  });
})()`));

test('the marked form matches the deck for that verb, tense and person', run(`(() => {
  const PROBE = { presente: [0, 1, 2, 3, 4], pretérito: [0, 1, 2, 3, 4] };
  const IDX = { yo: 0, tu: 1, el: 2, ella: 2, nosotros: 3, ellos: 4, usted: 2 };
  let checked = 0;
  for (const lv of ['A1', 'A2', 'B1', 'B2', 'EXAM']) {
    for (let i = 0; i < 12; i++) {
      const p = topicTextGenerator.generate('la música en México', i % 3 === 2 ? 'long' : 'short', lv);
      for (const line of p.lines) {
        if (!PROBE[line.tense]) continue;
        const deck = window.VERB_DECK_CONJUGATE(line.verb);
        if (!deck) continue;
        const list = line.tense === 'presente' ? deck.presentP : deck.preteriteP;
        const want = (list[IDX[line.person]] || '').split(/\\s+/).pop();
        const got = line.answer.split(/\\s+/).pop();
        if (want && got !== want) return lv + ' ' + line.verb + ' ' + line.tense + '/' + line.person + ': deck says ' + want + ', text says ' + got;
        checked++;
      }
    }
  }
  return checked > 40 || 'only ' + checked + ' forms were comparable with the deck';
})()`));

test('a reflexive verb never gets its clitic twice', run(`(() => {
  const re = /\\b(me|te|se|nos|os)\\s+\\1\\b/;
  let hit = '';
  ['A1', 'A2', 'B1', 'B2', 'EXAM'].forEach(lv => {
    for (let i = 0; i < 8 && !hit; i++) {
      topicTextGenerator.generate('la rutina diaria', 'long', lv).lines.forEach(line => {
        if (re.test(line.plain)) hit = line.plain;
      });
    }
  });
  return !hit || 'doubled clitic: ' + hit;
})()`));

test('"de el" and "a el" fuse across a slot boundary', run(`(() => {
  let hit = '';
  ['A1', 'A2', 'B1', 'B2', 'EXAM'].forEach(lv => {
    for (let i = 0; i < 8 && !hit; i++) {
      topicTextGenerator.generate('el medio ambiente', 'long', lv).lines.forEach(line => {
        if (/(^|[\\s(,;:])(de|a)\\s+el\\s+[a-záéíóúñü]/.test(line.plain)) hit = line.plain;
      });
    }
  });
  return !hit || 'uncontracted: ' + hit;
})()`));

test('tenses respect the level ceiling', run(`(() => {
  const E = window.TopicTextEngine;
  /* ser + participle is a B2 construction, not a tense the level picks */
  const allowed = lv => new Set(E.LEVELS[lv].tenses.concat(E.LEVELS[lv].order >= 3 ? ['pasiva'] : []));
  for (const lv of ['A1', 'A2', 'B1', 'B2', 'EXAM']) {
    const set = allowed(lv);
    for (let i = 0; i < 10; i++) {
      const p = E.build({ level: lv, topic: 'la historia de México', mode: 'long', seed: i * 31 });
      for (const line of p.lines) {
        if (!set.has(line.tense)) return lv + ' used ' + line.tense;
      }
    }
  }
  return true;
})()`));

test('A1 never sees a pluperfect and B2 does', run(`(() => {
  const has = lv => {
    for (let i = 0; i < 24; i++) {
      const p = window.TopicTextEngine.build({ level: lv, topic: 'mi familia', mode: 'long', seed: i * 7717 });
      if (p.meta.tensesUsed.indexOf('pluscuamperfecto') >= 0) return true;
    }
    return false;
  };
  return !has('A1') && !has('A2') || 'too advanced for ' + (has('A1') ? 'A1' : 'A2');
})()`));

test('every line carries a gloss and a hint for the practice screen', run(`(() => {
  const p = topicTextGenerator.generate('deportes en la escuela', 'long', 'B1');
  return p.lines.every(l => l.gloss && l.gloss.length > 8 && l.tenseLabel && l.hint !== undefined)
    || 'missing gloss/labels';
})()`));

test('conversation keeps two speakers and narrative does not', run(`(() => {
  const talk = topicTextGenerator.generate('mi ciudad', 'conversation', 'A2');
  const prose = topicTextGenerator.generate('mi ciudad', 'short', 'A2');
  const who = new Set(talk.lines.map(l => l.speaker));
  return who.size === 2 && talk.plainText.split('\\n').length === 8 && prose.lines.every(l => !l.speaker)
    || 'speakers=' + JSON.stringify(Array.from(who));
})()`));

/* ------------------------------------------------------------------ */
console.log('== input hygiene and the game flow ==');

test('an empty topic is refused and control characters are cleaned', run(`(() => {
  let refused = false;
  try { topicTextGenerator.generate('   ', 'short', 'A1'); } catch (e) { refused = /topic/i.test(e.message); }
  const p = topicTextGenerator.generate('  México\\n y {historia}  ', 'short', 'EXAM');
  return refused && p.topic === 'México y historia' && !/[{}]/.test(p.plainText);
})()`));

test('a long topic is clipped instead of breaking the sentence', run(`(() => {
  const p = topicTextGenerator.generate('x'.repeat(200), 'short', 'A1');
  return p.topic.length <= 80 && p.lines.every(l => l.plain.length < 220);
})()`));

test('the game screen: setup → generate → practise → correct answer', run(`(() => {
  const game = GAMES.find(g => g.id === 'topic-text');
  const view = document.createElement('div');
  game.start(view, 'A2');
  if (!/topicForm/.test(view.innerHTML)) return 'setup screen missing';
  const input = document.getElementById('topicInput');
  input.value = 'la comida en Oaxaca';
  document.getElementById('topicForm').onsubmit({ preventDefault() {} });
  const result = view.innerHTML;
  if (!/topic-verb/.test(result)) return 'no highlighted verb after generating';
  const answers = (result.match(/<mark class="topic-verb"[^>]*>([^<]+)</g) || [])
    .map(m => m.replace(/^.*>/, '').replace(/<$/, ''));
  if (answers.length !== 4) return 'expected 4 marked verbs, got ' + answers.length;
  document.getElementById('topicPractice').onclick();
  if (!/topicAnswerForm/.test(view.innerHTML)) return 'practice screen missing';
  document.getElementById('topicAnswer').value = answers[0];
  document.getElementById('topicAnswerForm').onsubmit({ preventDefault() {} });
  const feedback = document.getElementById('topicPracticeFeedback').innerHTML;
  if (!/¡Correcto!/.test(feedback)) return 'the right answer was not accepted: ' + feedback.slice(0, 80);
  document.getElementById('topicNextVerb').onclick();
  if (!/topicAnswerForm/.test(view.innerHTML) && !/endcard/.test(view.innerHTML)) return 'no next step';
  return true;
})()`));

test('"New version" replaces the passage with a different text', run(`(() => {
  const game = GAMES.find(g => g.id === 'topic-text');
  const view = document.createElement('div');
  game.start(view, 'A1');
  document.getElementById('topicInput').value = 'viajar en autobús';
  document.getElementById('topicForm').onsubmit({ preventDefault() {} });
  const before = view.innerHTML;
  document.getElementById('topicAgain').onclick();
  return view.innerHTML !== before || 'the same text came back';
})()`));

console.log('\n' + pass + ' passed, 0 failed');
