import { formatIssues, validateContent, type ContentRegistry, type RawContentFile } from './registry';

/** App-side loader: Vite bundles every JSON under src/content at build time. */
const modules = import.meta.glob('/src/content/**/*.json', { eager: true, import: 'default' });

export function loadBundledContent(): ContentRegistry {
  const files: RawContentFile[] = Object.entries(modules).map(([path, data]) => ({ path: path.replace(/^\//, ''), data }));
  const result = validateContent(files);
  if (!result.ok) throw new Error(`Invalid bundled content:\n${formatIssues(result.issues)}`);
  return result.registry;
}
