#!/usr/bin/env node
/**
 * Read-only similarity report between our live product slugs and the slugs the
 * source catalogue publishes. Jaccard over slug tokens, one row per product
 * (its closest competitor slug).
 *
 *   node scripts/analyze_slug_similarity.mjs                 # summary + top 60
 *   node scripts/analyze_slug_similarity.mjs --threshold .7  # lower cut-off
 *   node scripts/analyze_slug_similarity.mjs --csv tmp/x.csv
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argValue = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
const THRESHOLD = Number(argValue('--threshold') || 0.8);

function mysqlRows(sql) {
  const output = execFileSync(
    'docker',
    ['exec', 'kavten_mysql', 'mysql', '-ukavten', '-pchange_me_db_password', 'kavten_sales', '-N', '-B', '--raw', '-e', sql],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
  );
  return output
    .split(String.fromCharCode(10))
    .map((line) => line.replace(/\r$/, ''))
    .filter(Boolean)
    .map((line) => line.split(String.fromCharCode(9)));
}

const competitor = new Set();
for (const file of ['tmp/enginediy-sitemap1.xml', 'tmp/enginediy-sitemap2.xml']) {
  const xml = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const m of xml.matchAll(/\/products\/([^/?#"\s<]+)/g)) competitor.add(m[1].toLowerCase());
}

const tokens = (slug) => new Set(slug.split('-').filter(Boolean));
const jaccard = (a, b) => {
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
};

const rows = mysqlRows('SELECT id, slug, name FROM products WHERE is_active = 1 AND seo_noindex = 0;');
const competitorTokens = [...competitor].map((slug) => [slug, tokens(slug)]);

const results = [];
for (const [id, slug, name] of rows) {
  const mine = tokens(slug);
  let best = { slug: '', score: 0 };
  for (const [theirs, theirTokens] of competitorTokens) {
    const score = jaccard(mine, theirTokens);
    if (score > best.score) best = { slug: theirs, score };
  }
  results.push({ id: Number(id), slug, name, closest: best.slug, score: Math.round(best.score * 1000) / 1000 });
}

results.sort((a, b) => b.score - a.score);
const over = results.filter((r) => r.score >= THRESHOLD);
const buckets = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7].map((cut) => ({
  cut,
  count: results.filter((r) => r.score >= cut).length,
}));

console.log(`products=${results.length} competitorSlugs=${competitor.size} threshold=${THRESHOLD}`);
console.log('distribution:', buckets.map((b) => `>=${b.cut}: ${b.count}`).join('  '));
console.log(`at or above threshold: ${over.length}`);
for (const r of over.slice(0, Number(argValue('--show') || 60))) {
  console.log(`${String(r.score).padEnd(5)} ${r.slug}\n      vs ${r.closest}`);
}

const csvPath = argValue('--csv');
if (csvPath) {
  const target = path.resolve(ROOT, csvPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  fs.writeFileSync(target, [
    'id,score,slug,closest,name',
    ...results.map((r) => [r.id, r.score, escape(r.slug), escape(r.closest), escape(r.name)].join(',')),
  ].join(String.fromCharCode(10)) + String.fromCharCode(10));
  console.log(`csv: ${target}`);
}
fs.writeFileSync(path.join(ROOT, 'tmp', 'slug-similarity.json'), `${JSON.stringify({ threshold: THRESHOLD, buckets, over: over.length, rows: results }, null, 2)}\n`);
