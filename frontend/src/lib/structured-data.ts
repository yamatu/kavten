import { getSiteUrl } from '@/lib/url';
import { buildHomeFaqEntries } from '@/lib/faq-content';
import type { CommercePolicySetting } from '@/types';
import { SITE_NAME } from '@/lib/seo';
import { STORE_CATEGORIES } from '@/lib/store-catalog';
import { storeMessages } from '@/lib/i18n/store-messages';

export const BRAND_DESCRIPTION =
  'Kavten is an online hobby store for working model engines: V8 and V12 engine model kits, Stirling engines, live steam engines, nitro RC vehicles, 3D metal model kits, science kits and spare parts, shipped worldwide.';

export const BRAND_TOPICS = [
  'Working model engine kits',
  'V8 and V12 engine models',
  'Stirling engines',
  'Model steam engines',
  'Nitro and gas RC vehicles',
  'RC helicopters and airplanes',
  '3D metal model kits',
  'Tesla coils and STEM science kits',
  'Model engine spare parts',
];

export function generateOrganizationSchema(sameAs: string[] = []) {
  const baseUrl = getSiteUrl();
  const socialProfiles = [...new Set(sameAs.filter((url) => {
    if (!/^https?:\/\//i.test(url)) return false;
    // A personal LinkedIn profile should not be asserted as the company's
    // sameAs entity. Keep official company profiles and other configured URLs.
    return !/^https?:\/\/(?:www\.)?linkedin\.com\/in\//i.test(url);
  }))];

  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${baseUrl}/#organization`,
    "name": SITE_NAME,
    "alternateName": ["KAVTEN", "kavten.com"],
    "description": BRAND_DESCRIPTION,
    "slogan": "Miniature engines that really run",
    "url": baseUrl,
    "areaServed": "Worldwide",
    "knowsAbout": BRAND_TOPICS,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/images/kavten-logo-square.png`,
      "width": 512,
      "height": 512
    },
    "image": `${baseUrl}/images/og-image.jpg`,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "telephone": "+86-13301553506",
      "email": "flora@kavten.com",
      "availableLanguage": ["en", "zh"]
    },
    ...(socialProfiles.length > 0 ? { "sameAs": socialProfiles } : {})
  };
}

export function generateWebsiteSchema() {
  const baseUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    "name": SITE_NAME,
    "alternateName": ["KAVTEN", "kavten.com"],
    "url": baseUrl,
    "description": BRAND_DESCRIPTION,
    "inLanguage": "en",
    "publisher": {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      "name": SITE_NAME,
      "url": baseUrl
    },
    // Sitelinks search box: lets Google (and AI answer engines) query the
    // catalogue directly from the brand result instead of guessing a URL.
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/products?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Kavten product categories",
      "itemListElement": STORE_CATEGORIES.map((category, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": storeMessages.en[`cat.${category.slug}`],
        "url": `${baseUrl}/categories/${category.slug}`
      }))
    },
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", ".product-name", ".category-title"]
    }
  };
}

export function generateBreadcrumbSchema(items: Array<{name: string, url: string}>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

export function generateFAQSchema(locale = 'en', commercePolicy?: CommercePolicySetting) {
  // Delegates to the same list the FAQ page renders, so the markup can never
  // claim an answer that is not visible on the page.
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": buildHomeFaqEntries(locale, commercePolicy).map((entry) => ({
      "@type": "Question",
      "name": entry.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": entry.answer,
      },
    })),
  };
}
