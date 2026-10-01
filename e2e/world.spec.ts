import { expect, test, type Page } from '@playwright/test';

type Vec = { x: number; y: number };
interface DebugWorld {
  state(): { player: { pos: Vec }; paused: boolean; enemies: Array<{ mode: string }> };
  worldToClient(p: Vec): Vec;
}

async function tapWorld(page: Page, p: Vec) {
  const client = await page.evaluate((pt) => (window as unknown as { __tkWorld: DebugWorld }).__tkWorld.worldToClient(pt), p);
  await page.touchscreen.tap(client.x, client.y);
}

const playerPos = (page: Page) => page.evaluate(() => (window as unknown as { __tkWorld: DebugWorld }).__tkWorld.state().player.pos);

test('tap-to-move moves the player, chasing scout triggers encounter, retreat resumes', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await page.waitForFunction(() => 'state' in ((window as unknown as { __tkWorld?: object }).__tkWorld ?? {}));

  const start = await playerPos(page);
  await tapWorld(page, { x: 8.5 * 32, y: 22.5 * 32 });
  await expect.poll(async () => (await playerPos(page)).y, { timeout: 5_000 }).toBeLessThan(start.y - 64);

  // Retarget toward the bridge scout until contact.
  for (const wp of [{ x: 9.5 * 32, y: 17.5 * 32 }, { x: 10.5 * 32, y: 14.5 * 32 }]) {
    if ((await page.locator('main.app-shell').getAttribute('data-encounter')) !== '') break;
    await tapWorld(page, wp);
    await page.waitForTimeout(2500);
  }
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-encounter', 'ENC_SOUTH_PLAIN_SCOUTS', { timeout: 8_000 });
  const dialog = page.getByRole('dialog', { name: '적과 조우' });
  await expect(dialog).toBeVisible();
  const retreat = dialog.getByRole('button', { name: '후퇴' });
  expect((await retreat.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await retreat.tap();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __tkWorld: DebugWorld }).__tkWorld.state().paused)).toBe(false);
});

test('virtual d-pad is optional and moves the player while held', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(page.getByRole('group', { name: '가상 방향키' })).toHaveCount(0);
  await page.getByRole('button', { name: '가상 방향키 사용' }).tap();
  const up = page.getByRole('button', { name: '위로 이동' });
  const box = (await up.boundingBox())!;
  const before = await playerPos(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  expect((await playerPos(page)).y).toBeLessThan(before.y - 20);
});
