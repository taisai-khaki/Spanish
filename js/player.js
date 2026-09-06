'use strict';
/* ============ Player: XP, levels, bird evolution, streaks, quests, badges ============ */

const RANKS = [
  { lv: 1, icon: '🥚', name: 'Huevo', note: 'An egg. Play games to hatch it.' },
  { lv: 2, icon: '🐣', name: 'Polluelo', note: 'It hatched! ¡Felicidades!' },
  { lv: 3, icon: '🐤', name: 'Pajarito', note: 'Little bird, big dreams.' },
  { lv: 4, icon: '🐥', name: 'Chirper', note: 'It is starting to sing.' },
  { lv: 5, icon: '🦆', name: 'Pato', note: 'Fully formed. Quack responsibly.' },
  { lv: 6, icon: '🦢', name: 'Cisne', note: 'Glowing. People will stare.' },
  { lv: 7, icon: '🦅', name: 'Águila', note: 'Serious talker now.' },
  { lv: 8, icon: '🦉', name: 'Búho', note: 'Wise. Probably.' },
  { lv: 9, icon: '🦩', name: 'Flamenco', note: 'Style and vocabulary.' },
  { lv: 10, icon: '🦜', name: 'Pico el Perico', note: 'MAX FORM: a parrot that repeats everything in Spanish.' },
];

const BADGES = [
  { id: 'first', icon: '🎯', name: '¡Empezó!', desc: 'Finish your first game' },
  { id: 'xp100', icon: '⭐', name: '100 XP', desc: 'Earn 100 total XP' },
  { id: 'xp500', icon: '🌟', name: '500 XP', desc: 'Earn 500 total XP' },
  { id: 'lock25', icon: '🔒', name: '25 locked in', desc: 'Master 25 items (5 correct in a row each)' },
  { id: 'lock75', icon: '🧠', name: '75 locked in', desc: 'Master 75 items' },
  { id: 'speak90', icon: '🎤', name: '¡Perfecto!', desc: 'Score 90%+ on a phrase' },
  { id: 'platica1', icon: '🎬', name: '¡Primera plática!', desc: 'Complete a full conversation (every line 5/5)' },
  { id: 'fastear', icon: '🏃', name: 'Fast ear', desc: 'Catch 10 keywords at native speed' },
  { id: 'listen10', icon: '👂', name: 'Oído de oro', desc: 'A perfect 10/10 listening round' },
  { id: 'race300', icon: '⚡', name: 'Rayo', desc: 'Score 300+ in Word Race' },
  { id: 'gram10', icon: '📐', name: 'Grammar crush', desc: 'Master 10 grammar rules' },
  { id: 'streak3', icon: '🔥', name: '3-day streak', desc: 'Play 3 days in a row' },
  { id: 'streak7', icon: '🌋', name: '7-day streak', desc: 'Play 7 days in a row' },
  { id: 'level5', icon: '🦆', name: 'Level 5', desc: 'Reach level 5 — your bird is fully formed' },
  { id: 'entrevista10', icon: '🎙️', name: '¡Lista para la entrevista!', desc: 'All 10 interview questions locked in (5/5 each)' },
  { id: 'lectura16', icon: '📖', name: 'Lector', desc: 'All 16 exam passages locked in (6/6, five times each)' },
  { id: 'ciudadano', icon: '🇲🇽', name: 'Ciudadano', desc: 'Lock in 75%+ of the EXAM level' },
];

const QUESTS = [
  { id: 'xp80', label: 'Earn 80 XP today', goal: 80, reward: 25 },
  { id: 'games3', label: 'Finish 3 games today', goal: 3, reward: 20 },
];

const MASCOT_LINES = [
  'Plática first. Real conversations, real people, real speed — that\'s the job. 🚕',
  'Five in a row and it\'s yours. We never drill what you already know. Promise.',
  'Can\'t catch fast Spanish? Oído Sharp has a keyword task for exactly that. Catch the word, then the meaning.',
  'Say it OUT LOUD, even when you mess up. Especially when you mess up. 🗣️',
  '¿Cómo estás? — Try saying that right now.',
  'Your mouth is a muscle — feed it daily. 🏋️',
  'Mistakes reset your streak of five. That\'s not a punishment, that\'s the price of admission.',
  'Pro tip: in Vocab Smash, say the answer before you type it. It counts double in real life.',
  '¡Vámonos! The taxi is not calling itself. 🚕',
  'Exam week? La Entrevista first — the 10 questions, out loud, like the real one. 🎙️',
  'In the exam they ask with "usted". Answer polite: podría, usted, por favor. 🇲🇽',
  'One passage a day, 6/6, and in two weeks you have read all 16 — five times. 📖',
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

const player = {
  data: null,
  sound: true,

  init() {
    this.data = store.get('player', {
      xpTotal: 0,
      level: 1,
      xp: 0,
      streak: 0,
      lastDay: '',
      badges: {},
      flags: {},
      daily: { date: '', xp: 0, games: 0, claimed: {} },
      gamesPlayed: 0,
    });
    this.sound = store.get('sound', true);
    const d = this.data;
    if (!d.flags) d.flags = {};
    if (d.daily.date !== todayStr()) {
      d.daily = { date: todayStr(), xp: 0, games: 0, claimed: {} };
      this.save();
    }
  },

  save() { store.set('player', this.data); },

  xpNext() { return 20 + this.data.level * 40; },
  rank() { return RANKS[Math.min(this.data.level, 10) - 1]; },

  flag(k) {
    this.data.flags[k] = true;
    this.save();
  },

  toggleSound() {
    this.sound = !this.sound;
    store.set('sound', this.sound);
    this.toast(this.sound ? 'Sound on 🔊' : 'Sound off 🔇', { icon: '🔊' });
  },

  award(xp, meta = {}) {
    if (xp <= 0) return;
    const d = this.data;
    if (d.lastDay !== todayStr()) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      d.streak = d.lastDay === y ? d.streak + 1 : 1;
      d.lastDay = todayStr();
    }
    d.daily.xp += xp;
    if (meta.game) d.daily.games += 1;
    d.xpTotal += xp;
    d.xp += xp;
    d.gamesPlayed += 1;
    let leveled = false;
    while (d.xp >= this.xpNext() && d.level < 10) {
      d.xp -= this.xpNext();
      d.level += 1;
      leveled = true;
    }
    if (d.level >= 10) d.xp = Math.min(d.xp, 0);
    this.save();
    fx.sfx('whoosh');
    this.toast(`+${xp} XP${meta.game ? ' · ' + meta.game : ''}`, { icon: '⭐' });
    this.checkQuests();
    this.checkBadges();
    if (leveled) fx.levelUp(d.level, this.rank().name, this.rank().icon);
  },

  checkQuests() {
    const d = this.data;
    for (const q of QUESTS) {
      if (d.daily.claimed[q.id]) continue;
      const prog = q.id === 'xp80' ? d.daily.xp : d.daily.games;
      if (prog >= q.goal) {
        d.daily.claimed[q.id] = true;
        this.save();
        fx.sfx('coin');
        fx.confetti(60);
        this.toast(`Quest done: ${q.label} (+${q.reward} XP)`, { icon: '🎁' });
        this.award(q.reward, { game: 'Quest bonus' });
      }
    }
  },

  checkBadges() {
    const d = this.data;
    const earned = [];
    const tryBadge = (id, cond) => { if (cond && !d.badges[id]) { d.badges[id] = true; earned.push(id); } };
    let totalLocked = 0, gramLocked = 0;
    let exam = null, interviewLocked = 0, readingLocked = 0;
    try {
      DATA.levels.forEach(lv => {
        totalLocked += engine.stats(lv).locked;
        gramLocked += engine.pool(lv, 'grammar').filter(g => engine.get(lv, 'grammar', g.id).streak >= MASTERED_AT).length;
      });
      if (DATA.EXAM) {
        exam = engine.stats('EXAM');
        interviewLocked = engine.pool('EXAM', 'interview').filter(g => engine.get('EXAM', 'interview', g.id).streak >= MASTERED_AT).length;
        readingLocked = engine.pool('EXAM', 'reading').filter(g => engine.get('EXAM', 'reading', g.id).streak >= MASTERED_AT).length;
      }
    } catch {}
    tryBadge('first', d.gamesPlayed >= 1);
    tryBadge('xp100', d.xpTotal >= 100);
    tryBadge('xp500', d.xpTotal >= 500);
    tryBadge('lock25', totalLocked >= 25);
    tryBadge('lock75', totalLocked >= 75);
    tryBadge('speak90', d.flags.speak90);
    tryBadge('platica1', d.flags.platica1);
    tryBadge('fastear', d.flags.fastear);
    tryBadge('listen10', d.flags.listen10);
    tryBadge('race300', d.flags.race300);
    tryBadge('gram10', gramLocked >= 10);
    tryBadge('streak3', d.streak >= 3);
    tryBadge('streak7', d.streak >= 7);
    tryBadge('level5', d.level >= 5);
    tryBadge('entrevista10', d.flags.entrevista10 || (interviewLocked >= 10));
    tryBadge('lectura16', d.flags.lectura16 || (readingLocked >= 16));
    tryBadge('ciudadano', !!exam && exam.total > 0 && exam.locked / exam.total >= 0.75);
    if (earned.length) {
      this.save();
      for (const id of earned) {
        const b = BADGES.find(x => x.id === id);
        if (!b) continue;
        fx.confetti(90);
        fx.sfx('coin');
        this.toast(`Badge unlocked: ${b.name}`, { icon: b.icon, cls: 'badge' });
      }
    }
  },

  toast(msg, opts = {}) {
    const host = document.getElementById('toasts');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (opts.cls || '');
    t.innerHTML = `<span class="toast-icon">${opts.icon || '✨'}</span><span>${msg}</span>`;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      t.classList.add('out');
      setTimeout(() => t.remove(), 350);
    }, 3800);
    while (host.children.length > 4) host.firstChild.remove();
  },
};
