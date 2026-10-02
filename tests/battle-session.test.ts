import { describe, expect, it } from 'vitest';
import { activeTelegraph, createSession, enemyCommands, executeTurn, resetPlan, retreat, setCommand, survivingTroops, type BattleSession } from '../src/game/battle/session';
import { validateContent } from '../src/game/content/registry';
import { readContentFiles } from '../scripts/contentFiles';

const registry = validateContent(readContentFiles()).registry;
const party = [
  { generalId: 'GEN_LIU_BEI', level: 1, troops: 1100, tacticIds: ['TAC_HEAL_MINOR'] },
  { generalId: 'GEN_GUAN_YU', level: 1, troops: 1200, tacticIds: ['TAC_INSPIRE'] },
  { generalId: 'GEN_ZHANG_FEI', level: 1, troops: 1250, tacticIds: ['TAC_TAUNT'] },
];

function playOut(session: BattleSession, mode: 'SMART' | 'REPEAT' = 'SMART') {
  let s = session;
  while (s.result === 'ONGOING') s = executeTurn(s, mode).session;
  return s;
}

describe('battle session', () => {
  it('starts with one Smart Command attack per living ally (one-tap turn)', () => {
    const s = createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party, 123);
    expect(s.plan).toHaveLength(3);
    expect(s.plan.every((c) => c.type === 'ATTACK')).toBe(true);
    expect(s.state.combatants.filter((c) => c.side === 'ENEMY')).toHaveLength(3);
  });

  it('scout encounter is winnable by Smart Command alone and reports survivors', () => {
    const end = playOut(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party, 123));
    expect(end.result).toBe('VICTORY');
    expect(end.history.length).toBeGreaterThan(1);
    const troops = survivingTroops(end);
    expect(Object.keys(troops).sort()).toEqual(['GEN_GUAN_YU', 'GEN_LIU_BEI', 'GEN_ZHANG_FEI']);
  });

  it('override changes only that general; repeat re-uses last commands', () => {
    let s = createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party, 5);
    s = setCommand(s, { type: 'TACTIC', actorId: 'GEN_ZHANG_FEI', tacticId: 'TAC_TAUNT' });
    expect(s.plan.find((c) => c.actorId === 'GEN_ZHANG_FEI')).toMatchObject({ type: 'TACTIC' });
    const r = executeTurn(s, 'REPEAT');
    expect(r.turn.events).toContainEqual(expect.objectContaining({ type: 'TACTIC_CAST', tacticId: 'TAC_TAUNT' }));
    expect(r.session.plan.find((c) => c.actorId === 'GEN_ZHANG_FEI')).toMatchObject({ type: 'TACTIC', tacticId: 'TAC_TAUNT' });
    expect(resetPlan(r.session, 'ALL_ATTACK').plan.every((c) => c.type === 'ATTACK')).toBe(true);
  });

  it('retreat ends a non-boss battle without resolving turns', () => {
    const s = retreat(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party, 1));
    expect(s.result).toBe('RETREAT');
    expect(s.history).toEqual([]);
  });


  it('boss telegraph announces before a forced all-enemy tactic', () => {
    const base = createSession(registry, 'ENC_NORTH_GATE_BOSS', party, 123);
    const announced = { ...base, state: { ...base.state, turn: 2 } };
    expect(activeTelegraph(announced)).toMatchObject({
      announceTurn: 2,
      executeTurn: 3,
      actorId: 'GEN_YT_GATE_COMMANDER',
      tacticId: 'TAC_FIRESTORM',
    });

    const execution = {
      ...base,
      state: {
        ...base.state,
        turn: 3,
        tp: { ...base.state.tp, ENEMY: { ...base.state.tp.ENEMY, current: base.state.tp.ENEMY.max } },
      },
    };
    expect(enemyCommands(execution)).toContainEqual({
      type: 'TACTIC',
      actorId: 'GEN_YT_GATE_COMMANDER',
      tacticId: 'TAC_FIRESTORM',
    });
  });

  it('enemy commander uses an affordable support tactic before falling back to attacks', () => {
    const boss = createSession(registry, 'ENC_NORTH_GATE_BOSS', party, 456);
    expect(enemyCommands(boss)).toContainEqual({
      type: 'TACTIC',
      actorId: 'GEN_YT_GATE_COMMANDER',
      tacticId: 'TAC_INSPIRE',
    });
  });

  it('same seed + same commands => identical outcome (speed is not an input)', () => {
    const a = playOut(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party, 777));
    const b = playOut(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party, 777));
    expect(a.state).toEqual(b.state);
    expect(a.history).toEqual(b.history);
  });

  it('routed party members are excluded at battle start', () => {
    const s = createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', [{ ...party[0]!, troops: 0 }, party[1]!], 1);
    expect(s.state.combatants.filter((c) => c.side === 'PLAYER').map((c) => c.id)).toEqual(['GEN_GUAN_YU']);
  });
});
