import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/url';

export function generateMetadata(): Metadata {
  return {
    title: 'Customer Login',
    alternates: { canonical: `${getSiteUrl()}/login` },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
