import { NextResponse } from 'next/server';
import { getRequestBaseUrl } from '@/lib/request-url';
import { renderLocalizedSitemap } from '@/lib/i18n/sitemap';
import { ACTIVE_PUBLIC_LOCALES } from '@/lib/i18n/config';
import { CommunityService } from '@/services/community.service';
import type { CommunityPost } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// The board is new, so one request covers it. The cap keeps a runaway import
// from turning this route into a slow, unbounded crawl target.
const MAX_PAGES = 20;
const PAGE_SIZE = 50;

async function getAllPublishedThreads(): Promise<CommunityPost[]> {
  const collected: CommunityPost[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const feed = await CommunityService.getPosts({ page, page_size: PAGE_SIZE, sort: 'latest' });
    collected.push(...feed.data);
    if (page >= (feed.total_pages || 1) || feed.data.length === 0) break;
  }
  return collected;
}

function postTimestamp(post: CommunityPost): number {
  const raw = post.updated_at || post.created_at;
  // A missing date must not become 1970: a 1970 <lastmod> tells crawlers the
  // thread is stale, so report "unknown" instead.
  return raw ? new Date(raw).getTime() : Number.NaN;
}

function latestModifiedAt(posts: CommunityPost[]): string | undefined {
  const timestamps = posts.map(postTimestamp).filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : undefined;
}

export async function GET() {
  const baseUrl = await getRequestBaseUrl();
  let posts: CommunityPost[] = [];
  try {
    posts = await getAllPublishedThreads();
  } catch (error) {
    // Serving an empty sitemap would read as "every thread was deleted".
    console.error('Error generating community sitemap:', error);
    return new NextResponse('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }

  const urls = [
    {
      pathname: '/community',
      lastModified: latestModifiedAt(posts),
      changeFrequency: 'daily',
      priority: '0.8',
      availableLocales: [...ACTIVE_PUBLIC_LOCALES],
    },
    ...posts.map((post) => ({
      pathname: `/community/${post.slug}`,
      lastModified: Number.isFinite(postTimestamp(post)) ? new Date(postTimestamp(post)).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: post.is_featured ? '0.7' : '0.6',
      availableLocales: [...ACTIVE_PUBLIC_LOCALES],
    })),
  ];

  const sitemap = renderLocalizedSitemap(baseUrl, urls);
  return new NextResponse(sitemap, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
