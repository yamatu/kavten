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

// Roughly what a desktop SERP renders before it truncates with an ellipsis.
// Titles are allowed to be longer, but anything past this only shows a prefix,
// so the brand suffix is dropped before the page's own words are cut.
export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 156;

/** Cut at a word boundary so a truncated string never ends mid-word. */
function cutAtWord(text: string, max: number, ellipsis = false): string {
  if (text.length <= max) return text;
  const budget = ellipsis ? max - 1 : max;
  const slice = text.slice(0, budget);
  const boundary = slice.lastIndexOf(' ');
  const head = (boundary > budget * 0.6 ? slice.slice(0, boundary) : slice).replace(/[\s,;:–-]+$/, '');
  return ellipsis ? `${head}…` : head;
}

/**
 * User-submitted thread titles arrive at any length. Keeping the title but
 * losing the brand beats keeping the brand and cutting the headline.
 */
export function truncateMetaTitle(title: string, max = META_TITLE_MAX): string {
  return cutAtWord(title.replace(/\s+/g, ' ').trim(), max, true);
}

export function withSiteName(title: string): string {
  const pageTitle = withoutSiteNameSuffix(title);
  if (!pageTitle) return SITE_NAME;
  // "About Kavten | Kavten" wastes nine characters of the ~580px a SERP shows
  // and reads like keyword stuffing, so a title that already names the store
  // is left alone.
  const namesSite = new RegExp(`(^|[^a-z0-9])${SITE_NAME}([^a-z0-9]|$)`, 'i').test(pageTitle);
  if (namesSite) return truncateMetaTitle(pageTitle);
  const branded = `${pageTitle} | ${SITE_NAME}`;
  return branded.length <= META_TITLE_MAX ? branded : truncateMetaTitle(pageTitle);
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

/**
 * Trim an over-long description at a sentence boundary when one fits, and at a
 * clause or word boundary otherwise. Google rewrites anything past ~160
 * characters anyway; doing it here keeps the visible part a whole thought.
 */
function fitMetaDescription(text: string, max = META_DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let kept = '';
  for (const sentence of sentences) {
    const next = kept ? `${kept} ${sentence.trim()}` : sentence.trim();
    if (next.length > max) break;
    kept = next;
  }
  if (kept.length >= 110) return kept;

  const clause = Math.max(text.lastIndexOf(', ', max), text.lastIndexOf('; ', max), text.lastIndexOf(' — ', max));
  const head = (clause > max * 0.55 ? text.slice(0, clause) : cutAtWord(text, max - 1)).replace(/[\s,;:–-]+$/, '');
  return `${head}.`;
}

export function ensureMetaDescription(description: string, minLength = 110): string {
  const base = withoutSiteNameSuffix((description || '').replace(/\s+/g, ' ').trim()).replace(/[.,;\s]+$/, '');
  if (!base) return SITE_META_FILLER;
  if (base.length >= minLength) return fitMetaDescription(`${base}.`);
  for (const filler of META_FILLER_LADDER) {
    const combined = `${base}. ${filler}`;
    if (combined.length <= META_DESCRIPTION_MAX) return combined;
  }
  return fitMetaDescription(`${base}.`);
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
