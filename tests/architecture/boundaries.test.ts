import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const importsOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);

describe('architecture hard boundaries (AGENTS.md §4)', () => {
  const domainFiles = files(join(process.cwd(), 'src/game/domain'));

  it('domain imports neither React, Phaser, Dexie, Zod nor anything outside src/game/domain', () => {
    expect(domainFiles.length).toBeGreaterThan(0);
    for (const file of domainFiles) {
      for (const spec of importsOf(file)) {
        expect(spec, `${file} imports ${spec}`).not.toMatch(/^(react|react-dom|phaser|dexie|zod)(\/|$)/);
        if (spec.startsWith('.')) {
          const resolved = join(file, '..', spec);
          expect(resolved.startsWith(join(process.cwd(), 'src/game/domain')), `${file} escapes domain via ${spec}`).toBe(true);
        }
      }
    }
  });

  it('domain never calls Math.random or Date.now', () => {
    for (const file of domainFiles) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/Math\.random\s*\(/);
      expect(src, file).not.toMatch(/Date\.now\s*\(/);
    }
  });
});
