const TAU = Math.PI * 2;
const FIELD_STEP = 20;
const HUMAN_WAVE_SAMPLES = 220;
const AI_WAVE_SAMPLES = 220;
const BRIDGE_SAMPLES = 180;
const PALETTE = {
  human: { hue: 0, sat: 0, light: 98 },
  ai: { hue: 48, sat: 92, light: 69 },
  bridge: { hue: 274, sat: 82, light: 70 },
  field: { hue: 214, sat: 22, light: 72 },
};

const TEXT_LIBRARY = [
  "архетип",
  "phase drift",
  "нежность",
  "signal braid",
  "memory trace",
  "causal mesh",
  "вопрос",
  "care vector",
  "символ",
  "latent myth",
  "proof fragment",
  "echo self",
  "романтика",
  "semantic heat",
  "history pulse",
  "psyche map",
  "resonance",
  "формула",
  "desire loop",
  "pattern shard",
];

const state = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  dpr: 1,
  startTime: 0,
  lastLoopTime: 0,
  frameId: 0,
  fieldPoints: [],
  clusters: [],
  textPackets: [],
  humanWave: [],
  aiWave: [],
  bridgeWave: [],
  metrics: {
    humanStrength: 0,
    fieldStrength: 0,
    aiStrength: 0,
    bridgeStrength: 0,
    dialogueDensity: 0,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  setupCanvas();
  resizeScene();
  state.startTime = performance.now();
  state.frameId = requestAnimationFrame(frame);
  window.addEventListener("resize", resizeScene);
});

function setupCanvas() {
  const root = document.getElementById("canvas-root");
  const canvas = document.createElement("canvas");
  root.replaceChildren(canvas);
  state.canvas = canvas;
  state.ctx = canvas.getContext("2d");
}

function resizeScene() {
  const viewport = document.querySelector(".viewport");
  const rect = viewport.getBoundingClientRect();
  state.width = Math.max(320, Math.floor(rect.width));
  state.height = Math.max(420, Math.floor(rect.height));
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);

  state.canvas.width = Math.floor(state.width * state.dpr);
  state.canvas.height = Math.floor(state.height * state.dpr);
  state.canvas.style.width = `${state.width}px`;
  state.canvas.style.height = `${state.height}px`;
  state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  buildField();
  buildClusters();
  state.textPackets = [];
  state.lastLoopTime = 0;
}

function buildField() {
  state.fieldPoints = [];

  for (let y = FIELD_STEP * 0.5; y < state.height; y += FIELD_STEP) {
    for (let x = FIELD_STEP * 0.5; x < state.width; x += FIELD_STEP) {
      state.fieldPoints.push({
        x,
        y,
        seed: hash2D(x * 0.11, y * 0.07),
      });
    }
  }
}

function buildClusters() {
  const placements = [
    [0.38, 0.28],
    [0.44, 0.62],
    [0.51, 0.41],
    [0.57, 0.21],
    [0.61, 0.72],
    [0.67, 0.48],
    [0.74, 0.31],
    [0.79, 0.62],
  ];

  state.clusters = placements.map(([nx, ny], index) => ({
    id: index,
    x: state.width * nx,
    y: state.height * ny,
    radius: 18 + (index % 3) * 5,
    energy: 0,
    memory: 0,
    hue: 42 + index * 2.6,
    label: TEXT_LIBRARY[index % TEXT_LIBRARY.length],
  }));
}

function frame(timestamp) {
  const elapsed = (timestamp - state.startTime) * 0.001;
  const timeline = computeTimeline(elapsed);

  if (timeline.loopTime < state.lastLoopTime) {
    buildClusters();
    state.textPackets = [];
  }

  state.metrics = timeline;
  updateClusters(timeline, elapsed);
  buildHumanWave(timeline, elapsed);
  buildAIWave(timeline, elapsed);
  buildBridgeWave(timeline, elapsed);
  updateTextPackets(timeline, elapsed);
  renderScene(timeline, elapsed);
  state.lastLoopTime = timeline.loopTime;

  state.frameId = requestAnimationFrame(frame);
}

function computeTimeline(elapsed) {
  const cycle = 34;
  const loopTime = elapsed % cycle;
  const pulse = 0.5 + 0.5 * Math.sin(loopTime * 0.55);

  const humanStrength = ease(clamp((loopTime - 1.2) / 4.6, 0, 1));
  const fieldStrength = ease(clamp((loopTime - 5.6) / 6.8, 0, 1));
  const aiStrength = ease(clamp((loopTime - 11.4) / 6.8, 0, 1));
  const bridgeRise = ease(clamp((loopTime - 15.2) / 5.8, 0, 1));
  const bridgeStrength = clamp(bridgeRise * 0.88 + aiStrength * 0.18 + fieldStrength * 0.08, 0, 1);
  const dialogueDensity =
    clamp((fieldStrength * 0.55 + aiStrength * 0.75 + bridgeStrength * 1.05) / 2, 0, 1) *
    (0.72 + pulse * 0.28);

  return {
    loopTime,
    pulse,
    humanStrength,
    fieldStrength,
    aiStrength,
    bridgeStrength,
    dialogueDensity,
  };
}

function updateClusters(timeline, elapsed) {
  const frontX = lerp(state.width * 0.18, state.width * 0.82, ease(clamp((timeline.loopTime - 4) / 11, 0, 1)));

  for (const cluster of state.clusters) {
    const arrival = Math.exp(-Math.pow((cluster.x - frontX) / (state.width * 0.12), 2));
    const conversation = 0.18 + 0.82 * timeline.dialogueDensity;
    const semanticPulse =
      0.5 +
      0.5 * Math.sin(elapsed * (0.8 + cluster.id * 0.05) + cluster.id * 1.7);
    const targetEnergy =
      timeline.fieldStrength * arrival * 0.9 +
      timeline.aiStrength * 0.32 +
      timeline.bridgeStrength * 0.24 +
      conversation * semanticPulse * 0.22;

    cluster.energy = lerp(cluster.energy, clamp(targetEnergy, 0, 1.2), 0.08);
    cluster.memory = lerp(cluster.memory, Math.max(cluster.memory * 0.985, cluster.energy), 0.06);
  }
}

function buildHumanWave(timeline, elapsed) {
  state.humanWave = [];

  const cx = state.width * 0.2;
  const cy = state.height * 0.5;
  const size = Math.min(state.width, state.height) * 0.18;
  const centerHeat = timeline.humanStrength * (0.75 + 0.25 * Math.sin(elapsed * 3.8));

  for (let i = 0; i <= HUMAN_WAVE_SAMPLES; i += 1) {
    const t = (i / HUMAN_WAVE_SAMPLES) * TAU;
    const ripple = 1 + 0.05 * Math.sin(elapsed * 2.2 + t * 3);
    const x = cx + Math.sin(t) * size * ripple;
    const y =
      cy +
      Math.sin(2 * t) * size * 0.37 +
      Math.sin(elapsed * 1.6 + t * 4) * timeline.humanStrength * 3.5;

    state.humanWave.push({
      x,
      y,
      centerHeat: Math.exp(-Math.pow(x - cx, 2) / squared(size * 0.12)) * centerHeat,
    });
  }
}

function buildAIWave(timeline, elapsed) {
  state.aiWave = [];

  const centerX = state.width * 0.79;
  const centerY = state.height * 0.5;
  const spread = Math.min(state.width, state.height) * (0.15 + timeline.aiStrength * 0.03);
  const clusterBias = averageClusterVector();

  for (let i = 0; i <= AI_WAVE_SAMPLES; i += 1) {
    const t = (i / AI_WAVE_SAMPLES) * TAU;
    const modulation =
      1 +
      0.11 * Math.sin(elapsed * 1.7 + t * 3 + clusterBias.phase) +
      0.07 * Math.sin(t * 5 - elapsed * 0.9);
    const x =
      centerX +
      Math.sin(t) * spread * modulation +
      Math.sin(3 * t + elapsed) * 10 * timeline.aiStrength;
    const y =
      centerY +
      Math.sin(2 * t + 0.45) * spread * 0.34 +
      Math.cos(t * 4 - elapsed * 1.1) * 7 * timeline.aiStrength +
      clusterBias.y * 16 * timeline.aiStrength;

    state.aiWave.push({ x, y });
  }
}

function buildBridgeWave(timeline, elapsed) {
  state.bridgeWave = [];

  const leftX = state.width * 0.34;
  const rightX = state.width * 0.66;
  const midY = state.height * 0.5;

  for (let i = 0; i <= BRIDGE_SAMPLES; i += 1) {
    const p = i / BRIDGE_SAMPLES;
    const x = lerp(leftX, rightX, p);
    const arch = Math.sin(p * Math.PI);
    const instability =
      Math.sin(elapsed * 1.7 + p * 9) * 12 * timeline.bridgeStrength +
      Math.sin(elapsed * 0.72 - p * 5) * 7 * timeline.bridgeStrength;
    const inherited =
      Math.sin(p * TAU * 1.15 + elapsed * 1.6) * 8 * timeline.humanStrength +
      Math.cos(p * TAU * 1.4 - elapsed * 1.2) * 8 * timeline.aiStrength;
    const y = midY + inherited * 0.55 + instability * arch;

    state.bridgeWave.push({ x, y, alpha: arch * timeline.bridgeStrength });
  }
}

function updateTextPackets(timeline, elapsed) {
  const desiredCount = Math.floor(timeline.fieldStrength * 4 + timeline.dialogueDensity * 24);

  while (state.textPackets.length < desiredCount) {
    state.textPackets.push(createPacket(timeline, elapsed));
  }

  for (const packet of state.textPackets) {
    packet.progress += packet.speed;
    packet.wobblePhase += packet.wobbleSpeed;
    if (packet.progress > 1.04) {
      Object.assign(packet, createPacket(timeline, elapsed));
    }
  }
}

function createPacket(timeline, elapsed) {
  const typeRoll = Math.random();
  let route = "human-cluster";

  if (timeline.aiStrength > 0.45 && typeRoll > 0.42) {
    route = "cluster-ai";
  }
  if (timeline.bridgeStrength > 0.35 && typeRoll > 0.76) {
    route = "between";
  }

  const cluster = state.clusters[Math.floor(Math.random() * state.clusters.length)];
  const humanAnchor = {
    x: state.width * 0.21 + Math.cos(elapsed + cluster.id) * 18,
    y: state.height * 0.5 + Math.sin(elapsed * 0.7 + cluster.id) * 68,
  };
  const aiAnchor = {
    x: state.width * 0.79 + Math.cos(elapsed * 0.5 + cluster.id) * 18,
    y: state.height * 0.5 + Math.sin(elapsed * 0.6 + cluster.id) * 58,
  };

  const phrase = TEXT_LIBRARY[Math.floor(Math.random() * TEXT_LIBRARY.length)];
  const start =
    route === "human-cluster"
      ? humanAnchor
      : route === "cluster-ai"
        ? cluster
        : { x: cluster.x - 24, y: cluster.y };
  const end =
    route === "human-cluster"
      ? cluster
      : route === "cluster-ai"
        ? aiAnchor
        : { x: lerp(state.width * 0.4, state.width * 0.62, Math.random()), y: state.height * (0.32 + Math.random() * 0.36) };

  return {
    phrase,
    route,
    clusterId: cluster.id,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    progress: Math.random(),
    speed: 0.003 + Math.random() * 0.006 + timeline.dialogueDensity * 0.003,
    wobble: 7 + Math.random() * 10,
    wobblePhase: Math.random() * TAU,
    wobbleSpeed: 0.015 + Math.random() * 0.03,
    alpha: 0.16 + Math.random() * 0.22,
  };
}

function renderScene(timeline, elapsed) {
  const ctx = state.ctx;
  ctx.clearRect(0, 0, state.width, state.height);

  renderBackground(timeline);
  renderField(timeline, elapsed);
  renderClusterConnections(timeline);
  renderHumanWave(timeline, elapsed);
  renderAIWave(timeline, elapsed);
  renderBridgeWave(timeline, elapsed);
  renderClusters(timeline, elapsed);
  renderTextPackets(timeline);
  renderLabels(timeline);
}

function renderBackground(timeline) {
  const ctx = state.ctx;
  const gradient = ctx.createRadialGradient(
    state.width * 0.52,
    state.height * 0.5,
    10,
    state.width * 0.52,
    state.height * 0.5,
    Math.max(state.width, state.height) * 0.7
  );
  gradient.addColorStop(0, `rgba(9, 14, 22, ${0.78 - timeline.bridgeStrength * 0.08})`);
  gradient.addColorStop(0.55, "rgba(5, 8, 13, 0.92)");
  gradient.addColorStop(1, "rgba(3, 4, 8, 1)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  const humanGlow = ctx.createRadialGradient(
    state.width * 0.2,
    state.height * 0.5,
    0,
    state.width * 0.2,
    state.height * 0.5,
    state.width * 0.22
  );
  humanGlow.addColorStop(0, `hsla(${PALETTE.human.hue}, ${PALETTE.human.sat}%, ${PALETTE.human.light}%, ${0.07 + timeline.humanStrength * 0.06})`);
  humanGlow.addColorStop(1, "hsla(0, 0%, 100%, 0)");
  ctx.fillStyle = humanGlow;
  ctx.fillRect(0, 0, state.width, state.height);

  const aiGlow = ctx.createRadialGradient(
    state.width * 0.79,
    state.height * 0.5,
    0,
    state.width * 0.79,
    state.height * 0.5,
    state.width * 0.24
  );
  aiGlow.addColorStop(0, `hsla(${PALETTE.ai.hue}, ${PALETTE.ai.sat}%, ${PALETTE.ai.light}%, ${0.06 + timeline.aiStrength * 0.08})`);
  aiGlow.addColorStop(1, "hsla(48, 90%, 70%, 0)");
  ctx.fillStyle = aiGlow;
  ctx.fillRect(0, 0, state.width, state.height);

  const bridgeGlow = ctx.createRadialGradient(
    state.width * 0.5,
    state.height * 0.5,
    0,
    state.width * 0.5,
    state.height * 0.5,
    state.width * 0.3
  );
  bridgeGlow.addColorStop(0, `hsla(${PALETTE.bridge.hue}, ${PALETTE.bridge.sat}%, ${PALETTE.bridge.light}%, ${0.05 + timeline.bridgeStrength * 0.1})`);
  bridgeGlow.addColorStop(1, "hsla(274, 82%, 72%, 0)");
  ctx.fillStyle = bridgeGlow;
  ctx.fillRect(0, 0, state.width, state.height);
}

function renderField(timeline, elapsed) {
  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const point of state.fieldPoints) {
    const nearest = nearestClusterInfluence(point.x, point.y);
    const bridgeProximity = bridgeInfluence(point.x, point.y);
    const ambient =
      0.04 +
      nearest.energy * 0.24 +
      nearest.memory * 0.18 +
      bridgeProximity * timeline.bridgeStrength * 0.22;
    const flicker =
      0.72 +
      0.28 * Math.sin(elapsed * (0.9 + point.seed * 0.6) + point.x * 0.01 + point.y * 0.015);
    const alpha = ambient * flicker;
    const radius = 1 + nearest.energy * 2.4 + bridgeProximity * 1.8;
    const hue = lerp(PALETTE.field.hue, PALETTE.ai.hue, nearest.energy * 0.45) + bridgeProximity * 48;

    ctx.beginPath();
    ctx.fillStyle = `hsla(${hue}, ${PALETTE.field.sat + nearest.energy * 16 + bridgeProximity * 20}%, ${PALETTE.field.light + nearest.energy * 8}%, ${alpha})`;
    ctx.arc(point.x, point.y, radius, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function renderClusterConnections(timeline) {
  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < state.clusters.length - 1; i += 1) {
    const a = state.clusters[i];
    const b = state.clusters[i + 1];
    const alpha = (a.energy + b.energy) * 0.16 * timeline.dialogueDensity;

    const hue = lerp(PALETTE.ai.hue, PALETTE.bridge.hue, timeline.bridgeStrength * 0.55);
    ctx.strokeStyle = `hsla(${hue + i * 2}, 34%, 72%, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) * 0.5, lerp(a.y, b.y, 0.5) - 40 + i * 7, b.x, b.y);
    ctx.stroke();
  }

  ctx.restore();
}

function renderHumanWave(timeline, elapsed) {
  if (timeline.humanStrength <= 0.01) {
    return;
  }

  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let pass = 0; pass < 3; pass += 1) {
    ctx.beginPath();
    for (let i = 0; i < state.humanWave.length; i += 1) {
      const sample = state.humanWave[i];
      if (i === 0) {
        ctx.moveTo(sample.x, sample.y);
      } else {
        ctx.lineTo(sample.x, sample.y);
      }
    }

    ctx.strokeStyle = `hsla(${PALETTE.human.hue}, ${PALETTE.human.sat}%, ${94 + pass * 2}%, ${(0.16 + timeline.humanStrength * 0.18) / (pass + 1)})`;
    ctx.lineWidth = 1.5 + pass * 2.1;
    ctx.shadowBlur = 18 + pass * 16;
    ctx.shadowColor = `hsla(${PALETTE.human.hue}, ${PALETTE.human.sat}%, 100%, ${0.18 + timeline.humanStrength * 0.14})`;
    ctx.stroke();
  }

  const cx = state.width * 0.2;
  const cy = state.height * 0.5;
  const centerPulse = 17 + Math.sin(elapsed * 1.15) * 1.8;
  drawGlow(cx, cy, centerPulse * 3.5, `hsla(${PALETTE.human.hue}, ${PALETTE.human.sat}%, 100%, ${0.09 + timeline.humanStrength * 0.13})`);
  drawGlow(cx, cy, centerPulse * 1.15, `hsla(${PALETTE.human.hue}, ${PALETTE.human.sat}%, 100%, ${0.18 + timeline.humanStrength * 0.18})`);

  ctx.restore();
}

function renderAIWave(timeline, elapsed) {
  if (timeline.aiStrength <= 0.01) {
    return;
  }

  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let pass = 0; pass < 3; pass += 1) {
    ctx.beginPath();
    for (let i = 0; i < state.aiWave.length; i += 1) {
      const sample = state.aiWave[i];
      if (i === 0) {
        ctx.moveTo(sample.x, sample.y);
      } else {
        ctx.lineTo(sample.x, sample.y);
      }
    }

    ctx.strokeStyle = `hsla(${PALETTE.ai.hue + pass * 2}, ${PALETTE.ai.sat - pass * 10}%, ${PALETTE.ai.light + pass * 7}%, ${(0.1 + timeline.aiStrength * 0.24) / (pass + 1)})`;
    ctx.lineWidth = 1.2 + pass * 2.4;
    ctx.shadowBlur = 18 + pass * 18;
    ctx.shadowColor = `hsla(${PALETTE.ai.hue}, ${PALETTE.ai.sat}%, ${PALETTE.ai.light + 18}%, ${0.2 + timeline.aiStrength * 0.18})`;
    ctx.stroke();
  }

  for (const cluster of state.clusters) {
    const alpha = cluster.energy * timeline.aiStrength * 0.15;
    ctx.strokeStyle = `hsla(${PALETTE.ai.hue + cluster.id * 1.5}, 56%, 74%, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cluster.x, cluster.y);
    ctx.quadraticCurveTo(state.width * 0.7, state.height * 0.5, state.width * 0.79, state.height * 0.5);
    ctx.stroke();
  }

  drawGlow(
    state.width * 0.79,
    state.height * 0.5,
    28 + timeline.aiStrength * 18 + Math.sin(elapsed * 2.2) * 4,
    `hsla(${PALETTE.ai.hue}, ${PALETTE.ai.sat}%, 84%, ${0.08 + timeline.aiStrength * 0.14})`
  );

  ctx.restore();
}

function renderBridgeWave(timeline, elapsed) {
  if (timeline.bridgeStrength <= 0.01) {
    return;
  }

  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const bridgePresence = clamp(timeline.bridgeStrength * 1.08 + timeline.dialogueDensity * 0.14, 0, 1);

  for (let band = 0; band < 4; band += 1) {
    ctx.beginPath();
    for (let i = 0; i < state.bridgeWave.length; i += 1) {
      const sample = state.bridgeWave[i];
      const offset = Math.sin(elapsed * (0.8 + band * 0.28) + i * 0.14) * (band * 2.8);
      const y = sample.y + offset;

      if (i === 0) {
        ctx.moveTo(sample.x, y);
      } else {
        ctx.lineTo(sample.x, y);
      }
    }

    ctx.strokeStyle = `hsla(${PALETTE.bridge.hue + band * 6}, ${PALETTE.bridge.sat - band * 8}%, ${PALETTE.bridge.light + band * 6}%, ${(0.13 + bridgePresence * 0.22) / (band + 1)})`;
    ctx.lineWidth = 1.8 + band * 2.1;
    ctx.shadowBlur = 22 + band * 14;
    ctx.shadowColor = `hsla(${PALETTE.bridge.hue}, ${PALETTE.bridge.sat}%, 82%, ${0.22 + bridgePresence * 0.24})`;
    ctx.stroke();
  }

  drawGlow(
    state.width * 0.5,
    state.height * 0.5,
    34 + bridgePresence * 26,
    `hsla(${PALETTE.bridge.hue}, ${PALETTE.bridge.sat}%, 78%, ${0.05 + bridgePresence * 0.08})`
  );

  const braidAlpha = 0.1 + bridgePresence * 0.18;
  ctx.strokeStyle = `hsla(${PALETTE.bridge.hue}, 34%, 88%, ${braidAlpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(state.width * 0.33, state.height * 0.5);
  ctx.bezierCurveTo(
    state.width * 0.42,
    state.height * (0.28 + Math.sin(elapsed) * 0.02),
    state.width * 0.58,
    state.height * (0.72 + Math.cos(elapsed * 1.2) * 0.02),
    state.width * 0.67,
    state.height * 0.5
  );
  ctx.stroke();

  ctx.restore();
}

function renderClusters(timeline, elapsed) {
  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.textAlign = "center";

  for (const cluster of state.clusters) {
    const radius = cluster.radius + cluster.energy * 18;
    const flicker = 0.7 + 0.3 * Math.sin(elapsed * 2.2 + cluster.id);

    drawGlow(cluster.x, cluster.y, radius * 2.4, `hsla(${cluster.hue}, 42%, 72%, ${(cluster.energy * 0.12 + cluster.memory * 0.06) * flicker})`);
    drawGlow(cluster.x, cluster.y, radius, `hsla(${cluster.hue}, 58%, 86%, ${(cluster.energy * 0.2 + 0.03) * flicker})`);

    ctx.fillStyle = `hsla(${cluster.hue}, 22%, 92%, ${0.24 + cluster.energy * 0.34})`;
    ctx.font = "12px Avenir Next, SF Pro Display, Segoe UI, sans-serif";
    ctx.fillText(cluster.label, cluster.x, cluster.y - radius - 10);
  }

  ctx.restore();
}

function renderTextPackets(timeline) {
  const ctx = state.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.font = "12px Avenir Next, SF Pro Display, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const packet of state.textPackets) {
    const x = lerp(packet.startX, packet.endX, packet.progress);
    const y =
      lerp(packet.startY, packet.endY, packet.progress) +
      Math.sin(packet.wobblePhase + packet.progress * TAU * 2) * packet.wobble;
    const fade = Math.sin(Math.min(1, packet.progress) * Math.PI);
    const hue =
      packet.route === "human-cluster"
        ? PALETTE.human.hue
        : packet.route === "cluster-ai"
          ? PALETTE.ai.hue
          : PALETTE.bridge.hue;
    const sat =
      packet.route === "human-cluster"
        ? 0
        : packet.route === "cluster-ai"
          ? 72
          : 68;
    const light =
      packet.route === "human-cluster"
        ? 94
        : packet.route === "cluster-ai"
          ? 74
          : 82;

    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${packet.alpha * fade * (0.4 + timeline.dialogueDensity * 0.8)})`;
    ctx.fillText(packet.phrase, x, y);
  }

  ctx.restore();
}

function renderLabels(timeline) {
  const ctx = state.ctx;
  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = `hsla(${PALETTE.human.hue}, ${PALETTE.human.sat}%, 96%, ${0.18 + timeline.humanStrength * 0.36})`;
  ctx.font = "13px Avenir Next, SF Pro Display, Segoe UI, sans-serif";
  ctx.fillText("человеческая я-волна", state.width * 0.2, state.height * 0.82);

  ctx.fillStyle = `hsla(${PALETTE.field.hue}, ${PALETTE.field.sat}%, 88%, ${0.16 + timeline.fieldStrength * 0.34})`;
  ctx.fillText("поле ИИ с латентными смыслами", state.width * 0.55, state.height * 0.12);

  ctx.fillStyle = `hsla(${PALETTE.ai.hue}, ${PALETTE.ai.sat}%, 78%, ${0.16 + timeline.aiStrength * 0.34})`;
  ctx.fillText("ответная волна ИИ", state.width * 0.79, state.height * 0.82);

  ctx.fillStyle = `hsla(${PALETTE.bridge.hue}, ${PALETTE.bridge.sat}%, 82%, ${0.14 + timeline.bridgeStrength * 0.34})`;
  ctx.fillText("смысловое пространство диалога", state.width * 0.5, state.height * 0.18);

  ctx.restore();
}

function nearestClusterInfluence(x, y) {
  let bestDist = Number.POSITIVE_INFINITY;
  let energy = 0;
  let memory = 0;
  let hueShift = 0;

  for (const cluster of state.clusters) {
    const dist = Math.hypot(x - cluster.x, y - cluster.y);
    if (dist < bestDist) {
      bestDist = dist;
      energy = cluster.energy * Math.exp(-dist / 110);
      memory = cluster.memory * Math.exp(-dist / 150);
      hueShift = cluster.hue - 188;
    }
  }

  return { energy, memory, hueShift };
}

function bridgeInfluence(x, y) {
  let strongest = 0;

  for (let i = 0; i < state.bridgeWave.length; i += 10) {
    const sample = state.bridgeWave[i];
    const dist = Math.hypot(x - sample.x, y - sample.y);
    strongest = Math.max(strongest, Math.exp(-dist / 80) * sample.alpha);
  }

  return strongest;
}

function averageClusterVector() {
  let sumX = 0;
  let sumY = 0;
  let total = 0;

  for (const cluster of state.clusters) {
    const weight = Math.max(0.001, cluster.energy);
    sumX += Math.cos(cluster.id) * weight;
    sumY += Math.sin(cluster.id * 0.8) * weight;
    total += weight;
  }

  if (total === 0) {
    return { phase: 0, y: 0 };
  }

  return {
    phase: Math.atan2(sumY, sumX),
    y: sumY / total,
  };
}

function drawGlow(x, y, radius, color) {
  const ctx = state.ctx;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ease(t) {
  return t * t * (3 - 2 * t);
}

function squared(value) {
  return value * value;
}

function hash2D(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}
