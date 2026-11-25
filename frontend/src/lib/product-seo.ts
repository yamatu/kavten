import type { Product } from '@/types';
import { getProductFacts } from '@/lib/product-facts';

const GENERIC_PART_TYPE = 'Model engine product';

/**
 * Template filler that used to be published as a product description. Shipping
 * it as meta/structured-data copy is what makes a page read as auto-generated,
 * so it is detected and replaced with real record content instead.
 */
const PLACEHOLDER_COPY_PATTERNS: RegExp[] = [
  /^professional model engine parts? and components?\.?$/i,
  /^model engine parts? and components?\.?$/i,
  /^detailed description of\b/i,
  /^product description$/i,
  /^lorem ipsum\b/i,
  /^placeholder\b/i,
  /^coming soon\.?$/i,
  /^tbd\.?$/i,
  /^n\/?a\.?$/i,
  /^[-–—.,;:\s]+$/,
];

/** True when the copy is template filler rather than real product information. */
export function isPlaceholderCopy(value?: string): boolean {
  const text = normalizeWhitespace(value);
  if (!text) return true;
  if (text.length < 24) return true;
  return PLACEHOLDER_COPY_PATTERNS.some((pattern) => pattern.test(text));
}

/** First real paragraph of a text block, used as a schema.org description. */
function firstMeaningfulParagraph(value?: string, maxLength = 500): string {
  const text = stripProductMarkup(value);
  if (!text || isPlaceholderCopy(text)) return '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > maxLength) break;
    out = next;
  }
  if (!out) {
    out = text.slice(0, maxLength);
    const boundary = out.lastIndexOf(' ');
    if (boundary > 80) out = out.slice(0, boundary);
  }
  return normalizeWhitespace(out);
}

function normalizeWhitespace(value?: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripProductMarkup(value?: string): string {
  return normalizeWhitespace(String(value || '').replace(/<[^>]*>/g, ' '));
}

export function inferProductTypeLabel(product: Product): string {
  return normalizeWhitespace(product.category?.name) || GENERIC_PART_TYPE;
}

export function buildSemanticProductName(product: Product): string {
  const brand = normalizeWhitespace(product.brand);
  const storedName = normalizeWhitespace(product.name) || normalizeWhitespace(product.sku);
  const hasBrand = Boolean(brand && new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(brand)}(?:[^a-z0-9]|$)`, 'i').test(storedName));
  return [hasBrand ? '' : brand, storedName].filter(Boolean).join(' ');
}

function fitSentence(text: string, maxLength: number): string {
  const value = normalizeWhitespace(text).replace(/\.{3}$/, '').replace(/^[.•\s]+/, '');
  if (value.length <= maxLength) return value;
  const sentences = value.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > maxLength) break;
    out = next;
  }
  if (out.length >= 70) return out;
  const cut = value.slice(0, maxLength - 1);
  const boundary = cut.lastIndexOf(' ');
  return `${cut.slice(0, boundary > 60 ? boundary : cut.length).replace(/[,;:\s-]+$/, '')}.`;
}

/**
 * Meta description: the record's own summary first, topped up with key facts
 * when it is too short. No shipping or warranty promises are invented here.
 */
export function buildProductSeoDescription(product: Product, maxLength = 158): string {
  const explicit = stripProductMarkup(product.meta_description);
  const usable = explicit && !isPlaceholderCopy(explicit) && !/\.{3}$/.test(explicit) && !/^\./.test(explicit);
  let text = usable ? fitSentence(explicit, maxLength) : '';
  if (!text) text = fitSentence(firstMeaningfulParagraph(product.short_description || product.description, 400), maxLength);

  if (text.length < 110) {
    const brand = normalizeWhitespace(product.brand);
    const facts = Object.fromEntries(getProductFacts(product, product.category?.slug).map((fact) => [fact.key, fact.value]));
    const buildFact = [facts.build, facts.parts ? `${facts.parts} parts` : ''].filter(Boolean).join(', ');
    const extras = [
      brand && !new RegExp(escapeRegExp(brand), 'i').test(text) ? `By ${brand}.` : '',
      buildFact ? `${buildFact}.` : '',
      facts.power ? `Power: ${facts.power}.` : '',
      product.category?.name ? `${product.category.name} at Kavten.` : 'At Kavten.',
      'Ships worldwide.',
    ].filter(Boolean);
    for (const extra of extras) {
      const next = `${text.replace(/[^.!?]$/, '$&.')} ${extra}`.trim();
      if (next.length > maxLength) break;
      text = next;
    }
  }
  return text || fitSentence(`${buildSemanticProductName(product)} at Kavten. Ships worldwide.`, maxLength);
}

/**
 * Description used inside schema.org Product markup. The richer record copy is
 * preferred over the meta description because search and AI answer engines
 * both consume this field.
 */
export function buildProductSchemaDescription(product: Product, maxLength = 500): string {
  const fromDescription = firstMeaningfulParagraph(product.description, maxLength);
  if (fromDescription.length >= 120) return fromDescription;
  const fromShort = firstMeaningfulParagraph(product.short_description, maxLength);
  if (fromShort.length >= 80) return fromShort;
  return fromDescription || fromShort || buildProductSeoDescription(product, maxLength);
}

export function buildProductSeoKeywords(product: Product): string {
  const brand = normalizeWhitespace(product.brand);
  const type = inferProductTypeLabel(product);
  const candidates = [
    normalizeWhitespace(product.name).split(/\s+[-–|]\s+/)[0],
    [brand, type].filter(Boolean).join(' '),
    type,
    'Kavten',
  ];
  return [...new Set(candidates.map(normalizeWhitespace).filter(Boolean))].join(', ');
}
