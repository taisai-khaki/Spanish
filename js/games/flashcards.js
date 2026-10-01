'use strict';
/* ============ Level Flashcards (A1–B2): practice all verbs across tenses
   & combinations plus all nouns in the current level ============ */
(function () {
  let activeFilter = 'all';

  const FILTERS = [
    { id: 'all', label: 'All (Verbs + Nouns)' },
    { id: 'verbs', label: 'All Verbs & Tenses' },
    { id: 'presente', label: 'Verbs · Presente' },
    { id: 'pasado', label: 'Verbs · Pretérito & Imperfecto' },
    { id: 'futuro', label: 'Verbs · Futuro & Condicional' },
    { id: 'combinaciones', label: 'Verbs · Combinations' },
    { id: 'nouns', label: 'All Nouns' },
  ];

  function matchesFilter(card, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'verbs') return card.cardType === 'verb';
    if (filter === 'nouns') return card.cardType === 'noun';
    return card.cardType === 'verb' && card.subType === filter;
  }

  function filteredPool(level, filter) {
    const raw = engine.unmastered(level, 'flashcard').filter(e => matchesFilter(e.item, filter));
    const fallback = raw.length ? raw : engine.pool(level, 'flashcard').filter(e => matchesFilter(e.item, filter));
    return engine.order(fallback.length ? fallback : engine.unmastered(level, 'flashcard'), level);
  }

  window.registerGame({
    id: 'flashcards',
    icon: '🃏',
    title: 'Level Flashcards',
    tag: 'Verbs & Nouns (A1–B2)',
    desc: 'Practice every verb in the level across different tenses (Presente, Pretérito, Imperfecto, Futuro, Condicional) and verb combinations, plus all nouns in the section.',
    xpHint: '10 XP per flashcard',
    remaining: level => engine.unmastered(level, 'flashcard').length,
    start(view, level) {
      const allCards = (DATA[level] && DATA[level].flashcards) || [];
      const verbCount = allCards.filter(c => c.cardType === 'verb').length;
      const nounCount = allCards.filter(c => c.cardType === 'noun').length;

      runRound(view, {
        id: 'flashcards',
        icon: '🃏',
        title: `Level Flashcards · ${level}`,
        level,
        kind: 'flashcard',
        kindLabel: 'flashcard',
        poolFn: () => filteredPool(level, activeFilter),
        allFn: () => engine.pool(level, 'flashcard').filter(e => matchesFilter(e.item, activeFilter)),
        remainingFn: () => engine.unmastered(level, 'flashcard').length,
        formatFn: () => 'flashcard',
      });

      const stage = view.querySelector('.stage');
      if (stage) {
        const bar = document.createElement('div');
        bar.className = 'card fc-filter-bar';
        bar.innerHTML = `
          <div class="row between">
            <b>🃏 ${esc(level)} Deck: ${verbCount} verb tense/combo cards · ${nounCount} noun cards</b>
          </div>
          <div class="chip-row fc-filters">
            ${FILTERS.map(f => `<button class="pill ${activeFilter === f.id ? 'active' : ''}" type="button" data-filter="${esc(f.id)}">${esc(f.label)}</button>`).join('')}
          </div>`;
        if (stage.insertBefore && stage.firstChild) {
          stage.insertBefore(bar, stage.firstChild);
        } else {
          stage.appendChild(bar);
        }
        bar.querySelectorAll('[data-filter]').forEach(btn => {
          btn.onclick = () => {
            activeFilter = btn.dataset.filter;
            this.start(view, level);
          };
        });
      }
    },
  });
})();
