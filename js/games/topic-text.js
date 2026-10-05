'use strict';
/* ============ Topic Text Studio ============
   The player types any topic; the text is then *composed*, not looked up.
   js/topic-engine.js owns the sentences: it draws a tense per role, picks
   verbs from the selected level's own bank, fills the slots with nouns from
   the topic's semantic field, and marks one conjugated form per line. Every
   generation is a new text, so the same topic never repeats itself. */
(function () {
  const MARK = '{{verb}}';
  const MODE_META = {
    short: { label: 'Short text', icon: '⚡', count: 4, note: '4 sentences · quick practice' },
    long: { label: 'Long text', icon: '📖', count: 8, note: '8 sentences · deeper reading' },
    conversation: { label: 'Conversation', icon: '💬', count: 8, note: '8 turns · two speakers' },
  };

  function engine() {
    if (!window.TopicTextEngine) throw new Error('The text engine did not load. Reload the page.');
    return window.TopicTextEngine;
  }

  function cleanTopic(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  /* One generation = one call to the engine. `seed` is left to the engine so
     that pressing "New version" really produces a different text. */
  function generateTopicText(topicValue, modeValue, levelValue) {
    const topic = cleanTopic(topicValue);
    const mode = MODE_META[modeValue] ? modeValue : 'short';
    const level = (window.DATA && DATA[levelValue]) ? levelValue : 'A1';
    if (!topic) throw new Error('Please enter a topic first.');
    const passage = engine().build({ level, topic, mode });
    passage.meta = Object.assign({}, MODE_META[mode], passage.meta || {});
    return passage;
  }

  function renderTarget(line, blank) {
    const parts = line.text.split(MARK);
    const target = blank
      ? `<span class="topic-blank" aria-label="missing verb">_____</span>`
      : `<mark class="topic-verb" title="${esc(line.verb)} — ${esc(line.en)}">${esc(line.answer)}</mark>`;
    return esc(parts[0]) + target + esc(parts[1]);
  }

  function passageHTML(passage, blankIndex) {
    if (passage.mode === 'conversation') {
      return `<div class="topic-conversation" lang="es">${passage.lines.map((line, i) => `
        <div class="bubble-line ${line.speaker === 'Tú' || line.speaker === 'B' ? 'you' : ''}">
          <span class="who">${esc(line.speaker)}</span>
          <span class="txt">${renderTarget(line, i === blankIndex)}</span>
        </div>`).join('')}</div>`;
    }
    return `<div class="topic-prose" lang="es">${passage.lines.map((line, i) =>
      `<p>${renderTarget(line, i === blankIndex)}</p>`).join('')}</div>`;
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch {}
    }
  }

  function setupHTML(level, topic, mode) {
    const suggestions = level === 'EXAM'
      ? ['la Independencia de México', 'mi vida en México', 'los símbolos patrios']
      : ['viajar por México', 'la comida', 'mi trabajo'];
    return `
      <div class="game-head">
        <div class="head-row">${backBtn()}<span class="head-title">✍️ Topic Text Studio <span class="muted small">· ${esc(level)} · setup</span></span></div>
      </div>
      <div class="card topic-setup">
        <div class="topic-hero-icon">✍️</div>
        <span class="chip-cat">Your topic · this level's verbs</span>
        <h1>What do you want to read about?</h1>
        <p class="muted">Enter any topic. The app will create a new Spanish text using target verbs from <b>${esc(level)}</b>, then you can type those verbs in context.</p>
        <form id="topicForm">
          <label class="topic-input-label" for="topicInput">Topic</label>
          <input id="topicInput" class="answer-input topic-input" type="text" maxlength="80" required
            value="${esc(topic || '')}" placeholder="e.g. street food in Oaxaca" autocomplete="off">
          <div class="topic-suggestions" aria-label="Topic suggestions">
            <span class="muted small">Try:</span>
            ${suggestions.map(s => `<button class="pill topic-suggestion" type="button" data-topic="${esc(s)}">${esc(s)}</button>`).join('')}
          </div>
          <fieldset class="topic-modes">
            <legend>Choose a format</legend>
            ${Object.keys(MODE_META).map(id => {
              const m = MODE_META[id];
              return `<label class="topic-mode ${mode === id ? 'selected' : ''}">
                <input type="radio" name="topicMode" value="${id}" ${mode === id ? 'checked' : ''}>
                <span class="topic-mode-icon">${m.icon}</span>
                <span><b>${m.label}</b><small>${m.note}</small></span>
              </label>`;
            }).join('')}
          </fieldset>
          <div id="topicError" class="feedback" aria-live="polite"></div>
          <button class="btn big topic-generate" type="submit">Generate my text →</button>
        </form>
        <p class="muted small topic-local-note">The text is built privately in your browser from the ${esc(level)} verb bank.</p>
      </div>`;
  }

  function generatedHTML(passage) {
    const unique = [];
    const seen = new Set();
    passage.lines.forEach(line => {
      if (!seen.has(line.verb)) { seen.add(line.verb); unique.push(line); }
    });
    return `
      <div class="game-head">
        <div class="head-row">
          ${backBtn()}
          <span class="head-title">✍️ Topic Text Studio <span class="muted small">· ${esc(passage.level)}</span></span>
          <span class="grow"></span>
          <span class="badge">${passage.meta.icon} ${esc(passage.meta.label)}</span>
        </div>
      </div>
      <div class="card topic-result">
        <div class="row between topic-title-row">
          <div><span class="chip-cat">Generated for you</span><h1>${esc(passage.topic)}</h1></div>
          <button class="btn ghost mini" id="topicEdit" type="button">✎ Change setup</button>
        </div>
        <p class="muted small">Written for you from the <b>${esc(passage.level)}</b> verb bank · ${esc((passage.meta.tensesUsed || []).length || 1)} tense${(passage.meta.tensesUsed || []).length === 1 ? '' : 's'} · ${esc(passage.fieldLabel || passage.field || '')}. Read the whole text aloud, then practise each form. ↻ builds a different one.</p>
        ${passageHTML(passage, -1)}
        <div class="topic-verb-shelf" aria-label="Target verbs">
          ${unique.map(line => `<span class="topic-verb-chip"><b>${esc(line.answer)}</b><small>${esc(line.verb)} · ${esc(line.tenseLabel || '')}${line.personLabel ? ' · ' + esc(line.personLabel) : ''}</small></span>`).join('')}
        </div>
        <div id="topicGlossBox" class="topic-gloss" hidden>${passage.lines.map(line =>
          `<p class="muted small">${esc(line.gloss || '')}</p>`).join('')}</div>
        <div class="topic-actions">
          <button class="btn big" id="topicPractice" type="button">Practise ${passage.lines.length} verbs →</button>
          <button class="btn ghost" id="topicListen" type="button">🔊 Listen</button>
          <button class="btn ghost" id="topicGloss" type="button">🅰 English</button>
          <button class="btn ghost" id="topicAgain" type="button">↻ New version</button>
        </div>
      </div>`;
  }

  window.registerGame({
    id: 'topic-text',
    icon: '✍️',
    title: 'Topic Text Studio',
    tag: 'Your topic · level verbs',
    desc: 'Type any topic and generate a short text, a longer reading, or a conversation with verbs from your current level. Read or listen, then type every target verb in context.',
    xpHint: '20–40 XP per completed text',
    start(view, level) {
      let passage = null;
      let awarded = false;
      const saved = store.get('topicText.' + level, {}) || {};
      let currentTopic = cleanTopic(saved.topic || '');
      let currentMode = MODE_META[saved.mode] ? saved.mode : 'short';

      setCleanup(stopSpeech);

      function bindSetup() {
        const form = $('#topicForm', view);
        const input = $('#topicInput', view);
        $$('.topic-suggestion', view).forEach(btn => {
          btn.onclick = () => { input.value = btn.dataset.topic; input.focus(); };
        });
        $$('input[name="topicMode"]', view).forEach(radio => {
          radio.onchange = () => {
            $$('.topic-mode', view).forEach(label => label.classList.toggle('selected', label.contains(radio) && radio.checked));
          };
        });
        form.onsubmit = event => {
          if (event && event.preventDefault) event.preventDefault();
          const chosen = $('input[name="topicMode"]:checked', view);
          currentTopic = cleanTopic(input.value);
          currentMode = chosen && MODE_META[chosen.value] ? chosen.value : 'short';
          if (!currentTopic) {
            $('#topicError', view).innerHTML = '<div class="fb bad">Add a topic first — for example, <b>music in Mexico</b>.</div>';
            input.focus();
            return;
          }
          try {
            passage = generateTopicText(currentTopic, currentMode, level);
            awarded = false;
            store.set('topicText.' + level, { topic: currentTopic, mode: currentMode });
            renderGenerated();
          } catch (err) {
            $('#topicError', view).innerHTML = `<div class="fb bad">${esc(err.message || 'Could not generate this text.')}</div>`;
          }
        };
        input.focus();
      }

      function renderSetup() {
        stopSpeech();
        view.innerHTML = setupHTML(level, currentTopic, currentMode);
        bindSetup();
        window.scrollTo(0, 0);
      }

      function renderGenerated() {
        stopSpeech();
        view.innerHTML = generatedHTML(passage);
        $('#topicListen', view).onclick = () => say(passage.plainText, level === 'A1' ? 0.86 : 0.93);
        $('#topicPractice', view).onclick = () => renderPractice(0, 0, 0, false);
        const again = $('#topicAgain', view);
        if (again) again.onclick = () => {
          passage = generateTopicText(currentTopic, currentMode, level);
          awarded = false;
          renderGenerated();
        };
        const gloss = $('#topicGloss', view);
        if (gloss) gloss.onclick = () => {
          const box = $('#topicGlossBox', view);
          if (box) box.hidden = !box.hidden;
        };
        $('#topicEdit', view).onclick = renderSetup;
        window.scrollTo(0, 0);
      }

      function practiceHeader(index, firstTry, mistakes) {
        const pct = passage.lines.length ? Math.round((index / passage.lines.length) * 100) : 0;
        return `
          <div class="game-head">
            <div class="head-row">
              ${backBtn()}
              <button class="btn ghost" id="topicBack" type="button">← Text</button>
              <span class="head-title">✍️ Verb practice <span class="muted small">· ${esc(level)} · ${esc(passage.topic)}</span></span>
              <span class="grow"></span>
              <span class="badge"><b>${index}</b> / ${passage.lines.length}</span>
            </div>
            <div class="scoreboard topic-score">
              <div class="row between small"><span><b>${firstTry}</b> first try · <b>${mistakes}</b> mistakes</span><span>${pct}% complete</span></div>
              <div class="sb-bar"><div class="sb-bar-fill" style="width:${pct}%"></div></div>
            </div>
          </div>`;
      }

      function renderPractice(index, firstTry, mistakes, missedCurrent) {
        stopSpeech();
        if (index >= passage.lines.length) return renderComplete(firstTry, mistakes);
        const line = passage.lines[index];
        view.innerHTML = `
          ${practiceHeader(index, firstTry, mistakes)}
          <div class="card topic-practice">
            <span class="chip-cat">Verb ${index + 1} of ${passage.lines.length}</span>
            <p class="muted small">Complete the highlighted sentence with the correct form of <b>${esc(line.verb)}</b>.</p>
            <div class="topic-quiz-context">${passageHTML(passage, index)}</div>
            <div class="topic-hint"><b>${esc(line.verb)}</b><span>${esc(line.tenseLabel || '')}${line.personLabel ? ' · ' + esc(line.personLabel) : ''}</span><button class="btn ghost mini" id="topicHearLine" type="button">🔊 Hear line</button></div>
            <form id="topicAnswerForm" class="ansform">
              <label class="sr-only" for="topicAnswer">Missing verb form</label>
              <input id="topicAnswer" class="answer-input" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Type the missing form">
              <button class="btn" id="topicCheck" type="submit">Check ✓</button>
            </form>
            <div id="topicPracticeFeedback" class="feedback" aria-live="polite"></div>
            <div class="row center topic-reveal-row"><button class="btn ghost mini" id="topicReveal" type="button">Show answer</button></div>
          </div>`;
        $('#topicBack', view).onclick = renderGenerated;
        $('#topicHearLine', view).onclick = () => say(line.text.replace(MARK, line.answer), level === 'A1' ? 0.84 : 0.92);
        const input = $('#topicAnswer', view);
        const form = $('#topicAnswerForm', view);
        const feedback = $('#topicPracticeFeedback', view);
        const reveal = $('#topicReveal', view);
        input.focus();

        function finishAnswer(ok, revealed) {
          input.disabled = true;
          $('#topicCheck', view).disabled = true;
          reveal.disabled = true;
          if (ok) fx.sfx('correct'); else fx.sfx('wrong');
          feedback.innerHTML = `
            <div class="fb ${ok ? 'good' : 'warn'}">${ok ? '¡Correcto!' : 'Answer shown:'} <b>${esc(line.answer)}</b></div>
            <div class="fb-actions"><button class="btn" id="topicNextVerb" type="button">${index + 1 === passage.lines.length ? 'See results →' : 'Next verb →'}</button></div>`;
          $('#topicNextVerb', view).onclick = () => renderPractice(index + 1, firstTry + (ok && !missedCurrent ? 1 : 0), mistakes + (revealed ? 1 : 0), false);
        }

        form.onsubmit = event => {
          if (event && event.preventDefault) event.preventDefault();
          if (!cleanTopic(input.value)) return;
          if (norm(input.value) === norm(line.answer)) {
            finishAnswer(true, false);
          } else {
            missedCurrent = true;
            mistakes++;
            fx.sfx('wrong');
            fx.shake($('.topic-practice', view));
            const first = Array.from(line.answer)[0] || '';
            feedback.innerHTML = `<div class="fb bad">Not yet. It starts with <b>${esc(first)}</b> and comes from <b>${esc(line.verb)}</b>. Try again.</div>`;
            input.select();
          }
        };
        reveal.onclick = () => finishAnswer(false, true);
        window.scrollTo(0, 0);
      }

      function renderComplete(firstTry, mistakes) {
        stopSpeech();
        const xp = Math.max(10, passage.lines.length * 5 - Math.min(mistakes * 2, passage.lines.length * 3));
        if (!awarded) {
          awarded = true;
          try { player.award(xp, { game: 'Topic Text Studio', exam: level === 'EXAM' }); } catch {}
          fx.confetti(120);
          fx.sfx('fanfare');
        }
        view.innerHTML = `
          <div class="card center endcard topic-complete">
            <div class="end-emoji">🎉</div>
            <span class="chip-cat">${esc(level)} · ${esc(passage.meta.label)}</span>
            <h1>¡Texto completado!</h1>
            <p class="big">You practised all ${passage.lines.length} target verbs about <b>${esc(passage.topic)}</b>.</p>
            <p class="muted">${firstTry}/${passage.lines.length} correct on the first try · ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'} · +${xp} XP</p>
            <div class="topic-actions center">
              <button class="btn big" id="topicNewText" type="button">${passage.mode === 'conversation' ? 'Change topic or format' : 'Generate another version'}</button>
              <button class="btn ghost" id="topicReview" type="button">Review these verbs</button>
              <button class="btn ghost" id="topicCompleteBack" type="button">Read the text</button>
              ${backBtn()}
            </div>
          </div>`;
        $('#topicNewText', view).onclick = () => {
          if (passage.mode === 'conversation') return renderSetup();
          passage = generateTopicText(currentTopic, currentMode, level);
          awarded = false;
          renderGenerated();
        };
        $('#topicReview', view).onclick = () => renderPractice(0, 0, 0, false);
        $('#topicCompleteBack', view).onclick = renderGenerated;
        window.scrollTo(0, 0);
      }

      renderSetup();
    },
  });

  /* Pure hooks make it possible to regression-test every level and mode
     without driving the DOM. */
  window.topicTextGenerator = {
    generate: generateTopicText,
    cleanTopic,
    modes: MODE_META,
    marker: MARK,
    /* kept for the tests and for other games that ask what is practisable */
    availableVerbs(level) { return engine().verbBank(level).map(v => v.es); },
    engine: () => window.TopicTextEngine,
  };
})();
