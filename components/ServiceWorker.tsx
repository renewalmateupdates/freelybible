'use client'

import { useEffect } from 'react'

/**
 * Registers the offline service worker on the website. Inside the iOS/Android app
 * every file is already bundled locally, so it is skipped there.
 */
export default function ServiceWorker() {
  useEffect(() => {
    const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
    if (w.Capacitor?.isNativePlatform?.()) return
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
