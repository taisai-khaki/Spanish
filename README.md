# 🇪🇸 Spanish Game Lab

Ten browser games for learning Spanish fast — zero install, no accounts, no build step.
Progress is saved in your browser (localStorage).

## The rule (from naturalizacion.mx)

**Regular items:** 5 correct in a row learns and retires the item; one wrong answer resets its streak.
**A2 verb variations:** each verb has 66 linked sentence builders (11 magic frames × 6 person forms). A sentence counts after one correct answer, and the verb is learned only when all 66 are complete. Wrong answers stay in the queue.
Queues contain only items that are not yet learned.

## 🇲🇽 Exam coverage (EXAM level)

The **EXAM · Naturalización** level covers the real Mexican naturalization exam
(materials synced from [`naturalizacion.mx`](http://naturalizacion.mx)):

| Exam part | Game | What's in it |
| --- | --- | --- |
| **Entrevista** (the conversation part) | 🎙️ **La Entrevista** | The **10 real interview questions**, each with the official tip, a model answer, and keyword scoring of YOUR answer — practiced by ear, out loud (mic), and in writing, 5 rounds each in rotating formats |
| **Lectura** | 📖 **Lectura** | The **16 real exam passages** (6 questions each, 96 total) — first read, then the same passage comes back **audio-only at native speed**; 6/6 five times = locked |
| **Historia / Cultura / Cívica** | 🗂️ **Repaso** | The **full real bank of 683 questions** — pick the right answer or spot the mistake, 5/5 to retire each question |
| **Exam vocabulary** | 🃏 🎤 👂 ⚡ | **196 exam words** (people, dates, places, culture, food, civics, concepts) flow through Vocab Smash, Prono Repeat, Oído Sharp, Word Race — plus 16 interview phrases (Word Order) and 9 exam grammar rules (Grammar Judge) |
| **Exam conversation** | 🎬 **Plática** | "La cita en el consulado" — the exam paperwork conversation at native speed |

Exam badges: 🎙️ all 10 interview questions · 📖 all 16 passages · 🇲🇽 75%+ of the EXAM level.

## The games

| Game | Skill | Formats (rotating) |
| --- | --- | --- |
| 🎬 **Plática** | Real conversations | keyword-catch at native speed · reply out loud (mic) · pick your reply · fill the gap |
| 🎤 **Prono Repeat** | Speaking & pronunciation | say the phrase/line out loud; mic scores 0–100% |
| 🃏 **Vocab Smash** | Vocabulary | write the meaning · write it in Spanish · listen & pick · pick the word |
| 🧩 **Word Order** | Grammar in context | build the sentence · type it · listen & pick · fill the gap |
| 📐 **Grammar Judge** | Grammar | ¿cuál es correcta? · spot the mistake (with one-line fixes) |
| 👂 **Oído Sharp** | Fast listening | native-speed meaning pick · **keyword catch** on conversation lines |
| ⚡ **Word Race** | Speed recall | 30-second typing sprint on unlearned words, streak multipliers |
| 🎙️ **La Entrevista** | The exam conversation | catch the question by ear · **answer out loud** (keyword-scored) · answer in writing — 5 rounds per question |
| 📖 **Lectura** | Exam reading | read & answer 6 questions · the same passage comes back **listen-only** |
| 🗂️ **Repaso** | Exam bank (683) | which is correct · spot the mistake |

## Content

**14,330 game items across A1–B2** (including 12,540 tagged A2 verb-variation sentences; the EXAM level is a separate track):

- **A1 (76 items):** 42 words · 12 sentences · 6 grammar rules · conversations: taxi, taquería
- **A2 (13,158 items):** 439 vocabulary cards including all 190 unique verb lemmas from the handouts, 11 magic-verb frames, and 214 glue-word cards · 92 curated sentence builders plus 12,540 tagged verb variations (66 per verb: 11 frames × 6 person forms, one correct answer per sentence) · 59 grammar questions · 3 conversations (28 dialogue lines).
- **B1 (887 items — the main stage, default level, full B1 course):** 545 words across 27 categories (clothes, body, weather, home, food, housework, appearance, personality, feelings, city & transport, work, shopping, time, education, nature, daily life, communication, idioms, formal register, bureaucracy…) · 180 sentences (subjunctive, relatives, past unreal conditionals, clitics, everyday domains) · 45 grammar rules (the complete B1 map: pluperfect, clitics, ser/estar, reported speech, subjunctive triggers) · 12 real conversations: your boss, the job interview, the restaurant complaint, the bank errand, the market, the pharmacy, the phone call, café small talk, asking directions, the store warranty claim, planning a trip, describing a photo
- **B2 (209 items — a step ahead):** 115 words (sophisticated idioms, discourse connectives, society, psychology, economy, medicine, law) · 50 advanced sentences (conditional perfect, reported speech, formal subjunctive, generalizations) · 18 grammar rules · 2 conversations: the university thesis, the lawyer's office
- **EXAM (938 items, separate track):** 196 words · 16 sentences · 9 grammar rules · 8 dialogue lines · 10 interview questions · 16 passages (96 questions) · 683 bank questions
- **The fun layer:** XP, an evolving bird (🥚→🦜 Pico el Perico), daily streak, 3 daily quests (incl. one EXAM quest), **racha combos** (3 in a row = +10 XP, in every game), 17 badges, confetti, stamps, synthesized sound effects, and Pico giving tips from the setup screens.

## Run it

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

- **Mic** (speaking + scoring) needs a secure context and works best in **Chrome or Edge**; other browsers fall back to self-rating / reply-picking.
- All speech audio is your browser's built-in Spanish TTS.
- Focused tests: `node test/a2-verb-practice.js` and `node test/round-selection.js`. The legacy `node test/smoke.js` currently has a stale EXAM interview-data expectation.

## Content files

- [`js/data.js`](js/data.js) — A1/A2/B1/B2 vocabulary, curated sentences, grammar, and dialogues (1,790 base items).
- [`js/data-sentences.js`](js/data-sentences.js) — builds tagged A2 verb practice: 190 verbs × 11 frames × 6 person forms = 12,540 sentences. Add a `verbs` list to B1 or B2 later to use the same generator there.
- [`js/data-exam.js`](js/data-exam.js) — EXAM words, grammar, the consulate dialogue, and reading passages.
- [`js/data-bank.js`](js/data-bank.js) — the real 683-question bank (generated from `naturalizacion.mx/data/questions.json`).

Regular items use 5/5 mastery. Each tagged verb sentence counts after one correct answer; its verb is learned when all linked sentences are complete.

### A2 reference PDFs

The A2 verb audit includes all **190 distinct Spanish lemmas** in the two numbered 100-verb lists (200 rows, with repeated lemmas de-duplicated) and all **11 magic-verb frames**. The glue-word deck has **214 cards** across pronouns, possessives, question words, demonstratives, location/time, adverbs, quantity, comparisons, prepositions, and conjunctions. The tagged verb variations use explicit IDs so the app can track completion sentence by sentence:

- [`Spanish_Verb_Trainer.pdf`](Spanish_Verb_Trainer.pdf) — *100 Verbs + 11 Magic Verbs + Simple Past*, by Peter McCaslin / Fast Conversational Spanish, LLC.
- [`30DAY_-_DAY_10_-_VERBS_100_MAGIC_VERBS.pdf`](30DAY_-_DAY_10_-_VERBS_100_MAGIC_VERBS.pdf) and [`100 verbs.pdf`](100%20verbs.pdf) — 100-verb handout (these two uploads are identical copies).
- [`30DAY_-_DAY_11_-_VERBS_200_MAGIC_VERBS.pdf`](30DAY_-_DAY_11_-_VERBS_200_MAGIC_VERBS.pdf) — the next 100 verbs, numbered 101–200.
- [`f639fbd0-06e1-480a-956a-a9749f4fd849.pdf`](f639fbd0-06e1-480a-956a-a9749f4fd849.pdf) — **Glue Words**, a sentence-builder reference for possessives, demonstratives, location/time words, adverbs, quantities, comparisons, prepositions, and conjunctions.

The expansion adds **37 sentence builders**, **21 grammar checks**, and a **10-line meal-planning dialogue**. Each magic frame has at least two sentence-builder examples plus a grammar quiz. The full 62-page Glue Words PDF also contains higher-level subjunctive and prefix/suffix material, and some questionable examples, so this is a checked, A2-level selection rather than a line-by-line transcription.

> The app **starts on B1** (the lab's default level). A1 is a warm-up; A2 is the conversational bridge. Switch pills whenever you want to choose your level.

## 15-minute daily routine

1. 🎬 Plática — one full conversation
2. 🎤 Prono Repeat — 5 phrases, out loud
3. 🃏 Vocab Smash — 10 words
4. 🧩 Word Order — 5 sentences
5. 📐 Grammar Judge — 5 rules
6. 👂 Oído Sharp — one round (native speed)
7. ⚡ Word Race — 30 seconds

### 🇲🇽 Exam-week routine (EXAM level)

1. 🎙️ La Entrevista — the 10 interview questions, out loud
2. 📖 Lectura — one passage, 6/6
3. 🗂️ Repaso — 10 real bank questions
4. 🏛️ Plática — the consulate conversation
5. 👂 Oído Sharp — exam words at native speed
