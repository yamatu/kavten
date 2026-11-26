'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { DEFAULT_PUBLIC_LOCALE, localizePublicPath, type PublicLocale } from '@/lib/i18n/config';

/**
 * Route-level boundary for the storefront.
 *
 * Catalog reads throw when the backend is unreachable (see
 * `StorefrontUnavailableError`) instead of rendering an empty shop, so this is
 * the page a visitor gets during a deploy or a database restart. It has to be
 * honest about that - an empty grid would look like \"sold out forever\" - and
 * offer a retry that re-runs the same render.
 */
export default function StorefrontError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('storefront route error', error);
  }, [error]);

  const unavailable = error.name === 'StorefrontUnavailableError' || error.message.includes('Storefront unavailable');
  const params = useParams<{ locale?: string }>();
  const locale = (params?.locale || DEFAULT_PUBLIC_LOCALE) as PublicLocale;
  const href = (path: string) => localizePublicPath(path, locale);

  return (
    <main className="bg-[var(--site-cream)]">
      <div className="kv-container flex min-h-[70vh] flex-col justify-center py-20">
        <span className="kv-kicker">Kavten</span>
        <h1 className="kv-display mt-5 max-w-2xl text-4xl font-extrabold leading-tight text-[var(--site-ink)] sm:text-5xl">
          {unavailable ? 'The shop is catching its breath' : 'Something broke on our side'}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--site-muted)]">
          {unavailable
            ? 'We could not load the shelves just now - usually a short deploy or a database restart. Nothing is wrong with your order or your account.'
            : 'This page failed to load. Trying again usually clears it.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => reset()} className="kv-btn kv-btn-red">
            Try again
          </button>
          <Link href={href('/products')} className="kv-btn kv-btn-white border-2">
            Browse all products
          </Link>
          <Link href={href('/contact')} className="kv-btn kv-btn-white border-2">
            Contact us
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-8 text-xs font-semibold text-[var(--site-muted)]">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
