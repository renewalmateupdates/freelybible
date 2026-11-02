import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Freely Scripture',
    short_name: 'Freely',
    description: 'Holy books, free for everyone. No ads, no account, no paywall.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf8f3',
    theme_color: '#fbf8f3',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
