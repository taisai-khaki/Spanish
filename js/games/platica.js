'use strict';
/* ============ Plática: real conversations at native speed ============
   hear it fast → catch the keyword → continue the conversation (speak or pick).
   Every line is a mastery item (5/5 = yours forever). */
(function () {
  function pickDialogue(level) {
    const cand = (DATA[level].dialogues || [])
      .map(d => {
        const st = d.lines.map((ln, i) => engine.get(level, 'dialogue', d.id + ':' + i).streak);
        return { d, locked: st.filter(s => s >= MASTERED_AT).length, unmastered: st.filter(s => s < MASTERED_AT).length };
      })
      .filter(c => c.unmastered > 0);
    if (!cand.length) return null;
    cand.sort((a, b) => b.locked - a.locked);
    return cand[0].d;
  }

  function turnFormat(entry, level, hasMic) {
    const last = engine.get(level, 'dialogue', entry.id).last;
    if (entry.item.who === 'them') {
      const list = ['keyword', 'listen-pick', 'fill-blank'].filter(f => f !== last);
      return pick(list.length ? list : ['keyword', 'listen-pick', 'fill-blank']);
    }
    const list = hasMic ? ['speak', 'respond'] : ['respond', 'fill-blank'];
    const alt = list.filter(f => f !== last);
    return pick(alt.length ? alt : list);
  }

  window.registerGame({
    id: 'platica',
    icon: '🎬',
    title: 'Plática',
    tag: 'Real conversations',
    desc: 'A taxi, a taquería, the doctor, your boss. Hear them at native speed, catch the keywords, and continue the conversation out loud.',
    xpHint: '≈ 60–140 XP per conversation',
    remaining: level => engine.unmastered(level, 'dialogue').length,
    start(view, level) {
      const hasMic = !!makeRecognizer();
      let dlg = pickDialogue(level);
      let rate = 1;

      if (!dlg) {
        fx.confetti(200);
        fx.sfx('fanfare');
        view.innerHTML = `
          <div class="card center endcard">
            <div class="end-emoji">🏆</div>
            <h1>¡Todas las pláticas dominadas!</h1>
            <p class="big">Every line of every ${level} conversation is locked in.</p>
            <p class="muted">Now go have a real one — and come back for the next level's conversations.</p>
            <div class="row center">${backBtn()}</div>
          </div>`;
        return;
      }

      let qi = 0, xp = 0, locked = 0, clean = null, fastHits = 0;

      function renderSetup() {
        const linesLeft = dlg.lines.filter((ln, i) => engine.get(level, 'dialogue', dlg.id + ':' + i).streak < MASTERED_AT).length;
        view.innerHTML = `
          <div class="game-head">${backBtn()}<div class="head-progress"><span class="muted">Setup</span></div></div>
          <div class="card center">
            <div class="end-emoji">${dlg.icon}</div>
            <h1>${esc(dlg.title)}</h1>
            <p class="muted">${esc(dlg.intro)}</p>
            <p class="muted small">${linesLeft} of ${dlg.lines.length} lines to lock in</p>
            <label class="toggle"><input type="checkbox" id="slow"> 🐢 Slow (0.75x)</label>
            <p class="muted small">${hasMic
              ? '🎤 Mic ready — your turn means speaking out loud.'
              : '⚠️ No mic in this browser — you\'ll pick your replies. Chrome/Edge unlocks speaking.'}</p>
            <div class="row center"><button class="btn big" id="go" type="button">Start ▶</button></div>
          </div>`;
        $('#go', view).onclick = () => { rate = $('#slow', view).checked ? 0.75 : 1; turn(0); };
      }

      function turn(i) {
        qi = i;
        const ln = dlg.lines[i];
        const entry = { kind: 'dialogue', id: dlg.id + ':' + i, item: ln, dlg, lineNo: i };
        const st0 = engine.get(level, 'dialogue', entry.id);
        const format = turnFormat(entry, level, hasMic);
        const prev = i > 0 ? dlg.lines[i - 1] : null;
        view.innerHTML = `
          <div class="game-head">${backBtn()}
            <div class="head-progress"><span class="muted">${esc(dlg.title)} · <b>${i + 1}</b> / ${dlg.lines.length}</span>${barHTML(i, dlg.lines.length)}</div>
            ${pipsHTML(st0.streak, 'pips')}
          </div>
          <div class="card">
            <div class="scene-head">
              <span class="scene-icon">${dlg.icon}</span>
              <div><b>${esc(dlg.title)}</b><div class="muted small">${ln.who === 'you' ? 'It\'s your turn — keep the conversation going' : 'They speak fast — listen for the keyword'}</div></div>
            </div>
            ${prev
              ? `<div class="bubble-line ${prev.who}"><span class="who">${prev.who === 'you' ? 'You' : 'Them'}</span><span class="txt">${esc(prev.es)} <button class="btn ghost mini" id="prevplay" type="button">🔊</button></span></div>`
              : `<p class="muted small">${esc(dlg.intro)}</p>`}
            <span class="chip-cat format-chip">${FORMAT_LABEL[format] || format}</span>
            <div id="task"></div>
            <div id="fb" class="feedback" aria-live="polite"></div>
          </div>`;
        const pp = $('#prevplay', view);
        if (pp) pp.onclick = () => say(prev.es, rate);
        const mount = $('#task', view);
        clean = tasks[format](mount, {
          entry, level, hasMic, rate,
          onSubmit: (ok, meta) => {
            const res = engine.result(level, 'dialogue', entry.id, ok, format);
            let gained = 0;
            if (ok) {
              gained = XPMAP[format] || 10;
              if (format === 'speak' && meta && meta.pct >= 90) { gained = 20; player.flag('speak90'); }
              if (format === 'keyword' && rate === 1) {
                fastHits++;
                if (fastHits >= 10) player.flag('fastear');
              }
              fx.sfx(res.justMastered ? 'perfect' : 'correct');
              fx.floatText($('.card', view), '+' + gained + ' XP');
              if (res.justMastered) {
                locked++;
                xp += 20;
                fx.confetti(110);
                fx.sfx('fanfare');
                fx.stamp('¡APRENDIDO!');
                player.toast(`Line locked in (5/5): <b>${esc(ln.es)}</b> +20 XP`, { icon: '🔒' });
              }
            } else {
              fx.sfx('wrong');
              fx.shake($('.card', view));
            }
            xp += gained;
            const st2 = engine.get(level, 'dialogue', entry.id);
            const headPips = $('#pips', view);
            if (headPips) headPips.innerHTML = pipSpans(st2.streak);
            $('#fb', view).innerHTML = `
              ${ok ? `<div class="fb good">¡Correcto! <span class="small">${res.justMastered ? '🔒 5/5 — this line is yours' : res.streak + '/5 to lock in'}</span></div>`
                   : '<div class="fb bad">Not yet — here\'s the line:</div>'}
              <div class="bubble-line ${ln.who}"><span class="who">${ln.who === 'you' ? 'You' : 'Them'}</span><span class="txt"><b>${esc(ln.es)}</b><span class="gloss">${esc(ln.en)}</span></span></div>
              ${pipsHTML(st2.streak)}
              <div class="fb-actions"><button class="btn" id="next" type="button">${i + 1 < dlg.lines.length ? 'Next →' : 'Finish 🏁'}</button></div>`;
            $('#next', view).onclick = () => {
              if (clean && clean.cleanup) clean.cleanup();
              if (i + 1 < dlg.lines.length) turn(i + 1); else finish();
            };
          },
        });
      }

      function finish() {
        const stAll = dlg.lines.map((ln, i) => engine.get(level, 'dialogue', dlg.id + ':' + i).streak);
        const dlgLocked = stAll.filter(s => s >= MASTERED_AT).length;
        const complete = dlgLocked === dlg.lines.length;
        if (complete) {
          player.flag('platica1');
          fx.sfx('fanfare');
          fx.stamp('¡PLÁTICA COMPLETADA!');
          fx.confetti(220);
        }
        player.award(xp, { game: 'Plática: ' + dlg.title });
        view.innerHTML = `
          <div class="card center endcard">
            <div class="end-emoji">${dlg.icon}</div>
            <h1>${complete ? '¡Plática completa!' : '¡Buenas pláticas!'}</h1>
            <p class="big"><b>${dlgLocked}</b> / ${dlg.lines.length} lines locked in · <b>${xp}</b> XP this round</p>
            <p class="muted">${complete
              ? 'You can hold this whole conversation now. Real one, soon. 🚕'
              : 'Unlocked lines are retired. The rest come back in new shapes.'}</p>
            <div class="row center">
              <button class="btn" id="again" type="button">Next conversation ▶</button>
              ${backBtn()}
            </div>
          </div>`;
        $('#again', view).onclick = () => {
          dlg = pickDialogue(level);
          if (!dlg) {
            fx.confetti(200);
            fx.sfx('fanfare');
            view.innerHTML = `
              <div class="card center endcard">
                <div class="end-emoji">🏆</div>
                <h1>¡Todas las pláticas dominadas!</h1>
                <p class="big">Every line of every ${level} conversation is locked in.</p>
                <div class="row center">${backBtn()}</div>
              </div>`;
            return;
          }
          renderSetup();
        };
      }

      renderSetup();
    },
  });
})();
