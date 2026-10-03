export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Tile map in ASCII rows. Walkable: '.' grass, '=' road, ',' tall grass, 'b' bridge.
 * Blocked: '#' rock, 'T' trees, '~' water. Unknown chars are blocked.
 */
export interface FieldMap {
  id: string;
  tileSize: number;
  rows: readonly string[];
  playerStart: Vec2;
}

export type EnemyBehavior = 'GUARD' | 'PATROL';
export type EnemyMode = 'GUARD' | 'PATROL' | 'CHASE' | 'RETURN' | 'ENGAGED' | 'DEFEATED';

export interface FieldEnemySpec {
  id: string;
  encounterId: string;
  behavior: EnemyBehavior;
  home: Vec2;
  /** Patrol waypoints (PATROL only); home is implicitly the first point. */
  waypoints?: readonly Vec2[];
  aggroRadius: number;
  /** Max distance from home before giving up the chase. */
  leashRadius: number;
  speed: number;
  chaseSpeed: number;
}

export interface FieldEnemy extends FieldEnemySpec {
  pos: Vec2;
  mode: EnemyMode;
  waypointIndex: number;
}

export interface PlayerState {
  pos: Vec2;
  /** Remaining path (world-space points); empty when idle. */
  path: Vec2[];
  target: Vec2 | null;
  speed: number;
  radius: number;
}

export interface WorldState {
  map: FieldMap;
  player: PlayerState;
  enemies: FieldEnemy[];
  paused: boolean;
  timeMs: number;
  /** Encounters are suppressed until this time (post-battle / flee grace). */
  graceUntilMs: number;
}

export type WorldEvent =
  | { type: 'PATH_SET'; target: Vec2; waypoints: number }
  | { type: 'PATH_FAILED'; target: Vec2 }
  | { type: 'ARRIVED' }
  | { type: 'AGGRO_CHANGED'; enemyId: string; mode: EnemyMode }
  | { type: 'ENCOUNTER'; enemyId: string; encounterId: string };

export interface WorldInput {
  /** Virtual d-pad / keyboard direction; overrides tap path while held. */
  direction?: Vec2 | null;
}
