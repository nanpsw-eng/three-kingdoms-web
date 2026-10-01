/**
 * Informational balance probe (NOT a pass/fail gate).
 *
 * Baseline:
 * - Smart-only auto-battle across each Vertical Slice encounter, 50 deterministic seeds.
 *
 * Boss strategy probes:
 * - defend-on-telegraph: all living allies defend on the declared execution turn.
 * - interrupt-commander: from announcement until execution, living allies focus the
 *   telegraphed actor with basic attacks. If the actor routes, the declared tactic
 *   cannot execute.
 * - formation comparison: Smart-only using each unlocked foundation formation.
 *
 * Usage: npm run sim:encounters
 */
import { createSession, executeTurn, setCommand, type BattleSession, type PartyMemberInput } from '../src/game/battle/session';
import { validateContent } from '../src/game/content/registry';
import { readContentFiles } from './contentFiles';

const registry = validateContent(readContentFiles()).registry;
const member = (id: string, level: number): PartyMemberInput => {
  const g = registry.generals.get(id)!;
  return { generalId: id, level, troops: g.troopGrowth.baseTroop + g.troopGrowth.perLevel * (level - 1), tacticIds: g.initialTacticIds };
};
const starters = [member('GEN_LIU_BEI', 1), member('GEN_GUAN_YU', 1), member('GEN_ZHANG_FEI', 1)];
const full = [...starters, member('GEN_JIAN_YONG', 2), member('GEN_FOREST_RECLUSE', 3)];
const plan: Array<[string, PartyMemberInput[], string | null]> = [
  ['ENC_SOUTH_PLAIN_SCOUTS', starters, null],
  ['ENC_SOUTH_PLAIN_RIDERS', starters, 'FORM_WEDGE'],
  ['ENC_BAISHUI_FOREST_AMBUSH', full, 'FORM_CIRCLE'],
  ['ENC_YT_OUTPOST_GARRISON', full, 'FORM_CIRCLE'],
  ['ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE'],
];
const SEEDS = 50;

type Strategy = 'SMART' | 'DEFEND_TELEGRAPH' | 'INTERRUPT_COMMANDER' | 'CONTROL_COMMANDER';

interface ProbeResult {
  results: Record<string, number>;
  avgTurns: number;
  avgTroopLoss: number;
}

function applyStrategy(session: BattleSession, strategy: Strategy): BattleSession {
  if (strategy === 'SMART') return session;

  const liveTelegraph = session.telegraphs.find((t) => {
    const actorAlive = (session.state.combatants.find((c) => c.id === t.actorId)?.troops ?? 0) > 0;
    return actorAlive && session.state.turn >= t.announceTurn && session.state.turn <= t.executeTurn;
  });
  if (!liveTelegraph) return session;

  if (strategy === 'DEFEND_TELEGRAPH' && session.state.turn === liveTelegraph.executeTurn) {
    let next = session;
    for (const actor of session.state.combatants.filter((c) => c.side === 'PLAYER' && c.troops > 0)) {
      next = setCommand(next, { type: 'DEFEND', actorId: actor.id });
    }
    return next;
  }

  if (strategy === 'INTERRUPT_COMMANDER') {
    let next = session;
    for (const actor of session.state.combatants.filter((c) => c.side === 'PLAYER' && c.troops > 0)) {
      next = setCommand(next, { type: 'ATTACK', actorId: actor.id, targetId: liveTelegraph.actorId });
    }
    return next;
  }

  if (strategy === 'CONTROL_COMMANDER' && session.state.turn === liveTelegraph.announceTurn) {
    const controller = session.state.combatants.find(
      (c) => c.side === 'PLAYER' && c.troops > 0 && c.tacticIds.includes('TAC_CONFUSE'),
    );
    if (controller) {
      return setCommand(session, {
        type: 'TACTIC',
        actorId: controller.id,
        tacticId: 'TAC_CONFUSE',
        targetId: liveTelegraph.actorId,
      });
    }
  }

  return session;
}

function measure(
  encounterId: string,
  party: PartyMemberInput[],
  formation: string | null,
  strategy: Strategy = 'SMART',
): ProbeResult {
  const results: Record<string, number> = {};
  let turns = 0;
  let lostTroops = 0;

  for (let i = 1; i <= SEEDS; i++) {
    let s: BattleSession = createSession(registry, encounterId, party, (i * 2654435761) >>> 0, formation);
    const start = s.state.combatants.filter((c) => c.side === 'PLAYER').reduce((n, c) => n + c.troops, 0);

    while (s.result === 'ONGOING') {
      s = applyStrategy(s, strategy);
      s = executeTurn(s).session;
    }

    results[s.result] = (results[s.result] ?? 0) + 1;
    turns += s.history.length;
    lostTroops += 1 - s.state.combatants.filter((c) => c.side === 'PLAYER').reduce((n, c) => n + c.troops, 0) / start;
  }

  return {
    results,
    avgTurns: turns / SEEDS,
    avgTroopLoss: (lostTroops / SEEDS) * 100,
  };
}

function print(label: string, m: ProbeResult): void {
  console.log(
    `${label.padEnd(31)} ${JSON.stringify(m.results).padEnd(20)} avgTurns=${m.avgTurns.toFixed(1)} avgTroopLoss=${m.avgTroopLoss.toFixed(0)}%`,
  );
}

for (const [encounterId, party, formation] of plan) {
  print(encounterId, measure(encounterId, party, formation));
}

const bossSmart = measure('ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE', 'SMART');
const bossDefend = measure('ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE', 'DEFEND_TELEGRAPH');
const bossInterrupt = measure('ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE', 'INTERRUPT_COMMANDER');
const bossControl = measure('ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE', 'CONTROL_COMMANDER');

console.log(
  `BOSS_STRATEGY_RESPONSE          smartLoss=${bossSmart.avgTroopLoss.toFixed(0)}% defendLoss=${bossDefend.avgTroopLoss.toFixed(0)}% ` +
  `interruptLoss=${bossInterrupt.avgTroopLoss.toFixed(0)}% controlLoss=${bossControl.avgTroopLoss.toFixed(0)}% ` +
  `smartTurns=${bossSmart.avgTurns.toFixed(1)} defendTurns=${bossDefend.avgTurns.toFixed(1)} ` +
  `interruptTurns=${bossInterrupt.avgTurns.toFixed(1)} controlTurns=${bossControl.avgTurns.toFixed(1)}`,
);

for (const formation of ['FORM_WEDGE', 'FORM_CIRCLE', 'FORM_CRANE']) {
  print(`BOSS_FORMATION_${formation.replace('FORM_', '')}`, measure('ENC_NORTH_GATE_BOSS', full, formation, 'SMART'));
}
