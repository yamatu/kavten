import type { Metadata } from 'next';
import { getLocalizedMetadataPaths, resolveRouteLocale, type LocaleRouteParams } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';

export async function generateMetadata({ params }: { params: LocaleRouteParams }): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths(await resolveRouteLocale(params), '/track-order');
  const title = translatePublicMessage(locale, 'order.trackTitle');
  const description = translatePublicMessage(locale, 'order.trackDescription');
  const socialTitle = `${title} | Kavten`;

  return {
    title,
    description,
    alternates: { canonical, languages },
    // The page is a form with no content of its own; results live under
    // /orders/track/*, which robots.txt already excludes.
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      type: 'website',
      siteName: 'Kavten',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
    },
  };
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
