import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/layout/PublicLayout';
import CategoryProductsClient from '@/components/categories/CategoryProductsClient';
import CategorySidebarTree from '@/components/categories/CategorySidebarTree';
import ScrollRestorer from '@/components/common/ScrollRestorer';
import { CategoryService } from '@/services/category.service';
import { getStoreProducts } from '@/services/storefront.server';
import { getSiteUrl } from '@/lib/url';
import { withSiteName } from '@/lib/seo';
import { buildPublicRobots, getLocalizedMetadataPaths, resolveRouteLocale } from '@/lib/i18n/server';
import { getAvailableTranslationLocales, hasTranslationForLocale, localizeCategoryContent, localizeProductContent } from '@/lib/i18n/content';
import { productPathSegment } from '@/lib/utils';
import { localizePublicPath, type PublicLocale } from '@/lib/i18n/config';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { getCategorySeo } from '@/lib/category-seo';
import { categoryFiltersFromParams } from '@/lib/category-listing';
import type { Category, CategoryNavigationNode } from '@/types';

// Reads searchParams (pagination/filters), so it cannot be ISR-cached; the
// [locale] layout would otherwise treat it as static and fail at runtime.
export const dynamic = 'force-dynamic';

interface CategoryPathPageProps {
  params: Promise<{ locale: string; categoryPath: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function toNavigationCategory(category: Category): CategoryNavigationNode {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    path: category.path,
    sort_order: category.sort_order,
    product_count: category.product_count,
    children: category.children?.map(toNavigationCategory),
  };
}

function categoryLabel(locale: PublicLocale, node: { slug?: string; name: string }): string {
  const key = `cat.${node.slug}`;
  const label = translatePublicMessage(locale, key);
  return label === key ? node.name : label;
}

function absoluteUrl(baseUrl: string, url?: string): string {
  if (!url) return `${baseUrl}/images/og-image.jpg`;
  return /^https?:\/\//i.test(url) ? url : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function generateMetadata({ params, searchParams }: CategoryPathPageProps): Promise<Metadata> {
  try {
    const { categoryPath } = await params;
    const resolvedSearchParams = (await searchParams) || {};
    const rawPage = Array.isArray(resolvedSearchParams.page) ? resolvedSearchParams.page[0] : resolvedSearchParams.page;
    // Deep pages and filtered views repeat page 1's copy in a different order;
    // keep them crawlable but out of the index (canonical stays on the base URL).
    const isDeepPage = Math.max(1, Number.parseInt(rawPage || '1', 10) || 1) > 1;
    const FILTER_PARAMS = ['brand', 'sort_by', 'sort_dir', 'min_price', 'max_price', 'search', 'tag', 'q', 'page_size'];
    const hasFilterParams = FILTER_PARAMS.some((key) => {
      const value = resolvedSearchParams[key];
      return Array.isArray(value) ? value.some(Boolean) : Boolean(value);
    });
    const locale = await resolveRouteLocale(params);
    const path = (categoryPath || []).join('/');
    const resolved = await CategoryService.getCategoryByPath(path);
    const hasRequestedTranslation = hasTranslationForLocale(resolved.category.translations, locale);
    const category = localizeCategoryContent(resolved.category, hasRequestedTranslation ? locale : 'en');
    const urlPath = category.path ? `/categories/${category.path}` : `/categories/${path}`;
    const { canonical: localizedCanonical, languages } = await getLocalizedMetadataPaths(
      locale,
      urlPath,
      getAvailableTranslationLocales(resolved.category.translations),
    );
    const baseUrl = getSiteUrl();
    const canonical = hasRequestedTranslation ? localizedCanonical : `${baseUrl}${localizePublicPath(urlPath, 'en')}`;
    const seo = getCategorySeo(category.slug);
    const title = seo?.title || category.name;
    const description = seo?.description || category.description;
    const image = absoluteUrl(baseUrl, category.image_url);
    const indexable = hasRequestedTranslation && !isDeepPage && !hasFilterParams;
    return {
      title,
      description,
      robots: indexable ? buildPublicRobots(locale) : { index: false, follow: true },
      openGraph: {
        title: withSiteName(title),
        description,
        type: 'website',
        url: canonical,
        images: [{ url: image, alt: seo?.h1 || category.name }],
      },
      twitter: { card: 'summary_large_image', title: withSiteName(title), description, images: [image] },
      alternates: { canonical, languages },
    };
  } catch {
    return { title: 'Category', description: 'Browse model engines, RC vehicles and kits by category.' };
  }
}

export default async function CategoryPathPage({ params, searchParams }: CategoryPathPageProps) {
  const { categoryPath } = await params;
  const locale = await resolveRouteLocale(params);
  const searchParamsResolved = await searchParams;
  const path = (categoryPath || []).join('/');

  let resolved: { category: Category; breadcrumb: Category[] } | null = null;
  try {
    resolved = await CategoryService.getCategoryByPath(path);
  } catch {
    resolved = null;
  }
  if (!resolved?.category) notFound();

  if (resolved.category.path && resolved.category.path !== path) {
    permanentRedirect(localizePublicPath(`/categories/${resolved.category.path}`, locale));
  }

  const contentLocale = hasTranslationForLocale(resolved.category.translations, locale) ? locale : 'en';
  const category = localizeCategoryContent(resolved.category, contentLocale);
  const breadcrumb = (resolved.breadcrumb || []).map((item) => localizeCategoryContent(item, contentLocale));
  const seo = getCategorySeo(category.slug);
  const label = (node: { slug?: string; name: string }) => categoryLabel(locale, node);
  const heading = locale === 'en' && seo ? seo.h1 : label(category);
  const href = (p: string) => localizePublicPath(p, locale);

  const filters = categoryFiltersFromParams(category.id, searchParamsResolved);
  const [categories, firstPage] = await Promise.all([
    CategoryService.getCategories(),
    getStoreProducts(filters),
  ]);
  const initialPage = { ...firstPage, data: firstPage.data.map((product) => localizeProductContent(product, locale)) };

  const tree = categories.map((item) => localizeCategoryContent(item, locale)).map(toNavigationCategory);
  const findNode = (nodes: CategoryNavigationNode[], id: number): CategoryNavigationNode | null => {
    for (const node of nodes) {
      if (Number(node.id) === Number(id)) return node;
      const hit = findNode(node.children || [], id);
      if (hit) return hit;
    }
    return null;
  };
  const currentNode = findNode(tree, category.id);
  const parentNode = category.parent_id ? findNode(tree, category.parent_id) : null;
  const chipNodes = currentNode?.children?.length ? currentNode.children : (parentNode?.children || []);
  const breadcrumbIds = breadcrumb.map((c) => Number(c.id)).filter((n) => Number.isFinite(n) && n > 0);

  const baseUrl = getSiteUrl();
  const categoryUrl = `${baseUrl}${href(`/categories/${category.path || category.slug}`)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${categoryUrl}#collection`,
        name: seo?.h1 || category.name,
        description: seo?.description || category.description,
        url: categoryUrl,
        isPartOf: { '@id': `${baseUrl}/#website` },
        ...(category.image_url ? { primaryImageOfPage: absoluteUrl(baseUrl, category.image_url) } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: firstPage.total,
          itemListElement: initialPage.data.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: product.name,
            url: `${baseUrl}${href(`/products/${productPathSegment(product)}`)}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: translatePublicMessage(locale, 'common.home'), item: `${baseUrl}${href('/')}` },
          ...breadcrumb.map((bc, idx) => ({
            '@type': 'ListItem',
            position: idx + 2,
            name: label(bc),
            item: `${baseUrl}${href(`/categories/${bc.path || bc.slug}`)}`,
          })),
        ],
      },
      ...(seo ? [{
        '@type': 'FAQPage',
        mainEntity: seo.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      }] : []),
    ],
  };

  return (
    <PublicLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ScrollRestorer storageKey="category-scroll-y" />
      <div className="site-page-shell min-h-screen">
        <div className="kv-dots border-b-2 border-[var(--site-ink)] bg-[var(--site-cream)]">
          <div className="kv-container py-10 lg:py-14">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[var(--site-muted)]">
                <li><a href={href('/')} className="hover:text-[var(--site-primary)]">{translatePublicMessage(locale, 'common.home')}</a></li>
                {breadcrumb.map((bc) => (
                  <li key={bc.id} className="flex items-center gap-2">
                    <span aria-hidden>/</span>
                    <a
                      href={href(`/categories/${bc.path || bc.slug}`)}
                      className={bc.id === category.id ? 'text-[var(--site-ink)]' : 'hover:text-[var(--site-primary)]'}
                    >
                      {label(bc)}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <h1 className="kv-display mt-4 text-4xl font-extrabold text-[var(--site-ink)] sm:text-6xl">{heading}</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-[var(--site-muted)]">
              {seo?.intro[0] || category.description}
            </p>
            {chipNodes.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {parentNode ? (
                  <a href={href(`/categories/${parentNode.path || parentNode.slug}`)} className="kv-chip">
                    ← {label(parentNode)}
                  </a>
                ) : null}
                {chipNodes.map((node) => (
                  <a
                    key={node.id}
                    href={href(`/categories/${node.path || node.slug}`)}
                    className={`kv-chip ${node.id === category.id ? 'kv-chip-active' : ''}`}
                  >
                    {label(node)}
                    {node.product_count ? <span className="opacity-60">{node.product_count}</span> : null}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="kv-container py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[256px_minmax(0,1fr)]">
            <aside className="min-w-0">
              <div className="site-panel p-4 lg:sticky lg:top-28">
                <div className="mb-3 border-b border-slate-200 pb-3 text-sm font-semibold uppercase tracking-wide text-slate-900">{translatePublicMessage(locale, 'nav.categories')}</div>
                <CategorySidebarTree
                  tree={tree}
                  activeCategoryId={category.id}
                  defaultOpenIds={breadcrumbIds}
                  storageKey="category-sidebar-open-ids"
                />
              </div>
            </aside>

            <section className="min-w-0">
              <CategoryProductsClient category={category} initialSearchParams={searchParamsResolved} initialPage={initialPage} />

              {seo ? (
                <div className="mt-12 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                  <section className="kv-card p-6 sm:p-8" aria-labelledby="category-guide-heading">
                    <h2 id="category-guide-heading" className="kv-display text-2xl font-extrabold">{`About ${seo.h1}`}</h2>
                    {seo.intro.slice(1).map((paragraph) => (
                      <p key={paragraph.slice(0, 24)} className="mt-4 leading-7 text-[var(--site-muted)]">{paragraph}</p>
                    ))}
                    <h3 className="kv-display mt-6 text-lg font-extrabold">How to choose</h3>
                    <ul className="mt-3 space-y-3">
                      {seo.guide.map(([title, text]) => (
                        <li key={title} className="flex gap-3 text-sm leading-6">
                          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--site-primary)]" aria-hidden />
                          <span><strong className="text-[var(--site-ink)]">{title}:</strong> <span className="text-[var(--site-muted)]">{text}</span></span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="kv-card p-6 sm:p-8" aria-labelledby="category-faq-heading">
                    <h2 id="category-faq-heading" className="kv-display text-2xl font-extrabold">{`${seo.h1}: FAQ`}</h2>
                    <div className="mt-4 divide-y-2 divide-dashed divide-[var(--site-line)]">
                      {seo.faqs.map((faq, index) => (
                        <details key={faq.q} className="group py-4" open={index === 0}>
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-bold text-[var(--site-ink)]">
                            {faq.q}
                            <span className="mt-0.5 text-[var(--site-primary)] transition-transform group-open:rotate-45" aria-hidden>+</span>
                          </summary>
                          <p className="mt-2 text-sm leading-7 text-[var(--site-muted)]">{faq.a}</p>
                        </details>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
