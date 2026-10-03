import { describe, expect, it } from 'vitest';
import { maxTroopsAt } from '../../src/game/battle/fromContent';
import { createSession, executeTurn, retreat } from '../../src/game/battle/session';
import { validateContent } from '../../src/game/content/registry';
import { encodeSave } from '../../src/game/persistence/saveCodec';
import { applyBattleResult } from '../../src/game/save/applyBattle';
import { createNewGame } from '../../src/game/save/newGame';
import { readContentFiles } from '../../scripts/contentFiles';

const registry = validateContent(readContentFiles()).registry;
const NOW = '2026-10-01T15:00:00.000Z';

function partyOf(save: ReturnType<typeof createNewGame>) {
  return save.party.activeGeneralIds.map((id) => ({ generalId: id, level: save.generals[id]!.level, troops: save.generals[id]!.currentTroops, tacticIds: save.generals[id]!.learnedTacticIds }));
}

describe('applyBattleResult', () => {
  it('victory persists troops, gold, xp and the defeated encounter', () => {
    const save = createNewGame(registry, NOW);
    let s = createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', partyOf(save), 11);
    while (s.result === 'ONGOING') s = executeTurn(s).session;
    expect(s.result).toBe('VICTORY');
    const next = applyBattleResult(save, s, registry, '2026-10-01T15:05:00.000Z');
    expect(next.gold).toBe(save.gold + 30);
    expect(next.defeatedEncounterIds).toEqual(['ENC_SOUTH_PLAIN_SCOUTS']);
    expect(next.generals.GEN_GUAN_YU!.xp).toBe(40);
    expect(next.generals.GEN_GUAN_YU!.level).toBe(1);
    expect(Object.values(next.generals).some((g, i) => g.currentTroops < Object.values(save.generals)[i]!.currentTroops)).toBe(true);
    expect(() => encodeSave(next)).not.toThrow();
  });


  it('levels participants at 100% XP and gives reserves 50% XP', () => {
    const base = createNewGame(registry, NOW);
    const jian = registry.generals.get('GEN_JIAN_YONG')!;
    const save = {
      ...base,
      generals: {
        ...base.generals,
        GEN_LIU_BEI: { ...base.generals.GEN_LIU_BEI!, xp: 30 },
        GEN_GUAN_YU: { ...base.generals.GEN_GUAN_YU!, xp: 30 },
        GEN_ZHANG_FEI: { ...base.generals.GEN_ZHANG_FEI!, xp: 30 },
        GEN_JIAN_YONG: {
          level: 2,
          xp: 0,
          currentTroops: maxTroopsAt(registry, 'GEN_JIAN_YONG', 2),
          learnedTacticIds: [...jian.initialTacticIds],
          equipment: {},
        },
      },
      party: {
        ...base.party,
        reserveGeneralIds: ['GEN_JIAN_YONG'],
      },
    };

    let session = createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', partyOf(save), 19);
    while (session.result === 'ONGOING') session = executeTurn(session).session;
    const next = applyBattleResult(save, session, registry, '2026-10-01T15:05:00.000Z');

    expect(next.generals.GEN_LIU_BEI).toMatchObject({ level: 2, xp: 10 });
    expect(next.generals.GEN_GUAN_YU).toMatchObject({ level: 2, xp: 10 });
    expect(next.generals.GEN_ZHANG_FEI).toMatchObject({ level: 2, xp: 10 });
    expect(next.generals.GEN_JIAN_YONG).toMatchObject({ level: 2, xp: 20 });
  });

  it('defeat applies DEC-002 recovery without gold/xp loss or clearing the encounter', () => {
    const base = createNewGame(registry, NOW);
    const save = {
      ...base,
      world: { ...base.world, locationId: 'LOC_SOUTH_PLAIN', checkpointId: 'LOC_ZHUO_TOWN', position: { x: 123, y: 456 } },
    };
    const started = createSession(registry, 'ENC_NORTH_GATE_BOSS', partyOf(save), 11);
    const defeated = {
      ...started,
      result: 'DEFEAT' as const,
      state: {
        ...started.state,
        combatants: started.state.combatants.map((c) => (c.side === 'PLAYER' ? { ...c, troops: 0 } : c)),
      },
    };

    const next = applyBattleResult(save, defeated, registry, '2026-10-01T15:05:00.000Z');

    for (const id of save.party.activeGeneralIds) {
      const progress = save.generals[id]!;
      expect(next.generals[id]!.currentTroops).toBe(Math.max(1, Math.round(maxTroopsAt(registry, id, progress.level) * 0.3)));
      expect(next.generals[id]!.xp).toBe(progress.xp);
    }
    expect(next.gold).toBe(save.gold);
    expect(next.defeatedEncounterIds).toEqual(save.defeatedEncounterIds);
    expect(next.world.regionId).toBe('REG_ZHUO_SOUTH');
    expect(next.world.locationId).toBe('LOC_ZHUO_TOWN');
    expect(next.world.checkpointId).toBe('LOC_ZHUO_TOWN');
    expect(() => encodeSave(next)).not.toThrow();
  });

  it('retreat keeps the encounter active and changes no rewards', () => {
    const save = createNewGame(registry, NOW);
    const s = retreat(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', partyOf(save), 11));
    const next = applyBattleResult(save, s, registry, NOW);
    expect(next.defeatedEncounterIds).toEqual([]);
    expect(next.gold).toBe(save.gold);
  });
});
