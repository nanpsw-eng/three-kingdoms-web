import type { FieldEnemySpec, FieldMap, Vec2 } from '../domain/world/index';
import { PLACEHOLDER_ENEMIES, PLACEHOLDER_FIELD } from './placeholderField';

export interface SecretFieldMarker {
  locationId: string;
  position: Vec2;
  label: string;
}

export interface FieldHotspot {
  id: string;
  destinationLocationId: string;
  position: Vec2;
  label: string;
  radius: number;
}

export interface FieldPresentation {
  locationId: string;
  map: FieldMap;
  enemies: readonly FieldEnemySpec[];
  secretMarkers?: readonly SecretFieldMarker[];
  hotspots?: readonly FieldHotspot[];
}

const hotspot = (
  id: string,
  destinationLocationId: string,
  x: number,
  y: number,
  label: string,
): FieldHotspot => ({
  id,
  destinationLocationId,
  position: { x: x * 32, y: y * 32 },
  label,
  radius: 42,
});

const BAISHUI_FOREST_FIELD: FieldMap = {
  id: 'FIELD_BAISHUI_FOREST_PROTO',
  tileSize: 32,
  playerStart: { x: 5.5 * 32, y: 20.5 * 32 },
  rows: [
    'TTTTTTTTTTTTTTTT',
    'T....TT....T...T',
    'T....TT....T...T',
    'T..,,,.....T...T',
    'T..,,,..TT.....T',
    'T......TTT.....T',
    'T...TT.....,...T',
    'T...TT.....,...T',
    'T..............T',
    'T..TTT.........T',
    'T..TTT....,,...T',
    'T.........,,...T',
    'T...TT..........T',
    'T...TT....TT....T',
    'T.........TT....T',
    'T..,,...........T',
    'T..,,....TT.....T',
    'T........TT.....T',
    'T...............T',
    'T....==.........T',
    'T....==.........T',
    'TTTTT==TTTTTTTTT',
  ],
};

const BAISHUI_FOREST_ENEMIES: readonly FieldEnemySpec[] = [
  {
    id: 'FE_BAISHUI_AMBUSH',
    encounterId: 'ENC_BAISHUI_FOREST_AMBUSH',
    behavior: 'PATROL',
    home: { x: 10.5 * 32, y: 10.5 * 32 },
    waypoints: [
      { x: 7.5 * 32, y: 8.5 * 32 },
      { x: 11.5 * 32, y: 5.5 * 32 },
    ],
    aggroRadius: 95,
    leashRadius: 210,
    speed: 58,
    chaseSpeed: 110,
  },
];

const YT_OUTPOST_FIELD: FieldMap = {
  id: 'FIELD_YT_OUTPOST_PROTO',
  tileSize: 32,
  playerStart: { x: 7.5 * 32, y: 18.5 * 32 },
  rows: [
    'TTTTTT==TTTTTTTT',
    'T.....==.......T',
    'T.############.T',
    'T.#....==....#.T',
    'T.#....==....#.T',
    'T.#..........#.T',
    'T.#..##..##..#.T',
    'T.#..##..##..#.T',
    'T.#..........#.T',
    'T.#....==....#.T',
    'T.#....==....#.T',
    'T.#..........#.T',
    'T.####....####.T',
    'T......==......T',
    'T......==......T',
    'T..,,..==..,,..T',
    'T......==......T',
    'T......==......T',
    'T......==......T',
    'TTTTTTT==TTTTTTT',
  ],
};

const YT_OUTPOST_ENEMIES: readonly FieldEnemySpec[] = [
  {
    id: 'FE_YT_OUTPOST_GARRISON',
    encounterId: 'ENC_YT_OUTPOST_GARRISON',
    behavior: 'GUARD',
    home: { x: 7.5 * 32, y: 9.5 * 32 },
    aggroRadius: 105,
    leashRadius: 230,
    speed: 58,
    chaseSpeed: 112,
  },
];

const NORTH_GATE_FIELD: FieldMap = {
  id: 'FIELD_NORTH_GATE_PROTO',
  tileSize: 32,
  playerStart: { x: 7.5 * 32, y: 18.5 * 32 },
  rows: [
    '######==########',
    '#.....==.......#',
    '#.....==.......#',
    '#..##########..#',
    '#..#...==...#..#',
    '#..#...==...#..#',
    '#..#........#..#',
    '#..####..####..#',
    '#......==......#',
    '#......==......#',
    '#..##..==..##..#',
    '#..##..==..##..#',
    '#......==......#',
    '#......==......#',
    '#......==......#',
    '#..,,..==..,,..#',
    '#......==......#',
    '#......==......#',
    '#......==......#',
    '#######==#######',
  ],
};

const NORTH_GATE_ENEMIES: readonly FieldEnemySpec[] = [
  {
    id: 'FE_NORTH_GATE_BOSS',
    encounterId: 'ENC_NORTH_GATE_BOSS',
    behavior: 'GUARD',
    home: { x: 7.5 * 32, y: 8.5 * 32 },
    aggroRadius: 110,
    leashRadius: 220,
    speed: 55,
    chaseSpeed: 105,
  },
];

export const FIELD_PRESENTATIONS: Readonly<Record<string, FieldPresentation>> = {
  LOC_SOUTH_PLAIN: {
    locationId: 'LOC_SOUTH_PLAIN',
    map: PLACEHOLDER_FIELD,
    enemies: PLACEHOLDER_ENEMIES,
    hotspots: [
      hotspot('HOTSPOT_PLAIN_ZHUO', 'LOC_ZHUO_TOWN', 4.5, 28.5, '탁현'),
      hotspot('HOTSPOT_PLAIN_BAISHUI', 'LOC_BAISHUI_VILLAGE', 7.5, 1.5, '백수촌'),
    ],
  },
  LOC_BAISHUI_FOREST: {
    locationId: 'LOC_BAISHUI_FOREST',
    map: BAISHUI_FOREST_FIELD,
    enemies: BAISHUI_FOREST_ENEMIES,
    secretMarkers: [
      {
        locationId: 'LOC_FOREST_SIDE_PATH',
        position: { x: 13.5 * 32, y: 6.5 * 32 },
        label: '샛길',
      },
    ],
    hotspots: [
      hotspot('HOTSPOT_FOREST_VILLAGE', 'LOC_BAISHUI_VILLAGE', 5.5, 20.5, '백수촌'),
      hotspot('HOTSPOT_FOREST_OUTPOST', 'LOC_YT_OUTPOST', 13.5, 1.5, '황건 전초기지'),
      hotspot('HOTSPOT_FOREST_SECRET', 'LOC_FOREST_SIDE_PATH', 13.5, 6.5, '숲속 샛길'),
    ],
  },
  LOC_YT_OUTPOST: {
    locationId: 'LOC_YT_OUTPOST',
    map: YT_OUTPOST_FIELD,
    enemies: YT_OUTPOST_ENEMIES,
    hotspots: [
      hotspot('HOTSPOT_OUTPOST_FOREST', 'LOC_BAISHUI_FOREST', 7.5, 18.5, '백수림'),
      hotspot('HOTSPOT_OUTPOST_GATE', 'LOC_NORTH_GATE', 7.5, 1.5, '북부 관문'),
    ],
  },
  LOC_NORTH_GATE: {
    locationId: 'LOC_NORTH_GATE',
    map: NORTH_GATE_FIELD,
    enemies: NORTH_GATE_ENEMIES,
    hotspots: [
      hotspot('HOTSPOT_GATE_OUTPOST', 'LOC_YT_OUTPOST', 7.5, 18.5, '황건 전초기지'),
      hotspot('HOTSPOT_GATE_NORTH_ROAD', 'LOC_NORTH_ROAD', 7.5, 1.5, '북쪽 길'),
    ],
  },
};

export function getFieldPresentation(locationId: string | null | undefined): FieldPresentation | null {
  return locationId ? FIELD_PRESENTATIONS[locationId] ?? null : null;
}

export function hasFieldPresentation(locationId: string | null | undefined): boolean {
  return getFieldPresentation(locationId) !== null;
}
