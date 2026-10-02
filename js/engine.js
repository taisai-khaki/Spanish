'use strict';
/* ============ Mastery engine (naturalizacion.mx cycle) ============
   Regular items: 5 consecutive correct = locked forever; a wrong answer resets the streak.
   Tagged verbSentence items: one correct answer completes that sentence.
   Only incomplete items enter queues. ============ */

const MASTERED_AT = 5;

const FORMATS = {
  word: ['listen-pick', 'pick-es'],
  sentence: ['listen-pick', 'fill-blank'],
  grammar: ['pick-correct', 'pick-wrong'],
  dialogue: ['keyword', 'listen-pick', 'fill-blank'],
  reading: ['read-quiz', 'listen-quiz'],
  verbSentence: ['word-order'],
  flashcard: ['flashcard'],
  verbCard: ['verb-card'],
};

const engine = {
  _state: {},

  key(level, kind, id) { return level + '::' + kind + '::' + id; },

  load(level) {
    if (!this._state[level]) {
      this._state[level] = store.get('mastered.' + level, {});
      this.migrate(level);
    }
    return this._state[level];
  },

  save(level) { store.set('mastered.' + level, this._state[level]); },

  /* one-time: carry over "stuck" progress from the old SRS system */
  migrate(level) {
    const st = this._state[level];
    if (st.__migrated) return;
    const srs = store.get('srs.' + level, null) || {};
    Object.keys(srs).forEach(es => {
      const box = srs[es];
      if (box >= 2) {
        const k = this.key(level, 'word', es);
        if (!st[k] || st[k].streak < Math.min(box, 4)) {
          st[k] = { streak: Math.min(box, 4), last: null, seen: 0 };
        }
      }
    });
    st.__migrated = true;
    this.save(level);
  },

  get(level, kind, id) {
    return this.load(level)[this.key(level, kind, id)] || { streak: 0, last: null, seen: 0 };
  },

  masteryTarget(kind) {
    return (kind === 'verbSentence' || kind === 'flashcard' || kind === 'verbCard') ? 1 : MASTERED_AT;
  },

  result(level, kind, id, ok, format) {
    const st = this.load(level);
    const k = this.key(level, kind, id);
    const s = st[k] || { streak: 0, last: null, seen: 0 };
    s.seen = (s.seen || 0) + 1;
    s.streak = ok ? s.streak + 1 : 0;
    s.last = format;
    const target = this.masteryTarget(kind);
    const justMastered = ok && s.streak >= target;
    st[k] = s;
    this.save(level);
    return { streak: Math.min(s.streak, target), target, mastered: s.streak >= target, justMastered };
  },

  /* all items of a level (or one kind) as pool entries */
  pool(level, kind) {
    const d = DATA[level];
    const out = [];
    if (!kind || kind === 'word') d.words.forEach(w => out.push({ kind: 'word', id: w.es, item: w }));
    if (!kind || kind === 'sentence') d.sentences.forEach(s => out.push({ kind: 'sentence', id: s.id || s.es, item: s }));
    if (!kind || kind === 'verbSentence') (d.verbSentences || []).forEach(s =>
      out.push({ kind: 'verbSentence', id: s.id, item: s }));
    if (!kind || kind === 'grammar') (d.grammar || []).forEach(g => out.push({ kind: 'grammar', id: g.id, item: g }));
    if (!kind || kind === 'dialogue') (d.dialogues || []).forEach(dlg => dlg.lines.forEach((ln, i) =>
      out.push({ kind: 'dialogue', id: dlg.id + ':' + i, item: ln, dlg, lineNo: i })));
    if (!kind || kind === 'reading') (d.reading || []).forEach(p => out.push({ kind: 'reading', id: p.id, item: p }));
    if (kind === 'flashcard') (d.flashcards || []).forEach(fc => out.push({ kind: 'flashcard', id: fc.id, item: fc }));
    if (kind === 'verbCard') (d.verbCards || []).forEach(fc => out.push({ kind: 'verbCard', id: fc.id, item: fc }));
    return out;
  },

  unmastered(level, kind) {
    return this.pool(level, kind).filter(p =>
      this.get(level, p.kind, p.id).streak < this.masteryTarget(p.kind));
  },

  stats(level) {
    const all = this.pool(level);
    let locked = 0, progress = 0;
    all.forEach(p => {
      const s = this.get(level, p.kind, p.id).streak;
      const target = this.masteryTarget(p.kind);
      if (s >= target) locked++;
      else if (s > 0) progress++;
    });
    return { total: all.length, locked, progress, fresh: all.length - locked - progress };
  },

  verbProgress(level) {
    const data = DATA[level] || {};
    const sentences = data.verbSentences || [];
    const state = this.load(level);
    const grouped = new Map();
    sentences.forEach(s => {
      if (!grouped.has(s.verbId)) grouped.set(s.verbId, []);
      grouped.get(s.verbId).push(s);
    });
    return (data.verbs || []).map(verb => {
      const examples = grouped.get(verb.es) || [];
      const done = examples.filter(s => {
        const st = state[this.key(level, 'verbSentence', s.id)];
        return st && st.streak >= 1;
      }).length;
      return { verb, done, total: examples.length, learned: examples.length > 0 && done === examples.length };
    });
  },

  /* queue order: almost-locked first (3–4, cheap wins), then brand new (0), then struggling (1–2) */
  order(entries, level) {
    const tiers = [[], [], []];
    entries.forEach(p => {
      const streak = this.get(level, p.kind, p.id).streak;
      const target = this.masteryTarget(p.kind);
      const tier = target > 1 && streak >= target - 2 ? 0 : (streak === 0 ? 1 : 2);
      tiers[tier].push(p);
    });
    // Shuffle each tier with Fisher–Yates instead of using a random sort comparator.
    return tiers.reduce((ordered, tier) => ordered.concat(shuffle(tier)), []);
  },

  /* pick an exercise format — always different from the last one used */
  format(entry, level, opts = {}) {
    const all = (FORMATS[entry.kind] || []).filter(f => !opts.noMic || !/^(speak|ask-)/.test(f));
    const last = this.get(level, entry.kind, entry.id).last;
    let list = all.filter(f => f !== last);
    if (!list.length) list = all;
    return pick(list);
  },
};
