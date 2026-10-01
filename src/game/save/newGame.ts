import { maxTroopsAt } from '../battle/fromContent';
import type { ContentRegistry } from '../content/registry';
import { CURRENT_SAVE_VERSION, type SaveGame } from '../domain/save/index';

export const CONTENT_VERSION = '0.1.0-foundation';
export const STARTING_PARTY = ['GEN_LIU_BEI', 'GEN_GUAN_YU', 'GEN_ZHANG_FEI'] as const;
export const STARTING_LEVEL = 1;

/** New game per Vertical Slice: Liu Bei, Guan Yu, Zhang Fei at full troops in Zhuo. */
export function createNewGame(registry: ContentRegistry, nowIso: string, slotId = 'auto'): SaveGame {
  const generals: SaveGame['generals'] = {};
  for (const id of STARTING_PARTY) {
    const g = registry.generals.get(id);
    if (!g) throw new Error(`starting general ${id} missing from content`);
    generals[id] = {
      level: STARTING_LEVEL,
      xp: 0,
      currentTroops: maxTroopsAt(registry, id, STARTING_LEVEL),
      learnedTacticIds: [...g.initialTacticIds],
      equipment: {},
    };
  }
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    contentVersion: CONTENT_VERSION,
    slotId,
    createdAt: nowIso,
    updatedAt: nowIso,
    playTimeSeconds: 0,
    gold: 100,
    party: { activeGeneralIds: [...STARTING_PARTY], reserveGeneralIds: [], formationId: null },
    generals,
    inventory: {},
    world: { regionId: 'REG_ZHUO', locationId: 'LOC_ZHUO_TOWN', position: { x: 0, y: 0 }, checkpointId: 'LOC_ZHUO_TOWN' },
    locationOwnership: {},
    discoveredLocationIds: ['LOC_ZHUO_TOWN'],
    defeatedEncounterIds: [],
    quests: {},
    flags: {},
    battleCheckpoint: null,
  };
}
