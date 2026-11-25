import type { Metadata } from 'next';
import PublicLayout from '@/components/layout/PublicLayout';
import AboutPageView, { ABOUT_DESCRIPTION } from '@/components/pages/AboutPageView';
import { withSiteName } from '@/lib/seo';
import { getLocalizedMetadataPaths, resolveRouteLocale, type LocaleRouteParams } from '@/lib/i18n/server';
import { translatePublicMessage } from '@/lib/i18n/messages';
import { getEditablePageData } from '@/services/page-content.server';

export async function generateMetadata({ params }: { params: LocaleRouteParams }): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths(await resolveRouteLocale(params), '/about');
  const title = translatePublicMessage(locale, 'about.title');
  return {
    title,
    description: ABOUT_DESCRIPTION,
    alternates: { canonical, languages },
    openGraph: { title: withSiteName(title), description: ABOUT_DESCRIPTION, url: canonical, type: 'website' },
  };
}

export default async function About({ params }: { params: LocaleRouteParams }) {
  const locale = await resolveRouteLocale(params);
  return (
    <PublicLayout>
      <AboutPageView locale={locale} data={await getEditablePageData('about')} />
    </PublicLayout>
  );
}
