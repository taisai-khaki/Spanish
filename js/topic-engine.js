'use strict';
/* =====================================================================
   Topic Text Engine — the generative grammar behind ✍️ Topic Text Studio

   Nothing here is a fill-in-the-blank template with the topic pasted into
   one hole. Every text is *composed* at generation time from five
   independent axes, so the same topic twice never gives the same reading:

     1. field     — the topic is analysed and placed in a semantic field
                    (food, travel, civics, tech…) which decides the nouns,
                    places, times, adjectives, reason clauses AND the verbs
                    that collocate with that topic;
     2. role      — sentences are chosen for rhetorical roles (open,
                    context, action, opinion, contrast, plan, close) and the
                    connectors are picked according to the previous role;
     3. verb      — a verb from the selected level's bank, preferring the
                    ones that fit the field, each usable only in patterns its
                    subcategorisation allows (transitive / +infinitive /
                    +preposition / +adjective / que / intransitive …);
     4. person+tense — conjugated live by the engine below, restricted to the
                    tenses that level is supposed to know;
     5. slot      — each template is a slot frame; every slot is filled by a
                    random draw from the field's pool, with gender/number
                    agreement computed, so word order and content vary too.

   The engine also writes an English gloss for each sentence from the same
   slot draws, which is why every lexeme carries { es, en }.
   ===================================================================== */
(function (global) {

  const MARK = '{{verb}}';

  /* ------------------------------------------------------------------ */
  /* deterministic randomness                                            */
  /* ------------------------------------------------------------------ */
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return function next() {                       /* mulberry32 */
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rand, arr) { return arr[Math.floor(rand() * arr.length) % arr.length]; }
  function chance(rand, p) { return rand() < p; }
  function shuffled(rand, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ------------------------------------------------------------------ */
  /* tiny string helpers                                                 */
  /* ------------------------------------------------------------------ */
  const LOWER = s => String(s == null ? '' : s);
  function enVerbFix(str) {
    return String(str)
      .replace(/\b(listen|listens|listened)(?!\s+to)\b/g, m => ({ listen: 'listen to', listens: 'listens to', listened: 'listened to' }[m]))
      .replace(/\b(depend|depends|depended)(?!\s+on)\b/g, m => m + ' on')
      .replace(/\b(consist|consists|consisted)(?!\s+of)\b/g, m => m + ' of')
      .replace(/\b(think|thinks|thought)(?!\s+(about|of|so))\b/g, m => m + ' about')
      .replace(/\b(wait|waits|waited)(?!\s+for)\b/g, m => m + ' for');
  }
  function enClean(s) { return String(s).replace(/\s*\/\s*[^,.;!?)]+/g, '').replace(/\(\s*Ud\.\s*\)/, 'you').trim(); }
  function tidy(s) {
    return LOWER(s)
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([¿¡])\s+/g, '$1')
      .replace(/,{2,}/g, ',')
      .replace(/\.\.+/g, '.')
      .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
      .trim();
  }
  function capitalize(s) {
    const str = LOWER(s);
    const m = /^([¿¡¡«"']+\s*)?(\S)/.exec(str);
    if (!m) return str;
    const at = m[1] ? m[1].length : 0;
    return str.slice(0, at) + str[at].toUpperCase() + str.slice(at + 1);
  }
  /* a preposition and an article that meet across a slot boundary must fuse */
  /* 'de el' and 'a el' must fuse, also across a slot boundary. The boundary is
     taken from the punctuation rather than \b, because accented letters are not
     word characters in a JS regex: 'comería el' would match on its final 'a'. */
  function contract(str) {
    return String(str).replace(/(^|[\s(,;:])(de|a)\s+el\s+([a-záéíóúñüA-ZÁÉÍÓÚÑ])/g,
      (m, pre, w, rest) => pre + (w === 'de' ? 'del' : 'al') + ' ' + rest);
  }

  /* sentence end punctuation, honouring an opening ¿/¡ */
  function punctuate(s) {
    let out = tidy(s);
    if (!out) return out;
    const isQ = /^¿/.test(out) || /\?\s*$/.test(out) || /¿[^?]*$/.test(out);
    const isEx = /^¡/.test(out);
    out = out.replace(/[.!?¡¿]+$/, '');
    if (isQ) return out + '?';
    if (isEx) return out + '!';
    return out + '.';
  }

  /* preposition + article contractions */
  function pp(prep, np) {
    const p = LOWER(prep).replace(/\s+$/, '');
    const n = LOWER(np).replace(/^\s+/, '');
    if (!p || !n) return n || p || '';
    return tidy((p + ' ' + n).replace(/^de el\b/, 'del').replace(/^a el\b/, 'al'));
  }

  /* ------------------------------------------------------------------ */
  /* gender / number aware noun + adjective handling                    */
  /* ------------------------------------------------------------------ */
  const ARTICLE = /^(el|la|los|las|un|una|unos|unas)\s+/i;
  /* Nouns are authored with their article: gender/number are read off it. */
  function noun(es, en) {
    const s = LOWER(es).trim();
    const m = ARTICLE.exec(s);
    const art = m ? m[1].toLowerCase() : '';
    let g = 'm', num = 's';
    if (art === 'la' || art === 'una' || art === 'las' || art === 'unas') g = 'f';
    if (art === 'los' || art === 'las' || art === 'unas' || art === 'unos') num = 'p';
    if (!art) {                                  /* no article: guess by ending */
      const last = s.split(/\s+/).pop() || '';
      if (/(os|as|es|ones|anes|ores|istas)$/.test(last)) {
        num = 'p';
        g = /as$/.test(last) ? 'f' : 'm';
      } else if (/(ción|sión|dad|tud|umbre|dez|mano)$/.test(last) ||
        (/a$/.test(last) && !/(día|dia|sofa|mapa|clima|tema|idioma|foto|galaxia|plata|día)$/i.test(last))) {
        g = 'f';
      }
    }
    let enG = String(en == null ? s : en).trim();
    if (art === 'el' || art === 'la' || art === 'los' || art === 'las') {
      if (!/^(the|a|an|some|my|your|his|her|its|our|their|this|that|these|those)\b/i.test(enG)) {
        enG = (num === 'p' ? 'the ' : (/(\s|^)(food|water|coffee|bread|milk|rice|chicken|meat|money|work|time|lunch|dinner|breakfast|soup|fruit|sugar|salt|heat|light|music|travel|news|weather|air|earth|fire|wind|sky|homework|knowledge|poetry|traffic|transport)\b/i.test(enG) ? 'the ' : 'the ')) + enG;
      }
    } else if (art === 'un' || art === 'una') {
      if (!/^(the|a|an|some|my|your|his|her|our|their)\b/i.test(enG)) enG = 'a ' + enG;
    }
    return { es: s, en: enG, g, num, kind: 'noun' };
  }
  function adj(m, opts) {
    const o = opts || {};
    return Object.assign({ m: LOWER(m), kind: 'adj' }, o);
  }
  /* -o/-a type adjectives inflect; -e / consonant ones only pluralise. */
  function adjForm(a, g, num) {
    if (!a) return '';
    if (a.inv) return a.pl && num === 'p' ? a.pl : a.m;
    if (a.m === 'bueno' || a.m === 'malo' || a.m === 'grande') {
      const st = a.m.slice(0, -1);
      return st + (g === 'f' ? (num === 'p' ? 'as' : 'a') : (num === 'p' ? 'os' : 'o'));
    }
    if (/o$/.test(a.m)) {
      const st = a.m.slice(0, -1);
      return st + (g === 'f' ? (num === 'p' ? 'as' : 'a') : (num === 'p' ? 'os' : 'o'));
    }
    if (num === 's') return a.m;
    if (a.pl) return a.pl;
    const last = a.m.slice(-1);
    if (last === 'z') return a.m.slice(0, -1) + 'ces';
    return a.m + (/[aeiou]$/.test(last) ? 's' : 'es');
  }
  /* adjectives that follow "es/son" need to agree with an NP whose gender we
     may not know (the user's own words) — only invariant ones are safe there. */
  const INVARIANT_ADJS = [
    adj('interesante'), adj('impresionante'), adj('relevante', { pl: 'relevantes' }),
    adj('complejo', { inv: false }), adj('necesario'), adj('urgente', { pl: 'urgentes' }),
    adj('posible'), adj('útil', { pl: 'útiles' }), adj('difícil', { pl: 'difíciles' }),
    adj('peligroso'), adj('divertido'), adj('inquietante'), adj('llamativo'),
  ];
  const SAFE_INVARIANT = INVARIANT_ADJS.filter(a => /e$/.test(a.m));

  /* ------------------------------------------------------------------ */
  /* verb lemmas: split "quejarse de" into head / clitic / tail / prep   */
  /* ------------------------------------------------------------------ */
  const PREPS = ['de', 'a', 'en', 'con', 'por', 'para', 'sobre', 'desde', 'hasta', 'entre', 'sin'];
  const CLITIC = { yo: 'me', tu: 'te', el: 'se', nosotros: 'nos', ellos: 'se' };

  const lemmaCache = new Map();
  function lemma(es) {
    const raw = LOWER(es).trim();
    if (lemmaCache.has(raw)) return lemmaCache.get(raw);
    let rest = raw;
    let prep = '';
    const toks = rest.split(/\s+/);
    if (toks.length > 1 && PREPS.indexOf(toks[toks.length - 1]) >= 0) {
      prep = toks.pop();
      rest = toks.join(' ');
    }
    const refl = /se$/.test(rest);
    const bare = refl ? rest.slice(0, -2) : rest;
    const headToks = bare.split(/\s+/);
    const head = headToks[0] + (refl ? 'se' : '');
    const tail = headToks.slice(1).join(' ');
    const out = {
      display: raw, head, bare, tail: tail ? ' ' + tail : '', prep, refl,
      ending: /[aeiou]r$/.test(bare) ? bare.slice(-2) : bare.slice(-2),
    };
    lemmaCache.set(raw, out);
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* conjugation                                                         */
  /*    presente + pretérito come from the repo's tested engine           */
  /*    (window.VERB_DECK_CONJUGATE, regression-checked against the       */
  /*    handout answer key). Everything else is derived here with rules   */
  /*    that are safe for the verbs in the level banks.                   */
  /* ------------------------------------------------------------------ */
  const HABER = {
    presente: ['he', 'has', 'ha', 'hemos', 'han'],
    imperfecto: ['había', 'habías', 'había', 'habíamos', 'habían'],
    condicional: ['habría', 'habrías', 'habría', 'habríamos', 'habrían'],
  };
  const IMPERFECT_STEM = { ser: 'er', ir: 'ib', ver: 've', oír: 'o', leer: 'le', creer: 'cre', traer: 'tra', caer: 'ca', reír: 're', freír: 'fre', sonreír: 'sonre', roer: 'ro', huir: 'hu' };
  const FUTURE_STEM = {
    decir: 'dir', hacer: 'har', tener: 'tendr', venir: 'vendr', poder: 'podr', querer: 'querr',
    saber: 'sabr', poner: 'pondr', salir: 'saldr', haber: 'habr', valer: 'valdr', caber: 'cabr',
    traer: 'traer', dejar: 'dejar',
  };
  const PARTICIPLE_IRR = {
    ser: 'sido', estar: 'estado', haber: 'habido', hacer: 'hecho', decir: 'dicho', traer: 'traído',
    tener: 'tenido', ver: 'visto', poner: 'puesto', volver: 'vuelto', abrir: 'abierto', cerrar: 'cerrado',
    escribir: 'escrito', leer: 'leído', creer: 'creído', caer: 'caído', oír: 'oído', freír: 'frito',
    romper: 'roto', resolver: 'resuelto', devolver: 'devuelto', cubrir: 'cubierto',
    pedir: 'pedido', dormir: 'dormido', morir: 'muerto', vivir: 'vivido', seguir: 'seguido',
    construir: 'construido', incluir: 'incluido', influir: 'influído', reír: 'reído', sonreír: 'sonreído',
    responder: 'respondido', comprender: 'comprendido', aprender: 'aprendido', vender: 'vendido',
    perder: 'perdido', depender: 'dependido', encontrar: 'encontrado', contar: 'contado',
  };
  function participle(bare) {
    if (PARTICIPLE_IRR[bare]) return PARTICIPLE_IRR[bare];
    const end = bare.slice(-2);
    const stem = bare.slice(0, -2);
    if (end === 'ar') return stem + 'ado';
    if (/e[aeiou]/i.test(stem.slice(-2))) return stem + 'ído';        /* cae- → caído */
    return stem + (end === 'er' || end === 'ir' ? 'ido' : 'ado');
  }
  function regularImperfect(bare) {
    const end = bare.slice(-2);
    let stem = bare.slice(0, -2);
    if (IMPERFECT_STEM[bare]) stem = IMPERFECT_STEM[bare];
    else if (/cae$|crae$/.test(stem)) stem = stem.slice(0, -1);
    else if (end === 'er' || end === 'ir') {
      if (/a[e]$/.test(bare.slice(0, -2))) stem = stem.slice(0, -1);   /* caer → ca */
    }
    const isAr = end === 'ar';
    return [
      stem + (isAr ? 'aba' : 'ía'), stem + (isAr ? 'abas' : 'ías'), stem + (isAr ? 'aba' : 'ía'),
      stem + (isAr ? 'ábamos' : 'íamos'), stem + (isAr ? 'aban' : 'ían'),
    ];
  }
  function futureConditional(bare) {
    /* both tenses are built on the infinitive (with a handful of irregular
       synthetic stems) and are never stem-changing */
    const stem = FUTURE_STEM[bare] || bare;
    return {
      fut: [stem + 'é', stem + 'ás', stem + 'á', stem + 'emos', stem + 'án'],
      cond: [stem + 'ía', stem + 'ías', stem + 'ía', stem + 'íamos', stem + 'ían'],
    };
  }
  /* present subjunctive, used only for verbs listed in SUBJ_SAFE */
  const SUBJ_OVERRIDE = {
    ir: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayan'],
    ser: ['sea', 'seas', 'sea', 'seamos', 'sean'],
    estar: ['esté', 'estés', 'esté', 'estemos', 'estén'],
    haber: ['haya', 'hayas', 'haya', 'hayamos', 'hayan'],
    saber: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepan'],
    dar: ['dé', 'des', 'dé', 'demos', 'den'],
    reír: ['ría', 'rías', 'ría', 'riamos', 'rían'],
    freír: ['fría', 'frías', 'fría', 'friamos', 'frían'],
    sonreír: ['sonría', 'sonrías', 'sonría', 'sonriamos', 'sonrían'],
    irse: ['me vaya', 'te vayas', 'se vaya', 'nos vayamos', 'se vayan'],
  };
  /* -ir verbs whose only irregularity in the present subjunctive is the
     nosotros/vosotros stem (pensemos is plain, pidamos is not) */
  const SUBJ_NOS_STEM = {
    seguir: 'sig', pedir: 'pid', servir: 'sirv', vestir: 'vist', repetir: 'repit',
    conseguir: 'consig', elegir: 'elij', medir: 'mid', corregir: 'corrij', preferir: 'prefir',
    dormir: 'durm', morir: 'mur', sentir: 'sint', advertir: 'advert', competir: 'compit',
    prohibir: 'prohib', reír: 'ri', freír: 'frij', sonreír: 'sonri', reir: 'ri',
  };
  function presentSubjunctive(bare) {
    if (SUBJ_OVERRIDE[bare]) return SUBJ_OVERRIDE[bare];
    const c = deckConjugate(bare);
    if (!c) return null;
    const yo = c.present[0];
    const isAr = bare.slice(-2) === 'ar';
    const base = /o$/.test(yo) ? yo.slice(0, -1) : yo;
    const ends = isAr ? ['e', 'es', 'e', 'emos', 'en'] : ['a', 'as', 'a', 'amos', 'an'];
    const nos = SUBJ_NOS_STEM[bare] || bare.slice(0, -2);
    return [0, 1, 2, 3, 4].map(i => tidy((i === 3 ? nos : base) + ends[i]));
  }
  function deckConjugate(head) {
    const fn = global.VERB_DECK_CONJUGATE;
    if (typeof fn !== 'function') return fallbackParadigms(head);
    try {
      const c = fn(head);
      return c && c.present && c.preterite ? c : fallbackParadigms(head);
    } catch { return fallbackParadigms(head); }
  }
  /* plain ending swap only — a crash guard, not a second grammar */
  function fallbackParadigms(head) {
    const refl = /se$/.test(head);
    const bare = refl ? head.slice(0, -2) : head;
    const end = bare.slice(-2);
    const stem = bare.slice(0, -2);
    const isAr = end === 'ar';
    return {
      present: [stem + (isAr ? 'o' : 'o'), stem + (isAr ? 'as' : 'es'), stem + (isAr ? 'a' : 'e'),
        stem + (isAr ? 'amos' : (end === 'er' ? 'emos' : 'imos')), stem + (isAr ? 'an' : 'en')],
      preterite: [stem + (isAr ? 'é' : 'í'), stem + (isAr ? 'aste' : 'iste'), stem + (isAr ? 'ó' : 'ió'),
        stem + (isAr ? 'amos' : 'imos'), stem + (isAr ? 'aron' : 'ieron')],
      irregular: false, defective: false,
    };
  }

  const formsCache = new Map();
  /* All the forms one line may need for one verb, for the 5 persons:
     [yo, tu, el, nosotros, ellos] — reflexive clitics and verbal particles
     ("de menos") and the trailing preposition ("quejarse de") included. */
  function verbForms(es) {
    const key = LOWER(es).trim();
    if (formsCache.has(key)) return formsCache.get(key);
    const L = lemma(key);
    const c = deckConjugate(L.head);
    const bare = L.bare;
    const tail = L.tail;
    const pre = '';        /* the pattern adds the preposition, with contractions */
    const CLITIC_RE = /(^|\s)(me|te|se|nos|os)(\s|$)/;
    const clitic = idx => (L.refl ? CLITIC[['yo', 'tu', 'el', 'nosotros', 'ellos'][idx]] + ' ' : '');
    const withClitic = (f, i) => (L.refl && CLITIC_RE.test(f) ? '' : clitic(i));
    const attach = list => list.map((f, i) => tidy(withClitic(f, i) + f + tail + pre));

    const present = c ? attach(c.presentP) : null;
    const preterite = c ? attach(c.preteriteP) : null;
    const imperfect = attach(regularImperfect(bare).map(f => f));
    const fc = futureConditional(bare);
    const future = attach(fc.fut);
    const conditional = attach(fc.cond);
    const part = participle(bare);
    const perfect = [0, 1, 2, 3, 4].map(i => tidy(clitic(i) + HABER.presente[i] + ' ' + part + tail + pre));
    const pluperfect = [0, 1, 2, 3, 4].map(i => tidy(clitic(i) + HABER.imperfecto[i] + ' ' + part + tail + pre));
    const condPerfect = [0, 1, 2, 3, 4].map(i => tidy(clitic(i) + HABER.condicional[i] + ' ' + part + tail + pre));
    /* periphrastic future: voy a + infinitive (the clitic attaches to the infinitive) */
    const go = deckConjugate('ir');
    const irA = [0, 1, 2, 3, 4].map(i => tidy((go ? go.present[i] : ['voy', 'vas', 'va', 'vamos', 'van'][i]) + ' a ' + (L.refl ? bare + CLITIC[['yo', 'tu', 'el', 'nosotros', 'ellos'][i]] : bare) + tail + pre));
    const subj = SUBJ_SAFE.has(bare) ? attachPresent(presentSubjunctive(bare), L, tail, pre) : null;
    const out = {
      display: key, bare, head: L.head, refl: L.refl, prep: L.prep, tail,
      present, preterite, imperfect, future, conditional, perfect, pluperfect,
      condPerfect, irA, subjunctive: subj,
      infinitive: (L.refl ? bare + 'se' : bare) + tail,
      bareInf: bare + tail,
      prep: L.prep,
      participle: part,
      irregular: !!(c && c.irregular),
      defective: !!(c && c.defective),
      ok: !!(present && preterite) && /^[a-záéíóúñüü]+(se)?$/.test(L.head),
    };
    formsCache.set(key, out);
    return out;
  }
  function attachPresent(list, L, tail, pre) {
    if (!list) return null;
    const names = ['yo', 'tu', 'el', 'nosotros', 'ellos'];
    const re = /(^|\s)(me|te|se|nos|os)(\s|$)/;
    return list.map((f, i) => tidy((L.refl && !re.test(f) ? CLITIC[names[i]] + ' ' : '') + f + tail + pre));
  }

  /* verbs the engine is willing to put in a subjunctive slot (checked by test) */
  const SUBJ_SAFE = new Set(['ser', 'estar', 'ir', 'tener', 'hacer', 'decir', 'poder', 'querer',
    'saber', 'venir', 'poner', 'salir', 'traer', 'dar', 'ver', 'oír', 'creer', 'leer', 'caer',
    'seguir', 'pedir', 'dormir', 'pensar', 'perder', 'entender', 'volver', 'encontrar', 'recordar',
    'cerrar', 'abrir', 'escribir', 'estudiar', 'practicar', 'preparar', 'participar', 'respetar',
    'aprender', 'ayudar', 'demostrar', 'comprender', 'considerar', 'reconocer', 'admitir', 'dudar',
    'imaginar', 'demostrar', 'evaluar', 'cuestionar', 'reflexionar', 'determinar', 'establecer',
    'implementar', 'promover', 'preservar', 'recuperar', 'facilitar', 'impedir', 'superar',
    'argumentar', 'comprometer', 'abandonar', 'perseverar', 'conocer', 'entender', 'sentir', 'seguir']);

  /* ------------------------------------------------------------------ */
  /* persons                                                             */
  /* ------------------------------------------------------------------ */
  const PERSONS = {
    yo: { id: 'yo', idx: 0, es: 'yo', en: 'I', enSubj: 'I', verb: 's', enS: false },
    tu: { id: 'tu', idx: 1, es: 'tú', en: 'you', enSubj: 'you', verb: 's', enS: false },
    el: { id: 'el', idx: 2, es: 'él', en: 'he', enSubj: 'he', verb: 's', enS: true },
    ella: { id: 'ella', idx: 2, es: 'ella', en: 'she', enSubj: 'she', verb: 's', enS: true },
    nosotros: { id: 'nosotros', idx: 3, es: 'nosotros', en: 'we', enSubj: 'we', verb: 'p', enS: false },
    ellos: { id: 'ellos', idx: 4, es: 'ellos', en: 'they', enSubj: 'they', verb: 'p', enS: false },
    usted: { id: 'usted', idx: 2, es: 'usted', en: 'you (Ud.)', enSubj: 'you', verb: 's', enS: false },
  };
  const TENSE_LABEL = {
    presente: 'Presente', pretérito: 'Pretérito', imperfecto: 'Imperfecto', futuro: 'Futuro',
    condicional: 'Condicional', perfecto: 'Pret. perfecto', pluscuamperfecto: 'Pluscuamperfecto',
    'cond-perfecto': 'Condicional compuesto', 'ir-a': 'Futuro perifrástico', subjuntivo: 'Subjuntivo',
  };
  const TENSE_HINT = {
    presente: 'present', pretérito: 'simple past (completed)', imperfecto: 'past habit / background',
    futuro: 'future', condicional: 'would …', perfecto: 'have …-ed', pluscuamperfecto: 'had …-ed',
    'cond-perfecto': 'would have …-ed', 'ir-a': 'going to … (plan)', subjuntivo: 'subjunctive (doubt / wish / necessity)',
  };

  /* ------------------------------------------------------------------ */
  /* English glosses: same slots, English morphology                     */
  /* ------------------------------------------------------------------ */
  const EN_PAST = {
    be: ['was', 'was', 'were'], have: 'had', do: 'did', say: 'said', go: 'went', get: 'got',
    make: 'made', know: 'knew', think: 'thought', see: 'saw', take: 'took', come: 'came',
    give: 'gave', find: 'found', tell: 'told', become: 'became', leave: 'left', feel: 'felt',
    keep: 'kept', mean: 'meant', begin: 'began', lose: 'lost', pay: 'paid', meet: 'met',
    put: 'put', run: 'ran', sit: 'sat', stand: 'stood', hear: 'heard', hold: 'held', win: 'won',
    send: 'sent', build: 'built', buy: 'bought', bring: 'brought', choose: 'chose', drive: 'drove',
    drink: 'drank', eat: 'ate', ride: 'rode', sing: 'sang', sleep: 'slept', speak: 'spoke',
    swim: 'swam', teach: 'taught', write: 'wrote', read: 'read', understand: 'understood',
    wear: 'wore', draw: 'drew', fly: 'flew', grow: 'grew', throw: 'threw', break: 'broke',
    forbid: 'forbade', forgive: 'forgave', forget: 'forgot', freeze: 'froze', steal: 'stole',
    rise: 'rose', fall: 'fell', bite: 'bit', hide: 'hid', stick: 'stuck', strike: 'struck',
    catch: 'caught', cut: 'cut', hit: 'hit', hurt: 'hurt', let: 'let', shut: 'shut', split: 'split',
    set: 'set', sleep2: 'slept', smell: 'smelt', spend: 'spent', think2: 'thought',
  };
  const EN_PP = {
    be: 'been', do: 'done', go: 'gone', get: 'gotten', make: 'made', know: 'known', think: 'thought',
    see: 'seen', take: 'taken', come: 'come', give: 'given', find: 'found', tell: 'told', say: 'said',
    become: 'become', leave: 'left', feel: 'felt', keep: 'kept', mean: 'meant', begin: 'begun',
    lose: 'lost', pay: 'paid', meet: 'met', run: 'run', sit: 'sat', stand: 'stood', hear: 'heard',
    hold: 'held', win: 'won', send: 'sent', build: 'built', buy: 'bought', bring: 'brought',
    choose: 'chosen', drive: 'driven', drink: 'drunk', eat: 'eaten', ride: 'ridden', sing: 'sung',
    sleep: 'slept', speak: 'spoken', swim: 'swum', teach: 'taught', write: 'written', read: 'read',
    understand: 'understood', wear: 'worn', draw: 'drawn', fly: 'flown', grow: 'grown', throw: 'thrown',
    forbid: 'forbidden', forgive: 'forgiven', forget: 'forgotten', freeze: 'frozen', steal: 'stolen',
    rise: 'risen', fall: 'fallen', bite: 'bitten', hide: 'hidden',
    break: 'broken', catch: 'caught', cut: 'cut', hit: 'hit', hurt: 'hurt', let: 'let', shut: 'shut',
    split: 'split', set: 'set', spend: 'spent', smell: 'smelt',
  };
  function enBase(gloss) {
    let s = LOWER(gloss).replace(/\(.*?\)/g, ' ').split('/')[0];
    s = s.replace(/^\s*to\s+/, '').replace(/^\s+|\s+$/g, '');
    if (!s) return 'do it';
    return s;
  }
  function ed(base) {
    if (/(^|\s)(be|have|do)$/.test(base)) return EN_PAST[base.split(/\s+/).pop()] || base + 'd';
    if (EN_PAST[base]) return EN_PAST[base];
    if (/e$/.test(base)) return base + 'd';
    if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ied';
    return base + 'ed';
  }
  function ppEn(base) {
    const last = base.split(/\s+/).pop();
    if (EN_PP[last]) return base.slice(0, base.length - last.length) + EN_PP[last];
    if (EN_PAST[last] && !/(e|ed)$/.test(EN_PAST[last])) return ed(base);
    return ed(base);
  }
  function esThird(base, person) {
    if (!(person && person.enS)) return base;
    const last = base.split(/\s+/).pop();
    if (last === 'be') return base.replace(/be$/, 'is');
    if (last === 'have') return base.replace(/have$/, 'has');
    if (last === 'do') return base.replace(/do$/, 'does');
    if (/(s|x|z|ch|sh|o)$/.test(last)) return base + 'es';
    if (/[^aeiou]y$/.test(last)) return base.slice(0, -1) + 'ies';
    return base + 's';
  }
  /* English rendering of a Spanish tense, for the gloss line */
  function enTense(base, tense, person) {
    const s3 = !!(person && person.enS);
    if (base === 'be') {
      if (tense === 'presente') return person && person.id === 'yo' ? 'am' : (s3 ? 'is' : 'are');
      if (tense === 'pretérito' || tense === 'imperfecto') return s3 ? 'was' : 'were';
      if (tense === 'perfecto' || tense === 'pluscuamperfecto' || tense === 'pasiva') return s3 ? 'has been' : 'have been';
    }
    switch (tense) {
      case 'presente': return esThird(base, person);
      case 'pretérito': return ed(base);
      case 'imperfecto': return 'used to ' + base;
      case 'futuro': return 'will ' + base;
      case 'condicional': return 'would ' + base;
      case 'perfecto': return (s3 ? 'has ' : 'have ') + ppEn(base);
      case 'pluscuamperfecto': return 'had ' + ppEn(base);
      case 'cond-perfecto': return 'would have ' + ppEn(base);
      case 'ir-a': return (s3 ? 'is going to ' : 'are going to ') + base;
      case 'subjuntivo': return '(that) ' + base;
      default: return base;
    }
  }


  /* ================================================================== */
  /* verb subcategorisation — decides which patterns a verb may enter   */
  /* ================================================================== */
  const NO_OBJ = new Set(['ser', 'estar', 'parecer', 'resultar', 'haber', 'ayudar', 'vestir',
    'vestirse', 'ir', 'venir', 'llegar', 'entrar', 'salir', 'nacer', 'morir', 'vivir',
    'viajar', 'trabajar', 'funcionar', 'fallar', 'existir', 'parecer', 'dormir', 'nadar', 'oler',
    'sonar', 'arder', 'crecer', 'envejecer', 'tardar', 'costar', 'doler', 'haber', 'llover', 'nevar',
    'aparecer', 'desaparecer', 'arrepentirse', 'quejarse', 'enamorarse', 'emozionarse', 'preocuparse',
    'concentrarse', 'distraerse', 'estacionarse', 'detenerse', 'bañarse', 'despertarse', 'levantarse',
    'irse', 'quedarse', 'sentarse', 'acostarse', 'ducharse', 'afeitarse', 'maquillarse', 'arreglarse',
    'hablar', 'comentar', 'opinar', 'platicar', 'charlar', 'disponer', 'celar', 'bailar', 'nadar',
    'invitar', 'renunciar', 'aspirar', 'tolerar',
    'irse', 'soler']);
  const ONLY_3RD = new Set(['llover', 'nevar', 'haber', 'oler', 'sonar', 'arder', 'convenir', 'parecer']);
  const INF_OK = new Set(['querer', 'poder', 'necesitar', 'deber', 'saber', 'intentar', 'empezar',
    'comenzar', 'decidir', 'preferir', 'planear', 'prometer', 'evitar', 'lograr', 'conseguir',
    'dejar', 'aprender', 'enseñar', 'ayudar', 'invitar', 'atreverse', 'animarse', 'pensar', 'soler',
    'volver', 'proyectar', 'considerar', 'evaluar', 'permitir', 'prohibir', 'impedir', 'recordar',
    'olvidar', 'imaginar', 'pretender', 'anhelar', 'acostumbrarse', 'dedicarse', 'arriesgarse',
    'atreverse', 'llegar']);
  const QUE_OK = new Set(['decir', 'pensar', 'creer', 'saber', 'esperar', 'sentir', 'notar',
    'comprobar', 'demostrar', 'reconocer', 'admitir', 'recordar', 'olvidar', 'contar', 'explicar',
    'comentar', 'suponer', 'imaginar', 'verificar', 'asegurar', 'prometer', 'ver', 'entender',
    'comprender', 'considerar', 'observar', 'confirmar', 'anunciar', 'reconocer', 'presumir',
    'presagiar', 'adelantar', 'añadir', 'agradecer']);
  const ADJ_OK = new Set(['ser', 'estar', 'parecer', 'resultar', 'quedarse', 'ponerse',
    'sentirse', 'volverse', 'encontrarse', 'mantenerse']);
  const PER_OK = new Set(['ayudar', 'visitar', 'llamar', 'acompañar', 'buscar', 'encontrar', 'ver',
    'escuchar', 'invitar', 'saludar', 'perdonar', 'culpar', 'admirar', 'respetar', 'imitar',
    'molestar', 'seguir', 'querer', 'esperar', 'necesitar', 'agradecer', 'escuchar', 'odiar',
    'conocer', 'preguntar', 'contar', 'decir', 'explicar', 'responder', 'pedir', 'enseñar']);
  const LOC_IN = new Set(['vivir', 'estar', 'trabajar', 'estudiar', 'descansar', 'comer', 'cenar',
    'desayunar', 'almorzar', 'cocinar', 'dormir', 'quedar', 'quedarse', 'comprar', 'vender', 'buscar',
    'jugar', 'entrenar', 'limpiar', 'practicar', 'hablar', 'leer', 'escribir', 'reunirse', 'sentarse',
    'relajarse', 'llegar', 'existir', 'funcionar', 'fallar', 'faltar', 'sobrar', 'nacer', 'crecer',
    'pensar', 'soñar', 'meditar', 'bañarse', 'ducharse', 'despertarse', 'levantarse', 'estacionarse',
    'detenerse', 'concentrarse', 'distraerse', 'preocuparse', 'emocionarse', 'escribir', 'filmar',
    'grabar', 'cantar', 'bailar', 'correr', 'caminar', 'nadar', 'fotografiar', 'pintar', 'actuar',
    'votar', 'manifestarse', 'rezar', 'celebrar', 'descansar', 'trabajar', 'nadar', 'surfar', 'skatear']);
  const LOC_TO = new Set(['ir', 'venir', 'llegar', 'viajar', 'volver', 'mudarse', 'trasladarse',
    'caminar', 'correr', 'salir', 'entrar', 'subir', 'bajar', 'irse', 'pasear', 'manejar', 'conducir',
    'volar', 'acercarse', 'dirigirse', 'regresar', 'escaparse', 'asistir', 'dedicarse', 'viajar']);
  const EXP_OK = new Set(['gustar', 'encantar', 'interesar', 'molestar', 'importar', 'parecer',
    'doler', 'apetecer', 'faltar', 'sobrar', 'tocar', 'bastar', 'agradar', 'fascinar', 'quedar',
    'resultar', 'ocurrir', 'pasar', 'encantar']);
  const NOUN_SUBJ = new Set(['funcionar', 'fallar', 'mejorar', 'empeorar', 'aumentar', 'disminuir',
    'aparecer', 'desaparecer', 'crecer', 'llover', 'nevar', 'pasar', 'costar', 'sonar', 'arder',
    'tardar', 'existir', 'servir', 'continuar', 'seguir', 'cambiar', 'terminar', 'acabar',
    'empezar', 'comenzar', 'bajar', 'subir', 'crescer'.slice(0, 0) || 'aumentar']);
  /* gustar/encantar/faltar/sobrar/tocar/importar/interesar/doler cost the learner
     a dative, so they only appear in the experiencer frame */
  const EXP_ONLY = new Set(['gustar', 'encantar', 'interesar', 'molestar', 'importar', 'doler',
    'faltar', 'sobrar', 'tocar', 'bastar', 'apetecer', 'ocurrir', 'parecer']);
  const COPULAS = new Set(['ser', 'estar', 'parecer', 'resultar']);
  /* these never take a bare thing-object: they need their own preposition */
  const PREP_OBJ = { reflexionar: 'sobre', pensar: 'en', creer: 'en', insistir: 'en', soñar: 'en',
    conversar: 'con', tratar: 'de', meditar: 'sobre', reparar: 'en', coincidir: 'en',
    'arrepentirse': 'de', 'fijarse': 'en', 'burlarse': 'de', 'quejarse': 'de', 'acordarse': 'de',
    'olvidarse': 'de', 'dedicarse': 'a', 'aprovechar': '', perseverar: 'en', 'arrepentirse': 'de',
    'enterarse': 'de', 'ocuparse': 'de', 'encargarse': 'de', 'soñar': 'con', 'jugar': 'en',
    'preocuparse': 'por', 'concentrarse': 'en', 'fijarse': 'en', 'convertirse': 'en',
    'tardar': 'en', 'consistir': 'en', 'contribuir': 'a', 'convertirse': 'en', 'traducir': 'en' };
  /* these need a thing in front of them: 'yo tengo ahora' is not a sentence */
  const NEEDS_OBJ = new Set(['tener', 'querer', 'necesitar', 'comprar', 'vender', 'pedir', 'hacer',
    'decir', 'poner', 'echar de menos', 'traer', 'llevarse', 'ganar', 'perder', 'usar', 'pagar',
    'recibir', 'mandar', 'enviar', 'cobrar', 'invertir']);
  const NO_ABSTRACT = new Set(['ir', 'venir', 'llegar', 'entrar', 'salir', 'ayudar', 'invitar', 'obligar', 'llevar', 'enseñar', 'regalar',
    'contar', 'mostrar', 'decir', 'dar', 'prestar', 'enviar']);
  const PLACE_NOUN = /(^|\s)(el|la|los|las|un|una)\s+(puesto|local|establecimiento|tianguis|edificio|recinto|aula|comedor|avenida|boulevard|callejón|frontera|puerto|isla|región|estado|municipio|delegación|instituto|preparatoria|secundaria|primaria|guardería|banco|consultorio|cárcel|templo|catedral|mezquita|lugar|sitio|casa|hogar|cocina|sala|cuarto|dormitorio|baño|patio|jardín|jardin|mesa|calle|esquina|plaza|parque|iglesia|escuela|colegio|universidad|biblioteca|oficina|trabajo|mercado|tienda|fonda|restaurante|bar|cantina|café|cafetería|terminal|aeropuerto|estación|autobús|metro|gimnasio|farmacia|hospital|clínica|museo|teatro|cine|estadio|playa|montaña|río|bosque|campo|ciudad|pueblo|país|barrio|colonia|centro|norte|sur|este|oeste|aquel|ese)\b/i;
  /* these verbs are perfectly happy with a place as their object */
  const PLACE_OK = new Set(['visitar', 'conocer', 'buscar', 'encontrar', 'alquilar', 'rentar',
    'comprar', 'ver', 'mirar', 'cruzar', 'tomar', 'llegar', 'entrar', 'salir', 'venir', 'ir',
    'pasar', 'dejar', 'llevar', 'traer', 'poner', 'tener', 'necesitar', 'usar', 'elegir',
    'cambiar', 'recomendar', 'presentar', 'cerrar', 'abrir', 'limpiar', 'ordenar', 'pintar',
    'reformar', 'visitar', 'recorrer', 'frecuentar', 'faltar', 'situarse']);
  const MODALS = new Set(['poder', 'deber', 'soler']);
  /* a verb whose subject has to be a person, not a plate of food */
  const AGENTIVE = new Set(['comer', 'beber', 'desayunar', 'almorzar', 'cenar', 'hablar', 'preguntar',
    'responder', 'explicar', 'contar', 'leer', 'escribir', 'estudiar', 'trabajar', 'aprender',
    'enseñar', 'practicar', 'cocinar', 'limpiar', 'ordenar', 'lavar', 'planchar', 'barrer', 'cantar',
    'bailar', 'jugar', 'correr', 'caminar', 'viajar', 'visitar', 'comprar', 'vender', 'pagar',
    'pedir', 'cocinar', 'conducir', 'saludar', 'abrazar', 'besar', 'esperar', 'ayudar', 'escuchar',
    'mirar', 'ver', 'observar', 'opinar', 'decidir', 'intentar', 'intentarlo', 'organizar',
    'preparar', 'invitar', 'conocer', 'sentarse', 'levantarse', 'acostarse', 'dormir', 'descansar',
    'quejarse', 'arrepentirse', 'atreverse', 'animarse', 'esforzarse', 'portarse', 'irse']);
  const NO_INF = new Set(['ser', 'estar', 'parecer', 'resultar', 'haber', 'gustar', 'encantar',
    'interesar', 'molestar', 'doler', 'continuar', 'seguir', 'soler', 'ir', 'venir']);
  /* an infinitive used AS the complement: auxiliaries read badly there */
  const NO_COMPLEMENT = new Set(['ser', 'estar', 'haber', 'poder', 'querer', 'deber', 'soler',
    'saber', 'gustar', 'parecer', 'resultar', 'ir']);
  /* verbs whose infinitive complement needs a preposition */
  const INF_PREP = { ir: 'a', empezar: 'a', comenzar: 'a', aprender: 'a', ayudar: 'a',
    'animarse': 'a', 'atreverse': 'a', 'negarse': 'a', 'dedicarse': 'a', 'enseñar': 'a',
    'invitar': 'a', 'obligar': 'a', 'llevar': 'a', 'acostumbrarse': 'a', 'volver': 'a',
    'llegar': 'a', 'arriesgarse': 'a', 'ayudar': 'a', 'aprender': 'a', 'animarse': 'a' };
  const NEVER_TARGET = new Set(['haber', 'ser necesario', 'velar']);
  const SUBJ_MAIN = new Set(['creer', 'pensar', 'suponer', 'esperar', 'imaginar', 'parecer', 'dudar',
    'notar', 'oler', 'sentir', 'decir']);
  const PREP_MAP = {
    hablar: 'de', 'hablar de': 'de', pensar: 'en', creer: 'en', consistir: 'en', necesitar: '',
    depender: 'de', soñar: 'con', vivir: 'en', trabajar: 'en', participar: 'en',
    convertir: 'en', 'convertirse': 'en', traducir: 'en', jugar: 'con', 'enfermarse': 'de',
    'acordarse': 'de', 'olvidarse': 'de', 'tratar': 'de', 'ocuparse': 'de', 'encargarse': 'de',
    'enterarse': 'de', 'quejarse': 'de', 'arrepentirse': 'de', 'enamorarse': 'de', 'burlarse': 'de',
    'dedicarse': 'a', 'atreverse': 'a', 'animarse': 'a', 'aprender': 'de', 'aprovechar': 'de',
    'contribuir': 'a', 'invitar': 'a', 'obligar': 'a', 'ayudar': 'a', 'enseñar': 'a',
    'empezar': 'por', 'comenzar': 'por', 'ir': 'a', 'venir': 'de', 'salir': 'de', 'venir': 'de',
    'reírse': 'de', 'discutir': 'con', 'enfadar': 'con', 'cumplir': 'con',
    'contar': 'con', 'casar': 'con',
  };
  const PREP_OVERRIDE = new Map(Object.entries(PREP_MAP));

  function profile(es) {
    const L = lemma(es);
    const bare = L.bare;
    /* 'concentrarse' is listed with its clitic, so test both spellings */
    const has = set => set.has(bare) || set.has(L.display);
    const mapOf = table => table[bare] !== undefined ? table[bare] : table[L.display];
    let prep = L.prep || PREP_OVERRIDE.get(bare) || PREP_OVERRIDE.get(L.display) || '';
    let needs = new Set(['adv']);
    const impersonal = has(ONLY_3RD);
    const mk = extra => Object.assign({
      es: L.display, bare, head: L.head, prep, refl: L.refl, tail: L.tail, needs,
      impersonal, infPrep: mapOf(INF_PREP) || '', glossEn: '',
    }, extra || {});
    if (has(COPULAS)) {
      needs = new Set(['cop']);
      if (bare === 'estar') needs.add('locin');
      if (bare === 'ser') needs.add('locin');          /* la fiesta es en el mercado */
      if (bare === 'parecer' || bare === 'resultar') needs.add('que');
      return mk();
    }
    if (has(EXP_ONLY)) { needs = new Set(['exp']); return mk(); }
    if (has(MODALS)) { needs = new Set(['inf']); if (bare === 'poder') needs.add('adv'); return mk(); }
    if (MODALS.has(bare)) { needs = new Set(['inf', 'adv']); return mk(); }
    if (mapOf(PREP_OBJ)) {                              /* reflexionar sobre, pensar en … */
      prep = mapOf(PREP_OBJ) || prep;
      needs.add('pp');
    } else if (!has(NO_OBJ) && !has(EXP_OK)) needs.add('obj');
    if (has(INF_OK) && !has(NO_INF) && !impersonal) needs.add('inf');
    if (has(PER_OK) && !impersonal) needs.add('per');
    if (has(QUE_OK) && !impersonal) needs.add('que');
    if (has(ADJ_OK)) needs.add('adj');
    if (has(EXP_OK)) needs.add('exp');
    if (has(NOUN_SUBJ)) needs.add('nsub');
    if (has(SUBJ_MAIN) && bare !== 'oler') needs.add('subjmain');
    if (prep && !has(NO_ABSTRACT)) needs.add('pp');
    if (has(LOC_IN)) needs.add('locin');
    if (has(LOC_TO)) needs.add('locto');
    if (impersonal) { needs = new Set(['imp']); }
    if (NEEDS_OBJ.has(bare) && !needs.has('obj')) { needs.delete('adv'); needs.delete('locin'); }
    if (bare === 'parecer' || bare === 'resultar') needs.add('adj');
    return mk();
  }

  /* ------------------------------------------------------------------ */
  /* generic slot pools (shared by every field)                          */
  /* ------------------------------------------------------------------ */
  const G = {
    times: [
      ['hoy', 'today'], ['mañana', 'tomorrow'], ['ayer', 'yesterday'], ['esta semana', 'this week'],
      ['la semana pasada', 'last week'], ['el año que viene', 'next year'], ['este año', 'this year'],
      ['los fines de semana', 'on weekends'], ['todos los días', 'every day'], ['una vez por semana', 'once a week'],
      ['de vez en cuando', 'from time to time'], ['por la mañana', 'in the morning'],
      ['por la tarde', 'in the afternoon'], ['por la noche', 'at night'], ['en verano', 'in summer'],
      ['en invierno', 'in winter'], ['pronto', 'soon'], ['más tarde', 'later'], ['ahora mismo', 'right now'],
      ['el próximo mes', 'next month'], ['hace unos días', 'a few days ago'], ['los lunes', 'on Mondays'],
      ['durante el desayuno', 'over breakfast'], ['después del trabajo', 'after work'],
    ],
    inPlaces: [
      ['en casa', 'at home'], ['en la cocina', 'in the kitchen'], ['en la mesa', 'at the table'],
      ['en la sala', 'in the living room'], ['en mi cuarto', 'in my room'], ['en la calle', 'in the street'],
      ['en el centro', 'downtown'], ['en la escuela', 'at school'], ['en la oficina', 'at the office'],
      ['en el trabajo', 'at work'], ['en la universidad', 'at university'], ['en la biblioteca', 'in the library'],
      ['en el parque', 'in the park'], ['en la plaza', 'in the square'], ['en la playa', 'at the beach'],
      ['en el mercado', 'at the market'], ['en un café', 'in a café'], ['en el transporte público', 'on public transport'],
      ['en internet', 'online'], ['en la tele', 'on TV'], ['en la radio', 'on the radio'],
      ['en el médico', "at the doctor's"], ['en el banco', 'at the bank'], ['en la frontera', 'at the border'],
      ['en la ciudad', 'in the city'], ['en un pueblo', 'in a small town'], ['en Oaxaca', 'in Oaxaca'],
      ['en la Ciudad de México', 'in Mexico City'], ['en Monterrey', 'in Monterrey'],
      ['en Guadalajara', 'in Guadalajara'], ['en la frontera norte', 'at the northern border'],
      ['en mi barrio', 'in my neighbourhood'], ['en la escuela de mi hijo', "at my son's school"],
      ['en una reunión', 'in a meeting'], ['en clase', 'in class'], ['en el gimnasio', 'at the gym'],
      ['en el hospital', 'in the hospital'], ['en la farmacia', 'at the pharmacy'],
      ['en el aeropuerto', 'at the airport'], ['en la terminal', 'at the terminal'],
      ['en el estadio', 'in the stadium'], ['en el museo', 'in the museum'], ['en la iglesia', 'in the church'],
      ['en la oficina de migración', 'at the immigration office'], ['en el consulado', 'at the consulate'],
      ['en el tribunal', 'in court'], ['en la fábrica', 'in the factory'], ['en el campo', 'in the countryside'],
    ],
    toPlaces: [
      ['a casa', 'home'], ['a la playa', 'to the beach'], ['a la ciudad', 'to the city'],
      ['a otro país', 'to another country'], ['a Oaxaca', 'to Oaxaca'], ['a la costa', 'to the coast'],
      ['a la montaña', 'to the mountains'], ['a un pueblo mágico', 'to a "pueblo mágico"'],
      ['a la frontera', 'to the border'], ['a la oficina', 'to the office'], ['a la escuela', 'to school'],
      ['al trabajo', 'to work'], ['al centro', 'to the centre'], ['a un concierto', 'to a concert'],
      ['al museo', 'to the museum'], ['a un festival', 'to a festival'], ['a la consulta', 'to the surgery'],
      ['al gimnasio', 'to the gym'], ['al mercado', 'to the market'], ['a la entrevista', 'to the interview'],
      ['a la estación', 'to the station'], ['a otra ciudad', 'to another city'], ['a la playa cercana', 'to the nearby beach'],
    ],
    abstracts: [
      ['este tema', 'this topic'], ['esta idea', 'this idea'], ['mi experiencia', 'my experience'],
      ['lo que leí', 'what I read'], ['los detalles', 'the details'], ['esa parte', 'that part'],
      ['todo esto', 'all of this'], ['mi opinión', 'my opinion'], ['lo que pasó', 'what happened'],
      ['el resultado', 'the result'], ['la explicación', 'the explanation'], ['la primera vez', 'the first time'],
      ['los ejemplos', 'the examples'], ['esa decisión', 'that decision'], ['la discusión', 'the discussion'],
    ],
    referents: [
      ['el tema', 'the topic'], ['este asunto', 'this matter'], ['esto', 'this'],
      ['todo esto', 'all this'], ['la cuestión', 'the question'], ['el tema de hoy', "today's topic"],
    ],
    adjs: SAFE_INVARIANT,
    connectors: {
      open: [['Hoy', 'Today'], ['Esta semana', 'This week'], ['Para empezar', 'To start'],
        ['En mi experiencia', 'In my experience'], ['Ahora mismo', 'Right now'], ['Aunque parezca simple', 'Although it seems simple'],
        ['Según lo que he visto', 'From what I have seen'], ['Ultimamente', 'Lately'], ['Frente a esto', 'Faced with this']],
      context: [['Normalmente', 'Normally'], ['Por lo general', 'Usually'], ['En mi caso', 'In my case'],
        ['La mayoría de las veces', 'Most of the time'], ['Al principio', 'At first'], ['En ese momento', 'At that moment'],
        ['Ese día', 'That day'], ['Cuando era niño', 'When I was a child'], ['En esa ocasión', 'On that occasion'],
        ['Aquí', 'Here'], ['En mi familia', 'In my family'], ['En mi trabajo', 'At my job']],
      action: [['Después', 'Then'], ['Luego', 'After that'], ['Más tarde', 'Later'], ['Entonces', 'So'],
        ['Además', 'Besides'], ['También', 'Also'], ['Aparte de eso', 'Apart from that'], ['De hecho', 'In fact'],
        ['Primeramente', 'First of all'], ['En segundo lugar', 'Secondly']],
      opinion: [['Personalmente', 'Personally'], ['A mi parecer', 'In my view'], ['Sinceramente', 'Honestly'],
        ['Como veo las cosas', 'As I see things'], ['Para mí', 'For me'], ['Dicho esto', 'That said'],
        ['Con todo', 'Even so'], ['En el fondo', 'Deep down']],
      contrast: [['Sin embargo', 'However'], ['Aun así', 'Even so'], ['En cambio', 'By contrast'],
        ['No obstante', 'Nevertheless'], ['Por el contrario', 'On the contrary'], ['Aunque nadie lo dice', 'Although nobody says it'],
        ['Parece mentira, pero', 'It sounds unreal, but'], ['Al mismo tiempo', 'At the same time']],
      plan: [['Mañana', 'Tomorrow'], ['Más adelante', 'Later on'],
        ['De momento', 'For now'], ['Para terminar', 'To finish'], ['El año que viene', 'Next year'],
        ['Si todo sale bien', 'If all goes well'], ['Pronto', 'Soon']],
      close: [['En resumen', 'In short'], ['Al final', 'In the end'], ['Por eso', 'That is why'],
        ['Así que', 'So'], ['De cara al futuro', 'Looking ahead'], ['En definitiva', 'Ultimately'],
        ['Con todo esto', 'With all this'], ['Por ahora', 'For now'], ['Y ojalá', "And hopefully"]],
    },
    people: [
      ['mi vecino', 'my neighbour', 'el'], ['mi compañera', 'my classmate', 'el'], ['un amigo', 'a friend', 'el'],
      ['mi jefe', 'my boss', 'el'], ['mi tía', 'my aunt', 'el'], ['mis abuelos', 'my grandparents', 'ellos'],
      ['mis compañeros', 'my coworkers', 'ellos'], ['mi hermano mayor', 'my older brother', 'el'],
      ['mi prima', 'my cousin', 'el'], ['el profesor', 'the teacher', 'el'], ['mi familia', 'my family', 'el'],
      ['un conocido', 'an acquaintance', 'el'], ['las personas mayores', 'older people', 'ellos'],
      ['mi pareja', 'my partner', 'el'], ['los turistas', 'the tourists', 'ellos'], ['mi hijo', 'my son', 'el'],
    ],
    exp: [
      ['mí', 'I', 'me', 's'], ['ti', 'you', 'te', 's'], ['mi hermano', 'my brother', 'le', 's'],
      ['nosotros', 'we', 'nos', 'p'], ['mis padres', 'my parents', 'les', 'p'], ['ella', 'she', 'le', 's'],
      ['los estudiantes', 'students', 'les', 'p'], ['mi abuela', 'my grandmother', 'le', 's'],
    ],
    genericNouns: [
      ['el tema', 'the topic'], ['las ideas', 'the ideas'], ['los ejemplos', 'the examples'],
      ['la gente', 'people'], ['las noticias', 'the news'], ['la experiencia', 'the experience'],
      ['mi opinión', 'my opinion'], ['esta pregunta', 'this question'], ['el contexto', 'the context'],
      ['las opiniones', 'the opinions'], ['una conversación', 'a conversation'], ['un buen resumen', 'a good summary'],
    ],
    genericVerbs: ['hablar', 'aprender', 'practicar', 'entender', 'comprender', 'explicar', 'buscar',
      'encontrar', 'leer', 'escribir', 'escuchar', 'considerar', 'reflexionar', 'observar', 'analizar',
      'compartir', 'comentar', 'recordar', 'olvidar', 'decidir', 'intentar', 'mejorar'],
    reasons: [
      ['porque toca algo que la gente vive todos los días', 'because it touches something people live every day'],
      ['porque cambia según quién lo cuente', 'because it changes depending on who tells it'],
      ['porque nadie lo explica dos veces igual', 'because nobody explains it the same way twice'],
      ['porque sirve para entender mejor el país', 'because it helps to understand the country better'],
      ['porque mezcla lo personal y lo colectivo', 'because it mixes the personal and the collective'],
    ],
    closers: [
      ['y eso es algo que quiero seguir entendiendo', 'and that is something I want to keep understanding'],
      ['pero todavía me faltan palabras para decirlo', 'but I still lack the words to say it'],
      ['así que sigo buscando ejemplos mejores', 'so I keep looking for better examples'],
      ['y prefiero escuchar antes de opinar', 'and I prefer to listen before giving an opinion'],
    ],
  };

  /* G stores compact [es, en] pairs; the generator reads objects */
  (function normalisePools() {
    const obj = list => (list || []).map(x => (Array.isArray(x) ? { es: x[0], en: x[1] } : x));
    ['times', 'inPlaces', 'toPlaces', 'abstracts', 'referents', 'reasons', 'closers']
      .forEach(k => { G[k] = obj(G[k]); });
    const TIMEISH = /(ayer|hoy|mañana|semana|mes|año|día|tarde|noche|vez|pronto|julio|enero|febrero|marzo|abril|mayo|junio|agosto|septiembre|octubre|noviembre|diciembre|verano|invierno|temporada|época|fin de|domingo|lunes|martes|miércoles|jueves|viernes|sábado|ahora|momento|ocasión|recientemente|ultimamente)/i;
    Object.keys(G.connectors || {}).forEach(k => {
      G.connectors[k] = obj(G.connectors[k]).map(c => Object.assign({}, c, { when: TIMEISH.test(c.es) }));
    });
    G.people = (G.people || []).map(x => (Array.isArray(x)
      ? { es: x[0], en: x[1], person: x[2] || 'el' } : x));
    G.exp = (G.exp || []).map(x => (Array.isArray(x)
      ? { es: x[0], en: x[1], cl: x[2], num: x[3] || 's' } : x));
  })();

  /* ------------------------------------------------------------------ */
  /* semantic fields: what a topic is actually about                     */
  /* ------------------------------------------------------------------ */
  function field(o) {
    const conv = (list, fn) => (list || []).map(x => (Array.isArray(x) && fn ? fn(x) : x));
    return {
      label: o.label, icon: o.icon, keys: o.keys || [], cats: o.cats || [],
      nouns: conv(o.nouns, x => noun(x[0], x[1])),
      easyNouns: conv(o.easyNouns, x => noun(x[0], x[1])),
      inPlaces: conv(o.inPlaces, x => ({ es: x[0], en: x[1] })),
      toPlaces: conv(o.toPlaces, x => ({ es: x[0], en: x[1] })),
      times: conv(o.times, x => ({ es: x[0], en: x[1] })),
      adjs: conv(o.adjs, x => adj(x[0], x[2] ? { pl: x[2] } : null)),
      verbs: o.verbs || [],
      reasons: conv(o.reasons, x => ({ es: x[0], en: x[1] })),
    };
  }

  const FIELDS = {
    food: field({
      label: 'food & cooking', icon: '🍽️', cats: ['food', 'chores', 'comida'],
      keys: ['comida', 'comer', 'cocina', 'cocinar', 'restaurante', 'taco', 'tacos', 'mole', 'mercado',
        'desayuno', 'comida típica', 'gastronomía', 'bebida', 'beber', 'café', 'bar', 'postre', 'receta',
        'food', 'eat', 'cook', 'cooking', 'restaurant', 'street food', 'snack', 'kitchen', 'recipe', 'pizza',
        'antojitos', 'tamal', 'tamales', 'salsa', 'mariscos', 'cena', 'mesa'],
      easyNouns: [['el taco', 'taco'], ['la tortilla', 'tortilla'], ['el café', 'coffee'], ['el pan', 'bread'],
        ['la sopa', 'soup'], ['el arroz', 'rice'], ['el pollo', 'chicken'], ['el agua', 'water'],
        ['la fruta', 'fruit'], ['el desayuno', 'breakfast'], ['la cena', 'dinner'], ['el sabor', 'flavour']],
      nouns: [['el mole', 'mole'], ['los antojitos', 'street snacks'], ['la salsa', 'salsa'],
        ['el tamal', 'tamal'], ['las tortillas', 'tortillas'], ['el pan dulce', 'sweet bread'],
        ['un puesto callejero', 'a street stall'], ['la comida casera', 'home cooking'],
        ['el postre', 'dessert'], ['el café de olla', 'spiced coffee'], ['los ingredientes', 'the ingredients'],
        ['una fonda', 'a small eatery'], ['el aguacate', 'avocado'], ['la cocina de mi abuela', "my grandmother's kitchen"]],
      inPlaces: [['en el mercado', 'at the market'], ['en un puesto de la calle', 'at a street stall'],
        ['en la cocina', 'in the kitchen'], ['en una fonda', 'in a small eatery'],
        ['en un restaurante del centro', 'in a restaurant downtown'], ['en la mesa familiar', 'at the family table']],
      toPlaces: [['al mercado', 'to the market'], ['a la cocina económica', 'to the cheap eatery'],
        ['a un restaurante Oaxaca', 'to an Oaxacan restaurant'], ['a la feria del mole', 'to the mole fair']],
      times: [['los viernes por la noche', 'on Friday nights'], ['el domingo al mediodía', 'on Sunday at noon'],
        ['en la sobremesa', 'after the meal'], ['a la hora de la cena', 'at dinner time'],
        ['en la mañana, con prisa', 'in the morning, in a hurry']],
      adjs: [['delicioso'], ['picante'], ['fresco'], ['casero'], ['económico'], ['tradicional', 'tradicionales'],
        ['sabroso'], ['dulce', 'dulces'], ['aromático']],
      verbs: ['probar', 'cocinar', 'comprar', 'preparar', 'compartir', 'disfrutar', 'recomendar', 'pagar',
        'pedir', 'comer', 'beber', 'desayunar', 'cenar', 'almorzar', 'limpiar', 'ayudar', 'aprender',
        'celebrar', 'visitar', 'vender', 'invitar', 'regatear', 'beber', 'servir'],
      reasons: [['porque la comida reúne a la gente', 'because food brings people together'],
        ['porque cada región lo hace distinto', 'because every region does it differently'],
        ['porque el aroma trae recuerdos', 'because the smell brings back memories']],
    }),
    travel: field({
      label: 'travel & moving', icon: '✈️', cats: ['travel', 'city', 'errands'],
      keys: ['viaje', 'viajar', 'vacaciones', 'playa', 'avión', 'vuelo', 'turismo', 'turista', 'tour',
        'trip', 'travel', 'road trip', 'mochila', 'hotel', 'frontera', 'transporte', 'autobús', 'tren',
        'aduana', 'equipaje', 'maleta', 'carretera', 'migración', 'migrante', 'cruzar', 'mudanza', 'mudarse',
        'visa', 'pasaporte', 'residencia', 'ciudad', 'aeropuerto', 'excursión', 'conocer'],
      easyNouns: [['la maleta', 'suitcase'], ['el autobús', 'bus'], ['la playa', 'beach'],
        ['el tren', 'train'], ['la calle', 'street'], ['la estación', 'station'], ['el billete', 'ticket'],
        ['el mapa', 'map'], ['la ciudad', 'city'], ['el camino', 'road'], ['la frontera', 'border'],
        ['el pasaporte', 'passport']],
      nouns: [['el vuelo', 'the flight'], ['la carretera', 'the highway'], ['un pueblo mágico', 'a "pueblo mágico"'],
        ['los paisajes', 'the landscapes'], ['el equipaje', 'the luggage'], ['la visa', 'the visa'],
        ['el trámite', 'the paperwork'], ['la aduana', 'customs'], ['un viaje por tierra', 'an overland trip'],
        ['la terminal', 'the bus terminal'], ['el cruce fronterizo', 'the border crossing'],
        ['una caminata larga', 'a long walk'], ['el boleto de autobús', 'the bus ticket']],
      inPlaces: [['en la terminal', 'at the terminal'], ['en la carretera', 'on the highway'],
        ['en la frontera', 'at the border'], ['en un pueblo cercano', 'in a nearby town'],
        ['en el aeropuerto', 'at the airport'], ['en el tren', 'on the train']],
      toPlaces: [['a la playa', 'to the beach'], ['a otro país', 'to another country'],
        ['a un pueblo mágico', 'to a "pueblo mágico"'], ['a la frontera', 'to the border'],
        ['a la costa', 'to the coast'], ['a la montaña', 'to the mountains']],
      times: [['el próximo verano', 'next summer'], ['la semana pasada', 'last week'], ['en julio', 'in July'],
        ['el fin de semana largo', 'the long weekend'], ['mañana temprano', 'early tomorrow'],
        ['durante la travesía', 'during the trip']],
      adjs: [['inolvidable', 'unforgettable', 'inolvidables'], ['lejano'], ['económico'],
        ['cansado'], ['hermoso'], ['largo', 'largos'], ['complicado'], ['lleno', 'llenos'], ['necesario']],
      verbs: ['viajar', 'visitar', 'reservar', 'empacar', 'manejar', 'recorrer', 'conocer', 'llegar',
        'comprar', 'preguntar', 'cruzar', 'salir', 'volver', 'quedar', 'mudarse', 'documentar', 'pagar',
        'cambiar', 'decidir', 'intentar', 'aprender', 'entender', 'ayudar', 'perder', 'encontrar', 'necesitar'],
      reasons: [['porque cada viaje cambia a quien lo hace', 'because every trip changes the person taking it'],
        ['porque las fronteras se entienden cruzándolas', 'because borders are understood by crossing them'],
        ['porque nadie viaja igual dos veces', 'because nobody travels the same way twice']],
    }),
    family: field({
      label: 'family & relationships', icon: '👪', cats: ['family', 'feelings', 'home'],
      keys: ['familia', 'madre', 'padre', 'madre', 'hermano', 'hermana', 'abuelo', 'abuela', 'tío', 'tía',
        'primo', 'prima', 'hijos', 'hijo', 'hija', 'boda', 'cumpleaños', 'parientes', 'family', 'mother',
        'father', 'sister', 'brother', 'wedding', 'birthday', 'amigos', 'amistad', 'pareja', 'novio', 'novia',
        'matrimonio', 'crianza', 'abuelos', 'sobrino'],
      easyNouns: [['mi madre', 'my mother'], ['mi padre', 'my father'], ['mi hermano', 'my brother'],
        ['mi hermana', 'my sister'], ['mi abuela', 'my grandmother'], ['la familia', 'the family'],
        ['mi tío', 'my uncle'], ['un amigo', 'a friend'], ['la casa', 'the house'], ['mi primo', 'my cousin']],
      nouns: [['la boda', 'the wedding'], ['el cumpleaños', 'the birthday'], ['la sobremesa familiar', 'the family after-dinner talk'],
        ['los parientes', 'the relatives'], ['la crianza', 'raising children'], ['el álbum familiar', 'the family album'],
        ['una carta de mi abuela', 'a letter from my grandmother'], ['la cena del domingo', 'Sunday dinner'],
        ['mi primo menor', 'my younger cousin'], ['las historias de la familia', 'the family stories']],
      inPlaces: [['en la sala', 'in the living room'], ['en la casa de mis padres', "at my parents' house"],
        ['en la mesa familiar', 'at the family table'], ['en la iglesia', 'in the church'],
        ['en el jardín', 'in the garden'], ['en la cocina', 'in the kitchen']],
      toPlaces: [['a casa de mi abuela', "to my grandmother's house"], ['a la boda', 'to the wedding'],
        ['al cumpleaños', 'to the birthday party'], ['a la iglesia', 'to the church']],
      times: [['cada domingo', 'every Sunday'], ['en diciembre', 'in December'], ['en Nochebuena', 'on Christmas Eve'],
        ['los fines de semana', 'on weekends'], ['cuando era pequeño', 'when I was little'],
        ['una vez al mes', 'once a month']],
      adjs: [['unido', 'unidos'], ['querido'], ['difícil', 'difíciles'], ['cercano'], ['gracioso'],
        ['paciente', 'pacientes'], ['leal', 'leales'], ['ruidoso']],
      verbs: ['visitar', 'llamar', 'ayudar', 'cuidar', 'celebrar', 'compartir', 'escuchar', 'perdonar',
        'agradecer', 'reunir', 'recordar', 'querer', 'convencer', 'acompañar', 'esperar', 'contar',
        'reír', 'bailar', 'cocinar', 'hablar', 'entender', 'olvidar', 'prometer', 'respetar'],
      reasons: [['porque la familia es el primer espejo', 'because family is the first mirror'],
        ['porque el cariño se practica, no se hereda', 'because affection is practised, not inherited'],
        [' porque cada casa tiene su propio idioma', 'because every house has its own language']],
    }),
    work: field({
      label: 'work & money', icon: '💼', cats: ['work', 'money', 'shopping', 'bureaucracy'],
      keys: ['trabajo', 'trabajar', 'empleo', 'oficina', 'jefe', 'empresa', 'salario', 'sueldo', 'reunión',
        'carrera', 'negocio', 'job', 'work', 'business', 'dinero', 'banco', 'cuenta', 'precio', 'impuestos',
        'ahorro', 'presupuesto', 'deuda', 'renta', 'cliente', 'ventas', 'vendor', 'pedido', 'factura',
        'propina', 'monedas', 'salario mínimo', 'curriculum', 'entrevista', 'despido', 'huelga', 'sindicto'],
      easyNouns: [['el trabajo', 'the job'], ['la oficina', 'the office'], ['el dinero', 'money'],
        ['el jefe', 'the boss'], ['la cuenta', 'the bill'], ['el día', 'the day'], ['la hora', 'the hour'],
        ['la tienda', 'the shop'], ['el precio', 'the price'], ['la caja', 'the till']],
      nouns: [['el horario', 'the schedule'], ['la reunión', 'the meeting'], ['el contrato', 'the contract'],
        ['el sueldo', 'the salary'], ['la plantilla', 'the staff'], ['un cliente difícil', 'a difficult customer'],
        ['el presupuesto', 'the budget'], ['la nómina', 'the payroll'], ['un turno nocturno', 'a night shift'],
        ['el trámite', 'the paperwork'], ['la fila del banco', 'the bank queue'], ['las ventas del mes', 'the monthly sales']],
      inPlaces: [['en la oficina', 'at the office'], ['en el banco', 'at the bank'], ['en la fábrica', 'in the factory'],
        ['en la tienda', 'in the shop'], ['en una junta', 'in a meeting'], ['en el almacén', 'in the warehouse'],
        ['en la obra', 'on the construction site'], ['en casa, en remoto', 'at home, remotely']],
      toPlaces: [['al trabajo', 'to work'], ['a la oficina', 'to the office'], ['a la entrevista', 'to the interview'],
        ['al banco', 'to the bank'], ['a la junta', 'to the meeting'], ['a la tienda', 'to the shop']],
      times: [['cada lunes', 'every Monday'], ['a fin de mes', 'at the end of the month'], ['en horas extra', 'in overtime'],
        ['a primera hora', 'first thing in the morning'], ['los sábados por la mañana', 'on Saturday mornings'],
        ['durante la temporada', 'during the season']],
      adjs: [['estresante', 'estresantes'], ['exigente', 'exigentes'], ['puntual', 'puntuales'], ['rentable'],
        ['informal'], ['temporal', 'temporales'], ['productivo'], ['público'], ['privado']],
      verbs: ['trabajar', 'cobrar', 'pagar', 'ganar', 'gastar', 'ahorrar', 'vender', 'comprar', 'atender',
        'reunir', 'decidir', 'negociar', 'contratar', 'firmar', 'documentar', 'calcular', 'organizar',
        'revisar', 'entregar', 'pedir', 'necesitar', 'poder', 'deber', 'aumentar', 'disminuir', 'mejorar',
        'rendir', 'lograr', 'intentar', 'continuar', 'cambiar', 'reclamar'],
      reasons: [['porque el dinero explica muchas decisiones', 'because money explains many decisions'],
        ['porque nadie trabaja igual en dos lugares', 'because nobody works the same way in two places'],
        [' porque afecta el tiempo de todos', 'because it affects everybody\u2019s time']],
    }),
    health: field({
      label: 'health & body', icon: '🩺', cats: ['health', 'body', 'daily'],
      keys: ['salud', 'médico', 'medico', 'hospital', 'farmacia', 'enfermedad', 'dolor', 'cuerpo', 'ejercicio',
        'dieta', 'medicina', 'remedio', 'diente', 'vacuna', 'alergia', 'estrés', 'ansiedad', 'sleep', 'health',
        'doctor', 'dentist', 'dentista', 'terapia', 'fitoterapi', 'fisioterapia', 'alimentación', 'higiene',
        'cuidado', 'paciente', 'cita médica', 'receta médica', 'seguro médico', 'IMSS'],
      easyNouns: [['el médico', 'the doctor'], ['la farmacia', 'the pharmacy'], ['la pastilla', 'the pill'],
        ['el dolor', 'the pain'], ['la tos', 'the cough'], ['la fiebre', 'the fever'], ['el cuerpo', 'the body'],
        ['el agua', 'the water'], ['el descanso', 'the rest'], ['la caminata', 'the walk']],
      nouns: [['la receta', 'the prescription'], ['la cita', 'the appointment'], ['el chequeo', 'the check-up'],
        ['la seguridad social', 'public health care'], ['una noche sin dormir', 'a sleepless night'],
        ['la presión arterial', 'blood pressure'], ['el seguro de gastos médicos', 'the private health insurance'],
        ['una alerta de salud', 'a health alert'], ['la consulta', 'the consultation'], ['la vacuna', 'the vaccine']],
      inPlaces: [['en el consultorio', 'in the surgery'], ['en el hospital', 'in the hospital'],
        ['en la farmacia', 'at the pharmacy'], ['en la clínica', 'at the clinic'], ['en casa', 'at home'],
        ['en el gimnasio', 'at the gym']],
      toPlaces: [['a la consulta', 'to the consultation'], ['al médico', 'to the doctor'], ['a la farmacia', 'to the pharmacy'],
        ['al hospital', 'to the hospital'], ['a una revisión', 'for a check-up']],
      times: [['todos los días', 'every day'], ['antes de dormir', 'before sleeping'], ['por la mañana', 'in the morning'],
        ['cada seis meses', 'every six months'], ['cuando llueve', 'when it rains'], ['después de comer', 'after eating']],
      adjs: [['sano'], ['cansado'], ['débil', 'débiles'], ['fuerte'], ['regular', 'regulares'], ['urgente'],
        ['preventivo'], ['crónico'], ['molesto']],
      verbs: ['doler', 'descansar', 'cuidar', 'cuidarse', 'tomar', 'tomarse', 'practicar', 'correr', 'caminar',
        'dormir', 'comer', 'beber', 'fumar', 'dejar', 'revisar', 'avisar', 'necesitar', 'poder', 'sentir',
        'sentirse', 'levantarse', 'acostarse', 'bañarse', 'mejorar', 'empeorar', 'insistir', 'insistir en', 'seguir'],
      reasons: [['porque el cuerpo avisa antes de romperse', 'because the body warns before it breaks'],
        ['porque cuidarse cuesta menos que curarse', 'because prevention costs less than a cure'],
        ['porque el sueño lo cambia todo', 'because sleep changes everything']],
    }),
    school: field({
      label: 'school & learning', icon: '🎓', cats: ['education', 'planning', 'communication'],
      keys: ['escuela', 'colegio', 'universidad', 'estudiar', 'estudio', 'clase', 'maestro', 'profesor',
        'tarea', 'examen', 'curso', 'inglés', 'español', 'idioma', 'aprender', 'bachillerato', 'tesis',
        'biblioteca', 'homework', 'school', 'study', 'university', 'teacher', 'course', 'curso de', 'capacitación',
        'certificación', 'práctica', 'nota', 'calificación', 'grado', 'beca', 'educación', 'maestría', 'doctorado'],
      easyNouns: [['la escuela', 'the school'], ['el libro', 'the book'], ['la clase', 'the class'],
        ['el maestro', 'the teacher'], ['la tarea', 'the homework'], ['el cuaderno', 'the notebook'],
        ['la palabra', 'the word'], ['el examen', 'the exam'], ['la lección', 'the lesson'],
        ['la pizarra', 'the board'], ['el inglés', 'English']],
      nouns: [['el curso', 'the course'], ['la tesis', 'the thesis'], ['el semestre', 'the semester'],
        ['la biblioteca', 'the library'], ['un grupo de estudio', 'a study group'], ['el examen de admisión', 'the entrance exam'],
        ['las notas finales', 'the final grades'], ['el taller', 'the workshop'], ['la beca', 'the scholarship'],
        ['una lengua extranjera', 'a foreign language'], ['el aprendizaje', 'the learning process']],
      inPlaces: [['en la escuela', 'at school'], ['en la universidad', 'at university'], ['en la biblioteca', 'in the library'],
        ['en clase', 'in class'], ['en un curso nocturno', 'in an evening course'], ['en línea', 'online']],
      toPlaces: [['a clase', 'to class'], ['a la escuela', 'to school'], ['a la biblioteca', 'to the library'],
        ['a un taller', 'to a workshop'], ['a la universidad', 'to university']],
      times: [['todas las tardes', 'every afternoon'], ['antes del examen', 'before the exam'],
        ['en el recreo', 'at break time'], ['dos horas al día', 'two hours a day'], ['el próximo ciclo', 'next term'],
        ['los martes y los jueves', 'on Tuesdays and Thursdays']],
      adjs: [['difícil', 'difíciles'], ['útil', 'útiles'], ['obligatorio'], [' teórico', 'teóricos'],
        ['práctico'], ['lento'], ['constante', 'constantes'], ['básico']],
      verbs: ['estudiar', 'aprender', 'leer', 'escribir', 'entender', 'comprender', 'practicar', 'repasar',
        'memorizar', 'entregar', 'aprobar', 'reprobar', 'preguntar', 'responder', 'explicar', 'resumir',
        'copiar', 'preparar', 'asistir', 'faltar', 'repetir', 'terminar', 'empezar', 'continuar', 'ayudar',
        'olvidar', 'recordar', 'necesitar', 'poder', 'querer', 'mejorar', 'dudar'],
      reasons: [['porque un idioma se aprende usándolo', 'because a language is learned by using it'],
        ['porque los errores enseñan más que la memoria', 'because mistakes teach more than memorising'],
        ['porque nadie aprueba solo', 'because nobody passes alone']],
    }),
    city: field({
      label: 'the city & services', icon: '🏙️', cats: ['city', 'shopping', 'errands', 'home'],
      keys: ['ciudad', 'transporte', 'metro', 'autobús', 'tráfico', 'calle', 'vecino', 'barrio', 'renta',
        'vecindad', 'agua', 'luz', 'basura', 'seguridad', 'policía', 'servicio', 'obra', 'parque', 'plaza',
        'mercado público', 'aseo', 'contaminación', 'ruido', 'city', 'neighbourhood', 'traffic', 'parking',
        'banco', 'correo', 'luz', 'agua potable', 'drenaje', 'alcaldía', 'municipio', 'alcaldía'],
      easyNouns: [['la ciudad', 'the city'], ['la calle', 'the street'], ['el autobús', 'the bus'],
        ['el parque', 'the park'], ['la plaza', 'the square'], ['la tienda', 'the shop'], ['el semáforo', 'the traffic light'],
        ['la basura', 'the rubbish'], ['el agua', 'the water'], ['la luz', 'the electricity']],
      nouns: [['el transporte público', 'public transport'], ['el tráfico', 'the traffic'], ['el ruido', 'the noise'],
        ['el recibo de la luz', 'the electricity bill'], ['la recolección de basura', 'the garbage collection'],
        ['una fila en el banco', 'a queue at the bank'], ['el estacionamiento', 'the parking lot'],
        ['la obra pública', 'public works'], ['el alumbrado', 'the street lighting'], ['un servicio lento', 'a slow service'],
        ['la línea del metro', 'the metro line']],
      inPlaces: [['en el metro', 'in the metro'], ['en la calle', 'in the street'], ['en el camión', 'on the bus'],
        ['en la alcaldía', 'at the city hall'], ['en la fila', 'in the queue'], ['en el mercado público', 'at the public market']],
      toPlaces: [['a la alcaldía', 'to the city hall'], ['al centro', 'to the centre'], ['a la parada', 'to the stop'],
        ['a la tienda', 'to the shop'], ['a otra ciudad', 'to another city']],
      times: [['a las ocho', 'at eight'], ['en hora pico', 'at rush hour'], ['cada mañana', 'every morning'],
        ['los domingos', 'on Sundays'], ['a media noche', 'at midnight'], ['una vez al año', 'once a year']],
      adjs: [['cercano'], ['cómodo', 'cómodos'], ['ruidoso'], ['público'], ['caro'], ['seguro'], ['lento'],
        ['saturado', 'saturados'], ['inseguro'], ['accesible', 'accesibles']],
      verbs: ['pagar', 'esperar', 'caminar', 'manejar', 'conducir', 'cruzar', 'subir', 'bajar', 'faltar',
        'sobrar', 'reclamar', 'denunciar', 'avisar', 'pedir', 'necesitar', 'usar', 'llegar', 'salir',
        'entrar', 'estacionarse', 'cambiar', 'mejorar', 'funcionar', 'fallar', 'reparar', 'construir'],
      reasons: [['porque la ciudad se mide en tiempos de traslado', 'because a city is measured in commute times'],
        ['porque todo el mundo comparte los mismos servicios', 'because everyone shares the same services'],
        ['porque los problemas del barrio se ven en la calle', 'because the neighbourhood\u2019s problems show up in the street']],
    }),
    nature: field({
      label: 'nature & environment', icon: '🌵', cats: ['nature', 'weather', 'environment'],
      keys: ['naturaleza', 'medio ambiente', 'ambiente', 'agua', 'animales', 'perro', 'gato', 'reciclaje',
        'plástico', 'clima', 'bosque', 'mar', 'montaña', 'volcán', 'sequía', 'contaminación', 'energía',
        'solar', 'basura', 'río', 'selva', 'desierto', 'especie', 'extinción', 'ambiente', 'weather',
        'climate', 'environment', 'animals', 'pets', 'recycling', 'pollution', 'forest', 'beach cleanup',
        'huracán', 'lluvia', 'temblor', 'sismo'],
      easyNouns: [['el agua', 'the water'], ['el mar', 'the sea'], ['el perro', 'the dog'], ['el gato', 'the cat'],
        ['el árbol', 'the tree'], ['la montaña', 'the mountain'], ['el sol', 'the sun'], ['la lluvia', 'the rain'],
        ['el viento', 'the wind'], ['la planta', 'the plant'], ['el animal', 'the animal'], ['el cielo', 'the sky']],
      nouns: [['el desierto', 'the desert'], ['la selva', 'the jungle'], ['los océanos', 'the oceans'],
        ['el reciclaje', 'recycling'], ['la contaminación', 'the pollution'], ['una especie en riesgo', 'an endangered species'],
        ['el huracán', 'the hurricane'], ['la sequía', 'the drought'], ['la energía solar', 'solar energy'],
        ['el volcán', 'the volcano'], ['los manglares', 'the mangroves'], ['un sismo', 'an earthquake']],
      inPlaces: [['en el bosque', 'in the forest'], ['en la orilla', 'on the shore'], ['en el desierto', 'in the desert'],
        ['en el jardín', 'in the garden'], ['en la montaña', 'in the mountains'], ['en el río', 'in the river']],
      toPlaces: [['al bosque', 'to the forest'], ['al río', 'to the river'], ['a la montaña', 'to the mountains'],
        ['al desierto', 'to the desert'], ['al mar', 'to the sea']],
      times: [['en temporada de lluvias', 'in the rainy season'], ['al amanecer', 'at dawn'], ['en la madrugada', 'in the early morning'],
        ['cada verano', 'every summer'], ['después de la tormenta', 'after the storm'], ['durante el sismo', 'during the earthquake']],
      adjs: [['verde'], ['seco'], ['contaminado'], ['protegido'], ['silvestre', 'silvestres'], ['natural'],
        ['escaso', 'escasos'], ['lluvioso'], ['frío'], ['caluroso']],
      verbs: ['cuidar', 'proteger', 'reciclar', 'contaminar', 'limpiar', 'sembrar', 'regar', 'proteger',
        'conservar', 'sobrevivir', 'llover', 'nevar', 'oler', 'caminar', 'correr', 'nadar', 'surfear',
        'observar', 'avisar', 'ayudar', 'faltar', 'aumentar', 'disminuir', 'mejorar', 'cambiar', 'persistir'],
      reasons: [['porque el clima no pide permiso', 'because the weather asks no permission'],
        ['porque lo que se tira sigue aquí mañana', 'because what we throw away is still here tomorrow'],
        ['porque cada región tiene su propio clima', 'because every region has its own weather']],
    }),
    sport: field({
      label: 'sport & free time', icon: '⚽', cats: ['leisure', 'body', 'clothes'],
      keys: ['deporte', 'futbol', 'fútbol', 'ejercicio', 'gimnasio', 'correr', 'natación', 'box', 'olimpiadas',
        'olímpico', 'entrenamiento', 'partido', 'liga', 'equipo', 'carrera', 'yoga', 'baile', 'bailar',
        'música', 'concierto', 'película', 'cine', 'juego', 'videojuegos', 'hobby', 'afición', 'sport',
        'football', 'gym', 'running', 'match', 'practice', 'práctica', 'tenis', 'beisbol', 'basquetbol'],
      easyNouns: [['el fútbol', 'football'], ['el partido', 'the match'], ['la pelota', 'the ball'],
        ['el gimnasio', 'the gym'], ['la carrera', 'the race'], ['el equipo', 'the team'], ['la música', 'the music'],
        ['la canción', 'the song'], ['el baile', 'the dance'], ['la película', 'the film'], ['el juego', 'the game']],
      nouns: [['el entrenamiento', 'the training'], ['la Liga MX', 'the Mexican league'], ['un partido de fútbol', 'a football match'],
        ['el estadio', 'the stadium'], ['la rutina diaria', 'the daily routine'], ['un concierto', 'a concert'],
        ['la Selección Mexicana', 'the national team'], ['la final', 'the final'], ['el tenis', 'tennis'],
        ['la natación', 'swimming'], ['un maratón', 'a marathon'], ['la barra de karaoke', 'the karaoke bar']],
      inPlaces: [['en la cancha', 'on the court'], ['en el estadio', 'in the stadium'], ['en el gimnasio', 'at the gym'],
        ['en la alberca', 'in the pool'], ['en el parque', 'in the park'], ['en el foro', 'at the venue']],
      toPlaces: [['al entrenamiento', 'to the training'], ['al estadio', 'to the stadium'], ['a un concierto', 'to a concert'],
        ['a la cancha', 'to the court'], ['al gimnasio', 'to the gym'], ['a un partido', 'to a match']],
      times: [['tres veces por semana', 'three times a week'], ['los sábados', 'on Saturdays'], ['al atardecer', 'at dusk'],
        ['antes del desayuno', 'before breakfast'], ['en la final', 'in the final'], ['cada temporada', 'every season']],
      adjs: [['rápido'], ['cansado'], ['competitivo', 'competitivos'], ['entretenido'], ['emocionante', 'emocionantes'],
        ['aficionado'], ['profesional', 'profesionales'], ['ganador', 'ganadores'], ['activo']],
      verbs: ['jugar', 'correr', 'caminar', 'nadar', 'bailar', 'cantar', 'entrenar', 'practicar', 'ganar',
        'perder', 'competir', 'intentar', 'descansar', 'divertirse', 'aplaudir', 'asistir', 'apostar',
        'seguir', 'aprender', 'mejorar', 'empeorar', 'soler', 'poder', 'querer', 'dejar', 'continuar'],
      reasons: [['porque el cuerpo recuerda lo que la mente abandona', 'because the body remembers what the mind drops'],
        ['porque ganar también se aprende perdiendo', 'because winning is also learned by losing'],
        ['porque el descanso es parte del entrenamiento', 'because rest is part of the training']],
    }),
    tech: field({
      label: 'technology & media', icon: '📱', cats: ['communication', 'abstract'],
      keys: ['tecnología', 'tecnologia', 'teléfono', 'telefono', 'celular', 'redes', 'redes sociales', 'internet',
        'computadora', 'ordenador', 'app', 'aplicación', 'inteligencia artificial', 'ia', 'videojuegos',
        'televisión', 'noticias', 'podcast', 'correo', 'WhatsApp', 'tecnologia', 'technology', 'phone',
        'social media', 'online', 'software', 'datos', 'privacidad', 'ciberseguridad', 'robots', 'automático'],
      easyNouns: [['el teléfono', 'the phone'], ['la computadora', 'the computer'], ['internet', 'the internet'],
        ['el correo', 'the email'], ['la pantalla', 'the screen'], ['la foto', 'the photo'], ['el mensaje', 'the message'],
        ['la aplicación', 'the app'], ['la noticia', 'the news'], ['el video', 'the video']],
      nouns: [['las redes sociales', 'social media'], ['la inteligencia artificial', 'artificial intelligence'],
        ['un grupo de WhatsApp', 'a WhatsApp group'], ['la pantalla del celular', 'the phone screen'],
        ['la privacidad', 'privacy'], ['una aplicación nueva', 'a new app'], ['los datos personales', 'personal data'],
        ['la notificación', 'the notification'], ['una noticia falsa', 'a fake news story'], ['el algoritmo', 'the algorithm']],
      inPlaces: [['en el celular', 'on the phone'], ['en internet', 'online'], ['en la red', 'on the network'],
        ['en la tele', 'on TV'], ['en un grupo familiar', 'in a family group chat'], ['en la pantalla', 'on the screen']],
      toPlaces: [['a la pantalla', 'to the screen'], ['a un sitio web', 'to a website'], ['a un grupo', 'to a group chat']],
      times: [['todo el día', 'all day'], ['cada vez que suena', 'every time it rings'], ['antes de dormir', 'before sleeping'],
        ['en tiempo real', 'in real time'], ['de madrugada', 'in the small hours'], ['una hora al día', 'one hour a day']],
      adjs: [['virtual'], ['automático'], ['instantáneo'], ['peligroso'], ['útil', 'útiles'], ['nuevo'],
        ['digital'], ['masivo'], ['privado'], ['rápido']],
      verbs: ['usar', 'enviar', 'publicar', 'compartir', 'revisar', 'descargar', 'grabar', 'editar', 'chatear',
        'llamar', 'contestar', 'escribir', 'leer', 'buscar', 'encontrar', 'comprobar', 'verificar', 'confiar',
        'desconfiar', 'conectar', 'apagar', 'encender', 'cargar', 'funcionar', 'fallar', 'mejorar', 'aprender'],
      reasons: [['porque nadie revisa lo que ya todos compartieron', 'because nobody checks what everybody already shared'],
        ['porque la herramienta no cambia la intención', 'because the tool does not change the intention'],
        ['porque el ruido llega más rápido que la explicación', 'because noise travels faster than the explanation']],
    }),
    culture: field({
      label: 'culture & traditions', icon: '🎭', cats: ['culture', 'society', 'idioms'],
      keys: ['cultura', 'música', 'musica', 'cine', 'danza', 'baile', 'arte', 'tradición', 'tradicion',
        'festival', 'día de muertos', 'dia de muertos', 'independencia', 'revolución', 'revolucion',
        'historia', 'patrimonio', 'folclor', 'mariachi', 'literatura', 'pintura', 'poesía', 'teatro',
        'museo', 'artesanía', 'lengua', 'español', 'idioma', 'costumbre', 'celebración', 'verbena',
        'cultura pop', 'cumbia', 'ranchera', 'rock', 'banda', 'sierreño', 'gastronomía', 'barrio'],
      easyNouns: [['la música', 'the music'], ['la canción', 'the song'], ['el baile', 'the dance'],
        ['la fiesta', 'the party'], ['el arte', 'the art'], ['la pintura', 'the painting'], ['la historia', 'the story'],
        ['la lengua', 'the language'], ['el museo', 'the museum'], ['la tradición', 'the tradition'],
        ['el festival', 'the festival'], ['la película', 'the film']],
      nouns: [['el Día de Muertos', 'the Day of the Dead'], ['la Independencia', 'Independence'],
        ['la Revolución Mexicana', 'the Mexican Revolution'], ['el mariachi', 'the mariachi'],
        ['una ofrenda', 'an ofrenda'], ['el patrimonio', 'the heritage'], ['la lengua náhuatl', 'the Nahuatl language'],
        ['el arte popular', 'folk art'], ['una danza tradicional', 'a traditional dance'], ['la fecha histórica', 'the historical date'],
        ['el símbolo patrio', 'the national symbol'], ['un barrio histórico', 'a historic neighbourhood']],
      inPlaces: [['en el museo', 'in the museum'], ['en la plaza', 'in the square'], ['en el teatro', 'in the theatre'],
        ['en la ofrenda', 'on the ofrenda'], ['en un festival', 'at a festival'], ['en la verbena', 'at the street fair']],
      toPlaces: [['al museo', 'to the museum'], ['a un concierto', 'to a concert'], ['a la función', 'to the show'],
        ['al festival', 'to the festival'], ['a la ceremonia', 'to the ceremony'], ['a la ofrenda', 'to the ofrenda']],
      times: [['el dos de noviembre', 'on the second of November'], ['cada septiembre', 'every September'],
        ['por la noche', 'at night'], ['una vez al año', 'once a year'], ['el fin de semana festivo', 'on the holiday weekend'],
        ['desde la colonia', 'since colonial times']],
      adjs: [['tradicional', 'tradicionales'], ['típico'], ['histórico'], ['popular', 'populares'], ['patrimonial'],
        ['colorido'], ['ancestral', 'ancestrales'], ['vivo'], ['simbólico']],
      verbs: ['celebrar', 'bailar', 'cantar', 'actuar', 'pintar', 'escribir', 'leer', 'contar', 'recordar',
        'conservar', 'preservar', 'restaurar', 'prohibir', 'permitir', 'transmitir', 'difundir', 'representar',
        'demostrar', 'reconocer', 'aprender', 'enseñar', 'visitar', 'participar', 'compartir', 'disfrutar', 'admirar'],
      reasons: [['porque una tradición solo vive si alguien la repite', 'because a tradition only lives if someone repeats it'],
        ['porque la historia depende de quién la cuente', 'because history depends on who tells it'],
        ['porque el arte dice lo que la política calla', 'because art says what politics keeps silent about']],
    }),
    feelings: field({
      label: 'feelings & people', icon: '❤️', cats: ['feelings', 'personality', 'appearance', 'psychology'],
      keys: ['sentimientos', 'amor', 'amistad', 'amigo', 'ansiedad', 'miedo', 'nostalgia', 'felicidad',
        'enojo', 'celos', 'tristeza', 'salud mental', 'terapia', 'emoción', 'estres', 'estrés', 'personalidad',
        'carácter', 'respeto', 'confianza', 'feelings', 'love', 'friendship', 'anxiety', 'mental health',
        'autoestima', 'motivación', 'orgullo', 'verguenza', 'aburrido'],
      easyNouns: [['el amor', 'love'], ['la amistad', 'friendship'], ['el miedo', 'fear'], ['la calma', 'calm'],
        ['la alegría', 'joy'], ['la tristeza', 'sadness'], ['un amigo', 'a friend'], ['el corazón', 'the heart'],
        ['la confianza', 'trust'], ['la sonrisa', 'the smile']],
      nouns: [['la nostalgia', 'nostalgia'], ['la ansiedad', 'anxiety'], ['la autoestima', 'self-esteem'],
        ['una conversación difícil', 'a difficult conversation'], ['el respeto propio', 'self-respect'],
        ['un malentendido', 'a misunderstanding'], ['la paciencia', 'patience'], ['un apoyo sincero', 'sincere support'],
        ['la valentía', 'courage'], ['los celos', 'jealousy']],
      inPlaces: [['en la terapia', 'in therapy'], ['en casa', 'at home'], ['con mis amigos', 'with my friends'],
        ['en el silencio', 'in the silence'], ['en una plática', 'in a chat'], ['en la distancia', 'at a distance']],
      toPlaces: [['a la terapia', 'to therapy'], ['a casa de un amigo', "to a friend's house"], ['a una charla', 'to a chat']],
      times: [['por las noches', 'at night'], ['cuando estoy solo', 'when I am alone'],
        ['cada vez que dudo', 'every time I doubt'],
        ['después de una plática', 'after a talk'], ['cuando hace frío', 'when it is cold'], ['sin aviso', 'without warning']],
      adjs: [['nervioso'], ['tranquilo'], ['agradecido'], ['solo', 'solos'], ['valiente', 'valientes'],
        ['honesto', 'honestos'], ['cansado'], ['esperanzado'], ['tímido', 'tímidos'], ['orgulloso']],
      verbs: ['sentir', 'sentirse', 'estar', 'querer', 'necesitar', 'confiar', 'perdonar', 'agradecer',
        'escuchar', 'hablar', 'expresar', 'abrazar', 'acompañar', 'animar', 'preocuparse', 'ocuparse',
        'olvidar', 'recordar', 'emocionar', 'asustar', 'relajarse', 'meditar', 'dudar', 'creer', 'entender',
        'comprender', 'valorar', 'respetar', 'ayudar', 'pedir'],
      reasons: [['porque nombrar lo que siento ya lo cambia', 'because naming what I feel already changes it'],
        ['porque nadie madura solo', 'because nobody grows up alone'],
        ['porque la calma también se entrena', 'because calm is trained too']],
    }),
    civics: field({
      label: 'civics & Mexico', icon: '🇲🇽', cats: ['society', 'legal', 'economy', 'civica', 'conceptos', 'personas', 'fechas', 'lugares', 'comida'],
      keys: ['méxico', 'mexico', 'mexicana', 'mexicano', 'independencia', 'revolución', 'constitución',
        'ley', 'leyes', 'gobierno', 'elecciones', 'derechos', 'deberes', 'ciudadanía', 'naturalización',
        'pasaporte', 'bandera', 'escudo', 'presidente', 'senado', 'congreso', 'INE', 'SEP', 'IMPBEX',
        'história', 'historia', 'civil', 'migración', 'inmigrante', 'aduana', 'CURP', 'RFC', 'acta',
        'registro civil', 'plaza', 'hidalgo', 'juárez', 'zapata', 'madero', 'fray', 'himno', 'Moneda',
        'símbolos patrios', 'soberanía', 'democracia', 'voto', 'partido', 'constitucional', 'Artículo'],
      easyNouns: [['la bandera', 'the flag'], ['la ley', 'the law'], ['el país', 'the country'],
        ['la ciudad', 'the city'], ['el gobierno', 'the government'], ['la historia', 'the history'],
        ['el voto', 'the vote'], ['el pasaporte', 'the passport'], ['México', 'Mexico'], ['la plaza', 'the square']],
      nouns: [['la Constitución', 'the Constitution'], ['la Independencia', 'Independence'],
        ['los símbolos patrios', 'the national symbols'], ['el águila', 'the eagle'], ['el nopal', 'the nopal cactus'],
        ['la Revolución Mexicana', 'the Mexican Revolution'], ['el INE', 'the electoral institute'],
        ['una ley federal', 'a federal law'], ['el Grito de Dolores', 'the Cry of Dolores'],
        ['el día festivo', 'the public holiday'], ['la Curp', 'the CURP ID number'], ['un acto cívico', 'a civic ceremony'],
        ['el poder judicial', 'the judiciary'], ['el artículo constitucional', 'the constitutional article']],
      inPlaces: [['en el consulado', 'at the consulate'], ['en la oficina de migración', 'at the immigration office'],
        ['en la plaza pública', 'in the public square'], ['en el registro civil', 'at the civil registry'],
        ['en la escuela cívica', 'in the civic class'], ['en el tribunal electoral', 'at the electoral court']],
      toPlaces: [['a la entrevista', 'to the interview'], ['al consulado', 'to the consulate'],
        ['a la mesa directiva', 'to the polling station'], ['al registro civil', 'to the civil registry'],
        ['a la ceremonia', 'to the ceremony']],
      times: [['en mil ochocientos diez', 'in eighteen ten'], ['el dieciséis de septiembre', 'on the sixteenth of September'],
        ['cada seis años', 'every six years'], ['desde mil novecientos diecisiete', 'since nineteen seventeen'],
        ['el veinte de noviembre', 'on the twentieth of November'], ['en la fecha cívica', 'on the civic date']],
      adjs: [['nacional'], ['constitucional', 'constitucionales'], ['cívico'], ['federal', 'federales'],
        ['obligatorio'], ['público'], ['soberano'], ['legal'], ['histórico'], ['popular', 'populares']],
      verbs: ['cumplir', 'respetar', 'participar', 'votar', 'conocer', 'demostrar', 'comprobar', 'recordar',
        'aprender', 'practicar', 'preparar', 'considerar', 'comprender', 'ayudar', 'vivir', 'formar',
        'firmar', 'declarar', 'jurar', 'defender', 'proteger', 'garantizar', 'limitar', 'permitir',
        'prohibir', 'organizar', 'publicar', 'reformar', 'aplicar', 'acatar', 'participar', 'presidir'],
      reasons: [['porque la ciudadanía se ejerce, no solo se obtiene', 'because citizenship is practised, not just obtained'],
        ['porque las fechas explican el presente', 'because the dates explain the present'],
        ['porque la ley protege más cuando se conoce', 'because the law protects more when it is known']],
    }),
  };

  /* the fallback field: whatever the user typed, the text still works */
  FIELDS.general = field({
    label: 'your topic', icon: '💬', cats: ['abstract', 'planning', 'time'],
    keys: [],
    easyNouns: [['la idea', 'the idea'], ['el ejemplo', 'the example'], ['la pregunta', 'the question'],
      ['el tema', 'the topic'], ['la gente', 'people'], ['la conversación', 'the conversation'],
      ['el día', 'the day'], ['la palabra', 'the word'], ['la duda', 'the doubt'], ['el resumen', 'the summary']],
    nouns: G.genericNouns.map(x => [x.es, x.en]),
    times: G.times.map(x => [x.es, x.en]),
    inPlaces: G.inPlaces.map(x => [x.es, x.en]),
    toPlaces: G.toPlaces.map(x => [x.es, x.en]),
    adjs: SAFE_INVARIANT.map(a => [a.m]),
    reasons: G.reasons.map(x => [x.es, x.en]),
    verbs: G.genericVerbs,
  });



  /* ================================================================== */
  /* conjugation repair layer                                            */
  /*   The deck engine (data-verbs200.js) is the app's own source of     */
  /*   truth for presente + preterite, but its tables only cover the      */
  /*   handout verbs. The topic engine therefore applies the productive   */
  /*   orthographic rules it can prove, keeps a small fix table for the    */
  /*   banks' oddballs, and DROPS any verb that still looks wrong: a       */
  /*   generated sentence must never contain "agradeco" or "construo".     */
  /* ================================================================== */
  const IRREG_PARADIGM = {
    tener: { present: ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen'],
      preterite: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvieron'] },
    venir: { present: ['vengo', 'vienes', 'viene', 'venimos', 'vienen'],
      preterite: ['vine', 'viniste', 'vino', 'vinimos', 'vinieron'] },
  };
  const FIX = {
    prohibir: { present: ['prohíbo', 'prohíbes', 'prohíbe', 'prohibimos', 'prohíben'] },
    evaluar: { present: ['evalúo', 'evalúas', 'evalúa', 'evaluamos', 'evalúan'] },
    actuar: { present: ['actúo', 'actúas', 'actúa', 'actuamos', 'actúan'] },
    graduar: { present: ['gradúo', 'gradúas', 'gradúa', 'graduamos', 'gradúan'] },
    corregir: { present: ['corrijo', 'corriges', 'corrige', 'corregimos', 'corrijen'] },
    medir: { present: ['mido', 'mides', 'mide', 'medimos', 'miden'] },
    impedir: { present: ['impido', 'impides', 'impide', 'impedimos', 'impiden'] },
    rendir: { present: ['rindo', 'rindes', 'rinde', 'rendimos', 'rinden'] },
    parecer: { present: ['parezco', 'pareces', 'parece', 'parecemos', 'parecen'] },
    pertenecer: { present: ['pertenezco', 'perteneces', 'pertenece', 'pertenecemos', 'pertenecen'] },
    llover: { present: ['llueve', 'llueve', 'llueve', 'llovemos', 'llueven'], defective: true },
    nevar: { present: ['nieva', 'nieva', 'nieva', 'nevamos', 'nievan'], defective: true },
  };
  const PLAIN = /^(perder|entender|aprender|comprender|vender|defender|depender|responder|desprender|beber|comer|correr|mover|deber|saber|leer|creer|traer|caer|oír|ver)/;
  const STEM_I = new Set(['medir', 'impedir', 'corregir', 'repetir', 'competir', 'preferir', 'seguir',
    'conseguir', 'pedir', 'vestir', 'servir', 'elegir', 'sentir', 'dormir', 'morir', 'mentir',
    'advertir', 'herir', 'prohibir', 'rendir', 'despedir', 'expedir']);

  function repair(bare, present, preterite) {
    const out = { present: present.slice(), preterite: preterite.slice(), defective: false };
    const fix = FIX[bare];
    if (fix && fix.defective) out.defective = true;
    const isAr = /ar$/.test(bare);
    const stem = bare.slice(0, -2);
    if (/(cer|cir)$/.test(bare) && bare !== 'hacer' && !/zco$/.test(out.present[0])) {
      const st = stem.slice(0, -1);
      out.present = [st + 'zco', stem + 'es', stem + (isAr ? 'a' : 'e'),
        stem + (isAr ? 'amos' : 'imos'), stem + 'en'];
    }
    if (/(ger|gir)$/.test(bare) && !/jo$/.test(out.present[0])) {
      const st = stem.slice(0, -1);
      out.present = [st + 'jo', stem + 'es', stem + (isAr ? 'a' : 'e'),
        stem + (isAr ? 'amos' : 'imos'), stem + 'en'];
      if (isAr) out.present = [st + 'jo', stem + 'as', stem + 'a', stem + 'amos', stem + 'an'];
    }
    if (/uir$/.test(bare) && !/yo$/.test(out.present[0])) {
      out.present = [stem + 'yo', stem + 'yes', stem + 'ye', stem + 'imos', stem + 'yen'];
      out.preterite = [out.preterite[0], out.preterite[1], stem + 'yó', out.preterite[3], stem + 'yeron'];
    }
    if (/(aer|oer)$/.test(bare) && bare !== 'poseer' && !/go$/.test(out.present[0])) {
      out.present = [stem + 'go', stem + 'es', stem + 'er'.endsWith(bare.slice(-2)) ? 'e' : 'e',
        stem + 'emos', stem + 'en'];
      if (bare === 'leer' || bare === 'creer') out.present = [stem + 'o', stem + 'es', stem + 'e', stem + 'emos', stem + 'en'];
    }
    const comp = /(tener|venir)$/.exec(bare);
    if (comp && !/go$/.test(out.present[0])) {
      const pre = bare.slice(0, bare.length - comp[1].length);
      out.present = IRREG_PARADIGM[comp[1]].present.map(f => pre + f);
      out.preterite = IRREG_PARADIGM[comp[1]].preterite.map(f => pre + f);
    }
    if (fix && fix.present) out.present = fix.present.slice();
    if (fix && fix.preterite) out.preterite = fix.preterite.slice();
    return out;
  }

  /* does this verb belong to an irregular class the deck has no data for? */
  function riskyClass(bare) {
    if (FIX[bare]) return false;
    if (/(cer|cir)$/.test(bare) && bare !== 'hacer') return true;
    if (/(ger|gir)$/.test(bare)) return true;
    if (/uir$/.test(bare) || /guir$/.test(bare)) return true;
    if (/(tener|venir)$/.test(bare)) return true;
    if (/(aer|oer)$/.test(bare) && !PLAIN.test(bare)) return true;
    if (/uar$/.test(bare) && !/[gc]uar$/.test(bare)) return true;
    if (/(ender|endir|ertir|ercir|ornar|olver|ucir|ducir|ecir|prir|irir|acer|ocer)$/.test(bare) && !PLAIN.test(bare)) return true;
    if (/ir$/.test(bare) && /[aeo]$/.test(stemVowel(bare)) && !STEM_I.has(bare) && !PLAIN.test(bare)) return true;
    return false;
  }
  function stemVowel(bare) {
    const stem = bare.slice(0, -2);
    const m = /[aeiou]/.exec(stem.slice(-1));
    return m ? stem.slice(-1) : '';
  }
  function trusted(bare, deck) {
    if (!deck) return false;
    if (!riskyClass(bare)) return true;
    /* risky class → accept only when the deck's own table clearly handled it
       (a visible stem change or an irregular preterite), or when FIX did */
    if (FIX[bare]) return true;
    const p = deck.present && deck.present[0];
    const changed = deck.present && deck.present.some((f, i) => i !== 3 && f.indexOf(bare.slice(0, -2)) !== 0);
    return !!(p && (changed || deck.irregular));
  }

  /* ------------------------------------------------------------------ */
  /* level grammar profile                                               */
  /* ------------------------------------------------------------------ */
  const LEVELS = {
    A1: { order: 0, tenses: ['presente', 'ir-a'], persons: ['yo', 'tu', 'el', 'ella', 'nosotros'],
      weights: { presente: 3, 'ir-a': 1 } },
    A2: { order: 1, tenses: ['presente', 'pretérito', 'ir-a'],
      persons: ['yo', 'tu', 'el', 'ella', 'nosotros', 'ellos'], weights: { presente: 2, pretérito: 3, 'ir-a': 1 } },
    B1: { order: 2, tenses: ['presente', 'pretérito', 'imperfecto', 'futuro', 'condicional', 'ir-a'],
      persons: ['yo', 'tu', 'el', 'ella', 'nosotros', 'ellos', 'usted'],
      weights: { presente: 3, pretérito: 2, imperfecto: 2, futuro: 1, condicional: 1, 'ir-a': 1 } },
    B2: { order: 3, tenses: ['presente', 'pretérito', 'imperfecto', 'futuro', 'condicional', 'perfecto',
      'pluscuamperfecto', 'cond-perfecto', 'subjuntivo'],
      persons: ['yo', 'tu', 'el', 'ella', 'nosotros', 'ellos', 'usted'],
      weights: { presente: 3, pretérito: 2, imperfecto: 2, futuro: 1, condicional: 1, perfecto: 2, pluscuamperfecto: 1, 'cond-perfecto': 1, subjuntivo: 2 } },
    EXAM: { order: 2, tenses: ['presente', 'pretérito', 'imperfecto', 'futuro'],
      persons: ['yo', 'el', 'ella', 'nosotros', 'usted'], formal: true,
      weights: { presente: 3, pretérito: 3, imperfecto: 1, futuro: 1 } },
  };

  /* ------------------------------------------------------------------ */
  /* pattern bank — slot frames, not finished sentences                   */
  /* ------------------------------------------------------------------ */
  const ROLES = ['open', 'context', 'action', 'opinion', 'contrast', 'plan', 'close', 'ask', 'answer'];
  const REST = ['context', 'action', 'opinion', 'contrast', 'plan', 'close', 'answer'];
  const T = [];
  function t(o) { T.push(o); }

  /* openers always carry the topic itself, which anchors the whole text */
  t({ id: 'open-about', roles: ['open'], need: ['obj'],
    es: '{C} sobre {TOP}, {S} {V} {N}', en: '{C}, on the subject of {TOP}, {S} {V} {N}' });
  t({ id: 'open-pp', roles: ['open'], need: ['pp'],
    es: '{C} {S} {V} {PTOP}', en: '{C}, {S} {V} {PPL} {TOP}' });
  t({ id: 'open-adv', roles: ['open'], need: ['adv'],
    es: '{C}, cuando hablamos de {TOP}, {S} {V} {T}', en: '{C}, when we talk about {TOP}, {S} {V} {T}' });
  t({ id: 'open-inf', roles: ['open'], need: ['inf'],
    es: '{C} {S} {V} {I} por causa de {TOP}', en: '{C}, {S} {V} to {I} because of {TOP}' });
  t({ id: 'open-que', roles: ['open'], need: ['que'], min: 2,
    es: '{C} {V} que {TOP} merece atención', en: '{C}, {S} {V} that {TOP} deserves attention' });

  /* context + action: the body of the text */
  t({ id: 'act-obj', roles: REST, need: ['obj'],
    es: '{C} {V} {N} {T}', en: '{C}, {S} {V} {N} {T}' });
  t({ id: 'act-obj-neg', roles: REST, need: ['obj'],
    es: '{C} no {V} {N} {T}', en: '{C}, {S} {V} {N} {T}', neg: true });
  t({ id: 'act-obj-before', roles: REST, need: ['obj'],
    es: '{T} {S} {V} {N}', en: '{T}, {S} {V} {N}' });
  t({ id: 'act-locin', roles: REST, need: ['locin'],
    es: '{C} {S} {V} {LI} {T}', en: '{C}, {S} {V} {LI} {T}' });
  t({ id: 'act-locto', roles: REST, need: ['locto'],
    es: '{C} {S} {V} {LT}', en: '{C}, {S} {V} {LT}' });
  t({ id: 'act-adv', roles: REST, need: ['adv'],
    es: '{C} {S} {V} {T}', en: '{C}, {S} {V} {T}' });
  t({ id: 'act-adv-neg', roles: REST, need: ['adv'],
    es: '{C} {S} nunca {V}', en: '{C}, {S} never {V}' });
  t({ id: 'act-inf', roles: REST, need: ['inf'],
    es: '{C} {S} {V} {I} {T}', en: '{C}, {S} {V} to {I} {T}' });
  t({ id: 'act-per', roles: REST, need: ['per'],
    es: '{C} {S} {V} a {PE}', en: '{C}, {S} {V} {PE}' });
  t({ id: 'act-pp', roles: REST, need: ['pp'],
    es: '{C} {S} {V} {PAB}', en: '{C}, {S} {V} {AB}' });
  t({ id: 'act-imp', roles: ['context', 'action'], need: ['imp'], person: ['el'],
    es: '{LI} {V} {T}', en: 'It {V} {T} {LI}' });
  t({ id: 'act-nsub', roles: REST, need: ['nsub'],
    es: '{N} {V} {ADV}', en: '{N} {V} {ADV}' });
  t({ id: 'act-nsub-t', roles: REST, need: ['nsub'],
    es: '{T} {N} {V}', en: '{T}, {N} {V}' });

  /* opinion / contrast / close */
  t({ id: 'op-adj', roles: ['opinion', 'close', 'answer'], need: ['adj'],
    es: '{C} {R} {V} {A}', en: '{C}, {R} {V} {A}' });
  t({ id: 'op-que', roles: ['opinion', 'contrast', 'close'], need: ['que'],
    es: '{C} {V} que {N} es {NADJ}', en: '{C}, {S} {V} that {N} is {NADJ}' });
  t({ id: 'op-obj-reason', roles: ['opinion', 'contrast'], need: ['obj'],
    es: '{C} {V} {N}, {RE}', en: '{C}, {S} {V} {N}, {RE}' });
  t({ id: 'op-adv-reason', roles: ['opinion', 'contrast'], need: ['adv'],
    es: '{C} {S} {V} {T}, {RE}', en: '{C}, {S} {V} {T}, {RE}' });
  t({ id: 'op-pp-reason', roles: ['opinion', 'contrast'], need: ['pp'],
    es: '{C} {S} {V} {PAB}, {RE}', en: '{C}, {S} {V} {AB}, {RE}' });
  t({ id: 'op-nsub', roles: ['opinion', 'contrast'], need: ['nsub'],
    es: '{N} {V} {ADV} {T}', en: '{N} {V} {ADV} {T}' });
  t({ id: 'close-obj', roles: ['close'], need: ['obj'],
    es: '{C} {V} {N}; {CL}', en: '{C}, {S} {V} {N}; {CL}' });
  t({ id: 'close-adv', roles: ['close'], need: ['adv'],
    es: '{C} {S} {V} {T}; {CL}', en: '{C}, {S} {V} {T}; {CL}' });
  t({ id: 'close-pp', roles: ['close'], need: ['pp'], person: ['el'],
    es: '{C} nadie {V} {PAB} dos veces igual', en: '{C}, nobody {V} {AB} the same way twice' });
  t({ id: 'plan-obj', roles: ['plan'], need: ['obj'],
    es: '{C} {V} {N} {T}', en: '{C}, {S} {V} {N} {T}' });
  t({ id: 'plan-inf', roles: ['plan'], need: ['inf'],
    es: '{C} {S} {V} {I} {T}', en: '{C}, {S} {V} to {I} {T}' });
  t({ id: 'plan-adv', roles: ['plan'], need: ['adv'],
    es: '{C} {S} {V} {T}', en: '{C}, {S} {V} {T}' });

  /* gustar-type: built from an experiencer, so the verb agrees with the thing */
  t({ id: 'exp-gustar', roles: ['opinion', 'answer', 'close'], need: ['exp'],
    es: 'A {EX} {EXC} {V} {N}', en: '{EX} {LIKE} {N}' });
  t({ id: 'exp-gustar-inf', roles: ['opinion', 'answer'], need: ['exp'],
    es: 'A {EX} {EXC} {V} {I} {T}', en: '{EX} {LIKE} to {I} {T}' });

  /* copulas: every level bank has ser/estar, and they need their own frames */
  t({ id: 'cop-noun', roles: REST, need: ['cop'],
    es: '{C} {N} {V} {NADJ}', en: '{C}, {N} {V} {NADJ}' });
  t({ id: 'cop-ref', roles: ['opinion', 'answer', 'close'], need: ['cop'], person: ['el'],
    es: '{C} {R} {V} {A}', en: '{C}, {R} {V} {A}' });
  t({ id: 'cop-top', roles: ['open'], need: ['cop'], person: ['el'],
    es: '{C} {TOP} {V} {A}', en: '{C}, {TOP} {V} {A}' });
  t({ id: 'cop-ask', roles: ['ask'], need: ['cop'], q: true, subjNoun: true, persons: ['tu', 'usted'],
    es: '¿{V} {N} {NADJ}?', en: '{BE} {N} {NADJEN}?' });
  t({ id: 'cop-loc', roles: REST, need: ['locin'],
    es: '{C} {N} {V} {LI}', en: '{C}, {N} {V} {LI}' });

  /* conversation turns */
  t({ id: 'ask-obj', roles: ['ask'], need: ['obj'], q: true, persons: ['tu', 'nosotros', 'usted'],
    es: '¿{V} {N} {T}?', en: '{DO} {S} {V} {N} {T}?' });
  t({ id: 'ask-inf', roles: ['ask'], need: ['inf'], q: true, persons: ['tu', 'usted', 'nosotros'],
    es: '¿{V} {I} {T}?', en: '{DO} {S} {V} to {I} {T}?' });
  t({ id: 'ask-adv', roles: ['ask'], need: ['adv'], q: true, persons: ['tu', 'usted', 'nosotros', 'ellos'],
    es: '¿{V} {T}?', en: '{DO} {S} {V} {T}?' });
  t({ id: 'ask-locin', roles: ['ask'], need: ['locin'], q: true, persons: ['tu', 'usted'],
    es: '¿{V} {LI}?', en: '{DO} {S} {V} {LI}?' });
  t({ id: 'ask-pp', roles: ['ask'], need: ['pp'], q: true, persons: ['tu', 'usted'],
    es: '¿{V} {PAB}?', en: '{DO} {S} {V} {AB}?' });
  t({ id: 'ans-obj', roles: ['answer'], need: ['obj'],
    es: '{K}, {S} {V} {N} {T}', en: '{K}, {S} {V} {N} {T}' });
  t({ id: 'ans-adv', roles: ['answer'], need: ['adv'], neg: true,
    es: '{K}, todavía {S} no {V} {T}', en: '{K}, {S} still {V} {T}' });
  t({ id: 'ans-inf', roles: ['answer'], need: ['inf'],
    es: '{K}, {S} {V} {I} {T}', en: '{K}, {S} {V} to {I} {T}' });
  t({ id: 'ans-locin', roles: ['answer'], need: ['locin'],
    es: '{K}, {S} {V} {LI} {T}', en: '{K}, {S} {V} {LI} {T}' });
  t({ id: 'ans-pp', roles: ['answer'], need: ['pp'],
    es: '{K}, {S} {V} {PAB} {T}', en: '{K}, {S} {V} {AB} {T}' });
  t({ id: 'ans-adj', roles: ['answer'], need: ['adj'],
    es: '{K}, {R} {V} {A}', en: '{K}, {R} {V} {A}' });

  /* higher ceilings only */
  t({ id: 'b1-more', roles: ['opinion', 'contrast'], need: ['obj'], min: 2,
    es: '{C} {V} {N} más que antes', en: '{C}, {S} {V} {N} more than before' });
  t({ id: 'b1-time-place', roles: ['context', 'action'], need: ['obj'], min: 2,
    es: '{T} {S} {V} {N} {LI}', en: '{T}, {S} {V} {N} {LI}' });
  t({ id: 'b2-subj-need', roles: ['opinion', 'plan', 'close'], need: ['subj'], tenses: ['subjuntivo'], min: 3,
    es: 'Es necesario que {N} {V} {ADV}', en: 'It is necessary that {N} {V} {ADV}' });
  t({ id: 'b2-subj-belief', roles: ['opinion', 'contrast'], need: ['subj'], tenses: ['subjuntivo'], min: 3,
    es: 'No creo que {N} {V} {T}', en: 'I do not think that {N} {V} {T}' });
  t({ id: 'b2-perfect', roles: ['opinion', 'contrast'], need: ['obj'], min: 3,
    es: '{C} {V} {N} {T}', en: '{C}, {S} {V} {N} {T}' });
  t({ id: 'b2-passive', roles: ['contrast', 'close'], need: ['obj'], min: 3, passive: true,
    es: '{N} {V} {T}', en: '{N} {V} {T}' });
  t({ id: 'exam-usted', roles: ['ask'], need: ['obj'], q: true, only: ['EXAM'], person: ['usted'],
    es: '¿{V} usted {N}?', en: 'Do you {V} {N}?' });
  t({ id: 'exam-history', roles: ['context', 'action', 'answer'], need: ['obj'], only: ['EXAM'],
    tenses: ['pretérito', 'imperfecto'], es: '{C} {S} {V} {N} {T}', en: '{C}, {S} {V} {N} {T}' });
  t({ id: 'exam-history-adv', roles: ['action'], need: ['adv'], only: ['EXAM'],
    tenses: ['pretérito', 'imperfecto'], es: 'En {YEAR} {S} {V} {N}', en: 'In {YEAR}, {S} {V} {N}' });

  const BY_ROLE = {};
  ROLES.forEach(r => { BY_ROLE[r] = T.filter(x => (x.roles || []).indexOf(r) >= 0); });


  /* ================================================================== */
  /* slot pools that have to agree with the tense of the sentence         */
  /* ================================================================== */
  const TENSE_GROUP = {
    'presente': 'pres', 'ir-a': 'fut', 'pretérito': 'past', 'imperfecto': 'past',
    'pluscuamperfecto': 'past', 'futuro': 'fut', 'condicional': 'fut', 'perfecto': 'perf',
    'cond-perfecto': 'perf', 'subjuntivo': 'any',
  };
  const TIMES = [
    ['hoy', 'today', 'pres'], ['ahora mismo', 'right now', 'pres'], ['todavía', 'still', 'pres'],
    ['todos los días', 'every day', 'pres'], ['a menudo', 'often', 'pres'], ['normalmente', 'normally', 'pres'],
    ['esta semana', 'this week', 'any'], ['los lunes', 'on Mondays', 'pres'],
    ['por las mañanas', 'in the mornings', 'pres'], ['en este momento', 'at the moment', 'pres'],
    ['ayer', 'yesterday', 'past'], ['anoche', 'last night', 'past'], ['la semana pasada', 'last week', 'past'],
    ['el año pasado', 'last year', 'past'], ['hace dos años', 'two years ago', 'past'],
    ['el domingo pasado', 'last Sunday', 'past'], ['cuando era niño', 'when I was a child', 'past'],
    ['en aquella época', 'at that time', 'past'], ['la última vez', 'the last time', 'past'],
    ['ese día', 'that day', 'past'], ['hace poco', 'a while ago', 'past'], ['el mes pasado', 'last month', 'past'],
    ['mañana', 'tomorrow', 'fut'], ['la semana que viene', 'next week', 'fut'], ['el año que viene', 'next year', 'fut'],
    ['pronto', 'soon', 'fut'], ['más adelante', 'later on', 'fut'], ['esta noche', 'tonight', 'fut'],
    ['en la próxima visita', 'on the next visit', 'fut'], ['dentro de un mes', 'in a month', 'fut'],
    ['el próximo verano', 'next summer', 'fut'],
    ['últimamente', 'lately', 'perf'], ['este año', 'this year', 'perf'], ['ya', 'already', 'perf'],
    ['varias veces', 'several times', 'perf'], ['esta temporada', 'this season', 'any'],
    ['en julio', 'in July', 'any'], ['los fines de semana', 'on weekends', 'any'],
    ['por la tarde', 'in the afternoon', 'any'], ['después del trabajo', 'after work', 'any'],
    ['en temporada de lluvias', 'in the rainy season', 'any'], ['con calma', 'quietly', 'any'],
  ].map(x => ({ es: x[0], en: x[1], group: x[2] }));

  const MANNER = [
    ['bien', 'well'], ['mal', 'badly'], ['mejor', 'better'], ['mucho', 'a lot'], ['poco', 'a little'],
    ['despacio', 'slowly'], ['sin prisa', 'without rushing'], ['en voz alta', 'out loud'],
    ['otra vez', 'again'], ['a medias', 'halfway'], ['con gusto', 'gladly'], ['en serio', 'seriously'],
  ].map(x => ({ es: x[0], en: x[1] }));

  const YEARS = [1810, 1821, 1857, 1910, 1917, 1938, 1968, 1985, 2000, 2010, 2018, 2024]
    .map(y => ({ es: String(y), en: String(y) }));

  const SUBJ_SUBJECTS = [
    { es: 'la gente', en: 'people', num: 's' }, { es: 'los estudiantes', en: 'students', num: 'p' },
    { es: 'mi hermano', en: 'my brother', num: 's' }, { es: 'los vecinos', en: 'the neighbours', num: 'p' },
    { es: 'todo el mundo', en: 'everybody', num: 's' },
  ];
  const REPLIES = [['Sí', 'Yes'], ['Claro', 'Of course'], ['Puede ser', 'Maybe'],
    ['Buena pregunta', 'Good question'], ['La verdad', 'Honestly'], ['Por ahora', 'For now'],
    ['Sí, ojalá', 'Yes, hopefully'], ['Fíjate', 'Look']];
  const WH = [['¿Cómo', 'How do'], ['¿Cuándo', 'When do'], ['¿Dónde', 'Where do'], ['¿Por qué', 'Why do']];

  /* ------------------------------------------------------------------ */
  /* topic → semantic field                                              */
  /* ------------------------------------------------------------------ */
  function stripAccents(s) { return LOWER(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function normText(s) {
    return stripAccents(LOWER(s).toLowerCase()).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function analyzeTopic(topic, level) {
    const hay = ' ' + normText(topic) + ' ';
    let best = null, bestHits = 0, matched = [];
    Object.keys(FIELDS).forEach(key => {
      if (key === 'general') return;
      let n = 0;
      const found = [];
      FIELDS[key].keys.forEach(k => {
        const nk = normText(k);
        if (!nk) return;
        if (hay.split(' ').indexOf(nk) >= 0) { n += 2; found.push(k); }
        else if (nk.indexOf(' ') > 0 && hay.indexOf(' ' + nk + ' ') >= 0) { n += 3; found.push(k); }
      });
      if (n > bestHits) { best = key; bestHits = n; matched = found; }
    });
    if (!best) best = level === 'EXAM' ? 'civics' : 'general';
    return {
      field: best, label: FIELDS[best].label, icon: FIELDS[best].icon, hits: bestHits,
      matched, hasDate: /\b(1[89]\d\d|20\d\d)\b/.test(LOWER(topic)),
    };
  }

  /* ------------------------------------------------------------------ */
  /* pools for one generation                                            */
  /* ------------------------------------------------------------------ */
  const GENERIC_NOUNS = G.genericNouns.map(x => noun(x[0], x[1]));
  const DETERMINER = /^(el|la|los|las|un|una|unos|unas|mi|tu|su|nuestro|nuestra|este|esta|estos|estas|ese|esa|aquel|aquella|algún|ningún)\s/i;
  function isNounPhrase(es) { return DETERMINER.test(LOWER(es).trim()); }

  function nounPool(fieldKey, level, levelNouns) {
    const f = FIELDS[fieldKey] || FIELDS.general;
    const out = [];
    const seen = new Set();
    const add = n => {
      if (!n || !n.es || seen.has(n.es) || !isNounPhrase(n.es)) return;
      seen.add(n.es); out.push(n);
    };
    (levelNouns || []).forEach(w => {
      if (f.cats.indexOf(w.cat) < 0) return;
      add(noun(w.es, w.en));
    });
    (f.easyNouns || []).forEach(add);
    const extras = (LEVELS[level] && LEVELS[level].order >= 1) ? f.nouns : f.nouns.filter(n => n.es.length < 20);
    extras.forEach(add);
    GENERIC_NOUNS.forEach(add);
    return out;
  }

  function usableVerbs(bank, fieldKey) {
    const f = FIELDS[fieldKey] || FIELDS.general;
    const list = [];
    const seen = new Set();
    (bank || []).forEach(v => {
      const key = LOWER(v.es).trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const L = lemma(key);
      const forms = verbForms(key);
      if (!forms.ok || !trusted(L.bare, deckConjugate(L.head))) return;
      const prof = profile(key);
      list.push({ es: key, en: v.en || key, forms, prof });
    });
    const preferHead = new Set();
    (f.verbs || []).forEach(x => preferHead.add(lemma(x).bare));
    (G.genericVerbs || []).forEach(x => preferHead.add(lemma(x).bare));
    return list.map(x => Object.assign({}, x, { preferred: preferHead.has(x.forms.bare) }));
  }

  /* ------------------------------------------------------------------ */
  /* composing                                                           */
  /* ------------------------------------------------------------------ */
  const ROLE_SEQ = {
    short: ['open', 'action', 'opinion', 'close'],
    long: ['open', 'context', 'action', 'opinion', 'action', 'contrast', 'plan', 'close'],
    conversation: ['ask', 'answer', 'ask', 'answer', 'ask', 'answer', 'plan', 'close'],
  };
  const MODE_COUNT = { short: 4, long: 8, conversation: 8 };
  const SPEAKERS = {
    default: { A: 'A', B: 'B' },
    EXAM: { A: 'Entrevistador', B: 'Tú' },
  };

  function formFor(forms, tense, idx) {
    const map = {
      'presente': forms.present, 'pretérito': forms.preterite, 'imperfecto': forms.imperfect,
      'futuro': forms.future, 'condicional': forms.conditional, 'perfecto': forms.perfect,
      'pluscuamperfecto': forms.pluperfect, 'cond-perfecto': forms.condPerfect, 'ir-a': forms.irA,
      'subjuntivo': forms.subjunctive,
    };
    const list = map[tense];
    if (!list || !list[idx]) return null;
    return tidy(list[idx]);
  }
  function questionAux(tense, P) {
    if (tense === 'pretérito' || tense === 'pluscuamperfecto') return 'Did';
    if (tense === 'futuro') return 'Will';
    if (tense === 'condicional' || tense === 'cond-perfecto') return 'Would';
    if (tense === 'perfecto') return P.id === 'yo' ? 'Have' : (P.enS ? 'Has' : 'Have');
    if (tense === 'ir-a') return P.enS || P.id === 'yo' ? (P.id === 'yo' ? 'Am' : 'Is') : 'Are';
    return P.enS ? 'Does' : 'Do';
  }
  function glossVerb(base, tense, P, tpl) {
    /* the auxiliary of the frame carries the tense, so the gloss stays bare */
    if (tpl && tpl.q) return tense === 'ir-a' ? 'going to ' + base : base;
    if (tpl && tpl.neg && !/\b(never|nobody)\b/.test(tpl.en || '')) {
      switch (tense) {
        case 'presente': return (P.enS ? 'does not ' : 'do not ') + base;
        case 'ir-a': return (P.enS ? 'is not going to ' : P.id === 'yo' ? 'am not going to ' : 'are not going to ') + base;
        case 'pretérito': case 'imperfecto': return 'did not ' + base;
        case 'futuro': return 'will not ' + base;
        case 'condicional': return 'would not ' + base;
        case 'perfecto': return (P.enS ? 'has not ' : 'have not ') + ppEn(base);
        case 'pluscuamperfecto': return 'had not ' + ppEn(base);
        case 'cond-perfecto': return 'would not have ' + ppEn(base);
        default: return 'do not ' + base;
      }
    }
    if (tense === 'ir-a') return enTense('be', 'presente', P) + ' going to ' + base;
    return enTense(base, tense, P);
  }
  const PREP_EN = { de: 'about', en: 'in', a: 'to', con: 'with', por: 'for', para: 'for',
    sobre: 'about', desde: 'from', sin: 'without', hasta: 'until' };

  function pickTense(rand, tpl, level, role) {
    const lv = LEVELS[level];
    let set = tpl.tenses ? tpl.tenses.filter(x => lv.tenses.indexOf(x) >= 0) : lv.tenses.slice();
    if (role === 'plan') {
      const fwd = set.filter(x => ['futuro', 'ir-a', 'condicional', 'presente', 'subjuntivo'].indexOf(x) >= 0);
      if (fwd.length) set = fwd;
    }
    if (role === 'ask' || role === 'answer') set = set.filter(x => ['imperfecto', 'pluscuamperfecto'].indexOf(x) < 0);
    if (role === 'open' || role === 'opinion') {
      const now = set.filter(x => ['presente', 'perfecto', 'imperfecto', 'pretérito'].indexOf(x) >= 0);
      if (now.length) set = now;
    }
    if (!set.length) return null;
    const bag = [];
    set.forEach(x => { const w = (lv.weights && lv.weights[x]) || 1; for (let i = 0; i < w; i++) bag.push(x); });
    return pick(rand, bag);
  }
  function labelFor(P) {
    if (P === PERSONS.el) return 'él/ella/usted';
    if (P === PERSONS.ellos) return 'ellos/ustedes';
    return P.es;
  }
  function subjectText(rand, P, tpl) {
    if (tpl.q) return '';                        /* ¿Ves el mapa? — no pronoun after the verb */
    if (tpl.need.indexOf('nsub') >= 0 || tpl.passive) return '';
    const show = P.id === 'yo' ? 0.3 : P.id === 'tu' ? 0.32 : P.id === 'nosotros' ? 0.42
      : P.id === 'usted' ? 0.5 : 0.72;
    if (!chance(rand, show)) return '';
    if (P.id === 'el') return chance(rand, 0.5) ? 'él' : 'ella';
    return P.es;
  }
  function pickTime(rand, tense) {
    const group = TENSE_GROUP[tense] || 'pres';
    const pool = TIMES.filter(x => x.group === group || x.group === 'any');
    return pick(rand, pool.length ? pool : TIMES);
  }
  function pickPerson(rand, tpl, lv, lastPerson) {
    let pool;
    if (tpl.person) pool = tpl.person;
    else if (tpl.persons) pool = tpl.persons.filter(x => lv.persons.indexOf(x) >= 0);
    else pool = lv.persons.slice();
    const fresh = pool.filter(x => x !== lastPerson);
    if (fresh.length) pool = fresh;
    return pick(rand, pool);
  }

  /* one line = pattern + verb + tense + person + slot draws */
  function buildLine(o) {
    const entry = o.verb, tpl = o.tpl, rand = o.rand, state = o.state, f = o.field;
    const level = o.level, topic = o.topic, role = o.role;
    const forms = entry.forms, prof = entry.prof, lv = LEVELS[level];

    let tense = pickTense(rand, tpl, level, role);
    if (!tense) return null;
    const subjFrame = tpl.need.indexOf('subj') >= 0;
    if (subjFrame) { if (!forms.subjunctive) return null; tense = 'subjuntivo'; }
    else {
      if (tense === 'ir-a' && prof.bare === 'ir') tense = 'presente';   /* nobody writes 'voy a ir' */
      /* the level's tense list is a ceiling, not a suggestion */
      if (lv.tenses.indexOf(tense) < 0) tense = 'presente';
    }

    const nextFrom = (pool, used) => {
      if (!pool || !pool.length) return null;
      const fresh = pool.filter(x => !used.has(x.es));
      const chosen = pick(rand, fresh.length ? fresh : pool);
      if (chosen) used.add(chosen.es);
      return chosen || null;
    };

    let nounPick = null;
    if (/\{(N|NADJ)\}/.test(tpl.es)) {
      /* an agentive verb wants a person as its subject, not a plate of food */
      const wantsPerson = /\{N\}\s*\{V\}/.test(tpl.es) && AGENTIVE.has(prof.bare);
      /* 'cenar un puesto' is nonsense: a place is not a thing you act on */
      const objFrame = /\{V\}\s*\{N\}/.test(tpl.es) && !PLACE_OK.has(prof.bare);
      const pool = (o.nouns || []).filter(x => !objFrame || !PLACE_NOUN.test(x.es));
      const nounPool2 = pool.length ? pool : o.nouns;
      nounPick = wantsPerson ? (nextFrom(o.people, state.usedPeople) || nextFrom(nounPool2, state.usedNouns))
        : nextFrom(nounPool2, state.usedNouns);
      if (!nounPick) return null;
    }
    let P = PERSONS[pickPerson(rand, tpl, lv, o.lastPerson)] || PERSONS.yo;
    const nounSubject = tpl.subjNoun || tpl.need.indexOf('nsub') >= 0 || subjFrame
      || /\{N\}\s*\{V\}|\{R\}\s*\{V\}|\{TOP\}\s*\{V\}/.test(tpl.es);
    if (nounSubject) {
      const subj = subjFrame ? pick(rand, SUBJ_SUBJECTS) : nounPick;
      if (!subj) return null;
      if (subjFrame) nounPick = subj;
      P = subj.num === 'p' ? PERSONS.ellos : (chance(rand, 0.5) ? PERSONS.el : PERSONS.ella);
      if (/\{TOP\}\s*\{V\}/.test(tpl.es)) P = PERSONS.el;
    }
    if (tpl.passive && !nounPick) return null;

    let answer = formFor(forms, tense, P.idx);
    const base = enBase(entry.en);
    let glossV = glossVerb(base, tense, P, tpl);
    if (tpl.passive) {
      answer = tidy((nounPick.num === 'p' ? 'son ' : 'es ') + adjForm({ m: forms.participle }, nounPick.g, nounPick.num));
      glossV = (nounPick.num === 'p' ? 'are ' : 'is ') + ppEn(base);
      P = nounPick.num === 'p' ? PERSONS.ellos : PERSONS.el;
      tense = 'pasiva';
    }
    if (tpl.need.indexOf('exp') >= 0) {
      const number = tpl.id === 'exp-gustar' && nounPick ? nounPick.num : 's';
      const alt = formFor(forms, tense, number === 'p' ? 4 : 2);
      if (!alt) return null;
      answer = alt;
      P = number === 'p' ? PERSONS.ellos : PERSONS.el;
      glossV = glossVerb(base, tense, P, tpl) || glossV;
      if (tense === 'presente' && !tpl.q && !tpl.neg) glossV = number === 'p' ? 'like' : 'likes';
    }
    if (!answer || !glossV) return null;

    const slots = {};
    slots.C = state.connectorFor(role);
    let shown = subjectText(rand, P, tpl);
    if (shown === 'ella') P = PERSONS.ella;
    if (shown === 'él') P = PERSONS.el;
    slots.S = { es: shown, en: P.enSubj || P.en };
    slots.TOP = { es: topic, en: '\u00AB' + topic + '\u00BB' };
    slots.R = nextFrom(G.referents, state.usedRef) || { es: 'el tema', en: 'the topic' };
    /* 'El año que viene … el año que venir' — one time expression per line */
    slots.T = slots.C && slots.C.when ? { es: '', en: '' } : pickTime(rand, tense);
    slots.ADV = nextFrom(MANNER, state.usedManner) || { es: 'bien', en: 'well' };
    slots.LI = nextFrom((f.inPlaces || []).concat(G.inPlaces), state.usedPlace);
    slots.LT = nextFrom((f.toPlaces || []).concat(G.toPlaces), state.usedToPlace);
    slots.PE = nextFrom(G.people, state.usedPeople);
    slots.YEAR = pick(rand, YEARS);
    slots.K = pick(rand, REPLIES);
    if (/\{BE\}/.test(tpl.en)) {
      const plural = P === PERSONS.ellos || P === PERSONS.nosotros;
      slots.BE = { es: '', en: (tense === 'pretérito' || tense === 'imperfecto' || tense === 'pluscuamperfecto')
        ? (plural ? 'were' : 'was') : (plural ? 'are' : (P.id === 'yo' ? 'am' : 'is')) };
    }
    if (/\{AB\}/.test(tpl.en) && !slots.AB) {
      const ab = nextFrom(G.abstracts, state.usedAbs);
      if (ab) slots.AB = { es: ab.es, en: (PREP_EN[prof.prep] || 'about') + ' ' + ab.en };
    }
    slots.RE = nextFrom((f.reasons || []).concat(G.reasons), state.usedReason);
    if (slots.RE && !/,\s*\{RE\}/.test(tpl.es)) slots.RE = { es: ', ' + slots.RE.es, en: ', ' + slots.RE.en };
    slots.CL = pick(rand, G.closers);
    if (/\{PAB\}|\{PTOP\}/.test(tpl.es)) {
      const prep = prof.prep || 'de';
      if (/\{PAB\}/.test(tpl.es)) {
        const ab = nextFrom(G.abstracts, state.usedAbs);
        if (!ab) return null;
        slots.PAB = { es: pp(prep, ab.es), en: '' };
        slots.AB = { es: ab.es, en: (PREP_EN[prep] || 'about') + ' ' + ab.en };
      }
      if (/\{PTOP\}/.test(tpl.es)) {
        slots.PTOP = { es: pp(prep, topic), en: '' };
        slots.PPL = { es: '', en: PREP_EN[prep] || 'about' };
      }
    }
    if (/\{PE\}/.test(tpl.es) && !slots.PE) return null;
    if (/\{LI\}/.test(tpl.es) && !slots.LI) return null;
    if (/\{LT\}/.test(tpl.es) && !slots.LT) return null;
    if (slots.N === undefined && nounPick) slots.N = { es: nounPick.es, en: nounPick.en };
    if (nounPick) {
      const pool = (f.adjs || []).concat(G.adjs || []).filter(a => a && a.en);
      const a = nextFrom(pool, state.usedAdj);
      slots.NADJ = a ? { es: adjForm(a, nounPick.g, nounPick.num), en: a.en || a.m }
        : { es: 'interesante', en: 'interesting' };
    }
    if (slots.NADJ) slots.NADJEN = { es: '', en: slots.NADJ.en };
    if (/\{A\}/.test(tpl.es)) {
      const inv = pick(rand, SAFE_INVARIANT);
      slots.A = { es: adjForm(inv, 'm', 's'), en: inv.en || inv.m };
    }
    if (/A \{EX\}/.test(tpl.es)) {
      const ex = pick(rand, G.exp);
      slots.EX = { es: ex.es, en: ex.en };
      slots.EXC = { es: ex.cl, en: '' };
      slots.EXS = { es: ex.num === 'p' ? 's' : '', en: '' };
      slots.LIKE = { es: '', en: ex.num === 's' ? 'likes' : 'like' };
    }
    if (tpl.need.indexOf('inf') >= 0) {
      const cands = (o.infCandidates || []).filter(x => x.es !== entry.es);
      if (!cands.length) return null;
      const inf = pick(rand, cands);
      const ff = verbForms(inf.es);
      if (!ff.ok || ff.bare === forms.bare) return null;
      slots.I = { es: (prof.infPrep ? prof.infPrep + ' ' : '') + ff.infinitive, en: enBase(inf.en) };
    }
    if (tpl.q) {
      slots.DO = { es: '', en: questionAux(tense, P) };
      if (/\{W\}/.test(tpl.es)) {
        const w = pick(rand, WH);
        slots.W = { es: w.es.slice(1) + ' ', en: '' };
        slots.DO = { es: '', en: w.en.replace(/ do$/, '') };
      }
    }
    slots.V = { es: MARK, en: glossV };

    const text = fill(tpl.es, slots, 'es');
    const gloss = fill(tpl.en, slots, 'en');
    if (text.indexOf(MARK) < 0) return null;
    const built = assemble(text, answer, gloss, glossV);
    if (!built) return null;

    return {
      verb: entry.es, answer: built.answer, text: built.text, plain: built.plain,
      gloss: built.gloss, speaker: '', en: entry.en, role, tense,
      person: P.id, personLabel: labelFor(P), tenseLabel: TENSE_LABEL[tense] || tense,
      hint: TENSE_HINT[tense] || '', template: tpl.id, preferred: !!entry.preferred,
      subject: shown || (nounPick ? nounPick.es : ''),
    };
  }
  /* keeps `text` (with the marker), the typed answer and the finished sentence
     in sync: capitalisation belongs to the sentence, and to the answer only
     when the answer is what starts it */
  function assemble(withMark, answer, gloss, glossV) {
    const idx = withMark.indexOf(MARK);
    if (idx < 0) return null;
    const pre = tidy(withMark.slice(0, idx));
    const post = LOWER(withMark.slice(idx + MARK.length));
    const capPre = capitalize(pre);
    const answerIsFirst = capPre === '' || /^[¿¡]$/.test(capPre);
    const finalAnswer = answerIsFirst ? capitalize(answer) : answer;
    const text = tidy(capPre + ' ' + MARK + ' ' + post);
    const plain = punctuate(capitalize(contract(tidy(text.replace(MARK, finalAnswer)))));
    const lineGloss = punctuate(capitalize(tidy(gloss.replace(MARK, glossV))));
    if (plain.indexOf(finalAnswer) < 0) return null;
    return { text, answer: finalAnswer, plain, gloss: lineGloss };
  }

  const OPTIONAL_SLOT = new Set(['S', 'EXS', 'LIKE', 'DO', 'EXC']);
  /* {SLOT} → the Spanish or the English side of the drawn value; an
     unresolved Spanish slot is kept in place so attempt() rejects the line */
  function fill(str, slots, lang) {
    return String(str).replace(/\{(\w+)\}/g, (m, name) => {
      const v = slots[name];
      const val = v && typeof v === 'object' ? v[lang] : v;
      if (val == null || val === '') return lang === 'es' && !OPTIONAL_SLOT.has(name) ? m : '';
      return lang === 'en' ? enVerbFix(enClean(val)) : String(val);
    });
  }

  function unresolved(text) {
    return /\{[A-Z]+\}/.test(text.replace(/\{\{verb\}\}/g, ''));
  }
  function attempt(verb, tpl, ctx) {
    const line = buildLine(Object.assign({ verb, tpl }, ctx));
    if (!line) return null;
    /* a line only ships when it is complete: one marker, no unfilled slot,
       and the answer really present in the plain text */
    if (line.text.split(MARK).length !== 2) return null;
    if (unresolved(line.text) || unresolved(line.plain) || unresolved(line.gloss)) return null;
    if (!line.answer || line.answer.indexOf('{') >= 0) return null;
    if (line.plain.indexOf(line.answer) < 0) return null;
    return line;
  }


  /* ------------------------------------------------------------------ */
  /* where the material comes from: the level's own cards                */
  /* ------------------------------------------------------------------ */
  /* EXAM has no verb cards, so its bank is curated from the interview
     questions, the reading passages and the frames it actually drills. */
  const EXAM_VERBS = [
    ['vivir', 'to live'], ['practicar', 'to practise'], ['considerar', 'to consider'],
    ['aprender', 'to learn'], ['ayudar', 'to help'], ['formar', 'to become part of'],
    ['demostrar', 'to demonstrate'], ['comprender', 'to understand'], ['recordar', 'to remember'],
    ['respetar', 'to respect'], ['participar', 'to participate'], ['preparar', 'to prepare'],
    ['analizar', 'to analyse'], ['cuestionar', 'to question'], ['defender', 'to defend'],
    ['concluir', 'to conclude'], ['relacionar', 'to relate'], ['valorar', 'to value'],
    ['proponer', 'to propose'], ['resolver', 'to solve'], ['sostener', 'to maintain'],
    ['reflexionar', 'to reflect'], ['convertir', 'to turn into'], ['influir', 'to influence'],
  ];

  function verbBank(level) {
    const d = (typeof DATA !== 'undefined' && DATA[level]) || {};
    const map = new Map();
    const push = (es, en) => {
      const key = LOWER(es || '').trim();
      if (!key || key.indexOf(' ') >= 0 || !/^[a-záéíóúñü]+(se)?$/.test(key)) return;
      if (!map.has(key)) map.set(key, en || key);
    };
    (d.flashcards || []).forEach(c => { if (c.cardType === 'verb') push(c.verbEs, c.verbEn); });
    (d.verbs || []).forEach(v => push(v.es, v.en));
    if (level === 'EXAM') EXAM_VERBS.forEach(x => push(x[0], x[1]));
    return Array.from(map, (kv) => ({ es: kv[0], en: kv[1] }));
  }

  function levelNouns(level) {
    const d = (typeof DATA !== 'undefined' && DATA[level]) || {};
    return (d.words || []).filter(w => w && w.es);
  }

  function build(opts) {
    const level = LEVELS[opts.level] ? opts.level : 'A1';
    const mode = ROLE_SEQ[opts.mode] ? opts.mode : 'short';
    const seed = (opts.seed >>> 0) || ((Math.random() * 4294967295) >>> 0);
    const rand = makeRng(seed ^ hashString(mode + '|' + level));
    const topic = LOWER(opts.topic).trim();
    if (!topic) throw new Error('Please enter a topic first.');
    const ana = analyzeTopic(topic, level);
    const lv = LEVELS[level];
    const verbs = usableVerbs(opts.verbs && opts.verbs.length ? opts.verbs : verbBank(level), ana.field);
    const nouns = nounPool(ana.field, level, opts.nouns && opts.nouns.length ? opts.nouns : levelNouns(level));
    const poolFor = list => list.length ? list : nouns;
    if (!verbs.length) throw new Error('This level has no usable verbs yet.');
    const preferred = shuffled(rand, verbs.filter(v => v.preferred));
    const others = shuffled(rand, verbs.filter(v => !v.preferred));
    const ordered = preferred.concat(others);
    if (!nouns.length) throw new Error('No level nouns are available for this topic.');

    const state = {
      usedNouns: new Set(), usedVerbs: new Set(), usedTpl: new Set(), usedConn: new Set(),
      usedRef: new Set(), usedManner: new Set(), usedPlace: new Set(), usedToPlace: new Set(),
      usedPeople: new Set(), usedAbs: new Set(), usedAdj: new Set(), usedReason: new Set(),
      infPool: ordered.filter(v => v.prof.needs.has('inf') === false || true),
      topic, topicPlain: topic, level, mode, field: ana.field,
      connectorFor(role) {
        const bag = G.connectors[role] || G.connectors.action;
        const fresh = bag.filter(c => !state.usedConn.has(c.es));
        const chosen = pick(rand, fresh.length ? fresh : bag);
        state.usedConn.add(chosen.es);
        return chosen;
      },
    };
    /* {I} candidates: any other bank verb that reads as an action */
    const peoplePool = (G.people || []).map(x => noun(x.es, x.en));
    const infCandidates = ordered
      .filter(v => !NO_COMPLEMENT.has(v.forms.bare) && !EXP_ONLY.has(v.forms.bare))
      .map(v => ({ es: v.es, en: v.en }));

    const seq = ROLE_SEQ[mode];
    const lines = [];
    let lastPerson = null;
    for (let i = 0; i < seq.length; i++) {
      const role = seq[i];
      const frames = (BY_ROLE[role] || []).filter(x => allowed(x, level));
      const verbOrder = i % 2 === 0 ? ordered : shuffled(rand, ordered);
      let made = null;
      for (const tpl of shuffled(rand, frames)) {
        if (state.usedTpl.has(tpl.id)) continue;
        for (const verb of verbOrder) {
          if (state.usedVerbs.has(verb.es)) continue;
          if (!tpl.need.every(n => verb.prof.needs.has(n))) continue;
          made = attempt(verb, tpl, { rand, state, nouns: poolFor(nouns), people: peoplePool, level, mode, topic,
            infCandidates, lastPerson, role, field: FIELDS[ana.field] });
          if (made) { state.usedVerbs.add(verb.es); state.usedTpl.add(tpl.id); break; }
        }
        if (made) break;
      }
      if (!made) continue;
      lastPerson = made.person;
      lines.push(made);
    }
    if (!lines.length) throw new Error('The generator could not build a text for this topic yet.');

    /* A text has to be about the topic, so when no line names it the opener
       is rebuilt and takes the place of the last line. */
    const mentions = str => LOWER(str).indexOf(topic) >= 0;
    if (!lines.some(l => mentions(l.plain))) {
      let opener = null;
      for (const tpl of shuffled(rand, BY_ROLE.open || [])) {
        for (const verb of ordered) {
          if (!tpl.need.every(nn => verb.prof.needs.has(nn))) continue;
          const trial = attempt(verb, tpl, { rand, state, nouns: poolFor(nouns), people: peoplePool,
            level, mode, topic, infCandidates, lastPerson: null, role: 'open',
            field: FIELDS[ana.field] });
          if (trial && mentions(trial.plain)) {
            opener = trial;
            state.usedVerbs.add(verb.es);
            state.usedTpl.add(tpl.id);
            break;
          }
        }
        if (opener) break;
      }
      if (opener) {
        if (lines.length < MODE_COUNT[mode]) lines.unshift(opener);
        else lines[lines.length - 1] = opener;
      }
    }

    /* conversation needs the A/B voices; narrative lines are already complete */
    if (mode === 'conversation') {
      const who = SPEAKERS[level] || SPEAKERS.default;
      lines.forEach((l, i) => { l.speaker = i % 2 === 0 ? who.A : who.B; });
    } else {
      lines.forEach(l => { l.speaker = ''; });
    }

    const plainText = lines.map(l => mode === 'conversation' && l.speaker
      ? l.speaker + ': ' + l.plain : l.plain).join(mode === 'conversation' ? '\n' : ' ');
    const glossText = lines.map(l => mode === 'conversation' && l.speaker
      ? l.speaker + ': ' + l.gloss : l.gloss).join(mode === 'conversation' ? '\n' : ' ');
    const tensesUsed = Array.from(new Set(lines.map(l => l.tense)));
    return {
      topic, mode, level, seed, lines, plainText, glossText,
      field: ana.field, fieldLabel: ana.label, icon: ana.icon, matched: ana.matched,
      meta: { count: lines.length, tensesUsed, roles: lines.map(l => l.role),
        preferred: lines.filter(l => l.preferred).length },
    };
  }

  function allowed(tpl, level) {
    if (tpl.only && tpl.only.indexOf(level) < 0) return false;
    if (tpl.min != null && LEVELS[level].order < tpl.min) return false;
    if (tpl.max != null && LEVELS[level].order > tpl.max) return false;
    return true;
  }


  global.TopicTextEngine = {
    MARK, makeRng, hashString, pick, chance, shuffled, tidy, capitalize, punctuate, pp,
    noun, adj, adjForm, lemma, verbForms, participle, regularImperfect, futureConditional,
    presentSubjunctive, SUBJ_SAFE, PERSONS, TENSE_LABEL, TENSE_HINT, enBase, enTense, ed, ppEn,
    esThird, deckConjugate, FIELDS, GENERIC: G, profile, LEVELS, TEMPLATES: T, BY_ROLE,
    verbBank, levelNouns, EXAM_VERBS: EXAM_VERBS.map(x => ({ es: x[0], en: x[1] })),
    repair, riskyClass, trusted, FIX, ROLE_SEQ, SPEAKERS,
    INVARIANT_ADJS, SUBJ_NOS_STEM, EXP_OK, NOUN_SUBJ, ADJ_OK, PER_OK, QUE_OK, INF_OK,
    LOC_IN, LOC_TO, NO_OBJ, ONLY_3RD, SUBJ_MAIN,
  };
  global.TopicTextEngine.build = build;
  global.TopicTextEngine.analyzeTopic = analyzeTopic;
  global.TopicTextEngine.MODE_COUNT = MODE_COUNT;
  global.TopicTextEngine.ROLE_SEQ = ROLE_SEQ;
  global.TopicTextEngine.TIMES = TIMES;
  global.TopicTextEngine.usableVerbs = usableVerbs;
  global.TopicTextEngine.nounPool = nounPool;
  global.TopicTextEngine.isNounPhrase = isNounPhrase;
  global.TopicTextEngine.formFor = formFor;
  global.TopicTextEngine.allowed = allowed;
  global.TopicTextEngine.pickTense = pickTense;
  /* internals, exposed for the regression test in test/topic-text-dynamic.js */
  global.TopicTextEngine.internals = { buildLine, assemble, fill, attempt, usableVerbs, nounPool,
    verbForms, profile, trusted, riskyClass, analyzeTopic, pickTense, formFor, BY_ROLE, FIELDS, G,
    LEVELS, PERSONS, TIMES, TENSE_GROUP, safeAdj: SAFE_INVARIANT, punctuate, capitalize, tidy, adjForm, noun };

})(typeof window !== 'undefined' ? window : globalThis);
