import type { SaveGame } from '../save/types.js';
import { MAX_PARTY_SIZE } from '../battle/setup.js';
import type { ProgressCondition, ProgressContext, ProgressEffect, ProgressLogEntry, ProgressTrigger } from './types.js';

/** Safety bound for quest/event cascades; content creating longer chains is a content bug. */
const MAX_CASCADE = 32;

export function locationOwner(save: SaveGame, ctx: ProgressContext, locationId: string) {
  return save.locationOwnership[locationId] ?? ctx.initialOwner(locationId);
}

export function evaluateCondition(save: SaveGame, ctx: ProgressContext, c: ProgressCondition): boolean {
  switch (c.type) {
    case 'FLAG_EQUALS': return (save.flags[c.flag] ?? false) === c.value;
    case 'ENCOUNTER_DEFEATED': return save.defeatedEncounterIds.includes(c.encounterId);
    case 'HAS_GENERAL': return Boolean(save.generals[c.generalId]) && [...save.party.activeGeneralIds, ...save.party.reserveGeneralIds].includes(c.generalId);
    case 'QUEST_AT_STEP': return save.quests[c.questId]?.status === 'ACTIVE' && save.quests[c.questId]?.stepIndex === c.stepIndex;
    case 'LOCATION_OWNED': return locationOwner(save, ctx, c.locationId) === 'PLAYER';
  }
}

export function applyEffect(save: SaveGame, ctx: ProgressContext, e: ProgressEffect, log: ProgressLogEntry[]): SaveGame {
  switch (e.type) {
    case 'SET_FLAG':
      return { ...save, flags: { ...save.flags, [e.flag]: e.value } };
    case 'GIVE_GOLD':
      return { ...save, gold: Math.max(0, save.gold + e.amount) };
    case 'RECRUIT_GENERAL': {
      if (save.generals[e.generalId]) return save; // no duplicate generals (PRD §7)
      const activeFull = save.party.activeGeneralIds.length >= MAX_PARTY_SIZE;
      if (activeFull && !e.toReserveIfFull) return save;
      log.push({ kind: 'RECRUITED', id: e.generalId });
      return {
        ...save,
        generals: { ...save.generals, [e.generalId]: ctx.newGeneralProgress(e.generalId, e.level) },
        party: activeFull
          ? { ...save.party, reserveGeneralIds: [...save.party.reserveGeneralIds, e.generalId] }
          : { ...save.party, activeGeneralIds: [...save.party.activeGeneralIds, e.generalId] },
      };
    }
    case 'SET_LOCATION_OWNER':
      log.push({ kind: 'OWNER_CHANGED', id: e.locationId });
      return { ...save, locationOwnership: { ...save.locationOwnership, [e.locationId]: e.owner } };
    case 'DISCOVER_LOCATION':
      return save.discoveredLocationIds.includes(e.locationId) ? save : { ...save, discoveredLocationIds: [...save.discoveredLocationIds, e.locationId] };
    case 'UNLOCK_REGION':
      if (save.unlockedRegionIds.includes(e.regionId)) return save;
      log.push({ kind: 'REGION_UNLOCKED', id: e.regionId });
      return { ...save, unlockedRegionIds: [...save.unlockedRegionIds, e.regionId] };
    case 'UNLOCK_FORMATION':
      if (save.unlockedFormationIds.includes(e.formationId)) return save;
      log.push({ kind: 'FORMATION_UNLOCKED', id: e.formationId });
      return { ...save, unlockedFormationIds: [...save.unlockedFormationIds, e.formationId] };
    case 'START_QUEST':
      if (save.quests[e.questId]) return save;
      log.push({ kind: 'QUEST_STARTED', id: e.questId });
      return { ...save, quests: { ...save.quests, [e.questId]: { status: 'ACTIVE', stepIndex: 0 } } };
    case 'REST_PARTY': {
      const generals = { ...save.generals };
      for (const [id, g] of Object.entries(generals)) generals[id] = { ...g, currentTroops: ctx.maxTroops(id, g.level) };
      return { ...save, generals };
    }
  }
}

/** Advance every active quest whose current step condition holds; apply onComplete effects. */
export function advanceQuests(save: SaveGame, ctx: ProgressContext, log: ProgressLogEntry[]): SaveGame {
  let current = save;
  for (let guard = 0; guard < MAX_CASCADE; guard++) {
    let changed = false;
    for (const [questId, progress] of Object.entries(current.quests).sort(([a], [b]) => a.localeCompare(b))) {
      if (progress.status !== 'ACTIVE') continue;
      const quest = ctx.quests.get(questId);
      if (!quest) continue;
      const step = quest.steps[progress.stepIndex];
      if (!step || !evaluateCondition(current, ctx, step.completeWhen)) continue;
      changed = true;
      const nextIndex = progress.stepIndex + 1;
      if (nextIndex >= quest.steps.length) {
        log.push({ kind: 'QUEST_COMPLETED', id: questId });
        current = { ...current, quests: { ...current.quests, [questId]: { status: 'COMPLETED', stepIndex: nextIndex } } };
        for (const e of quest.onComplete) current = applyEffect(current, ctx, e, log);
      } else {
        log.push({ kind: 'QUEST_STEP', id: `${questId}#${nextIndex}` });
        current = { ...current, quests: { ...current.quests, [questId]: { status: 'ACTIVE', stepIndex: nextIndex } } };
      }
    }
    if (!changed) return current;
  }
  throw new Error('quest cascade exceeded MAX_CASCADE; check content for loops');
}

function triggerMatches(a: ProgressTrigger, b: ProgressTrigger): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'GAME_START': return true;
    case 'ENTER_LOCATION': return a.locationId === (b as typeof a).locationId;
    case 'ENCOUNTER_VICTORY': return a.encounterId === (b as typeof a).encounterId;
    case 'TALK_NPC': return a.npcId === (b as typeof a).npcId;
  }
}

/**
 * Fire every matching event (id order) whose conditions hold, then settle quests.
 * Pure and deterministic. Returns the new save and a log for UI feedback.
 */
export function dispatchTrigger(save: SaveGame, ctx: ProgressContext, trigger: ProgressTrigger): { save: SaveGame; log: ProgressLogEntry[] } {
  const log: ProgressLogEntry[] = [];
  let current = advanceQuests(save, ctx, log);
  for (const event of ctx.events) {
    if (!triggerMatches(event.trigger, trigger)) continue;
    if (event.once && current.completedEventIds.includes(event.id)) continue;
    if (!event.conditions.every((c) => evaluateCondition(current, ctx, c))) continue;
    log.push({ kind: 'EVENT_FIRED', id: event.id });
    for (const e of event.effects) current = applyEffect(current, ctx, e, log);
    if (event.once) current = { ...current, completedEventIds: [...current.completedEventIds, event.id] };
    current = advanceQuests(current, ctx, log);
  }
  return { save: current, log };
}

/** Encounters on a location that are still active given current flags and defeats. */
export function activeEncounterIds(
  save: SaveGame,
  encounters: ReadonlyArray<{ encounterId: string; activeUnlessFlag?: string }>,
): string[] {
  return encounters
    .filter((e) => !save.defeatedEncounterIds.includes(e.encounterId))
    .filter((e) => !(e.activeUnlessFlag && save.flags[e.activeUnlessFlag] === true))
    .map((e) => e.encounterId);
}
