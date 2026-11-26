import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import { getLocalizedMetadataPaths, resolveRouteLocale, type LocaleRouteParams } from '@/lib/i18n/server';
import CommunityShareForm from './CommunityShareForm';

export async function generateMetadata({ params }: { params: LocaleRouteParams }): Promise<Metadata> {
  const locale = await resolveRouteLocale(params);
  const { canonical, languages } = await getLocalizedMetadataPaths(locale, '/community/share', ['en']);
  return {
    title: 'Share your build',
    description: 'Post a build log, first start, mod or teardown to the Kavten Builders’ Workshop. No account required.',
    alternates: { canonical, languages },
    // A blank submission form has nothing to rank for; the threads it produces do.
    robots: { index: false, follow: true },
  };
}

export default async function CommunitySharePage() {
  return (
    <PublicLayout>
      <div className="site-page-shell">
        <section className="kv-hero-soft">
          <div className="kv-dots absolute inset-0 opacity-40" aria-hidden />
          <div className="kv-container kv-hero-soft-inner py-12 sm:py-16">
            <div className="max-w-3xl">
              <span className="kv-kicker">✍️ Builders’ Workshop</span>
              <h1 className="kv-display mt-5 text-3xl font-extrabold leading-tight text-[var(--site-ink)] sm:text-5xl">
                Share your build
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--site-muted)] sm:text-lg">
                No account needed. A few paragraphs, the numbers you measured and one photo are enough to help the next
                owner get their engine running.
              </p>
            </div>
          </div>
        </section>

        <div className="kv-container py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <CommunityShareForm />

            <aside className="space-y-5">
              <div className="kv-card p-5">
                <h2 className="kv-display text-lg font-extrabold">What gets posted instantly</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--site-muted)]">
                  Threads publish straight away. Anything that looks like spam, competitor advertising or personal
                  contact details is held for review, so keep links to your own photos and videos.
                </p>
              </div>
              <div className="kv-card bg-[var(--site-yellow)] p-5">
                <h2 className="kv-display text-lg font-extrabold">A good thread has…</h2>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--site-ink)]/80">
                  <li>• The exact kit and version.</li>
                  <li>• Fuel or voltage, temperature, RPM, break-in hours.</li>
                  <li>• What you tried before it worked.</li>
                  <li>• Photos of the part, not the whole bench.</li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
