#!/usr/bin/env node
// Verifies that every middleware-generated redirect points at the public
// origin (not the container's localhost:3001) and that the product sitemaps
// respond 200. Run after deploying the frontend image.
const BASE = (process.argv[2] || 'https://kavten.com').replace(/\/+$/, '');

const REDIRECTS = [
  { path: '/zh/products', expect: 301, location: `${BASE}/products` },
  { path: '/es/products?page=2', expect: 301, location: `${BASE}/products?page=2` },
  { path: '/Products', expect: 301, location: `${BASE}/products` },
  { path: '/FAQ', expect: 301, location: `${BASE}/faq` },
  { path: '/sitemap-products-1.xml', expect: 301, location: `${BASE}/sitemap-products/1.xml` },
  { path: '/en/products', expect: 308, location: `${BASE}/products` },
  { path: '/products/CISON-some-old-sku', expect: 308, location: `${BASE}/products/some-old-sku` },
];

const PAGES = [
  '/sitemap-products/1.xml',
  '/sitemap-products/2.xml',
  '/sitemap.xml',
  '/robots.txt',
];

let failures = 0;
const fail = (msg) => { failures++; console.log(`FAIL ${msg}`); };

for (const r of REDIRECTS) {
  const res = await fetch(`${BASE}${r.path}`, { redirect: 'manual', headers: { 'user-agent': 'Googlebot/2.1' } });
  const loc = res.headers.get('location') || '';
  const base = loc.split(', ')[0].trim();
  const expected = r.location;
  const ok = res.status === r.expect && base === expected;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.path} -> ${res.status} ${base}`);
  if (!ok) fail(`${r.path} expected ${r.expect} ${expected}`);
  if (/localhost|127\.0\.0\.1|:3001|:3000/.test(base)) fail(`${r.path} leaked an internal host in Location`);
}

for (const p of PAGES) {
  const res = await fetch(`${BASE}${p}`, { headers: { 'user-agent': 'Googlebot/2.1' } });
  const body = await res.text();
  const locs = (body.match(/<loc>/g) || []).length;
  const ok = res.status === 200 && (p.startsWith('/robots') || locs > 0);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${p} -> ${res.status} locs=${locs} bytes=${body.length}`);
  if (!ok) fail(`${p} expected 200 with <loc> entries, got ${res.status}/${locs}`);
}

console.log(failures === 0 ? 'REDIRECT_CHECK_OK' : `REDIRECT_CHECK_FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
