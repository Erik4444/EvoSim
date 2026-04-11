import { canvas, ctx } from './canvas.js';
import { state }       from './state.js';
import { FOOD_RADIUS } from './config.js';

// ---------------------------------------------------------------------------
// Formen zeichnen
// ---------------------------------------------------------------------------

/**
 * Zeichnet eine der sechs Grundformen an Position (x, y) mit Radius size.
 * fillColor und strokeColor sind optional (null = nicht zeichnen).
 */
export function drawShape(x, y, size, shapeIndex, fillColor, strokeColor) {
  ctx.beginPath();
  switch (shapeIndex) {
    case 0: // Kreis
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
    case 1: // Quadrat
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 2: // Dreieck
      ctx.moveTo(x,        y - size);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      break;
    case 3: // Fünfeck
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + size * Math.cos(a), y + size * Math.sin(a));
        else         ctx.lineTo(x + size * Math.cos(a), y + size * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 4: // Sechseck
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + size * Math.cos(a), y + size * Math.sin(a));
        else         ctx.lineTo(x + size * Math.cos(a), y + size * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 5: { // Stern (5-zackig)
      const outer = size;
      const inner = size * 0.5;
      for (let i = 0; i < 5; i++) {
        const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(x + outer * Math.cos(a1), y + outer * Math.sin(a1));
        else         ctx.lineTo(x + outer * Math.cos(a1), y + outer * Math.sin(a1));
        const a2 = a1 + Math.PI / 5;
        ctx.lineTo(x + inner * Math.cos(a2), y + inner * Math.sin(a2));
      }
      ctx.closePath();
      break;
    }
    default:
      ctx.arc(x, y, size, 0, Math.PI * 2);
  }
  if (fillColor)   { ctx.fillStyle   = fillColor;   ctx.fill(); }
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke(); }
}

// ---------------------------------------------------------------------------
// Haupt-Render-Funktion
// ---------------------------------------------------------------------------

/**
 * Zeichnet einen vollständigen Frame.
 * @param {Agent|null} selectedAgent – wird gelb hervorgehoben, wenn gesetzt.
 */
export function render(selectedAgent) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Nahrung – leuchtend gelbgrün
  ctx.shadowBlur  = 7;
  ctx.shadowColor = '#aaff55';
  ctx.fillStyle   = '#88ee33';
  for (const f of state.foods) {
    ctx.beginPath();
    ctx.arc(f.x, f.y, FOOD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Agenten
  for (const a of state.agents) {
    const baseSize = 4 + Math.min(6, a.genome.hiddenUnits);
    const size     = baseSize * (0.5 + a.genome.sizeGene);

    // Auswahlring
    if (selectedAgent === a) {
      ctx.shadowBlur  = 14;
      ctx.shadowColor = '#ffff00';
      drawShape(a.x, a.y, size + 4, a.genome.shape, null, '#ffff00');
      ctx.shadowBlur = 0;
    }

    // Körper mit Glow in Eigenfarbe
    ctx.shadowBlur  = 10;
    ctx.shadowColor = a.color;
    drawShape(a.x, a.y, size, a.genome.shape, a.color, null);
    ctx.shadowBlur = 0;

    // Richtungsanzeige (leicht eingefärbt statt reinem Weiß)
    ctx.strokeStyle = a.color + '99';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + Math.cos(a.angle) * size * 1.8, a.y + Math.sin(a.angle) * size * 1.8);
    ctx.stroke();
  }

  // Pause-Overlay
  if (!state.running) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font      = 'bold 28px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(232, 234, 240, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏸ PAUSIERT', canvas.width / 2, canvas.height / 2);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
