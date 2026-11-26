import PublicLayout from '@/components/layout/PublicLayout';
import HomeHero from '@/components/store/home/HomeHero';
import HomeCategoryTiles from '@/components/store/home/HomeCategoryTiles';
import { CategoryShelf, FeaturedGrid } from '@/components/store/home/HomeShelves';
import { BrandMarquee, GiftBanner, StoreFaq, WhyKavten, WorkshopTeaser } from '@/components/store/home/HomeExtras';
import { generateOrganizationSchema, generateWebsiteSchema } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/url';
import { getSocialMediaURLs } from '@/lib/social-media';
import { getPublicSocialMediaSettings } from '@/services/social-media.server';
import { getStoreCategoryTree, getStoreProducts } from '@/services/storefront.server';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { getLocaleConfig, localizePublicPath, type PublicLocale } from '@/lib/i18n/config';
import { localizeProductContent } from '@/lib/i18n/content';
import { STORE_CATEGORIES } from '@/lib/store-catalog';

const HOME_TITLE = 'Kavten | Working Model Engines, Stirling Engines & RC Kits';
const HOME_DESCRIPTION =
  'Shop working model engines, Stirling and steam engines, nitro RC vehicles, 3D metal kits and spare parts at Kavten. 1,500+ products shipped worldwide.';

export function getHomeTitle(locale: string): string {
  if (locale === 'en') return HOME_TITLE;
  const title = translatePublicMessage(locale as PublicLocale, 'home.hero.title');
  return /\bkavten\b/i.test(title) ? title : `Kavten | ${title}`;
}

export function getHomeDescription(locale: string): string {
  return locale === 'en' ? HOME_DESCRIPTION : translatePublicMessage(locale as PublicLocale, 'home.hero.description');
}

export default async function HomePage({
  locale,
  isAdminPreview = false,
}: {
  locale: PublicLocale;
  isAdminPreview?: boolean;
}) {
  const t = (key: string, vars?: Record<string, string | number>) => translatePublicMessage(locale, key, vars);
  const href = (path: string) => localizePublicPath(path, locale);

  const [tree, featured, all, shelves, socialMediaSettings] = await Promise.all([
    getStoreCategoryTree(),
    getStoreProducts({ is_featured: 'true', page_size: 12 }),
    getStoreProducts({ page_size: 1 }),
    Promise.all(
      STORE_CATEGORIES.map((category) =>
        getStoreProducts({ category_id: category.id, include_descendants: 'true', page_size: 10, sort_by: 'price', sort_dir: 'desc' }),
      ),
    ),
    isAdminPreview ? getPublicSocialMediaSettings({ fresh: true }) : Promise.resolve(null),
  ]);

  const localize = (products: typeof featured.data) => products.map((product) => localizeProductContent(product, locale));
  const childCounts = (slug: string) => {
    const node = tree.find((item) => item.slug === slug);
    return Object.fromEntries((node?.children || []).map((child) => [child.slug, child.product_count || 0]));
  };

  const baseUrl = getSiteUrl();
  const localizedHome = localizePublicPath('/', locale);
  const homepageUrl = `${baseUrl}${localizedHome === '/' ? '' : localizedHome}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      generateOrganizationSchema(getSocialMediaURLs(socialMediaSettings)),
      generateWebsiteSchema(),
      {
        '@type': ['WebPage', 'FAQPage'],
        '@id': `${homepageUrl}#webpage`,
        url: homepageUrl,
        name: getHomeTitle(locale),
        description: getHomeDescription(locale),
        inLanguage: getLocaleConfig(locale).hreflang,
        isPartOf: { '@id': `${baseUrl}/#website` },
        about: { '@id': `${baseUrl}/#organization` },
        mainEntity: [1, 2, 3, 4].map((n) => ({
          '@type': 'Question',
          name: t(`store.faq.q${n}`),
          acceptedAnswer: { '@type': 'Answer', text: t(`store.faq.a${n}`) },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicLayout socialMediaSettings={socialMediaSettings}>
        <HomeHero t={t} href={href} products={localize(featured.data)} total={all.total} />
        <BrandMarquee t={t} href={href} />
        <HomeCategoryTiles t={t} href={href} tree={tree} />
        <FeaturedGrid t={t} href={href} products={localize(featured.data.slice(3))} />
        {STORE_CATEGORIES.map((category, index) => (
          <CategoryShelf
            key={category.slug}
            t={t}
            href={href}
            category={category}
            products={localize(shelves[index].data)}
            total={shelves[index].total}
            childCounts={childCounts(category.slug)}
            index={index}
          />
        ))}
        <WhyKavten t={t} />
        <WorkshopTeaser t={t} href={href} />
        <GiftBanner t={t} href={href} />
        <StoreFaq t={t} />
      </PublicLayout>
    </>
  );
}
