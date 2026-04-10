// Canvas-Einrichtung. Alle anderen Module importieren canvas/ctx von hier.

export const canvas = document.getElementById('sim');
export const ctx    = canvas.getContext('2d');

export function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
