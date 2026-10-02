import type { FieldEnemySpec, FieldMap, Vec2 } from '../domain/world/index';
import { PLACEHOLDER_ENEMIES, PLACEHOLDER_FIELD } from './placeholderField';

export interface SecretFieldMarker {
  locationId: string;
  position: Vec2;
  label: string;
}

export interface FieldPresentation {
  locationId: string;
  map: FieldMap;
  enemies: readonly FieldEnemySpec[];
  secretMarkers?: readonly SecretFieldMarker[];
}

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

export const FIELD_PRESENTATIONS: Readonly<Record<string, FieldPresentation>> = {
  LOC_SOUTH_PLAIN: {
    locationId: 'LOC_SOUTH_PLAIN',
    map: PLACEHOLDER_FIELD,
    enemies: PLACEHOLDER_ENEMIES,
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
  },
};

export function getFieldPresentation(locationId: string | null | undefined): FieldPresentation | null {
  return locationId ? FIELD_PRESENTATIONS[locationId] ?? null : null;
}

export function hasFieldPresentation(locationId: string | null | undefined): boolean {
  return getFieldPresentation(locationId) !== null;
}
