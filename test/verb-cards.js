'use strict';
/* 200-verb deck regression test. Run: node test/verb-cards.js
   Checks the deck size the author specified, the conjugation engine against
   the handout answer key (test/fixtures/trainer-pret-100.json), the magic-frame
   sentences (including reflexives), and the glue-word cards. */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TRAINER = require('./fixtures/trainer-pret-100.json');
const EXPECTED_IRREGULAR = ('llegar,pedir,ser,estar,poder,comenzar,creer,traer,cerrar,venir,continuar,contar,' +
  'hacer,almorzar,encontrar,conseguir,dar,ir,tener,oír,abrazar,saber,conocer,salir,buscar,perder,pagar,' +
  'practicar,poner,leer,recordar,decir,ver,dormir,empezar,sacar,pensar,tocar,entender,querer,agregar,haber,' +
  'elegir,comunicarse,costar,chocar,cruzar,entregar,morir,conducir,explicar,caerse,sentirse,sentir,volar,' +
  'seguir,freír,vestirse,guiar,divertirse,incluir,reírse,irse,verse,encontrarse,mover,ofrecer,organizar,' +
  'recoger,jugar,preferir,llover,reconocer,recomendar,repetir,devolver,volver,servir,mostrar,sentarse,' +
  'sonreír,nevar,probar,apagar,despertarse').split(',');
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

for (const file of ['js/data.js', 'js/data-verbs200.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

function run(code) { return vm.runInContext(code, sandbox); }
function test(name, condition) {
  assert(condition, name);
  console.log('✓', name);
}

const inventory = JSON.parse(run(`JSON.stringify({
  meta: (function () { const b = buildVerbCardBank(); return b.meta; })(),
  cards: DATA.A2.verbCards.length,
  uniqueIds: new Set(DATA.A2.verbCards.map(c => c.id)).size,
  groups: DATA.A2.verbCards.reduce((acc, c) => { acc[c.group] = (acc[c.group] || 0) + 1; return acc; }, {}),
  directions: DATA.A2.verbCards.reduce((acc, c) => { acc[c.direction] = (acc[c.direction] || 0) + 1; return acc; }, {}),
  fourOptions: DATA.A2.verbCards.every(c => c.options.length === 4),
  answerAmongOptions: DATA.A2.verbCards.every(c => c.options.some(o => o === c.answer)),
  completeCards: DATA.A2.verbCards.every(c => c.id && c.badge && c.prompt && c.answer && c.es && c.en && c.options.length === 4),
  rows200: VERB_DECK_ROWS.length,
  uniqueLemmas: new Set(VERB_DECK_ROWS.map(r => r.es)).size,
  rows1to200: VERB_DECK_ROWS.map(r => r.n).join(',') === Array.from({ length: 200 }, (_, i) => i + 1).join(','),
  glue: DATA.A2.words.filter(w => ['pronouns','possessives','question words','demonstratives','location','time','adverbs','quantity','comparisons','prepositions','conjunctions'].includes(w.cat)).length,
  glueCards: DATA.A2.verbCards.filter(c => c.group === 'glue').length
})`));

test('the handout has 200 numbered rows → 190 unique lemmas', inventory.rows200 === 200
  && inventory.uniqueLemmas === 190 && inventory.rows1to200);

test('the deck is 3,538 cards per direction / 7,076 in total', inventory.meta.perDirection === 3538
  && inventory.meta.total === 7076 && inventory.cards === 7076 && inventory.uniqueIds === 7076
  && inventory.directions['es-en'] === 3538 && inventory.directions['en-es'] === 3538);

test('deck composition matches the agreed formula', inventory.groups.magic === 4180
  && inventory.groups.regular === 630 && inventory.groups.irregular === 1838 && inventory.groups.glue === 428
  && inventory.meta.verbs === 190 && inventory.meta.irregular === 85 && inventory.meta.regular === 105
  && inventory.meta.magic === 2090 && inventory.meta.glue === 214);

test('every card is answerable: 4 unique options, the answer among them', inventory.fourOptions
  && inventory.answerAmongOptions && inventory.completeCards);

test('all 214 glue words have their own cards', inventory.glue === 214 && inventory.glueCards === 428);

test('the pretérito of handout rows 1–100 matches the handout answer key', run(`
  (function(){
    const byNum = {};
    VERB_DECK_ROWS.forEach(r => { byNum[r.n] = r.es; });
    const order = ['yo','tu','el','nosotros','ellos'];
    const mistakes = [];
    Object.keys(${JSON.stringify(TRAINER)}).forEach(n => {
      const key = byNum[n];
      const c = VERB_DECK_CONJUGATE(key);
      const expected = ${JSON.stringify(TRAINER)}[n];
      order.forEach((p, i) => {
        if (c.preteriteP[i] !== expected.pret[i]) mistakes.push(key + ' ' + p + ': ' + c.preteriteP[i] + ' ≠ ' + expected.pret[i]);
      });
    });
    return mistakes.length === 0 ? true : mistakes;
  })()`) === true);

test('irregular classification flags exactly the non-regular verbs', run(`
  (function(){
    const expected = ${JSON.stringify(EXPECTED_IRREGULAR)};
    const verbs = [];
    VERB_DECK_ROWS.forEach(r => { if (verbs.indexOf(r.es) < 0) verbs.push(r.es); });
    const flagged = verbs.filter(es => VERB_DECK_CONJUGATE(es).irregular);
    const missing = expected.filter(es => flagged.indexOf(es) < 0);
    const extra = flagged.filter(es => expected.indexOf(es) < 0);
    return missing.length === 0 && extra.length === 0 ? true
      : { missing: missing, extra: extra };
  })()`) === true);

test('each verb gets the right number of cards for its class', run(`
  (function(){
    const counts = {};
    DATA.A2.verbCards.forEach(c => { if (!c.verbEs) return;
      counts[c.verbEs] = counts[c.verbEs] || { total: 0, dir: {} };
      counts[c.verbEs].total++;
      counts[c.verbEs].dir[c.direction] = (counts[c.verbEs].dir[c.direction] || 0) + 1;
    });
    const bad = [];
    Object.keys(counts).forEach(es => {
      const c = VERB_DECK_CONJUGATE(es);
      const perDir = counts[es].dir['es-en'];
      const conjugation = c.defective ? 3 : (c.irregular ? 11 : 3);
      const expected = conjugation + 11; /* + the 11 magic-frame cards */
      if (perDir !== expected) bad.push(es + ': ' + perDir + ' ≠ ' + expected);
    });
    return bad.length === 0 ? true : bad;
  })()`) === true);

test('key conjugations are right (stem changes, irregular yo, strong preterite)', run(`
  (function(){
    const has = (es, tense, person, form) => {
      const c = VERB_DECK_CONJUGATE(es);
      const arr = tense === 'presente' ? c.presentP : c.preteriteP;
      return arr[['yo','tu','el','nosotros','ellos'].indexOf(person)] === form;
    };
    return has('pedir','presente','yo','pido') && has('pedir','preterite','el','pidió')
      && has('dormir','presente','nosotros','dormimos') && has('dormir','preterite','ellos','durmieron')
      && has('cerrar','presente','tu','cierras') && has('pensar','presente','yo','pienso')
      && has('poder','presente','yo','puedo') && has('poder','preterite','yo','pude')
      && has('jugar','presente','el','juega') && has('jugar','preterite','yo','jugué')
      && has('llegar','preterite','yo','llegué') && has('buscar','preterite','yo','busqué')
      && has('pagar','preterite','yo','pagué') && has('cruzar','preterite','yo','crucé')
      && has('empezar','preterite','yo','empecé') && has('apagar','preterite','yo','apagué')
      && has('tener','presente','yo','tengo') && has('tener','preterite','el','tuvo')
      && has('ser','preterite','nosotros','fuimos') && has('ir','preterite','ellos','fueron')
      && has('oír','presente','yo','oigo') && has('oír','preterite','el','oyó')
      && has('leer','preterite','el','leyó') && has('creer','preterite','el','creyó')
      && has('incluir','presente','yo','incluyo') && has('incluir','preterite','el','incluyó')
      && has('continuar','presente','yo','continúo') && has('continuar','preterite','yo','continué')
      && has('guiar','presente','yo','guío') && has('seguir','preterite','él'.length ? 'el' : 'el','siguió')
      && has('servir','preterite','el','sirvió') && has('repetir','preterite','ellos','repitieron')
      && has('morir','preterite','el','murió') && has('conducir','preterite','yo','conduje')
      && has('vestirse','presente','yo','me visto') && has('sentirse','preterite','el','se sintió')
      && has('reírse','presente','el','se ríe') && has('reírse','preterite','ellos','se rieron')
      && has('freír','presente','yo','frío') && has('sonreír','preterite','el','sonrió')
      && has('caerse','presente','yo','me caigo') && has('verse','preterite','nosotros','nos vimos')
      && has('haber','presente','nosotros','hemos') && has('haber','preterite','el','hubo');
  })()`));

test('defective weather verbs only get 3rd-person forms', run(`
  (function(){
    const forms = VERB_DECK_CONJUGATE('llover');
    const cards = DATA.A2.verbCards.filter(c => c.verbEs === 'llover');
    const persons = new Set(cards.filter(c => c.group !== 'magic').map(c => c.person).filter(Boolean));
    return forms.defective
      && cards.every(c => c.group === 'magic' || c.person === 'el' || !c.person)
      && persons.size === 1 && persons.has('el')
      && cards.some(c => c.es === 'llueve') && cards.some(c => c.es === 'llovió')
      && cards.some(c => c.badge.indexOf('impersonal') >= 0);
  })()`));

test('magic frames keep the infinitive and the yo reflexive clitic', run(`
  (function(){
    const find = (verb, frame) => DATA.A2.verbCards.find(c => c.verbEs === verb && c.frameId === frame && c.direction === 'en-es').answer;
    const frame = (verb, frame, es) => DATA.A2.verbCards.some(c => c.verbEs === verb && c.frameId === frame && c.es === es);
    return find('comer','necesitar') === 'Necesito comer'
      && find('comer','tener-que') === 'Tengo que comer'
      && find('comer','ir-a') === 'Voy a comer'
      && find('comer','gustar') === 'Me gusta comer'
      && find('bañarse','necesitar') === 'Necesito bañarme'
      && find('bañarse','gustar') === 'Me gusta bañarme'
      && find('bañarse','acabar-de') === 'Acabo de bañarme'
      && find('irse','ir-a') === 'Voy a irme'
      && frame('llover','ir-a','Va a llover')
      && frame('llover','gustar','Me gusta cuando llueve')
      && frame('nevar','gustaria','Me gustaría que nevara');
  })()`));

test('option sets are language-consistent and never repeat the answer', run(`
  (function(){
    const bad = [];
    DATA.A2.verbCards.forEach(c => {
      const uniq = new Set(c.options.map(o => o.toLowerCase())).size === c.options.length;
      const hasAnswer = c.options.some(o => o === c.answer);
      /* EN→ES cards ask for the Spanish side; ES→EN cards ask for the English side */
      const rightSide = c.direction === 'en-es' ? c.answer === c.es : c.answer === c.en;
      const promptIsOtherSide = c.prompt === (c.direction === 'en-es' ? c.en : c.es);
      if (!uniq || !hasAnswer || !rightSide || !promptIsOtherSide) bad.push(c.id);
    });
    return bad.length === 0 ? true : bad.slice(0, 10);
  })()`) === true);

test('every Spanish form in the deck is a real word (no "pedo" style stems)', run(`
  (function(){
    const bad = [];
    const parts = ['me','te','se','nos'];
    DATA.A2.verbCards.forEach(c => {
      [c.es, c.answer].forEach(t => {
        if (/^(yo|tú|él|nosotros|ellos)\b/i.test(t)) return; // reference rows
        if (/pedo|podo\b|duermo\b.*duermo/.test(t)) bad.push(c.id + ' ' + t);
      });
    });
    const stemCheck = ['pedir','dormir','poder','querer','pensar','cerrar','perder','entender','contar','recordar','mover','volver','servir','seguir','sentir'];
    stemCheck.forEach(es => {
      const c = VERB_DECK_CONJUGATE(es);
      const wrong = { pedir: 'pedo', dormir: 'dormo', poder: 'podo', querer: 'quero', pensar: 'penso',
        cerrar: 'cerro', perder: 'perdo', entender: 'entendo', contar: 'conto', recordar: 'recordo',
        mover: 'movo', volver: 'volvo', servir: 'servo', seguir: 'seguo', sentir: 'sento' }[es];
      if (c.presentP[0].indexOf(wrong) === 0) bad.push(es + ' → ' + c.presentP[0]);
    });
    return bad.length === 0 ? true : bad;
  })()`) === true);

test('the builder is reusable for a future level pack', run(`
  (function(){
    const bank = buildVerbCardBank();
    return bank.cards.length === 7076 && bank.meta.verbs === 190;
  })()`));

console.log('200-verb deck checks passed.');
