'use strict';
/* ============ 200 Verbs + Glue Words (A2 handouts) ============
   Every verb from the two numbered handout lists, in two directions:

     · magic     — the 11 magic-verb frames in the first person
     · regular   — infinitive + yo presente + yo pretérito
     · irregular — infinitive + all 5 presente and 5 pretérito persons
     · glue      — all 214 glue words

   3,538 cards per direction · 7,076 in total. The deck always lives in A2
   (that is where the handouts are), whatever level pill is selected. */
(function () {
  const LEVEL = 'A2';
  let group = 'all';
  let direction = 'both';
  let search = '';      /* normalized, for matching */
  let searchRaw = '';   /* exactly what the player typed */

  const GROUPS = [
    { id: 'all', label: 'All' },
    { id: 'magic', label: '✨ Magic combos' },
    { id: 'regular', label: 'Regular verbs' },
    { id: 'irregular', label: 'Irregular verbs' },
    { id: 'glue', label: '🧷 Glue words' },
  ];
  const DIRECTIONS = [
    { id: 'both', label: '🔁 ES ⇄ EN' },
    { id: 'es-en', label: '🇪🇸 → 🇬🇧' },
    { id: 'en-es', label: '🇬🇧 → 🇪🇸' },
  ];

  function meta() { return window.VERB_DECK_META || { verbs: 190, total: 0, perDirection: 0, glue: 0, irregular: 0 }; }
  function cards() { return (DATA[LEVEL] && DATA[LEVEL].verbCards) || []; }
  function hasFilter() { return group !== 'all' || direction !== 'both' || !!search; }
  function matches(card) {
    if (group !== 'all' && card.group !== group) return false;
    if (direction !== 'both' && card.direction !== direction) return false;
    if (search) {
      const hay = norm([card.es, card.en, card.prompt, card.badge, card.verbEs, card.verbEn].filter(Boolean).join(' '));
      if (hay.indexOf(search) < 0) return false;
    }
    return true;
  }
  function countFor(g, d) {
    return cards().filter(c => (g === 'all' || c.group === g) && (d === 'both' || c.direction === d)).length;
  }
  function filtered() { return engine.pool(LEVEL, 'verbCard').filter(e => matches(e.item)); }
  function pool() {
    const fresh = engine.unmastered(LEVEL, 'verbCard').filter(e => matches(e.item));
    const fallback = filtered();
    return engine.order(fresh.length ? fresh : fallback, LEVEL);
  }
  function remaining() {
    return engine.unmastered(LEVEL, 'verbCard').filter(e => matches(e.item)).length;
  }

  function filterBar() {
    const m = meta();
    return `
      <div class="row between">
        <b>📚 ${m.verbs} verbs (${m.irregular} irregular) + ${m.glue} glue words · ${Number(m.total).toLocaleString()} cards</b>
        <span class="muted small">${filtered().length.toLocaleString()} in this filter</span>
      </div>
      <div class="chip-row fc-filters">
        ${DIRECTIONS.map(d => `<button class="pill ${direction === d.id ? 'active' : ''}" type="button" data-dir="${d.id}">${d.label}</button>`).join('')}
        <input id="vcSearch" class="answer-input verb-search" type="search" placeholder="Find a verb or word…"
          value="${esc(searchRaw)}" autocomplete="off" spellcheck="false">
        ${hasFilter() ? '<button class="pill" type="button" id="vcReset">↺ Reset filters</button>' : ''}
      </div>
      <div class="chip-row fc-filters">
        ${GROUPS.map(g => `<button class="pill ${group === g.id ? 'active' : ''}" type="button" data-group="${g.id}">${esc(g.label)} · ${countFor(g.id, direction).toLocaleString()}</button>`).join('')}
      </div>`;
  }

  window.registerGame({
    id: 'verbcards',
    icon: '📚',
    title: '200 Verbs & Glue Words',
    tag: 'A2 handouts · flashcards',
    desc: 'All 190 unique handout verbs (200 numbered rows) in two directions: the 11 magic-verb combinations in the first person, the full presente + pretérito of every irregular verb (5 persons), infinitive + yo forms for the regular ones, and all 214 glue words. 7,076 cards, four options each — one correct answer locks a card.',
    xpHint: '10 XP per card',
    remaining: () => remaining(),
    start(view, level) {
      const game = this;
      runRound(view, {
        id: 'verbcards',
        icon: '📚',
        title: '200 Verbs & Glue Words',
        level: LEVEL,
        kind: 'verbCard',
        kindLabel: 'card',
        poolFn: pool,
        allFn: filtered,
        remainingFn: remaining,
        formatFn: () => 'verb-card',
        filtersFn: filterBar,
        completeText: 'Every card in the 200-verb deck is locked in — all 7,076 of them. ¡Increíble!',
        bindFilters(v) {
          const restart = () => { runCleanup(); game.start(v, level); };
          v.querySelectorAll('[data-dir]').forEach(btn => {
            btn.onclick = () => { direction = btn.dataset.dir; restart(); };
          });
          v.querySelectorAll('[data-group]').forEach(btn => {
            btn.onclick = () => { group = btn.dataset.group; restart(); };
          });
          const input = v.querySelector('#vcSearch');
          if (input) {
            const apply = () => { search = norm(input.value); searchRaw = input.value; restart(); };
            input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } };
            input.onchange = () => { if (norm(input.value) !== search) apply(); };
          }
          const reset = v.querySelector('#vcReset');
          if (reset) {
            reset.onclick = () => { group = 'all'; direction = 'both'; search = ''; searchRaw = ''; restart(); };
          }
        },
      });
    },
  });
})();
