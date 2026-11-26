import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { Product } from '@/types';
import StoreProductCard from '@/components/store/StoreProductCard';
import { categoryHref, categoryLabelKey, type StoreCategory } from '@/lib/store-catalog';
import EnginePattern from '@/components/store/home/EngineMotifs';

type T = (key: string, vars?: Record<string, string | number>) => string;

export function FeaturedGrid({ t, href, products }: { t: T; href: (p: string) => string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="bg-white py-14 lg:py-20" aria-labelledby="kavten-featured">
      {/* Warm editorial panel instead of a full-bleed ink band: the section still
          reads as the loudest block on the page, but it no longer cuts the cream
          scroll into two hard halves on phones. */}
      <div className="kv-container">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-[var(--site-ink)]/10 bg-gradient-to-br from-[#fff5e6] via-[#fdeee7] to-[#fff9ee] px-5 py-10 sm:rounded-[2.5rem] sm:px-8 sm:py-12 lg:px-12 lg:py-14">
          <div className="kv-dots pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <EnginePattern id="featured" className="opacity-[0.075]" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--site-primary)]/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-[var(--site-yellow)]/30 blur-3xl" aria-hidden />

          <div className="relative">
            <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <span className="kv-kicker">★ {t('store.featured.kicker')}</span>
                <h2 id="kavten-featured" className="kv-display mt-4 text-4xl font-extrabold text-[var(--site-ink)] sm:text-5xl">
                  {t('store.featured.title')}
                </h2>
                <p className="mt-3 max-w-xl text-[var(--site-muted)]">{t('store.featured.text')}</p>
              </div>
              <Link href={href('/products')} className="kv-btn kv-btn-red self-start md:self-auto">
                {t('store.allProducts')} →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {products.slice(0, 8).map((product) => (
                <StoreProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CategoryShelf({
  t,
  href,
  category,
  products,
  total,
  childCounts,
  index,
}: {
  t: T;
  href: (p: string) => string;
  category: StoreCategory;
  products: Product[];
  total: number;
  childCounts: Record<string, number>;
  index: number;
}) {
  if (products.length === 0) return null;
  const name = t(categoryLabelKey(category.slug));
  return (
    <section className={index % 2 === 0 ? 'bg-[var(--site-cream)] py-12 lg:py-14' : 'bg-white py-12 lg:py-14'} aria-labelledby={`shelf-${category.slug}`}>
      <div className="kv-container">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--site-ink)] text-2xl shadow-[3px_3px_0_var(--site-ink)]"
              style={{ background: category.tone }}
              aria-hidden
            >
              {category.emoji}
            </span>
            <div>
              <h2 id={`shelf-${category.slug}`} className="kv-display text-3xl font-extrabold text-[var(--site-ink)]">{name}</h2>
              <p className="text-sm font-semibold text-[var(--site-muted)]">{t('store.cats.items', { count: total })}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {category.children.map((child) => (
              <Link key={child.slug} href={href(categoryHref(category.slug, child.slug))} className="kv-chip">
                {t(categoryLabelKey(child.slug))}
                {childCounts[child.slug] ? <span className="text-[var(--site-muted)]">{childCounts[child.slug]}</span> : null}
              </Link>
            ))}
            <Link href={href(categoryHref(category.slug))} className="kv-btn kv-btn-red kv-btn-sm ml-1">
              {t('store.shelf.viewAll', { count: total })} <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="kv-rail -mx-1">
          {products.map((product) => (
            <StoreProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
