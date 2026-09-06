'use strict';
/* ============ Task renderers: one exercise = one FORMAT for one item ============
   Each task renders its own interaction and calls onSubmit(ok, meta).
   Return { cleanup } when holding resources (mic). ============ */

const STOP = new Set([
  'de', 'la', 'el', 'a', 'en', 'es', 'me', 'te', 'se', 'no', 'un', 'una', 'los', 'las',
  'y', 'que', 'su', 'sus', 'mi', 'o', 'u', 'al', 'del', 'lo', 'le', 'les', 'nos',
  'soy', 'eres', 'mas', 'muy', 'pero', 'por', 'para', 'con', 'sin', 'esta', 'este',
  'estos', 'estas', 'vamos', 'somos', 'si', 'ya', 'le', 'les', 'tú', 'tu', 'yo',
]);

function uniqNorm(arr) {
  const seen = new Set();
  const out = [];
  arr.forEach(t => {
    if (t == null) return;
    const n = norm(t);
    if (n && !seen.has(n)) { seen.add(n); out.push(t); }
  });
  return out;
}

function pickOptions(correctText, pool, field, n) {
  n = n || 3;
  const c = norm(correctText);
  const cands = uniqNorm(pool.map(x => x[field]).filter(t => norm(t) !== c && t));
  return shuffle([correctText].concat(shuffle(cands).slice(0, n)));
}

function makeMeaningOptions(entry, level) {
  const it = entry.item;
  if (entry.kind === 'word') return pickOptions(it.en, DATA[level].words, 'en');
  if (entry.kind === 'sentence') return pickOptions(it.en, DATA[level].sentences, 'en');
  if (entry.kind === 'dialogue') return pickOptions(it.en, entry.dlg.lines, 'en');
  return [];
}

function makeEsOptions(entry, level) {
  return pickOptions(entry.item.es, DATA[level].words, 'es');
}

function keywordOptions(entry, level) {
  const it = entry.item;
  const correct = it.kw[0];
  const pool = [];
  entry.dlg.lines.forEach(l => { if (l !== it) (l.kw || []).forEach(k => pool.push(k)); });
  DATA[level].dialogues.forEach(d => {
    if (d !== entry.dlg) d.lines.forEach(l => (l.kw || []).forEach(k => pool.push(k)));
  });
  const c = norm(correct);
  const distr = uniqNorm(pool.filter(k => norm(k) !== c)).slice(0, 3);
  return shuffle([correct].concat(distr));
}

function respondOptions(entry, level) {
  const it = entry.item;
  const dlg = entry.dlg;
  let yours = dlg.lines.filter(l => l.who === 'you' && l !== it);
  let others = shuffle(yours).slice(0, 2);
  if (others.length < 2) {
    const extra = [];
    DATA[level].dialogues.forEach(d => {
      if (d !== dlg) d.lines.forEach(l => { if (l.who === 'you') extra.push(l); });
    });
    others = uniqNorm(
      shuffle(others.concat(extra))
        .filter(l => norm(l.es) !== norm(it.es))
        .slice(0, 2)
        .map(l => l.es)
    ).map(es => extra.find(l => norm(l.es) === norm(es)) || yours.find(l => norm(l.es) === norm(es)));
  }
  const lines = uniqNorm([it.es].concat(others.map(l => l.es))).map(es =>
    [it, ...others].find(l => norm(l.es) === norm(es)));
  return shuffle(lines.filter(Boolean)).map(l => ({ es: l.es, en: l.en }));
}

function buildFillBlank(entry, level) {
  const clean = w => String(w).replace(/[¿?¡!,.]/g, '');
  if (entry.kind === 'dialogue') {
    const it = entry.item;
    const toks = it.es.split(' ');
    let pool = toks.map(clean).filter(t => t.length >= 4 && !STOP.has(t.toLowerCase()));
    if (!pool.length) pool = toks.map(clean).filter(t => t.length > 2);
    const kw0 = norm(it.kw && it.kw[0]);
    const missing = pool.includes(kw0) ? clean(it.kw[0]) : pick(pool);
    let idx = toks.findIndex(t => norm(t) === norm(missing));
    if (idx < 0) idx = 0;
    const shown = toks.map((t, i) => (i === idx ? '___' : t)).join(' ');
    const others = toks.map(clean).filter((t, i) => i !== idx && norm(t) !== norm(missing) && t.length > 1);
    let opts = uniqNorm(shuffle([missing].concat(shuffle(others)))).slice(0, 4);
    if (opts.length < 4) {
      const pad = [];
      entry.dlg.lines.forEach(l => { if (l !== it) l.es.split(' ').forEach(t => pad.push(clean(t))); });
      opts = uniqNorm(opts.concat(shuffle(pad.filter(t => t.length >= 3 && !STOP.has(t.toLowerCase()))))).slice(0, 4);
    }
    return { full: it.es, shown, missing, opts };
  }
  const it = entry.item;
  let cands = it.ans.map(clean).filter(t => t.length >= 4 && !STOP.has(t.toLowerCase()));
  if (!cands.length) cands = it.ans.map(clean);
  const missing = pick(cands);
  const idx = it.ans.findIndex(w => clean(w) === missing);
  const shown = it.ans.map((w, i) => (i === idx ? '___' : w)).join(' ');
  const sameOthers = it.ans.map(clean).filter((t, i) => i !== idx && norm(t) !== norm(missing));
  const allWords = [];
  DATA[level].sentences.forEach(s => { if (s.es !== it.es) s.ans.forEach(w => allWords.push(clean(w))); });
  const extras = shuffle(uniqNorm(allWords.filter(t => t.length >= 3 && !STOP.has(t.toLowerCase()) && norm(t) !== norm(missing))))
    .slice(0, Math.max(0, 4 - sameOthers.length - 1));
  let opts = uniqNorm(shuffle([missing].concat(sameOthers).concat(extras))).slice(0, 4);
  if (opts.length < 4) {
    opts = uniqNorm(opts.concat(shuffle(uniqNorm(allWords.filter(t => t.length >= 3 && !STOP.has(t.toLowerCase())))))).slice(0, 4);
  }
  return { full: it.es, shown, missing, opts };
}

/* ================= tasks ================= */
const tasks = {

  'type-en'(mount, o) {
    const it = o.entry.item;
    mount.innerHTML = `
      <div class="row center"><button class="btn ghost sound" id="tplay" type="button">🔊 Hear it</button></div>
      <form class="ansform" id="tform" autocomplete="off">
        <input class="answer-input" id="tinput" placeholder="English meaning…" aria-label="Your answer">
        <button class="btn" type="submit">Check</button>
      </form>`;
    $('#tplay', mount).onclick = () => say(it.es, o.rate || 0.9);
    $('#tinput', mount).focus();
    $('#tform', mount).onsubmit = e => {
      e.preventDefault();
      const val = $('#tinput', mount).value;
      const parts = meaningParts(it.en);
      o.onSubmit(parts.some(p => similarity(val, p) >= 0.85));
    };
    return null;
  },

  'type-es'(mount, o) {
    const it = o.entry.item;
    mount.innerHTML = `
      <form class="ansform" id="tform" autocomplete="off">
        <input class="answer-input" id="tinput" placeholder="en español…" aria-label="Spanish">
        <button class="btn" type="submit">Check</button>
      </form>
      <div class="row center"><button class="btn ghost sound" id="tplay" type="button">🔊 Hear it</button></div>`;
    $('#tplay', mount).onclick = () => say(it.es, o.rate || 0.9);
    $('#tinput', mount).focus();
    $('#tform', mount).onsubmit = e => {
      e.preventDefault();
      const val = $('#tinput', mount).value;
      const a = stripArticles(val), b = stripArticles(it.es);
      o.onSubmit(!!a && (a === b || similarity(val, it.es) >= 0.9));
    };
    return null;
  },

  'listen-pick'(mount, o) {
    const it = o.entry.item;
    const opts = makeMeaningOptions(o.entry, o.level);
    mount.innerHTML = `
      <div class="row center"><button class="btn ghost big" id="tplay" type="button">🔊 Play</button></div>
      <div class="opts">${opts.map(x => `<button class="opt" type="button" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
    say(it.es, o.rate || 1);
    $('#tplay', mount).onclick = () => say(it.es, o.rate || 1);
    $$('.opt', mount).forEach(b => b.onclick = () => {
      $$('.opt', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(it.en)) x.classList.add('right'); });
      if (norm(b.dataset.v) !== norm(it.en)) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(it.en));
    });
    return null;
  },

  'pick-es'(mount, o) {
    const it = o.entry.item;
    const opts = makeEsOptions(o.entry, o.level);
    mount.innerHTML = `<div class="opts">${opts.map(x => `<button class="opt" type="button" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
    $$('.opt', mount).forEach(b => b.onclick = () => {
      $$('.opt', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(it.es)) x.classList.add('right'); });
      if (norm(b.dataset.v) !== norm(it.es)) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(it.es));
    });
    return null;
  },

  'word-order'(mount, o) {
    const it = o.entry.item;
    const row = document.createElement('div');
    row.className = 'slot-row';
    const bank = document.createElement('div');
    bank.className = 'chip-row';
    mount.appendChild(row);
    mount.appendChild(bank);
    mount.insertAdjacentHTML('beforeend', `<div class="row between"><button class="btn ghost" id="tclear" type="button">Clear 🧹</button><button class="btn" id="tcheck" type="button" disabled>Check ✓</button></div>`);
    let placed = [];
    const refresh = () => {
      placed = Array.from(row.children);
      $('#tcheck', mount).disabled = placed.length !== it.ans.length;
    };
    shuffle(it.ans.concat(it.distr)).forEach(word => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = word;
      b.onclick = () => { if (b.disabled) return; fx.sfx('pop'); b.classList.add('placed'); row.appendChild(b); refresh(); };
      bank.appendChild(b);
    });
    row.addEventListener('click', e => {
      const c = e.target.closest('.chip');
      if (!c || !row.contains(c) || c.disabled) return;
      fx.sfx('tap');
      c.classList.remove('placed');
      bank.appendChild(c);
      refresh();
    });
    $('#tclear', mount).onclick = () => {
      fx.sfx('tap');
      Array.from(row.children).forEach(c => bank.appendChild(c));
      refresh();
    };
    $('#tcheck', mount).onclick = () => {
      const ok = placed.map(c => c.textContent).join('|') === it.ans.join('|');
      $$('.chip', mount).forEach(c => c.classList.add(ok ? 'right' : ''));
      o.onSubmit(ok);
    };
    return null;
  },

  'fill-blank'(mount, o) {
    const fb = buildFillBlank(o.entry, o.level);
    mount.innerHTML = `
      <p class="fill-line">${esc(fb.shown).replace('___', '<span class="blank">___</span>')}</p>
      <div class="row center"><button class="btn ghost sound" id="tplay" type="button">🔊 Hear the full sentence</button></div>
      <div class="opts">${fb.opts.map(w => `<button class="opt" type="button" data-v="${esc(w)}">${esc(w)}</button>`).join('')}</div>`;
    say(fb.full, o.rate || 0.95);
    $('#tplay', mount).onclick = () => say(fb.full, o.rate || 0.95);
    $$('.opt', mount).forEach(b => b.onclick = () => {
      $$('.opt', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(fb.missing)) x.classList.add('right'); });
      if (norm(b.dataset.v) !== norm(fb.missing)) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(fb.missing));
    });
    return null;
  },

  'speak'(mount, o) {
    const it = o.entry.item;
    mount.innerHTML = `
      <div class="row center">
        <button class="btn ghost big" id="tplay" type="button">🔊 Play</button>
        ${o.hasMic ? '<button class="btn big mic" id="tmic" type="button">🎤 Say it</button>' : ''}
      </div>
      <p class="en-hint">${esc(it.en)}</p>
      <div id="tsfb" class="feedback" aria-live="polite"></div>`;
    say(it.es, 0.9);
    $('#tplay', mount).onclick = () => say(it.es, 0.9);
    if (!o.hasMic) {
      mount.insertAdjacentHTML('beforeend', `<div class="selfrate">How close did it sound?
        <button class="btn ghost star" data-v="3" type="button">🌟 Nailed it</button>
        <button class="btn ghost star" data-v="2" type="button">👍 Close</button>
        <button class="btn ghost star" data-v="1" type="button">🤔 Rough</button></div>`);
      $$('.star', mount).forEach(b => b.onclick = () => {
        const v = +b.dataset.v;
        o.onSubmit(v >= 2, { pct: v === 3 ? 95 : 80 });
      });
      return null;
    }
    const rec = makeRecognizer();
    let stopT = null, listening = false, done = false;
    rec.onresult = e => {
      if (done) return;
      done = true;
      const alts = Array.from(e.results[0]).map(a => a.transcript);
      let best = 0, bestTxt = alts[0] || '';
      alts.forEach(t => { const s = similarity(t, it.es); if (s > best) { best = s; bestTxt = t; } });
      o.onSubmit(best >= 0.75, { pct: Math.round(best * 100), transcript: bestTxt });
    };
    rec.onend = () => {
      listening = false;
      const m = $('#tmic', mount);
      if (m) { m.classList.remove('listening'); m.textContent = '🎤 Say it'; }
    };
    rec.onerror = e => {
      listening = false;
      if ((e.error === 'not-allowed' || e.error === 'service-not-allowed') && !$('#tsfb', mount).querySelector('.notice')) {
        $('#tsfb', mount).insertAdjacentHTML('beforeend', '<div class="notice">🔇 Mic blocked — allow it in the browser bar and reload.</div>');
      }
    };
    $('#tmic', mount).onclick = () => {
      if (done) return;
      if (listening) { try { rec.stop(); } catch {} return; }
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      try {
        rec.start();
        listening = true;
        const m = $('#tmic', mount);
        if (m) { m.classList.add('listening'); m.textContent = '⏹ Listening…'; }
        stopT = setTimeout(() => { if (listening) { try { rec.stop(); } catch {} } }, 4000);
      } catch {}
    };
    return { cleanup() { if (stopT) clearTimeout(stopT); try { rec.abort(); } catch {} } };
  },

  'keyword'(mount, o) {
    const it = o.entry.item;
    const opts = keywordOptions(o.entry, o.level);
    mount.innerHTML = `
      <div class="row center"><button class="btn ghost big" id="tplay" type="button">🔊 Play</button></div>
      <p class="muted small">It's fast. Which keyword did they actually say?</p>
      <div class="opts">${opts.map(w => `<button class="opt kw" type="button" data-v="${esc(w)}">${esc(w)}</button>`).join('')}</div>`;
    say(it.es, o.rate || 1);
    $('#tplay', mount).onclick = () => say(it.es, o.rate || 1);
    $$('.opt', mount).forEach(b => b.onclick = () => {
      $$('.opt', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(it.kw[0])) x.classList.add('right'); });
      if (norm(b.dataset.v) !== norm(it.kw[0])) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(it.kw[0]));
    });
    return null;
  },

  'respond'(mount, o) {
    const it = o.entry.item;
    const opts = respondOptions(o.entry, o.level);
    mount.innerHTML = `<div class="opts wide">${opts.map(x =>
      `<button class="opt-line" type="button" data-v="${esc(x.es)}"><span>${esc(x.es)}</span><span class="gloss">${esc(x.en)}</span></button>`).join('')}</div>`;
    $$('.opt-line', mount).forEach(b => b.onclick = () => {
      $$('.opt-line', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(it.es)) x.classList.add('right'); });
      if (norm(b.dataset.v) !== norm(it.es)) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(it.es));
    });
    return null;
  },

  'pick-correct'(mount, o) {
    const it = o.entry.item;
    const opts = shuffle([it.correct].concat(it.wrongs));
    mount.innerHTML = `<div class="opts wide">${opts.map(s => `<button class="opt-line" type="button" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    $$('.opt-line', mount).forEach(b => b.onclick = () => {
      $$('.opt-line', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(it.correct)) x.classList.add('right'); });
      if (norm(b.dataset.v) !== norm(it.correct)) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(it.correct));
    });
    return null;
  },

  'pick-wrong'(mount, o) {
    const it = o.entry.item;
    const opts = shuffle([it.correct].concat(it.wrongs));
    mount.innerHTML = `<div class="opts wide">${opts.map(s => `<button class="opt-line" type="button" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    $$('.opt-line', mount).forEach(b => b.onclick = () => {
      const chosen = b.dataset.v;
      $$('.opt-line', mount).forEach(x => {
        x.disabled = true;
        if (norm(x.dataset.v) !== norm(it.correct)) x.classList.add('right');
      });
      if (norm(chosen) === norm(it.correct)) b.classList.remove('right');
      if (norm(chosen) === norm(it.correct)) b.classList.add('wrong');
      o.onSubmit(norm(chosen) !== norm(it.correct));
    });
    return null;
  },
};

/* expose helpers for testing */
window._tasksTest = { pickOptions, keywordOptions, respondOptions, buildFillBlank, uniqNorm };
