import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/saved/', '/settings/'] }],
    ...(SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  }
}
