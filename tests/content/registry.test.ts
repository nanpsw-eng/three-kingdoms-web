import { describe, expect, it } from 'vitest';
import { validateContent, type RawContentFile } from '../../src/game/content/registry';

const neutral = { physicalAttack: 1, physicalDefense: 1, tacticPower: 1, speed: 1 };

function fixture(): RawContentFile[] {
  return [
    {
      path: 'src/content/generals/test.json',
      data: {
        id: 'GEN_TEST',
        nameKey: 'general.test.name',
        role: 'BALANCED',
        baseStats: { strength: 50, intelligence: 50, command: 50, speed: 50 },
        troopGrowth: { baseTroop: 1000, perLevel: 50, category: 'NORMAL' },
        unitType: 'SPEAR',
        weaponAptitudes: { SWORD: 'A' },
        traitIds: ['TRT_TEST'],
        initialTacticIds: ['TAC_TEST'],
      },
    },
    {
      path: 'src/content/traits/traits.json',
      data: [{ id: 'TRT_TEST', nameKey: 'trait.test.name', descriptionKey: 'trait.test.desc', effects: [{ type: 'PHYSICAL_DAMAGE_MULTIPLIER', value: 1.1 }] }],
    },
    {
      path: 'src/content/tactics/tactics.json',
      data: [{ id: 'TAC_TEST', nameKey: 'tactic.test.name', descriptionKey: 'tactic.test.desc', family: 'HEAL', tpCost: 4, target: 'SINGLE_ALLY', effect: { kind: 'HEAL', power: 1 } }],
    },
    {
      path: 'src/content/formations/formations.json',
      data: [{ id: 'FORM_TEST', nameKey: 'formation.test.name', descriptionKey: 'formation.test.desc', party: neutral, slots: [neutral, neutral, neutral, neutral, neutral] }],
    },
    {
      path: 'src/content/unit-types/units.json',
      data: [
        { id: 'UNIT_SPEAR', code: 'SPEAR', nameKey: 'unit.spear.name', descriptionKey: 'unit.spear.desc', advantageOver: 'CAVALRY' },
        { id: 'UNIT_CAVALRY', code: 'CAVALRY', nameKey: 'unit.cavalry.name', descriptionKey: 'unit.cavalry.desc', advantageOver: 'SPEAR' },
      ],
    },
    {
      path: 'src/content/locales/ko.json',
      data: {
        'general.test.name': '시험',
        'trait.test.name': '특성',
        'trait.test.desc': '설명',
        'tactic.test.name': '책략',
        'tactic.test.desc': '설명',
        'formation.test.name': '진형',
        'formation.test.desc': '설명',
        'unit.spear.name': '창병',
        'unit.spear.desc': '설명',
        'unit.cavalry.name': '기병',
        'unit.cavalry.desc': '설명',
      },
    },
  ];
}

function mutate(files: RawContentFile[], path: string, fn: (data: any) => void): RawContentFile[] {
  return files.map((f) => {
    if (f.path !== path) return f;
    const data = structuredClone(f.data);
    fn(data);
    return { ...f, data };
  });
}

describe('content registry validation', () => {
  it('accepts a valid fixture and builds registry maps', () => {
    const result = validateContent(fixture());
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.registry.generals.get('GEN_TEST')?.unitType).toBe('SPEAR');
    expect(result.registry.tactics.size).toBe(1);
  });

  it('rejects a broken trait reference', () => {
    const files = mutate(fixture(), 'src/content/generals/test.json', (d) => { d.traitIds = ['TRT_MISSING']; });
    const result = validateContent(files);
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'BROKEN_REFERENCE', message: expect.stringContaining('TRT_MISSING') }));
  });

  it('rejects a broken tactic reference', () => {
    const files = mutate(fixture(), 'src/content/generals/test.json', (d) => { d.initialTacticIds = ['TAC_MISSING']; });
    expect(validateContent(files).issues.map((i) => i.code)).toContain('BROKEN_REFERENCE');
  });

  it('rejects a unit type with no UnitType record', () => {
    const files = mutate(fixture(), 'src/content/generals/test.json', (d) => { d.unitType = 'ARCHER'; });
    expect(validateContent(files).issues).toContainEqual(expect.objectContaining({ code: 'BROKEN_REFERENCE', message: expect.stringContaining('ARCHER') }));
  });

  it('rejects duplicate stable ids across files', () => {
    const files = [...fixture(), { path: 'src/content/traits/dup.json', data: { id: 'TRT_TEST', nameKey: 'trait.test.name', descriptionKey: 'trait.test.desc', effects: [{ type: 'HEAL_POWER_MULTIPLIER', value: 1.2 }] } }];
    expect(validateContent(files).issues.map((i) => i.code)).toContain('DUPLICATE_ID');
  });

  it('rejects schema violations (stat out of range, bad id prefix)', () => {
    const files = mutate(fixture(), 'src/content/generals/test.json', (d) => { d.baseStats.strength = 140; d.id = 'TEST'; });
    const result = validateContent(files);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('SCHEMA');
  });

  it('rejects missing localization keys', () => {
    const files = mutate(fixture(), 'src/content/locales/ko.json', (d) => { delete d['tactic.test.name']; });
    expect(validateContent(files).issues).toContainEqual(expect.objectContaining({ code: 'MISSING_LOCALIZATION' }));
  });

  it('rejects unknown fields (strict schemas catch typos)', () => {
    const files = mutate(fixture(), 'src/content/tactics/tactics.json', (d) => { d[0].tpCots = 3; });
    expect(validateContent(files).issues.map((i) => i.code)).toContain('SCHEMA');
  });
});

describe('encounter validation', () => {
  const enc = (enemies: unknown[]) => ({
    path: 'src/content/encounters/e.json',
    data: { id: 'ENC_T', nameKey: 'general.test.name', enemies, rewards: { xp: 1, gold: 1 } },
  });

  it('rejects unknown enemy general and duplicate combat ids/slots', () => {
    const result = validateContent([
      ...fixture(),
      enc([{ generalId: 'GEN_MISSING', level: 1, slot: 0 }, { generalId: 'GEN_TEST', level: 1, slot: 1 }, { generalId: 'GEN_TEST', level: 1, slot: 1 }]),
    ]);
    const messages = result.issues.map((i) => i.message).join('\n');
    expect(messages).toContain('GEN_MISSING');
    expect(messages).toContain('duplicate combat id GEN_TEST');
    expect(messages).toContain('duplicate enemy slot 1');
  });
});
