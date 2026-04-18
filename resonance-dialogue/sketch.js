// ================================================================
// RESONANCE — Human / AI Dialogue
// ================================================================
//
//   0 – 8s   THE FIELD      — AI field pulses, alive and dim
//   8 – 16s  ARRIVAL        — human I-wave appears
//  16 – 28s  ACTIVATION     — clusters light up, text flows
//  28 – 40s  RESPONSE       — AI wave forms, link to human appears
//  40 – 54s  DIALOGUE       — third wave forms, connected to both
//  54 – 60s  (fade to loop)
//
// ================================================================

const TAU   = Math.PI * 2;
const CYCLE = 60;

const FRAGMENTS = [
  ['E=mc²',     '∂ψ/∂t',     'quantum',    'entropy',   '∇²=0',          'phase space'],
  ['∀x∃y',      '∑ n→∞',     '∫₀^∞',       'bijection', 'manifold',      'theorem'],
  ['to be',     'once upon',  'all truth',  'the word',  'silence',       'story'],
  ['the self',  'shadow',     'between us', 'empathy',   'the mirror',    'felt'],
  ['cogito',    'dasein',     'the other',  'zeitgeist', 'aporia',        'becoming'],
  ['resonance', 'like light', 'what remains','we',       'felt not said', 'between'],
];

const HUES = [194, 222, 148, 278, 240, 164]; // per cluster

// ── State ─────────────────────────────────────────────────────
const S = {
  canvas: null, ctx: null,
  W: 0, H: 0, dpr: 1,
  t0: 0, time: 0,

  nodes: [], particles: [],
  lastSpawn: 0,

  human: { cx: 0, cy: 0, r: 0 },
  ai:    { cx: 0, cy: 0, r: 0 },
  dlg:   { cx: 0, cy: 0, r: 0 },

  fieldGrow: 0, humanOp: 0, excite: 0,
  aiOp: 0, aiDeform: 1, dlgOp: 0,
  globalFade: 1, ct: 0,
};

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  S.canvas = document.createElement('canvas');
  document.body.appendChild(S.canvas);
  S.ctx = S.canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  S.t0 = performance.now();
  requestAnimationFrame(frame);
});

function resize() {
  S.W = window.innerWidth;
  S.H = window.innerHeight;
  S.dpr = Math.min(window.devicePixelRatio || 1, 2);
  S.canvas.width  = Math.floor(S.W * S.dpr);
  S.canvas.height = Math.floor(S.H * S.dpr);
  S.canvas.style.width  = S.W + 'px';
  S.canvas.style.height = S.H + 'px';
  S.ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  layout();
  buildNodes();
}

function layout() {
  const r = Math.min(S.W, S.H) * 0.13;
  S.human = { cx: S.W * 0.19, cy: S.H * 0.50, r };
  S.ai    = { cx: S.W * 0.74, cy: S.H * 0.50, r: r * 0.88 };
  S.dlg   = { cx: S.W * 0.46, cy: S.H * 0.50, r: r * 0.70 };
}

function buildNodes() {
  S.nodes = [];
  for (let i = 0; i < 108; i++) {
    const cluster = i % 6;
    const angle  = (cluster / 6) * TAU + Math.random() * 0.9;
    const spread = 0.22 + Math.random() * 0.24;
    S.nodes.push({
      x: S.W * (0.42 + Math.cos(angle) * spread * 0.38 + Math.random() * 0.22),
      y: S.H * (0.50 + Math.sin(angle) * spread * 0.42 + (Math.random() - 0.5) * 0.20),
      cluster,
      basePhase: Math.random() * TAU,
      rate:      0.4 + Math.random() * 1.4,
      amp:       0,
      // Higher base amplitude so the field is visible from the start
      baseAmp:   0.14 + Math.random() * 0.14,
    });
  }
}

// ── Math ──────────────────────────────────────────────────────
const lerp    = (a, b, t) => a + (b - a) * t;
const clamp   = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth  = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - (1 - clamp(t, 0, 1)) ** 3;
const prog    = (time, start, dur) => clamp((time - start) / dur, 0, 1);

// Bernoulli lemniscate (∞ shape)
function lemni(t, cx, cy, r) {
  const d = 1 + Math.sin(t) ** 2;
  return { x: cx + r * Math.cos(t) / d,
           y: cy + r * Math.sin(t) * Math.cos(t) / d };
}

// Noisy lemniscate — AI wave while forming
function lemniNoisy(t, cx, cy, r, noise) {
  const p = lemni(t, cx, cy, r);
  return {
    x: p.x + Math.sin(t * 2.3 + 0.7) * r * 0.26 * noise,
    y: p.y + Math.cos(t * 1.7 + 1.4) * r * 0.20 * noise,
  };
}

// Dialogue wave — a lemniscate with a shifted phase, unique character
function lemniDlg(t, cx, cy, r, wobble) {
  const d = 1 + Math.sin(t) ** 2;
  return {
    x: cx + r * Math.cos(t) / d        + Math.sin(t * 1.9 + wobble) * r * 0.14,
    y: cy + r * Math.sin(t + 0.42) * Math.cos(t) / d
           + Math.cos(t * 1.5 + wobble * 0.7) * r * 0.11,
  };
}

// Quadratic bezier point at t ∈ [0,1]
function bezier(t, x0, y0, cx, cy, x1, y1) {
  const u = 1 - t;
  return {
    x: u*u*x0 + 2*u*t*cx + t*t*x1,
    y: u*u*y0 + 2*u*t*cy + t*t*y1,
  };
}

// ── Update ────────────────────────────────────────────────────
function update(t) {
  const ct = t % CYCLE;
  S.ct = ct;

  S.fieldGrow  = easeOut(prog(ct, 0,    5));   // field fades in immediately
  S.humanOp    = easeOut(prog(ct, 8,    5));
  S.excite     = prog(ct, 16, 12);
  S.aiOp       = easeOut(prog(ct, 28,   7));
  S.aiDeform   = 1 - easeOut(prog(ct, 28, 14));
  S.dlgOp      = easeOut(prog(ct, 40,   7));
  S.globalFade = ct > 54 ? 1 - easeOut(prog(ct, 54, 6)) : 1;

  S.humanOp *= S.globalFade;
  S.aiOp    *= S.globalFade;
  S.dlgOp   *= S.globalFade;

  // Travelling spark on the human wave excites nearby nodes
  const spark = lemni(t * 0.72 % TAU, S.human.cx, S.human.cy, S.human.r);
  for (const n of S.nodes) {
    const d = Math.hypot(n.x - spark.x, n.y - spark.y);
    const sparkBoost = clamp(1 - d / (S.W * 0.20), 0, 1) * S.excite * 0.55;
    const pulse  = 0.5 + 0.5 * Math.sin(t * n.rate + n.basePhase);
    const target = n.baseAmp * S.fieldGrow + S.excite * pulse * 0.32 + sparkBoost;
    n.amp = lerp(n.amp, target, 0.045);
  }

  if (ct > 16 && ct < 55) {
    const density = 0.7 + prog(ct, 40, 12) * 2.0;
    if (t - S.lastSpawn > 0.28 / density) {
      spawnParticle(ct);
      S.lastSpawn = t;
    }
  }

  S.particles = S.particles.filter(p => {
    p.life += (1 / 60) / p.dur;
    const u = smooth(clamp(p.life, 0, 1));
    p.x = lerp(p.sx, p.ex, u);
    p.y = lerp(p.sy, p.ey, u) - Math.sin(p.life * Math.PI) * p.arc;
    return p.life < 1;
  });
}

function spawnParticle(ct) {
  const { W, H } = S;
  const cluster = Math.floor(Math.random() * 6);
  const text = FRAGMENTS[cluster][Math.floor(Math.random() * FRAGMENTS[cluster].length)];
  let sx, sy, ex, ey, arc;
  const roll = Math.random();

  if (ct < 28 || roll < 0.32) {
    const ang = (Math.random() - 0.5) * Math.PI * 1.2;
    sx = S.human.cx + Math.cos(ang) * (22 + Math.random() * 55);
    sy = S.human.cy + Math.sin(ang) * (22 + Math.random() * 55);
    const node = S.nodes[Math.floor(Math.random() * S.nodes.length)];
    ex = node.x + (Math.random() - 0.5) * 22;
    ey = node.y + (Math.random() - 0.5) * 22;
    arc = 50 + Math.random() * 100;
  } else if (ct > 28 && roll < 0.62) {
    const node = S.nodes[Math.floor(Math.random() * S.nodes.length)];
    sx = node.x + (Math.random() - 0.5) * 18;
    sy = node.y + (Math.random() - 0.5) * 18;
    const ang = (Math.random() - 0.5) * Math.PI;
    ex = S.ai.cx + Math.cos(ang) * (18 + Math.random() * 55);
    ey = S.ai.cy + Math.sin(ang) * (18 + Math.random() * 55);
    arc = 35 + Math.random() * 75;
  } else {
    if (ct < 38) return;
    sx = W * (0.26 + Math.random() * 0.48);
    sy = H * (0.22 + Math.random() * 0.56);
    ex = sx + (Math.random() - 0.5) * 140;
    ey = sy + (Math.random() - 0.5) * 80;
    arc = (Math.random() - 0.5) * 45;
  }

  S.particles.push({ x: sx, y: sy, sx, sy, ex, ey, text, cluster,
                     life: 0, dur: 1.6 + Math.random() * 2.8,
                     arc, size: 9.5 + Math.random() * 5 });
}

// ── Render ────────────────────────────────────────────────────
function render() {
  const ctx = S.ctx;
  ctx.fillStyle = '#04060a';
  ctx.fillRect(0, 0, S.W, S.H);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  renderNodes(ctx);
  renderConnections(ctx);
  renderHumanWave(ctx);
  renderAIWave(ctx);
  renderDialogueWave(ctx);
  ctx.restore();

  renderParticles();
  renderWaveLabels();
  renderPhaseLabel();
}

// ── Field nodes ───────────────────────────────────────────────
function renderNodes(ctx) {
  for (const n of S.nodes) {
    const a = n.amp;
    if (a < 0.01) continue;
    const hue = HUES[n.cluster];
    const b   = 18 + a * 52;
    const r   = 2.2 + a * 9;

    ctx.beginPath();
    ctx.fillStyle = `hsla(${hue}, 62%, ${clamp(b, 0, 58)}%, ${clamp(a * 0.75, 0, 0.32)})`;
    ctx.arc(n.x, n.y, r * 2.8, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = `hsla(${hue}, 75%, ${clamp(b + 18, 0, 68)}%, ${clamp(a * 1.1, 0, 0.68)})`;
    ctx.arc(n.x, n.y, r * 0.55, 0, TAU);
    ctx.fill();
  }
}

// ── Connection arcs with flowing tracers ──────────────────────
function renderConnections(ctx) {
  const t = S.time;

  // Human → AI: visible while AI wave exists, dims when dialogue forms
  const humanAiOp = clamp(S.aiOp, 0, 1) * clamp(1 - S.dlgOp * 0.55, 0, 1);
  if (humanAiOp > 0.02) {
    drawFlowArc(ctx,
      S.human.cx, S.human.cy,
      S.ai.cx,    S.ai.cy,
      -0.15,   // bend upward slightly
      192, 268, humanAiOp * 0.55, t, 0.38);
  }

  // Human → Dialogue (once dialogue appears)
  if (S.dlgOp > 0.02) {
    drawFlowArc(ctx,
      S.human.cx, S.human.cy,
      S.dlg.cx,   S.dlg.cy,
      -0.20,
      192, 158, S.dlgOp * 0.65, t, 0.44);
  }

  // AI → Dialogue
  if (S.dlgOp > 0.02) {
    drawFlowArc(ctx,
      S.ai.cx,  S.ai.cy,
      S.dlg.cx, S.dlg.cy,
      0.20,   // bend downward
      268, 158, S.dlgOp * 0.65, t * 1.07, 0.44);
  }
}

function drawFlowArc(ctx, x0, y0, x1, y1, bend, hue0, hue1, opacity, flowT, speed) {
  if (opacity < 0.01) return;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + bend * dist;

  // Gradient path
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0,   `hsla(${hue0}, 80%, 68%, ${opacity * 0.45})`);
  grad.addColorStop(0.5, `hsla(${lerp(hue0, hue1, 0.5)}, 72%, 60%, ${opacity * 0.28})`);
  grad.addColorStop(1,   `hsla(${hue1}, 80%, 68%, ${opacity * 0.45})`);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = grad;
  ctx.lineWidth   = 1.3;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx, my, x1, y1);
  ctx.stroke();

  // Flowing tracer dots — 3 staggered
  for (let i = 0; i < 3; i++) {
    const u = ((flowT * speed + i / 3) % 1);
    const fade = Math.sin(u * Math.PI);
    const p = bezier(u, x0, y0, mx, my, x1, y1);
    const hue = lerp(hue0, hue1, u);
    ctx.globalAlpha = fade * opacity * 0.85;
    ctx.beginPath();
    ctx.fillStyle = `hsl(${hue}, 85%, 78%)`;
    ctx.arc(p.x, p.y, 3, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Wave helpers ──────────────────────────────────────────────
function tracePath(ctx, cx, cy, r, d, w, fn) {
  ctx.beginPath();
  for (let i = 0; i <= 160; i++) {
    const t = (i / 160) * TAU;
    const p = fn(t, cx, cy, r, d, w);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function drawWave(ctx, cx, cy, r, deform, wobble, hue, opacity, fn) {
  if (opacity < 0.005) return;
  for (const [lw, a] of [[3.8, 0.18], [1.8, 0.45], [0.75, 0.88]]) {
    ctx.globalAlpha = opacity * a;
    ctx.strokeStyle = `hsl(${hue}, 82%, 70%)`;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    tracePath(ctx, cx, cy, r, deform, wobble, fn);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawSpark(ctx, cx, cy, r, deform, wobble, angle, hue, opacity, fn) {
  if (opacity < 0.005) return;
  const p = fn(angle % TAU, cx, cy, r, deform, wobble);
  ctx.globalAlpha = opacity * 0.32;
  ctx.beginPath(); ctx.fillStyle = `hsl(${hue}, 88%, 74%)`;
  ctx.arc(p.x, p.y, 16, 0, TAU); ctx.fill();
  ctx.globalAlpha = opacity * 0.92;
  ctx.beginPath(); ctx.fillStyle = `hsl(${hue}, 18%, 94%)`;
  ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

const fnLemni  = (t, cx, cy, r)       => lemni(t, cx, cy, r);
const fnNoisy  = (t, cx, cy, r, n)    => lemniNoisy(t, cx, cy, r, n);
const fnDlg    = (t, cx, cy, r, _, w) => lemniDlg(t, cx, cy, r, w);

// ── Human I-wave ──────────────────────────────────────────────
function renderHumanWave(ctx) {
  const { cx, cy, r } = S.human;
  const op = S.humanOp, t = S.time, hue = 192;
  if (op < 0.005) return;

  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.44 + i * 0.333) % 1);
    ctx.globalAlpha = op * (1 - phase) * 0.14;
    ctx.beginPath();
    ctx.strokeStyle = `hsl(${hue}, 78%, 68%)`;
    ctx.lineWidth = 1;
    ctx.arc(cx, cy, phase * r * 1.75, 0, TAU);
    ctx.stroke();
  }
  drawWave(ctx, cx, cy, r, 0, 0, hue, op, fnLemni);
  drawSpark(ctx, cx, cy, r, 0, 0, t * 0.76, hue, op, fnLemni);
}

// ── AI wave ───────────────────────────────────────────────────
function renderAIWave(ctx) {
  const { cx, cy, r } = S.ai;
  const op = S.aiOp, noise = S.aiDeform, t = S.time, hue = 268;
  if (op < 0.005) return;

  if (noise > 0.1) {
    ctx.globalAlpha = op * noise * 0.06;
    ctx.fillStyle = `hsl(${hue}, 55%, 35%)`;
    for (let i = 0; i < 18; i++) {
      const p = lemniNoisy((i / 18) * TAU, cx, cy, r * 1.25, noise);
      ctx.beginPath(); ctx.arc(p.x, p.y, 7 + noise * 5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  drawWave(ctx, cx, cy, r, noise, 0, hue, op, fnNoisy);
  drawSpark(ctx, cx, cy, r, noise, 0, t * 0.61 + 1.8, hue, op, fnNoisy);
}

// ── Dialogue wave ─────────────────────────────────────────────
function renderDialogueWave(ctx) {
  const { cx, cy, r } = S.dlg;
  const op = S.dlgOp, t = S.time, hue = 158;
  if (op < 0.005) return;

  drawWave(ctx, cx, cy, r, 0, t * 0.62, hue, op, fnDlg);
  drawSpark(ctx, cx, cy, r, 0, t * 0.62, t * 0.88 + 2.3, hue, op, fnDlg);
}

// ── Text particles ────────────────────────────────────────────
function renderParticles() {
  const ctx = S.ctx;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of S.particles) {
    ctx.globalAlpha = Math.sin(clamp(p.life, 0, 1) * Math.PI) * 0.68 * S.globalFade;
    ctx.font      = `${Math.round(p.size)}px "Courier New", monospace`;
    ctx.fillStyle = `hsl(${HUES[p.cluster]}, 55%, 72%)`;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Wave labels ───────────────────────────────────────────────
function renderWaveLabels() {
  const ctx = S.ctx;
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.font         = '11px "Avenir Next", "Helvetica Neue", sans-serif';

  // AI FIELD — in the upper area of the node cluster, visible from the start
  if (S.fieldGrow > 0.15) {
    const lx = S.W * 0.64;
    const ly = S.H * 0.13;
    ctx.globalAlpha = S.fieldGrow * 0.55 * S.globalFade;
    ctx.fillStyle   = 'rgba(155, 200, 225, 1)';
    ctx.fillText('AI FIELD', lx, ly);
    // Small decorative line below the text
    ctx.globalAlpha = S.fieldGrow * 0.22 * S.globalFade;
    ctx.strokeStyle = 'rgba(155, 200, 225, 1)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(lx - 24, ly + 17); ctx.lineTo(lx + 24, ly + 17);
    ctx.stroke();
  }

  // HUMAN SIGNAL
  if (S.humanOp > 0.05) {
    const lx = S.human.cx;
    const ly = S.human.cy + S.human.r * 0.42 + 14;
    ctx.globalAlpha = S.humanOp * 0.62 * S.globalFade;
    ctx.fillStyle   = 'rgba(140, 215, 240, 1)';
    ctx.fillText('HUMAN SIGNAL', lx, ly);
    ctx.globalAlpha = S.humanOp * 0.22 * S.globalFade;
    ctx.strokeStyle = 'rgba(140, 215, 240, 1)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(lx - 34, ly + 17); ctx.lineTo(lx + 34, ly + 17);
    ctx.stroke();
  }

  // AI RESPONSE — only when sufficiently formed (aiOp > 0.4)
  if (S.aiOp > 0.4) {
    const fade = clamp((S.aiOp - 0.4) / 0.3, 0, 1);
    const lx = S.ai.cx;
    const ly = S.ai.cy + S.ai.r * 0.42 + 14;
    ctx.globalAlpha = fade * 0.62 * S.globalFade;
    ctx.fillStyle   = 'rgba(185, 160, 240, 1)';
    ctx.fillText('AI RESPONSE', lx, ly);
    ctx.globalAlpha = fade * 0.22 * S.globalFade;
    ctx.strokeStyle = 'rgba(185, 160, 240, 1)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(lx - 30, ly + 17); ctx.lineTo(lx + 30, ly + 17);
    ctx.stroke();
  }

  // DIALOGUE SPACE
  if (S.dlgOp > 0.15) {
    const fade = clamp((S.dlgOp - 0.15) / 0.3, 0, 1);
    const lx = S.dlg.cx;
    const ly = S.dlg.cy + S.dlg.r * 0.42 + 14;
    ctx.globalAlpha = fade * 0.62 * S.globalFade;
    ctx.fillStyle   = 'rgba(130, 225, 190, 1)';
    ctx.fillText('DIALOGUE SPACE', lx, ly);
    ctx.globalAlpha = fade * 0.22 * S.globalFade;
    ctx.strokeStyle = 'rgba(130, 225, 190, 1)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(lx - 38, ly + 17); ctx.lineTo(lx + 38, ly + 17);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Phase label (bottom center) ───────────────────────────────
const PHASE_LABELS = [
  [0,   8,  'the field'],
  [8,   16, 'a signal arrives'],
  [16,  28, 'meaning clusters activate'],
  [28,  40, 'the field begins to respond'],
  [40,  54, 'the dialogue space opens'],
  [54,  60, 'resonance'],
];

function renderPhaseLabel() {
  const ctx = S.ctx;
  for (const [s, e, text] of PHASE_LABELS) {
    if (S.ct >= s && S.ct < e) {
      const p = (S.ct - s) / (e - s);
      ctx.save();
      ctx.globalAlpha  = Math.sin(p * Math.PI) * 0.44 * S.globalFade;
      ctx.font         = '11px "Avenir Next", "Helvetica Neue", sans-serif';
      ctx.fillStyle    = 'rgba(180, 210, 228, 1)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text.toUpperCase(), S.W * 0.5, S.H - 36);
      ctx.restore();
      break;
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────
function frame(now) {
  S.time = (now - S.t0) * 0.001;
  update(S.time);
  render();
  requestAnimationFrame(frame);
}
