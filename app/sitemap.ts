import type { MetadataRoute } from 'next'
import { BOOKS } from '@/lib/books'
import { PLANS } from '@/lib/plans'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

// Empty until NEXT_PUBLIC_SITE_URL is set, because a sitemap needs absolute URLs.
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return []
  const pages = ['/', '/read/', '/feed/', '/plans/', '/search/', '/about/']
  const plans = PLANS.map((p) => `/plans/${p.id}/`)
  const chapters = BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `/read/${b.slug}/${i + 1}/`))
  return [...pages, ...plans, ...chapters].map((path) => ({ url: `${SITE_URL}${path}` }))
}
