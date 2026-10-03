import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/game/content/registry';
import { activeEncounterIds, dispatchTrigger, locationOwner } from '../../src/game/domain/progress/index';
import type { SaveGame } from '../../src/game/domain/save/index';
import { encodeSave } from '../../src/game/persistence/saveCodec';
import { buildProgressContext } from '../../src/game/progress/fromContent';
import { createNewGame } from '../../src/game/save/newGame';
import { readContentFiles } from '../../scripts/contentFiles';

const registry = validateContent(readContentFiles()).registry;
const ctx = buildProgressContext(registry);
const NOW = '2026-10-01T15:00:00.000Z';
const QUEST = 'QST_MAIN_ZHUO_YELLOW_TURBAN';

const win = (save: SaveGame, encounterId: string) =>
  dispatchTrigger({ ...save, defeatedEncounterIds: [...save.defeatedEncounterIds, encounterId] }, ctx, { type: 'ENCOUNTER_VICTORY', encounterId });

describe('Vertical Slice progression skeleton', () => {
  it('route Zhuo -> south plain -> Baishui -> forest -> outpost -> north gate completes the main quest', () => {
    let save = createNewGame(registry, NOW);
    const step = () => save.quests[QUEST];

    save = dispatchTrigger(save, ctx, { type: 'GAME_START' }).save;
    expect(step()).toEqual({ status: 'ACTIVE', stepIndex: 0 });
    expect(save.unlockedFormationIds).toEqual(['FORM_WEDGE']);

    save = win(save, 'ENC_SOUTH_PLAIN_SCOUTS').save;
    expect(step()!.stepIndex).toBe(1);

    // Talking to Jian Yong before reaching the village does nothing.
    expect(dispatchTrigger(save, ctx, { type: 'TALK_NPC', npcId: 'NPC_JIAN_YONG' }).log).toEqual([]);

    save = dispatchTrigger(save, ctx, { type: 'ENTER_LOCATION', locationId: 'LOC_BAISHUI_VILLAGE' }).save;
    expect(step()!.stepIndex).toBe(2);

    const recruit = dispatchTrigger(save, ctx, { type: 'TALK_NPC', npcId: 'NPC_JIAN_YONG' });
    save = recruit.save;
    expect(recruit.log).toContainEqual({ kind: 'RECRUITED', id: 'GEN_JIAN_YONG' });
    expect(save.party.activeGeneralIds).toContain('GEN_JIAN_YONG');
    expect(save.generals.GEN_JIAN_YONG!.currentTroops).toBe(900 + 62);
    expect(step()!.stepIndex).toBe(3);

    // Recruitment is one-shot: no duplicate general.
    const again = dispatchTrigger(save, ctx, { type: 'TALK_NPC', npcId: 'NPC_JIAN_YONG' }).save;
    expect(again.party.activeGeneralIds.filter((id) => id === 'GEN_JIAN_YONG')).toHaveLength(1);

    // Optional recruit through the hidden side path: discover first, then enter.
    save = dispatchTrigger(save, ctx, { type: 'SEARCH_LOCATION', locationId: 'LOC_BAISHUI_FOREST' }).save;
    expect(save.discoveredLocationIds).toContain('LOC_FOREST_SIDE_PATH');
    save = dispatchTrigger(save, ctx, { type: 'ENTER_LOCATION', locationId: 'LOC_FOREST_SIDE_PATH' }).save;
    save = dispatchTrigger(save, ctx, { type: 'TALK_NPC', npcId: 'NPC_FOREST_RECLUSE' }).save;
    expect(save.party.activeGeneralIds).toHaveLength(5);

    // Outpost capture mutates world state and thins nearby encounters.
    const plain = registry.locations.get('LOC_SOUTH_PLAIN')!;
    expect(activeEncounterIds(save, plain.encounters)).toEqual(['ENC_SOUTH_PLAIN_RIDERS']);
    expect(locationOwner(save, ctx, 'LOC_YT_OUTPOST')).toBe('YELLOW_TURBAN');
    save = win(save, 'ENC_YT_OUTPOST_GARRISON').save;
    expect(locationOwner(save, ctx, 'LOC_YT_OUTPOST')).toBe('PLAYER');
    expect(activeEncounterIds(save, plain.encounters)).toEqual([]);
    expect(step()!.stepIndex).toBe(4);

    // Three formations unlocked before the final gate.
    expect([...save.unlockedFormationIds].sort()).toEqual(['FORM_CIRCLE', 'FORM_CRANE', 'FORM_WEDGE']);

    const goldBefore = save.gold;
    save = win(save, 'ENC_NORTH_GATE_BOSS').save;
    expect(step()).toEqual({ status: 'COMPLETED', stepIndex: 5 });
    expect(save.unlockedRegionIds).toContain('REG_ZHUO_NORTH');
    expect(save.flags.FLAG_NORTH_GATE_CAPTURED).toBe(true);
    expect(save.gold).toBe(goldBefore + 200);
    expect(() => encodeSave(save)).not.toThrow();
  });

  it('outpost capture restores the party (captured fort as recovery point)', () => {
    let save = dispatchTrigger(createNewGame(registry, NOW), ctx, { type: 'GAME_START' }).save;
    save = { ...save, generals: { ...save.generals, GEN_GUAN_YU: { ...save.generals.GEN_GUAN_YU!, currentTroops: 10 } } };
    save = win(save, 'ENC_YT_OUTPOST_GARRISON').save;
    expect(save.generals.GEN_GUAN_YU!.currentTroops).toBe(1200);
    expect(registry.locations.get('LOC_YT_OUTPOST')!.servicesWhenOwned).toContain('REST');
  });

  it('boss encounter is a 5-unit commander + champion + commons force without retreat', () => {
    const boss = registry.encounters.get('ENC_NORTH_GATE_BOSS')!;
    expect(boss.enemies).toHaveLength(5);
    expect(boss.isBoss).toBe(true);
    expect(boss.canRetreat).toBe(false);
    const tags = boss.enemies.map((e) => registry.generals.get(e.generalId)!.tags);
    expect(tags.filter((t) => t.includes('BOSS'))).toHaveLength(2);
    // Only implemented tactics are referenced (validated globally; asserted here for the boss).
    for (const e of boss.enemies) for (const t of registry.generals.get(e.generalId)!.initialTacticIds) expect(registry.tactics.has(t)).toBe(true);
  });

  it('uncertain historical/original content is explicitly flagged for review', () => {
    expect(registry.generals.get('GEN_FOREST_RECLUSE')!.contentStatus).toBe('PROVISIONAL_CONTENT_REVIEW_REQUIRED');
    expect(registry.events.get('EVT_20_RECRUIT_JIAN_YONG')!.contentStatus).toBe('PROVISIONAL_CONTENT_REVIEW_REQUIRED');
    expect(registry.npcs.get('NPC_JIAN_YONG')!.contentStatus).toBe('PROVISIONAL_CONTENT_REVIEW_REQUIRED');
  });
});
