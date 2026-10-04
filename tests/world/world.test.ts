import { describe, expect, it } from 'vitest';
import {
  createWorld,
  findTilePath,
  isFree,
  resolveEncounter,
  setMoveTarget,
  tickWorld,
  tileOf,
  WORLD_CONFIG,
  type FieldEnemySpec,
  type FieldMap,
  type WorldEvent,
  type WorldState,
} from '../../src/game/domain/world/index';
import { PLACEHOLDER_ENEMIES, PLACEHOLDER_FIELD } from '../../src/game/world/placeholderField';

const open: FieldMap = {
  id: 'T',
  tileSize: 32,
  playerStart: { x: 48, y: 48 },
  rows: ['..........', '..........', '....##....', '....##....', '....##....', '..........', '..........'],
};

function run(state: WorldState, ms: number, input = {}) {
  const events: WorldEvent[] = [];
  let s = state;
  for (let t = 0; t < ms; t += 16) {
    const r = tickWorld(s, input, 16);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

describe('tap-to-move', () => {
  it('walks straight to an open target and arrives', () => {
    const w = setMoveTarget(createWorld(open, []), { x: 280, y: 48 });
    expect(w.events[0]).toMatchObject({ type: 'PATH_SET', waypoints: 1 });
    const { state, events } = run(w.state, 2000);
    expect(state.player.pos).toEqual({ x: 280, y: 48 });
    expect(events).toContainEqual({ type: 'ARRIVED' });
  });

  it('routes around an obstacle and never enters blocked tiles', () => {
    const start = { ...createWorld(open, []), player: { ...createWorld(open, []).player, pos: { x: 80, y: 112 } } };
    const w = setMoveTarget(start, { x: 240, y: 112 });
    expect(w.events[0]).toMatchObject({ type: 'PATH_SET' });
    expect(w.state.player.path.length).toBeGreaterThan(1);
    let s = w.state;
    for (let i = 0; i < 200; i++) {
      s = tickWorld(s, {}, 16).state;
      expect(isFree(open, s.player.pos, WORLD_CONFIG.playerRadius)).toBe(true);
    }
    expect(Math.hypot(s.player.pos.x - 240, s.player.pos.y - 112)).toBeLessThan(1);
  });

  it('retargets mid-move and snaps obstacle taps to the nearest walkable tile', () => {
    let w = setMoveTarget(createWorld(open, []), { x: 300, y: 200 });
    w = { state: run(w.state, 300).state, events: [] };
    const re = setMoveTarget(w.state, { x: 48, y: 200 });
    expect(re.state.player.target).toEqual({ x: 48, y: 200 });
    const onRock = setMoveTarget(createWorld(open, []), { x: 150, y: 100 });
    const t = tileOf(open, onRock.state.player.target!);
    expect(open.rows[t.r]![t.c]).toBe('.');
  });

  it('short-range A* budget refuses unbounded searches (no full-region auto-nav)', () => {
    const wide: FieldMap = { ...open, rows: Array.from({ length: 80 }, () => '.'.repeat(80)) };
    expect(findTilePath(wide, { c: 0, r: 0 }, { c: 79, r: 79 }, 50)).toBeNull();
    expect(findTilePath(wide, { c: 0, r: 0 }, { c: 3, r: 3 }, 50)).not.toBeNull();
  });

  it('d-pad direction moves the player and cancels a tap path', () => {
    const w = setMoveTarget(createWorld(open, []), { x: 280, y: 48 });
    const r = tickWorld(w.state, { direction: { x: 0, y: 1 } }, 100);
    expect(r.state.player.path).toEqual([]);
    expect(r.state.player.pos.y).toBeGreaterThan(48);
  });
});

describe('visible enemy', () => {
  const guard: FieldEnemySpec = { id: 'E', encounterId: 'ENC_X', behavior: 'GUARD', home: { x: 280, y: 48 }, aggroRadius: 100, leashRadius: 400, speed: 60, chaseSpeed: 120 };

  it('guards, aggroes into chase, and triggers one encounter on contact', () => {
    const w = setMoveTarget(createWorld(open, [guard]), { x: 280, y: 48 });
    const { state, events } = run(w.state, 3000);
    const modes = events.filter((e) => e.type === 'AGGRO_CHANGED').map((e) => (e as { mode: string }).mode);
    expect(modes).toEqual(['CHASE', 'ENGAGED']);
    expect(events.filter((e) => e.type === 'ENCOUNTER')).toEqual([{ type: 'ENCOUNTER', enemyId: 'E', encounterId: 'ENC_X' }]);
    expect(state.paused).toBe(true);
    expect(tickWorld(state, {}, 16).state).toBe(state); // paused world does not advance
  });

  it('defeated enemies leave; fled enemies return home after a grace period', () => {
    const engaged = run(setMoveTarget(createWorld(open, [guard]), { x: 280, y: 48 }).state, 3000).state;
    const won = resolveEncounter(engaged, 'E', 'DEFEATED');
    expect(won.enemies[0]!.mode).toBe('DEFEATED');
    expect(run(won, 2000).events.filter((e) => e.type === 'ENCOUNTER')).toEqual([]);
    const fled = resolveEncounter(engaged, 'E', 'FLED');
    const after = run(fled, 200);
    expect(after.state.enemies[0]!.mode).toBe('RETURN');
    expect(after.events.filter((e) => e.type === 'ENCOUNTER')).toEqual([]);
  });

  it('leash: a chase beyond leash radius returns home', () => {
    const shortLeash = { ...guard, leashRadius: 40 };
    const w = createWorld(open, [shortLeash]);
    const near = { ...w, player: { ...w.player, pos: { x: 200, y: 48 } } };
    const away = setMoveTarget(run(near, 50).state, { x: 48, y: 200 }).state;
    const { events } = run(away, 3000);
    const modes = events.filter((e) => e.type === 'AGGRO_CHANGED').map((e) => (e as { mode: string }).mode);
    expect(modes).toContain('RETURN');
  });

  it('world simulation is deterministic for identical inputs', () => {
    const a = run(setMoveTarget(createWorld(open, [guard]), { x: 280, y: 48 }).state, 1500);
    const b = run(setMoveTarget(createWorld(open, [guard]), { x: 280, y: 48 }).state, 1500);
    expect(a).toEqual(b);
  });
});

describe('placeholder field', () => {
  it('player start and enemy home are walkable and the bridge is reachable', () => {
    const w = createWorld(PLACEHOLDER_FIELD, PLACEHOLDER_ENEMIES);
    expect(isFree(PLACEHOLDER_FIELD, w.player.pos, WORLD_CONFIG.playerRadius)).toBe(true);
    for (const e of PLACEHOLDER_ENEMIES) expect(isFree(PLACEHOLDER_FIELD, e.home, WORLD_CONFIG.enemyRadius)).toBe(true);
    expect(findTilePath(PLACEHOLDER_FIELD, tileOf(PLACEHOLDER_FIELD, w.player.pos), { c: 10, r: 12 })).not.toBeNull();
  });

  it('walking north along the road eventually meets the bridge scout', () => {
    let s = createWorld(PLACEHOLDER_FIELD, PLACEHOLDER_ENEMIES);
    const events: WorldEvent[] = [];
    for (const waypoint of [{ x: 8.5 * 32, y: 20.5 * 32 }, { x: 9.5 * 32, y: 15.5 * 32 }]) {
      s = setMoveTarget(s, waypoint).state;
      const r = run(s, 6000);
      s = r.state;
      events.push(...r.events);
      if (s.paused) break;
    }
    expect(events.some((e) => e.type === 'ENCOUNTER')).toBe(true);
  });
});
