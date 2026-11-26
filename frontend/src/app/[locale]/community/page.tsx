import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/url';
import { ensureMetaDescription, SITE_NAME, withSiteName } from '@/lib/seo';
import { buildPublicRobots, getLocalizedMetadataPaths, resolveRouteLocale, type LocaleRouteParams } from '@/lib/i18n/server';
import { localizePublicPath } from '@/lib/i18n/config';
import { isCommunityCategory, normalizeCommunitySort } from '@/lib/community';
import { getCommunityFeed } from '@/services/community.server';
import CommunityPageClient from './CommunityPageClient';

export const dynamic = 'force-dynamic';

// Kept under ~50 characters so the layout's " | Kavten" suffix still fits in
// the 60 a SERP renders before truncating.
const COMMUNITY_TITLE = 'Builders’ Workshop: Builds, First Starts & Fixes';
const COMMUNITY_DESCRIPTION =
  'Model engine build logs, first-start videos and troubleshooting threads from Kavten owners. Ask a question, post your progress, copy a fix that worked.';
const COMMUNITY_KEYWORDS =
  'model engine community, stirling engine build log, model engine first start, rc kit builds, engine tuning forum';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function readParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function resolvePage(params: Record<string, string | string[] | undefined>): number {
  const parsed = Number.parseInt(readParam(params, 'page'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: LocaleRouteParams;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const query = await searchParams;
  const locale = await resolveRouteLocale(params);
  const page = resolvePage(query);
  const category = readParam(query, 'category');
  const search = readParam(query, 'search').trim();

  // Filtered and paged views are noindex, so every one of them points its
  // canonical at the unfiltered board instead of inventing a URL per facet.
  const { canonical, languages } = await getLocalizedMetadataPaths(locale, '/community', ['en']);

  const title = page > 1 ? `${COMMUNITY_TITLE} - Page ${page}` : COMMUNITY_TITLE;
  const description = ensureMetaDescription(COMMUNITY_DESCRIPTION);  // Filtered and paged views repeat the same threads; they stay crawlable so the
  // thread links are followed, but they are not indexable pages of their own.
  const filtered = page > 1 || Boolean(search) || isCommunityCategory(category);

  return {
    title,
    description,
    keywords: COMMUNITY_KEYWORDS,
    robots: filtered ? { index: false, follow: true } : buildPublicRobots(locale),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: withSiteName(title),
      description,
      url: canonical,
    },
    twitter: { card: 'summary_large_image', title: withSiteName(title), description },
  };
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: LocaleRouteParams;
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const locale = await resolveRouteLocale(params);
  const page = resolvePage(query);
  const rawCategory = readParam(query, 'category');
  const category = isCommunityCategory(rawCategory) ? rawCategory : undefined;
  const search = readParam(query, 'search').trim();
  const sort = normalizeCommunitySort(readParam(query, 'sort'));

  const feed = await getCommunityFeed({
    page,
    page_size: 12,
    category,
    search: search || undefined,
    sort,
  });
  if (page > Math.max(1, feed.total_pages) && feed.total > 0) notFound();

  const baseUrl = getSiteUrl();
  const listUrl = `${baseUrl}${localizePublicPath('/community', locale)}`;
  // Only threads that are actually rendered on this page are announced.
  const listedThreads = feed.data.slice(0, 12);
  const itemListId = `${listUrl}#threads`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${listUrl}#collection`,
        url: listUrl,
        name: 'Kavten Builders’ Workshop',
        description: COMMUNITY_DESCRIPTION,
        inLanguage: 'en',
        isPartOf: { '@id': `${baseUrl}/#website` },
        about: { '@id': `${baseUrl}/#organization` },
        // Pointing the page at its own list keeps the graph connected, so an
        // answer engine reading the ItemList knows which page it belongs to.
        ...(listedThreads.length > 0 ? { mainEntity: { '@id': itemListId } } : {}),
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: `${baseUrl}${localizePublicPath('/', locale)}` },
        { name: 'Community', url: listUrl },
      ]),
      ...(listedThreads.length > 0
        ? [{
            '@type': 'ItemList',
            '@id': itemListId,
            numberOfItems: listedThreads.length,
            itemListOrder: 'https://schema.org/ItemListUnordered',
            itemListElement: listedThreads.map((post, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${baseUrl}${localizePublicPath(`/community/${post.slug}`, locale)}`,
              name: post.title,
            })),
          }]
        : []),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicLayout>
        <CommunityPageClient
          initialFeed={feed}
          filters={{ page, category, search, sort }}
          title={COMMUNITY_TITLE}
          description={COMMUNITY_DESCRIPTION}
        />
      </PublicLayout>
    </>
  );
}
