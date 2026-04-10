import { clamp } from './utils.js';

/**
 * Feedforward-Netz mit gen-kodierter Aktivierungsfunktion und
 * einem separaten Lern-Buffer für plastisches In-Life-Lernen.
 *
 * Lamarckismus-Fix: Das Genom wird durch Lernen nicht verändert.
 * Gelernte Gewichte leben nur in learnedIH/learnedHO und sterben
 * mit dem Agenten – Kinder erben ausschließlich das Ursprungsgenom.
 */
export class NeuralNetwork {
  constructor(genome, inputSize, outputSize) {
    this.genome     = genome;
    this.inputSize  = inputSize;
    this.outputSize = outputSize;

    // Aktivierungszustand (wird bei forward() befüllt)
    this.lastInputs = new Array(inputSize).fill(0);
    this.lastHidden = new Array(genome.hiddenUnits).fill(0);
    this.lastOutput = new Array(outputSize).fill(0);

    // Separater Lern-Buffer – NICHT Teil des Genoms.
    // Speichert die durch plastisches Lernen akkumulierten Deltas.
    this.learnedIH     = Array.from({ length: genome.hiddenUnits }, () => new Array(inputSize).fill(0));
    this.learnedHO     = Array.from({ length: outputSize },         () => new Array(genome.hiddenUnits).fill(0));
    this.learnedBiasH  = new Array(genome.hiddenUnits).fill(0);
    this.learnedBiasO  = new Array(outputSize).fill(0);
  }

  // ---------------------------------------------------------------------------
  // Aktivierungsfunktion (gen-kodiert)
  // ---------------------------------------------------------------------------

  /** Wendet die im Genom kodierte Aktivierungsfunktion auf x an. */
  activate(x) {
    switch (this.genome.activationGene) {
      case 1: return Math.max(0, x);              // ReLU
      case 2: return 1 / (1 + Math.exp(-x));      // Sigmoid
      default: return Math.tanh(x);               // tanh (Standard)
    }
  }

  // ---------------------------------------------------------------------------
  // Vorwärtsdurchlauf
  // ---------------------------------------------------------------------------

  forward(inputs) {
    this.lastInputs = inputs.slice();

    // Input → Hidden (Genom-Gewichte + gelernte Deltas)
    const hidden = new Array(this.genome.hiddenUnits);
    for (let h = 0; h < this.genome.hiddenUnits; h++) {
      let sum = this.genome.biasHidden[h] + this.learnedBiasH[h];
      const wRow = this.genome.weightsIH[h];
      const lRow = this.learnedIH[h];
      for (let i = 0; i < this.inputSize; i++) sum += (wRow[i] + lRow[i]) * inputs[i];
      hidden[h] = this.activate(sum);
    }
    this.lastHidden = hidden;

    // Hidden → Output
    const outputs = new Array(this.outputSize);
    for (let o = 0; o < this.outputSize; o++) {
      let sum = this.genome.biasOutput[o] + this.learnedBiasO[o];
      const wRow = this.genome.weightsHO[o];
      const lRow = this.learnedHO[o];
      for (let h = 0; h < this.genome.hiddenUnits; h++) sum += (wRow[h] + lRow[h]) * hidden[h];
      outputs[o] = this.activate(sum);
    }
    this.lastOutput = outputs;
    return outputs;
  }

  // ---------------------------------------------------------------------------
  // Plastisches Lernen (Hebbian, belohnungsmoduliert)
  // ---------------------------------------------------------------------------

  /**
   * Aktualisiert ausschließlich den learnedIH/HO-Buffer.
   * Das Genom bleibt unverändert → keine Vererbung gelernter Inhalte.
   * @param {number} deltaEnergy – Energiegewinn dieses Ticks (0 = keine Nahrung)
   */
  plasticUpdate(deltaEnergy) {
    const alpha = this.genome.plasticity;
    if (alpha <= 0) return;

    const lr = alpha * (1 + deltaEnergy);

    // Input→Hidden-Buffer aktualisieren
    for (let h = 0; h < this.genome.hiddenUnits; h++) {
      const lRow = this.learnedIH[h];
      for (let i = 0; i < this.inputSize; i++) {
        lRow[i] = clamp(lRow[i] + lr * this.lastInputs[i] * this.lastHidden[h], -3, 3);
      }
      this.learnedBiasH[h] = clamp(this.learnedBiasH[h] + lr * this.lastHidden[h], -3, 3);
    }

    // Hidden→Output-Buffer aktualisieren
    for (let o = 0; o < this.outputSize; o++) {
      const lRow = this.learnedHO[o];
      for (let h = 0; h < this.genome.hiddenUnits; h++) {
        lRow[h] = clamp(lRow[h] + lr * this.lastHidden[h] * this.lastOutput[o], -3, 3);
      }
      this.learnedBiasO[o] = clamp(this.learnedBiasO[o] + lr * this.lastOutput[o], -3, 3);
    }
  }
}
