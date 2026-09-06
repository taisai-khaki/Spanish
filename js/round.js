'use strict';
/* ============ Shared round runner: queue of unlearned items,
   rotating formats, mastery pips, lock-in celebration ============ */

const XPMAP = {
  'type-en': 10, 'type-es': 12, 'listen-pick': 8, 'pick-es': 6,
  'word-order': 15, 'fill-blank': 10, 'pick-correct': 12, 'pick-wrong': 12,
  'keyword': 10, 'respond': 10, 'speak': 15,
  'ask-listen': 8, 'ask-speak': 15, 'ask-write': 12,
  'read-quiz': 10, 'listen-quiz': 12,
};

const FORMAT_LABEL = {
  'type-en': '✍️ Write the meaning',
  'type-es': '✍️ Write it in Spanish',
  'listen-pick': '👂 Listen & pick',
  'pick-es': '🔤 Pick the word',
  'word-order': '🧩 Build the sentence',
  'fill-blank': '🧩 Fill the gap',
  'pick-correct': '✅ Which is correct?',
  'pick-wrong': '❌ Spot the mistake',
  'keyword': '👂 Catch the keyword',
  'respond': '💬 Pick your reply',
  'speak': '🎤 Say it out loud',
  'ask-listen': '👂 Catch the question',
  'ask-speak': '🎤 Answer out loud',
  'ask-write': '✍️ Answer in writing',
  'read-quiz': '📖 Read & answer',
  'listen-quiz': '🎧 Listen & answer',
};

function pipSpans(streak) {
  return [0, 1, 2, 3, 4].map(i => `<span class="pip ${i < streak ? 'on' : ''}"></span>`).join('');
}
function pipsHTML(streak, id) {
  return `<div class="pips" ${id ? `id="${id}"` : ''} title="${streak}/5 correct in a row">${pipSpans(streak)}</div>`;
}

function labelOf(entry) {
  return entry.kind === 'grammar' ? entry.item.correct : entry.item.es;
}

function promptFor(entry, format) {
  const it = entry.item;
  switch (format) {
    case 'type-en': return `<span class="prompt-k">¿Qué significa?</span><h1 class="word-es">${esc(it.es)}</h1>`;
    case 'type-es': return `<span class="prompt-k">Escríbelo en español</span><h1 class="word-es enp">${esc(it.en)}</h1>`;
    case 'listen-pick': return `<span class="prompt-k">Escucha y elige el significado</span>`;
    case 'pick-es': return `<span class="prompt-k">¿Cómo se dice?</span><h1 class="word-es enp">${esc(it.en)}</h1>`;
    case 'word-order': return `<p class="prompt-en">"${esc(it.en)}"</p><p class="muted small">Tap the words in the right order.</p>`;
    case 'fill-blank': return `<span class="prompt-k">Elige la palabra que falta</span>`;
    case 'pick-correct': return it.prompt
      ? `<span class="prompt-k">¿Cuál es correcta?</span><h2 class="q-prompt">${esc(it.prompt)}</h2>`
      : `<span class="prompt-k">¿Cuál es correcta?</span><p class="muted">"${esc(it.en)}"</p>`;
    case 'pick-wrong': return it.prompt
      ? `<span class="prompt-k">¿Cuál tiene un error?</span><h2 class="q-prompt">${esc(it.prompt)}</h2>`
      : `<span class="prompt-k">¿Cuál tiene un error?</span><p class="muted">"${esc(it.en)}"</p>`;
    case 'keyword': return `<span class="prompt-k">¿Qué palabra clave escuchaste?</span><p class="muted small">It's fast. Catch the keyword.</p>`;
    case 'respond': return `<span class="prompt-k">¿Qué respondes?</span>`;
    case 'speak': return `<span class="prompt-k">Dilo en voz alta 🗣️</span><h1 class="word-es">${esc(it.es)}</h1>`;
  }
  return '';
}

function runRound(view, cfg) {
  const { level, id, icon, title, size } = cfg;
  const pool = (cfg.poolFn
    ? cfg.poolFn()
    : engine.unmastered(level, cfg.kind)
  ).slice(0, size);

  if (!pool.length) return showComplete(view, cfg);

  let qi = 0, xp = 0, locked = 0, missFlag = {}, misses = [];
  let clean = null;
  const hasMic = !!makeRecognizer();

  function step() {
    if (qi >= pool.length) return done();
    const p = pool[qi];
    const st0 = engine.get(level, p.kind, p.id);
    const format = cfg.formatFn
      ? cfg.formatFn(p)
      : engine.format(p, level, { noMic: !hasMic });

    view.innerHTML = `
      <div class="game-head">${backBtn()}
        <div class="head-progress"><span class="muted">${esc(title)} · <b>${qi + 1}</b> / ${pool.length}</span>${barHTML(qi, pool.length)}</div>
        ${pipsHTML(st0.streak, 'pips')}
      </div>
      <div class="card">
        <span class="chip-cat format-chip">${FORMAT_LABEL[format] || format}</span>
        ${promptFor(p, format)}
        <div id="task"></div>
        <div id="fb" class="feedback" aria-live="polite"></div>
      </div>`;

    const mount = $('#task', view);
    clean = tasks[format](mount, {
      entry: p, level, hasMic,
      rate: cfg.getRate ? cfg.getRate() : 1,
      onSubmit: (ok, meta) => {
        const res = engine.result(level, p.kind, p.id, ok, format);
        let gained = 0;
        if (ok) {
          gained = XPMAP[format] || 10;
          if (format === 'speak' && meta && meta.pct >= 90) gained = 20;
          if (format === 'speak' && meta && meta.pct >= 90) player.flag('speak90');
          fx.sfx(res.justMastered ? 'perfect' : (format === 'speak' && meta && meta.pct >= 90 ? 'perfect' : 'correct'));
          fx.floatText($('.card', view), '+' + gained + ' XP');
          if (res.justMastered) {
            locked++;
            xp += 20;
            fx.confetti(120);
            fx.sfx('fanfare');
            fx.stamp('¡APRENDIDO!');
            player.toast(`<b>${esc(labelOf(p))}</b> — 5/5, it's yours now 🔒 (+20 XP)`, { icon: '🔒' });
          }
        } else {
          fx.sfx('wrong');
          fx.shake($('.card', view));
          if (!missFlag[p.id]) { missFlag[p.id] = true; misses.push(p); }
        }
        xp += gained;
        const st2 = engine.get(level, p.kind, p.id);
        const headPips = $('#pips', view);
        if (headPips) headPips.innerHTML = pipSpans(st2.streak);
        const explain = p.item.explain ? `<p class="explain">${p.item.explain}</p>` : '';
        const correctText = p.kind === 'word' ? p.item.en : (p.kind === 'grammar' || p.kind === 'repaso' ? p.item.correct : p.item.es);
        $('#fb', view).innerHTML = `
          ${ok ? `<div class="fb good">¡Correcto! <span class="small">${res.justMastered ? '🔒 5/5 — locked in forever' : res.streak + '/5 to lock in'}</span></div>`
               : `<div class="fb bad">Not yet — <b>${esc(correctText)}</b></div>`}
          <div class="recall">🗣️ <b>${esc(labelOf(p))}</b>${p.item.en ? ` <span class="muted">— ${esc(p.item.en)}</span>` : ''}</div>
          ${explain}
          ${pipsHTML(st2.streak)}
          <div class="fb-actions"><button class="btn" id="next" type="button">Next →</button></div>`;
        $('#next', view).onclick = next;
      },
    });
  }

  function next() {
    if (clean && clean.cleanup) clean.cleanup();
    qi++;
    step();
  }

  function done() {
    if (clean && clean.cleanup) clean.cleanup();
    const remaining = engine.unmastered(level, cfg.kind || null).length;
    if (cfg.onDone) cfg.onDone({ xp, locked, poolSize: pool.length, missedCount: misses.length });
    player.award(xp, { game: title });
    view.innerHTML = `
      <div class="card center endcard">
        <div class="end-emoji">${icon}</div>
        <h1>${locked > 0 ? '¡Buen avance!' : '¡Buen intento!'}</h1>
        <p class="big"><b>${locked}</b> ${locked === 1 ? 'item' : 'items'} locked in (5/5) · <b>${xp}</b> XP</p>
        <p class="muted">${remaining} ${cfg.kindLabel || 'item'}${remaining === 1 ? '' : 's'} left in ${level}. Only what you haven't learned shows up — that's the rule.</p>
        ${misses.length ? `<h3>These come back — in a different shape:</h3><ul class="review">${misses.slice(0, 6).map(p =>
          `<li><b>${esc(labelOf(p))}</b>${p.item.en ? ` <span class="muted">— ${esc(p.item.en)}</span>` : ''}</li>`).join('')}</ul>` : ''}
        <div class="row center"><a class="btn" href="#/${id}">Again 🔁</a>${backBtn()}</div>
      </div>`;
  }

  if (cfg.setup) {
    view.innerHTML = `
      <div class="game-head">${backBtn()}<div class="head-progress"><span class="muted">Setup</span></div></div>
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
      <p class="big">Every ${esc(cfg.kindLabel || 'item')} in ${cfg.level} is locked in (5/5).</p>
      <p class="muted">Nothing left to drill here — your brain keeps it forever. Try the next level or a different game.</p>
      <div class="row center">${backBtn()}</div>
    </div>`;
}
