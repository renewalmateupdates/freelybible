'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'
import { updateSettings, useHydrated, useStore } from '@/lib/store'
import LibraryPicker, { collectionsFor } from './LibraryPicker'

const ASK_ON = ['/', '/read/', '/feed/', '/plans/']

/**
 * First visit: "What would you like to read?" Picking nothing shows the whole library.
 * Asked only on the home, library, feed and plans screens, so someone who lands on a
 * chapter from a search can read first.
 */
export default function Onboarding() {
  const hydrated = useHydrated()
  const library = useStore((s) => s.settings.library)
  const pathname = usePathname() || '/'
  const [picked, setPicked] = useState<string[]>([])

  if (!hydrated || library !== null || !ASK_ON.includes(pathname)) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 md:items-center" role="dialog" aria-modal="true" aria-labelledby="onb-title">
      <div className="pb-safe max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl md:max-w-xl md:rounded-3xl">
        <Logo className="h-9 w-9 text-accent" />
        <h2 id="onb-title" className="mt-3 font-serif text-2xl font-semibold tracking-tight">
          What would you like to read?
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Freely has holy books from many traditions, all free. Pick what you want to see; you can change it anytime in
          Settings.
        </p>
        <div className="mt-5">
          <LibraryPicker picked={picked} onChange={setPicked} />
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button onClick={() => updateSettings({ library: [] })} className="h-12 rounded-xl border border-line font-semibold text-ink-2 hover:bg-surface-2">
            Show me everything
          </button>
          <button
            onClick={() => updateSettings({ library: collectionsFor(picked) })}
            disabled={picked.length === 0}
            className="h-12 rounded-xl bg-accent font-semibold text-accent-ink disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
