import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';
import {
  buildLanguageAlternates,
  DEFAULT_PUBLIC_LOCALE,
  INDEXABLE_PUBLIC_LOCALES,
  isPublicLocale,
  localizePublicPath,
  normalizePublicLocale,
  type PublicLocale,
} from './config';

export type LocaleRouteParams = Promise<{ locale: string }>;

const indexableLocaleSet = new Set<PublicLocale>(INDEXABLE_PUBLIC_LOCALES);

export function isIndexablePublicLocale(locale: PublicLocale): boolean {
  return indexableLocaleSet.has(locale);
}

/**
 * Robots for a public page. Only pages that render a real translation may opt
 * in with `indexable = true`; an untranslated locale serves English fallback
 * copy and must stay out of the index instead of competing with the original.
 */
export function buildPublicRobots(locale: PublicLocale, indexable = true): Metadata['robots'] {
  const allowIndex = indexable && isIndexablePublicLocale(locale);
  if (!allowIndex) {
    return { index: false, follow: true, googleBot: { index: false, follow: true } };
  }
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}

// Middleware rewrites every public URL to /{locale}{path}. Reading the locale
// from the route segment (not request headers) keeps public pages ISR-cacheable.
export async function resolveRouteLocale(params: Promise<{ locale?: string }>): Promise<PublicLocale> {
  const { locale } = await params;
  return normalizePublicLocale(locale);
}

export async function getLocalizedMetadataPaths(
  locale: PublicLocale,
  pathname: string,
  availableLocales?: readonly PublicLocale[],
) {
  const baseUrl = getSiteUrl();
  const localizedPath = localizePublicPath(pathname, locale);
  const allowedLocales = availableLocales
    ? Array.from(new Set([DEFAULT_PUBLIC_LOCALE, ...availableLocales.filter(isPublicLocale)]))
    : [...INDEXABLE_PUBLIC_LOCALES];
  return {
    locale,
    canonical: `${baseUrl}${localizedPath === '/' ? '' : localizedPath}`,
    languages: buildLanguageAlternates(baseUrl, pathname, allowedLocales),
  };
}

export async function getLocalizedMetadataPathsWithQuery(
  locale: PublicLocale,
  pathname: string,
  query: string,
  availableLocales?: readonly PublicLocale[],
) {
  const metadata = await getLocalizedMetadataPaths(locale, pathname, availableLocales);
  const normalizedQuery = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  return {
    ...metadata,
    canonical: `${metadata.canonical}${normalizedQuery}`,
    languages: Object.fromEntries(
      Object.entries(metadata.languages).map(([language, url]) => [language, `${url}${normalizedQuery}`]),
    ),
  };
}
