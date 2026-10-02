import { expect, test } from '@playwright/test';

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
  await expect(sheet.getByRole('button', { name: /백수림의 매복와 전투/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: '이동: 숲속 샛길' })).toHaveCount(0);
});
