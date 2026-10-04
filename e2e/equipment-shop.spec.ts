import { expect, test } from '@playwright/test';
import { readAutoSave } from './helpers';

test('Zhuo shop: buy with starting gold, equip via party menu, persist across reload', async ({ page }) => {
  const shell = page.locator('main.app-shell');
  await page.goto('/?debug=1');
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-location', 'LOC_ZHUO_TOWN');
  await expect(page.getByTestId('gold')).toHaveText('금 100');

  // Location sheet -> shop.
  await page.getByRole('button', { name: '장소 살펴보기' }).tap();
  await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '상점 · 탁현 무구점' }).tap();
  const shop = page.getByRole('dialog', { name: '상점' });
  await expect(shop).toBeVisible();

  const buyDao = shop.getByRole('button', { name: '구매: 철도, 60금' });
  expect((await buyDao.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await buyDao.tap();
  await expect(page.getByTestId('gold')).toHaveText('금 40');
  await expect(page.locator('.interaction-notice')).toContainText('구매 완료: 철도');

  // 40 gold left: 50-gold armor must be unaffordable, never silently purchasable.
  await expect(shop.getByRole('button', { name: '구매: 가죽 갑옷, 50금' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await shop.getByRole('button', { name: '상점 닫기' }).tap();

  // Party menu -> Guan Yu -> equip the Dao (aptitude S: +6 x1.2 = +7).
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '부대' }).tap();
  const party = page.getByRole('dialog', { name: '부대 편성' });
  await party.getByRole('button', { name: '관우' }).tap();
  const equipDao = party.getByRole('button', { name: '장착: 철도' });
  await expect(equipDao).toContainText('적성 S');
  expect((await equipDao.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await equipDao.tap();
  await expect(party.getByRole('group', { name: '관우 무기' })).toContainText('철도');
  await expect(party.getByRole('button', { name: '해제: 철도' })).toBeVisible();
  await expect(party).toContainText('무구 공격+7');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expect(shell).toHaveAttribute('data-save', 'ready');

  const saved = (await readAutoSave(page)) as unknown as {
    gold: number;
    inventory: Record<string, number>;
    generals: Record<string, { equipment: Record<string, string> }>;
  };
  expect(saved.gold).toBe(40);
  expect(saved.inventory).toEqual({});
  expect(saved.generals.GEN_GUAN_YU!.equipment).toEqual({ weapon: 'WPN_IRON_DAO' });

  // Reload: equipment comes back from IndexedDB.
  await page.reload();
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });
  await expect(page.getByTestId('gold')).toHaveText('금 40');
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '부대' }).tap();
  await page.getByRole('dialog', { name: '부대 편성' }).getByRole('button', { name: '관우' }).tap();
  await expect(page.getByRole('dialog', { name: '부대 편성' }).getByRole('group', { name: '관우 무기' })).toContainText('철도');
});
