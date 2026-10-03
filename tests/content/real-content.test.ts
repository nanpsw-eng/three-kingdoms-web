import { describe, expect, it } from 'vitest';
import { loadBundledContent } from '../../src/game/content/bundled';
import { formatIssues, validateContent } from '../../src/game/content/registry';
import { unitModifier } from '../../src/game/domain/battle/index';
import { readContentFiles } from '../../scripts/contentFiles';

describe('repository content', () => {
  const result = validateContent(readContentFiles());

  it('validates with zero issues', () => {
    expect(formatIssues(result.issues)).toBe('');
    expect(result.ok).toBe(true);
  });

  it('defines every record referenced by the four starter generals', () => {
    const { registry } = result;
    for (const id of ['GEN_LIU_BEI', 'GEN_GUAN_YU', 'GEN_ZHANG_FEI', 'GEN_JIAN_YONG']) expect(registry.generals.has(id)).toBe(true);
    for (const id of ['FORM_WEDGE', 'FORM_CIRCLE', 'FORM_CRANE']) expect(registry.formations.has(id)).toBe(true);
    expect([...registry.unitTypes.values()].map((u) => u.code).sort()).toEqual(['ARCHER', 'CAVALRY', 'SPEAR']);
  });

  it('north gate boss telegraph references a learned all-enemy tactic', () => {
    const boss = result.registry.encounters.get('ENC_NORTH_GATE_BOSS');
    expect(boss?.telegraphs).toHaveLength(1);
    const telegraph = boss!.telegraphs[0]!;
    expect(telegraph.executeTurn).toBeGreaterThan(telegraph.announceTurn);
    expect(result.registry.generals.get(telegraph.actorGeneralId)?.initialTacticIds).toContain(telegraph.tacticId);
    expect(result.registry.tactics.get(telegraph.tacticId)?.target).toBe('ALL_ENEMIES');
  });

  it('unit-type advantage data matches the domain unit triangle', () => {
    for (const unit of result.registry.unitTypes.values()) {
      expect(unitModifier(unit.code, unit.advantageOver)).toBeGreaterThan(1);
      expect(unitModifier(unit.advantageOver, unit.code)).toBeLessThan(1);
    }
  });

  it('Vite bundled loader produces the same registry', () => {
    const bundled = loadBundledContent();
    expect([...bundled.generals.keys()].sort()).toEqual([...result.registry.generals.keys()].sort());
    expect(bundled.tactics.size).toBe(result.registry.tactics.size);
  });
});
