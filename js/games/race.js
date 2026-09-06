'use strict';
/* ============ Word Race: 30s speed recall on words you haven't locked in ============ */
(function () {
  const DURATION = 30000;

  window.registerGame({
    id: 'race',
    icon: '⚡',
    title: 'Word Race',
    tag: 'Speed recall',
    desc: '30 seconds. English word appears — type its Spanish twin. Only words you haven\'t locked in. Streaks pay 2x–5x.',
    xpHint: '≈ 20–80 XP per run',
    remaining: level => engine.unmastered(level, 'word').length,
    start(view, level) {
      const words = engine.unmastered(level, 'word');

      if (words.length < 3) {
        fx.confetti(180);
        fx.sfx('fanfare');
        view.innerHTML = `
          <div class="card center endcard">
            <div class="end-emoji">🏆</div>
            <h1>¡Nada que correr!</h1>
            <p class="big">Every ${level} word is locked in.</p>
            <p class="muted">Nothing left to drill here. Next level, here you come.</p>
            <div class="row center">${backBtn()}</div>
          </div>`;
        return;
      }

      let seq = [], qi = 0, score = 0, streak = 0, bestStreak = 0, hits = 0;
      let endT = 0, tick = null, finished = false, flashTimer = null, xpBonus = 0;

      setCleanup(() => {
        if (tick) clearInterval(tick);
        if (flashTimer) clearTimeout(flashTimer);
      });

      view.innerHTML = `
        <div class="card center">
          <h1>⚡ 30-second Word Race</h1>
          <p class="muted">${words.length} unlearned words in play · articles don't count · streaks pay 2x–5x</p>
          <button class="btn big" id="go" type="button">Start ▶</button>
        </div>`;
      $('#go', view).onclick = startRound;

      function startRound() {
        seq = sample(words, Math.min(40, words.length));
        qi = 0; score = 0; streak = 0; bestStreak = 0; hits = 0; finished = false; xpBonus = 0;
        endT = Date.now() + DURATION;
        render();
        tick = setInterval(() => {
          const left = endT - Date.now();
          const bar = $('#tfill', view);
          if (bar) {
            bar.style.width = Math.max(0, (left / DURATION) * 100) + '%';
            bar.classList.toggle('low', left < DURATION * 0.33);
          }
          if (left <= 0) finish();
        }, 80);
      }

      function render() {
        const w = seq[qi];
        view.innerHTML = `
          <div class="game-head">${backBtn()}
            <span class="badge" id="pts">0 pts</span>
            <span class="badge" id="streakb">🔥 0</span>
          </div>
          <div class="bar time-bar"><div class="bar-fill" id="tfill" style="width:100%"></div></div>
          <div class="card center">
            <p class="race-label">Translate to Spanish:</p>
            <h1 class="word-es enp">${esc(w.item.en)}</h1>
            <form id="ans" class="ansform" autocomplete="off">
              <input id="input" class="answer-input" placeholder="español…" aria-label="Spanish word">
              <button class="btn" type="submit">Go</button>
            </form>
            <div id="fb" class="feedback" aria-live="polite"></div>
          </div>`;
        const input = $('#input', view);
        input.focus();
        $('#ans', view).onsubmit = e => {
          e.preventDefault();
          if (finished) return;
          check(input.value, w);
        };
      }

      function check(val, p) {
        const a = stripArticles(val), b = stripArticles(p.item.es);
        const ok = !!a && (a === b || similarity(val, p.item.es) >= 0.92);
        const res = engine.result(level, 'word', p.id, ok, 'type-es');
        if (ok) {
          streak++;
          bestStreak = Math.max(bestStreak, streak);
          hits++;
          const mult = Math.min(streak, 5);
          const gained = 10 * mult;
          score += gained;
          fx.sfx(streak >= 2 ? 'combo' : 'coin', streak);
          fx.floatText($('#pts', view), '+' + gained, streak >= 3 ? 'gold' : '');
          if (streak === 5 || streak === 10) { fx.confetti(80); fx.stamp('¡RACHA x' + streak + '!'); }
          if (res.justMastered) {
            xpBonus += 20;
            fx.confetti(100);
            fx.sfx('fanfare');
            fx.stamp('¡APRENDIDO!');
            player.toast(`<b>${esc(p.item.es)}</b> — 5/5, locked in 🔒 (+20 XP)`, { icon: '🔒' });
          }
          flash('good', `¡Sí! +${gained}${streak >= 2 ? ' 🔥x' + mult : ''}`);
        } else {
          streak = 0;
          fx.sfx('wrong');
          fx.shake($('.card', view));
          flash('bad', `Hmm — <b>${esc(p.item.es)}</b> (${esc(p.item.en)})`);
        }
        qi++;
        if (qi >= seq.length) seq = sample(words, Math.min(40, words.length));
        $('#pts', view).textContent = score + ' pts';
        $('#streakb', view).textContent = '🔥 ' + streak;
        flashTimer = setTimeout(() => { if (!finished) render(); }, ok ? 250 : 700);
      }

      function flash(cls, html) { $('#fb', view).innerHTML = `<div class="fb ${cls}">${html}</div>`; }

      function finish() {
        if (finished) return;
        finished = true;
        if (tick) clearInterval(tick);
        if (flashTimer) clearTimeout(flashTimer);
        fx.stamp('¡TIEMPO!');
        if (score >= 300) {
          player.flag('race300');
          fx.sfx('fanfare');
          fx.confetti(220);
        }
        player.award(Math.floor(score / 5) + xpBonus, { game: 'Word Race', exam: level === 'EXAM' });
        view.innerHTML = `
          <div class="card center endcard">
            <div class="end-emoji">⚡</div>
            <h1>${score >= 300 ? '¡Rápido como un rayo!' : '¡Buen ritmo!'}</h1>
            <p class="big"><b>${score}</b> points · ${hits} words · best streak 🔥 ${bestStreak}</p>
            <p class="muted">Speed recall is what turns "I know the word" into "the word came out of my mouth".</p>
            <div class="row center"><a class="btn" href="#/race">Again 🔁</a>${backBtn()}</div>
          </div>`;
      }
    },
  });
})();
