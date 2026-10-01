import { describe, expect, it } from 'vitest';
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

  it('retreat keeps the encounter active and changes no rewards', () => {
    const save = createNewGame(registry, NOW);
    const s = retreat(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', partyOf(save), 11));
    const next = applyBattleResult(save, s, registry, NOW);
    expect(next.defeatedEncounterIds).toEqual([]);
    expect(next.gold).toBe(save.gold);
  });
});
