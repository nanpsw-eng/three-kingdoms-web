import { describe, expect, it } from 'vitest';
import {
  buildSmartCommands,
  calculatePhysicalDamage,
  resolveTurn,
  unitModifier,
  type BattleState,
  type Combatant,
} from '../../src/game/domain/battle/index';

function combatant(overrides: Partial<Combatant>): Combatant {
  return {
    id: 'GEN_TEST',
    side: 'PLAYER',
    stats: { strength: 80, intelligence: 60, command: 80, speed: 70 },
    unitType: 'SPEAR',
    level: 5,
    weaponAttack: 20,
    armorDefense: 15,
    maxTroops: 3000,
    troops: 3000,
    ...overrides,
  };
}

describe('battle core smoke', () => {
  it('unit triangle follows spear > cavalry > archer > spear', () => {
    expect(unitModifier('SPEAR', 'CAVALRY')).toBe(1.1);
    expect(unitModifier('CAVALRY', 'ARCHER')).toBe(1.1);
    expect(unitModifier('ARCHER', 'SPEAR')).toBe(1.1);
    expect(unitModifier('SPEAR', 'ARCHER')).toBe(0.9);
  });

  it('same state and seed produce identical damage', () => {
    const attacker = combatant({ id: 'GEN_GUAN_YU' });
    const defender = combatant({ id: 'GEN_ENEMY', side: 'ENEMY', unitType: 'CAVALRY' });
    expect(calculatePhysicalDamage(attacker, defender, 12345)).toEqual(
      calculatePhysicalDamage(attacker, defender, 12345),
    );
  });

  it('resolveTurn does not mutate input state', () => {
    const original: BattleState = {
      turn: 1,
      rngState: 99,
      combatants: [
        combatant({ id: 'GEN_GUAN_YU', stats: { strength: 95, intelligence: 74, command: 94, speed: 90 } }),
        combatant({ id: 'ENEMY', side: 'ENEMY', unitType: 'CAVALRY' }),
      ],
    };
    const result = resolveTurn(original, buildSmartCommands(original, 'PLAYER'));
    expect(original.combatants[1]?.troops).toBe(3000);
    expect(result.state.turn).toBe(2);
    expect(result.state.combatants[1]!.troops).toBeLessThan(3000);
  });
});
