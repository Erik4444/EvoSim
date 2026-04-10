import { canvas } from './canvas.js';
import { state }  from './state.js';
import { Genome } from './genome.js';
import { NeuralNetwork } from './neural.js';
import { wrapPosition } from './utils.js';
import {
  SENSOR_DIRECTIONS, SENSOR_RANGE,
  START_ENERGY, REPRODUCTION_THRESHOLD, CHILD_ENERGY,
  FOOD_VALUE, FOOD_RADIUS,
  BASE_COST, MOVE_COST_FACTOR, MAX_SPEED, MAX_TURN_RATE,
  HAZARD_BASE, HAZARD_GAMMA, HAZARD_KAPPA,
  SHAPES,
} from './config.js';

// Eingabe- und Ausgabegröße des neuronalen Netzes.
// 8 Nahrungssensoren + 8 Agentsensoren + Energielevel + Rauschen
export const INPUT_SIZE  = SENSOR_DIRECTIONS * 2 + 2;
export const OUTPUT_SIZE = 2; // [Drehung, Vortrieb]

// ---------------------------------------------------------------------------
// Sensorik
// ---------------------------------------------------------------------------

/**
 * Berechnet den Eingabevektor für den Agenten.
 * Jeder der SENSOR_DIRECTIONS Sektoren erhält einen Wert für Nahrung und
 * andere Agenten, gewichtet nach Distanz (nah = stärker).
 */
export function computeSensors(agent) {
  const foodSensors  = new Array(SENSOR_DIRECTIONS).fill(0);
  const agentSensors = new Array(SENSOR_DIRECTIONS).fill(0);
  const w = canvas.width;
  const h = canvas.height;
  const range   = SENSOR_RANGE * (0.5 + agent.genome.sizeGene);
  const rangeSq = range * range;
  const halfW   = w / 2;
  const halfH   = h / 2;
  const TWO_PI  = Math.PI * 2;

  // Hilfsfunktion: toroidale Deltakomponente → Sektor + Gewicht
  function accumulateSensor(sensors, tx, ty) {
    let dx = tx - agent.x;
    let dy = ty - agent.y;
    if (dx >  halfW) dx -= w; else if (dx < -halfW) dx += w;
    if (dy >  halfH) dy -= h; else if (dy < -halfH) dy += h;
    const distSq = dx * dx + dy * dy;
    if (distSq <= 0 || distSq >= rangeSq) return;
    const dist   = Math.sqrt(distSq);
    const a      = ((Math.atan2(dy, dx) - agent.angle) % TWO_PI + TWO_PI) % TWO_PI;
    const sector = Math.floor(a / TWO_PI * SENSOR_DIRECTIONS);
    sensors[sector] += (range - dist) / range;
  }

  for (const f of state.foods)                         accumulateSensor(foodSensors,  f.x, f.y);
  for (const o of state.agents) if (o !== agent)       accumulateSensor(agentSensors, o.x, o.y);

  // Auf [0, 1] begrenzen
  for (let i = 0; i < SENSOR_DIRECTIONS; i++) {
    if (foodSensors[i]  > 1) foodSensors[i]  = 1;
    if (agentSensors[i] > 1) agentSensors[i] = 1;
  }

  return [
    ...foodSensors,
    ...agentSensors,
    agent.energy / REPRODUCTION_THRESHOLD, // normiertes Energielevel (> 1 möglich)
    Math.random() * 2 - 1,                 // Rauschen [-1, 1]
  ];
}

// ---------------------------------------------------------------------------
// Agent-Klasse
// ---------------------------------------------------------------------------

const FOOD_RADIUS_SQ = FOOD_RADIUS * FOOD_RADIUS;

export class Agent {
  constructor(genome = null) {
    this.x            = 0;
    this.y            = 0;
    this.angle        = Math.random() * Math.PI * 2;
    this.energy       = START_ENERGY;
    this.age          = 0;
    this.reproductions = 0;
    this.genome       = genome ?? Genome.random(INPUT_SIZE, OUTPUT_SIZE);
    this.brain        = new NeuralNetwork(this.genome, INPUT_SIZE, OUTPUT_SIZE);
    this.color        = this.genome.color;
    this.name         = 'Agent' + state.nextAgentId++;
  }

  update() {
    // Sensorik → Netz → Steuerung
    const outputs = this.brain.forward(computeSensors(this));
    const turn    = outputs[0];
    const thrust  = (outputs[1] + 1) / 2; // tanh → [0, 1]

    // Gen-basierte Faktoren (colorGene bestimmt nur die Farbe, nicht mehr die Kosten)
    const sizeFactor  = 1 + this.genome.sizeGene;           // [1, 2]  – größer = langsamer & teurer
    const shapeFactor = 1 + this.genome.shape / SHAPES.length; // [1, ~1.83] – komplexer = langsamer

    // Rotation
    this.angle += turn * MAX_TURN_RATE;
    if      (this.angle < -Math.PI) this.angle += Math.PI * 2;
    else if (this.angle >  Math.PI) this.angle -= Math.PI * 2;

    // Bewegung (größere/komplexere Agenten sind langsamer)
    const speed = Math.min(thrust, 1) * MAX_SPEED / (sizeFactor * shapeFactor);
    this.x += Math.cos(this.angle) * speed;
    this.y += Math.sin(this.angle) * speed;
    wrapPosition(this, canvas.width, canvas.height);

    // Energieverbrauch (nur Größe treibt die Kosten, nicht mehr die Farbe)
    this.energy -= BASE_COST * sizeFactor + speed * speed * MOVE_COST_FACTOR * sizeFactor;

    // Nahrung aufnehmen
    let energyGain = 0;
    for (let i = state.foods.length - 1; i >= 0; i--) {
      const f = state.foods[i];
      const dx = this.x - f.x;
      const dy = this.y - f.y;
      if (dx * dx + dy * dy < FOOD_RADIUS_SQ) {
        this.energy += FOOD_VALUE;
        energyGain  += FOOD_VALUE;
        state.foods.splice(i, 1);
      }
    }

    // In-Life-Lernen (belohnungsmoduliert)
    this.brain.plasticUpdate(energyGain);

    // Fortpflanzung (fixe Schwelle – kein versteckter Fitness-Faktor durch Farbe)
    const reproThreshold = REPRODUCTION_THRESHOLD;
    if (this.energy >= reproThreshold) {
      this.energy -= CHILD_ENERGY;
      const child = new Agent(this.genome.mutate());
      child.x = this.x + (Math.random() - 0.5) * 10;
      child.y = this.y + (Math.random() - 0.5) * 10;
      wrapPosition(child, canvas.width, canvas.height);
      state.agents.push(child);
      this.reproductions++;
    }

    // Stochastischer Hazard (alters- und energieabhängig)
    const hazard = HAZARD_BASE
      * Math.exp(HAZARD_GAMMA * this.age)
      * Math.exp(-HAZARD_KAPPA * this.energy);
    if (Math.random() < hazard || this.energy <= 0) this.energy = -1;

    this.age++;
  }
}
