import type { ContentRegistry } from '../content/registry';
import {
  applyCommandOverride,
  buildAllAttackCommands,
  buildRepeatCommands,
  buildSmartCommands,
  createBattleState,
  resolveTurn,
  type BattleCommand,
  type BattleRules,
  type BattleState,
  type Combatant,
  type TurnResult,
} from '../domain/battle/index';
import { buildBattleRules, combatantFromGeneral, formationSpec } from './fromContent';

export type PlaybackSpeed = 1 | 2 | 3;
export type SessionResult = 'ONGOING' | 'VICTORY' | 'DEFEAT' | 'DRAW' | 'RETREAT';

export interface PartyMemberInput {
  generalId: string;
  level: number;
  troops: number;
  tacticIds: string[];
}

/**
 * Battle session: orchestrates one battle on top of the pure domain.
 * Note what is NOT here: playback speed. Speed is a UI/rendering concern and can never
 * influence results (docs/specs/COMBAT.md §Determinism).
 */
export interface BattleSession {
  encounterId: string;
  seed: number;
  rules: BattleRules;
  state: BattleState;
  /** Player commands for the upcoming turn (Smart Command defaults + overrides). */
  plan: BattleCommand[];
  lastPlayerCommands: BattleCommand[];
  history: TurnResult[];
  result: SessionResult;
  canRetreat: boolean;
  isBoss: boolean;
}

export function createSession(
  registry: ContentRegistry,
  encounterId: string,
  party: readonly PartyMemberInput[],
  seed: number,
  playerFormationId: string | null = null,
): BattleSession {
  const encounter = registry.encounters.get(encounterId);
  if (!encounter) throw new Error(`unknown encounter ${encounterId}`);
  const players: Combatant[] = party.slice(0, 5).map((m, slot) =>
    combatantFromGeneral(registry, m.generalId, { side: 'PLAYER', slot, level: m.level, troops: m.troops, tacticIds: m.tacticIds }),
  );
  const enemies: Combatant[] = encounter.enemies.map((e) =>
    combatantFromGeneral(registry, e.generalId, {
      side: 'ENEMY',
      slot: e.slot,
      level: e.level,
      weaponAttack: e.weaponAttack,
      armorDefense: e.armorDefense,
      ...(e.troops !== undefined ? { troops: e.troops } : {}),
      ...(e.combatId !== undefined ? { combatId: e.combatId } : {}),
    }),
  );
  const formations: Parameters<typeof createBattleState>[0]['formations'] = {};
  if (playerFormationId) formations.PLAYER = formationSpec(registry, playerFormationId);
  if (encounter.enemyFormationId) formations.ENEMY = formationSpec(registry, encounter.enemyFormationId);
  const state = createBattleState({ seed, combatants: [...players.filter((p) => p.troops > 0), ...enemies], formations });
  return {
    encounterId,
    seed,
    rules: buildBattleRules(registry),
    state,
    plan: buildSmartCommands(state, 'PLAYER'),
    lastPlayerCommands: [],
    history: [],
    result: 'ONGOING',
    canRetreat: encounter.canRetreat,
    isBoss: encounter.isBoss,
  };
}

/** Deterministic enemy policy: Smart attacks; damage tactics on even turns when TP allows. */
export function enemyCommands(state: BattleState, rules: BattleRules): BattleCommand[] {
  let tp = state.tp.ENEMY.current;
  return buildSmartCommands(state, 'ENEMY').map((cmd) => {
    if (cmd.type !== 'ATTACK' || state.turn % 2 !== 0) return cmd;
    const actor = state.combatants.find((c) => c.id === cmd.actorId)!;
    const tactic = actor.tacticIds.map((id) => rules.tactics[id]).find((t) => t?.effect.kind === 'DAMAGE' && t.tpCost <= tp);
    if (!tactic) return cmd;
    tp -= tactic.tpCost;
    return { type: 'TACTIC', actorId: actor.id, tacticId: tactic.id, targetId: cmd.targetId };
  });
}

export function setCommand(session: BattleSession, command: BattleCommand): BattleSession {
  return { ...session, plan: applyCommandOverride(session.plan, command) };
}

export function resetPlan(session: BattleSession, mode: 'SMART' | 'REPEAT' | 'ALL_ATTACK'): BattleSession {
  const plan =
    mode === 'REPEAT' && session.lastPlayerCommands.length > 0
      ? buildRepeatCommands(session.state, 'PLAYER', session.lastPlayerCommands, session.rules)
      : mode === 'ALL_ATTACK'
        ? buildAllAttackCommands(session.state, 'PLAYER')
        : buildSmartCommands(session.state, 'PLAYER');
  return { ...session, plan };
}

const OUTCOME_TO_RESULT = { ONGOING: 'ONGOING', PLAYER_VICTORY: 'VICTORY', PLAYER_DEFEAT: 'DEFEAT', DRAW: 'DRAW' } as const;

/** Resolve one turn. `nextPlan` decides the following turn's defaults (Smart or Repeat). */
export function executeTurn(session: BattleSession, nextPlan: 'SMART' | 'REPEAT' = 'SMART'): { session: BattleSession; turn: TurnResult } {
  if (session.result !== 'ONGOING') throw new Error('battle already finished');
  const turn = resolveTurn(session.state, [...session.plan, ...enemyCommands(session.state, session.rules)], session.rules);
  const next: BattleSession = {
    ...session,
    state: turn.state,
    lastPlayerCommands: session.plan,
    history: [...session.history, turn],
    result: OUTCOME_TO_RESULT[turn.state.outcome],
  };
  return { session: resetPlan(next, nextPlan), turn };
}

/** Retreat (non-boss only). Neutral prototype rule: always succeeds; see report BLOCKED_DECISION. */
export function retreat(session: BattleSession): BattleSession {
  if (!session.canRetreat || session.result !== 'ONGOING') return session;
  return { ...session, result: 'RETREAT' };
}

/** Player troops to persist after the battle (by general id). */
export function survivingTroops(session: BattleSession): Record<string, number> {
  return Object.fromEntries(session.state.combatants.filter((c) => c.side === 'PLAYER').map((c) => [c.id, c.troops]));
}
