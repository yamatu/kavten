'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bars3Icon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  UserIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useCart } from '@/store/cart.store';
import { useCustomer } from '@/store/customer.store';
import { ProductService } from '@/services/product.service';
import { CategoryService } from '@/services/category.service';
import { queryKeys } from '@/lib/react-query';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import { localizeProductContent } from '@/lib/i18n/content';
import { STORE_CATEGORIES, categoryHref, categoryLabelKey, type StoreCategory } from '@/lib/store-catalog';
import { cn, formatCurrency, getDefaultProductImageWithSku, getProductImageUrl, hasProductPrice, productPathSegment } from '@/lib/utils';
import type { Category, Product } from '@/types';
import LanguageSelector from './LanguageSelector';

type CategoryMeta = { count?: number; image?: string; childCounts: Record<string, number> };

function useCategoryMeta(): Record<string, CategoryMeta> {
  const { data } = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: () => CategoryService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
  return useMemo(() => {
    const out: Record<string, CategoryMeta> = {};
    for (const node of (data || []) as Category[]) {
      const childCounts: Record<string, number> = {};
      for (const child of node.children || []) childCounts[child.slug] = child.product_count || 0;
      out[node.slug] = { count: node.product_count, image: node.image_url || undefined, childCounts };
    }
    return out;
  }, [data]);
}

function SearchBox({ onDone, autoFocus = false }: { onDone?: () => void; autoFocus?: boolean }) {
  const { locale, t, href } = usePublicI18n();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const lookup = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await ProductService.searchProducts(value.trim(), { page_size: 5 });
        setResults((res.data || []).map((product) => localizeProductContent(product, locale)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [locale]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(href(`/products?search=${encodeURIComponent(query.trim())}`));
    setOpen(false);
    onDone?.();
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} className="flex h-12 items-center overflow-hidden rounded-full border-2 border-[var(--site-ink)] bg-white shadow-[3px_3px_0_var(--site-ink)] focus-within:shadow-[3px_3px_0_var(--site-primary)]">
        <MagnifyingGlassIcon className="ml-4 h-5 w-5 shrink-0 text-[var(--site-ink)]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            lookup(event.target.value);
          }}
          placeholder={t('store.searchPlaceholder')}
          aria-label={t('header.searchProducts')}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[var(--site-ink)] outline-none placeholder:text-[var(--site-muted)]"
        />
        <button type="submit" className="mr-1.5 hidden h-9 rounded-full bg-[var(--site-ink)] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-[var(--site-primary)] sm:block">
          {t('header.search')}
        </button>
      </form>

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-50 overflow-hidden rounded-2xl border-2 border-[var(--site-ink)] bg-white shadow-[5px_5px_0_var(--site-ink)]">
          {loading ? (
            <div className="px-4 py-5 text-center text-sm text-[var(--site-muted)]">{t('common.loading')}</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    href={href(`/products/${productPathSegment(product)}`)}
                    onClick={() => { setOpen(false); onDone?.(); }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--site-accent-soft)]"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--site-line)] bg-white">
                      <Image
                        src={getProductImageUrl(product.image_urls?.length ? product.image_urls : (product.images || []), getDefaultProductImageWithSku(product.sku))}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--site-ink)]">{product.name}</span>
                    <span className="shrink-0 text-sm font-extrabold text-[var(--site-primary)]">
                      {hasProductPrice(product) ? formatCurrency(product.price) : ''}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t-2 border-[var(--site-ink)]">
                <button type="button" onClick={submit} className="flex w-full items-center justify-center gap-2 bg-[var(--site-yellow)] px-4 py-3 text-sm font-bold">
                  {t('header.viewResults')} <ArrowRightIcon className="h-4 w-4" />
                </button>
              </li>
            </ul>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-[var(--site-muted)]">{t('header.noProducts')}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MegaMenu({ category, meta, onNavigate }: { category: StoreCategory; meta?: CategoryMeta; onNavigate: () => void }) {
  const { t, href } = usePublicI18n();
  const name = t(categoryLabelKey(category.slug));
  return (
    <div className="kv-container">
      <div className="grid gap-6 rounded-b-[1.4rem] border-2 border-t-0 border-[var(--site-ink)] bg-white p-6 shadow-[6px_6px_0_var(--site-ink)] lg:grid-cols-[1fr_17rem]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-2xl" aria-hidden>{category.emoji}</span>
            <span className="kv-display text-2xl font-extrabold">{name}</span>
            {meta?.count ? <span className="rounded-full bg-[var(--site-cream)] px-2.5 py-0.5 text-xs font-bold text-[var(--site-muted)]">{t('store.cats.items', { count: meta.count })}</span> : null}
          </div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {category.children.map((child) => (
              <Link
                key={child.slug}
                href={href(categoryHref(category.slug, child.slug))}
                onClick={onNavigate}
                className="group flex items-center justify-between rounded-xl border-2 border-transparent px-3 py-2.5 text-sm font-semibold hover:border-[var(--site-ink)] hover:bg-[var(--site-accent-soft)]"
              >
                <span>{t(categoryLabelKey(child.slug))}</span>
                <span className="text-xs font-bold text-[var(--site-muted)] group-hover:text-[var(--site-ink)]">
                  {meta?.childCounts[child.slug] ?? ''}
                </span>
              </Link>
            ))}
          </div>
          <Link href={href(categoryHref(category.slug))} onClick={onNavigate} className="kv-btn kv-btn-red kv-btn-sm mt-5">
            {t('store.shopAll')} {name} <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <Link
          href={href(categoryHref(category.slug))}
          onClick={onNavigate}
          className="relative hidden overflow-hidden rounded-2xl border-2 border-[var(--site-ink)] lg:block"
          style={{ background: category.tone }}
        >
          {meta?.image ? (
            <Image src={meta.image} alt={name} fill sizes="272px" className="object-contain p-4 mix-blend-multiply" />
          ) : (
            <span className="flex h-full items-center justify-center text-6xl">{category.emoji}</span>
          )}
        </Link>
      </div>
    </div>
  );
}

function CategoryBar({ meta }: { meta: Record<string, CategoryMeta> }) {
  const { t, href } = usePublicI18n();
  const pathname = usePathname();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = (slug: string | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenSlug(slug);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenSlug(null), 140);
  };

  useEffect(() => setOpenSlug(null), [pathname]);

  const active = STORE_CATEGORIES.find((category) => category.slug === openSlug);

  return (
    <nav aria-label={t('header.primaryNavigation')} className="relative hidden border-t-2 border-[var(--site-ink)] bg-[var(--site-primary)] lg:block" onMouseLeave={scheduleClose}>
      <div className="kv-container flex items-stretch">
        <Link
          href={href('/products')}
          className="flex items-center gap-2 bg-[var(--site-ink)] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[var(--site-yellow)] hover:text-white"
          onMouseEnter={() => open(null)}
        >
          <Bars3Icon className="h-5 w-5" /> {t('store.allProducts')}
        </Link>
        <ul className="flex flex-1 items-stretch justify-between">
          {STORE_CATEGORIES.map((category) => {
            const isOpen = openSlug === category.slug;
            const hasChildren = category.children.length > 0;
            return (
              <li key={category.slug} className="flex" onMouseEnter={() => open(hasChildren ? category.slug : null)}>
                <Link
                  href={href(categoryHref(category.slug))}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  className={cn(
                    'flex items-center gap-1 whitespace-nowrap px-2.5 py-3 text-[13px] font-bold text-white transition-colors xl:px-3.5 xl:text-sm',
                    isOpen ? 'bg-white text-[var(--site-ink)]' : 'hover:bg-white/15',
                  )}
                  onFocus={() => open(hasChildren ? category.slug : null)}
                >
                  {t(categoryLabelKey(category.slug))}
                  {hasChildren ? <ChevronDownIcon className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {active ? (
        <div className="absolute left-0 right-0 top-full z-40" onMouseEnter={() => open(active.slug)}>
          <MegaMenu category={active} meta={meta[active.slug]} onNavigate={() => setOpenSlug(null)} />
        </div>
      ) : null}
    </nav>
  );
}

function MobileDrawer({ onClose, meta }: { onClose: () => void; meta: Record<string, CategoryMeta> }) {
  const { t, href } = usePublicI18n();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('header.mobileNavigation')}>
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={t('header.closeMenu')} />
      <div className="absolute inset-y-0 left-0 flex w-[min(24rem,88vw)] flex-col overflow-y-auto border-r-2 border-[var(--site-ink)] bg-[var(--site-cream)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--site-ink)] bg-white px-4 py-3">
          <Image src="/images/kavten-logo.png" alt="Kavten" width={120} height={63} className="h-9 w-auto" />
          <button type="button" onClick={onClose} className="rounded-full border-2 border-[var(--site-ink)] p-1.5" aria-label={t('header.closeMenu')}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <SearchBox onDone={onClose} />
        </div>
        <p className="px-4 pb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--site-muted)]">{t('store.browseCategories')}</p>
        <ul className="space-y-2 px-4">
          <li>
            <Link href={href('/products')} onClick={onClose} className="flex items-center justify-between rounded-xl border-2 border-[var(--site-ink)] bg-[var(--site-ink)] px-4 py-3 font-bold text-[var(--site-yellow)]">
              {t('store.allProducts')} <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </li>
          {STORE_CATEGORIES.map((category) => {
            const isOpen = expanded === category.slug;
            return (
              <li key={category.slug} className="overflow-hidden rounded-xl border-2 border-[var(--site-ink)] bg-white">
                <div className="flex items-center">
                  <Link href={href(categoryHref(category.slug))} onClick={onClose} className="flex flex-1 items-center gap-3 px-4 py-3 font-bold">
                    <span aria-hidden>{category.emoji}</span>
                    {t(categoryLabelKey(category.slug))}
                    {meta[category.slug]?.count ? <span className="text-xs font-semibold text-[var(--site-muted)]">{meta[category.slug].count}</span> : null}
                  </Link>
                  {category.children.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : category.slug)}
                      aria-expanded={isOpen}
                      className="border-l-2 border-[var(--site-ink)] px-4 py-3"
                      aria-label={t(categoryLabelKey(category.slug))}
                    >
                      <ChevronDownIcon className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                  ) : null}
                </div>
                {isOpen ? (
                  <ul className="border-t-2 border-[var(--site-ink)] bg-[var(--site-accent-soft)] py-1">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <Link href={href(categoryHref(category.slug, child.slug))} onClick={onClose} className="block px-5 py-2.5 text-sm font-semibold">
                          {t(categoryLabelKey(child.slug))}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-2 px-4 pb-8 text-sm font-semibold">
          <Link href={href('/about')} onClick={onClose} className="rounded-xl border-2 border-[var(--site-ink)] bg-white px-3 py-2.5 text-center">{t('store.about')}</Link>
          <Link href={href('/contact')} onClick={onClose} className="rounded-xl border-2 border-[var(--site-ink)] bg-white px-3 py-2.5 text-center">{t('store.contact')}</Link>
          <Link href={href('/track-order')} onClick={onClose} className="rounded-xl border-2 border-[var(--site-ink)] bg-white px-3 py-2.5 text-center">{t('store.footer.track')}</Link>
          <Link href={href('/faq')} onClick={onClose} className="rounded-xl border-2 border-[var(--site-ink)] bg-white px-3 py-2.5 text-center">{t('store.footer.faq')}</Link>
          <div className="col-span-2 mt-2"><LanguageSelector /></div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const { t, href } = usePublicI18n();
  const { itemCount, toggleCart } = useCart();
  const { isAuthenticated } = useCustomer();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const meta = useCategoryMeta();

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="bg-[var(--site-ink)] text-white">
        <div className="kv-container flex h-9 items-center justify-between gap-4 text-xs">
          <p className="truncate font-semibold tracking-wide">
            <span className="mr-2 text-[var(--site-yellow)]" aria-hidden>●</span>
            {t('store.announce')}
          </p>
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            <Link href={href('/about')} className="font-semibold text-white/80 hover:text-white">{t('store.about')}</Link>
            <Link href={href('/contact')} className="font-semibold text-white/80 hover:text-white">{t('store.contact')}</Link>
            <Link href={href('/track-order')} className="font-semibold text-white/80 hover:text-white">{t('store.footer.track')}</Link>
            <LanguageSelector variant="dark" />
          </div>
        </div>
      </div>

      <div className="border-b-2 border-[var(--site-ink)] lg:border-b-0">
        <div className="kv-container flex items-center gap-3 py-3 sm:gap-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-full border-2 border-[var(--site-ink)] p-2 lg:hidden"
            aria-label={t('header.openMenu')}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <Link href={href('/')} className="shrink-0" aria-label="Kavten">
            <Image src="/images/kavten-logo.png" alt="Kavten" width={260} height={137} priority className="h-11 w-auto sm:h-14" />
          </Link>
          <div className="hidden flex-1 md:block">
            <SearchBox />
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href={href(isAuthenticated ? '/account' : '/login')}
              className="flex items-center gap-2 rounded-full border-2 border-[var(--site-ink)] bg-white px-3 py-2 text-sm font-bold hover:bg-[var(--site-yellow)]"
            >
              <UserIcon className="h-5 w-5" />
              <span className="hidden xl:inline">{isAuthenticated ? t('header.myAccount') : t('header.login')}</span>
            </Link>
            <button
              type="button"
              onClick={toggleCart}
              className="relative flex items-center gap-2 rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] px-3 py-2 text-sm font-bold shadow-[3px_3px_0_var(--site-ink)] hover:-translate-y-0.5"
              aria-label={t('header.cart')}
            >
              <ShoppingBagIcon className="h-5 w-5" />
              <span className="hidden sm:inline">{t('store.cart')}</span>
              {mounted && itemCount > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-primary)] px-1 text-[11px] font-extrabold text-white">
                  {itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <div className="kv-container pb-3 md:hidden">
          <SearchBox />
        </div>
      </div>

      <CategoryBar meta={meta} />

      {/* Mobile category strip keeps every category one tap away. */}
      <div className="kv-scrollbar-none overflow-x-auto border-b-2 border-[var(--site-ink)] bg-[var(--site-primary)] lg:hidden">
        <div className="flex w-max gap-2 px-4 py-2.5">
          {STORE_CATEGORIES.map((category) => (
            <Link key={category.slug} href={href(categoryHref(category.slug))} className="rounded-full border-2 border-white/80 px-3 py-1 text-xs font-bold text-white">
              {t(categoryLabelKey(category.slug))}
            </Link>
          ))}
        </div>
      </div>

      {drawerOpen ? <MobileDrawer onClose={() => setDrawerOpen(false)} meta={meta} /> : null}
    </header>
  );
}

export default Header;
