'use strict';
/* ============ Grammar Judge: which one is right? (or spot the error) ============ */
(function () {
  window.registerGame({
    id: 'grammar',
    icon: '📐',
    title: 'Grammar Judge',
    tag: 'Fix your mistakes',
    desc: '¿Cuál es? Real error variants — ser/estar, gender, subjunctive, tenses. Every rule locks in at 5/5, then it never bothers you again.',
    xpHint: '12 XP per rule',
    remaining: level => engine.unmastered(level, 'grammar').length,
    start(view, level) {
      runRound(view, {
        id: 'grammar', icon: '📐', title: 'Grammar Judge', level,
        kind: 'grammar', kindLabel: 'grammar rule', size: 8,
      });
    },
  });
})();
