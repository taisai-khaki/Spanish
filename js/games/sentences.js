'use strict';
/* ============ Word Order: build / type / listen / fill the gap ============ */
(function () {
  window.registerGame({
    id: 'sentences',
    icon: '🧩',
    title: 'Word Order',
    tag: 'Grammar in context',
    desc: 'Build the sentence, type it, hear it, or fill the gap — the exercise changes every time until the sentence is yours (5/5).',
    xpHint: '8–15 XP per sentence',
    remaining: level => engine.unmastered(level, 'sentence').length,
    start(view, level) {
      runRound(view, {
        id: 'sentences', icon: '🧩', title: 'Word Order', level,
        kind: 'sentence', kindLabel: 'sentence', size: 8,
      });
    },
  });
})();
