import { formatIssues, validateContent } from '../src/game/content/registry';
import { readContentFiles } from './contentFiles';

const files = readContentFiles();
const result = validateContent(files);
const r = result.registry;
const counts = `generals=${r.generals.size} traits=${r.traits.size} tactics=${r.tactics.size} formations=${r.formations.size} unitTypes=${r.unitTypes.size} locales=${Object.keys(r.locales).join(',') || '-'}`;

if (!result.ok) {
  console.error(`content validation FAILED (${result.issues.length} issue(s)) from ${files.length} file(s)`);
  console.error(formatIssues(result.issues));
  process.exit(1);
}
console.log(`content validation PASS: ${files.length} file(s); ${counts}`);
