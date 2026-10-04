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
  type TacticSpec,
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
  /** Equipped item ids; omitted = unequipped. */
  equipment?: { weapon?: string; armor?: string; accessory?: string };
}

export interface BattleTelegraph {
  announceTurn: number;
  executeTurn: number;
  actorId: string;
  tacticId: string;
  messageKey: string;
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
  telegraphs: BattleTelegraph[];
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
    combatantFromGeneral(registry, m.generalId, { side: 'PLAYER', slot, level: m.level, troops: m.troops, tacticIds: m.tacticIds, ...(m.equipment ? { equipment: m.equipment } : {}) }),
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
  const telegraphs = encounter.telegraphs.map((telegraph) => {
    const enemy = encounter.enemies.find((e) => e.generalId === telegraph.actorGeneralId)!;
    return {
      announceTurn: telegraph.announceTurn,
      executeTurn: telegraph.executeTurn,
      actorId: enemy.combatId ?? enemy.generalId,
      tacticId: telegraph.tacticId,
      messageKey: telegraph.messageKey,
    };
  });
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
    telegraphs,
  };
}

export function activeTelegraph(session: BattleSession): BattleTelegraph | null {
  return session.telegraphs.find(
    (t) => t.announceTurn === session.state.turn && (session.state.combatants.find((c) => c.id === t.actorId)?.troops ?? 0) > 0,
  ) ?? null;
}

function lowestTroopAlly(state: BattleState, side: Combatant['side']): Combatant | null {
  const living = state.combatants.filter((c) => c.side === side && c.troops > 0);
  return living.sort((a, b) => a.troops / a.maxTroops - b.troops / b.maxTroops || a.id.localeCompare(b.id))[0] ?? null;
}

function strongestEnemy(state: BattleState, side: Combatant['side']): Combatant | null {
  return state.combatants
    .filter((c) => c.side !== side && c.troops > 0)
    .sort((a, b) => b.stats.strength - a.stats.strength || a.id.localeCompare(b.id))[0] ?? null;
}

function tacticalCommand(
  session: BattleSession,
  actor: Combatant,
  fallback: BattleCommand,
  availableTp: number,
): BattleCommand {
  const learned = actor.tacticIds.map((id) => session.rules.tactics[id]).filter((t): t is TacticSpec => Boolean(t));
  const affordable = learned.filter((t) => t.tpCost <= availableTp);

  const forced = session.telegraphs.find((t) => t.executeTurn === session.state.turn && t.actorId === actor.id);
  if (forced) {
    const tactic = session.rules.tactics[forced.tacticId];
    if (tactic && actor.tacticIds.includes(tactic.id) && tactic.tpCost <= availableTp) {
      return { type: 'TACTIC', actorId: actor.id, tacticId: tactic.id };
    }
  }

  const lowAlly = lowestTroopAlly(session.state, actor.side);
  if (lowAlly && lowAlly.troops / lowAlly.maxTroops <= 0.35) {
    const heal = affordable.find((t) => t.effect.kind === 'HEAL' && t.target === 'SINGLE_ALLY');
    if (heal) return { type: 'TACTIC', actorId: actor.id, tacticId: heal.id, targetId: lowAlly.id };
  }

  if (session.state.turn === 1) {
    const support = affordable.find((t) => {
      if (t.effect.kind !== 'STATUS' || t.target !== 'ALL_ALLIES') return false;
      const status = t.effect.status;
      return !session.state.combatants.some(
        (c) => c.side === actor.side && c.statuses.some((s) => s.code === status),
      );
    });
    if (support) return { type: 'TACTIC', actorId: actor.id, tacticId: support.id };
  }

  if (session.state.turn % 3 === 0) {
    const control = affordable.find((t) => t.effect.kind === 'STATUS' && t.effect.baseChance !== undefined && t.target === 'SINGLE_ENEMY');
    const target = strongestEnemy(session.state, actor.side);
    if (control && target) return { type: 'TACTIC', actorId: actor.id, tacticId: control.id, targetId: target.id };
  }

  if (session.state.turn % 2 === 0) {
    const damage = affordable.find((t) => t.effect.kind === 'DAMAGE');
    if (damage) {
      const target = strongestEnemy(session.state, actor.side);
      if (damage.target === 'ALL_ENEMIES') return { type: 'TACTIC', actorId: actor.id, tacticId: damage.id };
      if (target) return { type: 'TACTIC', actorId: actor.id, tacticId: damage.id, targetId: target.id };
    }
  }

  return fallback;
}

/** Deterministic enemy policy with content-driven forced telegraphs and small tactical heuristics. */
export function enemyCommands(session: BattleSession): BattleCommand[] {
  let tp = session.state.tp.ENEMY.current;
  return buildSmartCommands(session.state, 'ENEMY').map((fallback) => {
    const actor = session.state.combatants.find((c) => c.id === fallback.actorId)!;
    const command = tacticalCommand(session, actor, fallback, tp);
    if (command.type === 'TACTIC') tp -= session.rules.tactics[command.tacticId]?.tpCost ?? 0;
    return command;
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
  const turn = resolveTurn(session.state, [...session.plan, ...enemyCommands(session)], session.rules);
  const next: BattleSession = {
    ...session,
    state: turn.state,
    lastPlayerCommands: session.plan,
    history: [...session.history, turn],
    result: OUTCOME_TO_RESULT[turn.state.outcome],
  };
  return { session: resetPlan(next, nextPlan), turn };
}

/** BD-03: retreat is deterministic. Allowed encounters succeed immediately; locked encounters remain ongoing. */
export function retreat(session: BattleSession): BattleSession {
  if (!session.canRetreat || session.result !== 'ONGOING') return session;
  return { ...session, result: 'RETREAT' };
}

/** Player troops to persist after the battle (by general id). */
export function survivingTroops(session: BattleSession): Record<string, number> {
  return Object.fromEntries(session.state.combatants.filter((c) => c.side === 'PLAYER').map((c) => [c.id, c.troops]));
}
