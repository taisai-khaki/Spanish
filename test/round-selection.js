'use strict';
/* Regression test: starting the same round twice should not always serve the
   first items in source order. Run: node test/round-selection.js */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function fakeEl() {
  const selectors = new Map();
  return {
    innerHTML: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } },
    querySelector(selector) {
      if (!selectors.has(selector)) selectors.set(selector, fakeEl());
      return selectors.get(selector);
    },
    querySelectorAll() { return []; },
  };
}

// Make the shuffles deterministic but different: zero forces swaps; a value
// near one leaves the next round in its original order.
let randomValue = 0;
const testMath = Object.create(Math);
testMath.random = () => randomValue;
const words = Array.from({ length: 12 }, (_, i) => ({ es: `palabra-${i}`, en: `word-${i}` }));
const storage = {};
const sandbox = {
  console,
  Math: testMath,
  DATA: { A1: { words, sentences: [], grammar: [], dialogues: [] } },
  localStorage: {
    getItem: key => (key in storage ? storage[key] : null),
    setItem: (key, value) => { storage[key] = String(value); },
  },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const file of ['js/core.js', 'js/engine.js', 'js/round.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}
vm.runInContext("tasks = { 'type-en': () => null };", sandbox);

function firstQuestion(shuffleValue) {
  randomValue = shuffleValue;
  sandbox.testView = fakeEl();
  sandbox.testConfig = {
    level: 'A1', id: 'flashcards', icon: '🃏', title: 'Vocab Smash',
    kind: 'word', size: 1, formatFn: () => 'type-en',
  };
  vm.runInContext('runRound(testView, testConfig)', sandbox);
  const match = sandbox.testView.innerHTML.match(/<h1 class="word-es">([^<]+)<\/h1>/);
  assert(match, 'the round should render a question');
  return match[1];
}

const first = firstQuestion(0);
const second = firstQuestion(0.999999);
assert.notStrictEqual(first, second, 'a new round should draw from a shuffled pool, not repeat the source deck’s first item');
console.log(`✓ consecutive rounds selected different questions (${first} → ${second})`);
