'use strict';
/* ============ 🧭 Verb Path (A2 · 190 handout verbs · 5 steps) ============
   The learning path the deck alone cannot teach: every verb is walked through

     1 · Root        English → Spanish      "to eat"          → comer
     2 · Presente    shown stem + typed end  [com]___         → "o"    (como)
     3 · Pretérito   the same in the past    [com]___         → "í"    (comí)
     4 · Combos      all 11 magic frames     "I need to eat"  → "Necesito comer"
     5 · Word order  the shuffled-word builder for that verb

   A verb is learned when all five steps are passed. If a step is missed the
   progress up to the previous step is kept AND the step that failed is kept
   too: the verb comes back at the step with the mistake, never from the top.
   ============ */
(function () {
  const LEVEL = window.VERB_PATH_LEVEL || 'A2';
  const STEPS = window.VERB_PATH_STEPS || [];
  const STEP_COUNT = STEPS.length || 5;
  const XP_STEP = { root: 12, split: 14, combo: 16, order: 20 };
  const XP_LEARNED = 40;
  const PKEY = 'verbPath.' + LEVEL;
  const TITLE = 'Verb Path';

  function model() { return (DATA[LEVEL] && DATA[LEVEL].verbPath) || []; }
  function stepXp(step) {
    if (step.kind === 'combos') return XP_STEP.combo;
    if (step.kind === 'order') return XP_STEP.order;
    if (step.kind === 'split') return XP_STEP.split;
    return XP_STEP.root;
  }

  /* ---------------- progress: one record per verb ----------------
     { step: 0..5, magicDone: 0..11, attempts, correct, wrong }
     `step` is the step the player is on — i.e. the step that still has to be
     passed (5 = learned). A wrong answer never lowers `step`, it just stops
     the run there, so the next visit restarts exactly at the missed step. */
  const DEFAULTS = { step: 0, magicDone: 0, attempts: 0, correct: 0, wrong: 0 };

  const verbPathProgress = {
    key() { return PKEY; },
    all() { return store.get(PKEY, {}) || {}; },
    raw(es) { return this.all()[es] || null; },
    get(es) {
      const rec = Object.assign({}, DEFAULTS, this.raw(es) || {});
      rec.learned = rec.step >= STEP_COUNT;
      rec.step = Math.max(0, Math.min(STEP_COUNT, rec.step));
      rec.magicDone = Math.max(0, rec.magicDone || 0);
      return rec;
    },
    set(es, patch) {
      const all = this.all();
      all[es] = Object.assign({}, DEFAULTS, all[es] || {}, patch);
      store.set(PKEY, all);
      return this.get(es);
    },
    reset(es) {
      const all = this.all();
      if (es) delete all[es]; else return store.set(PKEY, {});
      store.set(PKEY, all);
    },
    /* record one answer; `stepIndex` is the step the player was on */
    record(verb, ok, stepIndex) {
      const before = this.get(verb.es);
      const patch = {
        correct: before.correct + (ok ? 1 : 0),
        wrong: before.wrong + (ok ? 0 : 1),
      };
      if (!ok) {
        /* keep the step (and the combo index) exactly where the mistake was */
        return this.set(verb.es, patch);
      }
      if (verb.steps[stepIndex] && verb.steps[stepIndex].kind === 'combos') {
        const total = verb.steps[stepIndex].combos.length;
        const done = Math.min(total, before.magicDone + 1);
        if (done < total) return this.set(verb.es, Object.assign(patch, { step: Math.max(before.step, stepIndex), magicDone: done }));
        return this.set(verb.es, Object.assign(patch, { step: Math.max(before.step, stepIndex + 1), magicDone: 0 }));
      }
      const step = Math.max(before.step, Math.min(STEP_COUNT, stepIndex + 1));
      return this.set(verb.es, Object.assign(patch, { step, magicDone: step >= 4 ? 0 : before.magicDone }));
    },
    stats() {
      const verbs = model();
      let learned = 0, started = 0;
      verbs.forEach(v => {
        const p = this.get(v.es);
        if (p.learned) learned++;
        else if (p.step > 0) started++;
      });
      return { total: verbs.length, learned, started, fresh: verbs.length - learned - started };
    },
  };
  window.verbPathProgress = verbPathProgress;

  function remainingCount() {
    return model().filter(v => !verbPathProgress.get(v.es).learned).length;
  }

  /* ---------------- small helpers ---------------- */
  function hash(s) {
    let h = 0;
    String(s).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) % 99991; });
    return h;
  }
  function stepIndexOf(verb, stepId) { return verb.steps.findIndex(s => s.id === stepId); }

  /* ---------------- the game ---------------- */
  window.registerGame({
    id: 'verbpath',
    icon: '🧭',
    title: 'Verb Path',
    tag: 'A2 · 5 steps per verb',
    desc: 'The whole route for each of the 190 handout verbs: type the infinitive from English, then fill the piece that changes in the presente and pretérito, then type all 11 magic-verb combinations, then build a real sentence from shuffled words. Pass all five steps and the verb is learned. A mistake saves your progress at exactly that step — the verb resumes there next time, never from the top.',
    xpHint: '12–20 XP per step · +40 XP when a verb is learned',
    remaining: () => remainingCount(),
    start(view, level, startVerb) {
      runPath(view, level, startVerb);
    },
  });

  function runPath(view, level, startVerb) {
    const verbs = model();
    if (!verbs.length) {
      view.innerHTML = `<div class="card center"><div class="end-emoji">🧭</div><h1>Verb Path</h1>
        <p class="muted">The path needs the 200-verb handout deck, which lives in A2.</p>
        <div class="row center">${backBtn()}</div></div>`;
      return;
    }

    bankPendingXP();
    setCleanup(() => { clearKey(); bankPendingXP(); });

    const s = { correct: 0, wrong: 0, answered: 0, combo: 0, xp: 0, locked: 0 };
    let bankedXP = 0;
    let queue = [];
    let card = null;
    let clean = null;
    let keyHandler = null;
    let reviewMode = false;
    let lastServed = null;
    let forceServe = null;      // a verb chosen from the home page
    let remaining = remainingCount();

    function clearKey() {
      if (keyHandler && document.removeEventListener) document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }

    /* ---------------- queue: nearest-to-learned first, then new verbs ---------------- */
    function buildQueue() {
      const pending = verbs.filter(v => !verbPathProgress.get(v.es).learned);
      if (pending.length) {
        reviewMode = false;
        const started = pending.filter(v => verbPathProgress.get(v.es).step > 0)
          .sort((a, b) => verbPathProgress.get(b.es).step - verbPathProgress.get(a.es).step);
        const fresh = shuffle(pending.filter(v => verbPathProgress.get(v.es).step === 0));
        return started.concat(fresh);
      }
      reviewMode = true;
      return shuffle(verbs.slice());
    }

    function nextVerb() {
      for (let guard = 0; guard < 800; guard++) {
        if (!queue.length) {
          queue = buildQueue();
          if (!queue.length) return done();
        }
        const verb = queue.shift();
        if (verb !== forceServe && !reviewMode && verbPathProgress.get(verb.es).learned) continue;
        if (verb !== forceServe && verb.es === lastServed && queue.length) { queue.push(verb); continue; }
        forceServe = null;
        lastServed = verb.es;
        return serve(verb);
      }
      return done();
    }

    function serve(verb) {
      const p = verbPathProgress.get(verb.es);
      verbPathProgress.set(verb.es, { attempts: p.attempts + 1 });
      const combos = (verb.steps[3].combos || []).length;
      /* a learned verb starts the walk again from the root (free practice —
         the saved steps never move backwards) */
      const fromTop = reviewMode || p.learned;
      let stepIndex = fromTop ? 0 : Math.min(p.step, STEP_COUNT - 1);
      let comboIndex = 0;
      if (!fromTop && verb.steps[stepIndex] && verb.steps[stepIndex].kind === 'combos' && combos) {
        comboIndex = p.magicDone % combos;
      }
      card = { verb, stepIndex, comboIndex };
      renderStep();
    }

    function done() {
      fx.confetti(180);
      fx.sfx('fanfare');
      view.innerHTML = `
        <div class="card center endcard">
          <div class="end-emoji">🏆</div>
          <h1>¡Todos los verbos!</h1>
          <p class="big">All ${verbs.length} handout verbs have walked the whole path.</p>
          <p class="muted">Root, presente, pretérito, the 11 magic combos and a real sentence — for every one of them. ¡Increíble!</p>
          <div class="row center">${backBtn()}</div>
        </div>`;
    }

    /* ---------------- scoreboard & XP ---------------- */
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
      set('sbLeft', remaining);
      const bar = $('#sbBar', view);
      if (bar && bar.style) {
        bar.style.width = (s.answered ? pct : 0) + '%';
        if (bar.classList && bar.classList.toggle) bar.classList.toggle('low', s.answered > 0 && pct < 50);
      }
    }

    function bankStepXp() {
      rememberPendingXP(s.xp - bankedXP, TITLE, false);
      if (s.answered % 10 === 0) { bankedXP = s.xp; bankPendingXP(); }
    }

    /* ---------------- rendering ---------------- */
    function verbStrip(verb, stepIndex, comboIndex) {
      const combos = (verb.steps[3].combos || []).length;
      return `<div class="vp-track" role="list" aria-label="Verb steps">
        ${verb.steps.map((st, i) => {
          const state = i < stepIndex ? 'done' : (i === stepIndex ? 'now' : 'todo');
          const mark = i < stepIndex ? '✓' : (i === stepIndex ? '▶' : '·');
          const label = (st.kind === 'combos' && i === stepIndex && combos)
            ? `${st.label} ${comboIndex + 1}/${combos}` : st.label;
          return `<span class="vp-step ${state}" role="listitem" title="${esc(st.icon + ' ' + st.label + ' — ' + st.blurb)}">${mark} ${esc(label)}</span>`;
        }).join('')}
      </div>`;
    }

    function headHTML() {
      const { verb, stepIndex, comboIndex } = card;
      const showVerb = stepIndex > 0 || reviewMode;
      const verbLabel = showVerb
        ? `${verb.handoutNo ? '#' + verb.handoutNo + ' · ' : ''}${esc(verb.es)} <span class="muted">— ${esc(verb.en)}</span>`
        : `<span class="muted">handout verb ${verb.handoutNo ? '#' + verb.handoutNo : ''}</span>`;
      return `
        <div class="game-head">
          <div class="head-row">
            ${backBtn()}
            <span class="head-title">🧭 ${TITLE} <span class="muted small">· A2 · ${verbs.length} handout verbs</span></span>
            <span class="grow"></span>
            <span class="small vp-verb-name">${verbLabel}</span>
          </div>
          ${scoreboardHTML(s, remaining)}
        </div>
        <div class="card">
          ${reviewMode ? `<p class="notice">🏆 Every verb on the path is learned — this is free practice. The saved steps never go backwards, so nothing you earned here can be lost.</p>` : ''}
          ${verbStrip(verb, stepIndex, comboIndex)}
          <div id="task"></div>
          <div id="fb" class="feedback" aria-live="polite"></div>
        </div>`;
    }

    function renderStep() {
      const { verb, stepIndex, comboIndex } = card;
      const step = verb.steps[stepIndex];
      view.innerHTML = headHTML();
      if (step.kind === 'combos') mountCombo(verb, step, comboIndex);
      else if (step.kind === 'order') mountOrder(verb, step);
      else if (step.kind === 'split') mountSplit(verb, step);
      else mountRoot(verb, step);
      updateScoreboard();
      window.scrollTo(0, 0);
    }

    function chip(step, comboIndex) {
      const combos = (step.combos || []).length;
      const extra = step.kind === 'combos' && combos ? ` · combo ${comboIndex + 1}/${combos}` : '';
      return `<span class="chip-cat format-chip">Step ${step.n}/${STEP_COUNT} · ${esc(step.label)}${extra}</span>`;
    }

    function hintBox(mount, html) {
      const btn = $('#vpHint', mount);
      const box = $('#vpHintBox', mount);
      if (!btn || !box) return;
      let open = false;
      btn.onclick = () => {
        open = !open;
        box.hidden = !open;
        if (open) box.innerHTML = html;
        btn.textContent = open ? '🙈 Hide hint' : '💡 Hint';
      };
    }

    /* ---------- step 1: English → Spanish infinitive ---------- */
    function mountRoot(verb, step) {
      const mount = $('#task', view);
      mount.innerHTML = `
        ${chip(step)}
        <span class="prompt-k">¿Cómo se dice en español?</span>
        <h2 class="q-prompt enp">${esc(step.promptEn)}</h2>
        <p class="muted small">Type the Spanish verb (the infinitive).</p>
        <div class="ansform">
          <input id="vpInput" class="answer-input vp-input-wide" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Spanish…" aria-label="Your answer">
          <button class="btn" id="vpCheck" type="button">Check ✓</button>
          <button class="btn ghost" id="vpHint" type="button">💡 Hint</button>
        </div>
        <div id="vpHintBox" class="vp-hint" hidden></div>`;
      hintBox(mount, `<b>Hint:</b> ${esc(step.hint)}`);
      bindInput(mount, step, verb);
    }

    /* ---------- steps 2 & 3: the part that stays is shown, the rest is typed ---------- */
    function mountSplit(verb, step) {
      const mount = $('#task', view);
      const shown = step.shown ? `<span class="vp-shown">${esc(step.shown)}</span>` : '';
      const explanation = step.shown
        ? `The part shown (<b>${esc(step.shown)}</b>) is what stays the same — type only the part that changes.`
        : `Nothing of this form survives from the infinitive — type the whole form.`;
      mount.innerHTML = `
        ${chip(step)}
        <span class="prompt-k">${esc(step.tenseLabel)} · ${esc(step.personLabel)}</span>
        <h2 class="q-prompt">${esc(step.promptEn)}</h2>
        <p class="muted small">${step.shown ? `Type the ending for <b>${esc(verb.es)}</b>.` : `Type <b>${esc(verb.es)}</b> in this person.`}</p>
        <div class="vp-split-box">
          ${shown}
          <input id="vpInput" class="vp-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${step.shown ? '…' : 'whole form'}" aria-label="The part that changes">
        </div>
        <div class="ansform center">
          <button class="btn" id="vpCheck" type="button">Check ✓</button>
          <button class="btn ghost" id="vpHint" type="button">💡 Hint</button>
        </div>
        <p class="muted small vp-note">${explanation}</p>
        <div id="vpHintBox" class="vp-hint" hidden></div>`;
      hintBox(mount, `<b>Hint:</b> ${esc(step.hint)}`);
      bindInput(mount, step, verb);
    }

    /* ---------- step 4: the 11 magic combinations, typed ---------- */
    function mountCombo(verb, step, comboIndex) {
      const mount = $('#task', view);
      const combo = step.combos[comboIndex];
      mount.innerHTML = `
        ${chip(step, comboIndex)}
        <span class="prompt-k">Magic combo · ${esc(combo.label)}</span>
        <h2 class="q-prompt">${esc(combo.en)}</h2>
        <p class="muted small">Type the whole combination in Spanish. The magic verb is conjugated; the second verb stays in the infinitive.</p>
        <div class="ansform">
          <input id="vpInput" class="answer-input vp-input-wide" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Necesito …" aria-label="Your answer">
          <button class="btn" id="vpCheck" type="button">Check ✓</button>
          <button class="btn ghost" id="vpHint" type="button">💡 Hint</button>
        </div>
        <div id="vpHintBox" class="vp-hint" hidden></div>`;
      hintBox(mount, `<b>Hint:</b> the frame starts <b>${esc(combo.hint)}</b>`);
      bindInput(mount, step, verb, combo);
    }

    /* ---------- step 5: the shuffled-word builder ---------- */
    function mountOrder(verb, step) {
      const mount = $('#task', view);
      const p = verbPathProgress.get(verb.es);
      const items = step.items || [];
      if (!items.length) {
        /* no sentence bank for this verb — fall back to its first combo */
        card = { verb, stepIndex: 3, comboIndex: 0 };
        return renderStep();
      }
      const item = items[(hash(verb.es) + p.attempts) % items.length];
      mount.innerHTML = `
        ${chip(step)}
        <p class="prompt-en">"${esc(item.en)}"</p>
        <p class="muted small">Tap the words in the right order. Watch out — there are fake words in the bank.</p>
        <div id="vpOrder"></div>`;
      clean = tasks['word-order']($('#vpOrder', mount), {
        entry: { kind: 'verbSentence', id: item.id, item },
        level: LEVEL,
        hasMic: false,
        rate: 1,
        onSubmit: ok => finish(ok, null, item),
      });
    }

    /* ---------- shared typed-input plumbing ---------- */
    function bindInput(mount, step, verb, combo) {
      const input = $('#vpInput', mount);
      const check = $('#vpCheck', mount);
      const submit = () => {
        const value = input ? input.value : '';
        if (!value || !value.trim()) { if (input) input.focus(); return; }
        fx.sfx('tap');
        if (input) input.disabled = true;
        if (check) check.disabled = true;
        const hintBtn = $('#vpHint', mount);
        if (hintBtn) hintBtn.disabled = true;
        finish(verbPathAnswerOk(step, value, combo), value, null, combo);
      };
      if (check) check.onclick = submit;
      if (input) {
        input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
        setTimeout(() => { try { input.focus(); } catch {} }, 60);
      }
    }

    /* ---------------- answering ---------------- */
    let lastOk = false;

    function finish(ok, typed, orderItem, combo) {
      const { verb, stepIndex, comboIndex } = card;
      const step = verb.steps[stepIndex];
      const before = verbPathProgress.get(verb.es);
      verbPathProgress.record(verb, ok, stepIndex);
      lastOk = ok;
      s.answered++;
      let gained = 0;

      if (ok) {
        s.correct++;
        s.combo++;
        gained = stepXp(step);
        if (s.combo % 3 === 0) {
          gained += 10;
          if (s.combo === 3) fx.stamp('¡RACHA!');
          fx.floatText($('.card', view), '🔥 racha x' + s.combo + ' +10 XP');
        }
        fx.sfx('correct');
        fx.floatText($('.card', view), '+' + gained + ' XP');
      } else {
        s.wrong++;
        s.combo = 0;
        fx.sfx('wrong');
        fx.shake($('.card', view));
      }
      s.xp += gained;

      /* step-by-step copy: what was right, what the answer is, where we go next */
      let detail = '';
      let answerHtml = '';
      let nextLabel = 'Next →';
      let spoken = '';

      if (step.kind === 'root') {
        answerHtml = `<span class="vp-answer">${esc(step.answer)}</span> <span class="muted">— ${esc(verb.en)}</span>`;
        spoken = step.answer;
        if (ok) detail = `Root learned: <b>${esc(verb.es)}</b> = ${esc(verb.en)}.`;
        else detail = `<b>${esc(step.answer)}</b> means ${esc(verb.en)}. You will see this verb again at this step — your later steps stay saved.`;
      } else if (step.kind === 'split') {
        const splitTyped = String(typed == null ? '' : typed).trim();
        const shownPart = step.shown ? esc(step.shown) : '';
        answerHtml = `<span class="vp-answer">${shownPart}<span class="${ok ? 'typed' : 'typed-bad'}">${esc(ok ? splitTyped : step.answer)}</span></span>`;
        if (!ok) answerHtml += ` <span class="muted small">(you typed “${esc(splitTyped)}”)</span>`;
        spoken = step.full;
        detail = ok
          ? `${esc(step.full)} — ${esc(step.tenseLabel.toLowerCase())}, ${esc(step.personLabel)}. ${step.shown ? `“${esc(step.shown)}” stayed, you added “${esc(step.answer)}”.` : 'The whole form was yours.'}`
          : `${step.shown ? `“${esc(step.shown)}” stays` : 'Nothing stays here'}; you type <b>${esc(step.answer)}</b> → <b>${esc(step.full)}</b>.`;
      } else if (step.kind === 'combos') {
        const c = combo || step.combos[comboIndex];
        answerHtml = `<span class="vp-answer">${esc(c.es)}</span>`;
        spoken = c.es;
        const done = verbPathProgress.get(verb.es).magicDone;
        if (ok) {
          detail = done >= step.combos.length
            ? `All ${step.combos.length} magic combinations typed. Last step: build the sentence.`
            : `Combo ${comboIndex + 1}/${step.combos.length} done — ${step.combos.length - comboIndex - 1} to go.`;
          nextLabel = done >= step.combos.length ? 'Word order →' : `Next combo ${comboIndex + 2}/${step.combos.length} →`;
        } else {
          detail = `The frame is conjugated in the first person and the second verb stays in the infinitive: <b>${esc(c.es)}</b>.`;
        }
      } else {
        const item = orderItem || { es: '', en: '' };
        answerHtml = `<span class="vp-answer vp-answer-sentence">${esc(item.es)}</span>`;
        spoken = item.es;
        detail = ok ? 'Sentence built.' : `The right order is <b>${esc(item.es)}</b>.`;
        if (ok) nextLabel = 'Next verb →';
      }

      const correctAnswerText = step.kind === 'split' ? step.full
        : (step.kind === 'combos' ? (combo || step.combos[comboIndex]).es
        : (step.kind === 'order' ? (orderItem || {}).es : step.answer));
      if (!ok) answerHtml = `<span class="vp-answer">${esc(correctAnswerText)}</span>`;

      const lastStep = step.kind === 'order';
      const justLearned = ok && lastStep && !before.learned;
      $('#fb', view).innerHTML = `
        ${ok ? `<div class="fb good">¡Correcto! <span class="small">${justLearned ? 'All five steps passed — the verb is learned 🔒 (+' + XP_LEARNED + ' XP)' : 'Step locked in — keep going.'}</span></div>`
             : `<div class="fb bad">Not yet — <span class="small">this verb waits at this step; everything you passed before it stays saved.</span></div>`}
        <div class="recall">${esc(step.icon)} ${answerHtml}
          <button class="btn ghost mini" id="vpSay" type="button">🔊</button>
        </div>
        ${detail ? `<p class="explain">${detail}</p>` : ''}
        <div class="fb-actions"><button class="btn" id="vpNext" type="button">${nextLabel}</button></div>`;

      const sayBtn = $('#vpSay', view);
      if (sayBtn) sayBtn.onclick = () => say(spoken || '', 0.95);
      if (ok && player.sound !== false && spoken) say(spoken, 0.95);

      if (justLearned) {
        s.locked++;
        remaining = Math.max(0, remaining - 1);
        s.xp += XP_LEARNED;
        fx.confetti(150);
        fx.sfx('fanfare');
        fx.stamp('¡APRENDIDO!');
        try { player.toast(`<b>${esc(verb.es)}</b> — all 5 steps passed, it's yours now 🔒 (+${XP_LEARNED} XP)`, { icon: '🔒' }); } catch {}
      }

      updateScoreboard();
      bankStepXp();

      $('#vpNext', view).onclick = next;
      clearKey();
      keyHandler = e => {
        if (!e || (e.key !== 'Enter' && e.key !== ' ')) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')) return;
        e.preventDefault();
        next();
      };
      if (document.addEventListener) document.addEventListener('keydown', keyHandler);
    }

    /* the run only moves on after a correct answer; a miss hands the turn to
       the next verb and drops the missed one back into rotation a few
       questions later — at the very step it failed */
    function next() {
      clearKey();
      if (clean && clean.cleanup) clean.cleanup();
      clean = null;
      const { verb, stepIndex, comboIndex } = card;
      const step = verb.steps[stepIndex];

      if (!lastOk) {
        requeue(verb);
        return nextVerb();
      }
      if (step.kind === 'combos') {
        if (comboIndex + 1 < step.combos.length) {
          card = { verb, stepIndex, comboIndex: comboIndex + 1 };
          return renderStep();
        }
        card = { verb, stepIndex: 4, comboIndex: 0 };
        return renderStep();
      }
      if (step.kind === 'order') return nextVerb();
      card = { verb, stepIndex: stepIndex + 1, comboIndex: 0 };
      return renderStep();
    }

    /* a missed verb goes back into rotation a few questions ahead */
    function requeue(verb) {
      const pos = queue.length ? 4 + Math.floor(Math.random() * 8) : 0;
      queue.splice(Math.min(pos, queue.length), 0, verb);
    }

    /* ---------------- start screen ---------------- */
    const st = verbPathProgress.stats();
    view.innerHTML = `
      <div class="game-head">
        <div class="head-row">${backBtn()}<span class="head-title">🧭 ${TITLE} <span class="muted small">· A2 · setup</span></span></div>
      </div>
      <div class="card center">
        <div class="end-emoji">🧭</div>
        <h1>Verb Path</h1>
        <p class="muted">Five steps per verb — one verb learned when all five are passed.</p>
        <ol class="vp-intro">
          <li><b>1 · Root</b> — you see the English, you type the Spanish verb: <i>“to eat” → comer</i></li>
          <li><b>2 · Presente</b> — the part of the verb that stays is shown, you type the part that changes: <i>com___ → “o”</i>. Irregulars keep only the piece of the stem that survives (<i>t___ → “go”</i> = tengo); if nothing survives (<i>ir → voy</i>) the box is empty and you type it all.</li>
          <li><b>3 · Pretérito</b> — the same drill in the simple past: <i>com___ → “í”</i> (comí)</li>
          <li><b>4 · Magic combos</b> — all 11 magic frames, typed: <i>“I need to eat” → Necesito comer</i></li>
          <li><b>5 · Word order</b> — build a real sentence from shuffled words, distractors included</li>
        </ol>
        <p class="notice">Miss a step and the verb keeps everything you already passed — it comes back at the step with the mistake, never from the beginning. ${st.total} handout verbs · ${st.learned} learned · ${st.started} in progress · ${st.fresh} new.</p>
        <div class="row center"><button class="btn big" id="vpGo" type="button">Start ▶</button></div>
      </div>`;

    $('#vpGo', view).onclick = () => {
      queue = buildQueue();
      if (startVerb) {
        /* "Practice" on the home page: open the path on that exact verb, even
           if it is already learned (it then walks the whole path again) */
        const chosen = verbs.find(v => v.es === startVerb);
        if (chosen) {
          queue = [chosen].concat(queue.filter(v => v !== chosen));
          forceServe = chosen;
        }
      }
      nextVerb();
    };
  }
})();
