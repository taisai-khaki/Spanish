'use strict';
/* ============ Mastery engine (naturalizacion.mx cycle) ============
   5 consecutive correct = item locked in FOREVER (never drilled again).
   1 wrong = streak resets. Only UNLEARNED items ever enter a queue.
   Every retry comes back in a DIFFERENT exercise format. ============ */

const MASTERED_AT = 5;

const FORMATS = {
  word: ['type-en', 'type-es', 'listen-pick', 'pick-es'],
  sentence: ['word-order', 'type-es', 'listen-pick', 'fill-blank'],
  grammar: ['pick-correct', 'pick-wrong'],
  dialogue: ['keyword', 'listen-pick', 'fill-blank', 'respond', 'speak'],
  interview: ['ask-listen', 'ask-speak', 'ask-write'],
  reading: ['read-quiz', 'listen-quiz'],
  repaso: ['pick-correct', 'pick-wrong'],
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

  result(level, kind, id, ok, format) {
    const st = this.load(level);
    const k = this.key(level, kind, id);
    const s = st[k] || { streak: 0, last: null, seen: 0 };
    s.seen = (s.seen || 0) + 1;
    s.streak = ok ? s.streak + 1 : 0;
    s.last = format;
    const justMastered = ok && s.streak >= MASTERED_AT;
    st[k] = s;
    this.save(level);
    return { streak: Math.min(s.streak, MASTERED_AT), mastered: s.streak >= MASTERED_AT, justMastered };
  },

  /* all items of a level (or one kind) as pool entries */
  pool(level, kind) {
    const d = DATA[level];
    const out = [];
    if (!kind || kind === 'word') d.words.forEach(w => out.push({ kind: 'word', id: w.es, item: w }));
    if (!kind || kind === 'sentence') d.sentences.forEach(s => out.push({ kind: 'sentence', id: s.es, item: s }));
    if (!kind || kind === 'grammar') (d.grammar || []).forEach(g => out.push({ kind: 'grammar', id: g.id, item: g }));
    if (!kind || kind === 'dialogue') (d.dialogues || []).forEach(dlg => dlg.lines.forEach((ln, i) =>
      out.push({ kind: 'dialogue', id: dlg.id + ':' + i, item: ln, dlg, lineNo: i })));
    if (!kind || kind === 'interview') (d.interview || []).forEach(it => out.push({ kind: 'interview', id: it.id, item: it }));
    if (!kind || kind === 'reading') (d.reading || []).forEach(p => out.push({ kind: 'reading', id: p.id, item: p }));
    if (!kind || kind === 'repaso') (d.repaso || []).forEach(x => out.push({ kind: 'repaso', id: x.id, item: x }));
    return out;
  },

  unmastered(level, kind) {
    return this.pool(level, kind).filter(p => this.get(level, p.kind, p.id).streak < MASTERED_AT);
  },

  stats(level) {
    const all = this.pool(level);
    let locked = 0, progress = 0;
    all.forEach(p => {
      const s = this.get(level, p.kind, p.id).streak;
      if (s >= MASTERED_AT) locked++;
      else if (s > 0) progress++;
    });
    return { total: all.length, locked, progress, fresh: all.length - locked - progress };
  },

  /* queue order: almost-locked first (3–4, cheap wins), then brand new (0), then struggling (1–2) */
  order(entries, level) {
    const tier = p => {
      const s = this.get(level, p.kind, p.id).streak;
      if (s >= 3) return 0;
      if (s === 0) return 1;
      return 2;
    };
    return entries.slice().sort((a, b) => tier(a) - tier(b) || Math.random() - 0.5);
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
