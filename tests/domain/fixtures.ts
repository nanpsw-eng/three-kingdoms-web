import type { BattleState, Combatant } from '../../src/game/domain/battle/index';

export function combatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'X',
    side: 'PLAYER',
    stats: { strength: 80, intelligence: 60, command: 80, speed: 70 },
    unitType: 'SPEAR',
    level: 5,
    weaponAttack: 20,
    armorDefense: 15,
    maxTroops: 3000,
    troops: 3000,
    slot: 0,
    statuses: [],
    traitEffects: [],
    tacticIds: [],
    ...overrides,
  };
}

export function state(combatants: Combatant[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    turn: 1,
    rngState: 99,
    combatants,
    tp: { PLAYER: { current: 30, max: 30 }, ENEMY: { current: 30, max: 30 } },
    formations: {},
    outcome: 'ONGOING',
    ...overrides,
  };
}
