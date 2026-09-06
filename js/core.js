'use strict';
/* ---------- tiny helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('spanlab.' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('spanlab.' + key, JSON.stringify(value)); } catch {}
  },
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, n); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------- normalization & similarity ---------- */
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()"'´`\/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const A = norm(a).split(' ').filter(Boolean);
  const B = norm(b).split(' ').filter(Boolean);
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  const m = A.length, n = B.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

/* translation may have variants: "lunch / food", "to be (permanent)" */
function meaningParts(en) {
  return String(en).replace(/\(.*?\)/g, ' ').split('/').map(s => s.trim()).filter(Boolean);
}

/* articles don't count in typed Spanish answers */
function stripArticles(s) {
  return norm(s).replace(/^(el|la|los|las|un|una) /, '').trim();
}

/* ---------- text-to-speech ---------- */
let _esVoice = null;
function pickEsVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('es'));
  if (!vs.length) return;
  _esVoice =
    vs.find(v => /es[-_](es|mx|ar|co)/i.test(v.lang)) ||
    vs.find(v => /es[-_]es/i.test(v.lang)) ||
    vs[0];
}
if ('speechSynthesis' in window) {
  pickEsVoice();
  speechSynthesis.onvoiceschanged = pickEsVoice;
}

function say(text, rate = 0.95) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) { resolve(null); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = rate;
    if (_esVoice) u.voice = _esVoice;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(null); } };
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
    // safety net: some engines never fire onend
    setTimeout(finish, 2500 + text.length * 220);
  });
}

/* ---------- speech recognition (optional, Chrome/Edge) ---------- */
function makeRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  try {
    const r = new SR();
    r.lang = 'es-ES';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 5;
    return r;
  } catch { return null; }
}

/* ---------- game registry & per-game cleanup ---------- */
const GAMES = [];
function registerGame(def) { GAMES.push(def); }

let _cleanup = null;
function setCleanup(fn) { _cleanup = fn; }
function runCleanup() {
  if (_cleanup) { const f = _cleanup; _cleanup = null; try { f(); } catch {} }
  if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch {} }
}

/* ---------- shared UI bits ---------- */
function barHTML(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="bar" aria-hidden="true"><div class="bar-fill" style="width:${pct}%"></div></div>`;
}
function backBtn() { return `<a class="btn ghost" href="#/">← Games</a>`; }
