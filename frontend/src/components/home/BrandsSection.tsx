'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { HomepageContent } from '@/types';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';
import { bundledBrandLogo } from '@/lib/brand-logos';

type BrandItem = { name: string; focus: string; href?: string; logo?: string };

const CANONICAL_BRAND_PATHS: Record<string, string> = {
  cison: '/categories/cison',
  enjomor: '/categories/enjomor',
  toyan: '/categories/toyan',
  retrol: '/categories/retrol',
  semto: '/categories/semto',
  teching: '/categories/teching',
};

const DEFAULT_BRANDS: BrandItem[] = [
  { name: 'CISON', focus: 'V8, V12 and inline model engines', href: '/categories/cison' },
  { name: 'ENJOMOR', focus: 'Stirling, radial and multi-cylinder engines', href: '/categories/enjomor' },
  { name: 'TOYAN', focus: 'Inline 4-stroke and RC engines', href: '/categories/toyan' },
  { name: 'RETROL', focus: 'Single and twin-cylinder model engines', href: '/categories/retrol' },
  { name: 'SEMTO', focus: 'Nitro RC car engines and powertrain parts', href: '/categories/semto' },
  { name: 'TECHING', focus: 'Desktop display engines and metal kits', href: '/categories/teching' },
];

function getBrandHref(brand: BrandItem): string {
  const key = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return CANONICAL_BRAND_PATHS[key]
    || brand.href
    || `/products?brand=${encodeURIComponent(brand.name)}`;
}

function parseData(content?: HomepageContent | null) {
  const raw = content?.data;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw as Record<string, unknown>;
}

export default function BrandsSection({ content }: { content?: HomepageContent | null }) {
  const { t, href } = usePublicI18n();
  const data = parseData(content);
  const brands = Array.isArray(data?.brands) && data.brands.length > 0
    ? data.brands as BrandItem[]
    : DEFAULT_BRANDS;
  const title = content?.title || 'Engine Brands We Carry';
  const description = content?.description
    || 'We stock model engines, spare parts and accessories from CISON, ENJOMOR, TOYAN, RETROL, SEMTO, TECHING and more — real working engines for builders and collectors.';
  const buttonText = content?.button_text || 'Browse All Products';
  const buttonUrl = content?.button_url || '/products';
  const kavtenLinks = [
    { label: `Kavten ${t('nav.products')}`, href: '/products' },
    { label: `${t('nav.about')} Kavten`, href: '/about' },
    { label: `Kavten ${t('nav.repair')}`, href: '/repair-request' },
    { label: `${t('nav.contact')} Kavten`, href: '/contact' },
  ];

  return (
    <section id="brands-we-supply" className="home-deferred-section border-y border-slate-200 bg-[var(--site-primary-soft)] py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_2.22fr] lg:px-8">
        <div className="self-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--site-primary)]">Multi-brand supply</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">{description}</p>
          <div className="home-brand-summary mt-6 border-t border-slate-300 pt-5">
            <p className="text-sm leading-6 text-slate-700">
              Search the <strong className="text-slate-950">Kavten</strong> catalogue by manufacturer, model or exact part number, or send the label details to our team for review.
            </p>
            <nav aria-label="Kavten company links" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              {kavtenLinks.map((item) => (
                <Link key={item.href} href={href(item.href)} className="text-[var(--site-primary)] underline decoration-slate-300 underline-offset-4 hover:text-orange-700">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link href={href(buttonUrl)} className="mt-7 inline-flex items-center gap-2 font-bold text-[var(--site-primary)] hover:text-orange-700">
            {buttonText}<span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {brands.slice(0, 15).map((brand) => (
            <Link
              key={brand.name}
              href={href(getBrandHref(brand))}
              aria-label={`${brand.name} model engine parts`}
              className="group flex min-h-32 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              {brand.logo || bundledBrandLogo(brand.name) ? (
                <span className="flex h-10 items-center">
                  <Image
                    src={(brand.logo || bundledBrandLogo(brand.name)) as string}
                    alt=""
                    width={120}
                    height={40}
                    unoptimized
                    loading="lazy"
                    className="h-8 w-auto max-w-[120px] object-contain"
                  />
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg font-black text-[var(--site-primary)]">
                  {brand.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}
                </span>
              )}
              <span>
                <strong className="block text-base text-slate-950 group-hover:text-[var(--site-primary)]">{brand.name}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{brand.focus}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
