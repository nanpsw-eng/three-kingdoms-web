import { describe, expect, it } from 'vitest';
import {
  BATTLE_CONFIG,
  applyCommandOverride,
  buildRepeatCommands,
  buildSmartCommands,
  calculatePhysicalDamage,
  controlChance,
  createBattleState,
  mixSeed,
  determineOutcome,
  formationModifiers,
  resolveTurn,
  type BattleRules,
  type FormationSpec,
} from '../../src/game/domain/battle/index';
import { combatant as c, state } from './fixtures';

const rules: BattleRules = {
  tactics: {
    TAC_FIRE: { id: 'TAC_FIRE', tpCost: 6, target: 'SINGLE_ENEMY', effect: { kind: 'DAMAGE', power: 1 } },
    TAC_HEAL: { id: 'TAC_HEAL', tpCost: 4, target: 'SINGLE_ALLY', effect: { kind: 'HEAL', power: 1 } },
    TAC_CONFUSE: { id: 'TAC_CONFUSE', tpCost: 6, target: 'SINGLE_ENEMY', effect: { kind: 'STATUS', status: 'CONFUSED', durationTurns: 2, baseChance: 0.55 } },
    TAC_INSPIRE: { id: 'TAC_INSPIRE', tpCost: 8, target: 'ALL_ALLIES', effect: { kind: 'STATUS', status: 'INSPIRED', durationTurns: 2 } },
    TAC_TAUNT: { id: 'TAC_TAUNT', tpCost: 3, target: 'SELF', effect: { kind: 'STATUS', status: 'TAUNTING', durationTurns: 2 } },
  },
};
const all = Object.keys(rules.tactics);
const SEEDS = [0x1234567, 0x9e3779b9, 0x7f4a7c15, 0xdeadbeef, 0x2545f491, 0xc2b2ae35, 0x85ebca6b, 0x27d4eb2f];

describe('outcome', () => {
  it('detects victory, defeat and ongoing', () => {
    expect(determineOutcome([c({ id: 'P' }), c({ id: 'E', side: 'ENEMY', troops: 0 })])).toBe('PLAYER_VICTORY');
    expect(determineOutcome([c({ id: 'P', troops: 0 }), c({ id: 'E', side: 'ENEMY' })])).toBe('PLAYER_DEFEAT');
    expect(determineOutcome([c({ id: 'P' }), c({ id: 'E', side: 'ENEMY' })])).toBe('ONGOING');
  });

  it('ends the battle mid-turn on last rout and ignores further commands', () => {
    const st = state([
      c({ id: 'P', stats: { strength: 99, intelligence: 50, command: 80, speed: 99 } }),
      c({ id: 'E', side: 'ENEMY', troops: 10 }),
    ]);
    const result = resolveTurn(st, [{ type: 'ATTACK', actorId: 'P', targetId: 'E' }, { type: 'ATTACK', actorId: 'E', targetId: 'P' }]);
    expect(result.state.outcome).toBe('PLAYER_VICTORY');
    expect(result.events.map((e) => e.type)).toEqual(['DAMAGE', 'ROUT', 'BATTLE_END']);
    expect(result.state.combatants[0]!.troops).toBe(3000);
    expect(resolveTurn(result.state, [{ type: 'ATTACK', actorId: 'P', targetId: 'E' }]).events).toEqual([]);
  });

  it('routed target is retargeted deterministically', () => {
    const st = state([c({ id: 'P' }), c({ id: 'E1', side: 'ENEMY', troops: 0 }), c({ id: 'E2', side: 'ENEMY' })]);
    const r = resolveTurn(st, [{ type: 'ATTACK', actorId: 'P', targetId: 'E1' }]);
    expect(r.events[0]).toEqual({ type: 'TARGET_REDIRECTED', actorId: 'P', fromId: 'E1', toId: 'E2', reason: 'TARGET_ROUTED' });
    expect(r.events[1]).toMatchObject({ type: 'DAMAGE', targetId: 'E2' });
  });
});

describe('defend', () => {
  it('applies the configured damage-taken multiplier regardless of speed order', () => {
    const attacker = c({ id: 'A', stats: { strength: 90, intelligence: 50, command: 80, speed: 99 } });
    const base = state([attacker, c({ id: 'D', side: 'ENEMY', stats: { strength: 50, intelligence: 50, command: 80, speed: 1 } })]);
    const open = resolveTurn(base, [{ type: 'ATTACK', actorId: 'A', targetId: 'D' }]);
    const guarded = resolveTurn(base, [{ type: 'ATTACK', actorId: 'A', targetId: 'D' }, { type: 'DEFEND', actorId: 'D' }]);
    const dmg = (r: typeof open) => (r.events.find((e) => e.type === 'DAMAGE') as { amount: number }).amount;
    expect(dmg(guarded)).toBeLessThan(dmg(open));
    expect(dmg(guarded) / dmg(open)).toBeCloseTo(BATTLE_CONFIG.defend.damageTakenMultiplier, 1);
  });
});

describe('party TP and tactics', () => {
  it('createBattleState derives TP from best intelligence and enforces party size', () => {
    const st = createBattleState({ seed: 1, combatants: [c({ id: 'P', stats: { strength: 50, intelligence: 80, command: 50, speed: 50 } }), c({ id: 'E', side: 'ENEMY' })] });
    expect(st.tp.PLAYER).toEqual({ current: 30, max: 30 });
    expect(st.outcome).toBe('ONGOING');
    expect(st.rngState).toBe(mixSeed(1));
    expect(mixSeed(1)).not.toBe(mixSeed(2));
    const six = Array.from({ length: 6 }, (_, i) => c({ id: `P${i}` }));
    expect(() => createBattleState({ seed: 1, combatants: [...six, c({ id: 'E', side: 'ENEMY' })] })).toThrow();
  });

  it('spends shared TP, regenerates at end of turn and fails when insufficient', () => {
    const st = state([c({ id: 'P', tacticIds: all }), c({ id: 'E', side: 'ENEMY' })], { tp: { PLAYER: { current: 7, max: 30 }, ENEMY: { current: 0, max: 30 } } });
    const r1 = resolveTurn(st, [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_FIRE', targetId: 'E' }], rules);
    expect(r1.events[0]).toEqual({ type: 'TACTIC_CAST', actorId: 'P', tacticId: 'TAC_FIRE', tpCost: 6 });
    expect(r1.events[1]).toMatchObject({ type: 'DAMAGE', tacticId: 'TAC_FIRE' });
    expect(r1.state.tp.PLAYER.current).toBe(1 + BATTLE_CONFIG.tp.regenPerTurn);
    const r2 = resolveTurn(r1.state, [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_FIRE', targetId: 'E' }], rules);
    expect(r2.events[0]).toEqual({ type: 'TACTIC_FAILED', actorId: 'P', tacticId: 'TAC_FIRE', reason: 'NO_TP' });
  });

  it('rejects unknown and unlearned tactics without spending TP', () => {
    const st = state([c({ id: 'P', tacticIds: [] }), c({ id: 'E', side: 'ENEMY' })]);
    const r = resolveTurn(st, [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_HEAL', targetId: 'P' }], rules);
    expect(r.events[0]).toMatchObject({ reason: 'NOT_LEARNED' });
    expect(resolveTurn(st, [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_NOPE' }], rules).events[0]).toMatchObject({ reason: 'UNKNOWN_TACTIC' });
    expect(r.state.tp.PLAYER.current).toBe(30);
  });

  it('minor heal restores troops capped at max and honors heal trait', () => {
    const healer = c({ id: 'H', tacticIds: ['TAC_HEAL'], stats: { strength: 50, intelligence: 82, command: 50, speed: 50 } });
    const ally = c({ id: 'W', slot: 1, troops: 1000 });
    const r = resolveTurn(state([healer, ally, c({ id: 'E', side: 'ENEMY' })]), [{ type: 'TACTIC', actorId: 'H', tacticId: 'TAC_HEAL', targetId: 'W' }], rules);
    const heal = r.events.find((e) => e.type === 'HEAL') as { amount: number };
    expect(heal.amount).toBe(BATTLE_CONFIG.heal.base + 82 * BATTLE_CONFIG.heal.intelligenceCoef);
    const kind = resolveTurn(state([{ ...healer, traitEffects: [{ type: 'HEAL_POWER_MULTIPLIER', value: 1.2 }] }, ally, c({ id: 'E', side: 'ENEMY' })]), [{ type: 'TACTIC', actorId: 'H', tacticId: 'TAC_HEAL', targetId: 'W' }], rules);
    expect((kind.events.find((e) => e.type === 'HEAL') as { amount: number }).amount).toBe(Math.round(heal.amount * 1.2));
    const nearFull = resolveTurn(state([healer, { ...ally, troops: 2990 }, c({ id: 'E', side: 'ENEMY' })]), [{ type: 'TACTIC', actorId: 'H', tacticId: 'TAC_HEAL', targetId: 'W' }], rules);
    expect(nearFull.state.combatants[1]!.troops).toBe(3000);
  });

  it('confuse is a bounded deterministic roll; confused generals lose their action', () => {
    expect(controlChance(c({ stats: { strength: 1, intelligence: 1, command: 1, speed: 1 } }), c({ stats: { strength: 1, intelligence: 100, command: 1, speed: 1 } }), 0.55)).toBe(BATTLE_CONFIG.control.minChance);
    expect(controlChance(c({ stats: { strength: 1, intelligence: 100, command: 1, speed: 1 } }), c({ stats: { strength: 1, intelligence: 1, command: 1, speed: 1 } }), 0.55)).toBe(BATTLE_CONFIG.control.maxChance);
    const jianYongLike = c({ id: 'P', tacticIds: all, stats: { strength: 50, intelligence: 79, command: 65, speed: 99 }, traitEffects: [{ type: 'CONTROL_SUCCESS_BONUS', value: 0.1 }] });
    const enemy = c({ id: 'E', side: 'ENEMY', stats: { strength: 70, intelligence: 30, command: 60, speed: 50 } });
    // Find a seed where the roll succeeds (chance = 0.95 cap here), then verify the skip.
    const st = state([jianYongLike, enemy], { rngState: 1 });
    const r = resolveTurn(st, [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_CONFUSE', targetId: 'E' }, { type: 'ATTACK', actorId: 'E', targetId: 'P' }], rules);
    expect(r.events.map((e) => e.type)).toEqual(['TACTIC_CAST', 'STATUS_APPLIED', 'ACTION_SKIPPED']);
    expect(r.state.combatants[1]!.statuses).toEqual([{ code: 'CONFUSED', remainingTurns: 1 }]);
    const r2 = resolveTurn(r.state, [{ type: 'ATTACK', actorId: 'E', targetId: 'P' }], rules);
    expect(r2.events).toEqual([{ type: 'ACTION_SKIPPED', actorId: 'E', reason: 'CONFUSED' }, { type: 'STATUS_EXPIRED', targetId: 'E', status: 'CONFUSED' }]);
    // A low-chance roll can be resisted, and resistance is reproducible.
    const strong = { ...enemy, stats: { ...enemy.stats, intelligence: 100 } };
    const weakCaster = { ...jianYongLike, traitEffects: [] };
    const outcomes = SEEDS.map((seed) => resolveTurn(state([weakCaster, strong], { rngState: seed }), [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_CONFUSE', targetId: 'E' }], rules).events[1]!.type);
    expect(outcomes).toContain('STATUS_RESISTED');
    expect(outcomes).toEqual(SEEDS.map((seed) => resolveTurn(state([weakCaster, strong], { rngState: seed }), [{ type: 'TACTIC', actorId: 'P', tacticId: 'TAC_CONFUSE', targetId: 'E' }], rules).events[1]!.type));
  });

  it('inspire buffs all living allies physical damage', () => {
    const p1 = c({ id: 'P1', tacticIds: all, stats: { strength: 80, intelligence: 60, command: 80, speed: 99 } });
    const p2 = c({ id: 'P2', slot: 1, stats: { strength: 80, intelligence: 60, command: 80, speed: 10 } });
    const e = c({ id: 'E', side: 'ENEMY', stats: { strength: 80, intelligence: 60, command: 80, speed: 50 } });
    const base = resolveTurn(state([p1, p2, e]), [{ type: 'ATTACK', actorId: 'P2', targetId: 'E' }], rules);
    const buffed = resolveTurn(state([p1, p2, e]), [{ type: 'TACTIC', actorId: 'P1', tacticId: 'TAC_INSPIRE' }, { type: 'ATTACK', actorId: 'P2', targetId: 'E' }], rules);
    expect(buffed.events.filter((x) => x.type === 'STATUS_APPLIED')).toHaveLength(2);
    const dmg = (events: typeof base.events) => (events.find((x) => x.type === 'DAMAGE') as { amount: number }).amount;
    expect(dmg(buffed.events) / dmg(base.events)).toBeCloseTo(BATTLE_CONFIG.status.inspiredPhysicalMultiplier, 2);
  });

  it('taunt redirects enemy attacks and smart command targets the taunter', () => {
    const zf = c({ id: 'ZF', tacticIds: all, stats: { strength: 98, intelligence: 35, command: 84, speed: 99 } });
    const lb = c({ id: 'LB', slot: 1, troops: 500 });
    const e = c({ id: 'E', side: 'ENEMY', stats: { strength: 80, intelligence: 60, command: 80, speed: 10 } });
    const r = resolveTurn(state([zf, lb, e]), [{ type: 'TACTIC', actorId: 'ZF', tacticId: 'TAC_TAUNT' }, { type: 'ATTACK', actorId: 'E', targetId: 'LB' }], rules);
    expect(r.events).toContainEqual({ type: 'TARGET_REDIRECTED', actorId: 'E', fromId: 'LB', toId: 'ZF', reason: 'TAUNT' });
    expect(r.state.combatants[1]!.troops).toBe(500);
    expect(buildSmartCommands(r.state, 'ENEMY')).toEqual([{ type: 'ATTACK', actorId: 'E', targetId: 'ZF' }]);
  });
});

describe('formations and traits', () => {
  const wedge: FormationSpec = {
    id: 'FORM_WEDGE',
    party: { physicalAttack: 1.08, physicalDefense: 0.95, tacticPower: 1, speed: 1.03 },
    slots: [
      { physicalAttack: 1.1, physicalDefense: 0.95, tacticPower: 1, speed: 1 },
      ...Array.from({ length: 4 }, () => ({ physicalAttack: 1, physicalDefense: 1, tacticPower: 1, speed: 1 })),
    ],
  };

  it('combines party and slot modifiers', () => {
    const m = formationModifiers({ formations: { PLAYER: wedge } }, c({ slot: 0 }));
    expect(m.physicalAttack).toBeCloseTo(1.188);
    expect(m.physicalDefense).toBeCloseTo(0.9025);
    expect(formationModifiers({ formations: {} }, c()).physicalAttack).toBe(1);
  });

  it('formation and trait multipliers scale physical damage', () => {
    const a = c({ id: 'A' });
    const d = c({ id: 'D', side: 'ENEMY' });
    const neutral = calculatePhysicalDamage(a, d, 5).damage;
    const formed = calculatePhysicalDamage(a, d, 5, false, { attacker: formationModifiers({ formations: { PLAYER: wedge } }, a) }).damage;
    expect(formed / neutral).toBeCloseTo(1.188, 1);
    const heroicFull = calculatePhysicalDamage({ ...a, traitEffects: [{ type: 'PHYSICAL_DAMAGE_MULTIPLIER', value: 1.15, condition: { selfTroopRatioAtLeast: 0.7 } }] }, d, 5).damage;
    expect(heroicFull / neutral).toBeCloseTo(1.15, 1);
    const heroicLow = calculatePhysicalDamage({ ...a, troops: 1000, traitEffects: [{ type: 'PHYSICAL_DAMAGE_MULTIPLIER', value: 1.15, condition: { selfTroopRatioAtLeast: 0.7 } }] }, d, 5).damage;
    expect(heroicLow).toBe(calculatePhysicalDamage({ ...a, troops: 1000 }, d, 5).damage);
  });
});

describe('command helpers', () => {
  it('override replaces only the named actor; repeat falls back when TP is short', () => {
    const st = state([c({ id: 'P1', tacticIds: all }), c({ id: 'P2', slot: 1 }), c({ id: 'E', side: 'ENEMY' })], { tp: { PLAYER: { current: 5, max: 30 }, ENEMY: { current: 0, max: 30 } } });
    const smart = buildSmartCommands(st, 'PLAYER');
    const overridden = applyCommandOverride(smart, { type: 'TACTIC', actorId: 'P1', tacticId: 'TAC_FIRE', targetId: 'E' });
    expect(overridden[0]).toMatchObject({ type: 'TACTIC' });
    expect(overridden[1]).toEqual(smart[1]);
    const repeated = buildRepeatCommands(st, 'PLAYER', overridden, rules);
    expect(repeated[0]).toEqual({ type: 'ATTACK', actorId: 'P1', targetId: 'E' });
  });
});
