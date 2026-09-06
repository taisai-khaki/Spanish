'use strict';
/* ============ Repaso: the real 683-question exam bank ============
   Every question from the naturalization bank (history, geography,
   culture, civics) — same 5-in-a-row rule, alternating between
   "which is correct" and "spot the mistake". EXAM level only. ============ */
(function () {
  window.registerGame({
    id: 'repaso',
    icon: '🗂️',
    title: 'Repaso',
    tag: 'El examen · banco real',
    desc: '10 real questions from the naturalization bank of 683 — history, geography, culture, civics. Pick the right answer, or catch the mistake. 5/5 and the question is gone forever.',
    xpHint: '≈ 100–140 XP per round',
    remaining: level => (level === 'EXAM' ? engine.unmastered(level, 'repaso').length : null),
    start(view, level) {
      if (level !== 'EXAM') {
        view.innerHTML = `
          <div class="card center endcard">
            <div class="end-emoji">🗂️</div>
            <h1>Solo en el nivel EXAM</h1>
            <p class="big">Repaso drills the real exam bank (683 questions).</p>
            <p class="muted">Switch to the <b>EXAM · Naturalización</b> level pill up top to play it.</p>
            <div class="row center">${backBtn()}</div>
          </div>`;
        return;
      }
      runRound(view, {
        level, id: 'repaso', icon: '🗂️', title: 'Repaso',
        kind: 'repaso', kindLabel: 'question', size: 10,
        setup: true,
        setupText: '10 questions from the real bank of 683. The English translation waits in the "explain" after each answer.',
      });
    },
  });
})();
