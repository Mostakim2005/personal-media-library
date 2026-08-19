import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';

const required = ['manifest.json', 'README.md', 'LICENSE', 'main.js'];
for (const file of required) {
  try { await stat(file); } catch { throw new Error(`Missing release file: ${file}`); }
}

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
if (!/^\\d+\\.\\d+\\.\\d+$/.test(manifest.version)) throw new Error('Invalid manifest version');
if (!/^[a-z0-9-]+$/.test(manifest.id)) throw new Error('Invalid plugin id');
if (!manifest.description || manifest.description.length > 250) throw new Error('Manifest description must be <= 250 characters');
console.log(`Release structure valid: ${manifest.name} ${manifest.version}`);
