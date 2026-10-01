/**
 * Informational balance probe (NOT a pass/fail gate): auto-battles each Vertical Slice
 * encounter with Smart Command only, across 50 seeds, using progression-appropriate parties.
 * Usage: npm run sim:encounters
 */
import { createSession, executeTurn, type PartyMemberInput } from '../src/game/battle/session';
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
for (const [encounterId, party, formation] of plan) {
  const results: Record<string, number> = {};
  let turns = 0;
  let lostTroops = 0;
  for (let i = 1; i <= SEEDS; i++) {
    let s = createSession(registry, encounterId, party, (i * 2654435761) >>> 0, formation);
    const start = s.state.combatants.filter((c) => c.side === 'PLAYER').reduce((n, c) => n + c.troops, 0);
    while (s.result === 'ONGOING') s = executeTurn(s).session;
    results[s.result] = (results[s.result] ?? 0) + 1;
    turns += s.history.length;
    lostTroops += 1 - s.state.combatants.filter((c) => c.side === 'PLAYER').reduce((n, c) => n + c.troops, 0) / start;
  }
  console.log(`${encounterId.padEnd(28)} ${JSON.stringify(results).padEnd(20)} avgTurns=${(turns / SEEDS).toFixed(1)} avgTroopLoss=${((lostTroops / SEEDS) * 100).toFixed(0)}%`);
}
