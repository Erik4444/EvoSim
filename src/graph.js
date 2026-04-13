import { state } from './state.js';
import { getGroupName } from './genome.js';
import { SHAPES } from './config.js';

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const HISTORY_LENGTH = 300;

// ---------------------------------------------------------------------------
// Interner Zustand
// ---------------------------------------------------------------------------

const history = {
  agents:  new Array(HISTORY_LENGTH).fill(0),
  foods:   new Array(HISTORY_LENGTH).fill(0),
  // Pro Form-Index ein Ringpuffer
  species: Array.from({ length: SHAPES.length }, () => new Array(HISTORY_LENGTH).fill(0)),
};

// Letzte bekannte Farbe je Spezies (bleibt erhalten wenn Spezies ausstirbt)
const speciesColors = new Array(SHAPES.length).fill('#888');

let graphCanvas = null;
let graphCtx    = null;
let gW = 240;
let gH = 80;

// 0 = Population + Nahrung, 1 = Arten-Verlauf
let graphMode = 0;

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

export function initGraph() {
  graphCanvas = document.createElement('canvas');
  graphCanvas.width     = gW;
  graphCanvas.height    = gH;
  graphCanvas.className = 'graph-canvas';
  document.body.appendChild(graphCanvas);
  graphCtx = graphCanvas.getContext('2d');

  // Klick → Modus umschalten
  graphCanvas.addEventListener('click', () => {
    graphMode = 1 - graphMode;
    drawGraph();
  });

  // ResizeObserver: CSS-Größe → Canvas-Pixel synchronisieren
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        gW = Math.round(width);
        gH = Math.round(height);
        graphCanvas.width  = gW;
        graphCanvas.height = gH;
        drawGraph();
      }
    }
  });
  ro.observe(graphCanvas);
}

export function updateGraph() {
  if (!graphCtx) return;

  // Populations-History
  history.agents.push(state.agents.length);
  history.agents.shift();
  history.foods.push(state.foods.length);
  history.foods.shift();

  // Arten-History: zähle Agenten pro Form-Index
  const counts = new Array(SHAPES.length).fill(0);
  for (const a of state.agents) {
    counts[a.genome.shape]++;
    // Farbe merken (letzte bekannte)
    speciesColors[a.genome.shape] = a.color;
  }
  for (let s = 0; s < SHAPES.length; s++) {
    history.species[s].push(counts[s]);
    history.species[s].shift();
  }

  drawGraph();
}

// ---------------------------------------------------------------------------
// Intern: zeichnen
// ---------------------------------------------------------------------------

function drawGraph() {
  if (!graphCtx) return;
  graphMode === 0 ? drawPopGraph() : drawSpeciesGraph();
}

function drawPopGraph() {
  const W = gW, H = gH;
  graphCtx.clearRect(0, 0, W, H);

  const maxVal = Math.max(Math.max(...history.agents), Math.max(...history.foods), 1);
  drawLine(history.foods,  '#66cc44');
  drawLine(history.agents, '#e8eaf0');

  const fs = Math.max(9, Math.round(H * 0.13));
  graphCtx.font = `${fs}px sans-serif`;
  graphCtx.fillStyle = '#66cc44';
  graphCtx.fillText(`Nahrung: ${state.foods.length}`, 5, fs + 2);
  graphCtx.fillStyle = '#e8eaf0';
  graphCtx.fillText(`Agenten: ${state.agents.length}`, 5, fs * 2 + 4);

  drawModeHint('Arten →');

  function drawLine(data, color) {
    graphCtx.beginPath();
    graphCtx.strokeStyle = color;
    graphCtx.lineWidth   = H > 100 ? 2 : 1.5;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * W;
      const y = H - (data[i] / maxVal) * (H - 8) - 4;
      if (i === 0) graphCtx.moveTo(x, y); else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
  }
}

function drawSpeciesGraph() {
  const W = gW, H = gH;
  graphCtx.clearRect(0, 0, W, H);

  // Welche Spezies hatten jemals Agenten?
  const active = [];
  for (let s = 0; s < SHAPES.length; s++) {
    if (history.species[s].some(v => v > 0)) active.push(s);
  }

  if (active.length === 0) {
    graphCtx.fillStyle = 'rgba(232,234,240,0.4)';
    graphCtx.font = '10px sans-serif';
    graphCtx.fillText('Keine Daten', 8, H / 2);
    drawModeHint('← Pop');
    return;
  }

  const maxVal = Math.max(...active.flatMap(s => history.species[s]), 1);

  for (const s of active) {
    drawLine(history.species[s], speciesColors[s]);
  }

  // Legende: nur aktuell lebende Spezies (sortiert nach Größe), max 4
  const legendItems = active
    .map(s => ({ s, count: history.species[s][history.species[s].length - 1] }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const fs = Math.max(9, Math.round(H * 0.11));
  graphCtx.font = `${fs}px sans-serif`;
  legendItems.forEach(({ s, count }, i) => {
    const y = fs * (i + 1) + i * 2;
    graphCtx.fillStyle = speciesColors[s];
    graphCtx.fillRect(5, y - fs + 2, fs - 2, fs - 2);
    graphCtx.fillStyle = 'rgba(232,234,240,0.85)';
    graphCtx.fillText(`${getGroupName(s)}: ${count}`, fs + 8, y);
  });

  drawModeHint('← Pop');

  function drawLine(data, color) {
    graphCtx.beginPath();
    graphCtx.strokeStyle = color;
    graphCtx.lineWidth   = H > 100 ? 2 : 1.5;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * W;
      const y = H - (data[i] / maxVal) * (H - 8) - 4;
      if (i === 0) graphCtx.moveTo(x, y); else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
  }
}

function drawModeHint(text) {
  const fs = Math.max(8, Math.round(gH * 0.10));
  graphCtx.font      = `${fs}px sans-serif`;
  graphCtx.fillStyle = 'rgba(232,234,240,0.28)';
  const tw = graphCtx.measureText(text).width;
  graphCtx.fillText(text, gW - tw - 5, gH - 4);
}
