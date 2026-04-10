/**
 * Einstiegspunkt der Anwendung.
 * Verantwortlich für: HUD-Aktualisierung, Tooltip-Logik, Event-Handler und die Hauptschleife.
 */

import { canvas }                    from './canvas.js';
import { state }                     from './state.js';
import { render }                    from './render.js';
import { initSimulation, spawnFood } from './simulation.js';
import { getGroupName }              from './genome.js';
import {
  REPRODUCTION_THRESHOLD,
  SENSOR_DIRECTIONS, SENSOR_RANGE,
  START_ENERGY, FOOD_VALUE,
  STRUCT_MUT_PROB, HAZARD_BASE,
  FOOD_SPAWN_PROB,
} from './config.js';

// ---------------------------------------------------------------------------
// DOM-Elemente
// ---------------------------------------------------------------------------

const infoDiv    = document.getElementById('info');
const tooltip    = document.getElementById('tooltip');
const toggleBtn  = document.getElementById('toggleBtn');

// ---------------------------------------------------------------------------
// Zustand der UI-Schicht
// ---------------------------------------------------------------------------

let hoveredAgent  = null;
let selectedAgent = null;

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Baut den HTML-Inhalt des Agenten-Tooltips auf. */
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
    `Reproduktionen: ${agent.reproductions}`
  );
}

/** Gibt den nächstgelegenen Agenten an einer Canvas-Position zurück (oder null). */
function findNearestAgent(mx, my) {
  let nearest  = null;
  let minDist  = Infinity;
  for (const a of state.agents) {
    const dx       = a.x - mx;
    const dy       = a.y - my;
    const dist2    = dx * dx + dy * dy;
    const baseSize = 4 + Math.min(6, a.genome.hiddenUnits);
    const size     = baseSize * (0.5 + a.genome.sizeGene);
    const rad      = size + 10;
    if (dist2 < rad * rad && dist2 < minDist) { nearest = a; minDist = dist2; }
  }
  return nearest;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function updateHUD() {
  const { agents, foods } = state;
  if (agents.length === 0) return;

  let sumHidden = 0, sumAge = 0, sumSizeGene = 0;
  const groupCounts = {}, groupColors = {};

  for (const a of agents) {
    sumHidden   += a.genome.hiddenUnits;
    sumAge      += a.age;
    sumSizeGene += a.genome.sizeGene;
    const key = a.genome.shape;
    groupCounts[key] = (groupCounts[key] || 0) + 1;
    if (!groupColors[key]) groupColors[key] = a.color;
  }

  const n         = agents.length;
  const topGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let groupsHTML  = '';
  for (const [key, count] of topGroups) {
    const idx = parseInt(key);
    groupsHTML += `<span style="display:inline-block;width:12px;height:12px;` +
      `background:${groupColors[idx]};margin-right:4px;border:1px solid #fff;"></span>` +
      `${getGroupName(idx)}: ${count}<br>`;
  }

  const paramInfo =
    `Sensoren=${SENSOR_DIRECTIONS} | Reichweite=${SENSOR_RANGE}<br>` +
    `StartE=${START_ENERGY} | ReproSchwelle=${REPRODUCTION_THRESHOLD}<br>` +
    `FoodWert=${FOOD_VALUE} | StrukturMut=${STRUCT_MUT_PROB}<br>` +
    `HazardBasis=${HAZARD_BASE}`;

  infoDiv.innerHTML =
    `<div>` +
      `<strong>Agenten:</strong> ${n} &nbsp; <strong>Nahrung:</strong> ${foods.length}<br>` +
      `<strong>ø Hidden:</strong> ${(sumHidden / n).toFixed(2)} &nbsp;` +
      `<strong>ø Alter:</strong> ${(sumAge / n).toFixed(1)} &nbsp;` +
      `<strong>ø Größe:</strong> ${(sumSizeGene / n).toFixed(2)}<br>` +
      `<strong>Top-Gruppen:</strong><br>${groupsHTML}` +
    `</div>` +
    `<div style="margin-top:4px;font-size:12px;opacity:0.8;">` +
      `<strong>Parameter:</strong><br>${paramInfo}` +
    `</div>`;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

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
  if (state.running) {
    if (Math.random() < FOOD_SPAWN_PROB) spawnFood();

    for (let i = state.agents.length - 1; i >= 0; i--) {
      state.agents[i].update();
      if (state.agents[i].energy < 0) state.agents.splice(i, 1);
    }

    // Populationskollaps → Neustart
    if (state.agents.length === 0) initSimulation(120, 300);
  }

  render(selectedAgent);
  updateHUD();
  updateSelectedTooltip();
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

window.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

window.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) {
    selectedAgent = null;
    tooltip.style.display = 'none';
    return;
  }

  const nearest = findNearestAgent(mx, my);
  if (nearest) {
    selectedAgent         = nearest;
    tooltip.innerHTML     = buildAgentTooltip(selectedAgent);
    tooltip.style.display = 'block';
    positionTooltipAt(selectedAgent);
  } else {
    selectedAgent         = null;
    tooltip.style.display = 'none';
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

window.addEventListener('load', () => {
  initSimulation(120, 300);
  requestAnimationFrame(tick);
});
