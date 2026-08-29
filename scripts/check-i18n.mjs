import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fr = JSON.parse(readFileSync(join(root, 'src/lib/i18n/locales/fr.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(root, 'src/lib/i18n/locales/en.json'), 'utf8'));

function keys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => keys(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((key) => keys(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

const frKeys = keys(fr);
const enKeys = keys(en);
const missingInEn = frKeys.filter((key) => !enKeys.includes(key));
const missingInFr = enKeys.filter((key) => !frKeys.includes(key));

if (missingInEn.length || missingInFr.length) {
  if (missingInEn.length) console.error('Missing in en.json:\n' + missingInEn.join('\n'));
  if (missingInFr.length) console.error('Missing in fr.json:\n' + missingInFr.join('\n'));
  process.exit(1);
}

console.log(`i18n keys ok (${frKeys.length})`);
