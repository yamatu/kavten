import Image from 'next/image';
import Link from 'next/link';
import { BrandMarquee, GiftBanner, WhyKavten } from '@/components/store/home/HomeExtras';
import { getSiteUrl } from '@/lib/url';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import { localizePublicPath, type PublicLocale } from '@/lib/i18n/config';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { getStoreCategoryTree } from '@/services/storefront.server';
import { STORE_CATEGORIES, categoryHref, categoryLabelKey } from '@/lib/store-catalog';
import { createPageText, type PageData } from '@/lib/page-content';
import { ABOUT_PAGE_SCHEMA } from '@/lib/page-content-schema';

export const ABOUT_DESCRIPTION =
  'Kavten is a hobby store for working model engines, Stirling and steam engines, RC vehicles, 3D metal kits and spare parts, shipped worldwide.';

// Admin-entered URLs may point at hosts outside next.config images.remotePatterns.
const isExternal = (src: string) => /^https?:\/\//i.test(src);

// Store copy keys shown by the shared homepage blocks, mapped to the admin fields that replace them.
const SHARED_BLOCK_FIELDS: Record<string, string> = {
  'store.why.title': 'whyTitle',
  'store.why.1.title': 'why1Title',
  'store.why.1.text': 'why1Text',
  'store.why.2.title': 'why2Title',
  'store.why.2.text': 'why2Text',
  'store.why.3.title': 'why3Title',
  'store.why.3.text': 'why3Text',
  'store.why.4.title': 'why4Title',
  'store.why.4.text': 'why4Text',
  'store.gift.title': 'giftTitle',
  'store.gift.text': 'giftText',
  'store.gift.cta': 'giftCta',
};

export default async function AboutPageView({ locale, data }: { locale: PublicLocale; data: PageData }) {
  const baseUrl = getSiteUrl();
  const t = (key: string, vars?: Record<string, string | number>) => translatePublicMessage(locale, key, vars);
  const text = createPageText(ABOUT_PAGE_SCHEMA, data, locale, (key) => translatePublicMessage(locale, key));
  const blockT = (key: string, vars?: Record<string, string | number>) => (SHARED_BLOCK_FIELDS[key] ? text(SHARED_BLOCK_FIELDS[key]) : t(key, vars));
  const href = (path: string) => localizePublicPath(path, locale);
  const tree = await getStoreCategoryTree();
  const bySlug = new Map(tree.map((node) => [node.slug, node]));
  const total = tree.reduce((sum, node) => sum + (node.product_count || 0), 0);
  const heroImage = text('heroImage');
  const storyTitle = text('storyTitle');
  const storyText = text('storyText');
  const storyImage = text('storyImage');

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        name: text('heroTitle'),
        description: ABOUT_DESCRIPTION,
        url: `${baseUrl}${href('/about')}`,
        mainEntity: { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: 'Kavten', url: baseUrl },
      },
      generateBreadcrumbSchema([
        { name: t('common.home'), url: `${baseUrl}${href('/')}` },
        { name: t('nav.about'), url: `${baseUrl}${href('/about')}` },
      ]),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="kv-dots border-b-2 border-[var(--site-ink)] bg-[var(--site-cream)]">
        <div className="kv-container grid items-center gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
          <div>
            <span className="kv-kicker">{text('heroKicker')}</span>
            <h1 className="kv-display mt-5 text-5xl font-extrabold leading-[1.02] text-[var(--site-ink)] sm:text-6xl">{text('heroTitle')}</h1>
            <p className="mt-5 max-w-xl text-xl font-semibold text-[var(--site-ink)]">{text('heroSubtitle')}</p>
            <p className="mt-3 max-w-xl whitespace-pre-line text-lg leading-8 text-[var(--site-muted)]">{text('heroText')}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href={href('/products')} className="kv-btn kv-btn-red">{t('store.hero.cta')} →</Link>
              <Link href={href('/contact')} className="kv-btn kv-btn-white">{t('store.contact')}</Link>
            </div>
          </div>
          <div className="kv-card flex flex-col items-center gap-6 bg-white p-8">
            <div className="relative aspect-[16/10] w-full max-w-sm">
              <Image src={heroImage} alt={text('heroTitle')} fill sizes="(min-width: 1024px) 380px, 90vw" className="object-contain" priority unoptimized={isExternal(heroImage)} />
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] p-3">
                <div className="kv-display text-3xl font-extrabold">{total > 0 ? total.toLocaleString('en-US') : '1,500'}+</div>
                <div className="text-xs font-bold">{t('store.hero.stat1')}</div>
              </div>
              <div className="rounded-xl border-2 border-[var(--site-ink)] bg-[var(--site-primary-soft)] p-3">
                <div className="kv-display text-3xl font-extrabold">{STORE_CATEGORIES.length}</div>
                <div className="text-xs font-bold">{t('store.hero.stat2')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BrandMarquee t={t} href={href} />

      {storyTitle || storyText ? (
        <section className="bg-[var(--site-cream)] py-16">
          <div className={`kv-container grid items-center gap-10 ${storyImage ? 'lg:grid-cols-2' : ''}`}>
            <div className="max-w-3xl">
              {storyTitle ? <h2 className="kv-display text-4xl font-extrabold text-[var(--site-ink)]">{storyTitle}</h2> : null}
              {storyText ? <p className="mt-5 whitespace-pre-line text-lg leading-8 text-[var(--site-muted)]">{storyText}</p> : null}
            </div>
            {storyImage ? (
              <div className="kv-card relative aspect-[4/3] overflow-hidden">
                <Image src={storyImage} alt={storyTitle || text('heroTitle')} fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" unoptimized={isExternal(storyImage)} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="bg-white py-16">
        <div className="kv-container">
          <h2 className="kv-display text-4xl font-extrabold text-[var(--site-ink)]">{text('catsTitle')}</h2>
          <p className="mt-3 max-w-xl whitespace-pre-line text-[var(--site-muted)]">{text('catsText')}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STORE_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={href(categoryHref(category.slug))}
                className="kv-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5"
                style={{ background: category.tone }}
              >
                <span className="text-3xl" aria-hidden>{category.emoji}</span>
                <span>
                  <span className="block font-extrabold">{t(categoryLabelKey(category.slug))}</span>
                  {bySlug.get(category.slug)?.product_count ? (
                    <span className="text-xs font-semibold text-[var(--site-muted)]">
                      {t('store.cats.items', { count: bySlug.get(category.slug)?.product_count || 0 })}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <WhyKavten t={blockT} />
      <GiftBanner t={blockT} href={href} />
    </>
  );
}
