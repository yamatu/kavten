# Kavten SEO / GEO audit

Living checklist for search **and** generative-engine (AI answer) visibility.
Re-run the crawler after any metadata change:

```bash
AUDIT_HOST=kavten.com node scripts/audit_seo_live.mjs https://kavten.com 25
```

The script reads every sitemap, samples product pages, and flags titles,
descriptions, thin content and schema gaps. Results land in
`tmp/seo-audit-<host>.json`.

## Crawl surface

| Surface | Route | Notes |
| --- | --- | --- |
| Sitemap index | `/sitemap.xml` | static, categories, news, blog, community, product shards |
| Static pages | `/sitemap-static.xml` | 11 paths, `/community` included |
| Community | `/sitemap-community.xml` | boards + every published thread; 503 + `Retry-After` on backend failure |
| Products | `/sitemap-products/1..n.xml` | 1000 per shard, image extension per URL |
| Robots | `/robots.txt` | private paths disallowed, AI crawlers grouped explicitly |
| AI summary | `/llms.txt` | positioning, brands, category tree, how to read a product page |
| Content signal | response header | `content-signal: search=yes, ai-input=yes, ai-train=yes, use=reference` |

Only `en` is an active public locale. Every `/xx/...` path 301s or 404s by design,
so hreflang emits `en` + `x-default` only.

## Metadata budget

`frontend/src/lib/seo.ts` owns the limits:

- `META_TITLE_MAX = 60` — `withSiteName()` appends ` | Kavten` only while the
  line still fits, otherwise the page's own words win.
- `META_DESCRIPTION_MAX = 156` — `ensureMetaDescription()` trims at sentence,
  then clause, then word boundary and keeps a full stop.

Any page that declares `robots` **replaces** the layout value instead of merging,
so indexable pages must call `buildPublicRobots(locale)` (it carries
`max-image-preview:large`, `max-snippet:-1`, `max-video-preview:-1`). Declaring a
bare `{ index: true, follow: true }` silently drops those directives.

## Fixed in this round

- Home page declared `robots: undefined` for `en`, which suppressed the layout
  defaults — the most important page had no `max-image-preview:large`.
- Eight pages hardcoded `{ index: true, follow: true }`, dropping the same
  directives: blog, news list, news article, FAQ, products (×3), community list,
  community thread, category trees.
- `/community` description was 178 characters; now 151 and still readable.
- `Builders' Workshop` title was 64 characters; now 57.
- `Low Temperature Stirling Engines` title/description cut to 54 / 138.
- Article pages (`news/[slug]`, `[...articlePath]`) used the raw headline as a
  templated title and never clamped editor descriptions.
- Six policy/nav pages had 19–24 character titles (`Contact Us | Kavten`).
  `/contact` now states its own title; the CMS-backed policy pages map short
  stored labels to descriptive result titles while leaving long editor titles
  untouched.
- 404 pages emitted `noindex` **and** `index, follow` (see below).
- IndexNow's default URL list did not include `/community` or
  `/sitemap-community.xml`.

## Open items

1. **404 renders two robots tags.** Next injects `noindex` for the not-found
   render and the `[locale]` layout still emits its `index, follow`. Crawlers
   apply the most restrictive directive, so the page stays out of the index, but
   the markup is untidy. A clean fix means removing `robots` from the locale
   layout and giving every route an explicit value — worth doing only together
   with a full route audit.
2. **Every sitemap and `robots.txt` route declares both `force-dynamic` and
   `revalidate`.** The response therefore carries two `Cache-Control` headers
   (`public, max-age=3600, s-maxage=3600` and `no-store`). Behaviour depends on
   which header a CDN honours. Dropping `revalidate` from those routes is the
   simple fix; it costs one backend query per crawl.
3. **`/about` is ~380 words.** It is the entity page AI engines cite for "who is
   Kavten", so company history, location, team and shipping origin are worth
   adding.
4. **No `aggregateRating` or `review` in Product schema.** Correct while the
   store has no verified reviews; adding product reviews would unlock star
   ratings in results *and* give answer engines a quality signal.
5. **`sameAs` is empty on production-like data.** The schema reads the social
   link settings; when none are configured the node omits `sameAs`. Filling in
   X / Facebook / Instagram / LinkedIn in the admin panel is a data task.
6. **`llms.txt` counts 1,501 products, the sitemaps expose 1,493.** The gap is
   the eight products flagged `seo_noindex`; intentional, but the two numbers
   should be described consistently if the copy ever mentions them.
7. **`llms-full.txt`** (product-and-article bodies in one file) is not built. It
   is the next step if AI crawlers start requesting page-level detail.

## Local-only caveats

`getRequestBaseUrl()` honours the incoming host **only** when it is a loopback
host, so a local run emits `http://127.0.0.1` in canonical tags and sitemaps while
every real deployment uses `SITE_URL` (default `https://kavten.com`). Any audit
taken against a public host therefore reflects production URLs, not the
developer's machine.
