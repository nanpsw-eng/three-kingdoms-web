import { expect, test } from '@playwright/test';
import { openWorld, tapWorld, walkIntoScout, worldState } from './helpers';

test('tap-to-move moves, retargets mid-move, chasing scout triggers encounter, avoiding resumes', async ({ page }) => {
  await openWorld(page);
  const start = (await worldState(page)).player.pos;

  await tapWorld(page, { x: 8.5 * 32, y: 22.5 * 32 });
  await expect.poll(async () => (await worldState(page)).player.pos.y, { timeout: 5_000 }).toBeLessThan(start.y - 32);

  // Retarget while still moving: the new tap replaces the old destination.
  const moving = await worldState(page) as unknown as { player: { path: unknown[] } };
  expect(moving.player.path.length).toBeGreaterThan(0);
  await tapWorld(page, { x: 3.5 * 32, y: 24.5 * 32 });
  // Touch input is integer-pixel; the resolved target lands within a few px of the tapped world point.
  const retargeted = (await worldState(page)) as unknown as { player: { target: { x: number; y: number } | null } };
  expect(retargeted.player.target).not.toBeNull();
  expect(Math.hypot(retargeted.player.target!.x - 3.5 * 32, retargeted.player.target!.y - 24.5 * 32)).toBeLessThan(6);
  await expect.poll(async () => {
    const p = (await worldState(page)).player.pos;
    return Math.hypot(p.x - 3.5 * 32, p.y - 24.5 * 32);
  }, { timeout: 6_000 }).toBeLessThan(6);

  await walkIntoScout(page);
  const dialog = page.getByRole('dialog', { name: '적과 조우' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '전투' })).toBeEnabled();
  const avoid = dialog.getByRole('button', { name: '피하기' });
  expect((await avoid.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await avoid.tap();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await worldState(page)).paused).toBe(false);
});

test('virtual d-pad is optional and moves the player while held', async ({ page }) => {
  await openWorld(page);
  await expect(page.getByRole('group', { name: '가상 방향키' })).toHaveCount(0);
  await page.getByRole('button', { name: '가상 방향키 사용' }).tap();
  const up = page.getByRole('button', { name: '위로 이동' });
  const box = (await up.boundingBox())!;
  const before = (await worldState(page)).player.pos;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  expect((await worldState(page)).player.pos.y).toBeLessThan(before.y - 20);
});
