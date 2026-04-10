import { canvas } from './canvas.js';
import { state }  from './state.js';
import { Agent }  from './agent.js';
import { MAX_FOOD_ITEMS } from './config.js';

/** Fügt ein Nahrungsteil an zufälliger Position hinzu (falls Limit nicht erreicht). */
export function spawnFood() {
  if (state.foods.length >= MAX_FOOD_ITEMS) return;
  state.foods.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
  });
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
