'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BookOpen, Bookmark, CalendarCheck, Download, House, Search, Settings, Sparkles } from 'lucide-react'
import { useInstall } from '@/lib/install'
import Logo from './Logo'
import InstallSheet from './InstallSheet'
import OfflineAuto from './OfflineAuto'
import Onboarding from './library/Onboarding'

const NAV = [
  { href: '/', label: 'Home', icon: House },
  { href: '/read/', label: 'Read', icon: BookOpen },
  { href: '/feed/', label: 'Feed', icon: Sparkles },
  { href: '/plans/', label: 'Plans', icon: CalendarCheck },
  { href: '/saved/', label: 'Saved', icon: Bookmark },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href.replace(/\/$/, ''))
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const immersive = pathname.startsWith('/feed')
  const install = useInstall()
  const [installOpen, setInstallOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2 rounded-md py-1 pr-2" aria-label="Freely Scripture home">
            <Logo className="h-7 w-7 text-accent" />
            <span className="font-serif text-lg font-semibold tracking-tight">Freely</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(pathname, href) ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-2'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center">
            {!install.installed && (
              <button
                onClick={() => setInstallOpen(true)}
                className="mr-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink"
              >
                <Download className="h-4 w-4" />
                <span>Get app</span>
              </button>
            )}
            <Link
              href="/search/"
              aria-label="Search"
              className="grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <Search className="h-5 w-5" />
            </Link>
            <Link
              href="/settings/"
              aria-label="Settings"
              className="grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <Onboarding />
      <OfflineAuto />
      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
      <main className={`flex-1 ${immersive ? '' : 'pb-24 md:pb-10'}`}>{children}</main>

      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? 'text-accent' : 'text-ink-3'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
