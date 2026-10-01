/**
 * Central battle balance configuration.
 * All values are BALANCE_PROPOSED (docs/specs/COMBAT.md) until simulation/playtest.
 * Changing any value requires updating golden tests intentionally.
 */
export const BATTLE_CONFIG = {
  physical: {
    attackBase: 40,
    strengthCoef: 1.6,
    defenseBase: 30,
    commandCoef: 1.2,
    scale: 2.4,
  },
  tactic: {
    attackBase: 20,
    intelligenceCoef: 1.8,
    resistBase: 20,
    resistIntelligenceCoef: 1.0,
    resistCommandCoef: 0.4,
    scale: 2.0,
  },
  heal: {
    base: 100,
    intelligenceCoef: 6,
  },
  random: { min: 0.95, max: 1.05 },
  minDamage: 1,
  unit: { advantage: 1.1, disadvantage: 0.9 },
  /** Physical output by remaining troop ratio (first matching band wins). */
  troopBands: [
    { atLeast: 0.7, factor: 1 },
    { atLeast: 0.4, factor: 0.95 },
    { atLeast: 0.1, factor: 0.9 },
    { atLeast: 0, factor: 0.85 },
  ],
  defend: { damageTakenMultiplier: 0.6 },
  control: {
    minChance: 0.25,
    maxChance: 0.95,
    /** Added per point of (caster intelligence - target intelligence). */
    intelligenceDeltaCoef: 0.01,
  },
  status: {
    inspiredPhysicalMultiplier: 1.15,
  },
  tp: {
    base: 10,
    /** Party TP capacity grows with the best strategist's intelligence. */
    bestIntelligenceCoef: 0.25,
    regenPerTurn: 3,
  },
  /** Turn limit after which the battle ends as DRAW (safety valve for auto battle). */
  maxTurns: 60,
} as const;

export type BattleConfig = typeof BATTLE_CONFIG;
