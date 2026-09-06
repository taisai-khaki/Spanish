# 🇪🇸 Spanish Game Lab

Ten browser games for learning Spanish fast — zero install, no accounts, no build step.
Progress is saved in your browser (localStorage).

## The rule (from naturalizacion.mx)

**5 correct in a row = the item is learned and retired FOREVER.**
One wrong answer = the streak resets and the item comes back.
Queues **only ever contain items you haven't learned** — nothing you already know is ever drilled.
And every retry comes back in a **different exercise format** (write it → hear it → pick it → build it), so the five reps are five different reps.

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

- **A1 (128 items):** 82 words · 20 sentences · 10 grammar rules · conversations: taxi, taquería
- **A2 (86 items):** 56 words · 12 sentences · 10 grammar rules · conversation: the doctor
- **B1 (50 items):** 30 words · 6 sentences · 6 grammar rules · conversation: your boss
- **EXAM (938 items):** 196 words · 16 sentences · 9 grammar rules · 8 dialogue lines · 10 interview questions · 16 passages (96 questions) · 683 bank questions
- **The fun layer:** XP, an evolving bird (🥚→🦜 Pico el Perico), daily streak, daily quests, 17 badges, combos, confetti, stamps, synthesized sound effects.

## Run it

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

- **Mic** (speaking + scoring) needs a secure context and works best in **Chrome or Edge**; other browsers fall back to self-rating / reply-picking.
- All speech audio is your browser's built-in Spanish TTS.
- Tests: `node test/smoke.js` (boots the whole app in a sandbox and checks the mastery engine, content inventory, and every game at every level).

## Content lives in three files

- [`js/data.js`](js/data.js) — A1/A2/B1 words, sentences, grammar, dialogues.
- [`js/data-exam.js`](js/data-exam.js) — the EXAM level: exam words, interview phrases, exam grammar, the consulate dialogue, the 10 interview questions (with tips, model answers, keyword lists), and the 16 reading passages.
- [`js/data-bank.js`](js/data-bank.js) — the real 683-question bank (generated from `naturalizacion.mx/data/questions.json`).

Add entries to any of them and every game picks them up automatically — each new item joins the mastery pipeline (5/5 to lock in).

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
