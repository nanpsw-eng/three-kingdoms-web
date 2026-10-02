import { expect, type Page } from '@playwright/test';

export type Vec = { x: number; y: number };
export interface DebugWorldState {
  map: { id: string };
  locationId: string;
  player: { pos: Vec; path: Vec[] };
  paused: boolean;
  enemies: Array<{ id: string; encounterId: string; mode: string }>;
  secretMarkers: Array<{ locationId: string; visible: boolean }>;
}

export interface DebugWorld {
  state(): DebugWorldState;
  worldToClient(p: Vec): Vec;
}

const dbg = 'window.__tkWorld';

export async function openWorld(page: Page) {
  await page.goto('/?debug=1');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });
  await page.waitForFunction(() => 'state' in ((window as unknown as { __tkWorld?: object }).__tkWorld ?? {}));

  if ((await shell.getAttribute('data-location')) !== 'LOC_SOUTH_PLAIN') {
    await page.getByRole('button', { name: '장소 살펴보기' }).tap();
    await page.getByRole('dialog', { name: '지역 정보' }).getByRole('button', { name: '이동: 남부 평야' }).tap();
    await expect(shell).toHaveAttribute('data-location', 'LOC_SOUTH_PLAIN');
  }
}

/** Tap a world point. Fails if the point is not currently visible on the canvas (taps can't reach off-screen ground). */
export async function tapWorld(page: Page, p: Vec) {
  const client = await page.evaluate((pt) => (window as unknown as { __tkWorld: DebugWorld }).__tkWorld.worldToClient(pt), p);
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName ?? null, client);
  expect(hit, `world point ${JSON.stringify(p)} is off-canvas at ${JSON.stringify(client)}`).toBe('CANVAS');
  await page.touchscreen.tap(client.x, client.y);
}

export const worldState = (page: Page) => page.evaluate(() => (window as unknown as { __tkWorld: DebugWorld }).__tkWorld.state());

/** Walk the road north until the bridge scout engages. */
export async function walkIntoScout(page: Page) {
  for (const wp of [{ x: 8.5 * 32, y: 20.5 * 32 }, { x: 9.5 * 32, y: 17.5 * 32 }, { x: 10.5 * 32, y: 14.5 * 32 }]) {
    if ((await page.locator('main.app-shell').getAttribute('data-encounter')) !== '') break;
    await tapWorld(page, wp);
    await expect.poll(async () => {
      const st = (await worldState(page)) as unknown as { paused: boolean; player: { path: unknown[] } };
      return st.paused || st.player.path.length === 0;
    }, { timeout: 8_000 }).toBe(true);
  }
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-encounter', 'ENC_SOUTH_PLAIN_SCOUTS', { timeout: 8_000 });
  void dbg;
}
