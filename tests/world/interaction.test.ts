import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/game/content/registry';
import { dispatchTrigger } from '../../src/game/domain/progress/index';
import { buildProgressContext } from '../../src/game/progress/fromContent';
import { createNewGame } from '../../src/game/save/newGame';
import {
  activeLocationEncounterIds,
  availableConnections,
  effectiveLocationServices,
  enterLocation,
  restAtCurrentLocation,
  talkToNpc,
} from '../../src/game/world/interaction';
import { readContentFiles } from '../../scripts/contentFiles';

const registry = validateContent(readContentFiles()).registry;
const ctx = buildProgressContext(registry);
const NOW = '2026-10-02T00:00:00.000Z';

function started() {
  return dispatchTrigger(createNewGame(registry, NOW), ctx, { type: 'GAME_START' }).save;
}

describe('world interaction adapter', () => {
  it('travels only through accessible adjacent locations and updates safe checkpoints', () => {
    let save = started();
    expect(availableConnections(save, registry).map((l) => l.id)).toEqual(['LOC_SOUTH_PLAIN']);

    save = enterLocation(save, registry, 'LOC_SOUTH_PLAIN').save;
    expect(save.world.locationId).toBe('LOC_SOUTH_PLAIN');
    expect(save.world.checkpointId).toBe('LOC_ZHUO_TOWN');
    expect(save.discoveredLocationIds).toContain('LOC_SOUTH_PLAIN');

    save = enterLocation(save, registry, 'LOC_BAISHUI_VILLAGE').save;
    expect(save.world.locationId).toBe('LOC_BAISHUI_VILLAGE');
    expect(save.world.checkpointId).toBe('LOC_BAISHUI_VILLAGE');
    expect(save.flags.FLAG_VISITED_BAISHUI).toBe(true);
  });

  it('does not recruit Jian Yong before the main quest reaches his step', () => {
    let save = started();
    save = enterLocation(save, registry, 'LOC_SOUTH_PLAIN').save;
    save = enterLocation(save, registry, 'LOC_BAISHUI_VILLAGE').save;
    const early = talkToNpc(save, registry, 'NPC_JIAN_YONG');
    expect(early.save.generals.GEN_JIAN_YONG).toBeUndefined();

    save = {
      ...save,
      defeatedEncounterIds: [...save.defeatedEncounterIds, 'ENC_SOUTH_PLAIN_SCOUTS'],
    };
    save = dispatchTrigger(save, ctx, { type: 'ENCOUNTER_VICTORY', encounterId: 'ENC_SOUTH_PLAIN_SCOUTS' }).save;
    expect(save.quests.QST_MAIN_ZHUO_YELLOW_TURBAN?.stepIndex).toBe(2);

    const recruited = talkToNpc(save, registry, 'NPC_JIAN_YONG').save;
    expect(recruited.generals.GEN_JIAN_YONG).toBeDefined();
    expect(recruited.party.activeGeneralIds).toContain('GEN_JIAN_YONG');
  });

  it('restores troops only where REST is available and refreshes the checkpoint', () => {
    let save = started();
    save = enterLocation(save, registry, 'LOC_SOUTH_PLAIN').save;
    expect(effectiveLocationServices(save, registry, 'LOC_SOUTH_PLAIN')).not.toContain('REST');
    expect(() => restAtCurrentLocation(save, registry)).toThrow(/REST is not available/);

    save = enterLocation(save, registry, 'LOC_BAISHUI_VILLAGE').save;
    save = {
      ...save,
      generals: {
        ...save.generals,
        GEN_GUAN_YU: { ...save.generals.GEN_GUAN_YU!, currentTroops: 10 },
      },
    };
    const rested = restAtCurrentLocation(save, registry).save;
    expect(rested.generals.GEN_GUAN_YU!.currentTroops).toBe(1200);
    expect(rested.world.checkpointId).toBe('LOC_BAISHUI_VILLAGE');
  });

  it('hides undiscovered secret links and locked regions while exposing active local encounters', () => {
    let save = started();
    save = enterLocation(save, registry, 'LOC_SOUTH_PLAIN').save;
    save = enterLocation(save, registry, 'LOC_BAISHUI_VILLAGE').save;
    save = enterLocation(save, registry, 'LOC_BAISHUI_FOREST').save;

    expect(availableConnections(save, registry).map((l) => l.id).sort()).toEqual(
      ['LOC_BAISHUI_VILLAGE', 'LOC_YT_OUTPOST'].sort(),
    );
    expect(activeLocationEncounterIds(save, registry)).toEqual(['ENC_BAISHUI_FOREST_AMBUSH']);

    const gateSave = { ...save, world: { ...save.world, locationId: 'LOC_NORTH_GATE', regionId: 'REG_ZHUO_SOUTH' } };
    expect(availableConnections(gateSave, registry).map((l) => l.id)).toEqual(['LOC_YT_OUTPOST']);
  });
});
