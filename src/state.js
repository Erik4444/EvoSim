/**
 * Zentraler, veränderlicher Simulationszustand.
 * Alle Module importieren dieses Objekt und lesen/schreiben darauf.
 * Dadurch entfallen globale Variablen und Module teilen denselben Zustand.
 */
export const state = {
  agents:         [],
  foods:          [],
  nextAgentId:    1,
  running:        true,
  // Gruppen-Namenszuweisung (Form-Index → Name)
  groupNames:     {},
  groupNameIndex: 0,
};
