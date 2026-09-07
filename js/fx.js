'use strict';
/* ============ FX: the juice layer — sound, confetti, stamps, floats, modals ============ */
const fx = (() => {
  let ctx = null, master = null;

  function ac() {
    if (window.player && !window.player.sound) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, opts = {}) {
    const c = ac();
    if (!c) return;
    const { t = 0, dur = 0.12, type = 'sine', vol = 1, slide = 0 } = opts;
    const o = c.createOscillator(), g = c.createGain();
    const now = c.currentTime + t;
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), now);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + dur + 0.06);
  }

  const SFX = {
    pop() { tone(500, { dur: 0.05, type: 'triangle', slide: 160, vol: 0.7 }); },
    tap() { tone(300, { dur: 0.04, type: 'triangle', vol: 0.5 }); },
    coin() { tone(880, { dur: 0.05, type: 'square', vol: 0.35 }); tone(1318, { t: 0.05, dur: 0.12, type: 'square', vol: 0.35 }); },
    correct() { tone(523, { dur: 0.09, vol: 0.8 }); tone(659, { t: 0.08, dur: 0.14, vol: 0.8 }); },
    perfect() { tone(523, { dur: 0.07, vol: 0.8 }); tone(659, { t: 0.06, dur: 0.07, vol: 0.8 }); tone(784, { t: 0.12, dur: 0.1, vol: 0.8 }); tone(1047, { t: 0.19, dur: 0.22, vol: 0.9 }); },
    wrong() { tone(196, { dur: 0.16, type: 'square', vol: 0.4 }); tone(147, { t: 0.11, dur: 0.22, type: 'square', vol: 0.4 }); },
    tick() { tone(950, { dur: 0.03, type: 'square', vol: 0.22 }); },
    combo(n) { const f = 420 * Math.pow(1.059, Math.min(n || 2, 14)); tone(f, { dur: 0.06, type: 'triangle', vol: 0.7 }); tone(f * 1.26, { t: 0.055, dur: 0.09, type: 'triangle', vol: 0.7 }); },
    whoosh() { tone(240, { dur: 0.18, type: 'sine', vol: 0.5, slide: 620 }); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { t: i * 0.11, dur: i === 3 ? 0.4 : 0.12, vol: 0.85 })); },
  };

  /* ---------- confetti ---------- */
  let cv = null, parts = [], raf = null;
  function canvas() {
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'confetti';
      document.body.appendChild(cv);
      const rs = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
      rs();
      window.addEventListener('resize', rs);
    }
    return cv;
  }
  function confetti(n = 120, opts = {}) {
    const c = canvas();
    const colors = opts.colors || ['#E2572B', '#F2B23E', '#177E6E', '#7B4FD8', '#E0447C', '#3D9BE9'];
    for (let i = 0; i < n; i++) {
      parts.push({
        x: opts.x != null ? opts.x : window.innerWidth / 2,
        y: opts.y != null ? opts.y : window.innerHeight * 0.35,
        vx: (Math.random() - 0.5) * (opts.spread || 12),
        vy: -(Math.random() * 7 + 4),
        g: 0.18 + Math.random() * 0.1,
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        life: 130 + Math.random() * 60,
      });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    const c = canvas(), d = c.getContext('2d');
    d.clearRect(0, 0, c.width, c.height);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr; p.life--;
      d.save();
      d.translate(p.x, p.y);
      d.rotate(p.rot);
      d.globalAlpha = Math.min(1, p.life / 40);
      d.fillStyle = p.color;
      d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      d.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = null; d.clearRect(0, 0, c.width, c.height); }
  }

  /* ---------- text juice ---------- */
  function floatText(anchor, text, cls = '') {
    const host = anchor && anchor.getBoundingClientRect ? anchor : document.body;
    const r = host.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float-text ' + cls;
    f.textContent = text;
    f.style.left = (r.left + r.width / 2) + 'px';
    f.style.top = (r.top + r.height / 3) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }

  function stamp(text) {
    const s = document.createElement('div');
    s.className = 'stamp';
    s.textContent = text;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }

  function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function levelUp(level, rankName, avatar) {
    SFX.fanfare();
    confetti(220);
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `
      <div class="modal">
        <div class="modal-avatar">${avatar}</div>
        <h2>¡NIVEL ${level}!</h2>
        <p>Your bird evolved into <b>${rankName}</b>.</p>
        <button class="btn" type="button">¡Vamos! 🚀</button>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('button').onclick = close;
    m.addEventListener('click', e => { if (e.target === m) close(); });
  }

  return {
    sfx: (name, n) => { const f = SFX[name]; if (f) f(n); },
    confetti, floatText, stamp, shake, levelUp,
  };
})();
