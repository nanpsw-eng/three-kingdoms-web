import type { FieldEnemySpec, FieldMap } from '../domain/world/index';

/**
 * N6 prototype field: "탁현 남부 평야" placeholder. Original layout, procedural visuals only.
 * Legend: '.' grass  '=' road  ',' tall grass  'b' bridge  '#' rock  'T' trees  '~' river
 * North (row 0) leads toward 백수촌.
 */
export const PLACEHOLDER_FIELD: FieldMap = {
  id: 'FIELD_ZHUO_SOUTH_PLAIN_PROTO',
  tileSize: 32,
  playerStart: { x: 7.5 * 32, y: 27.5 * 32 },
  rows: [
    'TTTTTTT==TTTTTTT',
    'TT.....==.....TT',
    'T..,,..==..##..T',
    'T..,,..==..##..T',
    'T......==......T',
    'T..TT...==.....T',
    'T..TT...==..,,.T',
    'T........==.,,.T',
    'T..##....==....T',
    'T..##.....==...T',
    'T.........==...T',
    '~~~~~~~~~~bb~~~~',
    '~~~~~~~~~~bb~~~~',
    'T.........==...T',
    'T..,,,...==....T',
    'T..,,,...==.TT.T',
    'T.......==..TT.T',
    'T..##...==.....T',
    'T..##..==......T',
    'T......==...##.T',
    'T.TT...==...##.T',
    'T.TT..==.......T',
    'T.....==...,,..T',
    'T....==....,,..T',
    'T....==........T',
    'T...==....TT...T',
    'T...==....TT...T',
    'T...==.........T',
    'T...==.........T',
    'TTTT==TTTTTTTTTT',
  ],
};

/** One visible Yellow Turban scout guarding the bridge approach. */
export const PLACEHOLDER_ENEMIES: readonly FieldEnemySpec[] = [
  {
    id: 'FE_YT_BRIDGE_SCOUT',
    encounterId: 'ENC_SOUTH_PLAIN_SCOUTS',
    behavior: 'GUARD',
    home: { x: 10.5 * 32, y: 14.5 * 32 },
    aggroRadius: 110,
    leashRadius: 220,
    speed: 70,
    chaseSpeed: 120,
  },
];
