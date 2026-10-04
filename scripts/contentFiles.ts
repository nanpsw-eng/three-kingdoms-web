import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { RawContentFile } from '../src/game/content/registry';

/** Node-side loader: read every JSON file under src/content. */
export function readContentFiles(root = join(process.cwd(), 'src/content')): RawContentFile[] {
  const files: RawContentFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.json')) {
        const path = relative(process.cwd(), full).replace(/\\/g, '/');
        try {
          files.push({ path, data: JSON.parse(readFileSync(full, 'utf8')) });
        } catch (error) {
          files.push({ path, data: { __parseError: String(error) } });
        }
      }
    }
  };
  walk(root);
  return files;
}
