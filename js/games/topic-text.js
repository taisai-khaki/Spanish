'use strict';
/* ============ Topic Text Studio ============
   The player supplies any topic and chooses a short text, a long text, or a
   conversation. The generator stays entirely in the browser and builds the
   result from verb forms that belong to the selected level. Every generated
   target can then be practised as a typed, in-context verb challenge. */
(function () {
  const MARK = '{{verb}}';
  const MODE_META = {
    short: { label: 'Short text', icon: '⚡', count: 4, note: '4 sentences · quick practice' },
    long: { label: 'Long text', icon: '📖', count: 8, note: '8 sentences · deeper reading' },
    conversation: { label: 'Conversation', icon: '💬', count: 8, note: '8 turns · two speakers' },
  };

  /* EXAM has no flash-card verb category of its own. These verbs are taken
     directly from its interview sentences and reading passages. */
  const EXAM_VERBS = {
    vivir: 'to live', practicar: 'to practise', considerar: 'to consider',
    aprender: 'to learn', ayudar: 'to help', formar: 'to form / become part of',
    demostrar: 'to demonstrate', comprender: 'to understand', recordar: 'to remember',
    respetar: 'to respect', participar: 'to participate', preparar: 'to prepare',
  };

  function cleanTopic(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function quoted(topic) { return `«${topic}»`; }

  function levelVerbMap(level) {
    const map = new Map();
    const cards = (DATA[level] && DATA[level].flashcards) || [];
    cards.forEach(card => {
      if (card.cardType === 'verb' && card.verbEs && !map.has(card.verbEs)) {
        map.set(card.verbEs, card.verbEn || card.en || 'level verb');
      }
    });
    if (level === 'EXAM') {
      Object.keys(EXAM_VERBS).forEach(es => map.set(es, EXAM_VERBS[es]));
    }
    return map;
  }

  function makeLine(verb, answer, text, speaker) {
    return { verb, answer, text, speaker: speaker || '', en: '' };
  }

  /* Each line has exactly one marked target. Other familiar verbs may appear
     naturally around it, but the marked form is the one used by the game. */
  function poolsFor(level, topic) {
    const t = quoted(topic);
    const pools = {
      A1: {
        narrative: [
          makeLine('querer', 'quiero', `Hoy ${MARK} hablar de ${t}.`),
          makeLine('hablar', 'hablo', `${MARK} de ${t} con mi familia.`),
          makeLine('ver', 'veo', `Cuando ${MARK} algo sobre ${t}, presto atención.`),
          makeLine('entender', 'entiendo', `Con un buen ejemplo, ${MARK} mejor ${t}.`),
          makeLine('aprender', 'aprendo', `Cada día ${MARK} algo nuevo sobre ${t}.`),
          makeLine('hacer', 'hago', `También ${MARK} una actividad relacionada con ${t}.`),
          makeLine('poder', 'puedo', `Con práctica, ${MARK} explicar una idea sobre ${t}.`),
          makeLine('necesitar', 'necesito', `Si tengo dudas, ${MARK} más ejemplos de ${t}.`),
          makeLine('tener', 'tengo', `${MARK} una pregunta importante sobre ${t}.`),
          makeLine('ir', 'voy', `Mañana ${MARK} a buscar información sobre ${t}.`),
          makeLine('gustar', 'me gusta', `${MARK} descubrir palabras nuevas con ${t}.`),
          makeLine('ayudar', 'ayudo', `A veces ${MARK} a un amigo a hablar de ${t}.`),
        ],
        conversation: [
          makeLine('querer', 'Quieres', `¿${MARK} hablar de ${t}?`, 'A'),
          makeLine('poder', 'puedo', `Sí, ${MARK} empezar con una idea sencilla.`, 'B'),
          makeLine('entender', 'Entiendes', `¿${MARK} por qué ${t} es interesante?`, 'A'),
          makeLine('aprender', 'Aprendo', `${MARK} algo nuevo cada vez que leo sobre el tema.`, 'B'),
          makeLine('ver', 'Ves', `¿${MARK} algún ejemplo de ${t} cerca de aquí?`, 'A'),
          makeLine('tener', 'Tengo', `${MARK} uno y te lo puedo mostrar.`, 'B'),
          makeLine('hacer', 'Hacemos', `¿${MARK} una lista de palabras importantes?`, 'A'),
          makeLine('hablar', 'hablamos', `Perfecto, y después ${MARK} otra vez de ${t}.`, 'B'),
        ],
      },
      A2: {
        narrative: [
          makeLine('decidir', 'decidí', `Ayer ${MARK} investigar ${t}.`),
          makeLine('buscar', 'busqué', `Primero ${MARK} información clara sobre ${t}.`),
          makeLine('leer', 'leí', `Después ${MARK} varios ejemplos relacionados con ${t}.`),
          makeLine('encontrar', 'encontré', `En uno de ellos ${MARK} una idea sorprendente sobre ${t}.`),
          makeLine('pensar', 'pensé', `Entonces ${MARK} con calma en ${t}.`),
          makeLine('escribir', 'escribí', `Más tarde ${MARK} un resumen breve de ${t}.`),
          makeLine('compartir', 'compartí', `También ${MARK} mis notas sobre ${t} con un amigo.`),
          makeLine('explicar', 'expliqué', `Al final le ${MARK} por qué ${t} me parecía interesante.`),
          makeLine('organizar', 'organicé', `Para no olvidar nada, ${MARK} las ideas principales de ${t}.`),
          makeLine('practicar', 'practiqué', `Luego ${MARK} cómo hablar de ${t} en español.`),
          makeLine('recordar', 'recordé', `Gracias a los ejemplos, ${MARK} los detalles de ${t}.`),
          makeLine('recomendar', 'recomendé', `Por último, ${MARK} una lectura sobre ${t}.`),
        ],
        conversation: [
          makeLine('buscar', 'Buscaste', `¿${MARK} información sobre ${t}?`, 'A'),
          makeLine('leer', 'leí', `Sí, ${MARK} varios ejemplos esta mañana.`, 'B'),
          makeLine('comprender', 'Comprendiste', `¿${MARK} las ideas principales del tema?`, 'A'),
          makeLine('preguntar', 'pregunté', `Casi todas; también ${MARK} lo que no estaba claro.`, 'B'),
          makeLine('responder', 'respondieron', `¿Y qué te ${MARK} sobre ${t}?`, 'A'),
          makeLine('recomendar', 'recomendaron', `Me ${MARK} comparar dos puntos de vista.`, 'B'),
          makeLine('escribir', 'escribiste', `Entonces, ¿${MARK} un resumen?`, 'A'),
          makeLine('compartir', 'compartiré', `Sí, y mañana lo ${MARK} contigo.`, 'B'),
        ],
      },
      B1: {
        narrative: [
          makeLine('considerar', 'considero', `Cuando ${MARK} ${t}, intento observar el contexto completo.`),
          makeLine('comprobar', 'compruebo', `Primero ${MARK} los datos relacionados con ${t}.`),
          makeLine('imaginar', 'imagino', `Luego ${MARK} cómo cambiaría ${t} desde otra perspectiva.`),
          makeLine('reconocer', 'reconozco', `También ${MARK} que ${t} puede provocar opiniones distintas.`),
          makeLine('demostrar', 'demuestra', `Un ejemplo concreto ${MARK} la complejidad de ${t}.`),
          makeLine('dudar', 'dudo', `A veces ${MARK} de las explicaciones más simples de ${t}.`),
          makeLine('admitir', 'admito', `Sin embargo, ${MARK} que todavía tengo preguntas sobre ${t}.`),
          makeLine('garantizar', 'garantiza', `Ninguna fuente ${MARK} una respuesta definitiva sobre ${t}.`),
          makeLine('limitar', 'limita', `Una perspectiva demasiado estrecha ${MARK} el debate sobre ${t}.`),
          makeLine('permitir', 'permite', `Una conversación abierta ${MARK} comprender mejor ${t}.`),
          makeLine('convencer', 'convence', `Al final, un argumento bien explicado ${MARK} más que una opinión sobre ${t}.`),
          makeLine('preferir', 'prefiero', `Por eso ${MARK} seguir investigando ${t} antes de decidir.`),
        ],
        conversation: [
          makeLine('considerar', 'consideras', `¿Qué ${MARK} más importante de ${t}?`, 'A'),
          makeLine('imaginar', 'imagino', `${MARK} que depende mucho del contexto.`, 'B'),
          makeLine('comprobar', 'comprobaste', `¿${MARK} los datos antes de llegar a esa conclusión?`, 'A'),
          makeLine('reconocer', 'reconozco', `Sí, aunque ${MARK} que faltan algunos detalles.`, 'B'),
          makeLine('dudar', 'dudas', `Entonces, ¿todavía ${MARK} de la explicación sobre ${t}?`, 'A'),
          makeLine('demostrar', 'demuestra', `Un caso reciente ${MARK} que el asunto es complejo.`, 'B'),
          makeLine('admitir', 'admito', `${MARK} que ese ejemplo cambia mi opinión.`, 'A'),
          makeLine('preferir', 'prefiero', `Yo ${MARK} investigar un poco más antes de concluir.`, 'B'),
        ],
      },
      B2: {
        narrative: [
          makeLine('evaluar', 'evalúo', `Cuando ${MARK} ${t}, distingo primero los hechos de las opiniones.`),
          makeLine('cuestionar', 'cuestiono', `A continuación, ${MARK} los supuestos habituales sobre ${t}.`),
          makeLine('reflexionar', 'reflexiono', `También ${MARK} sobre las consecuencias de ${t} a largo plazo.`),
          makeLine('determinar', 'determino', `Con esa información, ${MARK} qué aspectos de ${t} requieren más atención.`),
          makeLine('establecer', 'establezco', `Después ${MARK} criterios claros para analizar ${t}.`),
          makeLine('implementar', 'implemento', `Si la evidencia lo permite, ${MARK} una estrategia relacionada con ${t}.`),
          makeLine('promover', 'promuevo', `Al mismo tiempo, ${MARK} un diálogo informado sobre ${t}.`),
          makeLine('preservar', 'preservo', `Durante el debate, ${MARK} los matices esenciales de ${t}.`),
          makeLine('recuperar', 'recupero', `Cuando surge una contradicción, ${MARK} el argumento central sobre ${t}.`),
          makeLine('facilitar', 'facilita', `Una estructura rigurosa ${MARK} la comprensión de ${t}.`),
          makeLine('impedir', 'impide', `La falta de evidencia ${MARK} llegar a una conclusión firme sobre ${t}.`),
          makeLine('superar', 'superamos', `Con análisis y diálogo, ${MARK} las explicaciones superficiales de ${t}.`),
        ],
        conversation: [
          makeLine('evaluar', 'evalúas', `¿Cómo ${MARK} el impacto de ${t}?`, 'A'),
          makeLine('cuestionar', 'cuestiono', `Primero ${MARK} las premisas del argumento.`, 'B'),
          makeLine('determinar', 'determinas', `¿Y cómo ${MARK} qué evidencia es relevante?`, 'A'),
          makeLine('establecer', 'establezco', `${MARK} varios criterios antes de compararla.`, 'B'),
          makeLine('promover', 'promueve', `¿Crees que este enfoque ${MARK} un debate más útil?`, 'A'),
          makeLine('facilitar', 'facilita', `Sí, porque ${MARK} una lectura crítica de ${t}.`, 'B'),
          makeLine('impedir', 'impide', `¿Qué ${MARK} llegar a una conclusión definitiva?`, 'A'),
          makeLine('perseverar', 'perseveramos', `La incertidumbre; aun así, ${MARK} en el análisis.`, 'B'),
        ],
      },
      EXAM: {
        narrative: [
          makeLine('practicar', 'practico', `Para el examen, ${MARK} una respuesta sobre ${t}.`),
          makeLine('considerar', 'considero', `Primero ${MARK} los hechos principales relacionados con ${t}.`),
          makeLine('recordar', 'recuerdo', `Después ${MARK} las fechas y los nombres importantes de ${t}.`),
          makeLine('comprender', 'comprendo', `Con una lectura atenta, ${MARK} por qué ${t} es relevante.`),
          makeLine('aprender', 'aprendo', `Con cada ejemplo ${MARK} algo nuevo sobre ${t}.`),
          makeLine('ayudar', 'ayudo', `Si un compañero tiene dudas, lo ${MARK} a repasar ${t}.`),
          makeLine('respetar', 'respeto', `En mi respuesta ${MARK} los distintos puntos de vista sobre ${t}.`),
          makeLine('demostrar', 'demostrar', `Así puedo ${MARK} lo que sé acerca de ${t}.`),
          makeLine('participar', 'participar', `También quiero ${MARK} en una conversación sobre ${t}.`),
          makeLine('preparar', 'preparo', `Antes de la entrevista, ${MARK} otro ejemplo de ${t}.`),
          makeLine('vivir', 'vivo', `Cuando explico dónde ${MARK}, relaciono mi experiencia con ${t}.`),
          makeLine('formar', 'formar', `Mi objetivo es ${MARK} una opinión clara sobre ${t}.`),
        ],
        conversation: [
          makeLine('preparar', 'preparas', `¿Cómo ${MARK} una respuesta sobre ${t}?`, 'Entrevistador'),
          makeLine('practicar', 'Practico', `${MARK} con ejemplos claros y frases completas.`, 'Tú'),
          makeLine('comprender', 'Comprendes', `¿${MARK} por qué este tema es importante?`, 'Entrevistador'),
          makeLine('recordar', 'recuerdo', `Sí, y también ${MARK} los datos principales.`, 'Tú'),
          makeLine('considerar', 'consideras', `¿Qué ${MARK} más relevante de ${t}?`, 'Entrevistador'),
          makeLine('respetar', 'respeto', `En primer lugar, ${MARK} las distintas perspectivas.`, 'Tú'),
          makeLine('demostrar', 'demostrarás', `¿Cómo ${MARK} lo que has aprendido?`, 'Entrevistador'),
          makeLine('participar', 'participaré', `${MARK} con una respuesta ordenada y precisa.`, 'Tú'),
        ],
      },
    };
    return pools[level] || pools.A1;
  }

  function orderedSample(lines, count) {
    if (lines.length <= count) return lines.slice();
    /* Keep the opening line so every text introduces the topic, then vary the
       remaining details without scrambling their narrative order. */
    const picked = shuffle(lines.slice(1).map((line, index) => ({ line, index })))
      .slice(0, count - 1)
      .sort((a, b) => a.index - b.index)
      .map(item => item.line);
    return [lines[0]].concat(picked);
  }

  function generateTopicText(topicValue, modeValue, levelValue) {
    const topic = cleanTopic(topicValue);
    const mode = MODE_META[modeValue] ? modeValue : 'short';
    const level = DATA[levelValue] ? levelValue : 'A1';
    if (!topic) throw new Error('Please enter a topic first.');

    const map = levelVerbMap(level);
    const pools = poolsFor(level, topic);
    const source = mode === 'conversation' ? pools.conversation : pools.narrative;
    const valid = source.filter(line => map.has(line.verb) && line.text.split(MARK).length === 2);
    const count = MODE_META[mode].count;
    if (valid.length < count) throw new Error(`Not enough ${level} verbs are available for this text.`);

    const lines = mode === 'conversation' ? valid.slice(0, count) : orderedSample(valid, count);
    lines.forEach(line => { line.en = map.get(line.verb); });
    const plainText = lines.map(line => {
      const sentence = line.text.replace(MARK, line.answer);
      return line.speaker ? `${line.speaker}: ${sentence}` : sentence;
    }).join(mode === 'conversation' ? '\n' : ' ');

    return { topic, mode, level, lines, plainText, meta: MODE_META[mode] };
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
        <p class="muted small">Highlighted forms come from the <b>${esc(passage.level)}</b> verb bank. Read the whole text aloud, then practise each one.</p>
        ${passageHTML(passage, -1)}
        <div class="topic-verb-shelf" aria-label="Target verbs">
          ${unique.map(line => `<span class="topic-verb-chip"><b>${esc(line.answer)}</b><small>${esc(line.verb)} · ${esc(line.en)}</small></span>`).join('')}
        </div>
        <div class="topic-actions">
          <button class="btn big" id="topicPractice" type="button">Practise ${passage.lines.length} verbs →</button>
          <button class="btn ghost" id="topicListen" type="button">🔊 Listen</button>
          ${passage.mode === 'conversation' ? '' : '<button class="btn ghost" id="topicAgain" type="button">↻ New version</button>'}
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
            <div class="topic-hint"><b>${esc(line.verb)}</b><span>${esc(line.en)}</span><button class="btn ghost mini" id="topicHearLine" type="button">🔊 Hear line</button></div>
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
    availableVerbs(level) { return Array.from(levelVerbMap(level).keys()); },
    modes: MODE_META,
    marker: MARK,
  };
})();
