import { expect, type Page } from '@playwright/test';

export type Vec = { x: number; y: number };
export interface DebugWorldState {
  map: { id: string };
  locationId: string;
  player: { pos: Vec; path: Vec[] };
  paused: boolean;
  enemies: Array<{ id: string; encounterId: string; mode: string }>;
  secretMarkers: Array<{ locationId: string; visible: boolean }>;
  hotspots: Array<{
    id: string;
    destinationLocationId: string;
    position: Vec;
    visible: boolean;
    active: boolean;
  }>;
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


export async function walkIntoEncounter(
  page: Page,
  encounterId: string,
  waypoints: readonly Vec[],
) {
  const shell = page.locator('main.app-shell');
  for (const point of waypoints) {
    if ((await shell.getAttribute('data-encounter')) === encounterId) break;
    await tapWorld(page, point);
    await expect.poll(async () => {
      const state = await worldState(page);
      return state.paused || state.player.path.length === 0 ||
        (await shell.getAttribute('data-encounter')) === encounterId;
    }, { timeout: 10_000 }).toBe(true);
  }
  await expect(shell).toHaveAttribute('data-encounter', encounterId, { timeout: 10_000 });
}

export async function autoWinEncounter(page: Page, expectedName?: RegExp | string) {
  const encounter = page.getByRole('dialog', { name: '적과 조우' });
  if (expectedName) await expect(encounter).toContainText(expectedName);
  await encounter.getByRole('button', { name: '전투' }).tap();

  const panel = page.getByRole('region', { name: '전투 명령' });
  await expect(panel).toBeVisible();
  const speed = panel.getByRole('button', { name: /전투 속도 x/ });
  for (let i = 0; i < 2; i++) await speed.tap();
  await panel.getByRole('button', { name: '자동', exact: true }).tap();

  const result = page.getByRole('dialog', { name: '전투 결과' });
  await expect(result).toContainText('승리', { timeout: 35_000 });
  await result.getByRole('button', { name: '계속' }).tap();
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'World', { timeout: 10_000 });
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-save', 'ready', { timeout: 10_000 });
}

export interface PersistedSaveSnapshot {
  gold: number;
  generals: Record<string, {
    level: number;
    xp: number;
    currentTroops: number;
    learnedTacticIds: string[];
  }>;
  party: { activeGeneralIds: string[]; reserveGeneralIds: string[] };
  flags: Record<string, boolean | number | string>;
  locationOwnership: Record<string, string>;
  defeatedEncounterIds: string[];
  unlockedRegionIds: string[];
  quests: Record<string, { status: string; stepIndex: number }>;
  world: { locationId: string | null; checkpointId: string };
}

export async function readAutoSave(page: Page): Promise<PersistedSaveSnapshot> {
  return page.evaluate(async () => {
    const request = indexedDB.open('three-kingdoms-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const tx = db.transaction('saves', 'readonly');
      const store = tx.objectStore('saves');
      const row = await new Promise<{ data?: unknown } | undefined>((resolve, reject) => {
        const get = store.get('auto');
        get.onsuccess = () => resolve(get.result as { data?: unknown } | undefined);
        get.onerror = () => reject(get.error);
      });
      if (!row?.data) throw new Error('auto save row missing');
      return row.data as PersistedSaveSnapshot;
    } finally {
      db.close();
    }
  });
}
