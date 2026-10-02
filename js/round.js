'use strict';
/* ============ Shared round runner: an endless queue of unlearned items,
   rotating formats, mastery pips, and a live session scoreboard.

   There is no fixed round length (no "10 questions") and no end screen:
   questions keep coming for as long as the player stays in the game. When a
   level runs out of unlearned items the queue refills with everything in the
   level for free practice. The session only ends — and banks its XP — when
   the player goes back to the games page (or closes the tab). ============ */

const XPMAP = {
  'listen-pick': 8, 'pick-es': 8,
  'word-order': 15, 'fill-blank': 10, 'pick-correct': 12, 'pick-wrong': 12,
  'keyword': 10,
  'read-quiz': 10, 'listen-quiz': 12,
  'flashcard': 10,
  'verb-card': 10,
};

const FORMAT_LABEL = {
  'listen-pick': '👂 Listen & pick',
  'pick-es': '👂 Listen & pick word',
  'word-order': '🧩 Build the sentence',
  'fill-blank': '👂 Listen & fill the gap',
  'pick-correct': '✅ Which is correct?',
  'pick-wrong': '❌ Spot the mistake',
  'keyword': '👂 Catch the keyword',
  'read-quiz': '📖 Read & answer',
  'listen-quiz': '🎧 Listen & answer',
  'flashcard': '🃏 Verb & Noun Flashcard',
  'verb-card': '📚 Verb & Glue Card',
};

/* bank XP every N answers so a long session survives a closed tab */
const XP_CHECKPOINT_EVERY = 10;

function pipSpans(streak, target = MASTERED_AT) {
  return Array.from({ length: target }, (_, i) => `<span class="pip ${i < streak ? 'on' : ''}"></span>`).join('');
}
function pipsHTML(streak, id, target = MASTERED_AT) {
  const title = target === 1 ? 'one correct answer completes this sentence' : `${streak}/${target} correct in a row`;
  return `<div class="pips" ${id ? `id="${id}"` : ''} title="${title}">${pipSpans(streak, target)}</div>`;
}

function labelOf(entry) {
  return entry.kind === 'grammar' ? entry.item.correct : entry.item.es;
}

function promptFor(entry, format) {
  const it = entry.item;
  switch (format) {
    case 'type-en': return `<span class="prompt-k">¿Qué significa?</span><h1 class="word-es">${esc(it.es)}</h1>`;
    case 'listen-pick': return `<span class="prompt-k">Escucha y elige el significado</span>`;
    case 'pick-es': return `<span class="prompt-k">¿Qué palabra escuchaste?</span>`;
    case 'word-order': return `<p class="prompt-en">"${esc(it.en)}"</p><p class="muted small">Tap the words in the right order.</p>`;
    case 'fill-blank': return `<span class="prompt-k">Escucha y elige la palabra que falta</span>`;
    case 'pick-correct': return it.prompt
      ? `<span class="prompt-k">¿Cuál es correcta?</span><h2 class="q-prompt">${esc(it.prompt)}</h2>`
      : `<span class="prompt-k">¿Cuál es correcta?</span><p class="muted">"${esc(it.en)}"</p>`;
    case 'pick-wrong': return it.prompt
      ? `<span class="prompt-k">¿Cuál tiene un error?</span><h2 class="q-prompt">${esc(it.prompt)}</h2>`
      : `<span class="prompt-k">¿Cuál tiene un error?</span><p class="muted">"${esc(it.en)}"</p>`;
    case 'keyword': return `<span class="prompt-k">¿Qué palabra clave escuchaste?</span><p class="muted small">It's fast. Catch the keyword.</p>`;
    case 'flashcard': return `<span class="prompt-k">${esc(it.badge || 'Flashcard')}</span><h2 class="q-prompt">${esc(it.prompt || it.en)}</h2>`;
    case 'verb-card': return `<span class="prompt-k">${esc(it.badge || 'Flashcard')}</span><h2 class="q-prompt">${esc(it.prompt || it.en)}</h2>`;
  }
  return '';
}

/* ---------- session XP banking ----------
   A session ends when the player leaves the game, so the XP is banked on the
   way out (and checkpointed along the way). */
let pendingXP = null;

function bankPendingXP() {
  if (!pendingXP) return 0;
  const p = pendingXP;
  pendingXP = null;
  store.set('pendingXP', null);
  if (p.xp > 0) {
    try { player.award(p.xp, { game: p.title, exam: p.exam }); } catch {}
  }
  return p.xp;
}

function rememberPendingXP(chunk, title, exam) {
  pendingXP = chunk > 0 ? { xp: chunk, title, exam } : null;
  store.set('pendingXP', pendingXP);
}

/* a tab closed mid-session leaves its XP behind — bank it on the next visit */
if (typeof store !== 'undefined') {
  const leftOver = store.get('pendingXP', null);
  if (leftOver && leftOver.xp > 0) pendingXP = leftOver;
}
if (window.addEventListener) {
  window.addEventListener('pagehide', bankPendingXP);
}

function scoreboardHTML(s, remaining) {
  const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
  const left = remaining == null ? '' : `<span>📚 <b id="sbLeft">${remaining}</b> left</span>`;
  return `
    <div class="scoreboard" aria-live="polite">
      <div class="sb-main">
        <span class="sb-correct"><b id="sbCorrect">${s.correct}</b> correct</span>
        <span class="sb-sep">·</span>
        <span class="sb-wrong"><b id="sbWrong">${s.wrong}</b> to review</span>
        <span class="sb-sep">·</span>
        <span class="muted"><b id="sbAnswered">${s.answered}</b> answered</span>
      </div>
      <div class="sb-bar"><div class="sb-bar-fill${s.answered && pct < 50 ? ' low' : ''}" id="sbBar" style="width:${s.answered ? pct : 0}%"></div></div>
      <div class="sb-side muted small">
        <span>🎯 <b id="sbPct">${s.answered ? pct + '%' : '—'}</b></span>
        <span>🔥 <b id="sbCombo">${s.combo}</b> racha</span>
        <span>⭐ <b id="sbXp">${s.xp}</b> XP</span>
        <span>🔒 <b id="sbLocked">${s.locked}</b> locked in</span>
        ${left}
      </div>
    </div>`;
}

function runRound(view, cfg) {
  const { level, icon, title } = cfg;
  bankPendingXP();                                  // close out any session still open
  setCleanup(() => { clearKey(); bankPendingXP(); });

  const hasMic = !!makeRecognizer();

  /* endless-session state */
  const s = { correct: 0, wrong: 0, answered: 0, combo: 0, xp: 0, locked: 0 };
  let bankedXP = 0;
  let clean = null;
  let keyHandler = null;
  let queue = [];
  const served = new Set();
  let lastKey = null;
  let reviewMode = false;
  let remaining = cfg.remainingFn ? cfg.remainingFn() : null;

  const entryKey = p => p.kind + '::' + p.id;
  const isMastered = p => engine.get(level, p.kind, p.id).streak >= engine.masteryTarget(p.kind);

  function clearKey() {
    if (keyHandler && document.removeEventListener) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  /* refill from what is still unlearned; once everything is locked in,
     keep drilling the whole level so the game never has to stop */
  function refill() {
    const fresh = cfg.poolFn ? cfg.poolFn() : engine.order(engine.unmastered(level, cfg.kind), level);
    if (fresh.length) { reviewMode = false; return fresh; }
    const all = cfg.allFn ? cfg.allFn() : engine.pool(level, cfg.kind || undefined);
    reviewMode = all.length > 0;
    return engine.order(all, level);
  }

  /* next exercise — never repeats an item until the whole deck has been through,
     skips anything that got locked in while it was waiting in the queue */
  function nextEntry() {
    for (let guard = 0; guard < 500; guard++) {
      if (!queue.length) {
        const batch = refill();
        if (!batch.length) return null;
        let candidates = batch.filter(p => !served.has(entryKey(p)));
        if (!candidates.length) { served.clear(); candidates = batch.slice(); }
        queue = candidates;
      }
      const p = queue.shift();
      const k = entryKey(p);
      if (k === lastKey && queue.length) { queue.push(p); continue; }
      if (!reviewMode && isMastered(p)) continue;
      served.add(k);
      lastKey = k;
      return p;
    }
    return null;
  }

  function updateScoreboard() {
    const set = (sel, v) => { const el = $('#' + sel, view); if (el) el.textContent = String(v); };
    const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
    set('sbCorrect', s.correct);
    set('sbWrong', s.wrong);
    set('sbAnswered', s.answered);
    set('sbPct', s.answered ? pct + '%' : '—');
    set('sbCombo', s.combo);
    set('sbXp', s.xp);
    set('sbLocked', s.locked);
    const bar = $('#sbBar', view);
    if (bar) {
      bar.style.width = (s.answered ? pct : 0) + '%';
      if (bar.classList && bar.classList.toggle) bar.classList.toggle('low', s.answered > 0 && pct < 50);
    }
    const leftEl = $('#sbLeft', view);
    if (leftEl) leftEl.textContent = remaining == null ? '' : String(remaining);
  }

  /* sentence practice and the big verb deck count after one correct answer:
     they should not fire the full "locked in forever" celebration */
  const LIGHT_KINDS = { verbSentence: 1, verbCard: 1 };

  function step() {
    const p = nextEntry();
    if (!p) return showComplete(view, cfg);

    const st0 = engine.get(level, p.kind, p.id);
    const masteryTarget = engine.masteryTarget(p.kind);
    const format = cfg.formatFn
      ? cfg.formatFn(p)
      : engine.format(p, level, { noMic: !hasMic });

    view.innerHTML = `
      <div class="game-head">
        <div class="head-row">
          ${backBtn()}
          <span class="head-title">${icon} ${esc(title)} <span class="muted small">· ${esc(level)} · sin fin</span></span>
          <span class="grow"></span>
          ${pipsHTML(st0.streak, 'pips', masteryTarget)}
        </div>
        ${scoreboardHTML(s, remaining)}
      </div>
      ${cfg.filtersFn ? `<div class="card fc-filter-bar">${cfg.filtersFn()}</div>` : ''}
      <div class="card">
        ${reviewMode ? `<p class="notice">🏆 Everything in ${esc(level)} is locked in — this is free practice now. Stay as long as you like; the round ends when you go back to the games page.</p>` : ''}
        <span class="chip-cat format-chip">${FORMAT_LABEL[format] || format}</span>
        ${promptFor(p, format)}
        <div id="task"></div>
        <div id="fb" class="feedback" aria-live="polite"></div>
      </div>`;

    if (cfg.bindFilters) cfg.bindFilters(view, next);

    const mount = $('#task', view);
    clean = tasks[format](mount, {
      entry: p, level, hasMic,
      rate: cfg.getRate ? cfg.getRate() : 1,
      onSubmit: (ok, meta) => {
        const res = engine.result(level, p.kind, p.id, ok, format);
        let gained = 0;
        s.answered++;
        if (ok) {
          s.correct++;
          s.combo++;
          gained = XPMAP[format] || 10;
          if (s.combo % 3 === 0) {
            gained += 10;
            if (s.combo === 3) fx.stamp('¡RACHA!');
            fx.floatText($('.card', view), '🔥 racha x' + s.combo + ' +10 XP');
          }
          fx.sfx(res.justMastered ? 'perfect' : 'correct');
          fx.floatText($('.card', view), '+' + gained + ' XP');
          if (res.justMastered) {
            s.locked++;
            if (remaining != null && remaining > 0) remaining--;
            if (!LIGHT_KINDS[p.kind]) {
              s.xp += 20;
              fx.confetti(120);
              fx.sfx('fanfare');
              fx.stamp('¡APRENDIDO!');
              player.toast(`<b>${esc(labelOf(p))}</b> — ${res.streak}/${res.target}, it's yours now 🔒 (+20 XP)`, { icon: '🔒' });
            }
          }
        } else {
          s.wrong++;
          s.combo = 0;
          fx.sfx('wrong');
          fx.shake($('.card', view));
        }
        s.xp += gained;

        const st2 = engine.get(level, p.kind, p.id);
        const headPips = $('#pips', view);
        if (headPips) headPips.innerHTML = pipSpans(st2.streak, masteryTarget);
        const explain = p.item.explain ? `<p class="explain">${p.item.explain}</p>` : '';
        const correctText = format === 'listen-pick' ? p.item.en
          : (format === 'keyword' ? p.item.kw[0]
          : (p.kind === 'grammar' ? p.item.correct : (p.item.answer || p.item.es)));
        const successText = p.kind === 'verbSentence'
          ? '✅ Sentence practiced (1/1); it counts toward this verb.'
          : (p.kind === 'verbCard'
            ? '✅ Card practiced (1/1).'
            : (res.justMastered ? `🔒 ${res.streak}/${res.target} — locked in forever` : `${res.streak}/${res.target} to lock in`));
        $('#fb', view).innerHTML = `
          ${ok ? `<div class="fb good">¡Correcto! <span class="small">${successText}</span></div>`
               : `<div class="fb bad">Not yet — <b>${esc(correctText)}</b></div>`}
          <div class="recall">🗣️ <b>${esc(labelOf(p))}</b>${p.item.en ? ` <span class="muted">— ${esc(p.item.en)}</span>` : ''}</div>
          ${explain}
          ${pipsHTML(st2.streak, null, masteryTarget)}
          <div class="fb-actions"><button class="btn" id="next" type="button">Next →</button></div>`;
        $('#next', view).onclick = next;
        updateScoreboard();

        rememberPendingXP(s.xp - bankedXP, title, level === 'EXAM');
        if (s.answered % XP_CHECKPOINT_EVERY === 0) {
          bankedXP = s.xp;
          bankPendingXP();
          if (cfg.remainingFn) { remaining = cfg.remainingFn(); updateScoreboard(); }
        }

        clearKey();
        keyHandler = e => {
          if (!e || (e.key !== 'Enter' && e.key !== ' ')) return;
          const t = e.target;
          if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')) return;
          e.preventDefault();
          next();
        };
        if (document.addEventListener) document.addEventListener('keydown', keyHandler);
      },
    });
  }

  function next() {
    clearKey();
    if (clean && clean.cleanup) clean.cleanup();
    clean = null;
    step();
  }

  if (cfg.setup) {
    view.innerHTML = `
      <div class="game-head">
        <div class="head-row">${backBtn()}<span class="head-title">${icon} ${esc(title)} <span class="muted small">· ${esc(level)} · setup</span></span></div>
      </div>
      <div class="card center">
        <div class="end-emoji">${icon}</div>
        <h1>${esc(title)}</h1>
        <p class="muted">${esc(cfg.setupText || '')}</p>
        <label class="toggle"><input type="checkbox" id="slow"> 🐢 Slow (0.75x)</label>
        <div class="row center"><button class="btn big" id="go" type="button">Start ▶</button></div>
      </div>`;
    $('#go', view).onclick = () => {
      if (cfg.onSetup) cfg.onSetup($('#slow', view).checked);
      step();
    };
    return;
  }
  step();
}

function showComplete(view, cfg) {
  fx.confetti(180);
  fx.sfx('fanfare');
  view.innerHTML = `
    <div class="card center endcard">
      <div class="end-emoji">🏆</div>
      <h1>¡Todo aprendido!</h1>
      <p class="big">${esc(cfg.completeText || `Every ${cfg.kindLabel || 'item'} in ${cfg.level} is locked in (5/5).`)}</p>
      <p class="muted">Nothing left to drill here — your brain keeps it forever. Try the next level or a different game.</p>
      <div class="row center">${backBtn()}</div>
    </div>`;
}
