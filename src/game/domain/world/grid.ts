import type { FieldMap, Vec2 } from './types.js';

const WALKABLE = new Set(['.', '=', ',', 'b']);

export interface Tile {
  c: number;
  r: number;
}

export function mapSize(map: FieldMap): { cols: number; rows: number; width: number; height: number } {
  const cols = Math.max(...map.rows.map((r) => r.length));
  return { cols, rows: map.rows.length, width: cols * map.tileSize, height: map.rows.length * map.tileSize };
}

export function isWalkableTile(map: FieldMap, c: number, r: number): boolean {
  const row = map.rows[r];
  if (row === undefined || c < 0 || c >= row.length) return false;
  return WALKABLE.has(row[c]!);
}

export function tileOf(map: FieldMap, p: Vec2): Tile {
  return { c: Math.floor(p.x / map.tileSize), r: Math.floor(p.y / map.tileSize) };
}

export function tileCenter(map: FieldMap, t: Tile): Vec2 {
  return { x: (t.c + 0.5) * map.tileSize, y: (t.r + 0.5) * map.tileSize };
}

/** A circle of `radius` at p overlaps no blocked tile. */
export function isFree(map: FieldMap, p: Vec2, radius: number): boolean {
  const ts = map.tileSize;
  const c0 = Math.floor((p.x - radius) / ts);
  const c1 = Math.floor((p.x + radius) / ts);
  const r0 = Math.floor((p.y - radius) / ts);
  const r1 = Math.floor((p.y + radius) / ts);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (isWalkableTile(map, c, r)) continue;
      const nx = Math.max(c * ts, Math.min(p.x, (c + 1) * ts));
      const ny = Math.max(r * ts, Math.min(p.y, (r + 1) * ts));
      if ((p.x - nx) ** 2 + (p.y - ny) ** 2 < radius * radius) return false;
    }
  }
  return true;
}

/** Nearest walkable tile by ring search (deterministic order). */
export function nearestWalkable(map: FieldMap, t: Tile, maxRing = 6): Tile | null {
  if (isWalkableTile(map, t.c, t.r)) return t;
  for (let ring = 1; ring <= maxRing; ring++) {
    let best: Tile | null = null;
    let bestD = Infinity;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = t.c + dc;
        const r = t.r + dr;
        const d = dc * dc + dr * dr;
        if (isWalkableTile(map, c, r) && d < bestD) {
          best = { c, r };
          bestD = d;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** Straight segment stays clear for a body of `radius` (sampled). */
export function hasClearLine(map: FieldMap, a: Vec2, b: Vec2, radius: number): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / (map.tileSize / 4)));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isFree(map, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, radius)) return false;
  }
  return true;
}

/**
 * Short-range A* over 8-neighbour tiles (no corner cutting) with an expansion budget.
 * The budget deliberately prevents full-region auto-navigation (docs/specs/WORLD.md).
 * Returns tile path including start and goal, or null.
 */
export function findTilePath(map: FieldMap, start: Tile, goal: Tile, maxExpanded = 900): Tile[] | null {
  const { cols } = mapSize(map);
  const key = (t: Tile) => t.r * cols + t.c;
  const h = (t: Tile) => {
    const dx = Math.abs(t.c - goal.c);
    const dy = Math.abs(t.r - goal.r);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  const open: Array<{ t: Tile; f: number; g: number; order: number }> = [{ t: start, f: h(start), g: 0, order: 0 }];
  const came = new Map<number, Tile>();
  const gScore = new Map<number, number>([[key(start), 0]]);
  const closed = new Set<number>();
  let order = 0;
  let expanded = 0;

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f || a.order - b.order);
    const current = open.shift()!;
    const ck = key(current.t);
    if (closed.has(ck)) continue;
    if (current.t.c === goal.c && current.t.r === goal.r) {
      const path = [current.t];
      let k = ck;
      while (came.has(k)) {
        const prev = came.get(k)!;
        path.unshift(prev);
        k = key(prev);
      }
      return path;
    }
    closed.add(ck);
    if (++expanded > maxExpanded) return null;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const n = { c: current.t.c + dc, r: current.t.r + dr };
        if (!isWalkableTile(map, n.c, n.r)) continue;
        if (dr !== 0 && dc !== 0 && (!isWalkableTile(map, current.t.c + dc, current.t.r) || !isWalkableTile(map, current.t.c, current.t.r + dr))) continue;
        const nk = key(n);
        if (closed.has(nk)) continue;
        const g = current.g + (dr !== 0 && dc !== 0 ? Math.SQRT2 : 1);
        if (g < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, g);
          came.set(nk, current.t);
          open.push({ t: n, g, f: g + h(n), order: ++order });
        }
      }
    }
  }
  return null;
}

/** Drop intermediate waypoints that have clear line of sight (string pulling). */
export function smoothPath(map: FieldMap, points: readonly Vec2[], radius: number): Vec2[] {
  if (points.length <= 2) return [...points];
  const out: Vec2[] = [points[0]!];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    while (next > anchor + 1 && !hasClearLine(map, points[anchor]!, points[next]!, radius)) next--;
    out.push(points[next]!);
    anchor = next;
  }
  return out;
}
