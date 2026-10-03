'use strict';
/* ============ 🧭 The Verb Path: 5 steps from meaning to a real sentence ============
   Built on the 200-verb handout deck (js/data-verbs200.js) plus the A2
   word-order bank (js/data-sentences.js). Every one of the 190 handout verbs
   gets the same five-step route:

     1 · Root        English → Spanish:  "to eat"            → comer
     2 · Presente    the part that stays is shown; the rest → [com] + "o"   (como)
     3 · Pretérito   the same drill in the simple past      → [com] + "í"   (comí)
     4 · Combos      type the 11 magic-verb combinations    → "Necesito comer"
     5 · Word order  build a real sentence from shuffled words

   Rules for the split steps (2 and 3):
     · whatever does not change in that person of that tense is shown,
       whatever changes has to be typed;
     · a regular verb therefore shows only the stem:  [habl]___  → "o"
     · an irregular verb keeps only the piece of the stem that survives in
       the present tense:  tener → [t]___ (tengo) · poder → [p]___ (puedo)
       estar → [est]___ (estoy) · pedir → [p]___ (pido)
     · when nothing survives the form is hidden and the player types it whole:
       ir  → ___ (voy) ·  ser → ___ (soy) ·  ir (pasado) → ___ (fui)
     · a reflexive verb keeps its pronoun with the person:  [me sent]___ → "o"
     · llover / nevar are impersonal, so the path uses the 3rd person:
       [ll]___ → "ueve"
   ============ */
(function () {
  const LEVEL = 'A2';

  /* English for the 11 magic frames — the deck builds these from the verb
     gloss; weather verbs (llover / nevar) read naturally here */
  const WEATHER_EN = {
    necesitar: b => 'It needs to ' + b,
    'tener-que': b => 'It has to ' + b,
    querer: b => 'It wants to ' + b,
    'ir-a': b => 'It is going to ' + b,
    poder: b => 'It can ' + b,
    'acabar-de': (b, past) => 'It has just ' + past,
    podria: b => 'It could ' + b,
    deberia: b => 'It should ' + b,
    soler: (b, past, third) => 'It usually ' + third,
    gustar: (b, past, third) => 'I like it when it ' + third,
    gustaria: b => 'I would like it to ' + b,
  };

  const STEPS = [
    { id: 'root', n: 1, label: 'Root', icon: '🌱', blurb: 'English → Spanish infinitive' },
    { id: 'presente', n: 2, label: 'Presente', icon: '🕐', blurb: 'present tense — type the part that changes' },
    { id: 'preterito', n: 3, label: 'Pretérito', icon: '⏪', blurb: 'simple past — type the part that changes' },
    { id: 'combos', n: 4, label: 'Magic combos', icon: '✨', blurb: 'the 11 magic-verb combinations (first person)' },
    { id: 'order', n: 5, label: 'Word order', icon: '🧩', blurb: 'build the full sentence from shuffled words' },
  ];
  const STEP_COUNT = STEPS.length;

  /* ---------------- tiny helpers (this file loads before core.js) ---------------- */
  function nkey(s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"'´`\-\/]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function stripAccents(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function englishBase(en) {
    return String(en || '')
      .replace(/\(.*?\)/g, ' ')
      .replace(/^to\s+/i, '')
      .split('/')[0]
      .replace(/\s+/g, ' ').trim();
  }
  function bareInfinitive(es) { return /se$/.test(es) ? es.slice(0, -2) : es; }
  function endingOf(es) {
    const inf = bareInfinitive(es);
    const raw = inf.slice(-2);
    return raw === 'ír' ? 'ir' : raw;
  }
  /* English for the magic frames of weather verbs; the other 188 verbs reuse
     the deck's own frame English (VERB_DECK_FRAMES) with a clean gloss */
  function magicEnglish(frameId, gloss, defective) {
    if (defective) {
      const fn = WEATHER_EN[frameId];
      return fn ? fn(gloss, gloss + 'ed', gloss + 's') : null;
    }
    const frames = (typeof window !== 'undefined' && window.VERB_DECK_FRAMES) || [];
    const frame = frames.filter(f => f.id === frameId)[0];
    return frame ? frame.en(gloss) : null;
  }

  /* ---------------- the split: what stays, what the player types ----------------
     Returns { shown, answer, full, clitic, refl }.
     `shown` is a slice of the real form so accents stay where they belong
     (continuar → shown "continú" + answer "o" = continúo). */
  function splitForm(infinitive, form) {
    const full = String(form);
    const refl = /se$/.test(infinitive);
    const bare = bareInfinitive(infinitive);
    const m = refl ? full.match(/^(me|te|se|nos)\s+/i) : null;
    const clitic = m ? m[0] : '';
    const tail = full.slice(clitic.length);
    const A = stripAccents(bare).toLowerCase();
    const B = stripAccents(tail).toLowerCase();
    let k = 0;
    while (k < A.length && k < B.length && A.charAt(k) === B.charAt(k)) k++;
    /* always leave something to type: vivir → [viv] + "í", not [viví] + "" */
    if (k >= tail.length) k = Math.max(0, tail.length - 1);
    return {
      shown: full.slice(0, clitic.length + k),
      answer: full.slice(clitic.length + k),
      full,
      clitic,
      refl,
    };
  }

  /* ---------------- build the model from the deck + the sentence bank ---------------- */
  function buildVerbPath(level) {
    level = level || LEVEL;
    const data = (typeof DATA !== 'undefined' && DATA[level]) || {};
    const cards = (data.verbCards || []).filter(c => c.direction === 'es-en');
    const sentences = data.verbSentences || [];

    const byVerb = new Map();
    cards.forEach(c => {
      if (!c.verbEs) return;
      if (!byVerb.has(c.verbEs)) byVerb.set(c.verbEs, { inf: null, forms: {}, magic: [] });
      const g = byVerb.get(c.verbEs);
      if (c.group === 'magic') g.magic.push(c);
      else if (c.tense) {
        if (!g.forms[c.tense]) g.forms[c.tense] = {};
        g.forms[c.tense][c.person] = c;
      } else g.inf = c;
    });

    const orderByVerb = new Map();
    sentences.forEach(s => {
      if (!orderByVerb.has(s.verbId)) orderByVerb.set(s.verbId, []);
      orderByVerb.get(s.verbId).push(s);
    });

    const verbs = [];
    const problems = [];

    byVerb.forEach((g, es) => {
      const inf = g.inf;
      if (!inf) { problems.push(es + ': no infinitive card'); return; }

      /* the deck covers the 5 yo/él forms of irregulars and yo of regulars;
         for llover/nevar (impersonal) the path drills the 3rd person */
      const defective = !!inf.defective;
      const person = defective ? 'el' : 'yo';
      const personLabel = defective ? 'impersonal · 3rd person (it)' : 'Yo (I)';
      const personEn = defective ? 'it' : 'I';
      const gloss = englishBase(inf.en);
      const refl = /se$/.test(es);

      const tenseStep = (id, n) => {
        const card = (g.forms[id] || {})[person];
        if (!card) { problems.push(es + ': no ' + id + '.' + person + ' card'); return null; }
        const split = splitForm(es, card.es);
        const english = defective ? 'it ' + gloss + 's' : 'I ' + gloss;
        return {
          id, n, kind: 'split', tense: id, person,
          label: id === 'presente' ? 'Presente' : 'Pretérito',
          icon: id === 'presente' ? '🕐' : '⏪',
          promptEn: english + ' · ' + (id === 'presente' ? 'presente' : 'simple past'),
          personEn, personLabel, tenseLabel: id === 'presente' ? 'Presente (present)' : 'Pretérito (simple past)',
          full: split.full, shown: split.shown, answer: split.answer, clitic: split.clitic,
          irregular: !!inf.irregular, reflexive: refl,
          hint: split.answer ? ('the part to type starts with "' + split.answer.charAt(0) + '"') : 'type the whole form',
        };
      };

      const combos = g.magic.map(c => ({
        frameId: c.frameId,
        label: (c.badge || '').replace(/^Magic frame · /, '').replace(/ · #\d+.*$/, ''),
        es: c.es,
        en: magicEnglish(c.frameId, gloss, defective) || c.en,
        hint: String(c.es).replace(/\s+\S+$/, ' …'),
      }));

      const steps = [
        {
          id: 'root', n: 1, kind: 'root', label: 'Root', icon: '🌱',
          promptEn: inf.en,
          answer: es,
          accept: refl ? [es, bareInfinitive(es)] : [es],
          irregular: !!inf.irregular, reflexive: refl, defective,
          hint: 'starts with "' + es.charAt(0) + '" · ' + es.replace(/\s/g, '').length + ' letters',
          explain: es + ' = ' + inf.en,
        },
        tenseStep('presente', 2),
        tenseStep('preterito', 3),
        {
          id: 'combos', n: 4, kind: 'combos', label: 'Magic combos', icon: '✨',
          combos,
          total: combos.length,
          irregular: !!inf.irregular, reflexive: refl, defective,
        },
        {
          id: 'order', n: 5, kind: 'order', label: 'Word order', icon: '🧩',
          items: (orderByVerb.get(es) || []).slice(),
          irregular: !!inf.irregular, reflexive: refl, defective,
        },
      ];

      verbs.push({
        es, en: inf.en, gloss, irregular: !!inf.irregular, defective, reflexive: refl,
        ending: endingOf(es), badge: inf.badge || '', handoutNo: inf.handoutNo || null,
        orderCount: (orderByVerb.get(es) || []).length,
        steps,
      });
    });

    /* keep the handout order (row 1 → row 200) */
    verbs.sort((a, b) => (a.handoutNo || 0) - (b.handoutNo || 0));

    return {
      level,
      steps: STEPS,
      verbs,
      meta: {
        level,
        verbs: verbs.length,
        irregular: verbs.filter(v => v.irregular).length,
        regular: verbs.filter(v => !v.irregular).length,
        wordOrderItems: verbs.reduce((n, v) => n + v.orderCount, 0),
        stepCount: STEP_COUNT,
        problems,
      },
      byEs: verbs.reduce((m, v) => { m[v.es] = v; return m; }, {}),
    };
  }

  /* ---------------- progress helpers shared by the game (no DOM here) ---------------- */
  /* the answer a split step is building: shown + what the player typed */
  function assembled(step, typed) { return step.shown + String(typed == null ? '' : typed).trim(); }

  /* is a typed answer right? (accents, case and punctuation are forgiven;
     typing the whole form on a split step also counts) */
  function answerOk(step, typed, combo) {
    const t = nkey(typed);
    if (!t) return false;
    if (step.kind === 'split') {
      return nkey(assembled(step, typed)) === nkey(step.full) || t === nkey(step.full);
    }
    if (step.kind === 'root') return (step.accept || [step.answer]).some(a => nkey(a) === t);
    if (step.kind === 'combos') return !!combo && nkey(combo.es) === t;
    return nkey(step.answer) === t;
  }

  window.VERB_PATH_STEPS = STEPS;
  window.VERB_PATH_LEVEL = LEVEL;
  window.verbPathSplit = splitForm;
  window.verbPathAnswerOk = answerOk;
  window.verbPathAssembled = assembled;
  window.buildVerbPath = buildVerbPath;
  window.verbPathEnglishBase = englishBase;

  if (typeof DATA !== 'undefined' && DATA[LEVEL] && DATA[LEVEL].verbCards) {
    const model = buildVerbPath(LEVEL);
    DATA[LEVEL].verbPath = model.verbs;
    DATA[LEVEL].verbPathMeta = model.meta;
    window.VERB_PATH = model;
  }
})();
