import type { MetadataRoute } from 'next'
import { COLLECTIONS, chapterHref } from '@/lib/library'
import { PLANS } from '@/lib/plans'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

// Empty until NEXT_PUBLIC_SITE_URL is set, because a sitemap needs absolute URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return []
  const pages = ['/', '/read/', '/feed/', '/plans/', '/search/', '/about/']
  const plans = PLANS.map((p) => `/plans/${p.id}/`)
  const collections = COLLECTIONS.map((c) => `/read/${c.id}/`)
  const chapters = COLLECTIONS.filter((c) => c.seo).flatMap((c) => c.books.flatMap((b, bi) => b.lengths.map((_, i) => chapterHref(c.id, bi, i + 1))))
  return [...pages, ...collections, ...plans, ...chapters].map((path) => ({ url: `${SITE_URL}${path}` }))
}
