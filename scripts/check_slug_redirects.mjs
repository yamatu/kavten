#!/usr/bin/env node
/**
 * Verifies that every retired product URL answers with a single permanent
 * redirect to a live URL, and that the live URL returns 200.
 *
 *   node scripts/check_slug_redirects.mjs                 # sample of 25
 *   node scripts/check_slug_redirects.mjs --all           # every history row
 *   node scripts/check_slug_redirects.mjs --base https://kavten.com --all
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTAINER = process.env.MYSQL_CONTAINER || 'kavten_mysql';
const MYSQL_USER = process.env.MYSQL_USER || 'kavten';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'change_me_db_password';
const MYSQL_DB = process.env.MYSQL_DB || 'kavten_sales';

const argv = process.argv.slice(2);
const argValue = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};
const hasFlag = (flag) => argv.includes(flag);

const BASE = (argValue('--base') || 'http://127.0.0.1:3000').replace(/\/$/, '');

function mysqlRows(sql) {
  const output = execFileSync(
    'docker',
    ['exec', CONTAINER, 'mysql', `-u${MYSQL_USER}`, `-p${MYSQL_PASSWORD}`, MYSQL_DB, '-N', '-B', '--raw', '-e', sql],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  return output
    .split(String.fromCharCode(10))
    .map((line) => line.replace(/\r$/, ''))
    .filter(Boolean)
    .map((line) => line.split(String.fromCharCode(9)));
}

async function head(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'KavtenRedirectCheck/1.0' } });
  // undici surfaces a single Location header as "a, a"; keep the first value.
  const location = (res.headers.get('location') || '').split(', ')[0].trim();
  return { status: res.status, location };
}

const rows = mysqlRows(
  'SELECT h.old_slug, h.new_slug, h.reason, p.slug, p.is_active FROM product_slug_history h ' +
  'LEFT JOIN products p ON p.id = h.product_id;',
);

const sampleSize = Number(argValue('--sample') || 25);
const step = hasFlag('--all') ? 1 : Math.max(1, Math.floor(rows.length / sampleSize));
const sample = rows.filter((_, index) => index % step === 0).slice(0, hasFlag('--all') ? rows.length : sampleSize);

let problems = 0;
const reasonCounts = {};
for (const [oldSlug, newSlug, reason, currentSlug, isActive] of rows) {
  reasonCounts[reason || '(none)'] = (reasonCounts[reason || '(none)'] || 0) + 1;
  if (!isActive || isActive === '0') {
    // Retired product: history must point at the surviving listing.
    if (!newSlug) {
      problems += 1;
      console.log(`MISSING TARGET  ${oldSlug}`);
    }
  } else if (currentSlug !== newSlug) {
    problems += 1;
    console.log(`STALE HISTORY   ${oldSlug} -> ${newSlug} but product slug is ${currentSlug}`);
  }
}

for (const [oldSlug, newSlug] of sample) {
  const oldUrl = `${BASE}/products/${oldSlug}`;
  const targetUrl = `${BASE}/products/${newSlug}`;
  const [oldRes, newRes] = await Promise.all([head(oldUrl), head(targetUrl)]);
  const landed = oldRes.location.replace(BASE, '');
  // Next answers permanentRedirect() with 308; 301 is accepted for a gateway
  // that normalises it. Either must land on the current product URL.
  const redirected = (oldRes.status === 308 || oldRes.status === 301) && landed === `/products/${newSlug}`;
  const newOk = newRes.status === 200;
  if (!redirected || !newOk) {
    problems += 1;
    console.log(`FAIL ${oldUrl} -> ${oldRes.status} ${oldRes.location || ''} (expected /products/${newSlug}); target=${newRes.status}`);
  } else {
    console.log(`ok   ${oldSlug} -> ${newSlug}  [${oldRes.status}]`);
  }
}

const summary = {
  base: BASE,
  historyRows: rows.length,
  checked: sample.length,
  reasons: reasonCounts,
  problems,
};
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp', 'slug-redirect-check.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
process.exit(problems === 0 ? 0 : 1);
