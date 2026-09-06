'use strict';
/* ============ Lectura: the exam's READING part ============
   The 16 real exam passages, 6 questions each (96 total).
   A passage is a mastery item: 6/6 correct = one step toward 5/5,
   and the next time it comes back it's a DIFFERENT shape
   (read the text → listen to it at native speed, no text). ============ */
(function () {
  function pickPassage(level) {
    const cand = engine.pool(level, 'reading').map(p => {
      const st = engine.get(level, 'reading', p.id).streak;
      return { p, st, locked: st >= MASTERED_AT };
    }).filter(c => !c.locked);
    if (!cand.length) return null;
    cand.sort((a, b) => b.st - a.st || Math.random() - 0.5);
    return cand[0].p;
  }

  window.registerGame({
    id: 'lectura',
    icon: '📖',
    title: 'Lectura',
    tag: 'El examen · comprensión',
    desc: 'The 16 real exam passages — culture, history, food, places. 6 questions each. First you read; the next round the same passage is audio-only at native speed.',
    xpHint: '≈ 60–80 XP per perfect passage',
    remaining: level => engine.unmastered(level, 'reading').length,
    start(view, level) {
      const hasMic = !!makeRecognizer();
      const all = engine.pool(level, 'reading');
      if (!all.length) return showComplete(view, { level, icon: '📖', title: 'Lectura', kindLabel: 'passage' });

      let rate = 1;

      function renderSetup() {
        view.innerHTML = `
          <div class="game-head">${backBtn()}<div class="head-progress"><span class="muted">Setup</span></div></div>
          <div class="card center">
            <div class="end-emoji">📖</div>
            <h1>Lectura</h1>
            <p class="muted">Real exam passages. 6/6 = a step toward locking the passage in (5 perfect rounds). Then it never comes back.</p>
            <div class="interview-list">
              ${all.map(p => {
                const s = engine.get(level, 'reading', p.id).streak;
                const state = s >= MASTERED_AT ? '<span class="il-st done">✓ yours</span>'
                  : s > 0 ? `<span class="il-st">${s}/5</span>` : '<span class="il-st new">new</span>';
                return `<div class="il-row"><span class="il-q">${esc(p.item.title)}</span>${state}</div>`;
              }).join('')}
            </div>
            <label class="toggle"><input type="checkbox" id="slow"> 🐢 Slow (0.75x)</label>
            <p class="muted small">🦜 Pico: "Primero lo lees; la próxima vez te lo canto a velocidad de nativo. El oído también aprueba."</p>
            <div class="row center"><button class="btn big" id="go" type="button">Start ▶</button></div>
          </div>`;
        $('#go', view).onclick = () => { rate = $('#slow', view).checked ? 0.75 : 1; playPassage(pickPassage(level)); };
      }

      function playPassage(entry) {
        const p = entry.item;
        const st0 = engine.get(level, 'reading', p.id);
        const format = engine.format(entry, level, { noMic: !hasMic });
        // stable shuffled options per question for this round
        const qs = p.qs.map(x => ({ ...x, opts: shuffle(x.opts) }));
        let qi = 0, score = 0, answered = false, combo = 0, comboXp = 0;

        function passageBlock(showText) {
          if (!showText) return `
            <div class="passage-audio">
              <p class="muted small">No text this time — the passage is your ears. 🎧</p>
              <div class="row center"><button class="btn ghost big" id="pplay" type="button">🔊 Play the passage</button></div>
            </div>`;
          return `<div class="passage"><div class="passage-text">${esc(p.text)}</div></div>`;
        }

        function renderQ() {
          answered = false;
          const q = qs[qi];
          const showText = format === 'read-quiz';
          view.innerHTML = `
            <div class="game-head">${backBtn()}
              <div class="head-progress"><span class="muted">${esc(p.title)} · P${qi + 1}/6 · <b>${score}</b>✓</span>${barHTML(qi, 6)}</div>
              ${pipsHTML(st0.streak, 'pips')}
            </div>
            <div class="card">
              <div class="scene-head">
                <span class="scene-icon">📖</span>
                <div><b>${esc(p.title)}</b><div class="muted small">${format === 'read-quiz' ? 'Read the passage, then answer.' : 'Listen, then answer — text appears at the end.'}</div></div>
              </div>
              <span class="chip-cat format-chip">${FORMAT_LABEL[format]}</span>
              ${passageBlock(showText)}
              <h3 class="q-title">P${qi + 1}. ${esc(q.q)} <span class="q-en muted small" id="qt"></span></h3>
              <div class="row center"><button class="btn ghost mini" id="qen" type="button">EN (traducción)</button></div>
              <div id="qopts" class="opts wide">${q.opts.map(o =>
                `<button class="opt-line" type="button" data-v="${esc(o)}"><span>${esc(o)}</span><span class="gloss"></span></button>`).join('')}</div>
              <div id="qfb" class="feedback" aria-live="polite"></div>
            </div>`;
          const pp = $('#pplay', view);
          if (pp) {
            pp.onclick = () => say(p.text, rate);
            if (qi === 0) say(p.text, rate); // auto-play once, at the first question
          }
          $('#qen', view).onclick = () => {
            const on = $('#qen', view).classList.toggle('on');
            $$('.opt-line', view).forEach(b => {
              const i = q.opts.indexOf(b.dataset.v);
              const g = b.querySelector('.gloss');
              if (g) g.textContent = on ? (q.oen[i] || '') : '';
            });
            const qt = $('#qt', view);
            if (qt) qt.textContent = on ? q.qen : '';
          };
          $$('.opt-line', view).forEach(b => b.onclick = () => {
            if (answered) return;
            answered = true;
            const ok = norm(b.dataset.v) === norm(q.ok);
            $$('.opt-line', view).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(q.ok)) x.classList.add('right'); });
            if (!ok) b.classList.add('wrong');
            if (ok) {
              score++; combo++;
              if (combo % 3 === 0) { comboXp += 10; fx.floatText($('.card', view), '🔥 racha x' + combo + ' +10 XP'); }
              fx.sfx('correct');
            } else { combo = 0; fx.sfx('wrong'); }
            $('#qfb', view).innerHTML = `
              <div class="fb ${ok ? 'good' : 'bad'}">${ok ? 'Correcto ✓' : `Not quite — <b>${esc(q.ok)}</b>`}</div>
              <div class="fb-actions"><button class="btn" id="qn" type="button">${qi + 1 < 6 ? 'Next →' : 'Finish 🏁'}</button></div>`;
            $('#qn', view).onclick = () => {
              qi++;
              if (qi < 6) renderQ(); else finish();
            };
          });
        }

        function finish() {
          const okAll = score === 6;
          const res = engine.result(level, 'reading', p.id, okAll, format);
          let xp = score * 10 + comboXp;
          if (res.justMastered) {
            xp += 20;
            fx.confetti(140);
            fx.sfx('fanfare');
            fx.stamp('¡LECTURA DOMINADA!');
            player.toast(`Passage locked in (5/5): <b>${esc(p.title)}</b> +20 XP`, { icon: '🔒' });
          }
          const doneCount = all.filter(x => engine.get(level, 'reading', x.id).streak >= MASTERED_AT).length;
          const complete = doneCount === all.length;
          if (complete) {
            player.flag('lectura16');
            fx.sfx('fanfare');
            fx.stamp('¡LECTOR!');
            fx.confetti(240);
          }
          player.award(xp, { game: 'Lectura: ' + p.title, exam: level === 'EXAM' });
          view.innerHTML = `
            <div class="card center endcard">
              <div class="end-emoji">${okAll ? '🏆' : '📖'}</div>
              <h1>${okAll ? '¡6 de 6!' : score + ' de 6'}</h1>
              <p class="big"><b>${doneCount}</b> / ${all.length} passages locked in · <b>${xp}</b> XP</p>
              <p class="muted">${okAll
                ? (res.justMastered ? 'Passage mastered — it never comes back.' : 'One more 6/6 and this passage is yours (in a different shape next time).')
                : 'The passage comes back — ' + (format === 'read-quiz' ? 'audio-only next round.' : 'as reading next round.')}</p>
              <div class="passage"><div class="passage-text">${esc(p.text)}</div>
                ${p.textEn ? `<p class="passage-en muted small">${esc(p.textEn)}</p>` : ''}</div>
              <div class="row center">
                <button class="btn" id="again" type="button">Next passage ▶</button>
                ${backBtn()}
              </div>
            </div>`;
          $('#again', view).onclick = () => {
            const nx = pickPassage(level);
            if (nx) playPassage(nx);
            else renderSetup();
          };
        }

        renderQ();
      }

      renderSetup();
    },
  });
})();
