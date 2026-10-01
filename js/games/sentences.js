'use strict';
/* ============ Word Order: build sentences from shuffled words ============ */
(function () {
  window.registerGame({
    id: 'sentences',
    icon: '🧩',
    title: 'Word Order',
    tag: 'Build the sentence',
    desc: 'Drag the words into the right order. All 200 verbs, 11 magic verbs, all tenses, all glue words — grammar mastery through building.',
    xpHint: '8–15 XP per sentence',
    remaining: level => engine.unmastered(level, 'sentence').length,
    start(view, level) {
      runRound(view, {
        id: 'sentences', icon: '🧩', title: 'Word Order', level,
        kind: 'sentence', kindLabel: 'sentence', size: 10,
        formatFn: () => 'word-order',
      });
    },
  });
})();
