import type { BattleState, Combatant } from '../battle/types.js';
import type { BattleCheckpoint } from './types.js';

/** Extract only dynamic battle state for persistence at a safe boundary. */
export function snapshotBattle(state: BattleState, encounterId: string, boundary: BattleCheckpoint['boundary']): BattleCheckpoint {
  return {
    encounterId,
    boundary,
    turn: state.turn,
    rngState: state.rngState,
    tp: { PLAYER: state.tp.PLAYER.current, ENEMY: state.tp.ENEMY.current },
    formationIds: { PLAYER: state.formations.PLAYER?.id ?? null, ENEMY: state.formations.ENEMY?.id ?? null },
    combatants: state.combatants.map((c) => ({
      id: c.id,
      side: c.side,
      slot: c.slot,
      troops: c.troops,
      statuses: c.statuses.map((s) => ({ ...s })),
    })),
  };
}

/**
 * Restore a battle from a checkpoint. `rebuild` re-derives static combatant data
 * (stats, max troops, traits, tactics) from content; the checkpoint overlays dynamic values.
 */
export function restoreBattle(
  checkpoint: BattleCheckpoint,
  rebuild: (entry: BattleCheckpoint['combatants'][number]) => Combatant,
  formation: (id: string) => NonNullable<BattleState['formations']['PLAYER']>,
  tpMax: { PLAYER: number; ENEMY: number },
): BattleState {
  const combatants = checkpoint.combatants.map((entry) => {
    const base = rebuild(entry);
    return { ...base, side: entry.side, slot: entry.slot, troops: Math.min(base.maxTroops, entry.troops), statuses: entry.statuses.map((s) => ({ ...s })) };
  });
  const formations: BattleState['formations'] = {};
  if (checkpoint.formationIds.PLAYER) formations.PLAYER = formation(checkpoint.formationIds.PLAYER);
  if (checkpoint.formationIds.ENEMY) formations.ENEMY = formation(checkpoint.formationIds.ENEMY);
  return {
    turn: checkpoint.turn,
    rngState: checkpoint.rngState,
    combatants,
    tp: {
      PLAYER: { current: Math.min(tpMax.PLAYER, checkpoint.tp.PLAYER), max: tpMax.PLAYER },
      ENEMY: { current: Math.min(tpMax.ENEMY, checkpoint.tp.ENEMY), max: tpMax.ENEMY },
    },
    formations,
    outcome: 'ONGOING',
  };
}
