import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, GlobeAltIcon, Squares2X2Icon, CubeIcon } from '@heroicons/react/24/outline';
import type { Product } from '@/types';
import { formatCurrency, productPathSegment } from '@/lib/utils';
import { STORE_CATEGORIES, categoryHref } from '@/lib/store-catalog';

type T = (key: string, vars?: Record<string, string | number>) => string;

const TILTS = ['-4deg', '3deg', '-2deg'];
const SPOTS = [
  'left-0 top-6 w-[58%] z-20',
  'right-0 top-0 w-[46%] z-10',
  'right-[6%] bottom-0 w-[48%] z-30',
];

export default function HomeHero({ t, href, products, total }: { t: T; href: (p: string) => string; products: Product[]; total: number }) {
  const picks = products.filter((p) => p.image_urls?.length).slice(0, 3);
  return (
    <section className="kv-dots relative overflow-hidden border-b-2 border-[var(--site-ink)] bg-[var(--site-cream)]">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[var(--site-primary)] opacity-95 max-lg:hidden" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 left-[38%] h-56 w-56 rounded-full bg-[var(--site-yellow)] max-lg:hidden" aria-hidden />

      <div className="kv-container relative grid items-center gap-12 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <span className="kv-kicker">⚙ {t('store.hero.kicker')}</span>
          <h1 className="kv-display mt-6 text-[2.6rem] font-extrabold leading-[0.98] text-[var(--site-ink)] sm:text-6xl xl:text-7xl">
            {t('store.hero.title')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--site-muted)]">{t('store.hero.text')}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={href('/products')} className="kv-btn kv-btn-red">
              {t('store.hero.cta')} <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href={href(categoryHref('stirling-engines'))} className="kv-btn kv-btn-white">
              🔥 {t('store.hero.cta2')}
            </Link>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <div className="kv-card px-3 py-3">
              <CubeIcon className="h-5 w-5 text-[var(--site-primary)]" />
              <dt className="mt-1 text-xs font-semibold text-[var(--site-muted)]">{t('store.hero.stat1')}</dt>
              <dd className="kv-display order-first text-2xl font-extrabold">{total > 0 ? `${total.toLocaleString('en-US')}+` : '1,500+'}</dd>
            </div>
            <div className="kv-card px-3 py-3">
              <Squares2X2Icon className="h-5 w-5 text-[var(--site-primary)]" />
              <dt className="mt-1 text-xs font-semibold text-[var(--site-muted)]">{t('store.hero.stat2')}</dt>
              <dd className="kv-display order-first text-2xl font-extrabold">{STORE_CATEGORIES.length}</dd>
            </div>
            <div className="kv-card bg-[var(--site-yellow)] px-3 py-3">
              <GlobeAltIcon className="h-5 w-5" />
              <dd className="kv-display mt-1 text-base font-extrabold leading-tight">{t('store.hero.stat3')}</dd>
            </div>
          </dl>
        </div>

        <div className="relative mx-auto h-[25rem] w-full max-w-[34rem] sm:h-[32rem]">
          {picks.map((product, index) => (
            <Link
              key={product.id}
              href={href(`/products/${productPathSegment(product)}`)}
              className={`kv-float absolute ${SPOTS[index]} block rounded-[1.4rem] border-2 border-[var(--site-ink)] bg-white p-2 shadow-[6px_6px_0_var(--site-ink)] transition-transform hover:z-40 hover:scale-[1.03]`}
              style={{ ['--kv-rot' as string]: TILTS[index], transform: `rotate(${TILTS[index]})`, animationDelay: `${index * 1.4}s` }}
            >
              <span className="relative block aspect-square overflow-hidden rounded-2xl bg-white">
                <Image src={product.image_urls[0]} alt={product.name} fill priority={index === 0} sizes="(min-width: 1024px) 300px, 55vw" className="object-contain" />
              </span>
              <span className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
                <span className="line-clamp-1 text-xs font-bold text-[var(--site-ink)]">{product.name}</span>
                <span className="shrink-0 rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] px-2 py-0.5 text-xs font-extrabold">
                  {formatCurrency(product.price)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
