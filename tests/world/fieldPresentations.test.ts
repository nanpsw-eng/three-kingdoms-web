import { describe, expect, it } from 'vitest';
import { isFree, WORLD_CONFIG } from '../../src/game/domain/world/index';
import { FIELD_PRESENTATIONS, getFieldPresentation, hasFieldPresentation } from '../../src/game/world/fieldPresentations';

describe('field presentations', () => {
  it('keeps South Plain and Baishui Forest as data-only field definitions', () => {
    expect(hasFieldPresentation('LOC_SOUTH_PLAIN')).toBe(true);
    expect(hasFieldPresentation('LOC_BAISHUI_FOREST')).toBe(true);
    expect(hasFieldPresentation('LOC_BAISHUI_VILLAGE')).toBe(false);
    expect(Object.keys(FIELD_PRESENTATIONS).sort()).toEqual(['LOC_BAISHUI_FOREST', 'LOC_SOUTH_PLAIN']);
  });

  it('all player/enemy/secret marker positions are valid field points', () => {
    for (const presentation of Object.values(FIELD_PRESENTATIONS)) {
      expect(isFree(presentation.map, presentation.map.playerStart, WORLD_CONFIG.playerRadius)).toBe(true);
      for (const enemy of presentation.enemies) {
        expect(isFree(presentation.map, enemy.home, WORLD_CONFIG.enemyRadius)).toBe(true);
      }
      for (const secret of presentation.secretMarkers ?? []) {
        expect(isFree(presentation.map, secret.position, 1)).toBe(true);
      }
    }
  });

  it('Baishui Forest presents the ambush and a discovery-controlled secret marker', () => {
    const forest = getFieldPresentation('LOC_BAISHUI_FOREST')!;
    expect(forest.map.id).toBe('FIELD_BAISHUI_FOREST_PROTO');
    expect(forest.enemies.map((enemy) => enemy.encounterId)).toContain('ENC_BAISHUI_FOREST_AMBUSH');
    expect(forest.secretMarkers).toContainEqual(expect.objectContaining({ locationId: 'LOC_FOREST_SIDE_PATH' }));
  });
});
