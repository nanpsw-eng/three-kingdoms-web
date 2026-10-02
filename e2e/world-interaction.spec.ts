import { expect, test } from '@playwright/test';
import { walkIntoScout } from './helpers';

test('location UI travels, updates checkpoints, talks to NPCs and exposes services', async ({ page }) => {
  await page.goto('/?debug=1');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-location', 'LOC_ZHUO_TOWN');
  await expect(shell).toHaveAttribute('data-checkpoint', 'LOC_ZHUO_TOWN');

  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  let sheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(sheet.getByRole('button', { name: '의용군 교관' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: '휴식 · 병력 정비' })).toBeVisible();

  await sheet.getByRole('button', { name: '이동: 남부 평야' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_SOUTH_PLAIN');
  await expect(shell).toHaveAttribute('data-checkpoint', 'LOC_ZHUO_TOWN');

  await page.getByRole('button', { name: '지도' }).tap();
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '이동: 백수촌' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_BAISHUI_VILLAGE');
  await expect(shell).toHaveAttribute('data-checkpoint', 'LOC_BAISHUI_VILLAGE');

  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '간옹' }).tap();
  const dialog = page.getByRole('dialog', { name: '대화' });
  await expect(dialog).toContainText('함께 가겠습니다');
  await dialog.getByRole('button', { name: '확인' }).tap();

  await expect(page.getByRole('region', { name: '현재 부대' }).getByText('간옹')).toHaveCount(0);
});

test('Baishui Forest loads its Phaser field while undiscovered secrets stay hidden', async ({ page }) => {
  await page.goto('/?debug=1');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-location', 'LOC_ZHUO_TOWN', { timeout: 15_000 });

  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 남부 평야' }).tap();
  await page.getByRole('button', { name: '지도' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 백수촌' }).tap();
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 백수림' }).tap();

  await expect(shell).toHaveAttribute('data-location', 'LOC_BAISHUI_FOREST');
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string }; locationId: string; enemies: Array<{ encounterId: string }> } };
  }).__tkWorld.state().map.id)).toBe('FIELD_BAISHUI_FOREST_PROTO');
  const forestState = await page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { locationId: string; enemies: Array<{ encounterId: string; mode: string }>; secretMarkers: Array<{ locationId: string; visible: boolean }> } };
  }).__tkWorld.state());
  expect(forestState.locationId).toBe('LOC_BAISHUI_FOREST');
  expect(forestState.enemies.some((enemy) => enemy.encounterId === 'ENC_BAISHUI_FOREST_AMBUSH')).toBe(true);
  expect(forestState.secretMarkers).toContainEqual({ locationId: 'LOC_FOREST_SIDE_PATH', visible: false });

  await page.getByRole('button', { name: '지도' }).tap();
  const sheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(sheet.getByRole('button', { name: '이동: 숲속 샛길' })).toHaveCount(0);
});


test('secret-area discovery: recruit Jian Yong, search Baishui Forest, find side path and recruit the recluse', async ({ page }) => {
  await page.goto('/?debug=1');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });

  // Enter South Plain and defeat the required scout encounter.
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 남부 평야' }).tap();

  // Reuse the camera-safe field helper already proven by the existing world/battle E2E.
  await walkIntoScout(page);
  await expect(shell).toHaveAttribute('data-encounter', 'ENC_SOUTH_PLAIN_SCOUTS', { timeout: 10_000 });
  await page.getByRole('dialog', { name: '적과 조우' }).getByRole('button', { name: '전투' }).tap();
  const battle = page.getByRole('region', { name: '전투 명령' });
  await battle.getByRole('button', { name: '자동', exact: true }).tap();
  const result = page.getByRole('dialog', { name: '전투 결과' });
  await expect(result).toContainText('승리', { timeout: 25_000 });
  await result.getByRole('button', { name: '계속' }).tap();

  // Baishui -> Jian Yong -> Forest.
  await page.getByRole('button', { name: '지도' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 백수촌' }).tap();
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '간옹' }).tap();
  await page.getByRole('dialog', { name: '대화' }).getByRole('button', { name: '확인' }).tap();
  await expect(page.getByRole('region', { name: '현재 부대' })).toContainText('간옹');

  // Closing NPC dialogue returns to the already-open Baishui location sheet.
  const villageSheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(villageSheet).toBeVisible();
  await villageSheet.getByRole('button', { name: '이동: 백수림' }).tap();
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string } } };
  }).__tkWorld.state().map.id)).toBe('FIELD_BAISHUI_FOREST_PROTO');
  await page.getByRole('button', { name: '지도' }).tap();
  const sheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(sheet.getByRole('button', { name: '이동: 숲속 샛길' })).toHaveCount(0);

  await sheet.getByRole('button', { name: '주변 수색' }).tap();
  await expect(page.getByRole('status')).toContainText('숨겨진 샛길');
  await expect(sheet.getByRole('button', { name: '이동: 숲속 샛길' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { secretMarkers: Array<{ locationId: string; visible: boolean }> } };
  }).__tkWorld.state().secretMarkers.find((marker) => marker.locationId === 'LOC_FOREST_SIDE_PATH')?.visible)).toBe(true);

  await sheet.getByRole('button', { name: '이동: 숲속 샛길' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_FOREST_SIDE_PATH');
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '숲의 은자' }).tap();
  await page.getByRole('dialog', { name: '대화' }).getByRole('button', { name: '확인' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '지역 정보 닫기' }).tap();
  await expect(page.getByRole('region', { name: '현재 부대' })).toContainText('숲의 은자');
});


test('field hotspots move from Baishui Forest to Outpost and hide the locked North Gate exit', async ({ page }) => {
  await page.goto('/?debug=1');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-location', 'LOC_ZHUO_TOWN', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });

  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 남부 평야' }).tap();
  await page.getByRole('button', { name: '지도' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 백수촌' }).tap();
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 백수림' }).tap();

  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string } } };
  }).__tkWorld.state().map.id)).toBe('FIELD_BAISHUI_FOREST_PROTO');

  const hotspot = await page.evaluate(() => {
    const state = (window as unknown as {
      __tkWorld: { state(): { hotspots: Array<{ destinationLocationId: string; position: { x: number; y: number }; visible: boolean }> } };
    }).__tkWorld.state();
    return state.hotspots.find((entry) => entry.destinationLocationId === 'LOC_YT_OUTPOST');
  });
  expect(hotspot?.visible).toBe(true);

  const client = await page.evaluate((position) => (window as unknown as {
    __tkWorld: { worldToClient(p: { x: number; y: number }): { x: number; y: number } };
  }).__tkWorld.worldToClient(position!), hotspot!.position);
  await page.touchscreen.tap(client.x, client.y);
  await expect(page.getByRole('button', { name: '필드 이동: 황건 전초기지' })).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: '필드 이동: 황건 전초기지' }).tap();

  await expect(shell).toHaveAttribute('data-location', 'LOC_YT_OUTPOST');
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string } } };
  }).__tkWorld.state().map.id)).toBe('FIELD_YT_OUTPOST_PROTO');

  const outpost = await page.evaluate(() => (window as unknown as {
    __tkWorld: {
      state(): {
        enemies: Array<{ encounterId: string; mode: string }>;
        hotspots: Array<{ destinationLocationId: string; visible: boolean }>;
      };
    };
  }).__tkWorld.state());
  expect(outpost.enemies.some((enemy) => enemy.encounterId === 'ENC_YT_OUTPOST_GARRISON')).toBe(true);
  expect(outpost.hotspots.find((entry) => entry.destinationLocationId === 'LOC_BAISHUI_FOREST')?.visible).toBe(true);
  expect(outpost.hotspots.find((entry) => entry.destinationLocationId === 'LOC_NORTH_GATE')?.visible).toBe(false);
});
