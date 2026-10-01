import type { BattleSession } from '../battle/session';
import { survivingTroops } from '../battle/session';
import type { ContentRegistry } from '../content/registry';
import type { SaveGame } from '../domain/save/index';

/**
 * Fold a finished battle into the save. Pure.
 * - VICTORY: rewards (gold, xp to participants), encounter marked defeated.
 * - DEFEAT: BLOCKED_DECISION (defeat penalty not specified in PRD/specs). Neutral prototype rule:
 *   routed generals keep 1 troop, no gold/xp loss, encounter stays active.
 * - RETREAT: troops as they stand, encounter stays active.
 * Level-up thresholds are also BLOCKED_DECISION: xp accumulates, level does not change yet.
 */
export function applyBattleResult(save: SaveGame, session: BattleSession, registry: ContentRegistry, nowIso: string): SaveGame {
  if (session.result === 'ONGOING') throw new Error('battle not finished');
  const troops = survivingTroops(session);
  const generals = { ...save.generals };
  for (const [id, value] of Object.entries(troops)) {
    const progress = generals[id];
    if (!progress) continue;
    generals[id] = { ...progress, currentTroops: session.result === 'DEFEAT' ? Math.max(1, value) : value };
  }
  let gold = save.gold;
  let defeated = save.defeatedEncounterIds;
  if (session.result === 'VICTORY') {
    const encounter = registry.encounters.get(session.encounterId);
    gold += encounter?.rewards.gold ?? 0;
    for (const id of Object.keys(troops)) {
      const progress = generals[id];
      if (progress) generals[id] = { ...progress, xp: progress.xp + (encounter?.rewards.xp ?? 0) };
    }
    if (!defeated.includes(session.encounterId)) defeated = [...defeated, session.encounterId];
  }
  return { ...save, generals, gold, defeatedEncounterIds: defeated, battleCheckpoint: null, updatedAt: nowIso };
}
