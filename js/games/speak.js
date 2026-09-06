'use strict';
/* ============ Prono Repeat: say it out loud (phrases + conversation lines) ============ */
(function () {
  window.registerGame({
    id: 'speak',
    icon: '🎤',
    title: 'Prono Repeat',
    tag: 'Speaking & pronunciation',
    desc: 'Real phrases and conversation lines. Say them out loud; the mic scores you 0–100%. 5/5 in a row = the phrase is yours.',
    xpHint: '15–20 XP per phrase',
    remaining: level => engine.unmastered(level, 'sentence').length
      + engine.unmastered(level, 'dialogue').filter(p => p.item.who === 'you').length,
    start(view, level) {
      runRound(view, {
        id: 'speak', icon: '🎤', title: 'Prono Repeat', level,
        kind: 'phrases', kindLabel: 'phrase', size: 8,
        poolFn: () => engine.order(
          engine.unmastered(level, 'sentence')
            .concat(engine.unmastered(level, 'dialogue').filter(p => p.item.who === 'you')),
          level
        ),
        formatFn: () => 'speak',
      });
    },
  });
})();
