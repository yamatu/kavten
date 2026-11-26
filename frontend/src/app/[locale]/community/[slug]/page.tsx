import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import MarkdownContent from '@/components/content/MarkdownContent';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/url';
import { ensureMetaDescription, withSiteName } from '@/lib/seo';
import { buildPublicRobots, getLocalizedMetadataPaths, resolveRouteLocale } from '@/lib/i18n/server';
import { localizePublicPath } from '@/lib/i18n/config';
import { communityCategory, formatCommunityDate } from '@/lib/community';
import { getCommunityPost } from '@/services/community.server';
import CommunityThreadClient from './CommunityThreadClient';

export const dynamic = 'force-dynamic';

type RouteParams = Promise<{ locale: string; slug: string }>;

function plainExcerpt(post: { excerpt?: string; body: string }, limit = 200): string {
  const source = (post.excerpt || post.body || '').replace(/[#*_>`\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return source.length > limit ? `${source.slice(0, limit - 1).trimEnd()}…` : source;
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveRouteLocale(Promise.resolve({ locale: rawLocale }));

  let post;
  try {
    post = await getCommunityPost(slug);
  } catch {
    return { title: 'Thread not found', robots: { index: false, follow: false } };
  }

  const { canonical, languages } = await getLocalizedMetadataPaths(locale, `/community/${post.slug}`, ['en']);
  const description = ensureMetaDescription(plainExcerpt(post));
  const images = post.image_urls?.slice(0, 4);
  const category = communityCategory(post.category);

  return {
    // Thread titles are user-submitted, so the suffix is only appended when the
    // whole line still fits in a SERP; otherwise the headline wins.
    title: { absolute: withSiteName(post.title) },
    description,
    keywords: [
      ...(post.tag_list || []),
      category.label,
      'model engine build log',
      'kavten community',
    ].filter(Boolean).join(', '),
    alternates: { canonical, languages },
    robots: buildPublicRobots(locale),
    openGraph: {
      type: 'article',
      title: withSiteName(post.title),
      description,
      url: canonical,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      section: category.label,
      tags: post.tag_list,
      images: images?.length ? images : undefined,
    },
    twitter: {
      card: images?.length ? 'summary_large_image' : 'summary',
      title: withSiteName(post.title),
      description,
      images: images?.length ? images : undefined,
    },
  };
}

export default async function CommunityThreadPage({ params }: { params: RouteParams }) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveRouteLocale(Promise.resolve({ locale: rawLocale }));
  const post = await getCommunityPost(slug);

  const baseUrl = getSiteUrl();
  const threadUrl = `${baseUrl}${localizePublicPath(`/community/${post.slug}`, locale)}`;
  const boardUrl = `${baseUrl}${localizePublicPath('/community', locale)}`;
  const category = communityCategory(post.category);
  const comments = post.comments ?? [];
  const productHref = post.product_slug ? `/products/${post.product_slug}` : null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DiscussionForumPosting',
        '@id': `${threadUrl}#discussion`,
        headline: post.title.slice(0, 110),
        url: threadUrl,
        mainEntityOfPage: threadUrl,
        description: plainExcerpt(post),
        datePublished: post.created_at,
        dateModified: post.updated_at,
        inLanguage: 'en',
        author: {
          '@type': 'Person',
          name: post.author_name,
        },
        publisher: { '@id': `${baseUrl}/#organization` },
        isPartOf: { '@id': `${boardUrl}#collection` },
        interactionStatistic: [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: post.likes_count,
          },
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CommentAction',
            userInteractionCount: comments.length || post.comments_count,
          },
        ],
        // Only the visible replies are announced, and only the first page of
        // them, so the markup never claims content the reader cannot see.
        comment: comments.slice(0, 10).map((comment) => ({
          '@type': 'Comment',
          text: comment.body,
          dateCreated: comment.created_at,
          author: { '@type': 'Person', name: comment.author_name },
        })),
        ...(post.product_name
          ? { about: { '@type': 'Product', name: post.product_name, ...(productHref ? { url: `${baseUrl}${productHref}` } : {}) } }
          : {}),
      },
      generateBreadcrumbSchema([
        { name: 'Home', url: `${baseUrl}${localizePublicPath('/', locale)}` },
        { name: 'Community', url: boardUrl },
        { name: post.title, url: threadUrl },
      ]),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicLayout>
        <div className="site-page-shell">
          <section className="kv-hero-soft">
            <div className="kv-dots absolute inset-0 opacity-40" aria-hidden />
            <div className="kv-container kv-hero-soft-inner py-10 sm:py-14">
              <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--site-muted)]">
                <Link href="/community" className="hover:text-[var(--site-primary)]">Community</Link>
                <span aria-hidden>/</span>
                <Link href={`/community?category=${category.slug}`} className="hover:text-[var(--site-primary)]">{category.label}</Link>
              </nav>

              <span className="kv-kicker">{category.emoji} {category.label}</span>
              <h1 className="kv-display mt-4 max-w-4xl text-3xl font-extrabold leading-tight text-[var(--site-ink)] sm:text-[2.75rem]">
                {post.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--site-muted)]">
                <span className="flex items-center gap-2 font-bold text-[var(--site-ink)]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--site-primary-soft)] text-xs font-extrabold" aria-hidden>
                    {post.author_name.slice(0, 1).toUpperCase()}
                  </span>
                  {post.author_name}
                  {post.author_badge ? (
                    <span className="rounded-full bg-[var(--site-yellow)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                      {post.author_badge}
                    </span>
                  ) : null}
                </span>
                {post.author_location ? <span>{post.author_location}</span> : null}
                <time dateTime={post.created_at}>{formatCommunityDate(post.created_at)}</time>
                <span>{post.views_count.toLocaleString('en-US')} views</span>
                <span>{post.comments_count} {post.comments_count === 1 ? 'reply' : 'replies'}</span>
              </div>

              {post.tag_list?.length ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {post.tag_list.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/community?search=${encodeURIComponent(tag)}`}
                        className="inline-block rounded-full border-2 border-[var(--site-line)] bg-white/70 px-2.5 py-1 text-xs font-semibold text-[var(--site-muted)] hover:border-[var(--site-ink)] hover:text-[var(--site-ink)]"
                      >
                        #{tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <div className="kv-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-14">
            <div className="min-w-0 space-y-8">
              <article className="kv-card p-5 sm:p-8">
                {post.image_urls?.length ? (
                  <ul className={`mb-7 grid gap-3 ${post.image_urls.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                    {post.image_urls.map((url, index) => (
                      <li key={url} className="overflow-hidden rounded-xl border-2 border-[var(--site-ink)] bg-[#f5efe6]">
                        {/* Guest-supplied hosts cannot be allow-listed in advance. */}
                        <img
                          src={url}
                          alt={`${post.title} - photo ${index + 1} shared by ${post.author_name}`}
                          loading={index === 0 ? 'eager' : 'lazy'}
                          className="h-full w-full object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="kv-article">
                  <MarkdownContent content={post.body} />
                </div>

                {post.video_url ? (
                  <p className="mt-6">
                    <a
                      href={post.video_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="kv-btn kv-btn-white"
                    >
                      ▶ Watch the video
                    </a>
                  </p>
                ) : null}
              </article>

              <CommunityThreadClient
                slug={post.slug}
                threadTitle={post.title}
                initialLikes={post.likes_count}
                initialComments={comments}
              />
            </div>

            <aside className="space-y-5">
              <div className="kv-card p-5">
                <h2 className="kv-display text-lg font-extrabold">Build facts</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    { term: 'Board', value: category.label },
                    { term: 'Kit', value: post.product_name },
                    { term: 'Build time', value: post.build_hours },
                    { term: 'Difficulty', value: post.difficulty },
                    { term: 'Posted', value: formatCommunityDate(post.created_at) },
                  ].filter((row) => row.value).map((row) => (
                    <div key={row.term} className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-[var(--site-line)] pb-2 last:border-0 last:pb-0">
                      <dt className="font-semibold text-[var(--site-muted)]">{row.term}</dt>
                      <dd className="text-right font-bold text-[var(--site-ink)]">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {productHref ? (
                  <Link href={productHref} className="kv-btn kv-btn-red kv-btn-sm mt-5 w-full">
                    View this kit
                  </Link>
                ) : null}
              </div>

              <div className="kv-card bg-[var(--site-yellow)] p-5">
                <h2 className="kv-display text-lg font-extrabold">Built something similar?</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--site-ink)]/75">
                  Post your own log. The next builder is searching for exactly the problem you already solved.
                </p>
                <Link href="/community/share" className="kv-btn kv-btn-red kv-btn-sm mt-4 w-full">
                  Share your build
                </Link>
              </div>

              <Link
                href="/community"
                className="flex items-center justify-between rounded-xl border-2 border-[var(--site-ink)] bg-white px-4 py-3 text-sm font-extrabold shadow-[3px_3px_0_var(--site-ink)] hover:bg-[var(--site-yellow)]"
              >
                ← All threads
              </Link>
            </aside>
          </div>
        </div>
      </PublicLayout>
    </>
  );
}
