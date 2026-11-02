import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/literata'
import './globals.css'
import AppShell from '@/components/AppShell'
import ThemeSync from '@/components/ThemeSync'
import ServiceWorker from '@/components/ServiceWorker'
import { SITE_URL } from '@/lib/site'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: { default: 'Freely Bible: the free Bible app', template: '%s · Freely Bible' },
  description:
    'Read the Bible free: no ads, no account, no paywall. Four translations, offline reading, highlights, notes, reading plans, cross-references and a verse feed.',
  applicationName: 'Freely Bible',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Freely', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
  ],
}

// Applies the saved theme and text size before first paint, so there is no flash.
const themeScript = `try{var s=(JSON.parse(localStorage.getItem('freely:v1')||'{}').settings)||{};var t=s.theme||'system';if(t==='system'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;if(s.fontSize){document.documentElement.style.setProperty('--reader-size',s.fontSize+'px')}}catch(e){document.documentElement.dataset.theme='light'}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <ThemeSync />
        <ServiceWorker />
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  )
}
