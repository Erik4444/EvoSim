import { state } from './state.js';

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const HISTORY_LENGTH = 300; // Anzahl der gespeicherten Ticks

// ---------------------------------------------------------------------------
// Interner Zustand
// ---------------------------------------------------------------------------

const history = {
  agents: new Array(HISTORY_LENGTH).fill(0),
  foods:  new Array(HISTORY_LENGTH).fill(0),
};

let graphCanvas = null;
let graphCtx    = null;

// Aktuelle Pixel-Dimensionen (werden via ResizeObserver aktuell gehalten)
let gW = 240;
let gH = 80;

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/** Erstellt und hängt den Graph-Canvas ins DOM. Einmalig aufrufen. */
export function initGraph() {
  graphCanvas = document.createElement('canvas');
  graphCanvas.width     = gW;
  graphCanvas.height    = gH;
  graphCanvas.className = 'graph-canvas';
  document.body.appendChild(graphCanvas);
  graphCtx = graphCanvas.getContext('2d');

  // ResizeObserver: CSS-Größe → Canvas-Pixel synchronisieren
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        gW = Math.round(width);
        gH = Math.round(height);
        graphCanvas.width  = gW;
        graphCanvas.height = gH;
        drawGraph(); // direkt neu zeichnen, ohne History-Update
      }
    }
  });
  ro.observe(graphCanvas);
}

/** Fügt aktuelle Werte zur History hinzu und zeichnet den Graph neu. */
export function updateGraph() {
  if (!graphCtx) return;

  history.agents.push(state.agents.length);
  history.agents.shift();
  history.foods.push(state.foods.length);
  history.foods.shift();

  drawGraph();
}

// ---------------------------------------------------------------------------
// Intern: Graph zeichnen (ohne History zu verändern)
// ---------------------------------------------------------------------------

function drawGraph() {
  if (!graphCtx) return;

  const W = gW;
  const H = gH;

  graphCtx.clearRect(0, 0, W, H);

  const maxVal = Math.max(
    Math.max(...history.agents),
    Math.max(...history.foods),
    1,
  );

  drawLine(history.foods,  '#66cc44');
  drawLine(history.agents, '#e8eaf0');

  // Legende
  const fontSize = Math.max(9, Math.round(H * 0.13));
  graphCtx.font      = `${fontSize}px sans-serif`;
  graphCtx.fillStyle = '#66cc44';
  graphCtx.fillText(`Nahrung: ${state.foods.length}`,  5, fontSize + 2);
  graphCtx.fillStyle = '#e8eaf0';
  graphCtx.fillText(`Agenten: ${state.agents.length}`, 5, fontSize * 2 + 4);

  function drawLine(data, color) {
    graphCtx.beginPath();
    graphCtx.strokeStyle = color;
    graphCtx.lineWidth   = H > 100 ? 2 : 1.5;
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * W;
      const y = H - (data[i] / maxVal) * (H - 8) - 4;
      if (i === 0) graphCtx.moveTo(x, y);
      else         graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
  }
}
