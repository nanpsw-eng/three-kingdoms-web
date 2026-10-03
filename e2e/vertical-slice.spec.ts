import { expect, test } from '@playwright/test';
import {
  autoWinEncounter,
  openWorld,
  readAutoSave,
  walkIntoEncounter,
  walkIntoScout,
} from './helpers';

test('complete Vertical Slice: start -> recruits -> Outpost -> North Gate capture', async ({ page }) => {
  test.setTimeout(120_000);

  const shell = page.locator('main.app-shell');
  await openWorld(page);

  // 1) South Plain scout — actual field encounter + battle.
  await walkIntoScout(page);
  await autoWinEncounter(page);
  await expect(page.getByTestId('quest-objective')).toContainText('백수촌');

  // 2) Baishui Village — actual travel and Jian Yong recruitment.
  await page.getByRole('button', { name: '지도' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' })
    .getByRole('button', { name: '이동: 백수촌' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_BAISHUI_VILLAGE');

  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  let sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '간옹' }).tap();
  await page.getByRole('dialog', { name: '대화' }).getByRole('button', { name: '확인' }).tap();
  await expect(page.getByRole('region', { name: '현재 부대' })).toContainText('간옹');

  // 3) Baishui Forest secret — search, reveal side path, optional recruit.
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '이동: 백수림' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_BAISHUI_FOREST');
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string } } };
  }).__tkWorld.state().map.id)).toBe('FIELD_BAISHUI_FOREST_PROTO');

  await page.getByRole('button', { name: '지도' }).tap();
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '주변 수색' }).tap();
  await expect(page.locator('.interaction-notice')).toContainText('숨겨진 샛길');
  await sheet.getByRole('button', { name: '이동: 숲속 샛길' }).tap();

  await expect(shell).toHaveAttribute('data-location', 'LOC_FOREST_SIDE_PATH');
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '숲의 은자' }).tap();
  await page.getByRole('dialog', { name: '대화' }).getByRole('button', { name: '확인' }).tap();
  await expect(page.getByRole('region', { name: '현재 부대' })).toContainText('숲의 은자');

  // Return to the Forest using the still-open location sheet, then travel to the Outpost.
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await sheet.getByRole('button', { name: '이동: 백수림' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_BAISHUI_FOREST');
  await page.getByRole('button', { name: '지도' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' })
    .getByRole('button', { name: '이동: 황건 전초기지' }).tap();

  // 4) Outpost — real Phaser field + garrison battle.
  await expect(shell).toHaveAttribute('data-location', 'LOC_YT_OUTPOST');
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string } } };
  }).__tkWorld.state().map.id)).toBe('FIELD_YT_OUTPOST_PROTO');

  await walkIntoEncounter(page, 'ENC_YT_OUTPOST_GARRISON', [
    { x: 7.5 * 32, y: 15.5 * 32 },
    { x: 7.5 * 32, y: 12.5 * 32 },
  ]);
  await autoWinEncounter(page);
  await expect(page.locator('.interaction-notice')).toContainText('레벨 상승');
  await expect(page.getByTestId('quest-objective')).toContainText('북부 관문');

  // Outpost capture discovers the North Gate and makes it a legal destination.
  await page.getByRole('button', { name: '지도' }).tap();
  sheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(sheet.getByRole('button', { name: '이동: 북부 관문' })).toBeVisible();
  await sheet.getByRole('button', { name: '이동: 북부 관문' }).tap();

  // 5) North Gate — real field + boss battle + capture.
  await expect(shell).toHaveAttribute('data-location', 'LOC_NORTH_GATE');
  await expect.poll(async () => page.evaluate(() => (window as unknown as {
    __tkWorld: { state(): { map: { id: string } } };
  }).__tkWorld.state().map.id)).toBe('FIELD_NORTH_GATE_PROTO');

  await walkIntoEncounter(page, 'ENC_NORTH_GATE_BOSS', [
    { x: 7.5 * 32, y: 15.5 * 32 },
    { x: 7.5 * 32, y: 11.5 * 32 },
  ]);
  const bossDialog = page.getByRole('dialog', { name: '적과 조우' });
  await expect(bossDialog.getByRole('button', { name: '후퇴' })).toBeVisible();
  await autoWinEncounter(page);

  await expect(page.getByTestId('quest-objective')).toContainText('다음 지역 준비 중');
  await expect(page.locator('.interaction-notice')).toContainText('레벨 상승');

  // 6) Persisted end-state — actual IndexedDB save written by the app.
  const save = await readAutoSave(page);

  expect(save.defeatedEncounterIds).toEqual(
    expect.arrayContaining(['ENC_SOUTH_PLAIN_SCOUTS', 'ENC_YT_OUTPOST_GARRISON', 'ENC_NORTH_GATE_BOSS']),
  );
  expect(save.locationOwnership.LOC_YT_OUTPOST).toBe('PLAYER');
  expect(save.locationOwnership.LOC_NORTH_GATE).toBe('PLAYER');
  expect(save.flags.FLAG_OUTPOST_CAPTURED).toBe(true);
  expect(save.flags.FLAG_NORTH_GATE_CAPTURED).toBe(true);
  expect(save.flags.FLAG_OPTIONAL_RECRUIT_JOINED).toBe(true);
  expect(save.unlockedRegionIds).toContain('REG_ZHUO_NORTH');
  expect(save.quests.QST_MAIN_ZHUO_YELLOW_TURBAN).toEqual({ status: 'COMPLETED', stepIndex: 5 });

  // Main-route starters reach the intended first balance band without the optional Riders battle.
  expect(save.generals.GEN_LIU_BEI).toMatchObject({ level: 5, xp: 50 });
  expect(save.generals.GEN_GUAN_YU).toMatchObject({ level: 5, xp: 50 });
  expect(save.generals.GEN_ZHANG_FEI).toMatchObject({ level: 5, xp: 50 });
  expect(save.generals.GEN_LIU_BEI.learnedTacticIds).toContain('TAC_INSPIRE');

  expect(save.generals.GEN_JIAN_YONG).toMatchObject({ level: 5, xp: 70 });
  expect(save.generals.GEN_FOREST_RECLUSE).toMatchObject({ level: 6, xp: 10 });
  expect(save.generals.GEN_FOREST_RECLUSE.learnedTacticIds).toContain('TAC_CONFUSE');

  // Starting 100 + Scout 30 + Outpost 80 + Boss 200 + main quest completion 200.
  expect(save.gold).toBe(610);
  expect(save.world.locationId).toBe('LOC_NORTH_GATE');

  // Reload must preserve the completed Vertical Slice.
  await page.reload();
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-location', 'LOC_NORTH_GATE');
  await expect(page.getByTestId('quest-objective')).toContainText('다음 지역 준비 중');
});
