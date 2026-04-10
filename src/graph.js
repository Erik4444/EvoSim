import { state } from './state.js';

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const HISTORY_LENGTH = 300; // Anzahl der gespeicherten Ticks
const W = 240;
const H = 80;

// ---------------------------------------------------------------------------
// Interner Zustand
// ---------------------------------------------------------------------------

const history = {
  agents: new Array(HISTORY_LENGTH).fill(0),
  foods:  new Array(HISTORY_LENGTH).fill(0),
};

let graphCanvas = null;
let graphCtx    = null;

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/** Erstellt und hängt den Graph-Canvas ins DOM. Einmalig aufrufen. */
export function initGraph() {
  graphCanvas = document.createElement('canvas');
  graphCanvas.width  = W;
  graphCanvas.height = H;
  graphCanvas.style.cssText =
    'position:absolute;bottom:10px;left:10px;' +
    'background:rgba(0,0,0,0.65);border:1px solid #444;border-radius:4px;' +
    'pointer-events:none;';
  document.body.appendChild(graphCanvas);
  graphCtx = graphCanvas.getContext('2d');
}

/** Fügt aktuelle Werte zur History hinzu und zeichnet den Graph neu. */
export function updateGraph() {
  if (!graphCtx) return;

  // History schieben
  history.agents.push(state.agents.length);
  history.agents.shift();
  history.foods.push(state.foods.length);
  history.foods.shift();

  // Zeichnen
  graphCtx.clearRect(0, 0, W, H);

  const maxVal = Math.max(
    Math.max(...history.agents),
    Math.max(...history.foods),
    1,
  );

  drawLine(history.foods,  '#44cc44');
  drawLine(history.agents, '#ffffff');

  // Legende
  graphCtx.font      = '9px sans-serif';
  graphCtx.fillStyle = '#44cc44';
  graphCtx.fillText(`Nahrung: ${state.foods.length}`,  4, 12);
  graphCtx.fillStyle = '#ffffff';
  graphCtx.fillText(`Agenten: ${state.agents.length}`, 4, 23);

  function drawLine(data, color) {
    graphCtx.beginPath();
    graphCtx.strokeStyle = color;
    graphCtx.lineWidth   = 1.5;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * W;
      const y = H - (data[i] / maxVal) * (H - 6) - 3;
      if (i === 0) graphCtx.moveTo(x, y);
      else         graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
  }
}
