'use strict';
/* ============ La Entrevista: the exam's CONVERSATION part ============
   The 10 real interview questions from the naturalization exam.
   Each question is a mastery item: 5 rounds, each in a DIFFERENT format
   (catch the question by ear / answer out loud / answer in writing)
   until you can answer it cold. Your answer is scored against the real
   keywords of the question — then you see the model answer + the tip. ============ */
(function () {
  function cover(text, tokens) {
    const t = ' ' + norm(text) + ' ';
    return tokens.map(tok => t.includes(norm(tok)));
  }

  function fmtList(level, item, hasMic) {
    let list = FORMATS.interview.slice();
    if (!hasMic) list = list.filter(f => f !== 'ask-speak');
    const last = engine.get(level, 'interview', item.id).last;
    const alt = list.filter(f => f !== last);
    return pick(alt.length ? alt : list);
  }

  window.registerGame({
    id: 'entrevista',
    icon: '🎙️',
    title: 'La Entrevista',
    tag: 'El examen · conversación',
    desc: 'The 10 real interview questions. Hear them, then answer out loud or in writing — scored on the real keywords. 5 rounds each, in different formats, until it\'s yours.',
    xpHint: '≈ 40–160 XP per round',
    remaining: level => engine.unmastered(level, 'interview').length,
    start(view, level) {
      const hasMic = !!makeRecognizer();
      const all = engine.pool(level, 'interview');
      if (!all.length) return showComplete(view, { level, icon: '🎙️', title: 'La Entrevista', kindLabel: 'question' });

      let rate = 1, clean = null;

      function renderSetup() {
        view.innerHTML = `
          <div class="game-head">${backBtn()}<div class="head-progress"><span class="muted">Setup</span></div></div>
          <div class="card center">
            <div class="end-emoji">🎙️</div>
            <h1>La Entrevista</h1>
            <p class="muted">The exam's conversation part — 10 real questions. Each one becomes yours after 5 correct answers, in different shapes.</p>
            <div class="interview-list">
              ${all.map(e => {
                const s = engine.get(level, 'interview', e.id).streak;
                const state = s >= MASTERED_AT ? '<span class="il-st done">✓ yours</span>'
                  : s > 0 ? `<span class="il-st">${s}/5</span>` : '<span class="il-st new">new</span>';
                return `<div class="il-row"><span class="il-q">${esc(e.item.q)}</span>${state}</div>`;
              }).join('')}
            </div>
            <label class="toggle"><input type="checkbox" id="slow"> 🐢 Slow (0.75x)</label>
            <p class="muted small">${hasMic
              ? '🎤 Mic ready — answers out loud are scored on keywords, not on being word-perfect.'
              : '⚠️ No mic in this browser — you\'ll answer in writing (still real practice). Chrome/Edge unlocks speaking.'}</p>
            <p class="muted small">🦜 Pico: "En el examen respondes de <b>usted</b>, con "por favor" y sin prisa. Y cada 3 seguidas: +10 XP."</p>
            <div class="row center"><button class="btn big" id="go" type="button">Start ▶</button></div>
          </div>`;
        $('#go', view).onclick = () => { rate = $('#slow', view).checked ? 0.75 : 1; round(); };
      }

      function round() {
        const pool = engine.order(engine.unmastered(level, 'interview'), level);
        if (!pool.length) return finish(null, true);
        let qi = 0, xp = 0, locked = 0, combo = 0;

        function item(p) {
          const it = p.item;
          const st0 = engine.get(level, 'interview', it.id);
          const format = fmtList(level, it, hasMic);
          const others = all.filter(e => e.id !== it.id).map(e => e.item.q);

          view.innerHTML = `
            <div class="game-head">${backBtn()}
              <div class="head-progress"><span class="muted">Entrevista · <b>${qi + 1}</b> / ${pool.length}</span>${barHTML(qi, pool.length)}</div>
              ${pipsHTML(st0.streak, 'pips')}
            </div>
            <div class="card">
              <div class="scene-head">
                <span class="scene-icon">🎙️</span>
                <div><b>La Entrevista</b><div class="muted small">${format === 'ask-listen'
                  ? 'Listen to the question — which one is it?'
                  : 'Your turn. Answer the question.'}</div></div>
              </div>
              <span class="chip-cat format-chip">${FORMAT_LABEL[format]}</span>
              <div id="task"></div>
              <div id="fb" class="feedback" aria-live="polite"></div>
            </div>`;

          const mount = $('#task', view);
          let rec = null, stopT = null;

          function askListen() {
            const opts = shuffle([it.q].concat(shuffle(others).slice(0, 3)));
            mount.innerHTML = `
              <div class="row center"><button class="btn ghost big" id="tplay" type="button">🔊 Play the question</button></div>
              <div class="opts wide">${opts.map(q => `<button class="opt-line" type="button" data-v="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
            say(it.q, rate);
            $('#tplay', mount).onclick = () => say(it.q, rate);
            $$('.opt-line', mount).forEach(b => b.onclick = () => {
              const ok = norm(b.dataset.v) === norm(it.q);
              $$('.opt-line', mount).forEach(x => { x.disabled = true; if (norm(x.dataset.v) === norm(it.q)) x.classList.add('right'); });
              if (!ok) b.classList.add('wrong');
              done(ok, null);
            });
          }

          function scoreAnswer(text) {
            const hits = cover(text, it.need.tokens);
            const n = hits.filter(Boolean).length;
            const ok = n >= it.need.min && norm(text).length >= 12;
            return { ok, hits, n };
          }

          function chipsHTML(hits) {
            return `<div class="need-chips">${it.need.tokens.map((tok, i) =>
              `<span class="need-chip ${hits[i] ? 'hit' : ''}">${hits[i] ? '✓' : '○'} ${esc(tok)}</span>`).join('')}</div>
              <p class="muted small">You need <b>${it.need.min}</b> of these ideas — you hit <b>${hits.filter(Boolean).length}</b>.</p>`;
          }

          function modelBlock() {
            return `
              <div class="model-ans">
                <div class="row between"><b>Model answer</b><button class="btn ghost mini" id="mplay" type="button">🔊</button></div>
                <p class="ma-es">${esc(it.model)}</p>
                <p class="ma-en muted small">${esc(it.modelEn)}</p>
                <p class="ma-tip">💡 <b>Tip:</b> ${esc(it.tip)}</p>
              </div>`;
          }

          function askSpeak() {
            mount.innerHTML = `
              <div class="bubble-line them"><span class="who">Entrevistador</span><span class="txt"><b>${esc(it.q)}</b> <button class="btn ghost mini" id="tplay" type="button">🔊</button></span></div>
              <div class="row center">
                <button class="btn big mic" id="tmic" type="button">🎤 Answer out loud</button>
              </div>
              <div id="tsfb" class="feedback" aria-live="polite"></div>`;
            $('#tplay', mount).onclick = () => say(it.q, rate);
            rec = makeRecognizer();
            let doneFlag = false;
            rec.onresult = e => {
              if (doneFlag) return;
              doneFlag = true;
              if (stopT) clearTimeout(stopT);
              const txt = Array.from(e.results[0]).map(a => a.transcript)[0] || '';
              $('#tsfb', mount).innerHTML = `<p class="muted small">You said: “${esc(txt)}”</p>`;
              setTimeout(() => done(false, txt), 900);
            };
            rec.onend = () => {
              const m = $('#tmic', mount);
              if (m) { m.classList.remove('listening'); m.textContent = '🎤 Answer out loud'; }
            };
            rec.onerror = e => {
              if ((e.error === 'not-allowed' || e.error === 'service-not-allowed') && !$('#tsfb', mount).querySelector('.notice')) {
                $('#tsfb', mount).insertAdjacentHTML('beforeend', '<div class="notice">🔇 Mic blocked — allow it in the browser bar and reload.</div>');
              }
            };
            $('#tmic', mount).onclick = () => {
              if (doneFlag) return;
              if ('speechSynthesis' in window) speechSynthesis.cancel();
              try {
                rec.start();
                const m = $('#tmic', mount);
                if (m) { m.classList.add('listening'); m.textContent = '⏹ I\'m listening… (10s)'; }
                stopT = setTimeout(() => { try { rec.stop(); } catch {} }, 10000);
              } catch {}
            };
          }

          function askWrite() {
            mount.innerHTML = `
              <div class="bubble-line them"><span class="who">Entrevistador</span><span class="txt"><b>${esc(it.q)}</b> <button class="btn ghost mini" id="tplay" type="button">🔊</button></span></div>
              <p class="muted small">Write your real answer — 2 or more sentences, in your own words.</p>
              <form id="tform" class="ansform wide">
                <textarea class="answer-input" id="tarea" rows="3" placeholder="Escriba su respuesta…"></textarea>
                <button class="btn" type="submit">Check ✓</button>
              </form>`;
            $('#tplay', mount).onclick = () => say(it.q, rate);
            $('#tarea', mount).focus();
            $('#tform', mount).onsubmit = e => {
              e.preventDefault();
              done(false, $('#tarea', mount).value);
            };
          }

          function done(ok, text) {
            let hits = null, n = 0, meta = null;
            if (text != null) { const s = scoreAnswer(text); hits = s.hits; n = s.n; meta = { pct: Math.round((n / it.need.tokens.length) * 100) }; }
            const res = engine.result(level, 'interview', it.id, ok, format);
            let gained = ok ? (XPMAP[format] || 10) : 0;
            if (ok) {
              combo++;
              if (format === 'ask-speak' && meta && meta.pct >= 80) { gained = 20; player.flag('speak90'); }
              if (combo % 3 === 0) { gained += 10; fx.floatText($('.card', view), '🔥 racha x' + combo + ' +10 XP'); }
            } else combo = 0;
            if (ok) {
              fx.sfx(res.justMastered ? 'perfect' : 'correct');
              fx.floatText($('.card', view), '+' + gained + ' XP');
              if (res.justMastered) {
                locked++;
                xp += 20;
                fx.confetti(120);
                fx.sfx('fanfare');
                fx.stamp('¡PREGUNTA DOMINADA!');
                player.toast(`Interview question locked in (5/5): <b>${esc(it.q)}</b> +20 XP`, { icon: '🔒' });
              }
            } else {
              fx.sfx('wrong');
              fx.shake($('.card', view));
            }
            xp += gained;
            const st2 = engine.get(level, 'interview', it.id);
            const headPips = $('#pips', view);
            if (headPips) headPips.innerHTML = pipSpans(st2.streak);
            $('#fb', view).innerHTML = `
              ${ok ? `<div class="fb good">¡Muy bien! <span class="small">${res.justMastered ? '🔒 5/5 — you own this question now' : res.streak + '/5 to lock in'}</span></div>`
                   : `<div class="fb bad">${format === 'ask-listen' ? 'Not quite — the question was:' : 'Not yet. Compare with the model:'}</div>`}
              ${format === 'ask-listen' ? `<div class="bubble-line them"><span class="who">Entrevistador</span><span class="txt"><b>${esc(it.q)}</b><span class="gloss">${esc(it.qen)}</span></span></div>` : ''}
              ${hits != null ? chipsHTML(hits) : ''}
              ${modelBlock()}
              ${pipsHTML(st2.streak)}
              <div class="fb-actions"><button class="btn" id="next" type="button">${qi + 1 < pool.length ? 'Next question →' : 'Finish 🏁'}</button></div>`;
            $('#mplay', $('#fb', view)).onclick = () => say(it.model, 0.95);
            $('#next', $('#fb', view)).onclick = () => {
              if (clean && clean.cleanup) clean.cleanup();
              if (rec) { try { rec.abort(); } catch {} rec = null; }
              qi++;
              if (qi < pool.length) item(pool[qi]); else finish();
            };
          }

          if (format === 'ask-listen') askListen();
          else if (format === 'ask-speak') { askSpeak(); clean = { cleanup() { if (stopT) clearTimeout(stopT); try { rec.abort(); } catch {} } }; }
          else askWrite();
        }

        function finish(allDone) {
          const doneCount = all.filter(e => engine.get(level, 'interview', e.id).streak >= MASTERED_AT).length;
          const complete = allDone || doneCount === all.length;
          if (complete) {
            player.flag('entrevista10');
            fx.sfx('fanfare');
            fx.stamp('¡LISTO PARA LA ENTREVISTA!');
            fx.confetti(240);
          }
          player.award(xp, { game: 'La Entrevista', exam: level === 'EXAM' });
          view.innerHTML = `
            <div class="card center endcard">
              <div class="end-emoji">${complete ? '🏆' : '🎙️'}</div>
              <h1>${complete ? '¡Lista para la entrevista!' : '¡Buenas respuestas!'}</h1>
              <p class="big"><b>${doneCount}</b> / ${all.length} interview questions locked in · <b>${xp}</b> XP this round</p>
              <p class="muted">${complete
                ? 'All 10 questions, cold, in your own words. The real one will feel like this one.'
                : 'The ones you missed come back — each time in a different format, until they\'re yours.'}</p>
              <div class="row center">
                <button class="btn" id="again" type="button">Practice again ▶</button>
                ${backBtn()}
              </div>
            </div>`;
          $('#again', view).onclick = () => {
            if (engine.unmastered(level, 'interview').length) round();
            else renderSetup();
          };
        }

        item(pool[0]);
      }

      renderSetup();
    },
  });
})();
