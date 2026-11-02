'use client'

import { useEffect } from 'react'
import { isNativeApp, isStandalone } from '@/lib/install'
import { libraryFiles, markOfflineSaved, offlineSaved, saveFiles } from '@/lib/offline'
import { useHydrated, useStore } from '@/lib/store'

/** Once Freely is installed to the home screen, quietly save the reader's library for offline use. */
export default function OfflineAuto() {
  const hydrated = useHydrated()
  const library = useStore((s) => s.settings.library)
  useEffect(() => {
    if (!hydrated || library === null || isNativeApp() || !isStandalone() || offlineSaved()) return
    if (!('serviceWorker' in navigator)) return
    let cancelled = false
    navigator.serviceWorker.ready.then(async () => {
      if (cancelled) return
      const failed = await saveFiles(libraryFiles())
      if (!failed) markOfflineSaved()
    })
    return () => {
      cancelled = true
    }
  }, [hydrated, library])
  return null
}
