'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/** Bottom sheet on phones, centered panel on wide screens. Closes on Escape or backdrop tap. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="pb-safe relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-2xl outline-none md:max-w-lg md:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
          {title && <h2 className="absolute left-4 text-sm font-semibold text-ink-2">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 grid h-10 w-10 place-items-center rounded-full text-ink-3 hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

/** A short message at the bottom of the screen, above the nav and the home indicator. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = (m: string) => {
    setMessage(m)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2200)
  }
  const node = message ? (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg">{message}</div>
    </div>
  ) : null
  return { show, node }
}

export async function shareOrCopy(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text, url })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
      <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="mt-2 text-ink-2">{children}</div>}
    </div>
  )
}
