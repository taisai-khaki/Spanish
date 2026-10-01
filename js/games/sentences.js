'use strict';
/* ============ Word Order: build sentences from shuffled words ============ */
(function () {
  window.registerGame({
    id: 'sentences',
    icon: '🧩',
    title: 'Word Order',
    tag: 'Build the sentence',
    desc: 'Build sentences from shuffled words. A2 covers all 190 unique source verbs across 11 magic-verb frames and six person forms; each linked sentence counts after one correct answer. Curated builders keep glue words in context.',
    xpHint: '8–15 XP per sentence',
    remaining: level => engine.unmastered(level, 'sentence').length + engine.unmastered(level, 'verbSentence').length,
    start(view, level) {
      const remaining = () => engine.unmastered(level, 'sentence').length
        + engine.unmastered(level, 'verbSentence').length;
      runRound(view, {
        id: 'sentences', icon: '🧩', title: 'Word Order', level,
        kind: 'sentence', kindLabel: 'sentence', size: 10,
        poolFn: () => engine.order(
          engine.unmastered(level, 'sentence').concat(engine.unmastered(level, 'verbSentence')),
          level
        ),
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
