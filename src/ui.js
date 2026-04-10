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

const infoDiv   = document.getElementById('info');
const tooltip   = document.getElementById('tooltip');
const toggleBtn = document.getElementById('toggleBtn');

// ---------------------------------------------------------------------------
// Ticks/Sekunde Messung
// ---------------------------------------------------------------------------

let tpsCount = 0;
let tps      = 0;
let lastTpsTime = performance.now();

// ---------------------------------------------------------------------------
// Parameter-Panel
// ---------------------------------------------------------------------------

// Standardwerte sichern (für "Zurücksetzen")
const DEFAULT_PARAMS = { ...state.params };

function buildParamPanel() {
  // Toggle-Button neben dem Pause-Button
  const paramBtn = document.createElement('button');
  paramBtn.textContent = '⚙';
  paramBtn.title = 'Parameter';
  paramBtn.style.cssText =
    'position:absolute;top:10px;right:70px;z-index:10;font-size:14px;padding:4px 8px;';
  document.body.appendChild(paramBtn);

  // Panel-Container
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:absolute;top:42px;right:10px;background:rgba(0,0,0,0.88);' +
    'border:1px solid #555;border-radius:6px;padding:10px 12px;font-size:12px;' +
    'min-width:240px;display:none;z-index:20;';
  document.body.appendChild(panel);

  paramBtn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  // Slider-Definitionen
  const sliders = [
    { label: 'Nahrungsspawn',    key: 'foodSpawnProb',         min: 0.005, max: 0.3,    step: 0.005, decimals: 3 },
    { label: 'Cluster-Prob',     key: 'foodClusterProb',       min: 0,     max: 1,      step: 0.05,  decimals: 2 },
    { label: 'Sensorreichweite', key: 'sensorRange',           min: 30,    max: 300,    step: 5,     decimals: 0 },
    { label: 'Hazard',           key: 'hazardBase',            min: 1e-5,  max: 5e-4,   step: 1e-5,  decimals: 5 },
    { label: 'Repro-Schwelle',   key: 'reproductionThreshold', min: 2,     max: 12,     step: 0.5,   decimals: 1 },
    { label: 'Nahrungswert',     key: 'foodValue',             min: 0.5,   max: 4,      step: 0.1,   decimals: 1 },
  ];

  const inputs = {}; // key → { input, valSpan }

  for (const { label, key, min, max, step, decimals } of sliders) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;gap:6px;';

    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.cssText = 'flex:0 0 120px;';

    const input = document.createElement('input');
    input.type  = 'range';
    input.min   = min;
    input.max   = max;
    input.step  = step;
    input.value = state.params[key];
    input.style.cssText = 'flex:1;cursor:pointer;';

    const valSpan = document.createElement('span');
    valSpan.style.cssText = 'flex:0 0 52px;text-align:right;font-family:monospace;';
    valSpan.textContent   = Number(state.params[key]).toFixed(decimals);

    input.addEventListener('input', () => {
      state.params[key]   = parseFloat(input.value);
      valSpan.textContent = parseFloat(input.value).toFixed(decimals);
    });

    row.append(lbl, input, valSpan);
    panel.appendChild(row);
    inputs[key] = { input, valSpan, decimals };
  }

  // Zurücksetzen
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Zurücksetzen';
  resetBtn.style.cssText = 'margin-top:6px;width:100%;padding:3px;cursor:pointer;';
  resetBtn.addEventListener('click', () => {
    Object.assign(state.params, DEFAULT_PARAMS);
    for (const [key, { input, valSpan, decimals }] of Object.entries(inputs)) {
      input.value         = state.params[key];
      valSpan.textContent = Number(state.params[key]).toFixed(decimals);
    }
  });
  panel.appendChild(resetBtn);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function updateHUD() {
  const { agents, foods } = state;
  const n = agents.length;
  if (n === 0) return;

  // Statistiken berechnen
  let sumHidden = 0, sumAge = 0, sumSizeGene = 0;
  const groupCounts = {}, groupColors = {};
  const actCounts   = new Array(ACTIVATIONS.length).fill(0);

  for (const a of agents) {
    sumHidden   += a.genome.hiddenUnits;
    sumAge      += a.age;
    sumSizeGene += a.genome.sizeGene;
    actCounts[a.genome.activationGene]++;
    const key = a.genome.shape;
    groupCounts[key] = (groupCounts[key] || 0) + 1;
    if (!groupColors[key]) groupColors[key] = a.color;
  }

  // Top-Gruppen
  const topGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  let groupsHTML  = '';
  for (const [key, count] of topGroups) {
    const idx = parseInt(key);
    groupsHTML +=
      `<span style="display:inline-block;width:10px;height:10px;` +
      `background:${groupColors[idx]};margin-right:3px;border:1px solid #fff;vertical-align:middle;"></span>` +
      `${getGroupName(idx)}: ${count}<br>`;
  }

  // Aktivierungsverteilung
  const actHTML = ACTIVATIONS.map((name, i) => {
    const pct  = ((actCounts[i] / n) * 100).toFixed(0);
    const fill = Math.round(actCounts[i] / n * 8);
    const bar  = '█'.repeat(fill) + '░'.repeat(8 - fill);
    return `${name}: <span style="font-family:monospace">${bar}</span> ${pct}%`;
  }).join('<br>');

  infoDiv.innerHTML =
    `<div style="margin-bottom:4px;">` +
      `<strong>${n}</strong> Agenten &nbsp;` +
      `<strong>${foods.length}</strong> Nahrung &nbsp;` +
      `<strong>${tps}</strong> T/s` +
    `</div>` +
    `<div style="margin-bottom:4px;">` +
      `ø Hidden: <strong>${(sumHidden / n).toFixed(1)}</strong> &nbsp; ` +
      `ø Alter: <strong>${(sumAge / n).toFixed(0)}</strong> &nbsp; ` +
      `ø Größe: <strong>${(sumSizeGene / n).toFixed(2)}</strong>` +
    `</div>` +
    `<div style="margin-bottom:4px;"><strong>Gruppen:</strong><br>${groupsHTML}</div>` +
    `<div style="font-size:11px;"><strong>Aktivierung:</strong><br>${actHTML}</div>`;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

let hoveredAgent  = null;
let selectedAgent = null;

function buildAgentTooltip(agent) {
  const group = getGroupName(agent.genome.shape);
  return (
    `<strong>${agent.name}</strong> (<em>${group}</em>)<br>` +
    `Energie: ${agent.energy.toFixed(2)}<br>` +
    `Alter: ${agent.age}<br>` +
    `Hidden Units: ${agent.genome.hiddenUnits}<br>` +
    `Sigma: ${agent.genome.sigma.toFixed(3)}<br>` +
    `Plastizität: ${agent.genome.plasticity.toFixed(3)}<br>` +
    `GrößeGen: ${agent.genome.sizeGene.toFixed(3)}<br>` +
    `FarbGen: ${agent.genome.colorGene.toFixed(3)}<br>` +
    `Aktivierung: ${ACTIVATIONS[agent.genome.activationGene]}<br>` +
    `Reproduktionen: ${agent.reproductions}`
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

function positionTooltipAt(agent) {
  const rect = canvas.getBoundingClientRect();
  tooltip.style.left = `${rect.left + agent.x + 15}px`;
  tooltip.style.top  = `${rect.top  + agent.y + 15}px`;
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
  positionTooltipAt(selectedAgent);
}

// ---------------------------------------------------------------------------
// Hauptschleife
// ---------------------------------------------------------------------------

function tick() {
  // Ticks/Sek messen
  tpsCount++;
  const now = performance.now();
  if (now - lastTpsTime >= 1000) {
    tps         = tpsCount;
    tpsCount    = 0;
    lastTpsTime = now;
  }

  if (state.running) {
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

  render(selectedAgent);
  updateHUD();
  updateSelectedTooltip();
  updateGraph();
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Event-Handler
// ---------------------------------------------------------------------------

toggleBtn.addEventListener('click', () => {
  state.running = !state.running;
  toggleBtn.textContent = state.running ? 'Pause' : 'Start';
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    state.running = !state.running;
    toggleBtn.textContent = state.running ? 'Pause' : 'Start';
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
    tooltip.style.left    = `${e.clientX + 15}px`;
    tooltip.style.top     = `${e.clientY + 15}px`;
  } else {
    tooltip.style.display = 'none';
  }
});

window.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

window.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;
  if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) {
    selectedAgent = null; tooltip.style.display = 'none'; return;
  }
  const nearest = findNearestAgent(mx, my);
  if (nearest) {
    selectedAgent         = nearest;
    tooltip.innerHTML     = buildAgentTooltip(selectedAgent);
    tooltip.style.display = 'block';
    positionTooltipAt(selectedAgent);
  } else {
    selectedAgent = null; tooltip.style.display = 'none';
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

window.addEventListener('load', () => {
  buildParamPanel();
  initGraph();
  initSimulation(120, 300);
  requestAnimationFrame(tick);
});
