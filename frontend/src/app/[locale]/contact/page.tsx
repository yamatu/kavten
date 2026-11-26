import type { Metadata } from 'next';
import ContactPageClient from '@/components/pages/ContactPageClient';
import { getEditablePageData } from '@/services/page-content.server';
import { ensureMetaDescription, withSiteName } from '@/lib/seo';
import { buildPublicRobots, getLocalizedMetadataPaths, resolveRouteLocale, type LocaleRouteParams } from '@/lib/i18n/server';

// "Contact Us | Kavten" is 19 characters — too thin for a result line and too
// generic to rank against support-intent queries, so this route states its own
// title instead of inheriting the short navigation label from the layout.
const CONTACT_TITLE = 'Contact Kavten: Orders, Parts & Repair Help';
const CONTACT_DESCRIPTION =
  'Email Kavten about an order, a part number, a repair or a build question. Send the details and the team replies, usually within one working day.';

export async function generateMetadata({ params }: { params: LocaleRouteParams }): Promise<Metadata> {
  const locale = await resolveRouteLocale(params);
  const { canonical, languages } = await getLocalizedMetadataPaths(locale, '/contact');
  const title = withSiteName(CONTACT_TITLE);
  const description = ensureMetaDescription(CONTACT_DESCRIPTION);
  return {
    title: { absolute: title },
    description,
    robots: buildPublicRobots(locale),
    alternates: { canonical, languages },
    openGraph: { title, description, type: 'website', url: canonical },
  };
}

export default async function Contact() {
  return <ContactPageClient data={await getEditablePageData('contact')} />;
}
