import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { COMPANY_FACTS } from '@/lib/company-facts';
import { localizePublicPath, type PublicLocale } from '@/lib/i18n/config';

export type HomepageBrandFAQ = {
  question: string;
  answer: string;
};

export const HOMEPAGE_BRAND_FAQS: HomepageBrandFAQ[] = [
  {
    question: 'What is Kavten?',
    answer:
      'Kavten is a dedicated model engine and RC parts store. We stock miniature model engines, RC vehicles, Stirling engines, 3D assembly kits and spare parts from CISON, ENJOMOR, TOYAN, RETROL, SEMTO, TECHING and 15+ other brands — with worldwide shipping.',
  },
  {
    question: 'What kinds of engines does Kavten sell?',
    answer:
      'We carry V4, V8, V12, inline, radial, Stirling, vacuum and nitro model engines — real working mechanical engines at hobby scale. Brands include CISON, ENJOMOR, TOYAN, RETROL, SEMTO and more.',
  },
  {
    question: 'Does Kavten sell spare parts for model engines?',
    answer:
      'Yes. We stock engine-specific spare parts including clutches, exhaust systems, Bluetooth control modules, fuel components and electronic accessories for all major brands we carry.',
  },
  {
    question: 'Does Kavten sell RC vehicles?',
    answer:
      'Yes. We carry nitro-powered RC cars and crawlers with real fuel engines, 4WD chassis and water-cooling systems — available as RTR (ready-to-run) and kit versions.',
  },
  {
    question: 'Does Kavten ship worldwide?',
    answer:
      'Yes. We ship to 50+ countries with tracked services and secure export packaging. Dispatch notifications with tracking numbers are sent by email after every order.',
  },
];

const capabilities = [
  {
    title: 'Real working model engines',
    description:
      'Every engine in our catalog is a genuine working mechanical model — V4, V8, V12, inline, radial, Stirling and nitro configurations from leading hobby brands.',
    icon: CheckBadgeIcon,
  },
  {
    title: 'Engine-specific spare parts',
    description:
      'Clutches, exhaust systems, Bluetooth controllers, fuel components and electronic accessories matched to the exact engine brand and model.',
    icon: MagnifyingGlassIcon,
  },
  {
    title: 'RC vehicles and powertrains',
    description:
      'Nitro-powered RC cars, crawlers and helicopters with real fuel engines — available as RTR and kit versions with full spare parts support.',
    icon: WrenchScrewdriverIcon,
  },
  {
    title: 'Worldwide shipping',
    description:
      'We ship to 50+ countries with tracked services and secure export packaging from our warehouse.',
    icon: GlobeAltIcon,
  },
];

export default function HomeBrandAuthoritySection({
  locale,
  primaryHeading = false,
}: {
  locale: PublicLocale;
  primaryHeading?: boolean;
}) {
  if (locale !== 'en') return null;

  const localizedHref = (path: string) => localizePublicPath(path, locale);

  return (
    <>
      <section id="about-kavten" className="home-brand-summary border-b border-slate-200 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase text-[var(--site-primary)]">Kavten company profile</p>
              {primaryHeading ? (
                <h1 className="mt-3 max-w-3xl text-3xl font-black text-slate-950 sm:text-4xl">
                  What is Kavten?
                </h1>
              ) : (
                <h2 className="mt-3 max-w-3xl text-3xl font-black text-slate-950 sm:text-4xl">
                  What is Kavten?
                </h2>
              )}
              <p className="entity-summary mt-5 max-w-3xl text-lg leading-8 text-slate-700">
                Kavten is a dedicated model engine and RC parts store stocking miniature working engines,
                RC vehicles, Stirling engines, 3D assembly kits and spare parts from CISON, ENJOMOR,
                TOYAN, RETROL, SEMTO, TECHING and 15+ other brands — with worldwide shipping.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Our catalog covers {COMPANY_FACTS.engineBrands}+ engine brands and over {COMPANY_FACTS.productCount.toLocaleString()} products.
                Whether you are building your first desktop engine, upgrading an RC car, or hunting for a
                spare part for an existing model, Kavten has what you need.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={localizedHref('/products')}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--site-primary)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--site-primary-strong)]"
                >
                  Browse engine parts
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href={localizedHref('/contact?inquiry_type=quote')}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition-colors hover:border-[var(--site-primary)] hover:text-[var(--site-primary)]"
                >
                  Request a model check
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-2 border-y border-slate-300">
              <div className="border-b border-r border-slate-300 py-6 pr-5">
                <dt className="text-sm font-semibold text-slate-500">Products</dt>
                <dd className="mt-2 text-2xl font-black text-slate-950">{COMPANY_FACTS.productCount.toLocaleString()}+</dd>
              </div>
              <div className="border-b border-slate-300 py-6 pl-5">
                <dt className="text-sm font-semibold text-slate-500">Engine brands</dt>
                <dd className="mt-2 text-2xl font-black text-slate-950">
                  {COMPANY_FACTS.engineBrands}+
                </dd>
              </div>
              <div className="border-r border-slate-300 py-6 pr-5">
                <dt className="text-sm font-semibold text-slate-500">Ships to</dt>
                <dd className="mt-2 text-2xl font-black text-slate-950">50+ countries</dd>
              </div>
              <div className="py-6 pl-5">
                <dt className="text-sm font-semibold text-slate-500">Engines</dt>
                <dd className="mt-2 text-base font-bold leading-6 text-slate-950">Real working models</dd>
              </div>
            </dl>
          </div>

          <div className="mt-14 grid border-t border-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ title, description, icon: Icon }, index) => (
              <div
                key={title}
                className={`py-7 sm:px-6 ${index % 2 === 0 ? 'sm:border-r' : ''} ${index > 1 ? 'border-t lg:border-t-0' : ''} lg:border-r lg:last:border-r-0 border-slate-300 first:pl-0 last:pr-0`}
              >
                <Icon className="h-6 w-6 text-orange-700" aria-hidden="true" />
                <h3 className="mt-4 text-base font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="kavten-faq" className="border-b border-slate-200 bg-[#f3f6f8] py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--site-primary)]">Kavten FAQ</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Questions about Kavten</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Direct answers about our company, supported manufacturers, model verification and international supply.
            </p>
            <Link
              href={localizedHref('/about')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--site-primary)] underline decoration-slate-300 underline-offset-4 hover:text-orange-700"
            >
              Read the full company profile
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="border-t border-slate-300">
            {HOMEPAGE_BRAND_FAQS.map((item, index) => (
              <details key={item.question} className="group border-b border-slate-300 py-1" open={index === 0}>
                <summary className="cursor-pointer py-5 pr-6 text-base font-bold leading-6 text-slate-950 marker:text-[var(--site-primary)]">
                  {item.question}
                </summary>
                <p className="faq-answer max-w-3xl pb-5 pr-6 text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
