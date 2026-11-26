'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChatBubbleLeftEllipsisIcon,
  EyeIcon,
  HandThumbUpIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import SmartPagination from '@/components/ui/SmartPagination';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_SORTS,
  communityCategory,
  formatCommunityDate,
  type CommunitySort,
} from '@/lib/community';
import type { CommunityFeed, CommunityPost } from '@/types';

interface CommunityPageClientProps {
  initialFeed: CommunityFeed;
  filters: { page: number; category?: string; search: string; sort: CommunitySort };
  title: string;
  description: string;
}

function buildHref(base: {
  category?: string;
  search: string;
  sort: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (base.category) params.set('category', base.category);
  if (base.search) params.set('search', base.search);
  if (base.sort && base.sort !== 'latest') params.set('sort', base.sort);
  if (base.page > 1) params.set('page', String(base.page));
  const qs = params.toString();
  return `/community${qs ? `?${qs}` : ''}`;
}

function CategoryBadge({ slug }: { slug: string }) {
  const meta = communityCategory(slug);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--site-ink)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--site-ink)]"
      style={{ background: meta.tone }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function ThreadCard({ post, featured = false }: { post: CommunityPost; featured?: boolean }) {
  const { href } = usePublicI18n();
  const cover = post.image_urls?.[0];
  return (
    <article
      className={`kv-card group flex h-full flex-col overflow-hidden transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--site-primary)] ${featured ? 'sm:flex-row' : ''}`}
    >
      <Link
        href={href(`/community/${post.slug}`)}
        className={`relative block shrink-0 overflow-hidden border-[var(--site-ink)] bg-[#f5efe6] ${featured ? 'border-b-2 sm:w-[42%] sm:border-b-0 sm:border-r-2' : 'aspect-[16/10] border-b-2'}`}
      >
        {cover ? (
          // Guest-supplied image hosts cannot be enumerated in next.config, so the
          // gallery renders a plain <img> (same approach as the news listing).
          <img
            src={cover}
            alt={`${post.title} - build photo by ${post.author_name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full min-h-[9rem] w-full items-center justify-center bg-gradient-to-br from-[#fff5e6] to-[#fdeee7] text-4xl" aria-hidden>
            {communityCategory(post.category).emoji}
          </div>
        )}
        {post.is_pinned ? (
          <span className="absolute left-3 top-3 rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
            Pinned
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge slug={post.category} />
          {post.difficulty ? (
            <span className="rounded-full border-2 border-[var(--site-line)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-muted)]">
              {post.difficulty}
            </span>
          ) : null}
        </div>

        <Link href={href(`/community/${post.slug}`)} className="block">
          <h3 className={`kv-display font-extrabold leading-snug text-[var(--site-ink)] transition-colors group-hover:text-[var(--site-primary)] ${featured ? 'text-2xl' : 'text-lg'}`}>
            {post.title}
          </h3>
        </Link>

        <p className={`text-sm leading-6 text-[var(--site-muted)] ${featured ? 'line-clamp-4' : 'line-clamp-3'}`}>{post.excerpt}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-dashed border-[var(--site-line)] pt-3 text-xs font-semibold text-[var(--site-muted)]">
          <span className="flex items-center gap-1.5 text-[var(--site-ink)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--site-primary-soft)] text-[11px] font-extrabold" aria-hidden>
              {post.author_name.slice(0, 1).toUpperCase()}
            </span>
            {post.author_name}
            {post.author_badge ? (
              <span className="rounded-full bg-[var(--site-yellow)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--site-ink)]">
                {post.author_badge}
              </span>
            ) : null}
          </span>
          <span>{formatCommunityDate(post.created_at)}</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1">
              <HandThumbUpIcon className="h-4 w-4" aria-hidden /> {post.likes_count}
            </span>
            <span className="flex items-center gap-1">
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" aria-hidden /> {post.comments_count}
            </span>
            <span className="flex items-center gap-1">
              <EyeIcon className="h-4 w-4" aria-hidden /> {post.views_count}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}

export default function CommunityPageClient({ initialFeed, filters, title, description }: CommunityPageClientProps) {
  const { href } = usePublicI18n();
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);

  const { data: posts, stats, total, total_pages: totalPages, page } = initialFeed;
  const unfiltered = !filters.category && !filters.search && page === 1;
  const featured = unfiltered ? posts.filter((post) => post.is_featured || post.is_pinned).slice(0, 2) : [];
  const featuredIds = new Set(featured.map((post) => post.id));
  const rest = posts.filter((post) => !featuredIds.has(post.id));

  const pageHref = (target: number) => href(buildHref({ ...filters, page: target }));

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(href(buildHref({ ...filters, search: search.trim(), page: 1 })));
  };

  return (
    <div className="site-page-shell">
      <section className="kv-hero-soft">
        <div className="kv-dots absolute inset-0 opacity-40" aria-hidden />
        <div className="kv-container kv-hero-soft-inner py-12 sm:py-16">
          <div className="max-w-3xl">
            <span className="kv-kicker">🔧 Builders’ Workshop</span>
            <h1 className="kv-display mt-5 text-3xl font-extrabold leading-tight text-[var(--site-ink)] sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--site-muted)] sm:text-lg">{description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={href('/community/share')} className="kv-btn kv-btn-red">
                <PlusIcon className="h-4 w-4" /> Share your build
              </Link>
              <Link href={href('/products')} className="kv-btn kv-btn-white">
                Browse kits
              </Link>
            </div>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: 'Threads', value: stats.total_posts },
              { label: 'Replies', value: stats.total_comments },
              { label: 'Boards', value: COMMUNITY_CATEGORIES.length },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border-2 border-[var(--site-ink)]/12 bg-white/70 px-4 py-3">
                <dd className="kv-display text-2xl font-extrabold text-[var(--site-ink)]">{item.value.toLocaleString('en-US')}</dd>
                <dt className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--site-muted)]">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="kv-container py-10 lg:py-14">
        <div className="mb-8 flex flex-col gap-5 rounded-[1.5rem] border-2 border-[var(--site-ink)] bg-white p-4 shadow-[4px_4px_0_var(--site-ink)] lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Community boards" className="kv-scrollbar-none flex gap-2 overflow-x-auto">
            <Link
              href={href(buildHref({ ...filters, category: undefined, page: 1 }))}
              className={`kv-chip ${!filters.category ? 'kv-chip-active' : ''}`}
              aria-current={!filters.category ? 'page' : undefined}
            >
              All boards
              <span className="opacity-60">{stats.total_posts}</span>
            </Link>
            {COMMUNITY_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={href(buildHref({ ...filters, category: category.slug, page: 1 }))}
                className={`kv-chip ${filters.category === category.slug ? 'kv-chip-active' : ''}`}
                aria-current={filters.category === category.slug ? 'page' : undefined}
              >
                <span aria-hidden>{category.emoji}</span>
                {category.short}
                {stats.categories[category.slug] ? <span className="opacity-60">{stats.categories[category.slug]}</span> : null}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form onSubmit={submitSearch} className="flex h-10 items-center overflow-hidden rounded-full border-2 border-[var(--site-ink)] bg-white">
              <MagnifyingGlassIcon className="ml-3 h-4 w-4 shrink-0 text-[var(--site-muted)]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search builds, engines, fixes"
                aria-label="Search community threads"
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-medium outline-none"
              />
              <button type="submit" className="mr-1 rounded-full bg-[var(--site-ink)] px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-[var(--site-primary)]">
                Search
              </button>
            </form>
            <div className="flex items-center gap-1 text-xs font-bold text-[var(--site-muted)]">
              {COMMUNITY_SORTS.map((sort) => (
                <Link
                  key={sort.value}
                  href={href(buildHref({ ...filters, sort: sort.value, page: 1 }))}
                  className={`rounded-full px-2.5 py-1.5 ${filters.sort === sort.value ? 'bg-[var(--site-yellow)] text-[var(--site-ink)]' : 'hover:text-[var(--site-ink)]'}`}
                  aria-current={filters.sort === sort.value ? 'true' : undefined}
                >
                  {sort.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {filters.search ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--site-primary-soft)] px-4 py-3 text-sm font-semibold">
            <p>
              {total} {total === 1 ? 'thread' : 'threads'} matching “{filters.search}”
            </p>
            <Link href={href(buildHref({ ...filters, search: '', page: 1 }))} className="font-extrabold text-[var(--site-primary)] underline-offset-2 hover:underline">
              Clear search
            </Link>
          </div>
        ) : null}

        {posts.length === 0 ? (
          <div className="kv-card flex flex-col items-center gap-4 p-12 text-center">
            <span className="text-5xl" aria-hidden>🧰</span>
            <h2 className="kv-display text-2xl font-extrabold">No threads here yet</h2>
            <p className="max-w-md text-sm leading-6 text-[var(--site-muted)]">
              This board is new. If you have built, tuned or fixed one of our engines, your notes are exactly what the next
              owner is looking for.
            </p>
            <Link href={href('/community/share')} className="kv-btn kv-btn-red">
              Be the first to post
            </Link>
          </div>
        ) : (
          <>
            {featured.length > 0 ? (
              <section className="mb-10" aria-labelledby="community-featured">
                <h2 id="community-featured" className="kv-display mb-4 flex items-center gap-2 text-2xl font-extrabold">
                  <SparklesIcon className="h-5 w-5 text-[var(--site-primary)]" aria-hidden /> Worth reading first
                </h2>
                <div className="grid gap-5 lg:grid-cols-2">
                  {featured.map((post) => (
                    <ThreadCard key={post.id} post={post} featured />
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-labelledby="community-latest">
              <h2 id="community-latest" className="kv-display mb-4 text-2xl font-extrabold">
                {filters.category ? communityCategory(filters.category).label : 'Latest from the workshop'}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <ThreadCard key={post.id} post={post} />
                ))}
              </div>
            </section>

            {totalPages > 1 ? (
              <div className="mt-10 flex justify-center">
                <SmartPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(target) => router.push(pageHref(target))}
                  getPageHref={pageHref}
                />
              </div>
            ) : null}
          </>
        )}

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="kv-card p-6 sm:p-8">
            <h2 className="kv-display text-2xl font-extrabold">What makes a thread useful</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--site-muted)]">
              <li><strong className="text-[var(--site-ink)]">Name the kit and version.</strong> “Stirling Engine Kit V2” gets answers; “the engine” gets guesses.</li>
              <li><strong className="text-[var(--site-ink)]">Post the numbers.</strong> Fuel or voltage, ambient temperature, RPM, break-in hours, needle turns.</li>
              <li><strong className="text-[var(--site-ink)]">Show the part in question.</strong> One close-up saves three replies.</li>
              <li><strong className="text-[var(--site-ink)]">Close the loop.</strong> When a fix works, reply with what it was, so the next owner finds it.</li>
            </ul>
          </div>
          <div className="kv-card flex flex-col justify-between gap-4 bg-[var(--site-yellow)] p-6 sm:p-8">
            <div>
              <h2 className="kv-display text-2xl font-extrabold">Nothing to show yet?</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--site-ink)]/75">
                A first-start video or a photo of the bench is enough to start a build log. You do not need a finished
                engine to post.
              </p>
            </div>
            <Link href={href('/community/share')} className="kv-btn kv-btn-red self-start">
              Start a thread
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
