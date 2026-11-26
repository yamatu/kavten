#!/usr/bin/env node
// Live SEO audit for the running storefront. Read-only: fetches sitemap
// child files, crawls every listed URL plus a product sample, and reports
// title/description/canonical/robots/H1/structured-data problems.
//
// Usage: node scripts/audit_seo_live.mjs [baseUrl] [productSample]

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const PRODUCT_SAMPLE = Number(process.argv[3] || 40);
const CONCURRENCY = 6;
// AUDIT_HOST=kavten.com sends that Host header and compares canonicals against
// it, so a production canonical can be verified before DNS exists.
const VIRTUAL_HOST = (process.env.AUDIT_HOST || '').trim();
const PROTOCOL = (process.env.AUDIT_PROTOCOL || 'https').trim();

function expectedCanonical(url) {
  if (!VIRTUAL_HOST) return url;
  const { pathname } = new URL(url);
  return `${PROTOCOL}://${VIRTUAL_HOST}${pathname}`;
}

// https://kavten.com and https://kavten.com/ are the same resource; the app
// writes the pathless form on the home page and in the sitemap, so comparing
// them literally would report a permanent false positive.
function sameCanonical(actual, expected) {
  const strip = (u) => String(u || '').replace(/\/+$/, '');
  return strip(actual) === strip(expected);
}

async function get(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: VIRTUAL_HOST
      ? { 'user-agent': 'SeoAudit/1.0', host: VIRTUAL_HOST }
      : { 'user-agent': 'SeoAudit/1.0' },
  });
  const body = await res.text();
  return { status: res.status, url, finalUrl: res.url, body, headers: res.headers };
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function decode(value) {
  return String(value)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
}

function analyze(page) {
  const html = page.body;
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const titleRaw = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleRaw ? decode(titleRaw[1]).trim() : '';
  const desc = decode(head.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] || '');
  const canonical = decode(head.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)?.[1] || '');
  const robots = head.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)?.[1] || '';
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim());
  const h2count = [...html.matchAll(/<h2[^>]*>/gi)].length;
  const jsonldBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]);
  const types = [];
  let ldErrors = [];
  for (const block of jsonldBlocks) {
    try {
      const parsed = JSON.parse(block);
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (node['@type']) types.push(Array.isArray(node['@type']) ? node['@type'].join('/') : node['@type']);
        if (node['@graph']) walk(node['@graph']);
      };
      walk(parsed);
    } catch (error) {
      ldErrors.push(String(error.message).slice(0, 120));
    }
  }
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imgsNoAlt = imgs.filter((tag) => !/\balt=/.test(tag)).length;
  const imgsEmptyAlt = imgs.filter((tag) => /\balt=(""|'')/.test(tag)).length;
  const lang = head.match(/<html[^>]+lang="([^"]*)"/i)?.[1] || '';
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((m) => m[1]).filter((h) => h.startsWith('/'));
  const words = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

  return {
    url: page.url,
    status: page.status,
    finalUrl: page.finalUrl,
    redirected: page.finalUrl !== page.url,
    title: { value: title, length: title.length },
    description: { value: desc, length: desc.length },
    canonical: { value: canonical, ok: sameCanonical(canonical, expectedCanonical(page.url)) },
    robots,
    noindex: /noindex/i.test(robots),
    h1Count: h1s.length,
    h1: h1s,
    h2count,
    lang,
    schemaTypes: [...new Set(types)],
    ldErrors,
    imgs: imgs.length,
    imgsNoAlt,
    imgsEmptyAlt,
    words,
    internalLinks: links.length,
    bytes: html.length,
  };
}

async function pool(items, worker, limit) {
  const out = new Array(items.length);
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      try {
        out[current] = await worker(items[current], current);
      } catch (error) {
        out[current] = { url: items[current], error: String(error.message || error) };
      }
    }
  });
  await Promise.all(runners);
  return out;
}

const index = await get(`${BASE}/sitemap.xml`);
// A <loc> without a path (the home page is written as https://kavten.com) would
// otherwise be fetched as a pathless URL and reported as a redirect to its own
// trailing-slash form.
const toBase = (url) => {
  const rewritten = url.replace(/^https?:\/\/[^/]+/, BASE);
  return /^https?:\/\/[^/]+$/.test(rewritten) ? `${rewritten}/` : rewritten;
};
const children = locs(index.body).map(toBase);
const entries = {};
for (const child of children) {
  const res = await get(child);
  entries[child.replace(BASE, '')] = { status: res.status, locs: locs(res.body).map(toBase) };
}

const categories = entries['/sitemap-categories.xml']?.locs || [];
const statics = entries['/sitemap-static.xml']?.locs || [];
const blog = entries['/sitemap-blog.xml']?.locs || [];
const news = entries['/sitemap-news.xml']?.locs || [];
const allProducts = (entries['/sitemap-products/1.xml']?.locs || []).concat(entries['/sitemap-products/2.xml']?.locs || []);
const step = Math.max(1, Math.floor(allProducts.length / PRODUCT_SAMPLE));
const productSample = allProducts.filter((_, i) => i % step === 0).slice(0, PRODUCT_SAMPLE);

const targets = [...statics, ...categories, ...blog, ...news, ...productSample];
const label = new Map([
  ...[...statics].map((u) => [u, 'static']),
  ...[...categories].map((u) => [u, 'category']),
  ...[...blog, ...news].map((u) => [u, 'article']),
  ...[...productSample].map((u) => [u, 'product']),
]);

const results = await pool(targets, async (url) => {
  const page = await get(url);
  return { kind: label.get(url), ...analyze(page) };
}, CONCURRENCY);

const report = {
  base: BASE,
  sitemaps: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, v.locs.length])),
  counts: { statics: statics.length, categories: categories.length, blog: blog.length, news: news.length, products: allProducts.length, crawled: results.length },
  problems: [],
  results,
};

const push = (kind, url, issue) => report.problems.push({ kind, url, issue });

for (const row of results) {
  if (row.error) { push(row.kind, row.url, `fetch error: ${row.error}`); continue; }
  if (row.status !== 200) push(row.kind, row.url, `status ${row.status}`);
  if (row.redirected) push(row.kind, row.url, `redirected to ${row.finalUrl}`);
  if (!row.title.value) push(row.kind, row.url, 'missing title');
  else if (row.title.length > 65) push(row.kind, row.url, `title ${row.title.length} chars`);
  else if (row.title.length < 15) push(row.kind, row.url, `title too short (${row.title.length})`);
  if (!row.description.value) push(row.kind, row.url, 'missing meta description');
  else if (row.description.length > 165) push(row.kind, row.url, `description ${row.description.length} chars`);
  else if (row.description.length < 60) push(row.kind, row.url, `description too short (${row.description.length})`);
  if (!row.canonical.value) push(row.kind, row.url, 'missing canonical');
  else if (!row.canonical.ok) push(row.kind, row.url, `canonical mismatch -> ${row.canonical.value}`);
  if (row.noindex) push(row.kind, row.url, 'noindex in sitemap');
  if (row.h1Count === 0) push(row.kind, row.url, 'no H1');
  if (row.h1Count > 1) push(row.kind, row.url, `${row.h1Count} H1s: ${row.h1.join(' || ').slice(0, 160)}`);
  if (row.ldErrors.length) push(row.kind, row.url, `invalid JSON-LD: ${row.ldErrors.join('; ')}`);
  if (row.words < 150) push(row.kind, row.url, `thin content (${row.words} words)`);
  if (row.imgsNoAlt > 0) push(row.kind, row.url, `${row.imgsNoAlt}/${row.imgs} images without alt`);
  if (row.lang !== 'en') push(row.kind, row.url, `html lang="${row.lang}"`);
}

const summary = {};
for (const p of report.problems) {
  const key = `${p.kind}: ${p.issue.replace(/[\d.]+/g, 'N').replace(/->.*/, '-> ...')}`;
  summary[key] = (summary[key] || 0) + 1;
}

console.log(JSON.stringify({ base: BASE, virtualHost: VIRTUAL_HOST || null, counts: report.counts, sitemaps: report.sitemaps, summary, problems: report.problems.slice(0, 400), results: results.map((r) => ({ kind: r.kind, url: r.url, status: r.status, t: r.title?.length, d: r.description?.length, canal: r.canonical?.value, h1: r.h1Count, words: r.words, imgs: r.imgs, noAlt: r.imgsNoAlt, schema: r.schemaTypes, ld: r.ldErrors?.length })) }, null, 1));
