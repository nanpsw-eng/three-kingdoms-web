// Foundation gate: one command for typecheck, content validation, unit, golden, build and
// (when a Chromium is available) responsive E2E. Records PASS / FAIL / NOT_RUN per step.
// Usage: npm run verify:foundation [-- --skip-e2e]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const skipE2e = process.argv.includes('--skip-e2e');
const chromium = process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const hasPlaywrightBrowser = existsSync(chromium) || existsSync(`${process.env.HOME}/.cache/ms-playwright`);

const steps = [
  { id: 'typecheck', cmd: 'npm run -s typecheck' },
  { id: 'content-validation', cmd: 'npm run -s validate:content' },
  { id: 'domain-smoke (node, compiled domain)', cmd: 'npm run -s test:domain' },
  { id: 'unit (vitest, all)', cmd: 'npx vitest run' },
  { id: 'battle-golden (vitest subset)', cmd: 'npx vitest run tests/domain/battle-v01-golden.test.ts tests/domain/battle-golden.test.ts' },
  { id: 'architecture-boundaries', cmd: 'npx vitest run tests/architecture' },
  { id: 'build', cmd: 'npm run -s build' },
  {
    id: 'e2e (Playwright Chromium 360/390/412)',
    cmd: 'npx playwright test',
    skip: skipE2e ? 'skipped by --skip-e2e' : !hasPlaywrightBrowser ? 'no Chromium available' : null,
  },
];

const results = [];
for (const step of steps) {
  if (step.skip) {
    results.push({ step: step.id, status: 'NOT_RUN', reason: step.skip, ms: 0 });
    console.log(`\n=== ${step.id}: NOT_RUN (${step.skip})`);
    continue;
  }
  console.log(`\n=== ${step.id}: ${step.cmd}`);
  const started = Date.now();
  const run = spawnSync(step.cmd, { shell: true, stdio: 'inherit', env: process.env });
  results.push({ step: step.id, status: run.status === 0 ? 'PASS' : 'FAIL', exitCode: run.status, ms: Date.now() - started });
}

const notes = [
  'lint: NOT_CONFIGURED (no linter adopted yet; strict tsc is the current static gate)',
  'WebKit/iPhone Safari: NOT_RUN (Chromium emulation is not Safari evidence)',
  'Real Android/iOS devices: NOT_RUN',
];
console.log('\n=== FOUNDATION GATE SUMMARY');
for (const r of results) console.log(`${r.status.padEnd(8)} ${r.step}${r.reason ? ` — ${r.reason}` : ''}${r.ms ? ` (${(r.ms / 1000).toFixed(1)}s)` : ''}`);
for (const n of notes) console.log(`INFO     ${n}`);

mkdirSync('.tmp', { recursive: true });
writeFileSync('.tmp/verify-foundation.json', JSON.stringify({ at: new Date().toISOString(), node: process.version, results, notes }, null, 2));
process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
