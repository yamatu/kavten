import EditableSitePage, { buildEditablePageMetadata } from '@/components/content/EditableSitePage';
import { resolveRouteLocale, type LocaleRouteParams } from '@/lib/i18n/server';

export const revalidate = 600;

export async function generateMetadata({ params }: { params: LocaleRouteParams }) {
  const metadata = await buildEditablePageMetadata('technical-support', await resolveRouteLocale(params));
  // Legacy service page from the previous catalogue; kept reachable, not indexed.
  return { ...metadata, robots: { index: false, follow: true } };
}

export default async function Page({ params }: { params: LocaleRouteParams }) {
  return <EditableSitePage pageKey="technical-support" locale={await resolveRouteLocale(params)} />;
}
