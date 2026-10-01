/**
 * Informational balance probe (NOT a pass/fail gate).
 * - Smart-only: auto-battles each Vertical Slice encounter across 50 seeds.
 * - Telegraph-response probe: on the North Gate boss's declared execution turn,
 *   every living player general defends once. This measures whether reacting to
 *   the warning creates a material survival benefit without changing engine rules.
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

interface ProbeResult {
  results: Record<string, number>;
  avgTurns: number;
  avgTroopLoss: number;
}

function measure(encounterId: string, party: PartyMemberInput[], formation: string | null, reactToTelegraph = false): ProbeResult {
  const results: Record<string, number> = {};
  let turns = 0;
  let lostTroops = 0;

  for (let i = 1; i <= SEEDS; i++) {
    let s: BattleSession = createSession(registry, encounterId, party, (i * 2654435761) >>> 0, formation);
    const start = s.state.combatants.filter((c) => c.side === 'PLAYER').reduce((n, c) => n + c.troops, 0);

    while (s.result === 'ONGOING') {
      if (reactToTelegraph) {
        const executionTurn = s.telegraphs.some((t) => t.executeTurn === s.state.turn && (s.state.combatants.find((c) => c.id === t.actorId)?.troops ?? 0) > 0);
        if (executionTurn) {
          for (const actor of s.state.combatants.filter((c) => c.side === 'PLAYER' && c.troops > 0)) {
            s = setCommand(s, { type: 'DEFEND', actorId: actor.id });
          }
        }
      }
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

for (const [encounterId, party, formation] of plan) {
  const m = measure(encounterId, party, formation);
  console.log(`${encounterId.padEnd(28)} ${JSON.stringify(m.results).padEnd(20)} avgTurns=${m.avgTurns.toFixed(1)} avgTroopLoss=${m.avgTroopLoss.toFixed(0)}%`);
}

const bossSmart = measure('ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE');
const bossDefend = measure('ENC_NORTH_GATE_BOSS', full, 'FORM_CRANE', true);
console.log(
  `BOSS_TELEGRAPH_RESPONSE       smartLoss=${bossSmart.avgTroopLoss.toFixed(0)}% defendLoss=${bossDefend.avgTroopLoss.toFixed(0)}% ` +
  `smartTurns=${bossSmart.avgTurns.toFixed(1)} defendTurns=${bossDefend.avgTurns.toFixed(1)}`,
);
