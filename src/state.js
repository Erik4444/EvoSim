import {
  FOOD_SPAWN_PROB, HAZARD_BASE, SENSOR_RANGE,
  FOOD_CLUSTER_PROB, FOOD_CLUSTER_RADIUS,
  MAX_FOOD_ITEMS, MIN_FOOD_ITEMS, TARGET_FOOD_PER_AGENT,
  REPRODUCTION_THRESHOLD, FOOD_VALUE,
} from './config.js';

/**
 * Zentraler, veränderlicher Simulationszustand.
 * Alle Module importieren dieses Objekt und lesen/schreiben darauf.
 *
 * state.params enthält die zur Laufzeit änderbaren Parameter.
 * Sie spiegeln beim Start die Werte aus config.js, können aber durch
 * das Parameter-Panel überschrieben werden.
 */
export const state = {
  agents:         [],
  foods:          [],
  nextAgentId:    1,
  running:        true,
  // Gruppen-Namenszuweisung (Form-Index → Name)
  groupNames:     {},
  groupNameIndex: 0,

  // Laufzeit-veränderliche Parameter (initial = config-Werte)
  params: {
    foodSpawnProb:         FOOD_SPAWN_PROB,
    hazardBase:            HAZARD_BASE,
    sensorRange:           SENSOR_RANGE,
    foodClusterProb:       FOOD_CLUSTER_PROB,
    foodClusterRadius:     FOOD_CLUSTER_RADIUS,
    maxFoodItems:          MAX_FOOD_ITEMS,
    minFoodItems:          MIN_FOOD_ITEMS,
    targetFoodPerAgent:    TARGET_FOOD_PER_AGENT,
    reproductionThreshold: REPRODUCTION_THRESHOLD,
    foodValue:             FOOD_VALUE,
  },
};
