export type Side = 'PLAYER' | 'ENEMY';
export type UnitType = 'SPEAR' | 'CAVALRY' | 'ARCHER';

export interface Stats {
  strength: number;
  intelligence: number;
  command: number;
  speed: number;
}

export type StatusCode = 'CONFUSED' | 'INSPIRED' | 'TAUNTING';

export interface StatusInstance {
  code: StatusCode;
  /** Number of end-of-turn ticks remaining. Removed when it reaches 0. */
  remainingTurns: number;
}

/** Mirrors the content TraitEffect schema structurally; domain does not import schemas. */
export interface TraitCondition {
  selfTroopRatioAtLeast?: number;
  selfTroopRatioBelow?: number;
}

export type TraitEffect =
  | { type: 'PHYSICAL_DAMAGE_MULTIPLIER'; value: number; condition?: TraitCondition }
  | { type: 'TACTIC_DAMAGE_MULTIPLIER'; value: number; condition?: TraitCondition }
  | { type: 'HEAL_POWER_MULTIPLIER'; value: number; condition?: TraitCondition }
  | { type: 'DAMAGE_TAKEN_MULTIPLIER'; value: number; condition?: TraitCondition }
  | { type: 'CONTROL_SUCCESS_BONUS'; value: number };

export interface ModifierSet {
  physicalAttack: number;
  physicalDefense: number;
  tacticPower: number;
  speed: number;
}

export interface FormationSpec {
  id: string;
  party: ModifierSet;
  /** Five slot modifiers, slot 0 = front/lead. */
  slots: readonly ModifierSet[];
}

export type TacticTarget = 'SINGLE_ENEMY' | 'ALL_ENEMIES' | 'SINGLE_ALLY' | 'ALL_ALLIES' | 'SELF';

export type TacticEffectSpec =
  | { kind: 'DAMAGE'; power: number }
  | { kind: 'HEAL'; power: number }
  | { kind: 'STATUS'; status: StatusCode; durationTurns: number; baseChance?: number };

export interface TacticSpec {
  id: string;
  tpCost: number;
  target: TacticTarget;
  effect: TacticEffectSpec;
}

export interface Combatant {
  id: string;
  side: Side;
  stats: Stats;
  unitType: UnitType;
  level: number;
  weaponAttack: number;
  armorDefense: number;
  maxTroops: number;
  troops: number;
  /** Formation slot 0..4. */
  slot: number;
  statuses: StatusInstance[];
  traitEffects: TraitEffect[];
  /** Tactics this combatant may use. */
  tacticIds: string[];
}

export interface AttackCommand {
  type: 'ATTACK';
  actorId: string;
  targetId: string;
}

export interface DefendCommand {
  type: 'DEFEND';
  actorId: string;
}

export interface TacticCommand {
  type: 'TACTIC';
  actorId: string;
  tacticId: string;
  /** Required for SINGLE_ENEMY / SINGLE_ALLY tactics. */
  targetId?: string;
}

export type BattleCommand = AttackCommand | DefendCommand | TacticCommand;

export interface PartyTp {
  current: number;
  max: number;
}

export type BattleOutcome = 'ONGOING' | 'PLAYER_VICTORY' | 'PLAYER_DEFEAT' | 'DRAW';

export interface BattleState {
  turn: number;
  rngState: number;
  combatants: Combatant[];
  tp: Record<Side, PartyTp>;
  formations: Partial<Record<Side, FormationSpec>>;
  outcome: BattleOutcome;
}

/** Static rule data the domain needs but does not own (built from content). */
export interface BattleRules {
  tactics: Readonly<Record<string, TacticSpec>>;
}

export interface DamageEvent {
  type: 'DAMAGE';
  actorId: string;
  targetId: string;
  amount: number;
  tacticId?: string;
}

export interface HealEvent {
  type: 'HEAL';
  actorId: string;
  targetId: string;
  amount: number;
  tacticId: string;
}

export interface RoutEvent {
  type: 'ROUT';
  targetId: string;
}

export interface DefendEvent {
  type: 'DEFEND';
  actorId: string;
}

export interface TacticCastEvent {
  type: 'TACTIC_CAST';
  actorId: string;
  tacticId: string;
  tpCost: number;
}

export interface TacticFailedEvent {
  type: 'TACTIC_FAILED';
  actorId: string;
  tacticId: string;
  reason: 'NO_TP' | 'UNKNOWN_TACTIC' | 'NOT_LEARNED' | 'INVALID_TARGET';
}

export interface StatusAppliedEvent {
  type: 'STATUS_APPLIED';
  actorId: string;
  targetId: string;
  status: StatusCode;
  turns: number;
}

export interface StatusResistedEvent {
  type: 'STATUS_RESISTED';
  actorId: string;
  targetId: string;
  status: StatusCode;
  chance: number;
}

export interface StatusExpiredEvent {
  type: 'STATUS_EXPIRED';
  targetId: string;
  status: StatusCode;
}

export interface ActionSkippedEvent {
  type: 'ACTION_SKIPPED';
  actorId: string;
  reason: 'CONFUSED';
}

export interface TargetRedirectedEvent {
  type: 'TARGET_REDIRECTED';
  actorId: string;
  fromId: string;
  toId: string;
  reason: 'TAUNT' | 'TARGET_ROUTED';
}

export interface BattleEndEvent {
  type: 'BATTLE_END';
  outcome: Exclude<BattleOutcome, 'ONGOING'>;
}

export type BattleEvent =
  | DamageEvent
  | HealEvent
  | RoutEvent
  | DefendEvent
  | TacticCastEvent
  | TacticFailedEvent
  | StatusAppliedEvent
  | StatusResistedEvent
  | StatusExpiredEvent
  | ActionSkippedEvent
  | TargetRedirectedEvent
  | BattleEndEvent;

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}
