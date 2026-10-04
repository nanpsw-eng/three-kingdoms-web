import { resolveTurn, EMPTY_RULES } from './resolveTurn.js';
import { buildSmartCommands } from './smartCommand.js';
import type { BattleCommand, BattleRules, BattleState, Side, TurnResult } from './types.js';

export type CommandPolicy = (state: BattleState, side: Side) => BattleCommand[];

export const smartCommandPolicy: CommandPolicy = (state, side) => buildSmartCommands(state, side);

export interface AutoBattleResult {
  state: BattleState;
  turns: TurnResult[];
}

/** Run turns until the battle ends or `maxTurns` turns elapse. Pure and deterministic. */
export function runAutoBattle(
  initial: BattleState,
  rules: BattleRules = EMPTY_RULES,
  options: { maxTurns?: number; player?: CommandPolicy; enemy?: CommandPolicy } = {},
): AutoBattleResult {
  const player = options.player ?? smartCommandPolicy;
  const enemy = options.enemy ?? smartCommandPolicy;
  const maxTurns = options.maxTurns ?? 100;
  const turns: TurnResult[] = [];
  let state = initial;
  while (state.outcome === 'ONGOING' && turns.length < maxTurns) {
    const result = resolveTurn(state, [...player(state, 'PLAYER'), ...enemy(state, 'ENEMY')], rules);
    turns.push(result);
    state = result.state;
  }
  return { state, turns };
}
