import type { Product } from '@/types';

export type ProductFact = { key: string; label: string; value: string };

function clean(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().replace(/[;。.]+$/, '').trim();
}

function parseSpecs(raw?: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k.trim().toLowerCase(), clean(v)]));
    }
  } catch { /* ignore malformed specs */ }
  return {};
}

function attributeMap(product: Product): Record<string, string> {
  return Object.fromEntries((product.attributes || []).map((a) => [a.attribute_name.trim().toLowerCase(), clean(a.attribute_value)]));
}

function pick(source: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (source[key]) return source[key];
  }
  return '';
}

function inferBuild(product: Product, specs: Record<string, string>): string {
  const form = specs.form;
  if (form) return form;
  const text = `${product.name} ${product.short_description || ''}`.toLowerCase();
  if (/\b(rtr|rtf|ready[- ]to[- ](run|fly))\b/.test(text)) return 'Ready to run';
  if (/\b(diy|kit|assembly|build your own)\b/.test(text)) return 'DIY kit';
  if (/\bassembled\b/.test(text)) return 'Assembled';
  return '';
}

function inferPower(product: Product, specs: Record<string, string>, attrs: Record<string, string>, categorySlug: string): string {
  const explicit = attrs['power source'] || specs.fuel || specs['power supply'];
  if (explicit) return explicit.length > 60 ? `${explicit.slice(0, 57).trimEnd()}...` : explicit;
  if (categorySlug === 'low-temperature-stirling') return 'Hot water or hand heat';
  if (categorySlug.includes('stirling') || categorySlug === 'vacuum-engines') return 'Heat from a burner';
  if (categorySlug === 'steam-engines') return 'Live steam';
  return '';
}

/** Packing list lines published under the "What's in the Box" heading. */
export function productBoxContents(product: Product, limit = 8): string[] {
  const text = String(product.description || '');
  const start = text.search(/What's in the Box\s*\n/i);
  if (start < 0) return [];
  return text
    .slice(start)
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('•'))
    .map((line) => line.replace(/^•\s*/, '').replace(/\s*\*\s*/, ' × ').trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function getProductFacts(product: Product, categorySlug = ''): ProductFact[] {
  const specs = parseSpecs(product.technical_specs);
  const attrs = attributeMap(product);
  const facts: ProductFact[] = [];
  const add = (key: string, label: string, value: string) => {
    if (value) facts.push({ key, label, value });
  };
  add('brand', 'Brand', clean(product.brand));
  add('power', 'Power source', inferPower(product, specs, attrs, categorySlug));
  add('engine', 'Engine type', attrs['engine type'] || specs['engine type'] || specs.cylinder || '');
  add('cylinders', 'Cylinders', attrs.cylinders || '');
  add('displacement', 'Displacement', specs.displacement || attrs.displacement || '');
  add('build', 'Build', inferBuild(product, specs));
  add('difficulty', 'Assembly difficulty', specs['assembly difficulty'] || '');
  add('assembly', 'Assembly time', specs['assembly time'] || '');
  add('parts', 'Number of parts', pick(specs, ['number of parts', 'parts', 'pieces', 'piece count']));
  add('scale', 'Scale', specs.scale || '');
  add('age', 'Recommended age', pick(specs, ['age', 'ages', 'recommended age']));
  add('material', 'Material', specs.material || '');
  add('size', 'Size', pick(specs, ['product dimensions', 'product size', 'size', 'dimensions']));
  add('weight', 'Weight', pick(specs, ['product weight', 'weight', 'net weight']));
  add('options', 'Versions', attrs.options || '');
  return facts;
}

/** Variant prices parsed from the "Versions & Prices" attribute. */
export function productVariantPrices(product: Product): number[] {
  const listing = (product.attributes || []).find((a) => a.attribute_name === 'Versions & Prices')?.attribute_value || '';
  return [...listing.matchAll(/\$([0-9]+(?:\.[0-9]+)?)/g)].map((m) => Number(m[1])).filter((n) => n > 0);
}

/** Product name without trailing marketing segments, for questions and summaries. */
export function shortProductName(product: Product): string {
  const name = clean(product.name);
  const first = name.split(/\s+[-–|]\s+/)[0];
  const candidate = first.length >= 16 ? first : name;
  return candidate.length > 80 ? `${candidate.slice(0, 77).replace(/\s+\S*$/, '')}...` : candidate;
}

/** First complete sentence of the record copy, used as an answer-first summary. */
export function productLeadSentence(product: Product): string {
  const source = clean(product.short_description) || clean(String(product.description || '').split('\n').find((line) => line.trim().length > 40));
  const text = source.replace(/^[.•\s]+/, '').replace(/\.{3}$/, '');
  const sentence = text.match(/^.{40,260}?[.!?](?=\s|$)/)?.[0] || text;
  const trimmed = sentence.length > 260 ? `${sentence.slice(0, 257).replace(/\s+\S*$/, '')}...` : sentence;
  return trimmed && !/[.!?]$/.test(trimmed) ? `${trimmed}.` : trimmed;
}
