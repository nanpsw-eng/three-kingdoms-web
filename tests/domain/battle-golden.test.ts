import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBattleRules, combatantFromGeneral, formationSpec } from '../../src/game/battle/fromContent';
import { validateContent } from '../../src/game/content/registry';
import {
  applyCommandOverride,
  buildSmartCommands,
  createBattleState,
  runAutoBattle,
  type BattleCommand,
  type BattleState,
  type Combatant,
  type CommandPolicy,
} from '../../src/game/domain/battle/index';
import { readContentFiles } from '../../scripts/contentFiles';
import { combatant } from './fixtures';

const GOLDEN = join(process.cwd(), 'tests/golden/battle-v0.2-shu-vs-yellow-turban.json');
const registry = validateContent(readContentFiles()).registry;
const rules = buildBattleRules(registry);

/** Test-only generic enemies (not shipped content). */
function enemy(id: string, slot: number, unitType: Combatant['unitType'], str: number, int: number, cmd: number, spd: number, troops: number): Combatant {
  return combatant({ id, side: 'ENEMY', slot, unitType, level: 3, weaponAttack: 5, armorDefense: 5, maxTroops: troops, troops, stats: { strength: str, intelligence: int, command: cmd, speed: spd } });
}

function setup(seed: number): BattleState {
  const shu = [
    combatantFromGeneral(registry, 'GEN_GUAN_YU', { side: 'PLAYER', slot: 0, level: 3, weaponAttack: 12, armorDefense: 8 }),
    combatantFromGeneral(registry, 'GEN_ZHANG_FEI', { side: 'PLAYER', slot: 1, level: 3, weaponAttack: 12, armorDefense: 8 }),
    combatantFromGeneral(registry, 'GEN_LIU_BEI', { side: 'PLAYER', slot: 2, level: 3, weaponAttack: 8, armorDefense: 8 }),
    combatantFromGeneral(registry, 'GEN_JIAN_YONG', { side: 'PLAYER', slot: 3, level: 3, weaponAttack: 5, armorDefense: 5 }),
  ];
  const yt = [
    enemy('YT_CAPTAIN', 0, 'CAVALRY', 78, 55, 70, 66, 1800),
    enemy('YT_BRUTE', 1, 'SPEAR', 84, 30, 60, 58, 1600),
    enemy('YT_ARCHER_A', 2, 'ARCHER', 60, 40, 50, 62, 1200),
    enemy('YT_ARCHER_B', 3, 'ARCHER', 60, 40, 50, 61, 1200),
    enemy('YT_SPEAR', 4, 'SPEAR', 62, 35, 55, 55, 1300),
  ];
  return createBattleState({ seed, combatants: [...shu, ...yt], formations: { PLAYER: formationSpec(registry, 'FORM_WEDGE') } });
}

/** Scripted player: turn 1 taunt + confuse + inspire; afterwards heal anyone below 50%. */
const scripted: CommandPolicy = (state, side) => {
  let commands: BattleCommand[] = buildSmartCommands(state, side);
  if (state.turn === 1) {
    commands = applyCommandOverride(commands, { type: 'TACTIC', actorId: 'GEN_ZHANG_FEI', tacticId: 'TAC_TAUNT' });
    commands = applyCommandOverride(commands, { type: 'TACTIC', actorId: 'GEN_JIAN_YONG', tacticId: 'TAC_CONFUSE', targetId: 'YT_CAPTAIN' });
    commands = applyCommandOverride(commands, { type: 'TACTIC', actorId: 'GEN_GUAN_YU', tacticId: 'TAC_INSPIRE' });
  } else {
    const hurt = state.combatants.find((c) => c.side === side && c.troops > 0 && c.troops / c.maxTroops < 0.5);
    if (hurt) commands = applyCommandOverride(commands, { type: 'TACTIC', actorId: 'GEN_LIU_BEI', tacticId: 'TAC_HEAL_MINOR', targetId: hurt.id });
  }
  return commands;
};

function summarize(seed: number) {
  const result = runAutoBattle(setup(seed), rules, { player: scripted });
  return {
    seed,
    outcome: result.state.outcome,
    turns: result.turns.length,
    finalRngState: result.state.rngState,
    finalTroops: Object.fromEntries(result.state.combatants.map((c) => [c.id, c.troops])),
    finalTp: result.state.tp,
    eventTypeCounts: result.turns.flatMap((t) => t.events).reduce<Record<string, number>>((acc, e) => ((acc[e.type] = (acc[e.type] ?? 0) + 1), acc), {}),
    turn1Events: result.turns[0]?.events ?? [],
  };
}

describe('battle v0.2 golden', () => {
  const seeds = [20261001, 7, 424242];

  it('is deterministic across repeated runs', () => {
    for (const seed of seeds) expect(summarize(seed)).toEqual(summarize(seed));
  });

  it('matches the committed golden record (set UPDATE_GOLDEN=1 to regenerate intentionally)', () => {
    const actual = seeds.map(summarize);
    if (process.env.UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN, JSON.stringify(actual, null, 2) + '\n');
    }
    expect(existsSync(GOLDEN), `missing ${GOLDEN}; run UPDATE_GOLDEN=1 npm test`).toBe(true);
    expect(actual).toEqual(JSON.parse(readFileSync(GOLDEN, 'utf8')));
  });

  it('every battle terminates with a decided outcome', () => {
    for (const seed of seeds) expect(summarize(seed).outcome).not.toBe('ONGOING');
  });
});
