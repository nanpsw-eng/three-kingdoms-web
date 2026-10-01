import { partyTpMax } from './modifiers.js';
import { mixSeed } from './rng.js';
import type { BattleState, Combatant, FormationSpec, Side } from './types.js';

export interface BattleSetup {
  combatants: Combatant[];
  seed: number;
  formations?: Partial<Record<Side, FormationSpec>>;
  /** Override starting TP (e.g. restored checkpoint). Defaults to full. */
  startingTp?: Partial<Record<Side, number>>;
}

export const MAX_PARTY_SIZE = 5;

export function createBattleState(setup: BattleSetup): BattleState {
  for (const side of ['PLAYER', 'ENEMY'] as const) {
    const count = setup.combatants.filter((c) => c.side === side).length;
    if (count === 0 || count > MAX_PARTY_SIZE) throw new Error(`${side} must field 1..${MAX_PARTY_SIZE} generals, got ${count}`);
  }
  const ids = new Set(setup.combatants.map((c) => c.id));
  if (ids.size !== setup.combatants.length) throw new Error('combatant ids must be unique');

  const tp = (side: Side) => {
    const max = partyTpMax(setup.combatants, side);
    return { max, current: Math.min(max, setup.startingTp?.[side] ?? max) };
  };
  return {
    turn: 1,
    rngState: mixSeed(setup.seed),
    combatants: setup.combatants.map((c) => ({ ...c, stats: { ...c.stats }, statuses: c.statuses.map((s) => ({ ...s })) })),
    tp: { PLAYER: tp('PLAYER'), ENEMY: tp('ENEMY') },
    formations: { ...(setup.formations ?? {}) },
    outcome: 'ONGOING',
  };
}
