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
    mount.innerHTML = `
      <div class="row center"><button class="btn ghost big" id="tplay" type="button">🔊 Play</button></div>
      <div class="opts">${opts.map(x => `<button class="opt" type="button" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
    say(it.es, o.rate || 1);
    $('#tplay', mount).onclick = () => say(it.es, o.rate || 1);
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
      $('#tcheck', mount).disabled = placed.length === 0;
    };
    shuffle(it.ans.concat(it.distr)).forEach(word => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = word;
      b.onclick = () => {
        if (b.disabled || row.contains(b)) return;
        fx.sfx('pop');
        b.classList.add('placed');
        row.appendChild(b);
        refresh();
      };
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
      Array.from(row.children).forEach(c => {
        c.classList.remove('placed');
        bank.appendChild(c);
      });
      refresh();
    };
    $('#tcheck', mount).onclick = () => {
      if (!placed.length) return;
      const ok = placed.length === it.ans.length
        && placed.every((c, i) => norm(c.textContent) === norm(it.ans[i]));
      $$('.chip', mount).forEach(c => { c.disabled = true; });
      placed.forEach((c, i) => {
        const tokenOk = i < it.ans.length && norm(c.textContent) === norm(it.ans[i]);
        c.classList.add(ok || tokenOk ? 'right' : 'wrong');
      });
      $('#tclear', mount).disabled = true;
      $('#tcheck', mount).disabled = true;
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

  'flashcard'(mount, o) {
    const it = o.entry.item;
    const opts = shuffle([it.es].concat(it.wrongs || []));
    const detailsHtml = it.cardType === 'verb' && it.formsTable
      ? `<div class="fc-table">
          <div><b>Infinitivo:</b> ${esc(it.formsTable.infinitive)}</div>
          <div><b>Presente:</b> ${esc(it.formsTable.presente)}</div>
          <div><b>Pretérito:</b> ${esc(it.formsTable.preterito)}</div>
          <div><b>Imperfecto:</b> ${esc(it.formsTable.imperfecto)}</div>
          <div><b>Futuro:</b> ${esc(it.formsTable.futuro)}</div>
          <div><b>Condicional:</b> ${esc(it.formsTable.condicional)}</div>
          <div><b>Combinaciones:</b> ${esc(it.formsTable.combinaciones)}</div>
        </div>`
      : `<div class="fc-table">
          <div><b>Forma:</b> ${esc(it.genderInfo || 'Noun')}</div>
          <div><b>Combinaciones:</b> ${esc(it.comboExample || '')}</div>
        </div>`;
    mount.innerHTML = `
      <div class="card fc-box">
        <div class="row between">
          <span class="tag">${esc(it.badge || 'Flashcard')}</span>
          <button class="btn ghost mini" id="fcFlip" type="button">🔄 Flip card</button>
        </div>
        <div id="fcBack" class="fc-back" hidden>
          <p class="word-es">${esc(it.es)} <button class="btn ghost mini" id="fcSay" type="button">🔊</button></p>
          <p class="muted">${esc(it.en)}</p>
          ${detailsHtml}
        </div>
      </div>
      <div class="opts wide">${opts.map(s => `<button class="opt-line" type="button" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    const back = $('#fcBack', mount);
    const flipBtn = $('#fcFlip', mount);
    if (flipBtn && back) {
      flipBtn.onclick = () => {
        back.hidden = !back.hidden;
        if (!back.hidden) say(it.es, o.rate || 1);
      };
    }
    const sayBtn = $('#fcSay', mount);
    if (sayBtn) sayBtn.onclick = () => say(it.es, o.rate || 1);
    $$('.opt-line', mount).forEach(b => b.onclick = () => {
      if (back) back.hidden = false;
      $$('.opt-line', mount).forEach(x => {
        x.disabled = true;
        if (norm(x.dataset.v) === norm(it.es)) x.classList.add('right');
      });
      if (norm(b.dataset.v) !== norm(it.es)) b.classList.add('wrong');
      o.onSubmit(norm(b.dataset.v) === norm(it.es));
    });
    return null;
  },

  /* The 200-verb deck: the card carries both sides plus its four options, so
     ES→EN and EN→ES items use the same renderer. */
  'verb-card'(mount, o) {
    const it = o.entry.item;
    const all = (it.options && it.options.length) ? it.options : [it.answer].concat(it.wrongs || []);
    const opts = shuffle(all);
    const rows = it.rows || [];
    const detailsHtml = rows.length
      ? `<div class="fc-table">${rows.map(r => `<div><b>${esc(r.k)}:</b> ${esc(r.v)}</div>`).join('')}</div>`
      : '';
    mount.innerHTML = `
      <div class="card fc-box">
        <div class="row between">
          <span class="tag">${esc(it.badge || 'Flashcard')}</span>
          <button class="btn ghost mini" id="fcFlip" type="button">🔄 Flip card</button>
        </div>
        <div id="fcBack" class="fc-back" hidden>
          <p class="word-es">${esc(it.es)} <button class="btn ghost mini" id="fcSay" type="button">🔊</button></p>
          <p class="muted">${esc(it.en)}</p>
          ${detailsHtml}
        </div>
      </div>
      <div class="opts wide">${opts.map(s => `<button class="opt-line" type="button" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
    const back = $('#fcBack', mount);
    const flipBtn = $('#fcFlip', mount);
    if (flipBtn && back) {
      flipBtn.onclick = () => {
        back.hidden = !back.hidden;
        if (!back.hidden) say(it.say || it.es, o.rate || 1);
      };
    }
    const sayBtn = $('#fcSay', mount);
    if (sayBtn) sayBtn.onclick = () => say(it.say || it.es, o.rate || 1);
    const isRight = v => norm(v) === norm(it.answer);
    $$('.opt-line', mount).forEach(b => b.onclick = () => {
      if (back) back.hidden = false;
      $$('.opt-line', mount).forEach(x => {
        x.disabled = true;
        if (isRight(x.dataset.v)) x.classList.add('right');
      });
      if (!isRight(b.dataset.v)) b.classList.add('wrong');
      o.onSubmit(isRight(b.dataset.v));
    });
    return null;
  },
};

/* expose helpers for testing */
window._tasksTest = { pickOptions, keywordOptions, buildFillBlank, uniqNorm };
