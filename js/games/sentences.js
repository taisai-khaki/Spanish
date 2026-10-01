'use strict';
/* ============ Word Order: build sentences from shuffled words ============ */
(function () {
  window.registerGame({
    id: 'sentences',
    icon: '🧩',
    title: 'Word Order',
    tag: 'Build the sentence',
    desc: 'Build sentences from shuffled words. A2 covers all 190 unique source verbs across 11 magic-verb frames and six person forms; each linked sentence counts after one correct answer. Curated builders keep glue words in context. Endless: sentences keep coming until you head back to the games page.',
    xpHint: '8–15 XP per sentence',
    remaining: level => engine.unmastered(level, 'sentence').length + engine.unmastered(level, 'verbSentence').length,
    start(view, level) {
      const remaining = () => engine.unmastered(level, 'sentence').length
        + engine.unmastered(level, 'verbSentence').length;
      runRound(view, {
        id: 'sentences', icon: '🧩', title: 'Word Order', level,
        kind: 'sentence', kindLabel: 'sentence',
        /* curated builders up front, then the tagged verb variations — the
           whole queue, not a slice of it, because the round never ends alone */
        poolFn: () => {
          const curated = engine.order(engine.unmastered(level, 'sentence'), level);
          const verbs = engine.order(engine.unmastered(level, 'verbSentence'), level);
          return shuffle(curated.slice(0, 4).concat(verbs.slice(0, 6)))
            .concat(curated.slice(4), verbs.slice(6));
        },
        allFn: () => engine.pool(level, 'sentence').concat(engine.pool(level, 'verbSentence')),
        remainingFn: remaining,
        completionVerb: 'completed',
        completeText: level === 'A2'
          ? 'Every Word Order sentence is complete. Each A2 verb is learned after all 66 linked variations have one correct answer.'
          : `Every Word Order sentence in ${level} has reached its mastery target.`,
        formatFn: () => 'word-order',
      });
    },
  });
})();
