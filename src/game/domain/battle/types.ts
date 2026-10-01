export type Side = 'PLAYER' | 'ENEMY';
export type UnitType = 'SPEAR' | 'CAVALRY' | 'ARCHER';

export interface Stats {
  strength: number;
  intelligence: number;
  command: number;
  speed: number;
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

export type BattleCommand = AttackCommand | DefendCommand;

export interface BattleState {
  turn: number;
  rngState: number;
  combatants: Combatant[];
}

export interface DamageEvent {
  type: 'DAMAGE';
  actorId: string;
  targetId: string;
  amount: number;
}

export interface RoutEvent {
  type: 'ROUT';
  targetId: string;
}

export interface DefendEvent {
  type: 'DEFEND';
  actorId: string;
}

export type BattleEvent = DamageEvent | RoutEvent | DefendEvent;

export interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}
