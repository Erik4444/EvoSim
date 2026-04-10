import { clamp } from './utils.js';

/**
 * Kleines Feedforward-Netz (Input → Hidden → Output) mit tanh-Aktivierung.
 * Greift direkt auf genome.weights* zu, damit plastisches Lernen innerhalb
 * des Lebens die Gewichte verändern kann.
 */
export class NeuralNetwork {
  constructor(genome, inputSize, outputSize) {
    this.genome     = genome;
    this.inputSize  = inputSize;
    this.outputSize = outputSize;
    this.lastInputs = new Array(inputSize).fill(0);
    this.lastHidden = new Array(genome.hiddenUnits).fill(0);
    this.lastOutput = new Array(outputSize).fill(0);
  }

  /** Vorwärtsdurchlauf; gibt Output-Array zurück. */
  forward(inputs) {
    this.lastInputs = inputs.slice();

    // Input → Hidden
    const hidden = new Array(this.genome.hiddenUnits);
    for (let h = 0; h < this.genome.hiddenUnits; h++) {
      let sum = this.genome.biasHidden[h];
      const wRow = this.genome.weightsIH[h];
      for (let i = 0; i < this.inputSize; i++) sum += wRow[i] * inputs[i];
      hidden[h] = Math.tanh(sum);
    }
    this.lastHidden = hidden;

    // Hidden → Output
    const outputs = new Array(this.outputSize);
    for (let o = 0; o < this.outputSize; o++) {
      let sum = this.genome.biasOutput[o];
      const wRow = this.genome.weightsHO[o];
      for (let h = 0; h < this.genome.hiddenUnits; h++) sum += wRow[h] * hidden[h];
      outputs[o] = Math.tanh(sum);
    }
    this.lastOutput = outputs;
    return outputs;
  }

  /**
   * Hebbiansches In-Life-Lernen, moduliert durch den Energiegewinn.
   * Gewichte werden auf [-5, 5] beschnitten, um Explosion zu verhindern.
   */
  plasticUpdate(deltaEnergy) {
    const alpha = this.genome.plasticity;
    if (alpha <= 0) return;

    const lr = alpha * (1 + deltaEnergy);

    for (let h = 0; h < this.genome.hiddenUnits; h++) {
      for (let i = 0; i < this.inputSize; i++) {
        this.genome.weightsIH[h][i] += lr * this.lastInputs[i] * this.lastHidden[h];
      }
      this.genome.biasHidden[h] += lr * this.lastHidden[h];
    }
    for (let o = 0; o < this.outputSize; o++) {
      for (let h = 0; h < this.genome.hiddenUnits; h++) {
        this.genome.weightsHO[o][h] += lr * this.lastHidden[h] * this.lastOutput[o];
      }
      this.genome.biasOutput[o] += lr * this.lastOutput[o];
    }

    // Gewichte beschneiden
    for (const row of this.genome.weightsIH) {
      for (let c = 0; c < row.length; c++) row[c] = clamp(row[c], -5, 5);
    }
    for (const row of this.genome.weightsHO) {
      for (let c = 0; c < row.length; c++) row[c] = clamp(row[c], -5, 5);
    }
  }
}
