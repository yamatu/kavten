#!/usr/bin/env node
/**
 * Differentiates product slugs from the source catalogue (enginediy.com).
 *
 *   597 of 1510 slugs were byte-identical to the competitor URL. The slug is the
 *   one piece of on-page markup that cannot be "rewritten" by prose, so identical
 *   URLs plus identical product names is the clearest footprint left after the
 *   content rewrite.
 *
 * The new slug is built from our own data — category noun, brand, model code,
 * specification signature, then the name's own keywords — so it reads naturally,
 * front-loads the product entity (good for Google and for answer engines that
 * quote URLs) and can never collide with the competitor's URL.
 *
 *   node scripts/differentiate_product_slugs.mjs                 # dry run, samples
 *   node scripts/differentiate_product_slugs.mjs --sql tmp/slugs.sql
 *   node scripts/differentiate_product_slugs.mjs --sql tmp/slugs.sql --apply
 *   node scripts/differentiate_product_slugs.mjs --ids 12,34     # inspect
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

const SLUG_BUDGET = 72; // Google reads URLs fine beyond this, humans do not

// Same-name products that are the old placeholder-priced batch of a live listing
// (e.g. SKU 257 at $5.45 with 0 stock vs SKU 668 at $49.99 in stock). The old
// batch is retired and its URL is redirected to the surviving product so any
// inbound link keeps working. The two Bell Whistle lines that really are five
// different products, and the payment links, are deliberately left alone.
const CONSOLIDATE = new Map([
  [1359, 1349], // CDI Hall Sensor Tachometer
  [1468, 1349],
  [1411, 1218], // 30cm Oil Pipe
  [1243, 1222], // 4mm G4/1 Water-cooled Connector
  [257, 668],   // Aluminium Engine Base Display Stand
  [255, 639],   // Motor Starter Switch Module
  [1389, 1190], // Stark 6 Coils Ring Accelerator
  [1162, 1130], // Starter Kit for NR200 Engine
  [1361, 1362], // TOYAN FS-S100AT Ignition Start Kit
]);

// ---------------------------------------------------------------------------
// MySQL
// ---------------------------------------------------------------------------
function mysqlExec(sql, { raw = false } = {}) {
  const args = ['exec', CONTAINER, 'mysql', `-u${MYSQL_USER}`, `-p${MYSQL_PASSWORD}`, MYSQL_DB, '-N', '-B'];
  if (raw) args.push('--raw');
  args.push('-e', sql);
  return execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
}

function mysqlExecStdin(sql) {
  execFileSync('docker', ['exec', '-i', CONTAINER, 'mysql', `-u${MYSQL_USER}`, `-p${MYSQL_PASSWORD}`, MYSQL_DB], {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
    maxBuffer: 512 * 1024 * 1024,
  });
}

function loadProducts() {
  const cacheFile = path.join(ROOT, 'tmp', 'products.json');
  // --tighten measures the URL that is live right now, so it must never read a
  // cached snapshot taken before an earlier rename run.
  if (fs.existsSync(cacheFile) && !hasFlag('--refresh') && !hasFlag('--tighten')) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  const sql = `
SELECT JSON_ARRAYAGG(JSON_OBJECT(
 'id',p.id,'sku',p.sku,'name',p.name,'slug',p.slug,'brand',p.brand,'model',p.model,
 'cslug',c.slug,'cname',c.name,'technical_specs',p.technical_specs,'price',p.price,
 'stock',p.stock_quantity,'is_active',p.is_active,'weight',p.weight,'seo_noindex',p.seo_noindex))
FROM products p LEFT JOIN categories c ON c.id=p.category_id;`;
  const raw = mysqlExec(sql, { raw: true }).trim();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, raw);
  return JSON.parse(raw);
}

function competitorSlugs() {
  const files = ['tmp/enginediy-sitemap1.xml', 'tmp/enginediy-sitemap2.xml'].map((file) => path.join(ROOT, file));
  const set = new Set();
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const xml = fs.readFileSync(file, 'utf8');
    for (const match of xml.matchAll(/\/products\/([^/?#"<\s]+)/g)) set.add(match[1].trim().toLowerCase());
  }
  return set;
}

// ---------------------------------------------------------------------------
// text helpers
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'with', 'to', 'in', 'on', 'from', 'by', 'at', 'as',
  'is', 'are', 'be', 'our', 'you', 'it', 'its', 'this', 'that', 'these', 'those', 'plus',
  'hot', 'sale', 'new', 'high', 'quality', 'free', 'shipping', 'best', 'premium', 'perfect',
  'gift', 'gifts', 'idea', 'ideas', 'toy', 'toys', 'diy', 'version', 'original', 'pcs', 'set',
  'compatible', 'suitable', 'fits', 'fit', 'style', 'type', 'model', 'models', 'kit', 'kits',
]);

const CATEGORY_NOUN = {
  'model-engines': 'engine-model',
  'more-engine-models': 'engine-model',
  'gas-nitro-engines': 'gas-engine',
  'stirling-engines': 'stirling-engine',
  'single-cylinder-stirling': 'stirling-engine',
  'multi-cylinder-stirling': 'stirling-engine',
  'low-temperature-stirling': 'stirling-engine',
  'vacuum-engines': 'vacuum-engine',
  'steam-engines': 'steam-engine',
  'jet-turbine-engines': 'jet-engine',
  'v8-engines': 'v8-engine',
  'v12-v6-engines': 'v-engine',
  'inline-twin-engines': 'inline-engine',
  'rc-vehicles': 'rc-vehicle',
  'rc-cars-trucks': 'rc-car',
  'rc-helicopters': 'rc-helicopter',
  'rc-airplanes': 'rc-airplane',
  'rc-boats': 'rc-boat',
  'rc-tanks': 'rc-tank',
  'rc-parts': 'rc-part',
  'stirling-vehicles': 'stirling-vehicle',
  'tesla-coils': 'tesla-coil',
  '3d-metal-model-kits': '3d-metal-model',
  'science-stem-kits': 'science-kit',
  'science-experiments': 'science-kit',
  'astronomy-gear': 'astronomy-gear',
  'engine-parts': 'engine-part',
  'stirling-steam-parts': 'engine-part',
  'parts-accessories': 'engine-part',
};

function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/(\d)\s*\uFFFD\s*(\d)/g, '$1 x $2')
    .replace(/\uFFFD/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[×✕]/g, 'x')
    .replace(/[øØ]/g, 'o')
    .replace(/[µμ]/g, 'u')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseSpecs(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      return parsed.reduce((accumulator, entry) => {
        const key = cleanText(entry?.key ?? entry?.name ?? '').toLowerCase();
        const raw = cleanText(entry?.value ?? entry?.val ?? '');
        if (key && raw) accumulator[key] = raw;
        return accumulator;
      }, {});
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).reduce((accumulator, [key, raw]) => {
        const text = cleanText(raw);
        if (key && text) accumulator[String(key).toLowerCase()] = text;
        return accumulator;
      }, {});
    }
  } catch {
    return {};
  }
  return {};
}

function specLookup(specs, keys) {
  for (const key of keys) {
    const value = specs[key];
    if (value && !/^(n\/?a|none|no|unknown|-|as shown.*|as picture.*|see picture)$/i.test(value)) return value;
  }
  return '';
}

/** Tokens that carry the entity: model codes, capacities, scales. */
function specSignature(specs, name) {
  const tokens = [];
  const scale = specLookup(specs, ['scale']) || (cleanText(name).match(/1\s*[/:]\s*\d{1,2}/) || [])[0] || '';
  const displacement = specLookup(specs, ['displacement']) || (cleanText(name).match(/\d+(?:\.\d+)?\s?cc/i) || [])[0] || '';
  const pieces = specLookup(specs, ['piece count', 'number of parts']);
  const material = specLookup(specs, ['material']);
  const materialWord = /stainless/i.test(material) ? 'stainless-steel'
    : /brass/i.test(material) ? 'brass'
      : /alumin/i.test(material) ? 'aluminium'
        : /alloy/i.test(material) ? 'alloy-metal'
          : /carbon/i.test(material) ? 'carbon-fibre'
            : /wood/i.test(material) ? 'wood'
              : /abs/i.test(material) ? 'abs'
                : /plastic/i.test(material) ? 'plastic'
                  : /glass/i.test(material) ? 'glass'
                    : /steel/i.test(material) ? 'steel'
                      : '';
  if (displacement) tokens.push(slugify(displacement).replace(/(\d)(cc)$/, '$1cc'));
  if (scale) tokens.push(slugify(`${scale.replace(/[/:]/g, '-')}-scale`));
  if (pieces) {
    const count = (pieces.match(/\d{2,5}/) || [])[0];
    if (count) tokens.push(`${count}pcs`);
  }
  if (materialWord) tokens.push(materialWord);
  return tokens.filter(Boolean);
}

/**
 * Last-resort differentiators: facts the record really holds that the source
 * catalogue never puts in a URL. Used only when the spec signature alone is not
 * enough to separate a slug from its competitor twin.
 */
function weightToken(weight) {
  const value = Number(weight);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${Math.round(value * 1000)}g`;
}

function ageToken(specs) {
  const raw = cleanText(specs.age || specs['recommended age'] || '');
  const years = (raw.match(/(\d{1,2})\s*(?:\+|\-|years|yrs|y)/i) || [])[1];
  return years ? `age-${years}` : '';
}

function nameTokens(name, brand) {
  const raw = cleanText(name).split(/[\s,;:()\[\]|/&+]+/);
  const brandToken = brand ? slugify(brand) : '';
  const tokens = [];
  for (const word of raw) {
    const token = slugify(word);
    if (!token || token.length < 2) continue;
    if (STOPWORDS.has(token)) continue;
    if (brandToken && token === brandToken) continue;
    if (tokens.includes(token)) continue;
    tokens.push(token);
  }
  return tokens;
}

// A slug that ends on one of these reads like a cut-off sentence.
const DANGLING_TOKENS = new Set([
  'for', 'with', 'and', 'of', 'the', 'a', 'an', 'to', 'in', 'on', 'from', 'by', 'plus', 'x', 'vs',
]);

function cutAtWord(tokens, budget) {
  const kept = [];
  let length = 0;
  for (const token of tokens) {
    const next = kept.length ? length + 1 + token.length : token.length;
    if (next > budget) break;
    kept.push(token);
    length = next;
  }
  // A trailing "v8"/"l4"/"nr-200" is a model code and reads fine; a trailing
  // "ic" or "sh" is a word fragment and does not.
  const isModelCode = (token) => /^[a-z]{1,2}\d+[a-z]?$/.test(token) || /^\d+[a-z]{0,2}$/.test(token) || /^[vl]\d$/.test(token);
  while (kept.length > 1) {
    const tail = kept[kept.length - 1];
    if (DANGLING_TOKENS.has(tail) || (tail.length < 3 && !isModelCode(tail))) kept.pop();
    else break;
  }
  return kept;
}

/**
 * Reads like a product entity rather than a marketing sentence:
 *   {category noun}-{brand}-{name keywords in reading order}-{spec signature}
 * The category prefix and the spec suffix are what make the URL structurally
 * different from the source catalogue, not just a re-ordering of the same words.
 */
function buildSlug(product, competitor) {
  const name = cleanText(product.name);
  const brand = cleanText(product.brand);
  const specs = parseSpecs(product.technical_specs);
  const categoryNoun = CATEGORY_NOUN[product.cslug] || '';
  const brandToken = brand ? slugify(brand) : '';

  const head = categoryNoun.split('-').filter(Boolean);
  if (brandToken) head.push(brandToken);
  const headSet = new Set(head);
  // "stirling-engine-stirling-engine", "3d-metal-model-3d-metal": the category
  // prefix already carries those words.
  const keywords = nameTokens(name, brand).filter((token) => !headSet.has(token));
  const ordered = cutAtWord(keywords, SLUG_BUDGET);
  const assembled = [...head, ...ordered];
  // "assembly-190pcs-190pcs": the name already said it.
  const signature = specSignature(specs, name).filter((token) => !assembled.includes(token));

  const tokens = cutAtWord([...assembled, ...signature], SLUG_BUDGET);
  let slug = tokens.join('-');
  if (!slug) slug = slugify(product.sku);

  // Never ship a URL that is byte-identical to the competitor's.
  if (competitor.has(slug)) {
    const tail = signature[signature.length - 1] || slugify(product.sku).slice(-6);
    slug = [...tokens.slice(0, -1), signature[signature.length - 1] || tail].join('-');
  }
  return slug.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// similarity tightening
// ---------------------------------------------------------------------------
// Slug grammar alone does not stop two catalogues from naming the same product
// with the same words: `3d-metal-model-steampunk-...-lamp` and
// `3d-metal-steampunk-...-lamp-model` are different strings with an identical
// token set. Token-set overlap (Jaccard) is the measure of that, and the only
// thing that lowers it is a token the competitor does not use.
const GENERIC_SLUG_TOKENS = new Set([
  'model', 'models', 'kit', 'kits', 'set', 'sets', 'diy', 'assembly', 'assemble',
  'creative', 'building', 'build', 'own', 'your', 'display', 'style', 'rtf', 'pnp', 'bnf',
]);

function tokenSets(slugs) {
  return [...slugs].map((slug) => new Set(slug.split('-').filter(Boolean)));
}

function maxSimilarity(tokens, competitorTokenSets) {
  if (!tokens.length) return 0;
  const mine = typeof tokens === 'string'
    ? new Set(tokens.split('-').filter(Boolean))
    : tokens instanceof Set ? tokens : new Set(tokens);
  let best = 0;
  for (const theirs of competitorTokenSets) {
    let shared = 0;
    for (const token of mine) if (theirs.has(token)) shared += 1;
    const score = shared / (mine.size + theirs.size - shared);
    if (score > best) best = score;
  }
  return best;
}

/**
 * Rewrites one slug until it stops sharing most of its vocabulary with the
 * closest competitor URL. Every added token is a fact from the record (spec,
 * net weight, recommended age); nothing is invented to game the metric.
 */
function tightenSlug(product, slug, competitorTokenSets, threshold) {
  const specs = parseSpecs(product.technical_specs);
  const tokens = slug.split('-').filter(Boolean);
  const deduped = tokens.filter((token, index) => tokens.indexOf(token) === index);
  // The category noun and the brand are the entity anchor: stripping "model"
  // out of the "3d-metal-model" prefix turns a product URL into a category URL.
  const prefix = (CATEGORY_NOUN[product.cslug] || '').split('-').filter(Boolean);
  const brandToken = product.brand ? slugify(product.brand) : '';
  let anchorLength = 0;
  while (anchorLength < deduped.length
    && (prefix.includes(deduped[anchorLength]) || deduped[anchorLength] === brandToken)) {
    anchorLength += 1;
  }
  const stripped = deduped.length >= 6
    ? deduped.filter((token, index) => index < anchorLength || !GENERIC_SLUG_TOKENS.has(token))
    : deduped;
  const kept = stripped.length >= 4 ? stripped : deduped;
  const baseline = maxSimilarity(slug, competitorTokenSets);

  const signature = specSignature(specs, product.name);
  const withSpec = [...kept, ...signature];
  const weight = weightToken(product.weight);
  const age = ageToken(specs);
  const candidates = [withSpec];
  if (weight) candidates.push([...withSpec, weight]);
  if (age) candidates.push([...(weight ? candidates[1] : withSpec), age]);

  let fallback = { slug, score: baseline };
  for (const candidate of candidates) {
    const trimmed = cutAtWord(candidate.filter((token, index) => candidate.indexOf(token) === index), SLUG_BUDGET);
    const candidateSlug = trimmed.join('-');
    if (!candidateSlug) continue;
    const score = maxSimilarity(candidateSlug, competitorTokenSets);
    if (score < fallback.score) fallback = { slug: candidateSlug, score };
    // Cheapest rewrite that clears the threshold wins: every extra token is
    // one more word a human has to read in the address bar.
    if (score < threshold) {
      fallback = { slug: candidateSlug, score };
      break;
    }
  }
  // A rename costs a redirect and a re-crawl, so only take it when it actually
  // moves the needle, not for a 0.01 wobble.
  if (fallback.score > baseline - 0.03 || fallback.slug === slug) return slug;
  return fallback.slug;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
// --all re-signs every product URL so the catalogue shares one URL grammar
// instead of a renamed 40% and an untouched 60% that still mirrors the source.
// A product counts as done only when its current slug is what the history says
// it should be; a half-applied run therefore resumes instead of double-renaming.
function renameState() {
  try {
    const raw = mysqlExec('SELECT old_slug, new_slug FROM product_slug_history;', { raw: true });
    const done = new Set();
    const retired = new Set();
    for (const line of raw.split(String.fromCharCode(10))) {
      const [oldSlug, newSlug] = line.trim().split(String.fromCharCode(9));
      if (oldSlug) retired.add(oldSlug.toLowerCase());
      if (newSlug) done.add(newSlug.toLowerCase());
    }
    return { done, retired };
  } catch {
    return { done: new Set(), retired: new Set() };
  }
}
const history = hasFlag('--all') || hasFlag('--tighten') ? renameState() : { done: new Set(), retired: new Set() };

const products = loadProducts();
const competitor = competitorSlugs();
const byId = new Map(products.map((product) => [product.id, product]));
const consolidated = hasFlag('--tighten') ? [] : products.filter((product) => CONSOLIDATE.has(product.id));
const TIGHTEN_THRESHOLD = Number(argValue('--threshold') || 0.8);
const tightenTargets = hasFlag('--tighten')
  ? (() => {
    const competitorTokenSets = tokenSets(competitor);
    return products
      .filter((product) => Number(product.is_active) === 1 && !Number(product.seo_noindex))
      .map((product) => ({
        product,
        score: maxSimilarity(String(product.slug || '').toLowerCase(), competitorTokenSets),
      }))
      .filter((entry) => entry.score >= TIGHTEN_THRESHOLD)
      .sort((left, right) => right.score - left.score);
  })()
  : [];
const targets = hasFlag('--tighten') ? tightenTargets.map((entry) => entry.product) : products.filter((product) => {
  if (CONSOLIDATE.has(product.id) || Number(product.is_active) === 0) return false;
  const slug = String(product.slug || '').toLowerCase();
  if (hasFlag('--all')) return !history.done.has(slug);
  return competitor.has(slug);
});

const plan = [];
// Every slug currently in use stays reserved, including the ones being renamed.
// Re-using a retiring URL would collide with the redirect that URL now points
// at, so a chain A -> B -> C never gets built.
const used = new Set([
  ...products.map((product) => String(product.slug || '').toLowerCase()),
  ...history.retired,
]);
const assign = (base, product) => {
  const tokens = base.split('-').filter(Boolean);
  let slug = base;
  if (used.has(slug) || competitor.has(slug)) {
    slug = [...cutAtWord(tokens, SLUG_BUDGET - 8), slugify(product.sku).slice(-6)].join('-');
  }
  let attempt = 2;
  const stem = slug;
  while (used.has(slug)) {
    slug = `${stem}-${attempt}`;
    attempt += 1;
  }
  used.add(slug);
  return slug;
};

const competitorTokenSets = hasFlag('--tighten') ? tokenSets(competitor) : [];
for (const product of [...targets].sort((left, right) => left.id - right.id)) {
  const oldSlug = String(product.slug || '');
  const proposal = hasFlag('--tighten')
    ? tightenSlug(product, oldSlug, competitorTokenSets, TIGHTEN_THRESHOLD)
    : buildSlug(product, competitor);
  // assign() reserves the URL and appends a SKU tail on collision; handing it
  // the slug a product already owns would rename every unreachable product.
  if (proposal === oldSlug) continue;
  const newSlug = assign(proposal, product);
  if (newSlug === oldSlug) continue;
  const reason = hasFlag('--tighten')
    ? 'similarity-tightened'
    : competitor.has(oldSlug.toLowerCase()) ? 'competitor-match' : 'url-normalized';
  plan.push({ product, oldSlug, newSlug, reason });
}

// Retired duplicate batches redirect to the surviving product's new URL.
const redirects = consolidated.map((product) => {
  const keeper = byId.get(CONSOLIDATE.get(product.id)) || product;
  const keeperSlug = plan.find((entry) => entry.product.id === keeper.id)?.newSlug
    || String(keeper.slug || '');
  return { product, oldSlug: String(product.slug || ''), newSlug: keeperSlug, reason: 'consolidated' };
});

const ids = (argValue('--ids') || '').split(',').map((value) => value.trim()).filter(Boolean);
const sample = ids.length
  ? plan.filter((entry) => ids.includes(String(entry.product.id)))
  : plan.filter((_, index) => index % Math.max(1, Math.floor(plan.length / 12)) === 0).slice(0, 12);

console.log(`products: ${products.length}`);
console.log(`competitor slugs: ${competitor.size}`);
console.log(hasFlag('--tighten')
  ? `above similarity ${TIGHTEN_THRESHOLD}: ${tightenTargets.length}`
  : `identical to competitor: ${targets.length}`);
console.log(`retiring duplicate batches: ${consolidated.length}`);
console.log(`new slug length p50/p90/max: ${(() => {
  const lengths = plan.map((entry) => entry.newSlug.length).sort((a, b) => a - b);
  const at = (q) => lengths[Math.min(lengths.length - 1, Math.floor(lengths.length * q))];
  return `${at(0.5)}/${at(0.9)}/${lengths[lengths.length - 1]}`;
})()}`);
console.log(`still identical after rewrite: ${plan.filter((entry) => entry.newSlug === entry.oldSlug).length}`);
if (hasFlag('--tighten')) {
  const after = tokenSets(competitor);
  const scores = plan.map((entry) => maxSimilarity(entry.newSlug, after));
  const histogram = [1, 0.95, 0.9, 0.85, 0.8].map((cut) => `>=${cut}: ${scores.filter((score) => score >= cut).length}`);
  console.log(`similarity after rewrite: ${histogram.join('  ')}`);
}

for (const entry of sample) {
  console.log(`\n#${entry.product.id} [${entry.product.cslug}]`);
  console.log(`  name   ${cleanText(entry.product.name).slice(0, 78)}`);
  console.log(`  was    ${entry.oldSlug}`);
  console.log(`  now    ${entry.newSlug}`);
}

const sqlPath = argValue('--sql');
if (!sqlPath) process.exit(0);

const escape = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const lines = [];
lines.push('CREATE TABLE IF NOT EXISTS product_slug_history (');
lines.push('  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,');
lines.push('  product_id BIGINT UNSIGNED NOT NULL,');
lines.push('  old_slug VARCHAR(255) NOT NULL,');
lines.push('  new_slug VARCHAR(255) NOT NULL,');
lines.push('  reason VARCHAR(40) NOT NULL DEFAULT \'renamed\',');
lines.push('  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),');
lines.push('  UNIQUE KEY uniq_old_slug (old_slug),');
lines.push('  KEY idx_product (product_id, created_at)');
lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
lines.push('');
lines.push('CREATE TABLE IF NOT EXISTS products_slug_backup LIKE products;');
lines.push('INSERT IGNORE INTO products_slug_backup (id, slug) SELECT id, slug FROM products;');
lines.push('');
for (const entry of [...plan, ...redirects]) {
  lines.push(
    `INSERT INTO product_slug_history (product_id, old_slug, new_slug, reason) VALUES (${entry.product.id}, '${escape(entry.oldSlug)}', '${escape(entry.newSlug)}', '${entry.reason}') ` +
    `ON DUPLICATE KEY UPDATE new_slug = VALUES(new_slug), reason = VALUES(reason);`,
  );
}
lines.push('');
for (const entry of plan) {
  lines.push(`UPDATE products SET slug = '${escape(entry.newSlug)}' WHERE id = ${entry.product.id};`);
}
lines.push('');
for (const entry of redirects) {
  lines.push(`UPDATE products SET is_active = 0 WHERE id = ${entry.product.id};`);
}
lines.push('');
// Mirrored into seo_redirects so the admin SEO panel lists the old URLs and any
// middleware-level redirect layer sees them too.
for (const entry of [...plan, ...redirects]) {
  lines.push(
    `INSERT INTO seo_redirects (old_url, new_url, redirect_type, is_active, created_at) ` +
    `SELECT '/products/${escape(entry.oldSlug)}', '/products/${escape(entry.newSlug)}', '301', 1, NOW() FROM DUAL ` +
    `WHERE NOT EXISTS (SELECT 1 FROM seo_redirects WHERE old_url = '/products/${escape(entry.oldSlug)}');`,
  );
}
lines.push('');
// Backfill: a run that was interrupted after writing history but before writing
// redirects would otherwise leave renamed URLs with no 301.
lines.push(
  'INSERT INTO seo_redirects (old_url, new_url, redirect_type, is_active, created_at) ' +
  `SELECT CONCAT('/products/', h.old_slug) COLLATE utf8mb4_unicode_ci, CONCAT('/products/', h.new_slug) COLLATE utf8mb4_unicode_ci, '301', 1, NOW() ` +
  'FROM product_slug_history h WHERE NOT EXISTS (SELECT 1 FROM seo_redirects r ' +
  `WHERE r.old_url = CONCAT('/products/', h.old_slug) COLLATE utf8mb4_unicode_ci);`,
);
lines.push('');
// Collapse short chains: a redirect left over from an earlier interrupted run
// can point at a slug that was itself retired later, producing A -> B -> C.
// Every hop must have exactly one hop, so retarget such rows at the live slug.
lines.push(
  'UPDATE seo_redirects r JOIN product_slug_history h ' +
  "ON CONCAT('/products/', h.old_slug) COLLATE utf8mb4_unicode_ci = r.new_url " +
  "SET r.new_url = CONCAT('/products/', h.new_slug) COLLATE utf8mb4_unicode_ci " +
  "WHERE r.new_url <> CONCAT('/products/', h.new_slug) COLLATE utf8mb4_unicode_ci;",
);
lines.push('');
// A product renamed twice (differentiation run, then a tightening run) leaves
// its first history row pointing at the intermediate slug. Rewrite those rows
// at the newest slug so the audit script, the redirect table and the record all
// agree that the old URL is one hop from the live page. Repeated because a self
// join only resolves one level per pass.
for (let pass = 0; pass < 3; pass += 1) {
  lines.push(
    'UPDATE product_slug_history h2 JOIN product_slug_history h ON h.old_slug = h2.new_slug ' +
    'SET h2.new_slug = h.new_slug WHERE h2.new_slug <> h.new_slug;',
  );
}
lines.push('');
lines.push(`SELECT reason, COUNT(*) AS rows_total FROM product_slug_history GROUP BY reason;`);

const target = path.resolve(ROOT, sqlPath);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${lines.join('\n')}\n`);
console.log(`\nsql written: ${target}`);

if (hasFlag('--apply')) {
  mysqlExecStdin(fs.readFileSync(target, 'utf8'));
  console.log('applied');
}
