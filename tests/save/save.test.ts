import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildBattleRules, combatantFromGeneral, formationSpec } from '../../src/game/battle/fromContent';
import { validateContent } from '../../src/game/content/registry';
import { buildSmartCommands, createBattleState, partyTpMax, resolveTurn } from '../../src/game/domain/battle/index';
import { migrateSaveData, restoreBattle, SaveMigrationError, snapshotBattle, type SaveMigration } from '../../src/game/domain/save/index';
import { DexieSaveRepository } from '../../src/game/persistence/dexieRepository';
import { MemorySaveRepository } from '../../src/game/persistence/memoryRepository';
import { decodeSave, encodeSave, SaveValidationError } from '../../src/game/persistence/saveCodec';
import { createNewGame } from '../../src/game/save/newGame';
import { readContentFiles } from '../../scripts/contentFiles';
import { combatant } from '../domain/fixtures';

const registry = validateContent(readContentFiles()).registry;
const NOW = '2026-10-01T15:00:00.000Z';

describe('SaveGame v1', () => {
  it('new game is schema-valid and stores no static base stats', () => {
    const save = createNewGame(registry, NOW);
    expect(() => encodeSave(save)).not.toThrow();
    expect(save.saveVersion).toBe(1);
    expect(save.party.activeGeneralIds).toEqual(['GEN_LIU_BEI', 'GEN_GUAN_YU', 'GEN_ZHANG_FEI']);
    const json = JSON.stringify(save);
    for (const forbidden of ['baseStats', 'strength', 'intelligence', 'maxTroops', 'troopGrowth', 'tpCost']) expect(json).not.toContain(forbidden);
  });

  it('rejects invalid saves (party > 5, duplicate member, missing progress)', () => {
    const save = createNewGame(registry, NOW);
    expect(() => encodeSave({ ...save, party: { ...save.party, activeGeneralIds: ['GEN_LIU_BEI', 'GEN_GUAN_YU', 'GEN_ZHANG_FEI', 'GEN_A', 'GEN_B', 'GEN_C'] } })).toThrow(SaveValidationError);
    expect(() => encodeSave({ ...save, party: { ...save.party, reserveGeneralIds: ['GEN_LIU_BEI'] } })).toThrow(/more than once/);
    expect(() => encodeSave({ ...save, party: { ...save.party, reserveGeneralIds: ['GEN_JIAN_YONG'] } })).toThrow(/missing progress/);
  });

  it('migration: rejects missing/newer versions and chains explicit steps', () => {
    expect(() => migrateSaveData(null)).toThrow(SaveMigrationError);
    expect(() => migrateSaveData({})).toThrow(/saveVersion/);
    expect(() => migrateSaveData({ saveVersion: 2 })).toThrow(/newer/);
    expect(() => migrateSaveData({ saveVersion: 0 })).toThrow(/no migration/);
    // Hypothetical legacy v0 shape -> v1, proving the seam works end to end.
    const v0ToV1: SaveMigration = {
      from: 0,
      to: 1,
      migrate: (raw) => {
        const { partyIds, ...rest } = raw as { partyIds: string[] } & Record<string, unknown>;
        return { ...rest, party: { activeGeneralIds: partyIds, reserveGeneralIds: [], formationId: null } };
      },
    };
    const current = createNewGame(registry, NOW);
    const { party, ...withoutParty } = current;
    const legacy = { ...withoutParty, saveVersion: 0, partyIds: party.activeGeneralIds };
    expect(decodeSave(legacy, [v0ToV1])).toEqual(current);
  });

  it('memory repository round-trips and refuses corrupt rows', async () => {
    const repo = new MemorySaveRepository();
    const save = createNewGame(registry, NOW);
    await repo.save(save);
    expect(await repo.load('auto')).toEqual(save);
    expect(await repo.load('missing')).toBeNull();
    repo.putRaw('bad', { saveVersion: 1, slotId: 'bad' });
    await expect(repo.load('bad')).rejects.toThrow(SaveValidationError);
  });

  it('Dexie IndexedDB adapter round-trips, lists and removes (fake-indexeddb)', async () => {
    const repo = new DexieSaveRepository(`test-${Math.floor(performance.now() * 1000)}`);
    const a = createNewGame(registry, NOW, 'slot1');
    const b = { ...createNewGame(registry, NOW, 'slot2'), updatedAt: '2026-10-01T16:00:00.000Z', gold: 250 };
    await repo.save(a);
    await repo.save(b);
    expect(await repo.load('slot2')).toEqual(b);
    expect((await repo.list()).map((s) => s.slotId)).toEqual(['slot2', 'slot1']);
    await repo.remove('slot1');
    expect(await repo.load('slot1')).toBeNull();
    await repo.putRaw('future', { ...a, slotId: 'future', saveVersion: 9 });
    await expect(repo.load('future')).rejects.toThrow(/newer/);
    repo.close();
  });
});

describe('battle checkpoint seam', () => {
  it('snapshot -> save -> restore resumes with identical results', () => {
    const rules = buildBattleRules(registry);
    const build = (id: string, side: 'PLAYER' | 'ENEMY', slot: number) =>
      id.startsWith('GEN_')
        ? combatantFromGeneral(registry, id, { side, slot, level: 2, weaponAttack: 10, armorDefense: 5 })
        : combatant({ id, side, slot, maxTroops: 900, troops: 900, level: 2 });
    const start = createBattleState({
      seed: 42,
      combatants: [build('GEN_LIU_BEI', 'PLAYER', 0), build('GEN_GUAN_YU', 'PLAYER', 1), build('YT_A', 'ENEMY', 0), build('YT_B', 'ENEMY', 1)],
      formations: { PLAYER: formationSpec(registry, 'FORM_CIRCLE') },
    });
    const commands = (s: typeof start) => [...buildSmartCommands(s, 'PLAYER'), ...buildSmartCommands(s, 'ENEMY')];
    const t1 = resolveTurn(start, commands(start), rules).state;

    const checkpoint = snapshotBattle(t1, 'ENC_TEST', 'TURN_END');
    const save = { ...createNewGame(registry, NOW), battleCheckpoint: checkpoint };
    const decoded = decodeSave(JSON.parse(JSON.stringify(encodeSave(save))));
    expect(JSON.stringify(decoded.battleCheckpoint)).not.toContain('strength');

    const restored = restoreBattle(decoded.battleCheckpoint!, (e) => build(e.id, e.side, e.slot), (id) => formationSpec(registry, id), {
      PLAYER: partyTpMax(t1.combatants, 'PLAYER'),
      ENEMY: partyTpMax(t1.combatants, 'ENEMY'),
    });
    expect(restored).toEqual(t1);
    expect(resolveTurn(restored, commands(restored), rules)).toEqual(resolveTurn(t1, commands(t1), rules));
  });
});
