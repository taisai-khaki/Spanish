# 🇪🇸 Spanish Game Lab

Three browser games for learning Spanish fast — zero install, no accounts, no build step.
Progress is saved in your browser (localStorage).

## The rule (from naturalizacion.mx)

**Regular items:** 5 correct in a row learns and retires the item; one wrong answer resets its streak.
**A2 verb variations:** each verb has 66 linked sentence builders (11 magic frames × 6 person forms). A sentence counts after one correct answer, and the verb is learned only when all 66 are complete. Wrong answers stay in the queue.
Queues contain only items that are not yet learned.

## Endless rounds

There is **no fixed round length and no end screen**. A game keeps serving questions —
refilling from everything you have not learned yet, then from the whole level for free
practice once it is all locked in — and it only stops when you go back to the games page
(or close the tab). The header scoreboard tracks the whole session live:

- **N correct** · **N to review** · **N answered**, with an accuracy bar
- 🎯 accuracy · 🔥 racha (combo) · ⭐ session XP · 🔒 items locked in · 📚 items left in the level

XP is banked every 10 answers and whenever you leave the game, so a long session is never lost.

## The games

| Game | Skill | Formats |
| --- | --- | --- |
| 📐 **Grammar Judge** | Grammar | ¿cuál es correcta? · spot the mistake (covering all Word Order grammar rules across A1–B2) |
| 🧩 **Word Order** | Grammar in context | build the sentence from shuffled words (with rich tense, subject, and similar-word distractors) |
| 🃏 **Level Flashcards** | Verbs (Tenses & Combinations) + Nouns | flippable flashcards & active check for all level verbs across Presente, Pretérito, Imperfecto, Futuro, Condicional, and Combinations + all nouns in the level |
| 📚 **200 Verbs & Glue Words** | The A2 handouts, drilled | **7,076 cards** (3,538 per direction, ES→EN and EN→ES): the 11 magic-verb combinations for every verb (first person), the full presente + pretérito of all 85 irregular verbs (5 persons each), infinitive + yo forms for the 105 regular verbs, and all 214 glue words. Filters by group, direction, and a verb search box |

Every game runs as one endless session — press **← Games** to end it.

## Content

**21,440 game items across A1–B2** — 14,364 as before (including 12,540 tagged A2 verb-variation sentences) plus the new 7,076-card handout deck. The EXAM level is a separate track:

- **A1 (76 items):** 42 words · 12 sentences · 6 grammar rules · conversations: taxi, taquería
- **A2 (20,250 items):** the 7,076-card **200 Verbs & Glue Words** deck (see below), plus the 13,174 A2 items: 439 vocabulary cards including all 190 unique verb lemmas from the handouts, 11 magic-verb frames, and 214 glue-word cards · 92 curated sentence builders plus 12,540 tagged verb variations (66 per verb: 11 frames × 6 person forms, one correct answer per sentence) · 59 grammar questions · 3 conversations (28 dialogue lines).
- **B1 (887 items — the main stage, default level, full B1 course):** 545 words across 27 categories (clothes, body, weather, home, food, housework, appearance, personality, feelings, city & transport, work, shopping, time, education, nature, daily life, communication, idioms, formal register, bureaucracy…) · 180 sentences (subjunctive, relatives, past unreal conditionals, clitics, everyday domains) · 45 grammar rules (the complete B1 map: pluperfect, clitics, ser/estar, reported speech, subjunctive triggers) · 12 real conversations: your boss, the job interview, the restaurant complaint, the bank errand, the market, the pharmacy, the phone call, café small talk, asking directions, the store warranty claim, planning a trip, describing a photo
- **B2 (209 items — a step ahead):** 115 words (sophisticated idioms, discourse connectives, society, psychology, economy, medicine, law) · 50 advanced sentences (conditional perfect, reported speech, formal subjunctive, generalizations) · 18 grammar rules · 2 conversations: the university thesis, the lawyer's office
- **EXAM (938 items, separate track):** 196 words · 16 sentences · 9 grammar rules · 8 dialogue lines · 10 interview questions · 16 passages (96 questions) · 683 bank questions
- **The fun layer:** XP, an evolving bird (🥚→🦜 Pico el Perico), daily streak, 3 daily quests (incl. one EXAM quest), **racha combos** (3 in a row = +10 XP, in every game), 17 badges, confetti, stamps, synthesized sound effects, and Pico giving tips from the setup screens.

### The 200-verb handout deck (📚 200 Verbs & Glue Words)

The two numbered handout lists (rows 1–100 and 101–200 → **190 unique lemmas**, 10 repeats: pedir, contar, hacer, tomar, ganar, esperar, conocer, mirar, pasar, usar) become a 7,076-card deck — every card in both directions:

| Group | What each card drills | Cards per direction |
| --- | --- | --- |
| ✨ Magic combos | the 11 magic frames in the first person (`Necesito comer`, `Tengo que comer`, `Me gustaría comer`…) for all 190 verbs | 2,090 |
| Regular verbs (105) | infinitive + yo presente + yo pretérito | 315 |
| Irregular verbs (85) | infinitive + all 5 presente + all 5 pretérito persons | 919 |
| 🧷 Glue words | all 214 pronouns, possessives, question words, demonstratives, location/time, adverbs, quantity, comparisons, prepositions, conjunctions | 214 |
| | **per direction** | **3,538** |
| | **total (ES→EN + EN→ES)** | **7,076** |

A verb counts as irregular when it is anything other than a plain ending swap — stem changes (e→ie, o→ue, e→i, u→ue), irregular yo forms (salgo, conozco, sigo), strong preterites (tuve, hice, dije), and the yo spelling changes (llegué, busqué, pagué, crucé, empecé) plus accent-shifting `continúo` / `guío`; that is 85 of the 190 (the handout itself shades 22 in the first 100). `llover` and `nevar` are impersonal and only get 3rd-person cards. The infinitive card always shows the whole paradigm on the back, and reflexive verbs keep the clitic with the person (`me baño`, `Necesito bañarme`).

Conjugation is generated by `js/data-verbs200.js` (self-contained: presente + pretérito for all five persons). The pretérito of handout rows 1–100 is regression-tested against the author's own answer key, extracted from `Spanish_Verb_Trainer.pdf` into `test/fixtures/trainer-pret-100.json`.

## Run it

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

- All speech audio is your browser's built-in Spanish TTS.
- Tests: `node test/smoke.js`, `node test/a2-verb-practice.js`, `node test/verb-cards.js`, `node test/round-selection.js`, and `node test/endless-session.js`.

## Content files

- [`js/data.js`](js/data.js) — A1/A2/B1/B2 vocabulary, curated sentences, grammar, and dialogues (1,790 base items).
- [`js/data-sentences.js`](js/data-sentences.js) — builds tagged A2 verb practice: 190 verbs × 11 frames × 6 person forms = 12,540 sentences. Add a `verbs` list to B1 or B2 later to use the same generator there.
- [`js/data-verbs200.js`](js/data-verbs200.js) — the 200 handout rows, irregular classification, the presente/pretérito conjugation engine, the magic frames and the 214 glue words → the 7,076-card deck in `DATA.A2.verbCards`.
- [`js/data-exam.js`](js/data-exam.js) — EXAM words, grammar, the consulate dialogue, and reading passages.
- [`js/data-bank.js`](js/data-bank.js) — the real 683-question bank (generated from `naturalizacion.mx/data/questions.json`).

Regular items use 5/5 mastery. Each tagged verb sentence counts after one correct answer; its verb is learned when all linked sentences are complete.

### A2 reference PDFs

The A2 verb audit includes all **190 distinct Spanish lemmas** in the two numbered 100-verb lists (200 rows, with repeated lemmas de-duplicated) and all **11 magic-verb frames**. The glue-word deck has **214 cards** across pronouns, possessives, question words, demonstratives, location/time, adverbs, quantity, comparisons, prepositions, and conjunctions. The tagged verb variations use explicit IDs so the app can track completion sentence by sentence:

- [`Spanish_Verb_Trainer.pdf`](Spanish_Verb_Trainer.pdf) — *100 Verbs + 11 Magic Verbs + Simple Past*, by Peter McCaslin / Fast Conversational Spanish, LLC (its simple-past answer key is the test fixture for rows 1–100 of the new deck).
- [`30DAY_-_DAY_10_-_VERBS_100_MAGIC_VERBS.pdf`](30DAY_-_DAY_10_-_VERBS_100_MAGIC_VERBS.pdf) and [`100 verbs.pdf`](100%20verbs.pdf) — 100-verb handout (these two uploads are identical copies).
- [`30DAY_-_DAY_11_-_VERBS_200_MAGIC_VERBS.pdf`](30DAY_-_DAY_11_-_VERBS_200_MAGIC_VERBS.pdf) — the next 100 verbs, numbered 101–200.
- [`f639fbd0-06e1-480a-956a-a9749f4fd849.pdf`](f639fbd0-06e1-480a-956a-a9749f4fd849.pdf) — **Glue Words**, a sentence-builder reference for possessives, demonstratives, location/time words, adverbs, quantities, comparisons, prepositions, and conjunctions.

The expansion adds **37 sentence builders**, **21 grammar checks**, and a **10-line meal-planning dialogue**. Each magic frame has at least two sentence-builder examples plus a grammar quiz. The full 62-page Glue Words PDF also contains higher-level subjunctive and prefix/suffix material, and some questionable examples, so this is a checked, A2-level selection rather than a line-by-line transcription.

> The app **starts on B1** (the lab's default level). A1 is a warm-up; A2 is the conversational bridge. Switch pills whenever you want to choose your level.

## 15-minute daily routine

Rounds are endless now — play each game until the scoreboard feels good, then head back.

1. 👂 Oído Sharp — words, phrases, and conversation lines at native speed
2. 🧩 Word Order — build sentences until you want to stop
3. 📐 Grammar Judge — drill rules until you want to stop
4. 📖 Lectura — one passage, 6/6

### 🇲🇽 Exam-week routine (EXAM level)

1. 📖 Lectura — one passage, 6/6
2. 👂 Oído Sharp — exam words, phrases, and consulate lines at native speed
3. 🧩 Word Order — exam interview phrases
4. 📐 Grammar Judge — exam grammar rules
