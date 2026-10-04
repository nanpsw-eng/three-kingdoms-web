import { expect, test } from '@playwright/test';
import { openWorld, walkIntoScout, worldState } from './helpers';

test('Smart Command battle: one-tap turn, override, target select, speed, auto, result, persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openWorld(page);
  await walkIntoScout(page);
  const encounter = page.getByRole('dialog', { name: '적과 조우' });
  const formationGroup = encounter.getByRole('group', { name: '전투 진형 선택' });
  await expect(formationGroup.getByRole('button', { name: '추행진' })).toBeVisible();
  await formationGroup.getByRole('button', { name: '추행진' }).tap();
  await expect(formationGroup.getByRole('button', { name: '추행진' })).toHaveAttribute('aria-pressed', 'true');
  await encounter.getByRole('button', { name: '전투' }).tap();

  const panel = page.getByRole('region', { name: '전투 명령' });
  await expect(panel).toHaveAttribute('data-formation', 'FORM_WEDGE');
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'Battle');
  await expect(panel).toHaveAttribute('data-turn', '1');

  // Every ally starts with a preselected basic attack; all critical controls are >= 44px.
  const allyRows = panel.getByRole('list', { name: '아군 명령' }).getByRole('button');
  await expect(allyRows).toHaveCount(3);
  for (const row of await allyRows.all()) await expect(row).toContainText('공격 →');
  for (const b of await panel.locator('.battle-actions button, .ally-row, .unit-chip').all()) {
    expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  // One tap executes an ordinary turn.
  await panel.getByRole('button', { name: '전투개시' }).tap();
  await expect(panel).toHaveAttribute('data-turn', '2', { timeout: 10_000 });

  // Override: Zhang Fei -> Taunt (self tactic) in two taps.
  await allyRows.filter({ hasText: '장비' }).tap();
  await page.getByRole('dialog', { name: /장비 명령 선택/ }).getByRole('button', { name: /도발/ }).tap();
  await expect(allyRows.filter({ hasText: '장비' })).toContainText('도발');

  // Target selection by touch: Guan Yu attacks a chosen enemy.
  await allyRows.filter({ hasText: '관우' }).tap();
  await page.getByRole('dialog', { name: /관우 명령 선택/ }).getByRole('button', { name: '공격' }).tap();
  const enemyChips = panel.getByRole('group', { name: '적 부대' }).getByRole('button');
  const target = enemyChips.filter({ hasText: '황건 궁병대' });
  await target.tap();
  await expect(allyRows.filter({ hasText: '관우' })).toContainText('공격 → 황건 궁병대');

  // Speed x3 then auto battle to the end.
  await panel.getByRole('button', { name: /전투 속도 x1/ }).tap();
  await panel.getByRole('button', { name: /전투 속도 x2/ }).tap();
  await expect(panel.getByRole('button', { name: /전투 속도 x3/ })).toBeVisible();
  await panel.getByRole('button', { name: '자동', exact: true }).tap();
  const result = page.getByRole('dialog', { name: '전투 결과' });
  await expect(result).toBeVisible({ timeout: 25_000 });
  await expect(result).toContainText('승리');
  await result.getByRole('button', { name: '계속' }).tap();

  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'World');
  await expect.poll(async () => (await worldState(page)).enemies[0]?.mode).toBe('DEFEATED');
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-save', 'ready');
  // Victory advanced the main quest (pure progression engine via ENCOUNTER_VICTORY).
  await expect(page.getByTestId('quest-objective')).toContainText('백수촌');

  // Reload: autosaved IndexedDB state keeps the scout defeated and troops reduced.
  await page.reload();
  await expect(page.locator('main.app-shell')).toHaveAttribute('data-scene', 'World', { timeout: 15_000 });
  await expect.poll(async () => (await worldState(page)).enemies[0]?.mode, { timeout: 5_000 }).toBe('DEFEATED');
  await expect(page.getByTestId('quest-objective')).toContainText('백수촌');
  expect(errors).toEqual([]);
});
