import { describe, expect, it } from 'vitest';
import { isFree, WORLD_CONFIG } from '../../src/game/domain/world/index';
import { FIELD_PRESENTATIONS, getFieldPresentation, hasFieldPresentation } from '../../src/game/world/fieldPresentations';

describe('field presentations', () => {
  it('keeps all Vertical Slice combat fields as framework-neutral definitions', () => {
    expect(hasFieldPresentation('LOC_SOUTH_PLAIN')).toBe(true);
    expect(hasFieldPresentation('LOC_BAISHUI_FOREST')).toBe(true);
    expect(hasFieldPresentation('LOC_YT_OUTPOST')).toBe(true);
    expect(hasFieldPresentation('LOC_NORTH_GATE')).toBe(true);
    expect(hasFieldPresentation('LOC_BAISHUI_VILLAGE')).toBe(false);
    expect(Object.keys(FIELD_PRESENTATIONS).sort()).toEqual([
      'LOC_BAISHUI_FOREST',
      'LOC_NORTH_GATE',
      'LOC_SOUTH_PLAIN',
      'LOC_YT_OUTPOST',
    ]);
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
      for (const hotspot of presentation.hotspots ?? []) {
        expect(isFree(presentation.map, hotspot.position, 1)).toBe(true);
        expect(hotspot.radius).toBeGreaterThanOrEqual(32);
      }
    }
  });

  it('Baishui Forest presents the ambush and a discovery-controlled secret marker', () => {
    const forest = getFieldPresentation('LOC_BAISHUI_FOREST')!;
    expect(forest.map.id).toBe('FIELD_BAISHUI_FOREST_PROTO');
    expect(forest.enemies.map((enemy) => enemy.encounterId)).toContain('ENC_BAISHUI_FOREST_AMBUSH');
    expect(forest.secretMarkers).toContainEqual(expect.objectContaining({ locationId: 'LOC_FOREST_SIDE_PATH' }));
    expect(forest.hotspots?.map((hotspot) => hotspot.destinationLocationId)).toEqual(
      expect.arrayContaining(['LOC_BAISHUI_VILLAGE', 'LOC_YT_OUTPOST', 'LOC_FOREST_SIDE_PATH']),
    );
  });

  it('Outpost and North Gate present their required encounters and exits', () => {
    const outpost = getFieldPresentation('LOC_YT_OUTPOST')!;
    expect(outpost.map.id).toBe('FIELD_YT_OUTPOST_PROTO');
    expect(outpost.enemies.map((enemy) => enemy.encounterId)).toEqual(['ENC_YT_OUTPOST_GARRISON']);
    expect(outpost.hotspots?.map((hotspot) => hotspot.destinationLocationId)).toEqual(
      expect.arrayContaining(['LOC_BAISHUI_FOREST', 'LOC_NORTH_GATE']),
    );

    const gate = getFieldPresentation('LOC_NORTH_GATE')!;
    expect(gate.map.id).toBe('FIELD_NORTH_GATE_PROTO');
    expect(gate.enemies.map((enemy) => enemy.encounterId)).toEqual(['ENC_NORTH_GATE_BOSS']);
    expect(gate.hotspots?.map((hotspot) => hotspot.destinationLocationId)).toEqual(
      expect.arrayContaining(['LOC_YT_OUTPOST', 'LOC_NORTH_ROAD']),
    );
  });
});
