import type { ContentRegistry } from '../content/registry';
import {
  activeEncounterIds,
  applyEffect,
  dispatchTrigger,
  locationOwner,
  type ProgressLogEntry,
} from '../domain/progress/index';
import type { SaveGame } from '../domain/save/index';
import type { LocationDefinition } from '../schemas';
import { buildProgressContext } from '../progress/fromContent';

export type LocationService = 'REST' | 'SHOP' | 'SAVE_POINT';

export interface InteractionResult {
  save: SaveGame;
  log: ProgressLogEntry[];
}

function locationOrThrow(registry: ContentRegistry, locationId: string): LocationDefinition {
  const location = registry.locations.get(locationId);
  if (!location) throw new Error(`unknown location ${locationId}`);
  return location;
}

export function effectiveLocationServices(
  save: SaveGame,
  registry: ContentRegistry,
  locationId: string,
): LocationService[] {
  const location = locationOrThrow(registry, locationId);
  const services = new Set<LocationService>(location.services);
  const ctx = buildProgressContext(registry);
  if (locationOwner(save, ctx, location.id) === 'PLAYER') {
    for (const service of location.servicesWhenOwned) services.add(service);
  }
  return [...services];
}

function regionIsAccessible(save: SaveGame, registry: ContentRegistry, regionId: string): boolean {
  const region = registry.regions.get(regionId);
  if (!region) return false;
  return region.unlockFlag === null || save.unlockedRegionIds.includes(regionId);
}

/**
 * Adjacent locations the player may intentionally travel to.
 * Secret links stay hidden until some other exploration rule has discovered them.
 */
export function availableConnections(
  save: SaveGame,
  registry: ContentRegistry,
  fromLocationId = save.world.locationId,
): LocationDefinition[] {
  if (!fromLocationId) return [];
  const from = locationOrThrow(registry, fromLocationId);
  return from.connections
    .map((id) => registry.locations.get(id))
    .filter((location): location is LocationDefinition => Boolean(location))
    .filter((location) => regionIsAccessible(save, registry, location.regionId))
    .filter((location) => location.type !== 'SECRET' || save.discoveredLocationIds.includes(location.id))
    .filter((location) => location.type !== 'GATE' || save.discoveredLocationIds.includes(location.id));
}

export function enterLocation(
  save: SaveGame,
  registry: ContentRegistry,
  destinationId: string,
): InteractionResult {
  const currentId = save.world.locationId;
  if (!currentId) throw new Error('current location is not set');
  const allowed = availableConnections(save, registry, currentId);
  const destination = allowed.find((location) => location.id === destinationId);
  if (!destination) throw new Error(`location ${destinationId} is not reachable from ${currentId}`);

  const discovered = save.discoveredLocationIds.includes(destination.id)
    ? save.discoveredLocationIds
    : [...save.discoveredLocationIds, destination.id];

  let next: SaveGame = {
    ...save,
    discoveredLocationIds: discovered,
    world: {
      ...save.world,
      regionId: destination.regionId,
      locationId: destination.id,
      position: { x: 0, y: 0 },
    },
  };

  if (effectiveLocationServices(next, registry, destination.id).includes('SAVE_POINT')) {
    next = { ...next, world: { ...next.world, checkpointId: destination.id } };
  }

  return dispatchTrigger(next, buildProgressContext(registry), {
    type: 'ENTER_LOCATION',
    locationId: destination.id,
  });
}

export function talkToNpc(
  save: SaveGame,
  registry: ContentRegistry,
  npcId: string,
): InteractionResult {
  const npc = registry.npcs.get(npcId);
  if (!npc) throw new Error(`unknown npc ${npcId}`);
  if (npc.locationId !== save.world.locationId) {
    throw new Error(`npc ${npcId} is not at current location ${save.world.locationId ?? 'NONE'}`);
  }
  return dispatchTrigger(save, buildProgressContext(registry), { type: 'TALK_NPC', npcId });
}

export function restAtCurrentLocation(
  save: SaveGame,
  registry: ContentRegistry,
): InteractionResult {
  const locationId = save.world.locationId;
  if (!locationId) throw new Error('current location is not set');
  const services = effectiveLocationServices(save, registry, locationId);
  if (!services.includes('REST')) throw new Error(`REST is not available at ${locationId}`);

  const log: ProgressLogEntry[] = [];
  let next = applyEffect(save, buildProgressContext(registry), { type: 'REST_PARTY' }, log);
  if (services.includes('SAVE_POINT')) {
    next = { ...next, world: { ...next.world, checkpointId: locationId } };
  }
  return { save: next, log };
}

export function activeLocationEncounterIds(
  save: SaveGame,
  registry: ContentRegistry,
  locationId = save.world.locationId,
): string[] {
  if (!locationId) return [];
  const location = locationOrThrow(registry, locationId);
  return activeEncounterIds(save, location.encounters);
}

export function npcsAtCurrentLocation(save: SaveGame, registry: ContentRegistry) {
  const locationId = save.world.locationId;
  if (!locationId) return [];
  return [...registry.npcs.values()].filter((npc) => npc.locationId === locationId);
}
