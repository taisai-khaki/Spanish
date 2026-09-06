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
    const id = location.hash.replace('#/', '') || 'home';
    const game = GAMES.find(g => g.id === id);
    if (!game) return home();
    game.start(view, level);
    window.scrollTo(0, 0);
  }

  /* ---------- home ---------- */
  function levelProgress() {
    return `
      <div class="card progress-card">
        <h3>📈 Your progress <span class="muted small">— 5 correct in a row = locked in forever</span></h3>
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

  function playerPanel() {
    const d = player.data, r = player.rank();
    const pct = d.level >= 10 ? 100 : Math.round((d.xp / player.xpNext()) * 100);
    const streakHot = d.lastDay === todayStr() && d.daily.xp > 0;
    return `
      <div class="panel-row">
        <div class="card player-card">
          <div class="avatar-big">${r.icon}</div>
          <div class="player-info">
            <div class="rank-line"><b>${r.name}</b><span class="lvl">Lv ${d.level}</span></div>
            <div class="xpbar"><div class="xpbar-fill" style="width:${pct}%"></div></div>
            <div class="muted small">${d.level >= 10
              ? 'MAX LEVEL — you ARE Pico the parrot 🦜'
              : `${d.xp} / ${player.xpNext()} XP to Lv ${d.level + 1} · ${d.xpTotal} XP total`}</div>
            <div class="muted small rank-note">${r.note}</div>
          </div>
          <div class="player-side">
            <div class="streak ${streakHot ? 'hot' : ''}">🔥 ${d.streak}<div class="small muted">day streak</div></div>
            <button class="btn ghost mini" id="soundToggle" type="button">${player.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
          </div>
        </div>
        <div class="card quest-card">
          <h3>🎯 Today's quests</h3>
          ${QUESTS.map(q => {
            const prog = q.id === 'xp80' ? d.daily.xp : (q.id === 'games3' ? d.daily.games : (d.daily.exam || 0));
            const p = Math.min(prog, q.goal);
            const done = d.daily.claimed[q.id];
            return `
              <div class="quest ${done ? 'done' : ''}">
                <div class="quest-top"><span>${done ? '✅' : '🎯'} ${q.label}</span><b>${p}/${q.goal}</b></div>
                <div class="qbar"><div class="qbar-fill" style="width:${Math.round((p / q.goal) * 100)}%"></div></div>
                <div class="muted small">${done ? 'Claimed — nice.' : `Reward: +${q.reward} XP`}</div>
              </div>`;
          }).join('')}
          <p class="muted small quest-note">Complete both = a very happy bird. 🐥</p>
        </div>
      </div>
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
          <p>Ten games. One rule: <b>5 correct in a row and it's yours forever</b> — wrong once, it comes back in a different shape. Nothing you already know ever shows up again.</p>
          <p class="muted small">🇲🇽 The <b>EXAM</b> level covers your naturalization exam: the 10 interview questions, the 16 reading passages, the 683-question bank, and the exam vocabulary.</p>
        </div>
        ${playerPanel()}
        <div class="grid">
          ${GAMES.map(card).join('')}
        </div>
        <div class="card routine">
          <h3>⚡ The 15-minute daily quest</h3>
          <ol>
            <li>🎬 <b>Plática</b> — one full conversation (this is the point)</li>
            <li>🎤 <b>Prono Repeat</b> — 5 phrases, out loud</li>
            <li>🃏 <b>Vocab Smash</b> — 10 words</li>
            <li>🧩 <b>Word Order</b> — 5 sentences</li>
            <li>📐 <b>Grammar Judge</b> — 5 rules</li>
            <li>👂 <b>Oído Sharp</b> — 1 round (native speed!)</li>
            <li>⚡ <b>Word Race</b> — if 30 seconds are left (they are)</li>
          </ol>
        </div>
        <div class="card routine exam-routine">
          <h3>🇲🇽 Exam-week routine (EXAM level) — the naturalization exam</h3>
          <ol>
            <li>🎙️ <b>La Entrevista</b> — the 10 interview questions, out loud (the conversation part)</li>
            <li>📖 <b>Lectura</b> — one passage, 6/6</li>
            <li>🗂️ <b>Repaso</b> — 10 real bank questions</li>
            <li>🏛️ <b>Plática</b> — the consulate conversation</li>
            <li>👂 <b>Oído Sharp</b> — exam words at native speed</li>
          </ol>
        </div>
      </section>`;
    $('#soundToggle', view).onclick = () => { player.toggleSound(); route(); };
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
