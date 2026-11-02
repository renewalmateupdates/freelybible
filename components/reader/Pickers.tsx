'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { BOOKS } from '@/lib/books'
import { updateSettings, useStore } from '@/lib/store'
import { TRANSLATIONS } from '@/lib/translations'
import { Sheet } from '@/components/ui'

/** Book list with a chapter grid under the chosen book. */
export function BookPickerSheet({
  open,
  onClose,
  currentBook,
  onPick,
}: {
  open: boolean
  onClose: () => void
  currentBook?: number
  onPick: (book: number, chapter: number) => void
}) {
  const [expanded, setExpanded] = useState<number | null>(currentBook ?? null)
  const [filter, setFilter] = useState('')
  useEffect(() => {
    if (open) {
      setExpanded(currentBook ?? null)
      setFilter('')
    }
  }, [open, currentBook])

  const f = filter.trim().toLowerCase()
  const visible = BOOKS.map((b, i) => ({ b, i })).filter(({ b }) => !f || b.name.toLowerCase().includes(f))

  return (
    <Sheet open={open} onClose={onClose} title="Books">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Find a book"
        aria-label="Find a book"
        className="mb-3 h-11 w-full rounded-xl border border-line bg-bg px-3 outline-none focus:border-accent"
      />
      {(['OT', 'NT'] as const).map((testament) => {
        const list = visible.filter(({ b }) => b.testament === testament)
        if (!list.length) return null
        return (
          <section key={testament} className="mb-4">
            <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-ink-3">
              {testament === 'OT' ? 'Old Testament' : 'New Testament'}
            </h3>
            <ul>
              {list.map(({ b, i }) => (
                <li key={b.id}>
                  <button
                    onClick={() => (b.chapters === 1 ? onPick(i, 1) : setExpanded(expanded === i ? null : i))}
                    aria-expanded={expanded === i}
                    className={`flex h-11 w-full items-center justify-between rounded-lg px-3 text-left hover:bg-surface-2 ${
                      i === currentBook ? 'font-semibold text-accent' : ''
                    }`}
                  >
                    {b.name}
                    <span className="text-xs text-ink-3">{b.chapters}</span>
                  </button>
                  {expanded === i && b.chapters > 1 && (
                    <div className="grid grid-cols-6 gap-1.5 px-1 pb-3 pt-1 sm:grid-cols-8">
                      {Array.from({ length: b.chapters }, (_, c) => (
                        <button
                          key={c}
                          onClick={() => onPick(i, c + 1)}
                          className="h-11 rounded-lg bg-surface-2 text-sm font-medium hover:bg-accent-soft hover:text-accent"
                        >
                          {c + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </Sheet>
  )
}

export function TranslationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const current = useStore((s) => s.settings.translation)
  return (
    <Sheet open={open} onClose={onClose} title="Translation">
      <ul className="space-y-1">
        {TRANSLATIONS.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => {
                updateSettings({ translation: t.id })
                onClose()
              }}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-surface-2 ${
                current === t.id ? 'bg-accent-soft' : ''
              }`}
            >
              <span className="w-12 text-sm font-bold text-accent">{t.short}</span>
              <span className="flex-1">
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-ink-3">{t.year} · free, public domain</span>
              </span>
              {current === t.id && <Check className="h-5 w-5 text-accent" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        Modern translations like the NIV and ESV are owned by publishers and need their permission. We add them only if
        it can stay free. See <a className="underline" href="/about/#costs">what costs money</a>.
      </p>
    </Sheet>
  )
}
