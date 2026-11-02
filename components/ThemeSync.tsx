'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

/** Keeps <html data-theme> and the reader text size in step with settings. */
export default function ThemeSync() {
  const theme = useStore((s) => s.settings.theme)
  const fontSize = useStore((s) => s.settings.fontSize)

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const resolved =
        theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
      root.dataset.theme = resolved
    }
    apply()
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--reader-size', `${fontSize}px`)
  }, [fontSize])

  return null
}
