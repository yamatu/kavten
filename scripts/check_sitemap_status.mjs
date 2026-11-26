#!/usr/bin/env node
// Checks the HTTP status of every URL in the product sitemaps (no body work
// beyond what the server already streams). Usage: node scripts/check_sitemap_status.mjs [base]

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const CONCURRENCY = Number(process.argv[3] || 8);

const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const productChildren = children.filter((u) => u.includes('sitemap-products/'));

const urls = [];
for (const child of productChildren) {
  const xml = await (await fetch(child.replace(/^https?:\/\/[^/]+/, BASE))).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    urls.push(m[1].replace(/^https?:\/\/[^/]+/, BASE));
  }
}

const results = { ok: 0, notFound: [], redirect: [], other: [] };
let cursor = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'SitemapStatus/1.0' } });
      if (res.status === 200) results.ok++;
      else if (res.status === 404) results.notFound.push(url);
      else if (res.status >= 300 && res.status < 400) results.redirect.push(`${url} -> ${res.headers.get('location')}`);
      else results.other.push(`${res.status} ${url}`);
    } catch (error) {
      results.other.push(`ERR ${url} ${error.message}`);
    }
  }
}));

console.log(JSON.stringify({
  total: urls.length,
  ok: results.ok,
  notFoundCount: results.notFound.length,
  redirectCount: results.redirect.length,
  otherCount: results.other.length,
  notFound: results.notFound.slice(0, 50),
  redirect: results.redirect.slice(0, 50),
  other: results.other.slice(0, 50),
}, null, 1));
