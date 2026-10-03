import { describe, expect, it } from 'vitest';
import { effectiveStatsAt, maxTroopsAt } from '../../src/game/battle/fromContent';
import { validateContent } from '../../src/game/content/registry';
import { awardGeneralXp, learnedTacticsAtLevel, MAX_GENERAL_LEVEL, xpToNextLevel } from '../../src/game/progression/leveling';
import { readContentFiles } from '../../scripts/contentFiles';

const registry = validateContent(readContentFiles()).registry;

describe('fixed-identity level progression', () => {
  it('uses the proposed Lv1-30 XP curve', () => {
    expect(xpToNextLevel(1)).toBe(60);
    expect(xpToNextLevel(2)).toBe(80);
    expect(xpToNextLevel(5)).toBe(140);
    expect(xpToNextLevel(29)).toBe(620);
    expect(xpToNextLevel(30)).toBeNull();
    expect(MAX_GENERAL_LEVEL).toBe(30);
  });

  it('supports multi-level gains, troop-capacity growth and tactic unlocks', () => {
    const start = {
      level: 1,
      xp: 50,
      currentTroops: maxTroopsAt(registry, 'GEN_LIU_BEI', 1),
      learnedTacticIds: ['TAC_HEAL_MINOR'],
      equipment: {},
    };
    const result = awardGeneralXp(registry, 'GEN_LIU_BEI', start, 190);

    expect(result.levelsGained).toBe(3);
    expect(result.progress.level).toBe(4);
    expect(result.progress.xp).toBe(0);
    expect(result.progress.currentTroops).toBe(maxTroopsAt(registry, 'GEN_LIU_BEI', 4));
    expect(result.unlockedTacticIds).toEqual(['TAC_INSPIRE']);
    expect(result.progress.learnedTacticIds).toEqual(['TAC_HEAL_MINOR', 'TAC_INSPIRE']);
  });

  it('keeps routed generals at zero troops even if they level', () => {
    const result = awardGeneralXp(registry, 'GEN_LIU_BEI', {
      level: 1,
      xp: 50,
      currentTroops: 0,
      learnedTacticIds: ['TAC_HEAL_MINOR'],
      equipment: {},
    }, 10);
    expect(result.progress.level).toBe(2);
    expect(result.progress.currentTroops).toBe(0);
  });

  it('derives sparse identity stat milestones from content rather than Save', () => {
    expect(effectiveStatsAt(registry, 'GEN_LIU_BEI', 9)).toEqual({
      strength: 72,
      intelligence: 82,
      command: 86,
      speed: 72,
    });
    expect(effectiveStatsAt(registry, 'GEN_LIU_BEI', 10)).toEqual({
      strength: 72,
      intelligence: 83,
      command: 87,
      speed: 72,
    });
  });

  it('includes milestone tactics when a general joins above the unlock level', () => {
    expect(learnedTacticsAtLevel(registry, 'GEN_FOREST_RECLUSE', 3)).toEqual(['TAC_FIRE_ATTACK']);
    expect(learnedTacticsAtLevel(registry, 'GEN_FOREST_RECLUSE', 5)).toEqual(['TAC_FIRE_ATTACK', 'TAC_CONFUSE']);
  });

  it('caps at level 30 and discards overflow XP', () => {
    const result = awardGeneralXp(registry, 'GEN_ZHANG_FEI', {
      level: 29,
      xp: 610,
      currentTroops: maxTroopsAt(registry, 'GEN_ZHANG_FEI', 29),
      learnedTacticIds: ['TAC_TAUNT'],
      equipment: {},
    }, 1000);
    expect(result.progress.level).toBe(30);
    expect(result.progress.xp).toBe(0);
    expect(result.progress.currentTroops).toBe(maxTroopsAt(registry, 'GEN_ZHANG_FEI', 30));
  });
});
