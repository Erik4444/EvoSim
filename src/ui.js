/**
 * Einstiegspunkt der Anwendung.
 * Verantwortlich für: HUD, Populationsgraph, Parameter-Panel,
 * Tooltip-Logik, Event-Handler und die Hauptschleife.
 */

import { canvas }                    from './canvas.js';
import { state }                     from './state.js';
import { render }                    from './render.js';
import { initSimulation, spawnFood } from './simulation.js';
import { getGroupName }              from './genome.js';
import { initGraph, updateGraph }    from './graph.js';
import { ACTIVATIONS }               from './config.js';

// ---------------------------------------------------------------------------
// DOM-Elemente
// ---------------------------------------------------------------------------

const infoDiv     = document.getElementById('info');
const tooltip     = document.getElementById('tooltip');
const toggleBtn   = document.getElementById('toggleBtn');
const paramBtn    = document.getElementById('paramBtn');
const paramPanel  = document.getElementById('paramPanel');
const helpBtn     = document.getElementById('helpBtn');
const helpClose   = document.getElementById('helpClose');
const helpOverlay = document.getElementById('help-overlay');
const speedGroup  = document.getElementById('speedGroup');
const resetBtn    = document.getElementById('resetBtn');

// ---------------------------------------------------------------------------
// Ticks/Sekunde Messung
// ---------------------------------------------------------------------------

let tpsCount    = 0;
let tps         = 0;
let lastTpsTime = performance.now();

// ---------------------------------------------------------------------------
// Control Bar – Speed Buttons
// ---------------------------------------------------------------------------

const SPEED_OPTIONS = [1, 2, 4, 8];

function buildSpeedButtons() {
  for (const s of SPEED_OPTIONS) {
    const btn = document.createElement('button');
    btn.textContent = `${s}x`;
    btn.className   = 'btn btn-speed' + (s === 1 ? ' active' : '');
    btn.dataset.speed = s;
    btn.addEventListener('click', () => {
      state.ticksPerFrame = s;
      speedGroup.querySelectorAll('.btn-speed').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.speed) === s);
      });
    });
    speedGroup.appendChild(btn);
  }
}

// ---------------------------------------------------------------------------
// Parameter-Panel
// ---------------------------------------------------------------------------

const DEFAULT_PARAMS = { ...state.params };

function buildParamPanel() {
  const sliderGroups = [
    {
      title: 'Ökosystem',
      sliders: [
        { label: 'Nahrungsspawn',  key: 'foodSpawnProb',   min: 0.005, max: 0.3,  step: 0.005, decimals: 3 },
        { label: 'Cluster-Prob',   key: 'foodClusterProb', min: 0,     max: 1,    step: 0.05,  decimals: 2 },
        { label: 'Nahrungswert',   key: 'foodValue',       min: 0.5,   max: 4,    step: 0.1,   decimals: 1 },
      ],
    },
    {
      title: 'Agenten',
      sliders: [
        { label: 'Sensorreichweite', key: 'sensorRange',           min: 30, max: 300, step: 5,   decimals: 0 },
        { label: 'Repro-Schwelle',   key: 'reproductionThreshold', min: 2,  max: 12,  step: 0.5, decimals: 1 },
      ],
    },
    {
      title: 'Überlebensdruck',
      sliders: [
        { label: 'Hazard (Sterberisiko)', key: 'hazardBase', min: 1e-5, max: 5e-4, step: 1e-5, decimals: 5 },
      ],
    },
  ];

  const inputs = {}; // key → { input, valSpan, decimals }

  for (const group of sliderGroups) {
    const groupTitle = document.createElement('div');
    groupTitle.className   = 'param-group-title';
    groupTitle.textContent = group.title;
    paramPanel.appendChild(groupTitle);

    for (const { label, key, min, max, step, decimals } of group.sliders) {
      const row = document.createElement('div');
      row.className = 'param-row';

      const lbl = document.createElement('span');
      lbl.className   = 'param-label';
      lbl.textContent = label;

      const input   = document.createElement('input');
      input.type    = 'range';
      input.min     = min;
      input.max     = max;
      input.step    = step;
      input.value   = state.params[key];

      const valSpan = document.createElement('span');
      valSpan.className   = 'param-value';
      valSpan.textContent = Number(state.params[key]).toFixed(decimals);

      const updateModified = () => {
        row.classList.toggle('modified', parseFloat(input.value) !== DEFAULT_PARAMS[key]);
      };

      input.addEventListener('input', () => {
        state.params[key]   = parseFloat(input.value);
        valSpan.textContent = parseFloat(input.value).toFixed(decimals);
        updateModified();
      });

      row.append(lbl, input, valSpan);
      paramPanel.appendChild(row);
      inputs[key] = { input, valSpan, decimals, row };
    }
  }

  const divider = document.createElement('div');
  divider.className = 'param-divider';
  paramPanel.appendChild(divider);

  const paramsResetBtn = document.createElement('button');
  paramsResetBtn.textContent = 'Zurücksetzen';
  paramsResetBtn.className   = 'btn btn-reset';
  paramsResetBtn.addEventListener('click', () => {
    Object.assign(state.params, DEFAULT_PARAMS);
    for (const [key, { input, valSpan, decimals, row }] of Object.entries(inputs)) {
      input.value         = state.params[key];
      valSpan.textContent = Number(state.params[key]).toFixed(decimals);
      row.classList.remove('modified');
    }
  });
  paramPanel.appendChild(paramsResetBtn);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function updateHUD() {
  const { agents, foods } = state;
  const n = agents.length;
  if (n === 0) return;

  let sumHidden = 0, sumAge = 0;
  const groupCounts = {}, groupColors = {};
  const actCounts   = new Array(ACTIVATIONS.length).fill(0);

  for (const a of agents) {
    sumHidden += a.genome.hiddenUnits;
    sumAge    += a.age;
    actCounts[a.genome.activationGene]++;
    const key = a.genome.shape;
    groupCounts[key] = (groupCounts[key] || 0) + 1;
    if (!groupColors[key]) groupColors[key] = a.color;
  }

  // Top-2 Spezies
  const top2 = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const speciesHTML = top2.map(([key, count]) => {
    const idx = parseInt(key);
    return `<span class="hud-species-item">` +
      `<span class="hud-dot" style="background:${groupColors[idx]};"></span>` +
      `<span class="hud-value">${getGroupName(idx)}</span>` +
      `<span class="hud-label">${count}</span>` +
      `</span>`;
  }).join('');

  // Dominante Aktivierungsfunktion
  const maxActIdx  = actCounts.indexOf(Math.max(...actCounts));
  const actPct     = ((actCounts[maxActIdx] / n) * 100).toFixed(0);
  const actName    = ACTIVATIONS[maxActIdx];

  const speedLabel = state.ticksPerFrame > 1 ? ` &nbsp;<span class="hud-label">·</span>&nbsp; <span class="hud-value">${state.ticksPerFrame}x</span>` : '';

  infoDiv.innerHTML =
    `<div class="hud-section">` +
      `<div class="hud-section-title">Ökosystem</div>` +
      `<div class="hud-row">` +
        `<span class="hud-value">${n}</span><span class="hud-label">Agenten</span>` +
        `<span class="hud-sep">&nbsp;·&nbsp;</span>` +
        `<span class="hud-value">${foods.length}</span><span class="hud-label">Nahrung</span>` +
      `</div>` +
      `<div class="hud-row" style="margin-top:2px;">` +
        `<span class="hud-label">TPS</span><span class="hud-value">${tps}</span>` +
        `${speedLabel}` +
      `</div>` +
    `</div>` +
    `<div class="hud-section">` +
      `<div class="hud-section-title">Evolution</div>` +
      `<div class="hud-row">` +
        `<span class="hud-label">ø Alter</span><span class="hud-value">${(sumAge / n).toFixed(0)}</span>` +
        `<span class="hud-sep">&nbsp;·&nbsp;</span>` +
        `<span class="hud-label">ø Neuronen</span><span class="hud-value">${(sumHidden / n).toFixed(1)}</span>` +
      `</div>` +
      `<div class="hud-row hud-species-row" style="margin-top:4px;">${speciesHTML}</div>` +
      `<div class="hud-row" style="margin-top:2px;">` +
        `<span class="hud-label">Aktivierung</span>` +
        `<span class="hud-value">${actName}</span>` +
        `<span class="hud-label">${actPct}%</span>` +
      `</div>` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

let hoveredAgent  = null;
let selectedAgent = null;

function buildAgentTooltip(agent) {
  const group = getGroupName(agent.genome.shape);
  return (
    `<div class="tt-name">${agent.name}</div>` +
    `<div class="tt-group">${group}</div>` +
    `<div class="tt-section-title">Vitalwerte</div>` +
    `<div class="tt-row"><span class="tt-key">Energie</span><span class="tt-val">${agent.energy.toFixed(2)}</span></div>` +
    `<div class="tt-row"><span class="tt-key">Alter</span><span class="tt-val">${agent.age}</span></div>` +
    `<div class="tt-row"><span class="tt-key">Reproduktionen</span><span class="tt-val">${agent.reproductions}</span></div>` +
    `<div class="tt-section-title">Genom</div>` +
    `<div class="tt-row"><span class="tt-key">Neuronen</span><span class="tt-val">${agent.genome.hiddenUnits}</span></div>` +
    `<div class="tt-row"><span class="tt-key">Aktivierung</span><span class="tt-val">${ACTIVATIONS[agent.genome.activationGene]}</span></div>` +
    `<div class="tt-row"><span class="tt-key">Sigma</span><span class="tt-val">${agent.genome.sigma.toFixed(3)}</span></div>` +
    `<div class="tt-row"><span class="tt-key">Plastizität</span><span class="tt-val">${agent.genome.plasticity.toFixed(3)}</span></div>`
  );
}

function findNearestAgent(mx, my) {
  let nearest = null, minDist = Infinity;
  for (const a of state.agents) {
    const dx = a.x - mx, dy = a.y - my;
    const dist2    = dx * dx + dy * dy;
    const baseSize = 4 + Math.min(6, a.genome.hiddenUnits);
    const rad      = baseSize * (0.5 + a.genome.sizeGene) + 10;
    if (dist2 < rad * rad && dist2 < minDist) { nearest = a; minDist = dist2; }
  }
  return nearest;
}

function positionTooltip(anchorX, anchorY) {
  const tw = tooltip.offsetWidth  || 215;
  const th = tooltip.offsetHeight || 160;
  const margin = 12;
  let left = anchorX + margin;
  let top  = anchorY + margin;
  if (left + tw + margin > window.innerWidth)  left = anchorX - tw - margin;
  if (top  + th + margin > window.innerHeight) top  = anchorY - th - margin;
  tooltip.style.left = `${Math.max(margin, left)}px`;
  tooltip.style.top  = `${Math.max(margin, top)}px`;
}

function positionTooltipAtAgent(agent) {
  const rect = canvas.getBoundingClientRect();
  positionTooltip(rect.left + agent.x, rect.top + agent.y);
}

function updateSelectedTooltip() {
  if (!selectedAgent) return;
  if (!state.agents.includes(selectedAgent)) {
    selectedAgent = null;
    tooltip.style.display = 'none';
    return;
  }
  tooltip.innerHTML     = buildAgentTooltip(selectedAgent);
  tooltip.style.display = 'block';
  positionTooltipAtAgent(selectedAgent);
}

// ---------------------------------------------------------------------------
// Hauptschleife
// ---------------------------------------------------------------------------

function tick() {
  tpsCount++;
  const now = performance.now();
  if (now - lastTpsTime >= 1000) {
    tps         = tpsCount;
    tpsCount    = 0;
    lastTpsTime = now;
  }

  if (state.running) {
    for (let s = 0; s < state.ticksPerFrame; s++) {
      // Adaptiver Nahrungsspawn
      const targetFood = Math.min(
        state.params.maxFoodItems,
        Math.max(state.params.minFoodItems, state.agents.length * state.params.targetFoodPerAgent),
      );
      if (state.foods.length < targetFood && Math.random() < state.params.foodSpawnProb) spawnFood();

      for (let i = state.agents.length - 1; i >= 0; i--) {
        state.agents[i].update();
        if (state.agents[i].energy < 0) state.agents.splice(i, 1);
      }

      if (state.agents.length === 0) initSimulation(120, 300);
    }
  }

  render(selectedAgent);
  updateHUD();
  updateSelectedTooltip();
  updateGraph();
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Event-Handler
// ---------------------------------------------------------------------------

function setPaused(paused) {
  state.running = !paused;
  toggleBtn.innerHTML = state.running ? '&#9646;&#9646; Pause' : '&#9654; Start';
}

toggleBtn.addEventListener('click', () => setPaused(state.running));

paramPanel.style.display = 'none'; // inline-style sicherstellen für Toggle-Logik

paramBtn.addEventListener('click', () => {
  paramPanel.style.display = paramPanel.style.display === 'none' ? 'block' : 'none';
});

helpBtn.addEventListener('click', () => helpOverlay.classList.add('visible'));
helpClose.addEventListener('click', () => helpOverlay.classList.remove('visible'));
helpOverlay.addEventListener('click', (e) => {
  if (e.target === helpOverlay) helpOverlay.classList.remove('visible');
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    setPaused(state.running);
  }
});

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;
  if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) {
    if (!selectedAgent) tooltip.style.display = 'none';
    return;
  }
  if (selectedAgent) { updateSelectedTooltip(); return; }
  hoveredAgent = findNearestAgent(mx, my);
  if (hoveredAgent) {
    tooltip.innerHTML     = buildAgentTooltip(hoveredAgent);
    tooltip.style.display = 'block';
    positionTooltip(e.clientX, e.clientY);
  } else {
    tooltip.style.display = 'none';
  }
});

window.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

window.addEventListener('click', (e) => {
  // Klicks auf UI-Elemente ignorieren
  if (e.target !== canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;
  const nearest = findNearestAgent(mx, my);
  if (nearest) {
    selectedAgent         = nearest;
    tooltip.innerHTML     = buildAgentTooltip(selectedAgent);
    tooltip.style.display = 'block';
    positionTooltipAtAgent(selectedAgent);
  } else {
    selectedAgent = null;
    tooltip.style.display = 'none';
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

window.addEventListener('load', () => {
  buildSpeedButtons();
  buildParamPanel();
  initGraph();
  initSimulation(120, 300);
  requestAnimationFrame(tick);
});
