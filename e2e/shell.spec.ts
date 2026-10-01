import { expect, test } from '@playwright/test';

test('app shell boots Phaser world without errors and fits the viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(page.locator('[data-testid="game-canvas"] canvas')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  for (const button of await page.locator('.bottom-nav button').all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(errors).toEqual([]);
});
