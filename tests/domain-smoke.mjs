import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSmartCommands,
  calculatePhysicalDamage,
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
    ...overrides,
  };
}

test('unit triangle follows spear > cavalry > archer > spear', () => {
  assert.equal(unitModifier('SPEAR', 'CAVALRY'), 1.1);
  assert.equal(unitModifier('CAVALRY', 'ARCHER'), 1.1);
  assert.equal(unitModifier('ARCHER', 'SPEAR'), 1.1);
  assert.equal(unitModifier('SPEAR', 'ARCHER'), 0.9);
});

test('same state and seed produce identical damage', () => {
  const attacker = combatant({ id: 'GEN_GUAN_YU', stats: { strength: 95, intelligence: 74, command: 94, speed: 72 } });
  const defender = combatant({ id: 'GEN_ENEMY', side: 'ENEMY', unitType: 'CAVALRY' });
  const first = calculatePhysicalDamage(attacker, defender, 12345);
  const second = calculatePhysicalDamage(attacker, defender, 12345);
  assert.deepEqual(first, second);
  assert.ok(first.damage > 0);
});

test('smart command creates one attack per living ally', () => {
  const state = {
    turn: 1,
    rngState: 7,
    combatants: [
      combatant({ id: 'GEN_GUAN_YU' }),
      combatant({ id: 'GEN_ZHANG_FEI', unitType: 'SPEAR' }),
      combatant({ id: 'ENEMY_CAV', side: 'ENEMY', unitType: 'CAVALRY', troops: 2500 }),
      combatant({ id: 'ENEMY_ARCHER', side: 'ENEMY', unitType: 'ARCHER', troops: 2900 }),
    ],
  };
  const commands = buildSmartCommands(state, 'PLAYER');
  assert.equal(commands.length, 2);
  assert.ok(commands.every((command) => command.type === 'ATTACK'));
});

test('resolveTurn advances turn and mutates only returned state', () => {
  const original = {
    turn: 1,
    rngState: 99,
    combatants: [
      combatant({ id: 'GEN_GUAN_YU', stats: { strength: 95, intelligence: 74, command: 94, speed: 90 } }),
      combatant({ id: 'ENEMY', side: 'ENEMY', unitType: 'CAVALRY', stats: { strength: 70, intelligence: 50, command: 75, speed: 30 } }),
    ],
  };
  const commands = buildSmartCommands(original, 'PLAYER');
  const result = resolveTurn(original, commands);
  assert.equal(original.turn, 1);
  assert.equal(original.combatants[1].troops, 3000);
  assert.equal(result.state.turn, 2);
  assert.ok(result.state.combatants[1].troops < 3000);
  assert.ok(result.events.some((event) => event.type === 'DAMAGE'));
});
