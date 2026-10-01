import { describe, expect, it } from 'vitest';
import { buildSmartCommands, calculatePhysicalDamage, nextRng, resolveTurn, unitModifier } from '../../src/game/domain/battle/index';
import { combatant as c, state } from './fixtures';

/**
 * Values captured from the v0.1 battle core (commit 75b4122) before the v0.2 refactor.
 * With neutral formation/trait/status modifiers v0.2 must reproduce them exactly.
 */
describe('v0.1 golden preservation', () => {
  it('seeded LCG sequence is unchanged', () => {
    expect([1, 12345, 20261001].map((s) => nextRng(s).nextState)).toEqual([1015568748, 87628868, 1873385556]);
  });

  it('unit triangle follows spear > cavalry > archer > spear', () => {
    expect(unitModifier('SPEAR', 'CAVALRY')).toBe(1.1);
    expect(unitModifier('CAVALRY', 'ARCHER')).toBe(1.1);
    expect(unitModifier('ARCHER', 'SPEAR')).toBe(1.1);
    expect(unitModifier('SPEAR', 'ARCHER')).toBe(0.9);
    expect(unitModifier('CAVALRY', 'CAVALRY')).toBe(1);
  });

  it('physical damage values are unchanged', () => {
    const results = [
      calculatePhysicalDamage(c({ stats: { strength: 95, intelligence: 74, command: 94, speed: 72 } }), c({ side: 'ENEMY', unitType: 'CAVALRY' }), 12345),
      calculatePhysicalDamage(c(), c({ side: 'ENEMY', unitType: 'ARCHER' }), 7),
      calculatePhysicalDamage(c({ troops: 1000 }), c({ side: 'ENEMY' }), 99, true),
      calculatePhysicalDamage(c({ troops: 100, level: 1 }), c({ side: 'ENEMY', unitType: 'SPEAR', armorDefense: 40 }), 4242),
    ];
    expect(results).toEqual([
      { damage: 325, nextRngState: 87628868 },
      { damage: 230, nextRngState: 1025555898 },
      { damage: 139, nextRngState: 1178692198 },
      { damage: 209, nextRngState: 3779851977 },
    ]);
  });

  it('a full v0.1 turn resolves identically', () => {
    const st = state([
      c({ id: 'A', stats: { strength: 95, intelligence: 74, command: 94, speed: 90 } }),
      c({ id: 'B', unitType: 'ARCHER' }),
      c({ id: 'E1', side: 'ENEMY', unitType: 'CAVALRY', stats: { strength: 70, intelligence: 50, command: 75, speed: 30 } }),
      c({ id: 'E2', side: 'ENEMY', troops: 1500 }),
    ]);
    const commands = [...buildSmartCommands(st, 'PLAYER'), ...buildSmartCommands(st, 'ENEMY')];
    expect(commands).toEqual([
      { type: 'ATTACK', actorId: 'A', targetId: 'E2' },
      { type: 'ATTACK', actorId: 'B', targetId: 'E2' },
      { type: 'ATTACK', actorId: 'E1', targetId: 'B' },
      { type: 'ATTACK', actorId: 'E2', targetId: 'A' },
    ]);
    const result = resolveTurn(st, commands);
    expect(result.state.rngState).toBe(1428021319);
    expect(result.state.combatants.map((x) => x.troops)).toEqual([2773, 2750, 3000, 915]);
    expect(result.events).toEqual([
      { type: 'DAMAGE', actorId: 'A', targetId: 'E2', amount: 303 },
      { type: 'DAMAGE', actorId: 'B', targetId: 'E2', amount: 282 },
      { type: 'DAMAGE', actorId: 'E2', targetId: 'A', amount: 227 },
      { type: 'DAMAGE', actorId: 'E1', targetId: 'B', amount: 250 },
    ]);
    expect(st.combatants[3]!.troops).toBe(1500); // input not mutated
  });
});
