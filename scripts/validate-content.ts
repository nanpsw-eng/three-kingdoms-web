import { formatIssues, validateContent } from '../src/game/content/registry';
import { readContentFiles } from './contentFiles';

const files = readContentFiles();
const result = validateContent(files);
const r = result.registry;
const counts = (Object.keys(r) as Array<keyof typeof r>).map((k) => `${k}=${k === 'locales' ? Object.keys(r.locales).join(',') || '-' : (r[k] as ReadonlyMap<string, unknown>).size}`).join(' ');

if (!result.ok) {
  console.error(`content validation FAILED (${result.issues.length} issue(s)) from ${files.length} file(s)`);
  console.error(formatIssues(result.issues));
  process.exit(1);
}
console.log(`content validation PASS: ${files.length} file(s); ${counts}`);
