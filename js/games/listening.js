'use strict';
/* ============ Oído Sharp: fast words + fast conversation lines (keyword catch) ============ */
(function () {
  window.registerGame({
    id: 'listening',
    icon: '👂',
    title: 'Oído Sharp',
    tag: 'Fast listening',
    desc: 'Fast words and fast conversation lines. Catch the meaning — or the keyword they actually said — before the clock dies. Your fast-Spanish fix.',
    xpHint: '8–10 XP per item',
    remaining: level => engine.unmastered(level, null).filter(p => ['word', 'sentence', 'dialogue'].includes(p.kind)).length,
    start(view, level) {
      let rate = 1;
      runRound(view, {
        id: 'listening', icon: '👂', title: 'Oído Sharp', level,
        kind: 'listening', kindLabel: 'item', size: 10,
        poolFn: () => engine.order(
          engine.unmastered(level, null).filter(p => ['word', 'sentence', 'dialogue'].includes(p.kind)),
          level
        ),
        formatFn: p => p.kind === 'dialogue' ? 'keyword' : 'listen-pick',
        setup: true,
        setupText: 'Native speed by default — that\'s the point. Six seconds, no mercy.',
        getRate: () => rate,
        onSetup: slow => { rate = slow ? 0.75 : 1; },
        onDone: stats => {
          if (stats.poolSize === 10 && stats.missedCount === 0) player.flag('listen10');
        },
      });
    },
  });
})();
