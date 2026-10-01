import type { BattleOutcome, Combatant } from './types.js';

export function isAlive(c: Combatant): boolean {
  return c.troops > 0;
}

/** Victory/defeat once every general on one side has routed (troops 0). */
export function determineOutcome(combatants: readonly Combatant[]): BattleOutcome {
  const playerAlive = combatants.some((c) => c.side === 'PLAYER' && isAlive(c));
  const enemyAlive = combatants.some((c) => c.side === 'ENEMY' && isAlive(c));
  if (!playerAlive && !enemyAlive) return 'DRAW';
  if (!enemyAlive) return 'PLAYER_VICTORY';
  if (!playerAlive) return 'PLAYER_DEFEAT';
  return 'ONGOING';
}
