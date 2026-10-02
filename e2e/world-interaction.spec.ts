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

test('non-field locations expose local encounter entry points while undiscovered secrets stay hidden', async ({ page }) => {
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
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  const sheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(sheet.getByRole('button', { name: '전투: 백수림의 매복' })).toBeVisible();
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

  await page.getByRole('button', { name: '지도' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 백수림' }).tap();
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  const sheet = page.getByRole('dialog', { name: '지역 정보' });
  await expect(sheet.getByRole('button', { name: '이동: 숲속 샛길' })).toHaveCount(0);

  await sheet.getByRole('button', { name: '주변 수색' }).tap();
  await expect(page.getByRole('status')).toContainText('숨겨진 샛길');
  await expect(sheet.getByRole('button', { name: '이동: 숲속 샛길' })).toBeVisible();

  await sheet.getByRole('button', { name: '이동: 숲속 샛길' }).tap();
  await expect(shell).toHaveAttribute('data-location', 'LOC_FOREST_SIDE_PATH');
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '숲의 은자' }).tap();
  await page.getByRole('dialog', { name: '대화' }).getByRole('button', { name: '확인' }).tap();
  await expect(page.getByRole('region', { name: '현재 부대' })).toContainText('숲의 은자');
});
