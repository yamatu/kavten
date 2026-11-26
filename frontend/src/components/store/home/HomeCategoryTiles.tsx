import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { Category } from '@/types';
import { STORE_CATEGORIES, categoryHref, categoryLabelKey } from '@/lib/store-catalog';
import EnginePattern from '@/components/store/home/EngineMotifs';

type T = (key: string, vars?: Record<string, string | number>) => string;

export default function HomeCategoryTiles({ t, href, tree }: { t: T; href: (p: string) => string; tree: Category[] }) {
  const bySlug = new Map(tree.map((node) => [node.slug, node]));
  return (
    <section className="relative isolate overflow-hidden bg-white py-16 lg:py-20" aria-labelledby="kavten-categories">
      {/* Hairline engine line-art sits in the white itself: the section reads as
          designed rather than empty, and the tiles keep their contrast. */}
      <EnginePattern id="categories" />
      <div className="kv-container relative">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 id="kavten-categories" className="kv-display text-4xl font-extrabold text-[var(--site-ink)] sm:text-5xl">{t('store.cats.title')}</h2>
            <p className="mt-3 max-w-xl text-[var(--site-muted)]">{t('store.cats.text')}</p>
          </div>
          <Link href={href('/products')} className="kv-btn kv-btn-yellow self-start md:self-auto">{t('store.allProducts')} →</Link>
        </div>

        <div className="grid auto-rows-[15rem] grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {STORE_CATEGORIES.map((category, index) => {
            const node = bySlug.get(category.slug);
            const big = index === 0;
            return (
              <Link
                key={category.slug}
                href={href(categoryHref(category.slug))}
                className={`group relative flex flex-col overflow-hidden rounded-[1.4rem] border-2 border-[var(--site-ink)] p-5 shadow-[4px_4px_0_var(--site-ink)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--site-ink)] ${big ? 'col-span-2 row-span-2' : ''} ${index >= 5 ? 'lg:col-span-2' : ''}`}
                style={{ background: category.tone }}
              >
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-2xl" aria-hidden>{category.emoji}</span>
                    <h3 className={`kv-display mt-1 font-extrabold leading-tight text-[var(--site-ink)] ${big ? 'text-3xl sm:text-4xl' : 'text-xl'}`}>
                      {t(categoryLabelKey(category.slug))}
                    </h3>
                    {node?.product_count ? (
                      <p className="mt-1 text-xs font-bold text-[var(--site-muted)]">{t('store.cats.items', { count: node.product_count })}</p>
                    ) : null}
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--site-ink)] bg-white transition-colors group-hover:bg-[var(--site-primary)] group-hover:text-white">
                    <ArrowUpRightIcon className="h-5 w-5" />
                  </span>
                </div>
                {big && category.children.length > 0 ? (
                  <div className="relative z-10 mt-4 flex flex-wrap gap-2">
                    {category.children.slice(0, 5).map((child) => (
                      <span key={child.slug} className="kv-chip">{t(categoryLabelKey(child.slug))}</span>
                    ))}
                  </div>
                ) : null}
                {node?.image_url ? (
                  <div className={`absolute ${big ? 'inset-x-6 bottom-0 top-36 sm:top-40' : (index >= 5 ? 'bottom-0 right-0 h-[85%] w-[55%] lg:w-[45%]' : 'bottom-0 right-0 h-[62%] w-[72%]')}`}>
                    <Image
                      src={node.image_url}
                      alt=""
                      fill
                      sizes={big ? '(min-width: 1024px) 45vw, 90vw' : '(min-width: 1024px) 20vw, 40vw'}
                      className="object-contain object-bottom mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
