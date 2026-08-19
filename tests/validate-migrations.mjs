import { readFile } from 'node:fs/promises';
const cases = JSON.parse(await readFile('tests/migration-cases.json', 'utf8'));
if (!Array.isArray(cases) || !cases.length) throw new Error('Migration fixture set is empty');
for (const item of cases) {
  if (!item?.name || !item?.input?.id || !item?.input?.title) throw new Error(`Invalid migration case: ${item?.name ?? 'unknown'}`);
}
console.log(`Migration fixtures valid: ${cases.length}`);
