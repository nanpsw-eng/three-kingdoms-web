import { findTilePath, hasClearLine, isFree, nearestWalkable, smoothPath, tileCenter, tileOf, mapSize } from './grid.js';
import type { FieldEnemy, FieldEnemySpec, FieldMap, Vec2, WorldEvent, WorldInput, WorldState } from './types.js';

export const WORLD_CONFIG = {
  playerSpeed: 150, // px per second
  playerRadius: 12,
  enemyRadius: 12,
  arriveEpsilon: 2,
  /** Encounter suppression after a battle or flee, ms. */
  graceMs: 1500,
  /** Max simulation step; larger dt is subdivided for stable collision. */
  maxStepMs: 50,
} as const;

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export function createWorld(map: FieldMap, enemies: readonly FieldEnemySpec[]): WorldState {
  return {
    map,
    player: { pos: { ...map.playerStart }, path: [], target: null, speed: WORLD_CONFIG.playerSpeed, radius: WORLD_CONFIG.playerRadius },
    enemies: enemies.map((e) => ({ ...e, pos: { ...e.home }, mode: e.behavior, waypointIndex: 0 })),
    paused: false,
    timeMs: 0,
    graceUntilMs: 0,
  };
}

function cloneWorld(s: WorldState): WorldState {
  return {
    ...s,
    player: { ...s.player, pos: { ...s.player.pos }, path: s.player.path.map((p) => ({ ...p })), target: s.player.target ? { ...s.player.target } : null },
    enemies: s.enemies.map((e) => ({ ...e, pos: { ...e.pos } })),
  };
}

/**
 * Tap-to-Move: convert a world point into a short smoothed path.
 * Taps on obstacles snap to the nearest walkable tile. Retargeting replaces the current path.
 */
export function setMoveTarget(state: WorldState, point: Vec2): { state: WorldState; events: WorldEvent[] } {
  const next = cloneWorld(state);
  const { map, player } = next;
  const { width, height } = mapSize(map);
  const clamped = { x: Math.max(0, Math.min(width - 1, point.x)), y: Math.max(0, Math.min(height - 1, point.y)) };
  const goalTile = nearestWalkable(map, tileOf(map, clamped));
  if (!goalTile) return { state: next, events: [{ type: 'PATH_FAILED', target: clamped }] };
  const goal = isFree(map, clamped, player.radius) && goalTile.c === tileOf(map, clamped).c && goalTile.r === tileOf(map, clamped).r ? clamped : tileCenter(map, goalTile);

  let path: Vec2[] | null = null;
  if (hasClearLine(map, player.pos, goal, player.radius)) {
    path = [goal];
  } else {
    const tiles = findTilePath(map, tileOf(map, player.pos), goalTile);
    if (tiles) {
      const points = [player.pos, ...tiles.slice(1, -1).map((t) => tileCenter(map, t)), goal];
      path = smoothPath(map, points, player.radius).slice(1);
    }
  }
  if (!path) {
    next.player.path = [];
    next.player.target = null;
    return { state: next, events: [{ type: 'PATH_FAILED', target: goal }] };
  }
  next.player.path = path;
  next.player.target = goal;
  return { state: next, events: [{ type: 'PATH_SET', target: goal, waypoints: path.length }] };
}

/** Move with axis-separated sliding so bodies glide along walls instead of sticking. */
function moveWithSlide(map: FieldMap, pos: Vec2, dx: number, dy: number, radius: number): Vec2 {
  const full = { x: pos.x + dx, y: pos.y + dy };
  if (isFree(map, full, radius)) return full;
  const xOnly = { x: pos.x + dx, y: pos.y };
  if (dx !== 0 && isFree(map, xOnly, radius)) return xOnly;
  const yOnly = { x: pos.x, y: pos.y + dy };
  if (dy !== 0 && isFree(map, yOnly, radius)) return yOnly;
  return pos;
}

function moveToward(map: FieldMap, pos: Vec2, target: Vec2, maxStep: number, radius: number): { pos: Vec2; arrived: boolean } {
  const d = dist(pos, target);
  if (d <= Math.max(maxStep, WORLD_CONFIG.arriveEpsilon)) {
    return isFree(map, target, radius) ? { pos: { ...target }, arrived: true } : { pos, arrived: true };
  }
  const nextPos = moveWithSlide(map, pos, ((target.x - pos.x) / d) * maxStep, ((target.y - pos.y) / d) * maxStep, radius);
  return { pos: nextPos, arrived: false };
}

function stepEnemy(state: WorldState, enemy: FieldEnemy, dtSec: number, events: WorldEvent[]): void {
  if (enemy.mode === 'ENGAGED' || enemy.mode === 'DEFEATED') return;
  const { map, player } = state;
  const toPlayer = dist(enemy.pos, player.pos);
  const fromHome = dist(enemy.pos, enemy.home);
  const setMode = (mode: FieldEnemy['mode']) => {
    if (enemy.mode !== mode) {
      enemy.mode = mode;
      events.push({ type: 'AGGRO_CHANGED', enemyId: enemy.id, mode });
    }
  };

  const inGrace = state.timeMs < state.graceUntilMs;
  if ((enemy.mode === 'GUARD' || enemy.mode === 'PATROL') && !inGrace && toPlayer <= enemy.aggroRadius) setMode('CHASE');
  else if (enemy.mode === 'CHASE' && (fromHome > enemy.leashRadius || toPlayer > enemy.aggroRadius * 1.6 || inGrace)) setMode('RETURN');

  if (enemy.mode === 'CHASE') {
    enemy.pos = moveToward(map, enemy.pos, player.pos, enemy.chaseSpeed * dtSec, WORLD_CONFIG.enemyRadius).pos;
  } else if (enemy.mode === 'RETURN') {
    const r = moveToward(map, enemy.pos, enemy.home, enemy.speed * dtSec, WORLD_CONFIG.enemyRadius);
    enemy.pos = r.pos;
    if (r.arrived || dist(enemy.pos, enemy.home) < 4) {
      enemy.waypointIndex = 0;
      setMode(enemy.behavior);
    }
  } else if (enemy.mode === 'PATROL') {
    const points = [enemy.home, ...(enemy.waypoints ?? [])];
    const target = points[enemy.waypointIndex % points.length]!;
    const r = moveToward(map, enemy.pos, target, enemy.speed * dtSec, WORLD_CONFIG.enemyRadius);
    enemy.pos = r.pos;
    if (r.arrived) enemy.waypointIndex = (enemy.waypointIndex + 1) % points.length;
  }
}

function step(state: WorldState, input: WorldInput, dtMs: number, events: WorldEvent[]): void {
  const dtSec = dtMs / 1000;
  const { map, player } = state;
  state.timeMs += dtMs;

  const dir = input.direction;
  if (dir && (dir.x !== 0 || dir.y !== 0)) {
    // D-pad overrides tap path while held.
    player.path = [];
    player.target = null;
    const len = Math.hypot(dir.x, dir.y);
    player.pos = moveWithSlide(map, player.pos, (dir.x / len) * player.speed * dtSec, (dir.y / len) * player.speed * dtSec, player.radius);
  } else if (player.path.length > 0) {
    let budget = player.speed * dtSec;
    while (budget > 0 && player.path.length > 0) {
      const waypoint = player.path[0]!;
      const before = { ...player.pos };
      const r = moveToward(map, player.pos, waypoint, budget, player.radius);
      budget -= dist(before, r.pos);
      player.pos = r.pos;
      if (r.arrived) player.path.shift();
      else if (dist(before, r.pos) < 0.01) {
        player.path = []; // blocked: stop rather than jitter
        break;
      } else break;
    }
    if (player.path.length === 0) {
      player.target = null;
      events.push({ type: 'ARRIVED' });
    }
  }

  for (const enemy of state.enemies) stepEnemy(state, enemy, dtSec, events);

  if (state.timeMs >= state.graceUntilMs) {
    const touching = state.enemies
      .filter((e) => e.mode !== 'ENGAGED' && e.mode !== 'DEFEATED' && dist(e.pos, player.pos) <= player.radius + WORLD_CONFIG.enemyRadius)
      .sort((a, b) => dist(a.pos, player.pos) - dist(b.pos, player.pos) || a.id.localeCompare(b.id))[0];
    if (touching) {
      touching.mode = 'ENGAGED';
      events.push({ type: 'AGGRO_CHANGED', enemyId: touching.id, mode: 'ENGAGED' });
      events.push({ type: 'ENCOUNTER', enemyId: touching.id, encounterId: touching.encounterId });
      player.path = [];
      player.target = null;
      state.paused = true;
    }
  }
}

/** Advance the world by dtMs. Pure: returns new state + events. Paused worlds do not advance. */
export function tickWorld(state: WorldState, input: WorldInput, dtMs: number): { state: WorldState; events: WorldEvent[] } {
  if (state.paused || dtMs <= 0) return { state, events: [] };
  const next = cloneWorld(state);
  const events: WorldEvent[] = [];
  let remaining = dtMs;
  while (remaining > 0 && !next.paused) {
    const d = Math.min(WORLD_CONFIG.maxStepMs, remaining);
    step(next, input, d, events);
    remaining -= d;
  }
  return { state: next, events };
}

/** Return from battle: defeated enemies leave the field; others reset. Grants encounter grace. */
export function resolveEncounter(state: WorldState, enemyId: string, result: 'DEFEATED' | 'FLED'): WorldState {
  const next = cloneWorld(state);
  for (const e of next.enemies) {
    if (e.id !== enemyId) continue;
    if (result === 'DEFEATED') e.mode = 'DEFEATED';
    else {
      e.mode = 'RETURN';
    }
  }
  next.paused = false;
  next.graceUntilMs = next.timeMs + WORLD_CONFIG.graceMs;
  return next;
}
