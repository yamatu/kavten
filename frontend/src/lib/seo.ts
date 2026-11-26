import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export const SITE_NAME = 'Kavten';

// Imported titles still carry the previous site name; strip it (and the
// current one) before the Kavten suffix is appended, otherwise published titles
// keep advertising a different brand.
const SITE_NAME_SUFFIX = /(?:\s*\|\s*(?:VIBO\s*CNC|VIBOCNC|KAVTEN))+\s*$/i;

export function withoutSiteNameSuffix(title: string): string {
  return title.replace(SITE_NAME_SUFFIX, '').trim();
}

export function withSiteName(title: string): string {
  const pageTitle = withoutSiteNameSuffix(title);
  if (!pageTitle) return SITE_NAME;
  // "About Kavten | Kavten" wastes nine characters of the ~580px a SERP shows
  // and reads like keyword stuffing, so a title that already names the store
  // is left alone.
  return new RegExp(`(^|[^a-z0-9])${SITE_NAME}([^a-z0-9]|$)`, 'i').test(pageTitle)
    ? pageTitle
    : `${pageTitle} | ${SITE_NAME}`;
}

// Google truncates a description that says too little and ignores one that says
// nothing: policy pages imported with a 60-character summary were being flagged
// as thin. This pads with a factual house sentence instead of inventing claims.
export const SITE_META_FILLER = 'Kavten keeps model engines, RC vehicles and 3D metal kits in stock and ships worldwide from our own warehouse.';

// Longest first: the first sentence that still fits inside the 158-character
// budget wins, so descriptions never end mid-clause.
const META_FILLER_LADDER = [
  SITE_META_FILLER,
  'Ships worldwide from our own warehouse.',
  'Ships worldwide.',
];

export function ensureMetaDescription(description: string, minLength = 110): string {
  const base = withoutSiteNameSuffix((description || '').replace(/\s+/g, ' ').trim()).replace(/[.,;\s]+$/, '');
  if (base.length >= minLength) return `${base}.`;
  if (!base) return SITE_META_FILLER;
  for (const filler of META_FILLER_LADDER) {
    const combined = `${base}. ${filler}`;
    if (combined.length <= 158) return combined;
  }
  return `${base}.`;
}

export function buildStaticPageMetadata(
  path: string,
  title: string,
  description: string,
  keywords?: string,
): Metadata {
  const baseUrl = getSiteUrl();
  const canonicalUrl = `${baseUrl}${path}`;
  const pageTitle = withoutSiteNameSuffix(title);
  const socialTitle = withSiteName(pageTitle);
  const pageDescription = ensureMetaDescription(description);

  return {
    title: pageTitle,
    description: pageDescription,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: socialTitle,
      description: pageDescription,
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: pageDescription,
    },
  };
}
