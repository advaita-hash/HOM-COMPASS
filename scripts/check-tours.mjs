#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Checks the in-app tutorial (src/features/tour/tours/*.ts):
//   • every step target is written somewhere else in src as a string literal
//     ('id', "id", or data-tour="id"), so the overlay has something to find;
//   • tour ids are unique, and step ids are unique inside each tour.
// Also warns, without failing, about text over the writing guidelines.
// Run: npm run check:tours
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const TOURS = join(SRC, 'features', 'tour', 'tours');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** Index just past the string literal that opens at `i`. */
function skipString(text, i) {
  const q = text[i];
  for (i++; i < text.length && text[i] !== q; i++) if (text[i] === '\\') i++;
  return i + 1;
}

/** The source without line and block comments (string contents untouched). */
function stripComments(text) {
  let out = '';
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
    } else if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl < 0 ? text.length : nl;
    } else if (c === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2);
      i = close < 0 ? text.length : close + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Top-level `{ … }` objects of the array that follows `steps:` (comments already stripped). */
function stepObjects(text) {
  const at = text.search(/\bsteps\s*:\s*\[/);
  if (at < 0) return { head: text, steps: [] };
  const start = text.indexOf('[', at);
  const steps = [];
  let depth = 0;
  let objStart = -1;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(text, i) - 1;
      continue;
    }
    if (c === '[' || c === '{') {
      depth++;
      if (c === '{' && depth === 2) objStart = i;
    } else if (c === ']' || c === '}') {
      if (c === '}' && depth === 2 && objStart >= 0) {
        steps.push(text.slice(objStart, i + 1));
        objStart = -1;
      }
      depth--;
      if (depth === 0) break;
    }
  }
  return { head: text.slice(0, at), steps };
}

/** The first `name: '…'` (or "…" / `…`) string in a chunk of source. */
function field(chunk, name) {
  const m = chunk.match(new RegExp(String.raw`\b${name}\s*:\s*(['"\`])((?:\\.|(?!\1)[^\\])*)\1`));
  return m ? m[2].replace(/\\(.)/g, '$1') : undefined;
}

const words = (s) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0);

const tourFiles = readdirSync(TOURS)
  .filter((f) => f.endsWith('.ts'))
  .sort()
  .map((f) => join(TOURS, f));

// every other source file, for finding where each target is written
const elsewhere = walk(SRC)
  .filter((f) => !f.startsWith(TOURS))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const written = (id) => [`'${id}'`, `"${id}"`, `\`${id}\``].some((lit) => elsewhere.includes(lit));

const errors = [];
const warnings = [];
const rows = [];
const tourIds = new Map();

for (const file of tourFiles) {
  const where = relative(ROOT, file);
  const { head, steps } = stepObjects(stripComments(readFileSync(file, 'utf8')));
  const id = field(head, 'id');
  if (!id) {
    errors.push(`${where}: no tour id`);
    continue;
  }
  if (tourIds.has(id)) errors.push(`${where}: tour id "${id}" is also used by ${tourIds.get(id)}`);
  tourIds.set(id, where);
  if (steps.length === 0) errors.push(`${where}: tour "${id}" has no steps`);
  if (id !== 'welcome' && (steps.length < 3 || steps.length > 8)) {
    warnings.push(`${id}: ${steps.length} steps (page tours aim for 3-8)`);
  }

  const stepIds = new Set();
  let targets = 0;
  let found = 0;
  steps.forEach((s, i) => {
    const sid = field(s, 'id');
    const label = `${id} › ${sid ?? `step ${i + 1}`}`;
    if (!sid) errors.push(`${where}: step ${i + 1} has no id`);
    else if (stepIds.has(sid)) errors.push(`${where}: step id "${sid}" is used twice`);
    else stepIds.add(sid);

    const target = field(s, 'target');
    if (target) {
      targets++;
      if (written(target)) found++;
      else errors.push(`${label}: target "${target}" is not written anywhere in src (add data-tour="${target}")`);
    }

    const title = field(s, 'title');
    const body = field(s, 'body');
    const tip = field(s, 'tip');
    if (!title || !body) errors.push(`${label}: needs a title and a body`);
    if (words(title) > 4) warnings.push(`${label}: title has ${words(title)} words (aim for 1-4)`);
    if (words(body) > 32) warnings.push(`${label}: body has ${words(body)} words (aim for <= 32)`);
    if (words(tip) > 16) warnings.push(`${label}: tip has ${words(tip)} words (aim for <= 16)`);
    for (const text of [body, tip]) {
      if (text && /(?<!\{)\b(tap|click)s?\b(?!\})/i.test(text)) {
        warnings.push(`${label}: write {Tap}/{tap} instead of tap/click`);
      }
    }
  });

  rows.push([id, String(steps.length), targets ? `${found}/${targets}` : '-']);
}

// summary table
const header = ['tour', 'steps', 'targets ok'];
const widths = header.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
const line = (cells) => cells.map((v, c) => v.padEnd(widths[c])).join('  ');
console.log(line(header));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
for (const r of rows) console.log(line(r));

if (warnings.length) {
  console.log(`\n${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} tour${rows.length === 1 ? '' : 's'} OK.`);
