import { expect, test } from '@playwright/test';
import { openWorld, readAutoSave, walkIntoScout } from './helpers';

test('manifest, app-shell service worker, and save stays in IndexedDB (not Cache Storage)', async ({ page }) => {
  await openWorld(page);
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await (await page.request.get(manifestHref!)).json();
  expect(manifest.orientation).toBe('portrait');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true);

  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, active: Boolean(reg.active) };
  });
  expect(sw.active).toBe(true);

  await expect(page.locator('main.app-shell')).toHaveAttribute('data-save', 'ready');
  const storage = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const cached: string[] = [];
    for (const name of cacheNames) for (const req of await (await caches.open(name)).keys()) cached.push(new URL(req.url).pathname);
    const dbs = (await indexedDB.databases()).map((d) => d.name);
    return { cacheNames, cached, dbs };
  });
  expect(storage.dbs).toContain('three-kingdoms-web');
  expect(storage.cacheNames.every((n) => n.startsWith('workbox-precache'))).toBe(true);
  expect(storage.cached.every((p) => /\.(js|css|html|svg|png|webmanifest)$|\/$/.test(p))).toBe(true);
});

test('portrait layout: field fills space, nothing overflows, primary controls reachable', async ({ page }) => {
  await openWorld(page);
  const vw = page.viewportSize()!;
  const layout = await page.evaluate(() => {
    const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    return { world: r('.world-card'), party: r('.party-card'), nav: r('.bottom-nav'), scrollW: document.documentElement.scrollWidth };
  });
  expect(layout.scrollW).toBeLessThanOrEqual(vw.width);
  expect(layout.world.height).toBeGreaterThanOrEqual(300);
  expect(layout.party.bottom).toBeLessThanOrEqual(layout.nav.top + 1);
  // No party member text spills outside its card.
  const spill = await page.evaluate(() => {
    const card = document.querySelector('.party-card')!.getBoundingClientRect();
    return [...document.querySelectorAll('.party-card .general *')].some((el) => el.getBoundingClientRect().right > card.right + 0.5);
  });
  expect(spill).toBe(false);

  await walkIntoScout(page);
  await page.getByRole('dialog', { name: '적과 조우' }).getByRole('button', { name: '전투' }).tap();
  const start = page.getByRole('button', { name: '전투개시' });
  await expect(start).toBeVisible();
  const box = (await start.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(vw.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vw.width);
});


test('offline PWA reload keeps the app shell and IndexedDB save available', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'offline PWA evidence is Chromium-only; WebKit remains supplemental browser compatibility');

  await page.goto('/');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(async () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 10_000 }).toBe(true);

  const before = await readAutoSave(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(shell).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect(shell).toHaveAttribute('data-save', 'ready', { timeout: 15_000 });
  const after = await readAutoSave(page);
  expect(after).toEqual(before);

  const offlineState = await page.evaluate(async () => ({
    online: navigator.onLine,
    controller: Boolean(navigator.serviceWorker.controller),
    caches: await caches.keys(),
    databases: (await indexedDB.databases()).map((db) => db.name),
  }));
  expect(offlineState.online).toBe(false);
  expect(offlineState.controller).toBe(true);
  expect(offlineState.caches.some((name) => name.startsWith('workbox-precache'))).toBe(true);
  expect(offlineState.databases).toContain('three-kingdoms-web');
});
