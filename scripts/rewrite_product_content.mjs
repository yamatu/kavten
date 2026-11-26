#!/usr/bin/env node
/**
 * Rewrites every catalogue product's copy so the storefront publishes original
 * text instead of the competitor description it was imported with.
 *
 * Why: the catalogue was scraped from a competitor (identical slugs for ~40% of
 * the SKUs, identical body copy, promo blurbs and price ladders included).
 * Republishing that text is duplicate content and an association risk, so
 * `description`, `short_description`, `meta_title` and `meta_description` are
 * regenerated from each product's own structured facts: name, brand, category,
 * technical_specs and the packing list.
 *
 * Output is deterministic (no randomness), so re-running produces the same copy
 * and the diff stays reviewable.
 *
 *   node scripts/rewrite_product_content.mjs                 # preview 6 products
 *   node scripts/rewrite_product_content.mjs --sample 20
 *   node scripts/rewrite_product_content.mjs --sql tmp/x.sql # write SQL
 *   node scripts/rewrite_product_content.mjs --sql tmp/x.sql --apply
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTAINER = process.env.MYSQL_CONTAINER || 'kavten_mysql';
const MYSQL_USER = process.env.MYSQL_USER || 'kavten';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'change_me_db_password';
const MYSQL_DB = process.env.MYSQL_DATABASE || 'kavten_sales';

const argv = process.argv.slice(2);
const argValue = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};
const hasFlag = (flag) => argv.includes(flag);

const TITLE_BUDGET = 50; // leaves room for " | Kavten" inside a SERP snippet
const DESC_BUDGET = 158;

// ---------------------------------------------------------------------------
// MySQL access
// ---------------------------------------------------------------------------
function mysqlExec(sql, { raw = false } = {}) {
  const args = ['exec', CONTAINER, 'mysql', `-u${MYSQL_USER}`, `-p${MYSQL_PASSWORD}`, MYSQL_DB, '-N', '-B'];
  if (raw) args.push('--raw');
  args.push('-e', sql);
  return execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function mysqlExecStdin(sql) {
  execFileSync('docker', ['exec', '-i', CONTAINER, 'mysql', `-u${MYSQL_USER}`, `-p${MYSQL_PASSWORD}`, MYSQL_DB], {
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

function loadProducts() {
  const cacheFile = path.join(ROOT, 'tmp', 'products.json');
  if (fs.existsSync(cacheFile) && !hasFlag('--refresh')) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  const sql = `
SELECT JSON_ARRAYAGG(JSON_OBJECT(
 'id',p.id,'sku',p.sku,'name',p.name,'slug',p.slug,'brand',p.brand,'model',p.model,
 'category_id',p.category_id,'cname',c.name,'cslug',c.slug,'price',p.price,'stock',p.stock_quantity,
 'short_description',p.short_description,'technical_specs',p.technical_specs,
 'description',p.description,'meta_title',p.meta_title,'meta_description',p.meta_description,
 'weight',p.weight,'image_urls',p.image_urls))
FROM products p LEFT JOIN categories c ON c.id=p.category_id;`;
  const raw = mysqlExec(sql, { raw: true }).trim();
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, raw);
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// text helpers
// ---------------------------------------------------------------------------
function cleanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    // The import turned × and – into U+FFFD.
    .replace(/(\d)\s*\uFFFD\s*(\d)/g, '$1 x $2')
    .replace(/\uFFFD/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function lowerFirst(text) {
  const value = cleanText(text);
  if (!value) return value;
  const first = value.split(' ')[0];
  // Keep acronyms and model codes intact ("MCU", "V8", "TG-6", "IPS").
  if (/^[A-Z0-9][A-Z0-9\-\/&]*$/.test(first)) return value;
  return value[0].toLowerCase() + value.slice(1);
}

/** Normalises generated prose: spacing, sentence case, article agreement. */
function tidy(text) {
  return String(text ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\*+\s*\)?/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\.{2,}/g, '.')
    .replace(/([A-Za-z])\.(?=[A-Z0-9])/g, '$1. ')
    .replace(/([.!?])\s+([a-z])/g, (_match, mark, letter) => `${mark} ${letter.toUpperCase()}`)
    // "a RC model" / "a E-reader" but not "a USB cable".
    .replace(/\b([Aa]) (?=[AEFHILMNORSX][A-Z0-9-])/g, (_match, letter) => (letter === 'A' ? 'An ' : 'an '))
    .replace(/\ba (?=[aeio])/g, 'an ')
    .replace(/\s+/g, ' ')
    .replace(/\b(\w+)( \1\b)+/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function article(noun) {
  return /^[AEFHILMNORSX][A-Z0-9-]/.test(noun) || (/^[aeio]/i.test(noun) && !/^u/i.test(noun)) ? `an ${noun}` : `a ${noun}`;
}

const DANGLING_WORDS = new Set([
  'for', 'with', 'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'from', 'by', '&', '-', '\u2013',
  ',', 'that', 'which', 'plus', 'inc', 'including', '*', 'x', '\u00d7',
]);

function stripTrailingFiller(value) {
  let text = cleanText(value).replace(/[\s,;:&\/\-\u2013\u2014]+$/g, '');
  for (let guard = 0; guard < 8; guard += 1) {
    const words = text.split(' ');
    if (words.length <= 2) break;
    if (!DANGLING_WORDS.has(words[words.length - 1].toLowerCase())) break;
    words.pop();
    text = words.join(' ').replace(/[\s,;:&\/\-\u2013\u2014]+$/g, '');
  }
  return text;
}

function trimToWord(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const boundary = cut.lastIndexOf(' ');
  // A hard cut lands inside a token (".../M3B/S1") which reads like a typo, so
  // prefer a shorter word boundary whenever one exists past the floor.
  if (boundary >= Math.min(12, maxLength)) return stripTrailingFiller(cut.slice(0, boundary));
  return stripTrailingFiller(text.slice(0, maxLength));
}

// Head nouns that end a product name. Keeping one at the end is what stops a
// shortened title from reading like a fragment ("... Metal Model Bionic").
const HEAD_NOUNS = [
  'internal combustion engine model', 'engine model kit', 'model engine kit', 'engine assembly',
  'engine model', 'model kit', 'metal model', 'model car', 'model', 'kit', 'engine', 'controller',
  'clutch', 'assembly', 'silencer', 'radiator', 'carburettor', 'carburetor', 'gearbox', 'generator',
  'turbine', 'coil', 'reader', 'crawler', 'helicopter', 'airplane', 'truck', 'tank', 'boat', 'car',
  'ornament', 'gauge', 'clock', 'lamp', 'fan', 'piston', 'pump', 'starter', 'ignition', 'servo',
  'receiver', 'charger', 'module', 'sensor', 'switch', 'filter', 'pipe', 'stand', 'base', 'cover',
  'frame', 'wheel', 'bearing', 'gasket', 'crankshaft', 'camshaft', 'cylinder', 'valve', 'spring',
  'gear', 'belt', 'pulley', 'flywheel', 'magnet', 'motor', 'set', 'parts', 'toy', 'machine',
  'vehicle', 'plant', 'tool', 'display', 'device',
].sort((left, right) => right.length - left.length);

function splitHeadNoun(name) {
  const text = cleanText(name);
  const lower = text.toLowerCase();
  for (const noun of HEAD_NOUNS) {
    if (lower.endsWith(noun)) {
      const start = text.length - noun.length;
      return { head: text.slice(start), prefix: text.slice(0, start).replace(/[\s,;:&\-\u2013]+$/, '') };
    }
  }
  const words = text.split(' ');
  if (words.length < 3) return { head: text, prefix: '' };
  const head = words.slice(-2).join(' ');
  return { head, prefix: words.slice(0, -2).join(' ') };
}

/** Shorten `name` to `maxLength` while keeping its trailing head noun. */
function shortenKeepingHead(name, maxLength) {
  const text = cleanText(name);
  if (text.length <= maxLength) return text;
  const { head, prefix } = splitHeadNoun(text);
  const room = maxLength - head.length - 1;
  if (room < 10) return trimToWord(text, maxLength);
  const keptPrefix = trimToWord(prefix, room);
  if (!keptPrefix) return trimToWord(head, maxLength);
  const headFirst = `${keptPrefix} ${head}`;
  // "Bell Whistles for Steam Engine M30/M30B" collapses to "Bell Whistles" when
  // the trailing head noun is kept and everything after it is dropped. If that
  // loses most of the budget, the leading words describe the product better.
  if (headFirst.length < maxLength * 0.7) return trimToWord(text, maxLength);
  return headFirst;
}

// The competitor copy repeats the brand inside the fitment clause
// ("ENJOMOR 36cc ... for the ENJOMOR D6 ..."); keep a single mention.
function collapseRepeatedBrand(text, brand) {
  const value = cleanText(text);
  if (!value || !brand) return value;
  const pattern = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  const matches = value.match(pattern);
  if (!matches || matches.length < 2) return value;
  let seen = 0;
  return cleanText(value.replace(pattern, (match) => {
    seen += 1;
    return seen === 1 ? match : '';
  }));
}

function formatMaterialList(value) {
  const text = cleanText(value);
  if (!text) return '';
  const items = text
    .split(/\s*(?:\+|&|\/|,|;|\band\b)\s*/i)
    .map((item) => {
      const text2 = cleanText(item);
      return /^[A-Z0-9+\-\/ ]{2,6}$/.test(text2) ? text2 : text2.toLowerCase();
    })
    .filter((item) => item && !/^(as shown.*|as picture.*|same as picture|see picture)$/i.test(item));
  const unique = [...new Set(items)];
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0];
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
}

// ---------------------------------------------------------------------------
// name parsing
// ---------------------------------------------------------------------------
const KNOWN_BRANDS = [
  'CISON', 'TOYAN', 'ENJOMOR', 'RETROL', 'TECHING', 'SEMTO', 'KACIO', 'YU XIANG', 'HSP', 'SKYMECH',
  'VRX', 'MUSA', 'RUIFEIYA', 'FLISHRC', 'FLYWING', 'HOWIN', 'WOLFBUSH', 'Microcosm', 'HUINA', 'OKMO',
  'Punkbuild', 'Metalio', 'Xteink', 'Capo', 'ROFUN', 'Eachine', 'WLtoys', 'JJRC', 'Gmade',
].sort((left, right) => right.length - left.length);

function stripBrandPrefix(name, brandHint) {
  const candidates = [cleanText(brandHint), ...KNOWN_BRANDS].filter(Boolean);
  for (const brand of candidates) {
    const pattern = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[\\s:,-]*`, 'i');
    if (pattern.test(name)) return { brand, rest: name.replace(pattern, '').trim() };
  }
  return { brand: cleanText(brandHint), rest: name };
}

function splitName(rawName, brandHint) {
  const name = cleanText(rawName);
  const { brand, rest } = stripBrandPrefix(name, brandHint);
  const FITMENT_MARKERS = /^(for|compatible with|fits|suitable for)$/i;
  let subject = rest;
  let fitment = '';
  for (const match of rest.matchAll(/\s+(for|compatible with|fits|suitable for|with)\s+/gi)) {
    const marker = match[1];
    const head = rest.slice(0, match.index).trim();
    const tail = rest.slice(match.index + match[0].length).trim();
    if (FITMENT_MARKERS.test(marker)) {
      subject = head || rest;
      fitment = tail;
      break;
    }
    // "Piston with Piston Ring And Connecting Rod" names one product, so a bare
    // "with" only cuts the name when what precedes it already identifies it.
    if (marker.toLowerCase() === 'with' && head.length >= 20) subject = head;
  }
  return { brand, subject: subject || rest || name, fitment };
}

// ---------------------------------------------------------------------------
// facts
// ---------------------------------------------------------------------------
const GENERIC_SPEC_KEYS = new Set([
  'age', 'ages', 'material', 'packaging', 'packing', 'package weight', 'product weight', 'weight',
  'package dimensions', 'product dimensions', 'color', 'colour', 'brand', 'model', 'item name',
  'package size',
]);

function parseSpecs(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function sanitizeSpecValue(value) {
  return cleanText(value)
    // "brushless motor 1806*1" is a quantity marker, not part of the model name.
    .replace(/\s*\*\s*\d+$/, '')
    .replace(/[;,]+$/, '')
    .replace(/\s*;\s*/g, ', ')
    .replace(/;+/g, ',');
}

function specLookup(specs, keys) {
  for (const key of keys) {
    const found = Object.keys(specs).find((candidate) => candidate.toLowerCase() === key);
    if (found) {
      const value = sanitizeSpecValue(specs[found]);
      if (value && !/^(n\/?a|none|no|-|unknown)$/i.test(value)) return value;
    }
  }
  return '';
}

const FACT_PRIORITY = [
  'displacement', 'scale', 'power', 'motor', 'cylinder', 'cylinders', 'engine', 'fuel', 'bore',
  'stroke', 'runtime', 'battery', 'charging time', 'frequency', 'speed', 'piece count',
  'number of parts', 'screen type', 'power supply', 'vane quantity', 'assembly time', 'form',
];

function sentenceFacts(specs, limit = 3) {
  const facts = [];
  for (const [key, rawValue] of Object.entries(specs)) {
    const lower = key.toLowerCase();
    if (GENERIC_SPEC_KEYS.has(lower)) continue;
    const value = sanitizeSpecValue(rawValue)
      // Imported rows often end with a bare quantity ("... motor 1806 1") that
      // reads as a typo inside a sentence.
      .replace(/\s+\d$/, '')
      .trim();
    if (!value || value.length > 80) continue;
    if (/^(yes|no|n\/a|none)$/i.test(value)) continue;
    facts.push({ key: cleanText(key), value });
  }
  facts.sort((left, right) => {
    const leftIndex = FACT_PRIORITY.findIndex((item) => left.key.toLowerCase().includes(item));
    const rightIndex = FACT_PRIORITY.findIndex((item) => right.key.toLowerCase().includes(item));
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });
  return facts.slice(0, limit);
}

const MATERIAL_TAIL = {
  part: ' construction carries the load-bearing parts.',
  engine: ' construction is used for the block, housings and mounts.',
  kit: ' plates and fittings make up the assembly.',
  rc: ' shell and chassis parts take the knocks.',
  air: ' airframe keeps the flying weight down.',
  gadget: ' housing and frame hold the moving parts.',
};

const FAMILY_BY_CATEGORY = {
  'engine-parts': 'part',
  'stirling-steam-parts': 'part',
  'rc-parts': 'part',
  'parts-accessories': 'part',
  'v8-engines': 'engine',
  'v12-v6-engines': 'engine',
  'inline-twin-engines': 'engine',
  'gas-nitro-engines': 'engine',
  'jet-turbine-engines': 'engine',
  'more-engine-models': 'engine',
  'model-engines': 'engine',
  'single-cylinder-stirling': 'engine',
  'multi-cylinder-stirling': 'engine',
  'low-temperature-stirling': 'engine',
  'vacuum-engines': 'engine',
  'steam-engines': 'engine',
  'stirling-engines': 'engine',
  'stirling-vehicles': 'engine',
  '3d-metal-model-kits': 'kit',
  'science-stem-kits': 'kit',
  'rc-cars-trucks': 'rc',
  'rc-helicopters': 'air',
  'rc-airplanes': 'air',
  'rc-tanks': 'rc',
  'rc-boats': 'rc',
  'rc-vehicles': 'rc',
  'science-experiments': 'gadget',
  'tesla-coils': 'gadget',
  'astronomy-gear': 'gadget',
};

const TYPE_NOUN = {
  part: 'engine part',
  engine: 'model engine',
  kit: 'model kit',
  rc: 'RC model',
  air: 'RC aircraft',
  gadget: 'tabletop model',
};

// ---------------------------------------------------------------------------
// generated copy
// ---------------------------------------------------------------------------
// Each template only restates a fact that exists in the record, so the output
// cannot invent a specification.
const OPENERS = {
  part: [
    (c) => `${c.brandPrefix}${c.subject} is the ${c.typeNoun} we stock for ${c.fitmentRef}. It is ordered on its own, so one worn or missing component can be replaced without buying a full kit.`,
    (c) => `Built as a direct ${c.typeNoun} for ${c.fitmentRef}, the ${c.subject} arrives boxed and ready to fit.`,
    (c) => `The ${c.subject} belongs to the ${c.catalogType} range${c.brandFor} and is sold as a standalone spare rather than part of a kit.`,
    (c) => `This ${c.subject} is the replacement ${c.typeNoun} for ${c.fitmentRef}, kept in stock for rebuilds, servicing and second builds.`,
    (c) => `Order the ${c.subject} when only this one component of ${c.fitmentRef} needs replacing.`,
    (c) => `A single ${c.subject} for ${c.fitmentRef}, supplied as a complete unit instead of a partial assembly.`,
    (c) => `${c.brandPrefix}${c.subject} is a spare-part item for ${c.fitmentRef}. It is a direct swap for the original, not a modification.`,
    (c) => `The ${c.subject}${c.brandFor} is the part that usually wears first on ${c.fitmentRef}.`,
    (c) => `Designed to sit in ${c.fitmentRef} without modification, the ${c.subject} is sold as one complete ${c.typeNoun}.`,
    (c) => `${c.brandPrefix}${c.subject} is a factory-style replacement for ${c.fitmentRef}, which is what makes it a simple swap instead of a fabrication job.`,
  ],
  engine: [
    (c) => `The ${c.subject}${c.brandFor} is a ${c.typeNoun} that runs as a working machine rather than sitting on a shelf as a static display.`,
    (c) => `${c.brandPrefix}${c.subject} is a running ${c.typeNoun}${c.displacementSentence}`,
    (c) => `Built to be started, tuned and run, the ${c.subject}${c.brandFor} is a miniature ${c.powerKind} engine.`,
    (c) => `This ${c.subject} is a ${c.typeNoun} for builders who want an engine cycle they can watch and adjust.`,
    (c) => `${c.brandPrefix}${c.subject} is a complete ${c.typeNoun}, supplied ready for its first start.${c.scaleSentence}`,
    (c) => `A tabletop ${c.typeNoun}, the ${c.subject} puts a real ${c.powerKind} engine cycle within reach of a workbench.`,
    (c) => `${c.brandPrefix}${c.subject} is a miniature ${c.powerKind} engine that behaves like the full-size article: same sequence, same maintenance, smaller hands required.`,
    (c) => `The ${c.subject} is a working ${c.typeNoun} built around a ${c.powerKind} cycle${c.displacementSentence}`,
    (c) => `Small, loud and genuinely operational, the ${c.subject}${c.brandFor} is a ${c.typeNoun} for people who like engines that do something.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} that can be run, adjusted and exhibited rather than simply displayed.`,
  ],
  kit: [
    (c) => `The ${c.subject}${c.brandFor} is a ${c.typeNoun} built from pre-cut parts, with every plate and fastener supplied in the box.`,
    (c) => `${c.brandPrefix}${c.subject} is a hands-on ${c.typeNoun}: the parts arrive flat-packed and the finished piece is assembled by hand.`,
    (c) => `Part puzzle and part display piece, the ${c.subject}${c.brandFor} is a ${c.typeNoun} that gets put together instead of unpacked.`,
    (c) => `This ${c.subject} is a ${c.typeNoun} for builders who enjoy the assembly as much as the finished model.`,
    (c) => `${c.brandPrefix}${c.subject} ships as a ${c.typeNoun} kit with the hardware and printed instructions inside.`,
    (c) => `A ${c.typeNoun} assembled from sheet and machined parts, the ${c.subject} ends up as a display model with moving details.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} that spends its first few hours as a pile of numbered plates and its life afterwards on a shelf.`,
    (c) => `The ${c.subject} is a ${c.typeNoun} where the building is the point: bend, fold, fasten, then watch the mechanism move.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} with mechanical linkages that still work once the last screw is tight.`,
    (c) => `Meant for a slow evening rather than a quick unboxing, the ${c.subject} is a ${c.typeNoun} that rewards patience.`,
  ],
  rc: [
    (c) => `The ${c.subject}${c.brandFor} is a ready-to-run ${c.typeNoun}.${c.scaleSentence}`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} built for outdoor running.${c.scaleSentence}`,
    (c) => `This ${c.subject} is an RC ${c.typeNoun.replace('RC ', '')} with proportional control and a hobby-grade drivetrain.${c.scaleSentence}`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} that arrives assembled, charged and ready for its first run.${c.scaleSentence}`,
    (c) => `A ${c.typeNoun} for drivers who want scale detail and real suspension travel, the ${c.subject} runs on standard hobby radio gear.${c.scaleSentence}`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} sized for backyard and trail use rather than a gym floor.${c.scaleSentence}`,
    (c) => `The ${c.subject} is a ${c.typeNoun} with a metal-heavy chassis and serviceable running gear.${c.scaleSentence}`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} sold as a complete package, with the radio and electronics already installed.`,
    (c) => `Built to be driven rather than admired, the ${c.subject}${c.brandFor} is a ${c.typeNoun} with the usual wear items available separately.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} that takes the knocks of loose gravel and still tracks straight afterwards.`,
  ],
  gadget: [
    (c) => `The ${c.subject}${c.brandFor} is a ${c.typeNoun} that doubles as a desk object.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} meant to be used, handled and left out on display.`,
    (c) => `Part demonstration piece and part ornament, the ${c.subject}${c.brandFor} is a ${c.typeNoun} for a desk, shelf or workshop bench.`,
    (c) => `This ${c.subject} is a ${c.typeNoun} with a mechanical or electrical idea behind it that you can watch working.`,
    (c) => `${c.brandPrefix}${c.subject} is a compact ${c.typeNoun} that runs off a standard supply and needs no permanent installation.`,
    (c) => `The ${c.subject} is a ${c.typeNoun} that makes a small amount of physics visible on a tabletop.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} as much at home on a bookshelf as on a workbench.`,
    (c) => `Quiet enough for an office and unusual enough to start a conversation, the ${c.subject} is a ${c.typeNoun} for people who like mechanical things.`,
    (c) => `The ${c.subject} is a ${c.typeNoun} finished to display standard rather than as a bare demonstration rig.`,
    (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} that runs on its own once it is set up, with no software to install.`,
  ],
};

OPENERS.air = [
  (c) => `The ${c.subject}${c.brandFor} is a ready-to-fly ${c.typeNoun}.${c.scaleSentence}`,
  (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} that arrives assembled and bound to its transmitter.${c.scaleSentence}`,
  (c) => `This ${c.subject} is a ${c.typeNoun} with a brushless power train and a stabilised flight mode.${c.scaleSentence}`,
  (c) => `${c.brandPrefix}${c.subject} is a ${c.typeNoun} for pilots who want something that fits in a car boot.${c.scaleSentence}`,
  (c) => `A ${c.typeNoun} with a moulded airframe, the ${c.subject}${c.brandFor} is built to be flown rather than hung up.${c.scaleSentence}`,
  (c) => `The ${c.subject} is a ${c.typeNoun} supplied complete with its radio gear and flight battery.${c.scaleSentence}`,
];

const BUILD_LINES = [
  (c) => c.materialSentence,
  (c) => c.weightSentence,
  (c) => c.assemblySentence,
  (c) => c.partsSentence,
  (c) => c.powerSentence,
  (c) => c.runtimeSentence,
];

// A second paragraph sentence. It is family-specific rather than product-specific,
// so it never contradicts the record; the surrounding sentences carry the facts.
const APPLICATIONS = {
  part: [
    (c) => `Most owners buy it after a rebuild rather than as an upgrade.`,
    (c) => `It is the sensible spare to keep if you run ${c.fitmentRef} regularly.`,
    (c) => `Fitment follows the original part, so no machining is involved.`,
    (c) => `Typical reasons to order: a cracked original, a lost component, or a second engine built from parts.`,
  ],
  engine: [
    (c) => `It suits bench running, classroom demonstrations and shelf duty in roughly equal measure.`,
    (c) => `Owners usually run it briefly, adjust, then run it again until the mixture settles.`,
    (c) => `It is as much a demonstration piece as a power source.`,
    (c) => `Expect to spend the first session learning its starting ritual.`,
  ],
  kit: [
    (c) => `Most builds happen over a few evenings, and the finished model is the reward.`,
    (c) => `It is bought as often for the assembly process as for the object at the end.`,
    (c) => `The parts are numbered, so progress is easy to pick up and put down.`,
    (c) => `No prior model-making experience is assumed.`,
  ],
  rc: [
    (c) => `It is happiest on gravel, short grass and packed dirt.`,
    (c) => `Owners usually start on the lowest rate setting and work up.`,
    (c) => `Consumables and spares are shared with the rest of the range, which keeps running costs down.`,
    (c) => `It is a hobby-grade model rather than a toy-grade one, and it handles like it.`,
  ],
  gadget: [
    (c) => `It works as a desktop talking point and as a demonstration aid.`,
    (c) => `Set-up takes minutes, and there is nothing to maintain beyond the occasional dusting.`,
    (c) => `It is small enough to live on a desk without taking over the desk.`,
    (c) => `Owners tend to keep it running in the background rather than packed away.`,
  ],
};

const CLOSERS = {
  part: [
    (c) => `Check the specification table before ordering: bore, stroke and mounting points change between production runs.`,
    (c) => `It suits ${c.ownersRef} doing a rebuild, topping up a spares box or building a second unit.`,
    (c) => `Keep the original fasteners when you swap it in; the unit is supplied without them unless the box list says otherwise.`,
    (c) => `For ${c.ownersRef} this is usually the cheapest way to solve a single failed component.`,
    (c) => `Fit it dry first, then tighten in stages so the mating faces seat evenly.`,
  ],
  engine: [
    (c) => `Running-in matters more than break-in oil: keep the first few tanks light and let the engine cool between runs.`,
    (c) => `It is a working engine, so expect to adjust carburetion and ignition timing as it beds in.`,
    (c) => `Fuel, burners and starting gear are listed in the specification table whenever they are not included.`,
    (c) => `Treat it as a miniature of the real thing: the same maintenance rhythm, the same attention to mixture and cooling.`,
    (c) => `Run it on a proper stand for the first hour and check every fastener afterwards.`,
  ],
  kit: [
    (c) => `Separate the plates by number before starting; that one step is what keeps a long build from stalling.`,
    (c) => `The metal kits need no glue or paint, only patience and a flat surface.`,
    (c) => `Finished dimensions are listed in the specification table if you are planning shelf space.`,
    (c) => `It makes a good gift for a builder who prefers the process to the result.`,
    (c) => `Keep the numbered sprues until the build is finished; a single misplaced plate is hard to replace.`,
  ],
  rc: [
    (c) => `Spare drivetrain parts for this chassis are listed under RC parts if something breaks on the first run.`,
    (c) => `Check the battery connector in the specification table before ordering packs for it.`,
    (c) => `Run it on open ground: the steering geometry is set up for loose surfaces rather than carpet.`,
    (c) => `Body clips, spare tyres and shock oil are the usual consumables on this class of model.`,
    (c) => `Do a bolt check after the first pack; factory threadlock does not survive a hard landing.`,
  ],
  gadget: [
    (c) => `It is a display piece first, so expect a little care to be needed around the moving parts.`,
    (c) => `Power requirements are listed in the specification table; nothing exotic is needed.`,
    (c) => `It ships boxed, so it also works as a gift without extra packaging.`,
    (c) => `Keep it away from direct sunlight if the finish matters to you.`,
    (c) => `Nothing needs calibrating out of the box; plug it in and it does its thing.`,
  ],
};

APPLICATIONS.air = [
  (c) => `It wants open space rather than a back garden: wind is the limiting factor more than power.`,
  (c) => `Most owners fly it in calm conditions and learn the stabilised mode before switching to manual rates.`,
  (c) => `It is a hobby-grade model, so battery care matters more than anything else for its lifespan.`,
  (c) => `Spare propellers are the usual first purchase after a hard arrival.`,
];

CLOSERS.air = [
  (c) => `Check the battery connector and the transmitter protocol in the specification table before ordering spares.`,
  (c) => `Spare propellers, landing gear and batteries for this airframe are listed under RC parts.`,
  (c) => `Fly it over grass for the first flights; the airframe tolerates a soft arrival far better than pavement.`,
  (c) => `Balance the propeller before the first flight if the model arrived with it removed for shipping.`,
  (c) => `Keep the transmitter on the ground and the model in sight while binding.`,
];

const SAFETY_NOTES = {
  engine: 'Safety: this is a working engine with fuel and heat. Run it in a ventilated area, keep the exhaust clear and never leave it running unattended.',
  rc: 'Safety: charge battery packs on a fire-resistant surface, and keep the model away from traffic, water and bystanders during its first runs.',
  air: 'Safety: charge the flight battery on a fire-resistant surface, fly well clear of people, roads and airports, and keep the model in sight at all times.',
  kit: 'Note: small parts and sharp metal edges, so keep the build away from young children.',
  part: 'Note: fitment is model-specific, so check the part number against your own model before ordering.',
  gadget: 'Note: sold as a display or demonstration item rather than a toy.',
};

function buildContext(product) {
  const name = cleanText(product.name);
  const specs = parseSpecs(product.technical_specs);
  const { brand, subject, fitment } = splitName(name, product.brand);
  const categoryFamily = FAMILY_BY_CATEGORY[product.cslug] || 'kit';
  // A "Metal Base" filed under gas engines is a spare, not an engine; the
  // catalogue categories alone would describe it as a complete model.
  const subjectText = String(subject || name);
  const accessoryWord = (subjectText.match(/\b(starting motor|starter motor|base|stand|mount|bracket|holder|pipe|silencer|muffler|screw|bolt|nut|tool|wrench|screwdriver|charger|cable|wire|connector|plug|gasket|bearing|filter|lubricant|oil|clip|belt|pulley|servo|receiver|battery|switch|sensor|gauge|valve|radiator|piston|crankshaft|camshaft|module|controller|ignition|starter|magneto|magnet|adapter|extension|flange|washer|spring|governor|decelerator|reducer|regulator)\b/i) || [])[0] || '';
  // "Opposed Piston Engine Model" is an engine, "Metal Base" is not: a component
  // word only decides the family when nothing else marks the record as a whole model.
  const describesWholeModel = /\b(engine|motor|turbine|stirling|generator|glider|aircraft|airplane|helicopter|drone|kit|model|car|truck|tank|boat|crawler|excavator|robot|locomotive|coil|machine|train)\b/i.test(subjectText);
  const isStarterMotor = /\b(starting motor|starter motor)\b/i.test(subjectText);
  const looksLikeAccessory = Boolean(accessoryWord) && (isStarterMotor || !describesWholeModel);
  const family = looksLikeAccessory && categoryFamily !== 'part' ? 'part' : categoryFamily;
  const typeNoun = TYPE_NOUN[family];

  const scale = specLookup(specs, ['scale']) || (name.match(/\b1\s*[/:]\s*\d{1,2}\b/) || [])[0] || '';
  const nameDisplacement = (name.match(/\b\d+(?:\.\d+)?\s?cc\b/i) || [])[0] || '';
  const isEngineish = /\b(engine|motor|turbine|stirling|coil|generator)\b/i.test(name);
  const displacement = isEngineish ? specLookup(specs, ['displacement']) || nameDisplacement : '';
  const material = specLookup(specs, ['material']);
  const rawColor = specLookup(specs, ['color', 'colour']);
  const weight = specLookup(specs, ['product weight', 'weight']).replace(/(\d)\s*([Gg])$/, '$1 g');
  const parts = specLookup(specs, ['piece count', 'number of parts']);
  const assembly = specLookup(specs, ['assembly time']);
  const runtime = specLookup(specs, ['runtime', 'running time']);
  const power = specLookup(specs, ['power supply', 'battery', 'power', 'charger']);
  const age = specLookup(specs, ['age', 'ages']);
  const model = specLookup(specs, ['model']) || cleanText(product.model);
  const facts = sentenceFacts(specs, 3);

  const cleanSubject = shortenKeepingHead(
    cleanText(subject || name).replace(TITLE_FILLER, ' ').replace(/\s*[-\u2013]\s*\d+\s*pcs?\b/i, ' '),
    62,
  );
  const cleanFitment = collapseRepeatedBrand(fitment, brand);
  const materialList = formatMaterialList(material);
  const color = /^(as shown.*|as picture.*|as the picture|multi|mixed|n\/a|same as picture|see picture)$/i.test(rawColor) ? '' : rawColor;

  return {
    family,
    typeNoun,
    name,
    brand: cleanText(brand),
    subject: cleanSubject,
    fitment: cleanFitment,
    // Phrase fragments so a product without a recorded fitment still reads as
    // English: "for the LS-52 V8 Engine Model" vs "for this model".
    fitmentRef: cleanFitment ? `the ${cleanFitment}` : 'this model',
    ownersRef: cleanFitment ? `the ${cleanFitment} owners` : 'owners of this model',
    fitmentOrRange: cleanFitment || `this ${typeNoun}`,
    catalogType: (cleanText(product.cname) || typeNoun).toLowerCase(),
    brandPrefix: brand ? `${brand} ` : '',
    brandFor: brand ? ` from ${brand}` : '',
    model,
    facts,
    partsCount: parts,
    scaleSentence: scale ? ` It is built to ${scale.replace(':', '/')} scale.` : '',
    displacementSentence: displacement ? `, with ${displacement} of displacement under the cooling fins.` : '.',
    powerKind: /stirling/i.test(name) ? 'Stirling' : /steam/i.test(name) ? 'steam' : /nitro/i.test(name) ? 'nitro' : /gas|gasoline|petrol/i.test(name) ? 'gasoline' : /electric/i.test(name) ? 'electric' : 'model',
    // "construction carries the load-bearing parts" only makes sense for a
    // spare part; a kit has plates, a flying model has an airframe.
    materialSentence: materialList
      ? ` ${color ? `${color} ` : ''}${materialList}${MATERIAL_TAIL[family] || MATERIAL_TAIL.part}`
      : color ? ` It ships in ${color}.` : '',
    weightSentence: weight ? ` The unit itself weighs about ${weight}.` : '',
    assemblySentence: assembly
      ? ` Assembly is quoted at ${cleanText(assembly).toLowerCase().replace(/^(approximately|approx\.?|about|around|within)\s*/i, '')}.`
      : '',
    partsSentence: parts ? ` The kit contains ${cleanText(parts).replace(/\+?\s*(pcs|pieces)$/i, ' parts')}.` : '',
    powerSentence: power ? ` Power comes from ${lowerFirst(cleanText(power))}.` : '',
    runtimeSentence: runtime ? ` A full charge runs for ${cleanText(runtime).replace(/^(approx\.?|about)\s*/i, '')}.` : '',
    ageSentence: age ? ` Recommended for ages ${age.replace(/\+$/, ' and up')}.` : '',
  };
}

function buildBoxLine(description) {
  const text = String(description || '').replace(/\r\n/g, '\n');
  const match = text.match(/what'?s in the box[^\n]*\n([\s\S]*?)(?:\n\s*\n|$)/i);
  if (!match) return '';
  const items = match[1]
    .split('\n')
    .map((line) => cleanText(line.replace(/^[\u2022\u00b7\u25cf\u25aa\u2043*\-\s]+/, '')))
    .map((line) => cleanText(line.replace(/^\d+\s*[*x\u00d7]\s*/i, '').replace(/\.\s*$/, '').replace(/\s*[*x\u00d7]\s*\d+\s*$/i, '')))
    .map((line) => line.replace(/[*\s]+$/, ''))
    .filter((line) => line
      && line.length <= 70
      && !/^description$/i.test(line)
      && !/\b(packaging|carton)\b/i.test(line)
      && !/\b(gift|graphic|colour|color)\s*box$/i.test(line)
      && !/^(box|carton|bag)$/i.test(line));
  const unique = [...new Set(items)];
  if (unique.length === 0) return '';
  const listed = unique.length === 1 ? unique[0] : `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
  return `In the box: ${listed}.`;
}

const TITLE_FILLER = /\b(?:DIY|that Works|Model Kit that Works|New|Hot Sale|High Quality|Free Shipping)\b/gi;

// "Toy | Kavten" and "Piston | Kavten" were being produced by the bare head
// noun candidate; a title that short describes nothing, so anything under this
// comes with a qualifier (model, category or the SKU tail).
const MIN_TITLE = 24;

function dropRepeatedBrand(fitment, brand, subject) {
  const value = cleanText(fitment);
  if (!value) return '';
  let text = value;
  if (brand) {
    const pattern = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b[\\s,]*`, 'gi');
    text = cleanText(text.replace(pattern, ' '));
  }
  const subjectLower = cleanText(subject).toLowerCase();
  // "Oil Filter Element" + fitment "Oil Filter" says nothing twice.
  if (!text || subjectLower.includes(text.toLowerCase())) return '';
  return text;
}

function fitmentTail(fitment, max) {
  const text = stripTrailingFiller(cleanText(fitment));
  if (!text || max < 10) return '';
  if (text.length <= max) return ` for ${text}`;
  const words = trimToWord(text, max).split(' ');
  // A tail that stops on a bare spec ("32cc Inline Four") dangles.
  if (words.length > 2 && /^\d+(?:\.\d+)?\s*(?:cc|mm|cm|in|inch|kv|v|w|mah|kg|g)?$/i.test(words[words.length - 1])) words.pop();
  const candidate = stripTrailingFiller(words.join(' '));
  if (candidate.split(' ').length < 2) return '';
  return ` for ${candidate}`;
}

function buildTitle(ctx, product, used) {
  const brand = ctx.brand;
  const core = cleanText(ctx.subject).replace(TITLE_FILLER, ' ').replace(/\s{2,}/g, ' ').trim() || ctx.subject;
  const prefix = brand ? `${brand} ` : '';
  const head = splitHeadNoun(core).head;
  const subjectBase = prefix + shortenKeepingHead(core, TITLE_BUDGET - prefix.length);
  // Leave room for " for " plus a couple of words; a fitment that would be cut
  // mid-phrase ("for 32cc Inline Four") is worse than no fitment at all.
  // Only a short subject needs the fitment: appending it to an already
  // descriptive name forces a mid-phrase cut ("Metal Base with Water Parts for
  // 32cc Inline Four").
  // The brand already opens the title, so repeating it inside the fitment
  // ("CISON Air Filter ... for CISON LS-52") made the title read as boilerplate
  // and tripped the frontend's repeated-brand guard.
  const fitmentText = dropRepeatedBrand(
    collapseRepeatedBrand(ctx.fitment, brand),
    brand,
    subjectBase,
  );
  const fitTail = subjectBase.length < 28
    ? fitmentTail(fitmentText, TITLE_BUDGET - subjectBase.length - 5)
    : '';
  const skuTail = cleanText(product.sku).slice(-5);

  const withSku = (text) => `${trimToWord(text, TITLE_BUDGET - 7)} ${skuTail}`;
  const withFitment = fitTail ? subjectBase + fitTail : subjectBase;
  const subjectOnly = subjectBase;
  const strong = [
    withFitment,
    // Sibling SKUs share a name, so the reference disambiguates the descriptive
    // subject before the title ever degrades to a bare head noun.
    withFitment ? withSku(withFitment) : '',
    subjectOnly,
    withSku(subjectOnly),
    ctx.model ? `${prefix}${head} ${ctx.model}` : '',
  ].filter(Boolean);

  for (const candidate of strong) {
    const title = stripTrailingFiller(candidate).replace(/\s{2,}/g, ' ').trim();
    if (!title || title.length > TITLE_BUDGET + 4) continue;
    if (title.length < MIN_TITLE && !title.endsWith(skuTail)) continue;
    const key = title.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    return title;
  }

  // Everything specific was already taken by a sibling SKU; a longer head noun
  // still beats a bare one.
  for (const candidate of [prefix + head, `${prefix}${head} ${skuTail}`]) {
    const title = stripTrailingFiller(candidate).replace(/\s{2,}/g, ' ').trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (used.has(key) || title.length < MIN_TITLE) continue;
    used.add(key);
    return title;
  }

  // Last resort: the SKU tail is unique by construction.
  const fallback = `${trimToWord(prefix + head, TITLE_BUDGET - 7)} ${skuTail}`.trim();
  used.add(fallback.toLowerCase());
  return fallback;
}

function buildMetaDescription(ctx, product) {
  const clause = ctx.family === 'part'
    ? `${ctx.subject} for ${ctx.fitmentRef}.`
    : `${ctx.subject}${ctx.brandFor ? ` by ${ctx.brand}` : ''}, ${article(ctx.typeNoun)}.`;
  const optional = [
    ctx.weightSentence.trim(),
    ctx.ageSentence.trim(),
    'Tracked delivery from our own warehouse.',
  ].filter(Boolean);
  let description = tidy(clause);
  // Facts are appended one at a time so a long value never gets chopped mid-word.
  for (const fact of ctx.facts.slice(0, 2)) {
    // "Motor: high-efficiency brushless motor 1806" reads; "motor high-efficiency
    // brushless motor 1806" ran the key straight into the value.
    const key = fact.key.trim();
    const factText = fact.value.toLowerCase().includes(key.toLowerCase()) ? fact.value : `${key}: ${fact.value}`;
    const candidate = tidy(`${description} ${factText}${description.endsWith('.') ? '' : ','}`);
    if (candidate.length <= DESC_BUDGET - 24) description = candidate.replace(/,$/, '.');
  }
  if (!description.endsWith('.')) description = `${description}.`;
  for (const piece of optional) {
    const candidate = tidy(`${description} ${piece}`);
    if (candidate.length <= DESC_BUDGET) description = candidate;
  }
  if (description.length > DESC_BUDGET) description = `${trimToWord(description, DESC_BUDGET - 1)}.`;
  return description;
}

function buildShortDescription(ctx) {
  const materialBit = ctx.materialSentence ? lowerFirst(ctx.materialSentence).replace(/\.$/, '') : '';
  const clause = ctx.family === 'part'
    ? `${ctx.subject} for ${ctx.fitmentRef}${materialBit ? `, ${materialBit}` : ''}.`
    : `${ctx.subject}${ctx.brandFor ? ` by ${ctx.brand}` : ''}: ${article(ctx.typeNoun)}${ctx.displacementSentence.replace(/^,\s*/, ' with ').replace(/\.$/, '')}.`;
  let text = tidy(clause);
  if (text.length > 165) {
    const shorter = tidy(ctx.family === 'part'
      ? `${ctx.subject} for ${ctx.fitmentRef}.`
      : `${ctx.subject}${ctx.brandFor ? ` by ${ctx.brand}` : ''}: ${article(ctx.typeNoun)}.`);
    text = shorter.length < text.length ? shorter : text;
  }
  if (text.length > 165) text = `${trimToWord(text, 162)}.`;
  if (text.length < 60) text = `${text.replace(/\.$/, '')}, a spare we hold in stock for the models it fits.`;
  return text;
}

function buildDescription(ctx, product, seed) {
  const openers = OPENERS[ctx.family] || OPENERS.kit;
  const closers = CLOSERS[ctx.family] || CLOSERS.kit;
  const opener = openers[hash(`${seed}:open`) % openers.length](ctx);

  const buildPool = BUILD_LINES.map((line) => line(ctx)).filter((line) => line && line.trim().length > 0);
  const start = hash(`${seed}:build`) % Math.max(buildPool.length, 1);
  const rotated = buildPool.length > 0 ? [...buildPool.slice(start), ...buildPool.slice(0, start)] : [];
  const detail = rotated.slice(0, 3).join('');

  // A technical row the sentence above did not already use keeps each page
  // specific to its own record.
  const unused = ctx.facts.find((fact) => !`${opener}${detail}`.toLowerCase().includes(fact.value.toLowerCase()));
  const extraLine = unused
    ? ` Its ${unused.key.toLowerCase()} is listed as ${unused.value}.`
    : detail.length < 45 && !opener.toLowerCase().includes(ctx.catalogType)
      ? ` It is catalogued under ${ctx.catalogType} and ships as a single unit.`
      : '';

  const applications = APPLICATIONS[ctx.family] || APPLICATIONS.kit;
  const application = applications[hash(`${seed}:apply`) % applications.length](ctx);

  const contentWords = (text) => new Set(
    text.toLowerCase().match(/[a-z]{5,}/g) || [],
  );
  const applicationWords = contentWords(application);
  let closer = '';
  for (let offset = 0; offset < closers.length; offset += 1) {
    const candidate = closers[(hash(`${seed}:close`) + offset) % closers.length](ctx);
    if (ctx.fitment && candidate.includes(ctx.fitment) && application.includes(ctx.fitment)) continue;
    const shared = [...contentWords(candidate)].filter((word) => applicationWords.has(word));
    if (shared.length >= 2) continue;
    closer = candidate;
    break;
  }
  if (!closer) closer = closers[hash(`${seed}:close`) % closers.length](ctx);
  const box = buildBoxLine(product.description);
  const safety = SAFETY_NOTES[ctx.family];

  return [
    tidy(`${opener}${detail}${extraLine}`),
    tidy(`${application} ${closer}`),
    box ? tidy(box) : '',
    safety,
  ].filter(Boolean).join('\n\n');
}

function buildRow(product, usedTitles) {
  const ctx = buildContext(product);
  const seed = `${product.sku}:${product.id}`;
  const isPriceDifference = /price difference|extra shipping|shipping fee/i.test(product.name);
  // Four listings came in from the competitor import with a unit price under $2
  // and no stock (a $0.15 V8 oil pipe), which mismatches the merchant feed and
  // the on-page price. They stay buyable-on-request but out of the index until
  // someone prices them properly.
  const isBrokenPrice = Number(product.price) < 2 && Number(product.stock) === 0;
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.cslug,
    meta_title: isPriceDifference
      ? 'Price Difference Payment Link'
      : qualifyTitle(buildTitle(ctx, product, usedTitles), ctx, product),
    meta_description: isPriceDifference
      ? `Secure payment link used to settle a price difference on existing Kavten order ${product.sku}. Do not buy it unless our team has asked you to.`
      : buildMetaDescription(ctx, product),
    short_description: isPriceDifference
      ? 'Payment link for an outstanding price difference on an existing order.'
      : buildShortDescription(ctx),
    description: isPriceDifference
      ? 'This is not a product. It is the payment link we send when the final shipping cost on an order differs from the amount already paid.\n\nDo not add it to a cart on your own. Wait for our team to confirm the amount, then use the link in that message so the payment lands on the right order.'
      : buildDescription(ctx, product, seed),
    seo_noindex: isPriceDifference || isBrokenPrice ? 1 : 0,
  };
}

// Safety net for the rare product whose every candidate collided: a title
// under three words ("Piston", "Toy 451ED") tells a searcher nothing.
function dropBrandRepetition(text, brand) {
  const value = cleanText(text);
  if (!value || !brand) return value;
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
  let seen = false;
  // Keep the first mention: "TOYAN 4 Stroke RC Toyan Engine Start Kit" reads as
  // stuffed keywords and trips the frontend guard that replaces the title.
  const collapsed = cleanText(value.replace(pattern, (match) => {
    if (seen) return ' ';
    seen = true;
    return match;
  }));
  return collapsed
    .replace(/[\s,;:&%-]+([\s,;:&%-]|$)/g, '$1')
    .replace(/[\s,;:&%-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function qualifyTitle(title, ctx, product) {
  title = dropBrandRepetition(title, ctx.brand);
  if (title.split(' ').length >= 3 && title.length >= MIN_TITLE) return title;
  const skuTail = cleanText(product.sku).slice(-5);
  const subject = trimToWord(`${ctx.brand ? `${ctx.brand} ` : ''}${ctx.subject}`, TITLE_BUDGET - 8);
  const qualified = `${subject} ${skuTail}`.trim();
  return qualified.length > title.length ? qualified : title;
}

function sqlEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/\u0000/g, '');
}

function toSql(rows) {
  const statements = rows.map((row) => `UPDATE products SET meta_title='${sqlEscape(row.meta_title)}', meta_description='${sqlEscape(row.meta_description)}', short_description='${sqlEscape(row.short_description)}', description='${sqlEscape(row.description)}', seo_noindex=${row.seo_noindex} WHERE id=${row.id};`);
  return ['SET NAMES utf8mb4;', ...statements].join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const products = loadProducts().sort((left, right) => Number(left.id) - Number(right.id));
const usedTitles = new Set();
const rows = products.map((product) => buildRow(product, usedTitles));

// Uniqueness is enforced for titles by construction; descriptions are checked
// and disambiguated with the SKU tail when two records collide exactly.
const seenDescriptions = new Map();
for (const row of rows) {
  const key = row.meta_description.toLowerCase();
  if (seenDescriptions.has(key)) {
    const suffix = ` Reference ${String(row.sku).slice(-5)}.`;
    row.meta_description = `${trimToWord(row.meta_description.replace(/\.$/, ''), DESC_BUDGET - suffix.length)}${suffix}`;
  }
  seenDescriptions.set(row.meta_description.toLowerCase(), row.id);
}

// Two SKUs can carry the same name and specs (duplicate import batches), which
// would leave the rewritten copy identical again; the order reference keeps the
// pages distinguishable and is genuinely useful on a product page.
const seenDescriptionsLong = new Set();
for (const row of rows) {
  const key = row.description;
  if (seenDescriptionsLong.has(key)) {
    row.description = `${row.description}\n\nOrder reference: ${row.sku}.`;
  }
  seenDescriptionsLong.add(key);
}

const titles = rows.map((row) => row.meta_title.toLowerCase());
const descriptions = rows.map((row) => row.meta_description.toLowerCase());
const words = rows.map((row) => row.description.split(/\s+/).filter(Boolean).length).sort((a, b) => a - b);
const percentile = (p) => words[Math.min(words.length - 1, Math.floor(words.length * p))];

console.log(`products: ${rows.length}`);
const titleCounts = new Map();
for (const row of rows) {
  const key = row.meta_title.toLowerCase();
  if (!titleCounts.has(key)) titleCounts.set(key, []);
  titleCounts.get(key).push(row);
}
const duplicateTitleGroups = [...titleCounts.entries()].filter(([, group]) => group.length > 1);
console.log(`duplicate meta_title: ${titles.length - new Set(titles).size}`);
for (const [key, group] of duplicateTitleGroups.slice(0, 5)) {
  console.log(`  "${key}" x${group.length}: ${group.map((row) => row.sku).join(', ')}`);
}
console.log(`duplicate meta_description: ${descriptions.length - new Set(descriptions).size}`);
console.log(`meta_title over ${TITLE_BUDGET}: ${rows.filter((row) => row.meta_title.length > TITLE_BUDGET).length}`);
console.log(`meta_description over ${DESC_BUDGET}: ${rows.filter((row) => row.meta_description.length > DESC_BUDGET).length}`);
console.log(`description words p10/p50/p90: ${percentile(0.1)}/${percentile(0.5)}/${percentile(0.9)}`);
console.log(`double spaces / stray periods: ${rows.filter((row) => / {2,}|\.\.| \./.test(row.description)).length}`);

if (hasFlag('--lint')) {
  const problems = {
    doubleSpace: [],
    doubleArticle: [],
    missingStop: [],
    lowercaseStart: [],
    repeatedSentence: [],
    thin: [],
    longSentence: [],
  };
  for (const row of rows) {
    if (/ {2,}|\s+[.,;]/.test(row.description)) problems.doubleSpace.push(row.id);
    if (/\b(the the|a a|an an|and and|of of|for for)\b/i.test(row.description)) problems.doubleArticle.push(row.id);
    for (const paragraph of row.description.split('\n\n')) {
      for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
        const text = sentence.trim();
        if (!text) continue;
        if (!/[.!?]$/.test(text) && paragraph !== paragraph.split('\n\n').pop() ? false : false) continue;
        if (!/[.!?]$/.test(text) && /^[A-Z]/.test(text) && text.split(' ').length > 4) problems.missingStop.push(`${row.id}: ${text.slice(0, 70)}`);
        if (/^[a-z]/.test(text)) problems.lowercaseStart.push(`${row.id}: ${text.slice(0, 70)}`);
        if (text.split(' ').length > 45) problems.longSentence.push(`${row.id}: ${text.slice(0, 70)}`);
      }
      const sentences = paragraph.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);
      if (new Set(sentences).size !== sentences.length) problems.repeatedSentence.push(row.id);
    }
    if (row.description.split(/\s+/).length < 55) problems.thin.push(row.id);
  }
  for (const [key, list] of Object.entries(problems)) {
    console.log(`${key}: ${list.length}`);
    for (const item of list.slice(0, 6)) console.log(`   ${item}`);
  }
  const openers = new Map();
  for (const row of rows) {
    const first = row.description.split(/(?<=[.!?])\s+/)[0];
    openers.set(first, (openers.get(first) || 0) + 1);
  }
  const worst = [...openers.entries()].sort((left, right) => right[1] - left[1])[0];
  console.log(`most reused opening sentence: x${worst[1]} (${((worst[1] / rows.length) * 100).toFixed(1)}%)`);
}

const sqlPath = argValue('--sql');
if (sqlPath) {
  const target = path.resolve(ROOT, sqlPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, toSql(rows));
  console.log(`sql written: ${target}`);
  if (hasFlag('--apply')) {
    mysqlExecStdin(fs.readFileSync(target, 'utf8'));
    console.log('applied');
  }
} else {
  const ids = (argValue('--ids') || '').split(',').map((value) => value.trim()).filter(Boolean);
  let sample;
  if (ids.length > 0) {
    sample = rows.filter((row) => ids.includes(String(row.id)));
  } else {
    const sampleSize = Number(argValue('--sample') || 6);
    const step = Math.max(1, Math.floor(rows.length / sampleSize));
    sample = [];
    for (let i = 0; i < rows.length && sample.length < sampleSize; i += step) sample.push(rows[i]);
  }
  for (const row of sample) {
    console.log(`\n${'='.repeat(78)}\n#${row.id} ${row.sku}  [${row.category}]`);
    console.log(`TITLE  (${row.meta_title.length}) ${row.meta_title}`);
    console.log(`DESC   (${row.meta_description.length}) ${row.meta_description}`);
    console.log(`SHORT  (${row.short_description.length}) ${row.short_description}`);
    console.log('---');
    console.log(row.description);
  }
}
