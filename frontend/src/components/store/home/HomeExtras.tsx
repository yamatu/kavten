import Link from 'next/link';
import { CogIcon, WrenchScrewdriverIcon, CubeTransparentIcon, LockClosedIcon, PlusIcon } from '@heroicons/react/24/outline';
import { STORE_BRANDS } from '@/lib/store-catalog';

type T = (key: string, vars?: Record<string, string | number>) => string;

export function BrandMarquee({ t, href }: { t: T; href: (p: string) => string }) {
  const brands = [...STORE_BRANDS, ...STORE_BRANDS];
  return (
    <section className="overflow-hidden border-y-2 border-[var(--site-ink)] bg-[var(--site-yellow)] py-5" aria-label={t('store.brands.title')}>
      <div className="kv-marquee gap-4">
        {brands.map((brand, index) => (
          <Link
            key={`${brand}-${index}`}
            href={href(`/products?search=${encodeURIComponent(brand)}`)}
            className="kv-display flex items-center gap-4 whitespace-nowrap px-2 text-2xl font-extrabold text-[var(--site-ink)] hover:text-[var(--site-primary)] sm:text-3xl"
            tabIndex={index >= STORE_BRANDS.length ? -1 : undefined}
          >
            {brand}
            <span className="text-[var(--site-primary)]" aria-hidden>✦</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const WHY = [
  { icon: CogIcon, key: '1', tone: '#FDE7E4' },
  { icon: WrenchScrewdriverIcon, key: '2', tone: '#FFF1CC' },
  { icon: CubeTransparentIcon, key: '3', tone: '#E3F3EC' },
  { icon: LockClosedIcon, key: '4', tone: '#E4F1F8' },
];

export function WhyKavten({ t }: { t: T }) {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="kv-container">
        <h2 className="kv-display max-w-2xl text-4xl font-extrabold text-[var(--site-ink)] sm:text-5xl">{t('store.why.title')}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, key, tone }) => (
            <div key={key} className="kv-card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[var(--site-ink)]" style={{ background: tone }}>
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="kv-display mt-5 text-xl font-extrabold">{t(`store.why.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">{t(`store.why.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GiftBanner({ t, href }: { t: T; href: (p: string) => string }) {
  return (
    <section className="bg-[var(--site-cream)] py-16">
      <div className="kv-container">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-[var(--site-ink)] bg-[var(--site-primary)] px-6 py-12 text-white shadow-[8px_8px_0_var(--site-ink)] sm:px-12">
          <div className="kv-dots-light absolute inset-0" aria-hidden />
          <div className="pointer-events-none absolute -right-10 -top-10 text-[12rem] leading-none opacity-20" aria-hidden>🎁</div>
          <div className="relative max-w-2xl">
            <h2 className="kv-display text-4xl font-extrabold sm:text-5xl">{t('store.gift.title')}</h2>
            <p className="mt-4 text-lg leading-8 text-white/85">{t('store.gift.text')}</p>
            <Link href={href('/contact')} className="kv-btn kv-btn-yellow mt-8">{t('store.gift.cta')} →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreFaq({ t }: { t: T }) {
  const items = [1, 2, 3, 4];
  return (
    <section id="kavten-faq" className="bg-white py-16 lg:py-20">
      <div className="kv-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <h2 className="kv-display text-4xl font-extrabold text-[var(--site-ink)] sm:text-5xl">{t('store.faq.title')}</h2>
        <div className="space-y-3">
          {items.map((n) => (
            <details key={n} className="group kv-card overflow-hidden" open={n === 1}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-bold">
                {t(`store.faq.q${n}`)}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] transition-transform group-open:rotate-45">
                  <PlusIcon className="h-4 w-4" />
                </span>
              </summary>
              <p className="faq-answer border-t-2 border-dashed border-[var(--site-line)] px-5 py-4 text-sm leading-7 text-[var(--site-muted)]">{t(`store.faq.a${n}`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Home teaser for /community. Deliberately static: the storefront home page is
 * cached for five minutes and must not fail (or slow down) when the forum
 * database is cold, so this band only links out instead of fetching threads.
 */
export function WorkshopTeaser({ t, href }: { t: T; href: (p: string) => string }) {
  const boards = [
    { emoji: '🏁', label: t('store.workshop.board.show'), href: '/community?category=show-tell' },
    { emoji: '🔥', label: t('store.workshop.board.first'), href: '/community?category=first-start' },
    { emoji: '🛠️', label: t('store.workshop.board.fix'), href: '/community?category=troubleshooting' },
  ];
  return (
    <section className="bg-white py-16" aria-labelledby="kavten-workshop">
      <div className="kv-container">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-[var(--site-ink)] bg-[var(--site-yellow)] px-6 py-10 shadow-[8px_8px_0_var(--site-ink)] sm:px-10 sm:py-12">
          <div className="kv-dots absolute inset-0 opacity-40" aria-hidden />
          <div className="pointer-events-none absolute -bottom-14 -right-8 text-[11rem] leading-none opacity-25" aria-hidden>🔧</div>
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <span className="kv-kicker bg-white">{t('store.workshop.kicker')}</span>
              <h2 id="kavten-workshop" className="kv-display mt-4 text-4xl font-extrabold text-[var(--site-ink)] sm:text-5xl">
                {t('store.workshop.title')}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-[var(--site-ink)]/75">{t('store.workshop.text')}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={href('/community')} className="kv-btn kv-btn-red">{t('store.workshop.cta')} →</Link>
                <Link href={href('/community/share')} className="kv-btn kv-btn-white">{t('store.workshop.cta2')}</Link>
              </div>
            </div>
            <ul className="space-y-3">
              {boards.map((board) => (
                <li key={board.href}>
                  <Link
                    href={href(board.href)}
                    className="flex items-center gap-3 rounded-2xl border-2 border-[var(--site-ink)] bg-white px-4 py-3 font-bold text-[var(--site-ink)] shadow-[3px_3px_0_var(--site-ink)] transition-transform hover:-translate-y-0.5"
                  >
                    <span className="text-xl" aria-hidden>{board.emoji}</span>
                    {board.label}
                    <span className="ml-auto text-[var(--site-primary)]" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
