import type { ContentRegistry } from '../content/registry';
import type { GeneralProgress } from '../domain/save/index';
import { maxTroopsAt } from '../battle/fromContent';

export const MAX_GENERAL_LEVEL = 30;
export const RESERVE_XP_RATIO = 0.5;

/**
 * XP stored in Save is progress within the current level, not lifetime XP.
 * Balance proposal: Lv1->2 costs 60, then +20 per level.
 */
export const XP_TO_NEXT_LEVEL: ReadonlyArray<number | null> = Array.from(
  { length: MAX_GENERAL_LEVEL + 1 },
  (_, level) => {
    if (level === 0 || level >= MAX_GENERAL_LEVEL) return null;
    return 40 + level * 20;
  },
);

export function xpToNextLevel(level: number): number | null {
  if (level < 1 || level > MAX_GENERAL_LEVEL) throw new Error(`level out of range: ${level}`);
  return XP_TO_NEXT_LEVEL[level] ?? null;
}

export interface XpAwardResult {
  progress: GeneralProgress;
  levelsGained: number;
  unlockedTacticIds: string[];
}

export function learnedTacticsAtLevel(
  registry: ContentRegistry,
  generalId: string,
  level: number,
): string[] {
  const general = registry.generals.get(generalId);
  if (!general) throw new Error(`unknown general ${generalId}`);
  const learned = new Set(general.initialTacticIds);
  for (const milestone of [...general.levelMilestones].sort((a, b) => a.level - b.level)) {
    if (milestone.level > level) continue;
    for (const tacticId of milestone.tacticIds) learned.add(tacticId);
  }
  return [...learned];
}

/**
 * Applies XP without duplicating static stats in Save.
 * Level-up expands current troops by exactly the max-troop capacity gained,
 * preserving pre-existing battle losses instead of fully healing the general.
 */
export function awardGeneralXp(
  registry: ContentRegistry,
  generalId: string,
  progress: GeneralProgress,
  amount: number,
): XpAwardResult {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('xp amount must be a non-negative integer');
  const general = registry.generals.get(generalId);
  if (!general) throw new Error(`unknown general ${generalId}`);

  let level = Math.min(progress.level, MAX_GENERAL_LEVEL);
  let xp = level >= MAX_GENERAL_LEVEL ? 0 : progress.xp + amount;
  let currentTroops = progress.currentTroops;
  const learned = new Set([...learnedTacticsAtLevel(registry, generalId, level), ...progress.learnedTacticIds]);
  const unlocked: string[] = [];
  let levelsGained = 0;

  while (level < MAX_GENERAL_LEVEL) {
    const cost = xpToNextLevel(level)!;
    if (xp < cost) break;
    xp -= cost;
    const beforeMax = maxTroopsAt(registry, generalId, level);
    level += 1;
    levelsGained += 1;
    const afterMax = maxTroopsAt(registry, generalId, level);
    if (currentTroops > 0) currentTroops = Math.min(afterMax, currentTroops + (afterMax - beforeMax));

    for (const milestone of general.levelMilestones) {
      if (milestone.level !== level) continue;
      for (const tacticId of milestone.tacticIds) {
        if (learned.has(tacticId)) continue;
        learned.add(tacticId);
        unlocked.push(tacticId);
      }
    }
  }

  if (level >= MAX_GENERAL_LEVEL) xp = 0;

  return {
    progress: {
      ...progress,
      level,
      xp,
      currentTroops,
      learnedTacticIds: [...learned],
    },
    levelsGained,
    unlockedTacticIds: unlocked,
  };
}
