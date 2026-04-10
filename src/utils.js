// Reine Hilfsfunktionen ohne Seiteneffekte.

/** Box-Muller-Methode: liefert normalverteilte Zufallszahl (μ=0, σ=1). */
export function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Begrenzt x auf den Bereich [min, max]. */
export function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

/**
 * Toroidales Spielfeld: Objekt bleibt innerhalb der Canvas-Grenzen.
 * width/height werden als Parameter übergeben statt direkt auf canvas zuzugreifen.
 */
export function wrapPosition(obj, width, height) {
  if (obj.x < 0)       obj.x += width;
  else if (obj.x >= width)  obj.x -= width;
  if (obj.y < 0)       obj.y += height;
  else if (obj.y >= height) obj.y -= height;
}

/** Gibt das Quadrat der euklidischen Distanz zurück (ohne sqrt, für Vergleiche). */
export function distanceSquared(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}
