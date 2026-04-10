import { canvas } from './canvas.js';
import { state }  from './state.js';
import { Agent }  from './agent.js';

/**
 * Spawnt ein Nahrungsteil – entweder geclustert nahe bestehender Nahrung
 * (Wahrscheinlichkeit state.params.foodClusterProb) oder zufällig auf dem Canvas.
 */
export function spawnFood() {
  if (state.foods.length >= state.params.maxFoodItems) return;

  let x, y;

  if (state.foods.length > 0 && Math.random() < state.params.foodClusterProb) {
    const anchor = state.foods[Math.floor(Math.random() * state.foods.length)];
    const angle  = Math.random() * Math.PI * 2;
    const dist   = Math.random() * state.params.foodClusterRadius;
    x = ((anchor.x + Math.cos(angle) * dist) % canvas.width  + canvas.width)  % canvas.width;
    y = ((anchor.y + Math.sin(angle) * dist) % canvas.height + canvas.height) % canvas.height;
  } else {
    x = Math.random() * canvas.width;
    y = Math.random() * canvas.height;
  }

  state.foods.push({ x, y });
}

/** Setzt die Simulation mit neuer Startpopulation und Nahrung zurück. */
export function initSimulation(initialAgents = 120, initialFood = 300) {
  state.agents = [];
  state.foods  = [];

  for (let i = 0; i < initialAgents; i++) {
    const agent = new Agent();
    agent.x     = Math.random() * canvas.width;
    agent.y     = Math.random() * canvas.height;
    agent.angle = Math.random() * Math.PI * 2;
    state.agents.push(agent);
  }

  for (let i = 0; i < initialFood; i++) spawnFood();
}
