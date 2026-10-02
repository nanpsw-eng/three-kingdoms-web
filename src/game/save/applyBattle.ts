import type { BattleSession } from '../battle/session';
import { maxTroopsAt } from '../battle/fromContent';
import { survivingTroops } from '../battle/session';
import type { ContentRegistry } from '../content/registry';
import type { SaveGame } from '../domain/save/index';
import { awardGeneralXp, RESERVE_XP_RATIO } from '../progression/leveling';

const DEFEAT_RECOVERY_RATIO = 0.3;

function recoverDefeatedParty(save: SaveGame, registry: ContentRegistry) {
  const generals = { ...save.generals };
  for (const id of save.party.activeGeneralIds) {
    const progress = generals[id];
    if (!progress) continue;
    const max = maxTroopsAt(registry, id, progress.level);
    generals[id] = { ...progress, currentTroops: Math.max(1, Math.round(max * DEFEAT_RECOVERY_RATIO)) };
  }

  const checkpoint = registry.locations.get(save.world.checkpointId);
  const world = checkpoint
    ? { ...save.world, regionId: checkpoint.regionId, locationId: checkpoint.id }
    : save.world;

  return { generals, world };
}

/**
 * Fold a finished battle into the save. Pure.
 * - VICTORY: rewards (gold, xp to participants), encounter marked defeated.
 * - DEFEAT (DEC-002): return to the most recent safe checkpoint, restore the active
 *   party to 30% max troops, lose no gold/xp, and keep the encounter active.
 * - RETREAT (BD-03 proposal): deterministic success only where encounter.canRetreat=true;
 *   troops persist, no rewards, encounter stays active.
 * - VICTORY XP (BD-02 proposal): participants receive 100%; reserves receive 50%.
 */
export function applyBattleResult(save: SaveGame, session: BattleSession, registry: ContentRegistry, nowIso: string): SaveGame {
  if (session.result === 'ONGOING') throw new Error('battle not finished');

  if (session.result === 'DEFEAT') {
    const recovered = recoverDefeatedParty(save, registry);
    return {
      ...save,
      generals: recovered.generals,
      world: recovered.world,
      battleCheckpoint: null,
      updatedAt: nowIso,
    };
  }

  const troops = survivingTroops(session);
  const generals = { ...save.generals };
  for (const [id, value] of Object.entries(troops)) {
    const progress = generals[id];
    if (!progress) continue;
    generals[id] = { ...progress, currentTroops: value };
  }

  let gold = save.gold;
  let defeated = save.defeatedEncounterIds;
  if (session.result === 'VICTORY') {
    const encounter = registry.encounters.get(session.encounterId);
    gold += encounter?.rewards.gold ?? 0;
    const rewardXp = encounter?.rewards.xp ?? 0;
    const participantIds = new Set(Object.keys(troops));
    for (const id of participantIds) {
      const progress = generals[id];
      if (!progress) continue;
      generals[id] = awardGeneralXp(registry, id, progress, rewardXp).progress;
    }
    const reserveXp = Math.floor(rewardXp * RESERVE_XP_RATIO);
    if (reserveXp > 0) {
      for (const id of save.party.reserveGeneralIds) {
        if (participantIds.has(id)) continue;
        const progress = generals[id];
        if (!progress) continue;
        generals[id] = awardGeneralXp(registry, id, progress, reserveXp).progress;
      }
    }
    if (!defeated.includes(session.encounterId)) defeated = [...defeated, session.encounterId];
  }

  return { ...save, generals, gold, defeatedEncounterIds: defeated, battleCheckpoint: null, updatedAt: nowIso };
}
