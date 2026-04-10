import {
  MAX_HIDDEN_UNITS, MIN_HIDDEN_UNITS, WEIGHT_MUT_RATE, SIGMA_MUTATION,
  PLASTIC_MUT_RATE, STRUCT_MUT_PROB,
  COLOR_MUTATION_RATE, COLOR_MUTATION_STDDEV,
  SIZE_MUTATION_RATE, SIZE_MUTATION_STDDEV,
  SHAPE_MUT_PROB, SHAPES, GROUP_NAME_POOL,
  ACTIVATIONS, ACTIVATION_MUT_PROB,
} from './config.js';
import { randn_bm, clamp } from './utils.js';
import { state } from './state.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Gibt den Gruppennamen für einen Form-Index zurück (lazy-erstellt). */
export function getGroupName(key) {
  const k = String(key);
  if (!state.groupNames[k]) {
    state.groupNames[k] = state.groupNameIndex < GROUP_NAME_POOL.length
      ? GROUP_NAME_POOL[state.groupNameIndex++]
      : 'Art' + (++state.groupNameIndex - GROUP_NAME_POOL.length);
  }
  return state.groupNames[k];
}

/**
 * Berechnet die Farbe eines Genoms aus Form und Farbgen.
 * Ähnliche Genome → ähnliche Farben; Gewichte haben keinen Einfluss.
 */
export function genomeToColor(genome) {
  const hue   = ((genome.shape / SHAPES.length) + (genome.colorGene ?? 0)) % 1;
  const angle = hue * 2 * Math.PI;
  const r = Math.floor(128 + 127 * Math.sin(angle));
  const g = Math.floor(128 + 127 * Math.sin(angle + 2));
  const b = Math.floor(128 + 127 * Math.sin(angle + 4));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Genome-Klasse
// ---------------------------------------------------------------------------

/**
 * Enthält die genetische Information eines Agenten:
 * – Netzarchitektur (Gewichte, Biases, Anzahl Hidden-Neuronen)
 * – Mutationsparameter (sigma, plasticity)
 * – Phänotyp-Gene (shape, colorGene, sizeGene)
 */
export class Genome {
  constructor(
    hiddenUnits, weightsIH, weightsHO, biasHidden, biasOutput,
    sigma, plasticity,
    shape = 0, colorGene = Math.random(), sizeGene = Math.random(),
    activationGene = 0,
  ) {
    this.hiddenUnits = hiddenUnits;
    this.weightsIH   = weightsIH;   // [hiddenUnits][inputSize]
    this.weightsHO   = weightsHO;   // [outputSize][hiddenUnits]
    this.biasHidden  = biasHidden;  // [hiddenUnits]
    this.biasOutput  = biasOutput;  // [outputSize]
    this.sigma       = sigma;       // Mutationsstärke für Gewichte
    this.plasticity  = plasticity;  // Lernrate (0 = kein in-life-Lernen)
    this.shape       = shape;       // Index in SHAPES[]
    this.colorGene   = colorGene;   // [0, 1)
    this.sizeGene       = sizeGene;       // [0, 1]
    this.activationGene = activationGene; // Index in ACTIVATIONS[]
    this.color          = genomeToColor(this);
  }

  /** Tiefe Kopie dieses Genoms. */
  copy() {
    const copyMatrix = (m) => m.map((row) => row.slice());
    return new Genome(
      this.hiddenUnits,
      copyMatrix(this.weightsIH),
      copyMatrix(this.weightsHO),
      this.biasHidden.slice(),
      this.biasOutput.slice(),
      this.sigma,
      this.plasticity,
      this.shape,
      this.colorGene,
      this.sizeGene,
      this.activationGene,
    );
  }

  /** Erzeugt ein zufälliges Startgenom. */
  static random(inputSize, outputSize) {
    const hidden = Math.floor(Math.random() * (MAX_HIDDEN_UNITS - MIN_HIDDEN_UNITS + 1)) + MIN_HIDDEN_UNITS;
    const rand   = () => randn_bm() * 0.5;
    const matrix = (rows, cols) => Array.from({ length: rows }, () => Array.from({ length: cols }, rand));

    return new Genome(
      hidden,
      matrix(hidden, inputSize),
      matrix(outputSize, hidden),
      Array.from({ length: hidden },    rand),
      Array.from({ length: outputSize }, rand),
      WEIGHT_MUT_RATE,
      Math.random() < 0.1 ? Math.abs(randn_bm() * 0.01) : 0.0,
      Math.floor(Math.random() * SHAPES.length),
      Math.random(),
      Math.random(),
      Math.floor(Math.random() * ACTIVATIONS.length),
    );
  }

  /** Gibt eine mutierte Kopie zurück (Original bleibt unverändert). */
  mutate() {
    const g = this.copy();

    // Mutationsstärke adaptiv anpassen (log-normal)
    g.sigma = clamp(g.sigma * Math.exp(randn_bm() * SIGMA_MUTATION), 0.001, 1.0);

    // Plastizität mutieren
    if (Math.random() < PLASTIC_MUT_RATE) {
      g.plasticity = clamp(g.plasticity + randn_bm() * 0.02, 0, 0.2);
    }

    // Gewichte und Biases mutieren
    for (let i = 0; i < g.hiddenUnits; i++) {
      for (let j = 0; j < g.weightsIH[i].length; j++) g.weightsIH[i][j] += randn_bm() * g.sigma;
      g.biasHidden[i] += randn_bm() * g.sigma;
    }
    for (let i = 0; i < g.weightsHO.length; i++) {
      for (let j = 0; j < g.hiddenUnits; j++) g.weightsHO[i][j] += randn_bm() * g.sigma;
      g.biasOutput[i] += randn_bm() * g.sigma;
    }

    // Strukturelle Mutation: Hidden-Neuron hinzufügen oder entfernen
    if (Math.random() < STRUCT_MUT_PROB) {
      if (Math.random() < 0.5 && g.hiddenUnits < MAX_HIDDEN_UNITS) {
        // Neuron hinzufügen
        const inputSize = g.weightsIH[0].length;
        g.hiddenUnits++;
        g.weightsIH.push(Array.from({ length: inputSize }, () => randn_bm() * 0.5));
        g.biasHidden.push(randn_bm() * 0.5);
        for (const row of g.weightsHO) row.push(randn_bm() * 0.5);
      } else if (g.hiddenUnits > MIN_HIDDEN_UNITS) {
        // Neuron entfernen
        const idx = Math.floor(Math.random() * g.hiddenUnits);
        g.hiddenUnits--;
        g.weightsIH.splice(idx, 1);
        g.biasHidden.splice(idx, 1);
        for (const row of g.weightsHO) row.splice(idx, 1);
      }
    }

    // Farb-Gen mutieren (wrap in [0, 1))
    if (Math.random() < COLOR_MUTATION_RATE) {
      g.colorGene = ((g.colorGene + randn_bm() * COLOR_MUTATION_STDDEV) % 1 + 1) % 1;
    }

    // Größen-Gen mutieren (clamp in [0, 1])
    if (Math.random() < SIZE_MUTATION_RATE) {
      g.sizeGene = clamp(g.sizeGene + randn_bm() * SIZE_MUTATION_STDDEV, 0, 1);
    }

    // Form mutieren
    if (Math.random() < SHAPE_MUT_PROB) {
      g.shape = Math.random() < 0.5
        ? (g.shape + (Math.random() < 0.5 ? 1 : -1) + SHAPES.length) % SHAPES.length
        : Math.floor(Math.random() * SHAPES.length);
    }

    // Aktivierungsfunktion selten mutieren
    if (Math.random() < ACTIVATION_MUT_PROB) {
      g.activationGene = Math.floor(Math.random() * ACTIVATIONS.length);
    }

    g.color = genomeToColor(g);
    return g;
  }
}
