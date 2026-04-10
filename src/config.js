// Konfigurationsparameter – alle Simulationskonstanten an einem Ort.
// Änderungen hier wirken sich auf die gesamte Simulation aus.

export const SENSOR_DIRECTIONS = 8;        // Richtungssensoren (gleichmäßig auf 360° verteilt)
export const SENSOR_RANGE      = 100;      // Reichweite der Sensorik (Pixel)
export const START_ENERGY      = 2.0;      // Startenergie jedes neuen Agenten
export const REPRODUCTION_THRESHOLD = 4.0; // Energieschwelle für Fortpflanzung
export const CHILD_ENERGY      = 2.0;      // Energie, die ein Kind erhält (wird dem Elternteil abgezogen)
export const FOOD_VALUE        = 1.5;      // Energiegewinn pro Nahrungsteil
export const FOOD_SPAWN_PROB       = 0.05;  // Spawn-Wahrscheinlichkeit pro Tick
export const MAX_FOOD_ITEMS        = 600;  // Absolutes Maximum an Nahrungsteilen
export const MIN_FOOD_ITEMS        = 50;   // Untere Grenze (auch bei leerer Population)
export const TARGET_FOOD_PER_AGENT = 2.5;  // Ziel: N Nahrungsteile pro lebendem Agenten
// Cluster-Spawning: 70 % der Nahrung entsteht nahe bestehender Nahrung
export const FOOD_CLUSTER_PROB     = 0.7;
export const FOOD_CLUSTER_RADIUS   = 80;   // Maximale Distanz zum Cluster-Anker (Pixel)
export const FOOD_RADIUS       = 4;        // Aufnahmeradius (Pixel)
export const BASE_COST         = 0.002;    // Grundumsatz pro Tick
export const MOVE_COST_FACTOR  = 0.001;    // Kosten proportional zum Quadrat der Geschwindigkeit
export const MAX_SPEED         = 2.0;      // Maximale Translationsgeschwindigkeit (Pixel/Tick)
export const MAX_TURN_RATE     = 0.1;      // Maximale Drehgeschwindigkeit (Radiant/Tick)
export const STRUCT_MUT_PROB   = 0.01;     // Wahrscheinlichkeit für strukturelle Mutation (add/remove Neuron)
export const WEIGHT_MUT_RATE   = 0.1;      // Standardabweichung für Gewichtsmutationen
export const SIGMA_MUTATION    = 0.05;     // Mutationsrate für das Mutationssigma selbst (log-normal)
export const PLASTIC_MUT_RATE  = 0.05;     // Mutationsrate für die Plastizität
export const HAZARD_BASE       = 0.00005;  // Basissterberate pro Tick
export const HAZARD_GAMMA      = 0.0003;   // Altersabhängige Erhöhung der Sterberate
export const HAZARD_KAPPA      = 0.2;      // Reduktion der Sterberate durch hohe Energie
export const MIN_HIDDEN_UNITS  = 1;        // Minimale Hidden-Neuronen-Anzahl
export const MAX_HIDDEN_UNITS  = 10;       // Maximale Hidden-Neuronen-Anzahl

export const COLOR_MUTATION_RATE   = 0.05;
export const COLOR_MUTATION_STDDEV = 0.05;
export const SIZE_MUTATION_RATE    = 0.05;
export const SIZE_MUTATION_STDDEV  = 0.05;

// Verfügbare Aktivierungsfunktionen. Der Index (activationGene) ist Teil des Genoms.
export const ACTIVATIONS        = ['tanh', 'relu', 'sigmoid'];
export const ACTIVATION_MUT_PROB = 0.01; // Wahrscheinlichkeit für Mutation der Aktivierungsfunktion

// Sensorik: Nah/Fern-Grenze als Anteil der Gesamtreichweite
export const SENSOR_NEAR_FRACTION = 0.5; // < 50 % Reichweite = "nah", ≥ 50 % = "fern"

// Verfügbare Formen. Der Index ist Teil des Genoms und kann mutieren.
export const SHAPES = ['circle', 'square', 'triangle', 'pentagon', 'hexagon', 'star'];
export const SHAPE_MUT_PROB = 0.02;

// Namenspool für Gruppen (nach Formindex sortiert)
export const GROUP_NAME_POOL = [
  'Aurelia', 'Borealis', 'Caelia', 'Draco', 'Eolia', 'Felis', 'Galea', 'Helios', 'Ignis', 'Jovia',
  'Karma', 'Lapis', 'Moris', 'Nexus', 'Orion', 'Pavo', 'Quanta', 'Rhea', 'Solis', 'Titan',
  'Umbra', 'Vulcan', 'Xenon', 'Yara', 'Zephyr',
];
