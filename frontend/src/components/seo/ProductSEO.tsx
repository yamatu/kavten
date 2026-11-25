'use client';

import { Product, Category, CommercePolicySetting } from '@/types';
import { productPathSegment } from '@/lib/utils';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import {
  buildProductSchemaDescription,
  buildProductSeoDescription,
  buildProductSeoKeywords,
  buildSemanticProductName,
  inferProductTypeLabel,
} from '@/lib/product-seo';
import {
  FALLBACK_COMMERCE_POLICY,
  commercePolicyDestinationCountries,
  isCommercePolicyConfirmed,
} from '@/lib/commerce-policy';
import { getProductFacts, productVariantPrices, shortProductName } from '@/lib/product-facts';
import { buildProductFaqs } from '@/lib/product-content';

const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kavten.com').replace(/\/+$/, '');

const GENERIC_BRAND_LABEL = 'model engine';
const GENERIC_MANUFACTURER_LABEL = 'model engine parts manufacturer';
// Used when the admin commerce policy leaves the destination list open: GMC and
// Google both want an explicit shippingDestination in OfferShippingDetails.
const DEFAULT_MERCHANT_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'];

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

interface ProductSEOProps {
  product: Product;
  category?: Category;
  categoryBreadcrumb?: Category[];
  baseUrl?: string;
  contentLocale?: string;
  /**
   * Admin-editable shipping / warranty / return promise. When omitted the
   * seeded defaults are used so the page never publishes an empty promise.
   */
  commercePolicy?: CommercePolicySetting;
  /** Server-supplied date (YYYY-MM-DD) that anchors a BackOrder validFrom. */
  referenceDate?: string;
}

function resolvePolicy(policy?: CommercePolicySetting): CommercePolicySetting {
  return policy ? { ...FALLBACK_COMMERCE_POLICY, ...policy } : FALLBACK_COMMERCE_POLICY;
}

/** schema.org return fee enum derived from who pays return freight. */
function mapReturnFees(policy: CommercePolicySetting): string {
  // MerchantReturnPolicy.returnFees only accepts FreeReturn or
  // ReturnFeesCustomerResponsibility; ReturnShippingFees is not an enum value
  // and is rejected by Rich Results / Merchant Center.
  return policy.return_shipping_payer === 'merchant'
    ? 'https://schema.org/FreeReturn'
    : 'https://schema.org/ReturnFeesCustomerResponsibility';
}

/**
 * Parse a free-form lead time ("4-5 DAYS", "1 WEEK") into a bounded day count
 * so a BackOrder offer can publish a deterministic validFrom.
 */
function parseLeadTimeDays(raw?: string, fallbackDays = 7): number {
  const text = String(raw || '').trim().toLowerCase();
  if (!text) return fallbackDays;
  const weekMatch = text.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:weeks?|wks?)\b/);
  if (weekMatch) {
    const weeks = Number(weekMatch[2] || weekMatch[1]);
    if (Number.isFinite(weeks) && weeks > 0) return Math.min(Math.max(weeks * 7, 1), 90);
  }
  const dayMatch = text.match(/(\d+)\s*(?:-\s*(\d+))?\s*(?:days?|d)\b/);
  if (dayMatch) {
    const days = Number(dayMatch[2] || dayMatch[1]);
    if (Number.isFinite(days) && days > 0) return Math.min(Math.max(days, 1), 90);
  }
  return fallbackDays;
}

/**
 * An ISO timestamp for when a back-ordered item is expected to ship. The base
 * date is supplied by the server so SSR HTML and hydration stay identical.
 */
function computeBackOrderValidFrom(leadTime?: string, referenceDate?: string): string {
  const days = parseLeadTimeDays(leadTime, 7);
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(referenceDate || '').trim());
  let baseYear: number;
  let baseMonth: number;
  let baseDay: number;
  if (parsed) {
    baseYear = Number(parsed[1]);
    baseMonth = Number(parsed[2]) - 1;
    baseDay = Number(parsed[3]);
  } else {
    const now = new Date();
    baseYear = now.getUTCFullYear();
    baseMonth = now.getUTCMonth();
    baseDay = now.getUTCDate();
  }
  const target = new Date(Date.UTC(baseYear, baseMonth, baseDay + days));
  return `${target.toISOString().slice(0, 10)}T00:00:00Z`;
}

function mapConditionType(condition?: string): string {
  switch (condition) {
    case 'refurbished':
      return 'https://schema.org/RefurbishedCondition';
    case 'used':
      return 'https://schema.org/UsedCondition';
    default:
      return 'https://schema.org/NewCondition';
  }
}

function parseSpecs(raw?: string): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch { /* ignore */ }
  return null;
}

function toAbsoluteUrl(url: string | undefined, baseUrl: string): string {
  const value = String(url || '').trim();
  if (!value) return `${baseUrl}/images/default-product.svg`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

/**
 * The backend renders a public JPEG placeholder with the SKU overlaid. It is
 * preferable to the old default-product.jpg path, which is not deployed and
 * returned 404 to crawlers (making Product image markup invalid).
 */
function getProductImageFallback(product: Product, baseUrl: string): string {
  const sku = normalizeText(product.sku);
  if (!sku) return `${baseUrl}/images/default-product.svg`;
  const safeSku = sku.replace(/[\\/]+/g, '-').replace(/\s+/g, '-');
  return `${baseUrl}/api/v1/public/products/default-image/${encodeURIComponent(safeSku)}?sku=${encodeURIComponent(sku)}`;
}

function normalizeText(value?: string): string {
  return String(value || '').trim();
}

function getBrandName(product: Product): string {
  return normalizeText(product.brand);
}

function getBrandLabel(product: Product): string {
  return getBrandName(product) || GENERIC_BRAND_LABEL;
}

function getManufacturerName(product: Product): string {
  return normalizeText(product.manufacturer) || getBrandName(product) || GENERIC_MANUFACTURER_LABEL;
}

// Answer-first summary built only from facts the record contains.
function buildAnswerFirstSummary(product: Product, facts: Record<string, string>, categoryName: string): string {
  const name = shortProductName(product);
  const parts = [
    `${name}${facts.brand ? ` by ${facts.brand}` : ''} is listed in ${categoryName} at Kavten.`,
    facts.power ? `Power source: ${facts.power}.` : '',
    facts.build ? `Build: ${facts.build}.` : '',
    facts.age ? `Recommended age: ${facts.age}.` : '',
    product.stock_quantity > 0 ? 'In stock.' : 'Currently out of stock.',
  ];
  return parts.filter(Boolean).join(' ');
}

// Customer reviews are user input; escaping '<' keeps a '</script>' in review
// text from terminating the JSON-LD block.
function toJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function ProductSEO({ product, category, categoryBreadcrumb, baseUrl = PUBLIC_SITE_URL, contentLocale, commercePolicy, referenceDate }: ProductSEOProps) {
  const { locale, t, href } = usePublicI18n();
  const policy = resolvePolicy(commercePolicy);
  const productPath = `/products/${productPathSegment(product)}`;
  const productUrl = `${baseUrl}${contentLocale === 'en' && locale !== 'en' ? productPath : href(productPath)}`;
  const productId = `${productUrl}#product`;
  const brandLabel = getBrandLabel(product);
  const manufacturerName = getManufacturerName(product);
  const semanticProduct = category ? { ...product, category } : product;
  const semanticName = buildSemanticProductName(semanticProduct);
  const semanticCategory = inferProductTypeLabel(semanticProduct);
  const categorySlug = category?.slug || product.category?.slug;
  const facts = Object.fromEntries(getProductFacts(product, categorySlug).map((fact) => [fact.key, fact.value]));
  const answerFirstSummary = buildAnswerFirstSummary(product, facts, semanticCategory);
  const description = buildProductSchemaDescription(semanticProduct);
  const metaDescription = buildProductSeoDescription(semanticProduct);
  const policyConfirmed = isCommercePolicyConfirmed(commercePolicy);
  const variantPrices = productVariantPrices(product);
  const lowPrice = variantPrices.length > 1 ? Math.min(...variantPrices) : product.price;
  const highPrice = variantPrices.length > 1 ? Math.max(...variantPrices) : product.price;
  const destinationCountries = commercePolicyDestinationCountries(policy);
  const returnCountry = normalizeText(policy.return_policy_country) || 'US';
  const leadTime = normalizeText(product.lead_time) || policy.default_lead_time;
  const fallbackCountries = destinationCountries.length > 0 ? destinationCountries : DEFAULT_MERCHANT_COUNTRIES;
  const schemaLocale = contentLocale || locale;
  const localeConfig = typeof Intl !== 'undefined'
    ? new Intl.Locale(schemaLocale === 'zh' ? 'zh-CN' : schemaLocale).toString()
    : schemaLocale;

  // Build image array
  const imageSources = product.images?.map(img => typeof img === 'string' ? img : img.url) ||
    product.image_urls ||
    [];
  const imageUrls = (imageSources.length > 0 ? imageSources : [getProductImageFallback(product, baseUrl)])
    .map((url) => toAbsoluteUrl(url, baseUrl));

  // Reviews & aggregate rating
  // Reviews transcribed from other channels without an order are shown on the
  // page but kept out of rich results, which require first-party reviews.
  const approvedReviews = product.reviews?.filter(r => r.is_approved && (r.is_verified || !r.source)) || [];
  const hasReviews = approvedReviews.length > 0;
  const avgRating = hasReviews
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
    : undefined;

  // Technical specs as additionalProperty
  const specs = parseSpecs(product.technical_specs);
  const specProperties = specs
    ? Object.entries(specs).map(([name, value]) => ({
        "@type": "PropertyValue",
        "name": name,
        "value": String(value),
      }))
    : [];
  const attributeProperties = product.attributes?.map((attribute) => ({
    "@type": "PropertyValue",
    "name": attribute.attribute_name,
    "value": String(attribute.attribute_value),
  })) || [];
  const additionalProperties = [...specProperties, ...attributeProperties];
  if (facts.age) {
    additionalProperties.push({ "@type": "PropertyValue", "name": "Recommended age", "value": facts.age });
  }

  // Google flags any Product node lacking offers, review, or aggregateRating as
  // a critical error, and an Offer needs a price above zero. Quote-only records
  // without approved reviews therefore omit the Product node entirely.
  const hasValidOffer = product.price > 0;
  const hasProductRichResultData = hasValidOffer || hasReviews;

  // Generate rich structured data for the product when the record supports it.
  const structuredData: { [key: string]: JsonLdValue } = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productId,
    "name": semanticName,
    "sku": product.sku,
    "productID": product.sku,
    "mpn": product.part_number || product.sku,
    "description": description,
    "inLanguage": localeConfig,
    "disambiguatingDescription": answerFirstSummary,
    "brand": {
      "@type": "Brand",
      "name": brandLabel
    },
    "manufacturer": {
      "@type": "Organization",
      "name": manufacturerName
    },
    "category": semanticCategory,
    "image": imageUrls,
    "url": productUrl,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": productUrl
    },
    "itemCondition": mapConditionType(product.condition_type),
    "countryOfOrigin": product.origin_country || undefined,
    "datePublished": product.created_at || undefined,
    "dateModified": product.updated_at || undefined,
    "keywords": buildProductSeoKeywords(semanticProduct),
    "offers": hasValidOffer ? {
      ...(lowPrice !== highPrice
        ? {
            "@type": "AggregateOffer",
            "lowPrice": lowPrice,
            "highPrice": highPrice,
            "offerCount": variantPrices.length,
          }
        : {
            "@type": "Offer",
            "price": product.price,
          }),
      "url": productUrl,
      "priceCurrency": "USD",
      "itemCondition": mapConditionType(product.condition_type),
      "availability": product.stock_quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/BackOrder",
      // BackOrder offers need validFrom; without it Rich Results reports the
      // offer as incomplete.
      ...(product.stock_quantity <= 0
        ? { "validFrom": computeBackOrderValidFrom(leadTime, referenceDate) }
        : {}),
      "seller": {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "Kavten",
        "url": baseUrl
      },
      // Shipping and return promises come from the admin-editable commerce
      // policy and are only published after an admin has saved it.
      ...(policyConfirmed ? {
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": policy.shipping_rate_amount || 0,
          "currency": policy.shipping_currency || "USD"
        },
        // Always publish a destination list: Google and Merchant Center treat a
        // missing shippingDestination as missing shipping data.
        "shippingDestination": fallbackCountries.map((country) => ({
          "@type": "DefinedRegion",
          "addressCountry": country
        })),
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": policy.shipping_handling_days_min,
            "maxValue": policy.shipping_handling_days_max,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": policy.shipping_transit_days_min,
            "maxValue": policy.shipping_transit_days_max,
            "unitCode": "DAY"
          }
        }
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": Array.from(new Set([returnCountry, ...fallbackCountries])),
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": policy.return_window_days,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": mapReturnFees(policy),
        "merchantReturnLink": `${baseUrl}/returns`
      }
      } : {})
    } : undefined
  };

  // Add aggregate rating if reviews exist
  if (hasReviews && avgRating !== undefined) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": Math.round(avgRating * 10) / 10,
      "bestRating": 5,
      "worstRating": 1,
      "reviewCount": approvedReviews.length
    };

    structuredData.review = approvedReviews.slice(0, 5).map(r => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.customer_name
      },
      "datePublished": r.created_at?.split('T')[0],
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": 5
      },
      "name": r.review_title || `Review of ${product.sku}`,
      "reviewBody": r.review_content
    }));
  }

  // Add technical specs as additional properties
  if (additionalProperties && additionalProperties.length > 0) {
    structuredData.additionalProperty = additionalProperties;
  }

  const subjectOf = [
    product.datasheet_url ? {
      "@type": "DigitalDocument",
      "name": `${product.sku} datasheet`,
      "url": product.datasheet_url,
    } : null,
    product.manual_url ? {
      "@type": "DigitalDocument",
      "name": `${product.sku} manual`,
      "url": product.manual_url,
    } : null,
  ].filter(Boolean);

  if (subjectOf.length > 0) {
    structuredData.subjectOf = subjectOf as JsonLdValue[];
  }

  // Speakable for AI search engines
  structuredData.speakable = {
    "@type": "SpeakableSpecification",
    "cssSelector": ["h1", ".product-key-facts", ".product-description"]
  };

  // Generate breadcrumb structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": t('common.home'),
        "item": `${baseUrl}${href('/')}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": t('nav.products'),
        "item": `${baseUrl}${href('/products')}`
      },
      ...(categoryBreadcrumb?.map((cat, index) => ({
        "@type": "ListItem",
        "position": index + 3,
        "name": cat.name,
         "item": `${baseUrl}${href(`/categories/${cat.path || cat.slug}`)}`
      })) || []),
      {
        "@type": "ListItem",
        "position": (categoryBreadcrumb?.length || 0) + 3,
        "name": semanticName,
        "item": productUrl
      }
    ]
  };

  // Same FAQ set as the visible accordion (structured data must match the page).
  const faqEntities = buildProductFaqs(product, { categorySlug }).map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }));

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqEntities
  };

  const webPageData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${productUrl}#webpage`,
    "url": productUrl,
    "name": semanticName,
    "description": metaDescription,
    "datePublished": product.created_at || undefined,
    "dateModified": product.updated_at || undefined,
    "inLanguage": localeConfig,
    "isPartOf": {
      // Reference the site-wide WebSite node instead of an anonymous copy so
      // search engines merge the graph into one entity.
      "@id": `${baseUrl}/#website`
    },
    "about": hasProductRichResultData
      ? { "@id": productId }
      : {
          "@type": "Thing",
          "name": semanticName,
          "identifier": product.sku,
        },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".product-key-facts", ".product-description"]
    }
  };

  return (
    <>
      {hasProductRichResultData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: toJsonLd(structuredData)
          }}
        />
      )}

      {/* Breadcrumb Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(breadcrumbData)
        }}
      />

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(faqData)
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(webPageData)
        }}
      />
    </>
  );
}

export default ProductSEO;
