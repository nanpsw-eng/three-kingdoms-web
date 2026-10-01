// Dependency-free smoke test over the compiled domain (tsconfig.domain.json -> .tmp/domain).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSmartCommands,
  calculatePhysicalDamage,
  createBattleState,
  resolveTurn,
  unitModifier,
} from '../.tmp/domain/battle/index.js';

function combatant(overrides) {
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
    slot: 0,
    statuses: [],
    traitEffects: [],
    tacticIds: [],
    ...overrides,
  };
}

test('unit triangle follows spear > cavalry > archer > spear', () => {
  assert.equal(unitModifier('SPEAR', 'CAVALRY'), 1.1);
  assert.equal(unitModifier('CAVALRY', 'ARCHER'), 1.1);
  assert.equal(unitModifier('ARCHER', 'SPEAR'), 1.1);
  assert.equal(unitModifier('SPEAR', 'ARCHER'), 0.9);
});

test('same state and seed produce identical damage (v0.1 golden 325)', () => {
  const attacker = combatant({ id: 'GEN_GUAN_YU', stats: { strength: 95, intelligence: 74, command: 94, speed: 72 } });
  const defender = combatant({ id: 'GEN_ENEMY', side: 'ENEMY', unitType: 'CAVALRY' });
  const first = calculatePhysicalDamage(attacker, defender, 12345);
  assert.deepEqual(first, calculatePhysicalDamage(attacker, defender, 12345));
  assert.equal(first.damage, 325);
});

test('smart command creates one attack per living ally', () => {
  const state = createBattleState({
    seed: 7,
    combatants: [
      combatant({ id: 'GEN_GUAN_YU' }),
      combatant({ id: 'GEN_ZHANG_FEI', slot: 1 }),
      combatant({ id: 'ENEMY_CAV', side: 'ENEMY', unitType: 'CAVALRY', troops: 2500 }),
      combatant({ id: 'ENEMY_ARCHER', side: 'ENEMY', unitType: 'ARCHER', troops: 2900, slot: 1 }),
    ],
  });
  const commands = buildSmartCommands(state, 'PLAYER');
  assert.equal(commands.length, 2);
  assert.ok(commands.every((command) => command.type === 'ATTACK'));
});

test('resolveTurn advances turn and mutates only returned state', () => {
  const original = createBattleState({
    seed: 99,
    combatants: [
      combatant({ id: 'GEN_GUAN_YU', stats: { strength: 95, intelligence: 74, command: 94, speed: 90 } }),
      combatant({ id: 'ENEMY', side: 'ENEMY', unitType: 'CAVALRY', stats: { strength: 70, intelligence: 50, command: 75, speed: 30 } }),
    ],
  });
  const result = resolveTurn(original, buildSmartCommands(original, 'PLAYER'));
  assert.equal(original.turn, 1);
  assert.equal(original.combatants[1].troops, 3000);
  assert.equal(result.state.turn, 2);
  assert.ok(result.state.combatants[1].troops < 3000);
  assert.ok(result.events.some((event) => event.type === 'DAMAGE'));
});
