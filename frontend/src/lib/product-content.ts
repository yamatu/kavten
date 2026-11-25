import type { Product, ProductFAQ } from '@/types';
import { getProductFacts, productBoxContents, productLeadSentence, shortProductName } from '@/lib/product-facts';

// The catalogue's bulk/auto optimisation fills compatibility, installation,
// maintenance and FAQ fields with the same template text on every product.
// Rendering that boilerplate on 100k+ pages adds no unique content and repeats
// facts that already have their own section, so it is hidden at render time.
// Operator-written text never matches these signatures and is always shown.
const GENERATED_COMPATIBILITY = [
  /must be checked against the original part label/i,
  /confirm compatibility for .+ against your original part label/i,
];
const GENERATED_INSTALLATION = [
  /confirm the exact part number on the original unit/i,
  /according to your machine maintenance procedure after isolating power/i,
];
const GENERATED_MAINTENANCE = [
  /from conductive dust, oil mist,? and unstable (supply )?voltage/i,
  /clean, dry, and properly stored to support reliable industrial operation/i,
];
const GENERATED_FAQ_ANSWERS = [
  ...GENERATED_COMPATIBILITY,
  /buyers usually match it by original part number/i,
  /is used (for|in) CNC (repair|and model engine)/i,
  /is currently in stock and ready for .*shipment\.?$/i,
  /is available to order with .+ lead time\.?$/i,
];

const matchesAny = (text: string | undefined, patterns: RegExp[]) =>
  Boolean(text && patterns.some((pattern) => pattern.test(text)));

function ownText(text: string | undefined, generated: RegExp[]): string | null {
  const value = String(text || '').trim();
  return value && !matchesAny(value, generated) ? value : null;
}

export const customCompatibilityInfo = (product: Product) => ownText(product.compatibility_info, GENERATED_COMPATIBILITY);
export const customInstallationGuide = (product: Product) => ownText(product.installation_guide, GENERATED_INSTALLATION);
export const customMaintenanceTips = (product: Product) => ownText(product.maintenance_tips, GENERATED_MAINTENANCE);

const isGeneratedFaq = (faq: ProductFAQ) => matchesAny(faq.answer, GENERATED_FAQ_ANSWERS);

// Drops template fields before the product is serialized into the page, so the
// hidden boilerplate is not shipped in the hydration payload either.
export function withoutGeneratedContent(product: Product): Product {
  return {
    ...product,
    compatibility_info: customCompatibilityInfo(product) || '',
    installation_guide: customInstallationGuide(product) || '',
    maintenance_tips: customMaintenanceTips(product) || '',
    faqs: product.faqs?.filter((faq) => !isGeneratedFaq(faq)),
  };
}

export interface ProductFaqItem {
  id?: number;
  question: string;
  answer: string;
}

// One FAQ set for both the visible accordion and the FAQPage JSON-LD (Google
// requires them to match). Questions use the product name and only state facts
// the record actually contains.
export function buildProductFaqs(product: Product, options: { categorySlug?: string } = {}): ProductFaqItem[] {
  const custom = (product.faqs || [])
    .filter((faq: ProductFAQ) => faq.is_active && faq.question?.trim() && faq.answer?.trim())
    .filter((faq) => !isGeneratedFaq(faq))
    .map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  if (custom.length > 0) return custom;

  const name = shortProductName(product);
  const facts = Object.fromEntries(getProductFacts(product, options.categorySlug).map((fact) => [fact.key, fact.value]));
  const lead = productLeadSentence(product);
  const box = productBoxContents(product, 6);
  const faqs: ProductFaqItem[] = [];

  if (lead) {
    faqs.push({ question: `What is the ${name}?`, answer: [lead, facts.brand ? `It is made by ${facts.brand}.` : ''].filter(Boolean).join(' ') });
  }
  if (facts.power) {
    faqs.push({ question: `What powers the ${name}?`, answer: `Power source: ${facts.power}.${facts.displacement ? ` Displacement: ${facts.displacement}.` : ''}` });
  }
  if (facts.build || facts.assembly || facts.parts) {
    const parts = [
      facts.build ? `Build: ${facts.build}.` : '',
      facts.parts ? `Number of parts: ${facts.parts}.` : '',
      facts.assembly ? `Typical assembly time: ${facts.assembly}.` : '',
      facts.difficulty ? `Difficulty: ${facts.difficulty}.` : '',
    ].filter(Boolean);
    faqs.push({ question: `Do I need to assemble the ${name}?`, answer: parts.join(' ') });
  }
  if (facts.age) {
    faqs.push({ question: `What age is the ${name} suitable for?`, answer: `The recommended age is ${facts.age}. Younger builders should work with adult supervision.` });
  }
  if (box.length > 0) {
    faqs.push({ question: `What is in the box?`, answer: `${box.join('; ')}.` });
  }
  faqs.push({
    question: `Does Kavten ship the ${name} worldwide?`,
    answer: 'Yes. Kavten ships worldwide with tracking. The shipping cost for your country is shown at checkout.',
  });
  return faqs.slice(0, 6);
}

// Spec rows that repeat a fact the details table already shows (generated
// spec tables copy brand, SKU, warranty, condition, origin, etc.).
const DETAIL_SPEC_KEYS = new Set([
  'sku', 'brand', 'manufacturer', 'warranty', 'condition', 'lead time', 'country of origin', 'origin',
  'component type', 'category', 'certifications', 'part number', 'manufacturer part number',
]);

export function extraSpecRows(
  specs: Record<string, string> | null,
  product: Product,
): Array<[string, string]> {
  if (!specs) return [];
  const known = [product.sku, product.part_number].map((value) => String(value || '').trim().toLowerCase());
  return Object.entries(specs)
    .map(([key, value]) => [key.trim(), String(value ?? '').trim()] as [string, string])
    .filter(([key, value]) => {
      if (!key || !value) return false;
      const normalizedKey = key.toLowerCase();
      if (DETAIL_SPEC_KEYS.has(normalizedKey)) return false;
      if (normalizedKey === 'minimum order quantity' && value === '1') return false;
      // "Model / part number" is only useful when it adds something (series, revision).
      if (normalizedKey.startsWith('model') && known.includes(value.toLowerCase())) return false;
      return true;
    });
}
