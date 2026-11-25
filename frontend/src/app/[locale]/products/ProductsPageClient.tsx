'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ShoppingCartIcon,
  HeartIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import Layout from '@/components/layout/Layout';
import StoreProductCard from '@/components/store/StoreProductCard';
import { STORE_CATEGORIES, categoryHref, categoryLabelKey } from '@/lib/store-catalog';
import SmartPagination from '@/components/ui/SmartPagination';
import CategoryFilterTree from '@/components/categories/CategoryFilterTree';
import { formatCurrency, getDefaultProductImageWithSku, getProductImageUrl, hasProductPrice, productPathSegment } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import { buildProductListingPath, normalizeProductPageSize, PRODUCT_PAGE_SIZES } from '@/lib/product-listing';
import type { Category, Product } from '@/types';

interface ProductsPageClientProps {
  initialData: {
    products: Product[];
    totalPages: number;
    total: number;
    categories: Category[];
    currentPage: number;
    pageSize: number;
    selectedCategory: string;
    searchQuery: string;
    selectedBrand: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ProductsPageClient({ initialData, searchParams }: ProductsPageClientProps) {
  const router = useRouter();
  const { t, href } = usePublicI18n();

  const [searchQuery, setSearchQuery] = useState(initialData.searchQuery);
  const selectedCategory = initialData.selectedCategory;
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const currentPage = initialData.currentPage;
  const pageSize = initialData.pageSize;
  const [favorites, setFavorites] = useState<number[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  const { addItem } = useCartStore();

  useEffect(() => {
    setSearchQuery(initialData.searchQuery);
  }, [initialData.searchQuery]);

  // Client-side sorting only (filtering is done server-side)
  const sortedProducts = [...initialData.products].sort((a, b) => {
    switch (sortBy) {
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'created_at':
        return new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime();
      case 'stock_desc':
        return (b.stock_quantity || 0) - (a.stock_quantity || 0);
      case 'featured':
        // Featured products first, then by name
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return a.name.localeCompare(b.name);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Use server-side pagination data
  const totalPages = initialData.totalPages;
  const totalProducts = initialData.total;

  const handleAddToCart = (product: Product) => {
    if (!hasProductPrice(product)) return;
    addItem(product, 1);
  };

  const toggleFavorite = (productId: number) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const clearAllFilters = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearchQuery('');
    setSortBy('name');

    // Update URL
    router.push(href(buildProductListingPath({}, { page_size: pageSize })));
  };

  // Navigation cancels an older search so it cannot overwrite a new page size.
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      router.push(href(buildProductListingPath(searchParams, { search: value.trim(), page: 1 })), { scroll: false });
    }, 500);
  };



  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    try {
      window.sessionStorage.setItem('products-scroll-y', String(window.scrollY || 0));
    } catch {
      // ignore
    }
    router.push(href(buildProductListingPath(searchParams, {
      category: undefined,
      category_id: categoryId,
      include_descendants: categoryId ? 'true' : undefined,
      search: searchQuery.trim(),
      page: 1,
    })), { scroll: false });
  };

  // Handle pagination with URL update
  const getPageHref = (page: number) => href(buildProductListingPath(searchParams, { page }));
  const handlePageChange = (page: number) => router.push(getPageHref(page), { scroll: false });
  const handlePageSizeChange = (value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    router.push(href(buildProductListingPath(searchParams, {
      page_size: normalizeProductPageSize(value), page: 1, search: searchQuery.trim(),
    })), { scroll: false });
  };



  return (
    <Layout>
      <div className="site-page-shell min-h-screen">
        <div className="kv-dots border-b-2 border-[var(--site-ink)] bg-[var(--site-cream)]">
          <div className="kv-container py-10 lg:py-14">
            <span className="kv-kicker">{t('nav.products')}</span>
            <h1 className="kv-display mt-4 text-4xl font-extrabold text-[var(--site-ink)] sm:text-5xl">
              {initialData.searchQuery ? `“${initialData.searchQuery}”` : t('store.list.title')}
            </h1>
            <p className="mt-3 max-w-2xl text-[var(--site-muted)]">{t('store.list.text')}</p>
            <div className="kv-scrollbar-none -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
              <Link href={href('/products')} className={`kv-chip ${!initialData.searchQuery && !selectedCategory ? 'kv-chip-active' : ''}`}>
                {t('store.allProducts')} <span className="opacity-70">{!initialData.searchQuery && !selectedCategory ? totalProducts : ''}</span>
              </Link>
              {STORE_CATEGORIES.map((category) => (
                <Link key={category.slug} href={href(categoryHref(category.slug))} className="kv-chip">
                  <span aria-hidden>{category.emoji}</span> {t(categoryLabelKey(category.slug))}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="kv-container py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <div className="lg:w-64 space-y-6">
              {/* Search */}
              <div className="site-panel p-6">
                <h3 className="text-lg font-semibold text-slate-950 mb-4">{t('products.search')}</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="site-input block w-full pl-10 pr-3 py-2 leading-5 placeholder-slate-400"
                    placeholder={t('products.searchPlaceholder')}
                  />
                </div>
                {searchQuery && (
                  <div className="mt-2 text-sm text-slate-500">
                    {t('products.searching', { query: searchQuery })}
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="site-panel p-6">
                <h3 className="text-lg font-semibold text-slate-950 mb-4">{t('nav.categories')}</h3>
                <CategoryFilterTree
                  collapsibleOnMobile
                  tree={initialData.categories}
                  selectedCategoryId={selectedCategory ? Number(selectedCategory) : null}
                  onSelectCategory={(id) => handleCategoryChange(id ? String(id) : '')}
                  storageKey="products-category-open-ids"
                  allLabel={t('footer.allProducts')}
                />
              </div>


            </div>

            {/* Main Content */}
            <div className="min-w-0 flex-1">
              {/* Enhanced Toolbar */}
              <div className="site-toolbar mb-6 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Top row - Results info and view controls */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="min-w-0 text-sm text-slate-700">
                        {t('products.showing', { shown: sortedProducts.length, total: totalProducts })}
                        {(searchQuery || selectedCategory) && (
                          <span className="text-slate-500"> ({t('products.filtered')})</span>
                        )}
                      </span>
                      {searchQuery && (
                        <span className="text-sm text-slate-500">
                          {t('products.forQuery', { query: searchQuery })}
                        </span>
                      )}
                    </div>

                    {/* View Mode */}
                    <div className="flex items-center overflow-hidden rounded-md border border-slate-300 bg-white">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`site-icon-toggle ${viewMode === 'grid' ? 'site-icon-toggle-active' : ''}`}
                        title={t('products.gridView')}
                        aria-label={t('products.gridView')}
                      >
                        <Squares2X2Icon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`site-icon-toggle ${viewMode === 'list' ? 'site-icon-toggle-active' : ''}`}
                        title={t('products.listView')}
                        aria-label={t('products.listView')}
                      >
                        <ListBulletIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom row - Sort and page size */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:flex-none">
                      {/* Sort */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="site-select w-full px-3 py-2 text-sm sm:w-auto"
                      >
                        <option value="name">{t('products.sortNameAsc')}</option>
                        <option value="name_desc">{t('products.sortNameDesc')}</option>
                        <option value="price_asc">{t('products.sortPriceAsc')}</option>
                        <option value="price_desc">{t('products.sortPriceDesc')}</option>
                        <option value="created_at">{t('products.sortNewest')}</option>
                        <option value="stock_desc">{t('products.sortStock')}</option>
                        <option value="featured">{t('products.sortFeatured')}</option>
                      </select>
                      <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                        <span>{t('products.show')}</span>
                        <select
                          value={pageSize}
                          onChange={(event) => handlePageSizeChange(event.target.value)}
                          aria-label={t('products.perPage')}
                          className="site-select w-20 px-3 py-2 text-sm"
                        >
                          {PRODUCT_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </label>
                    </div>

                    {/* Clear filters and page info */}
                    <div className="ml-auto flex min-w-0 items-center gap-3">
                      {(searchQuery || selectedCategory) && (
                        <button
                          onClick={clearAllFilters}
                          className="site-link-accent text-sm"
                        >
                          {t('products.clearFilters')}
                        </button>
                      )}
                      <div className="text-sm text-slate-500">
                        {t('products.pageOf', { page: currentPage, total: totalPages })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {sortedProducts.map((product, index) => (
                    <StoreProductCard key={product.id} product={product} priority={index < 4} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedProducts.map((product) => (
                    <div key={product.id} className="site-product-card p-4 sm:p-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <Link href={href(`/products/${productPathSegment(product)}`)} className="flex-shrink-0">
                          <Image
                            src={getProductImageUrl(
                              (product.image_urls && product.image_urls.length > 0) ? product.image_urls : (product.images || []),
                              getDefaultProductImageWithSku(product.sku)
                            )}
                            alt={`${product.name} - ${product.sku} | Professional ${product.category?.name || 'Industrial'} Part | In Stock at Kavten`}
                            width={120}
                            height={120}
                            sizes="120px"
                            className="h-28 w-full object-contain rounded-md border border-slate-200 bg-white p-2 sm:h-24 sm:w-24"
                            loading="lazy"
                          />
                        </Link>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-950 mb-1">
                            <Link href={href(`/products/${productPathSegment(product)}`)} className="site-product-title">

                              {product.name}
                            </Link>
                          </h3>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">SKU: {product.sku}</p>
                          {product.description && (
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-left sm:text-right">
                          <div className="text-xl font-bold text-[var(--site-primary)] mb-2">
                            {hasProductPrice(product) ? formatCurrency(product.price) : (
                              <Link href={href(`/products/${productPathSegment(product)}`)} className="site-primary-action inline-flex max-w-full px-3 py-2 text-center text-sm font-semibold">
                                {t('products.contactForQuote')}
                              </Link>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavorite(product.id)}
                              className="site-secondary-action h-9 w-9"
                            >
                              {favorites.includes(product.id) ? (
                                <HeartIconSolid className="h-5 w-5 text-red-500" />
                              ) : (
                                <HeartIcon className="h-5 w-5" />
                              )}
                            </button>
                            <Link
                              href={href(`/products/${productPathSegment(product)}`)}
                              className="site-secondary-action h-9 w-9"
                              title={`View ${product.name} details`}
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                            {hasProductPrice(product) && (
                              <button
                                onClick={() => handleAddToCart(product)}
                                className="site-primary-action px-4 py-2 text-sm"
                                title={`Add ${product.name} to cart`}
                              >
                                <ShoppingCartIcon className="h-4 w-4 mr-2" />
                                {t('common.addToCart')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Smart Pagination */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <SmartPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    getPageHref={getPageHref}
                  />
                </div>
              )}

              {/* No Products Found */}
              {sortedProducts.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <MagnifyingGlassIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950 mb-2">{t('products.noResults')}</h3>
                  <p className="text-slate-500">{t('store.list.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
