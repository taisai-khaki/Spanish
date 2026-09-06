'use strict';
/* ============ Vocab Smash: unlearned words only, 4 rotating formats ============ */
(function () {
  window.registerGame({
    id: 'flashcards',
    icon: '🃏',
    title: 'Vocab Smash',
    tag: 'Vocabulary · 5 to lock',
    desc: 'Only words you haven\'t locked in — and each repeat comes back in a different shape: write it, hear it, pick it. 5/5 in a row = yours forever.',
    xpHint: '6–12 XP per word',
    remaining: level => engine.unmastered(level, 'word').length,
    start(view, level) {
      runRound(view, {
        id: 'flashcards', icon: '🃏', title: 'Vocab Smash', level,
        kind: 'word', kindLabel: 'word', size: 10,
      });
    },
  });
})();
