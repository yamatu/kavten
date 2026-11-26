import { getRequestBaseUrl } from '@/lib/request-url'
import { NextResponse } from 'next/server'
import { renderLocalizedSitemap } from '@/lib/i18n/sitemap'
import { ACTIVE_PUBLIC_LOCALES } from '@/lib/i18n/config'

export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 24 hours

// Use a stable deployment/content baseline for pages without a database-backed
// modification timestamp. A request timestamp falsely tells crawlers that every
// static page changed each time they fetch the sitemap.
const STATIC_CONTENT_LAST_MODIFIED = process.env.SITEMAP_STATIC_LAST_MODIFIED || '2026-11-13T00:00:00.000Z'
const HOME_CONTENT_LAST_MODIFIED = process.env.SITEMAP_HOME_LAST_MODIFIED || '2026-11-13T00:00:00.000Z'
// Only English is published; the renderer emits one <url> per active locale.
const ENGLISH_ONLY = ACTIVE_PUBLIC_LOCALES

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  const lastModified = new Date(STATIC_CONTENT_LAST_MODIFIED).toISOString()
  const homeLastModified = new Date(HOME_CONTENT_LAST_MODIFIED).toISOString()

  // Every entry is English-only: the storefront serves one language, so a
  // second locale here would advertise a duplicate of the same page.
  const staticPages = [
    {
      pathname: '/',
      lastModified: homeLastModified,
      changeFrequency: 'daily',
      priority: '1.0',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/products',
      lastModified,
      changeFrequency: 'hourly',
      priority: '0.9',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/categories',
      lastModified,
      changeFrequency: 'daily',
      priority: '0.85',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/about',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.8',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/contact',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.8',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/faq',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.6',
      availableLocales: ENGLISH_ONLY,
    },
    {
      // Thread URLs live in /sitemap-community.xml; this entry is the board itself.
      pathname: '/community',
      lastModified,
      changeFrequency: 'daily',
      priority: '0.7',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/privacy',
      lastModified,
      changeFrequency: 'yearly',
      priority: '0.4',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/terms',
      lastModified,
      changeFrequency: 'yearly',
      priority: '0.4',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/warranty-policy',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/shipping-policy',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
      availableLocales: ENGLISH_ONLY,
    },
    {
      pathname: '/returns',
      lastModified,
      changeFrequency: 'monthly',
      priority: '0.5',
      availableLocales: ENGLISH_ONLY,
    },
  ]

  const sitemap = renderLocalizedSitemap(baseUrl, staticPages)

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
