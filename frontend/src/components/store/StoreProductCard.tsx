'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/solid';
import type { Product } from '@/types';
import { useCartStore } from '@/store/cart.store';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import { cn, formatCurrency, getDefaultProductImageWithSku, hasProductPrice, productPathSegment } from '@/lib/utils';

function productImages(product: Product): string[] {
  const urls = Array.isArray(product.image_urls) ? product.image_urls : [];
  if (urls.length > 0) return urls;
  return (product.images || []).map((image) => image.url).filter(Boolean);
}

export default function StoreProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const { t, href } = usePublicI18n();
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  const images = productImages(product);
  const primary = images[0] || getDefaultProductImageWithSku(product.sku);
  const secondary = images[1];
  const link = href(`/products/${productPathSegment(product)}`);
  const priced = hasProductPrice(product);
  const soldOut = Number(product.stock_quantity) <= 0;
  const onSale = priced && !!product.compare_price && product.compare_price > product.price;

  const handleAdd = () => {
    if (!priced || soldOut) return;
    addItem(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-[1.1rem] border-2 border-[var(--site-ink)] bg-white shadow-[4px_4px_0_var(--site-ink)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--site-primary)]',
        className,
      )}
    >
      <Link href={link} className="relative block aspect-square overflow-hidden border-b-2 border-[var(--site-ink)] bg-white">
        <Image
          src={primary}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 50vw"
          priority={priority}
          className={cn('object-contain p-3 transition-all duration-500', secondary ? 'group-hover:opacity-0' : 'group-hover:scale-105')}
        />
        {secondary ? (
          <Image
            src={secondary}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 50vw"
            className="scale-105 object-contain p-3 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
          />
        ) : null}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.is_featured ? (
            <span className="rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
              ★ {t('store.card.pick')}
            </span>
          ) : null}
          {onSale ? (
            <span className="rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-primary)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              {t('store.card.sale')}
            </span>
          ) : null}
        </div>
        {soldOut ? (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--site-ink)]/85 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">
            {t('store.card.soldOut')}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {product.brand ? (
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--site-primary)]">{product.brand}</span>
        ) : null}
        <h3 className="line-clamp-2 min-h-[2.6rem] text-[0.92rem] font-semibold leading-snug text-[var(--site-ink)]">
          <Link href={link} className="hover:text-[var(--site-primary)]">{product.name}</Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            {priced ? (
              <>
                <div className="kv-display text-xl font-extrabold leading-none text-[var(--site-ink)]">{formatCurrency(product.price)}</div>
                {onSale ? (
                  <div className="mt-1 text-xs text-[var(--site-muted)] line-through">{formatCurrency(product.compare_price as number)}</div>
                ) : null}
              </>
            ) : (
              <Link href={link} className="text-sm font-bold text-[var(--site-primary)]">{t('products.contactForQuote')}</Link>
            )}
          </div>
          {priced && !soldOut ? (
            <button
              type="button"
              onClick={handleAdd}
              aria-label={`${t('store.card.add')}: ${product.name}`}
              title={t('store.card.add')}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--site-ink)] shadow-[2px_2px_0_var(--site-ink)] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                added ? 'bg-emerald-400 text-[var(--site-ink)]' : 'bg-[var(--site-primary)] text-white hover:bg-[var(--site-primary-strong)]',
              )}
            >
              {added ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
            </button>
          ) : (
            <Link href={link} className="kv-btn kv-btn-white kv-btn-sm">{t('store.card.view')}</Link>
          )}
        </div>
      </div>
    </article>
  );
}
