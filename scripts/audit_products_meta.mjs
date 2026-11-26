#!/usr/bin/env node
// Crawls every product URL from the product sitemaps and reports duplicate
// titles, duplicate meta descriptions, missing/short copy, missing schema and
// image issues. Read-only. Usage: node scripts/audit_products_meta.mjs [base] [concurrency]

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const CONCURRENCY = Number(process.argv[3] || 10);
// AUDIT_HOST=kavten.com sends that Host header and compares canonicals against
// it, so a production canonical can be verified before DNS exists.
const VIRTUAL_HOST = (process.env.AUDIT_HOST || '').trim();
const PROTOCOL = (process.env.AUDIT_PROTOCOL || 'https').trim();
const HEADERS = VIRTUAL_HOST
  ? { 'user-agent': 'ProductMetaAudit/1.0', host: VIRTUAL_HOST }
  : { 'user-agent': 'ProductMetaAudit/1.0' };
const expectedCanonical = (url) => (VIRTUAL_HOST ? `${PROTOCOL}://${VIRTUAL_HOST}${new URL(url).pathname}` : url);

const indexXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
const children = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes('sitemap-products/'));
const urls = [];
for (const child of children) {
  const xml = await (await fetch(child.replace(/^https?:\/\/[^/]+/, BASE))).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1].replace(/^https?:\/\/[^/]+/, BASE));
}

const rows = [];
let cursor = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const res = await fetch(url, { redirect: 'follow', headers: HEADERS });
      const html = await res.text();
      const head = html.slice(0, html.indexOf('</head>') + 7);
      const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
      const desc = (head.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] || '').trim();
      const canonical = (head.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)?.[1] || '').trim();
      const robots = (head.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i)?.[1] || '').trim();
      const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
      const jsonld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
      const types = new Set();
      let ldBad = 0;
      for (const block of jsonld) {
        try {
          const parsed = JSON.parse(block);
          const walk = (n) => {
            if (!n || typeof n !== 'object') return;
            if (Array.isArray(n)) return n.forEach(walk);
            if (n['@type']) types.add(Array.isArray(n['@type']) ? n['@type'].join('/') : n['@type']);
            if (n['@graph']) walk(n['@graph']);
          };
          walk(parsed);
        } catch { ldBad++; }
      }
      const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
      const noAlt = imgs.filter((t) => !/\balt=/.test(t)).length;
      const lazy = imgs.filter((t) => /loading="lazy"/.test(t)).length;
      const descWords = desc.split(/\s+/).filter(Boolean).length;
      rows.push({
        url, status: res.status, title, titleLen: title.length, desc, descLen: desc.length, descWords,
        canonical: canonical === expectedCanonical(url) ? 'ok' : canonical, robots,
        h1Count: h1.length, h1: h1[0] || '', types: [...types].join(','), ldBad,
        imgs: imgs.length, noAlt, lazy,
      });
    } catch (error) {
      rows.push({ url, status: 0, error: String(error.message) });
    }
  }
}));

const byTitle = new Map();
const byDesc = new Map();
for (const row of rows) {
  if (!row.title) continue;
  byTitle.set(row.title, [...(byTitle.get(row.title) || []), row.url]);
  if (row.desc) byDesc.set(row.desc, [...(byDesc.get(row.desc) || []), row.url]);
}

const dupTitles = [...byTitle.entries()].filter(([, u]) => u.length > 1).sort((a, b) => b[1].length - a[1].length);
const dupDescs = [...byDesc.entries()].filter(([, u]) => u.length > 1).sort((a, b) => b[1].length - a[1].length);

const summary = {
  crawled: rows.length,
  statusNot200: rows.filter((r) => r.status !== 200).length,
  missingTitle: rows.filter((r) => !r.title).length,
  titleTooLong: rows.filter((r) => r.titleLen > 65).length,
  titleTooShort: rows.filter((r) => r.titleLen > 0 && r.titleLen < 25).length,
  duplicateTitleGroups: dupTitles.length,
  duplicateTitleUrls: dupTitles.reduce((n, [, u]) => n + u.length, 0),
  missingDesc: rows.filter((r) => !r.desc).length,
  descTooLong: rows.filter((r) => r.descLen > 165).length,
  descTooShort: rows.filter((r) => r.descLen > 0 && r.descWords < 12).length,
  duplicateDescGroups: dupDescs.length,
  duplicateDescUrls: dupDescs.reduce((n, [, u]) => n + u.length, 0),
  noH1: rows.filter((r) => r.h1Count === 0).length,
  multiH1: rows.filter((r) => r.h1Count > 1).length,
  noProductSchema: rows.filter((r) => !/Product/.test(r.types || '')).length,
  noBreadcrumb: rows.filter((r) => !/BreadcrumbList/.test(r.types || '')).length,
  noReview: rows.filter((r) => !/AggregateRating/.test(r.types || '')).length,
  ldBad: rows.filter((r) => r.ldBad > 0).length,
  imgNoAlt: rows.reduce((n, r) => n + (r.noAlt || 0), 0),
  noindex: rows.filter((r) => /noindex/.test(r.robots || '')).length,
  canonicalNotSelf: rows.filter((r) => r.canonical && r.canonical !== 'ok').length,
};

console.log(JSON.stringify({
  summary,
  duplicateTitles: dupTitles.slice(0, 25).map(([t, u]) => ({ title: t, count: u.length, samples: u.slice(0, 3) })),
  duplicateDescs: dupDescs.slice(0, 25).map(([d, u]) => ({ desc: d.slice(0, 120), count: u.length, samples: u.slice(0, 2) })),
  problems: rows.filter((r) => r.status !== 200 || !r.title || !r.desc || r.h1Count !== 1 || r.descLen > 165 || r.titleLen > 65 || r.ldBad > 0 || /noindex/.test(r.robots || '') || (r.canonical && r.canonical !== 'ok')).slice(0, 300),
}, null, 1));
