#!/usr/bin/env node
/**
 * Keeps the User manual (src/admin/HelpPage.tsx) in step with the admin panel.
 * Runs as part of `npm run build`, so an outdated manual stops the build instead of
 * silently showing wrong instructions. Run it on its own with `npm run check:manual`.
 *
 * Checks:
 *  1. Every UI name in the manual, written as **Name** (or **Screen → Tab**), is a label that
 *     really exists in the admin panel. Plain emphasis is written as __text__ and is not checked.
 *  2. Every screen in the admin sidebar has a section in the manual (its `open.to` route).
 *  3. Every route the manual links to is a screen in the admin sidebar.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(frontend, 'src');
const MANUAL = join(src, 'admin', 'HelpPage.tsx');
// Files that only describe the admin panel; their texts must not count as real labels.
const DESCRIBING = new Set([MANUAL, join(src, 'admin', 'PageMap.tsx'), join(src, 'admin', 'catalog.ts')]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return ['.ts', '.tsx'].includes(extname(p)) ? [p] : [];
  });
}

const STR = String.raw`(['"])((?:\\.|(?!\1)[^\\\n])*)\1`;
const callRe = new RegExp(String.raw`\b(?:at|msg|tr)\(\s*` + STR, 'g');
const ternaryRe = new RegExp(String.raw`\bat\([^'"\n()]*\?\s*` + STR + String.raw`\s*:\s*(['"])((?:\\.|(?!\3)[^\\\n])*)\3`, 'g');
const unescape = (s) => s.replace(/\\(['"\\])/g, '$1');
const norm = (s) => s.trim().toLowerCase();

// ---- 1. Labels that exist in the admin panel (and the preview bar / section labels).
const labelFiles = [
  ...walk(join(src, 'admin')),
  join(src, 'public', 'PublicLayout.tsx'),
  join(src, 'public', 'SectionGuide.tsx'),
].filter((f) => !DESCRIBING.has(f));

const labels = new Map(); // normalised -> original
for (const file of labelFiles) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(ternaryRe)) {
    labels.set(norm(unescape(m[2])), unescape(m[2]));
    labels.set(norm(unescape(m[4])), unescape(m[4]));
  }
  for (const m of text.matchAll(callRe)) labels.set(norm(unescape(m[2])), unescape(m[2]));
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function suggest(term) {
  const t = norm(term);
  const short = [...labels.keys()].filter((l) => l.length <= 60);
  return short
    .map((l) => ({ l, d: distance(t, l) }))
    .filter((x) => x.d <= Math.max(3, Math.floor(t.length / 3)))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((x) => `"${labels.get(x.l)}"`);
}

const manual = readFileSync(MANUAL, 'utf8');
const lineOf = (index) => manual.slice(0, index).split('\n').length;
const problems = [];

for (const m of manual.matchAll(callRe)) {
  const sentence = unescape(m[2]);
  for (const b of sentence.matchAll(/\*\*(.+?)\*\*/g)) {
    for (const part of b[1].split(/\s*[→›]\s*/)) {
      if (labels.has(norm(part))) continue;
      const hint = suggest(part);
      problems.push(
        `${relative(frontend, MANUAL)}:${lineOf(m.index)}  "${part}" is not a label in the admin panel.` +
          (hint.length ? ` Did you mean ${hint.join(' or ')}?` : '') +
          `\n      in: ${sentence}`,
      );
    }
  }
}

// ---- 2 & 3. Sidebar screens <-> manual sections.
const layout = readFileSync(join(src, 'admin', 'AdminLayout.tsx'), 'utf8');
const navBlock = layout.slice(layout.indexOf('const NAV'), layout.indexOf('];', layout.indexOf('const NAV')));
const navRoutes = [...navBlock.matchAll(/to:\s*'([^']+)'/g)].map((m) => m[1]).filter((r) => r !== '/admin/help');
const manualRoutes = new Set([...manual.matchAll(/open:\s*\{\s*to:\s*'([^']+)'/g)].map((m) => m[1]));

for (const route of navRoutes) {
  if (!manualRoutes.has(route)) {
    problems.push(`The admin screen ${route} is in the sidebar but has no section in the User manual (add a section with open: { to: '${route}', … }).`);
  }
}
for (const route of manualRoutes) {
  if (!navRoutes.includes(route)) {
    problems.push(`The User manual links to ${route}, which is not a screen in the admin sidebar.`);
  }
}

if (problems.length) {
  console.error(`\nUser manual is out of date (${problems.length} problem${problems.length > 1 ? 's' : ''}):\n`);
  for (const p of problems) console.error(`  - ${p}\n`);
  console.error('Update src/admin/HelpPage.tsx. Write UI names as **Name** and plain emphasis as __text__.\n');
  process.exit(1);
}
console.log(`User manual OK: ${navRoutes.length} screens covered, every UI name matches the admin panel.`);
