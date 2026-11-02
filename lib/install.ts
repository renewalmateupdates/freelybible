'use client'

import { useSyncExternalStore } from 'react'

// "Download" for the website: browsers that support it fire beforeinstallprompt, which we
// hold until the reader taps Install. iPhones have no prompt; they add to the home screen
// from the Share menu, so the UI shows those steps instead.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedNow = true
    emit()
  })
}

export function isNativeApp() {
  if (typeof window === 'undefined') return false
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  return Boolean(w.Capacitor?.isNativePlatform?.())
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

type InstallState = { canPrompt: boolean; installed: boolean; ios: boolean }
let snapshot: InstallState = { canPrompt: false, installed: false, ios: false }
function getSnapshot(): InstallState {
  const next = { canPrompt: Boolean(deferred), installed: installedNow || isStandalone() || isNativeApp(), ios: isIOS() }
  if (next.canPrompt !== snapshot.canPrompt || next.installed !== snapshot.installed || next.ios !== snapshot.ios) snapshot = next
  return snapshot
}
const serverSnapshot: InstallState = { canPrompt: false, installed: true, ios: false }

export function useInstall() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSnapshot,
    () => serverSnapshot,
  )
  return {
    ...s,
    async prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
      if (!deferred) return 'unavailable'
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      emit()
      return outcome
    },
  }
}
