'use strict';
(function () {
  const view = $('#view');
  let level = store.get('level', 'B1');
  if (!DATA.levels.includes(level)) level = 'B1';
  let mascotTimer = null;

  player.init();

  function renderLevelPills() {
    $$('#levelPills .pill').forEach(p => p.classList.toggle('active', p.dataset.level === level));
  }
  $$('#levelPills .pill').forEach(p => {
    p.onclick = () => {
      level = p.dataset.level;
      store.set('level', level);
      renderLevelPills();
      route();
    };
  });

  function route() {
    if (mascotTimer) { clearInterval(mascotTimer); mascotTimer = null; }
    runCleanup();
    /* "#/game" or "#/game/argument" (the verb path uses it to jump to one verb) */
    const raw = location.hash.replace('#/', '') || 'home';
    const slash = raw.indexOf('/');
    const id = slash < 0 ? raw : raw.slice(0, slash);
    const arg = slash < 0 ? '' : decodeURIComponent(raw.slice(slash + 1));
    const game = GAMES.find(g => g.id === id);
    if (!game) return home();
    game.start(view, level, arg);
    window.scrollTo(0, 0);
  }

  /* ---------- home ---------- */
  function levelProgress() {
    return `
      <div class="card progress-card">
        <h3>📈 Your progress <span class="muted small">— regular items and flash cards need 5/5; A2 verb examples need 1 correct each</span></h3>
        ${DATA.levels.map(lv => {
          const s = engine.stats(lv);
          const pct = s.total ? Math.round((s.locked / s.total) * 100) : 0;
          return `
            <div class="lv-row">
              <span class="lv-name">${lv}${lv === level ? ' 📍' : ''}</span>
              <div class="lv-bar"><div class="lv-bar-fill" style="width:${pct}%"></div></div>
              <span class="lv-num small muted">${s.locked}/${s.total} locked · ${s.progress} in progress · ${s.fresh} new</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  /* ---------- the verb path is the verb progress bar now ----------
     Every verb shows the four steps of the path — root → presente →
     pretérito → word order — instead of a locked-card
     bar. The current step is highlighted, a missed step stays highlighted
     until it is passed, and all four mean the verb is learned. */
  function verbPathTrack(steps, stepIndex) {
    return `<div class="vp-track vp-track-mini" role="list">
      ${steps.map((st, i) => {
        const state = i < stepIndex ? 'done' : (i === stepIndex ? 'now' : 'todo');
        const mark = i < stepIndex ? '✓' : (i === stepIndex ? '▶' : '·');
        return `<span class="vp-step ${state}" role="listitem" title="${esc(st.label + ' — ' + st.blurb)}">${mark} ${esc(st.label)}</span>`;
      }).join('')}
    </div>`;
  }

  function verbPathPanel() {
    const verbs = (DATA[level] && DATA[level].verbPath) || [];
    const steps = window.VERB_PATH_STEPS || [];
    if (!verbs.length || !window.verbPathProgress) return '';
    const st = verbPathProgress.stats();
    const status = p => p.learned ? '✅ Learned'
      : (p.step > 0 ? `▶ Step ${p.step + 1}/4 · ${(steps[p.step] || {}).label || ''}`
      : (p.attempts > 0 ? '▶ Step 1/4 · Root' : 'Not started'));
    return `
      <div class="card verb-progress-card">
        <h3>🧭 ${level} verb path <span class="muted small">— ${st.learned}/${st.total} verbs learned</span></h3>
        <p class="muted small">Each verb walks <b>four steps</b>: 🌱 root (English → Spanish) → 🕐 presente → ⏪ pretérito → 🧩 word order. The part of the verb that stays is shown; the part that changes is typed. Pass all four and the verb is learned.</p>
        <p class="muted small">A mistake never sends you back to the start: the steps you already passed stay saved and the verb resumes at the exact step that failed. ${st.learned} learned · ${st.started} in progress · ${st.fresh} not started.</p>
        <div class="row between vp-panel-top">
          <a class="btn" href="#/verbpath">▶ ${st.learned || st.started ? 'Continue the path' : 'Start the path'}</a>
          <span class="muted small">the 📚 200-verb deck still counts its own 7,076 cards inside the game</span>
        </div>
        <label class="verb-search-label">Find a verb
          <input id="verbProgressFilter" class="answer-input verb-search" type="search" placeholder="Search Spanish or English" autocomplete="off">
        </label>
        <div class="verb-progress-list" aria-label="Verb path progress">
          ${verbs.map(v => {
            const p = verbPathProgress.get(v.es);
            return `
              <div class="verb-progress-row" data-search="${esc(norm(v.es + ' ' + v.en))}">
                <div class="verb-progress-head">
                  <b>${esc(v.es)}</b>
                  <span class="muted small">${esc(v.en)}</span>
                  <span class="verb-status ${p.learned ? 'done' : ''}">${status(p)}</span>
                </div>
                <div class="vp-row">
                  ${verbPathTrack(v.steps, p.step)}
                  <a class="btn ghost mini vp-row-go" href="#/verbpath/${encodeURIComponent(v.es)}">Practice</a>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function verbProgressPanel() {
    const path = (DATA[level] && DATA[level].verbPath) || [];
    if (path.length && window.verbPathProgress) return verbPathPanel();
    const progress = engine.verbProgress(level);
    if (!progress.length) return '';
    const learned = progress.filter(p => p.learned).length;
    const done = progress.reduce((n, p) => n + p.done, 0);
    const all = progress.reduce((n, p) => n + p.total, 0);
    return `
      <div class="card verb-progress-card">
        <h3>🧩 ${level} verb practice <span class="muted small">— ${learned}/${progress.length} verbs learned</span></h3>
        <p class="muted small">Each verb has ${progress[0].total} linked examples: 11 magic-verb frames × 6 person forms. Answer every example correctly once to learn that verb. ${done}/${all} examples completed.</p>
        <label class="verb-search-label">Find a verb
          <input id="verbProgressFilter" class="answer-input verb-search" type="search" placeholder="Search Spanish or English" autocomplete="off">
        </label>
        <div class="verb-progress-list" aria-label="Verb practice progress">
          ${progress.map(p => {
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            const status = p.learned ? '✅ Learned' : `${p.done}/${p.total}`;
            return `
              <div class="verb-progress-row" data-search="${esc(norm(p.verb.es + ' ' + p.verb.en))}">
                <div class="verb-progress-head"><b>${esc(p.verb.es)}</b><span class="muted small">${esc(p.verb.en)}</span><span class="verb-status ${p.learned ? 'done' : ''}">${status}</span></div>
                <div class="lv-bar"><div class="lv-bar-fill" style="width:${pct}%"></div></div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  function bindVerbProgressFilter() {
    const input = $('#verbProgressFilter', view);
    if (!input) return;
    input.oninput = () => {
      const query = norm(input.value);
      $$('.verb-progress-row', view).forEach(row => {
        row.hidden = query && !row.dataset.search.includes(query);
      });
    };
  }

  function playerPanel() {
    const d = player.data;
    return `
      ${levelProgress()}
      <div class="card badge-card">
        <h3>🏅 Badges <span class="muted small">(${Object.keys(d.badges).length}/${BADGES.length})</span></h3>
        <div class="badges">
          ${BADGES.map(b => {
            const got = d.badges[b.id];
            return `<div class="badge-item ${got ? 'got' : 'locked'}" title="${esc(b.desc)}"><span>${got ? b.icon : '🔒'}</span><span class="badge-name">${b.name}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card mascot-card">
        <div class="mascot">🦜</div>
        <div class="bubble" id="mascotBubble">…</div>
      </div>`;
  }

  function startMascot() {
    const b = $('#mascotBubble', view);
    if (!b) return;
    const show = () => {
      b.style.opacity = '0';
      setTimeout(() => { b.textContent = pick(MASCOT_LINES); b.style.opacity = '1'; }, 220);
    };
    show();
    mascotTimer = setInterval(show, 16000);
  }

  function home() {
    view.innerHTML = `
      <section class="home">
        <div class="hero">
          <h1>Habla español <span class="accent">fast</span>.</h1>
        </div>
        ${playerPanel()}
        <div class="grid">
          ${GAMES.map(card).join('')}
        </div>
        ${verbProgressPanel()}

      </section>`;
    const st = $('#soundToggle', view);
    if (st) st.onclick = () => { player.toggleSound(); route(); };
    bindVerbProgressFilter();
    startMascot();
  }

  function card(g) {
    let left = null;
    try { left = g.remaining ? g.remaining(level) : null; } catch {}
    return `
      <a class="gcard" href="#/${g.id}">
        <div class="gicon">${g.icon}</div>
        <div>
          <h2>${g.title}<span class="tag">${g.tag}</span></h2>
          <p>${g.desc}</p>
          ${g.xpHint ? `<p class="xp-hint">⭐ ${esc(g.xpHint)}</p>` : ''}
          ${left != null ? `<p class="left">${left === 0 ? '✅ all locked in' : left + ' left to lock in'}</p>` : ''}
        </div>
      </a>`;
  }

  window.addEventListener('hashchange', route);
  renderLevelPills();
  route();
})();
