// Splits Boericke into small files for the Dashboard's Remedy of the Day, so
// it fetches one chapter (~2 KB) instead of the whole book (~400 KB gzipped).
// Runs before every dev/build; the output is generated, not committed.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const book = JSON.parse(fs.readFileSync(path.join(root, 'public/books/boericke.json'), 'utf8'));
const out = path.join(root, 'public/daily/boericke');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// Same order as deckOf() in src/features/remedy/dailyRemedy.ts: by slug, by code point.
const slugs = book.remedies.map((r) => r.slug).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ slugs }));
for (const r of book.remedies) fs.writeFileSync(path.join(out, `${r.slug}.json`), JSON.stringify(r));
console.log(`daily: ${slugs.length} Boericke chapters -> public/daily/boericke/`);
