'use strict';
/* ============ A2 verb-variation practice ============
   The old auto-generated dump was untagged and contained invalid forms. Build a
   clean, traceable bank instead: every A2 verb has one sentence for each of the
   11 magic frames and 6 Latin-American person forms (66 sentences per verb).
   A sentence is complete after one correct Word Order answer. Future levels
   can add a `verbs` array to DATA[level] and use the same builder. ============ */
(function () {
  const PERSONS = [
    { id: 'yo', subject: 'Yo', englishSubject: 'I', reflexive: 'me', thirdSingular: false },
    { id: 'tu', subject: 'Tú', englishSubject: 'You (tú)', reflexive: 'te', thirdSingular: false },
    { id: 'el', subject: 'Él', englishSubject: 'He', reflexive: 'se', thirdSingular: true },
    { id: 'nosotros', subject: 'Nosotros', englishSubject: 'We', reflexive: 'nos', thirdSingular: false },
    { id: 'ellos', subject: 'Ellos', englishSubject: 'They', reflexive: 'se', thirdSingular: false },
    { id: 'ustedes', subject: 'Ustedes', englishSubject: 'You all (ustedes)', reflexive: 'se', thirdSingular: false },
  ];

  const FRAMES = [
    {
      id: 'necesitar', pattern: 'necesitar + infinitivo',
      forms: { yo: 'necesito', tu: 'necesitas', el: 'necesita', nosotros: 'necesitamos', ellos: 'necesitan', ustedes: 'necesitan' },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'needs' : 'need'} to ${v}`,
    },
    {
      id: 'tener-que', pattern: 'tener que + infinitivo',
      forms: { yo: 'tengo que', tu: 'tienes que', el: 'tiene que', nosotros: 'tenemos que', ellos: 'tienen que', ustedes: 'tienen que' },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'has' : 'have'} to ${v}`,
    },
    {
      id: 'querer', pattern: 'querer + infinitivo',
      forms: { yo: 'quiero', tu: 'quieres', el: 'quiere', nosotros: 'queremos', ellos: 'quieren', ustedes: 'quieren' },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'wants' : 'want'} to ${v}`,
    },
    {
      id: 'ir-a', pattern: 'ir a + infinitivo',
      forms: { yo: 'voy a', tu: 'vas a', el: 'va a', nosotros: 'vamos a', ellos: 'van a', ustedes: 'van a' },
      english: (p, v) => `${p.englishSubject} ${p.id === 'yo' ? 'am' : (p.id === 'el' ? 'is' : 'are')} going to ${v}`,
    },
    {
      id: 'poder', pattern: 'poder + infinitivo',
      forms: { yo: 'puedo', tu: 'puedes', el: 'puede', nosotros: 'podemos', ellos: 'pueden', ustedes: 'pueden' },
      english: (p, v) => `${p.englishSubject} can ${v}`,
    },
    {
      id: 'acabar-de', pattern: 'acabar de + infinitivo',
      forms: { yo: 'acabo de', tu: 'acabas de', el: 'acaba de', nosotros: 'acabamos de', ellos: 'acaban de', ustedes: 'acaban de' },
      english: (p, v) => `Subject: ${p.englishSubject}. Use “acabar de + infinitivo” to express a recent action with: ${v}.`,
    },
    {
      id: 'podria', pattern: 'podría + infinitivo',
      forms: { yo: 'podría', tu: 'podrías', el: 'podría', nosotros: 'podríamos', ellos: 'podrían', ustedes: 'podrían' },
      english: (p, v) => `${p.englishSubject} could ${v}`,
    },
    {
      id: 'deberia', pattern: 'debería + infinitivo',
      forms: { yo: 'debería', tu: 'deberías', el: 'debería', nosotros: 'deberíamos', ellos: 'deberían', ustedes: 'deberían' },
      english: (p, v) => `${p.englishSubject} should ${v}`,
    },
    {
      id: 'soler', pattern: 'soler + infinitivo',
      forms: { yo: 'suelo', tu: 'sueles', el: 'suele', nosotros: 'solemos', ellos: 'suelen', ustedes: 'suelen' },
      english: (p, v) => `${p.englishSubject} usually ${v}`,
    },
    {
      id: 'gustar', pattern: 'me gusta + infinitivo',
      forms: { yo: 'Me gusta', tu: 'Te gusta', el: 'A él le gusta', nosotros: 'Nos gusta', ellos: 'A ellos les gusta', ustedes: 'A ustedes les gusta' },
      english: (p, v) => `${p.englishSubject} ${p.thirdSingular ? 'likes' : 'like'} to ${v}`,
      useSubject: false,
    },
    {
      id: 'gustaria', pattern: 'me gustaría + infinitivo',
      forms: { yo: 'Me gustaría', tu: 'Te gustaría', el: 'A él le gustaría', nosotros: 'Nos gustaría', ellos: 'A ellos les gustaría', ustedes: 'A ustedes les gustaría' },
      english: (p, v) => `${p.englishSubject} would like to ${v}`,
      useSubject: false,
    },
  ];

  const DISTRACTORS = [
    'mañana', 'aunque', 'nunca', 'porque', 'también', 'tampoco', 'aquí', 'muy',
    'entre', 'sin', 'después', 'casi', 'siempre', 'por', 'rápidamente', 'ayer',
  ];

  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'´`\/-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function slug(s) {
    return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function tokenize(s) {
    return s.match(/[\p{L}\p{M}\p{N}]+(?:[.,!?])?/gu) || [];
  }

  function englishGloss(translation) {
    return String(translation || '').split('/')[0]
      .replace(/\([^)]*\)/g, '').trim().replace(/^to\s+/i, '');
  }

  function infinitiveFor(verb, person) {
    const lemma = String(verb.es).trim();
    return lemma.endsWith('se') ? lemma.slice(0, -2) + person.reflexive : lemma;
  }

  function distractorsFor(id, answer) {
    const used = new Set(answer.map(normalize));
    const offset = Array.from(id).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % DISTRACTORS.length;
    const out = [];
    for (let i = 0; i < DISTRACTORS.length && out.length < 4; i++) {
      const word = DISTRACTORS[(offset + i) % DISTRACTORS.length];
      const key = normalize(word);
      if (!used.has(key)) { used.add(key); out.push(word); }
    }
    return out;
  }

  function buildVerbSentenceBank(level, verbs, frames = FRAMES) {
    const items = [];
    const uniqueVerbs = Array.from(new Map((verbs || []).map(v => [v.es, v])).values());
    uniqueVerbs.forEach(verb => {
      const gloss = englishGloss(verb.en);
      frames.forEach(frame => PERSONS.forEach(person => {
        const id = `${level}-verb-${slug(verb.es)}-${frame.id}-${person.id}`;
        const prefix = frame.useSubject === false
          ? frame.forms[person.id]
          : `${person.subject} ${frame.forms[person.id]}`;
        const es = `${prefix} ${infinitiveFor(verb, person)}.`;
        const ans = tokenize(es);
        items.push({
          id,
          es,
          en: frame.english(person, gloss),
          ans,
          distr: distractorsFor(id, ans),
          explain: `Use the ${frame.pattern} frame; the second verb stays in the infinitive.`,
          verbId: verb.es,
          frameId: frame.id,
          frameLabel: frame.pattern,
          personId: person.id,
          mastery: 'correct-once',
        });
      }));
    });
    return items;
  }

  DATA.levels.forEach(level => {
    const levelData = DATA[level];
    if (!levelData) return;
    levelData.verbSentences = buildVerbSentenceBank(level, levelData.verbs || []);
    levelData.verbFrames = FRAMES.map(frame => ({ id: frame.id, label: frame.pattern }));
  });

  // Lets future B1/B2 additions use the same schema and mastery behavior.
  window.buildVerbSentenceBank = buildVerbSentenceBank;
})();
