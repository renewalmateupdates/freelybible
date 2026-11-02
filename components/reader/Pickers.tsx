'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { collectionById, translationsOf } from '@/lib/library'
import { setTranslation, updateSettings, useStore, useTranslation } from '@/lib/store'
import { Sheet } from '@/components/ui'

/** Books of a collection, with a chapter grid under the chosen book. */
export function BookPickerSheet({
  open,
  onClose,
  c,
  currentBook,
  onPick,
}: {
  open: boolean
  onClose: () => void
  c: string
  currentBook?: number
  onPick: (book: number, chapter: number) => void
}) {
  const col = collectionById(c)
  const [expanded, setExpanded] = useState<number | null>(currentBook ?? null)
  const [filter, setFilter] = useState('')
  useEffect(() => {
    if (open) {
      setExpanded(col.single ? 0 : (currentBook ?? null))
      setFilter('')
    }
  }, [open, currentBook, col.single])

  const f = filter.trim().toLowerCase()
  const books = col.books.map((b, i) => ({ b, i })).filter(({ b }) => !f || b.name.toLowerCase().includes(f) || b.title?.toLowerCase().includes(f))
  const groups = col.groups ?? [{ name: '', from: 0, to: col.books.length - 1 }]

  if (col.single) {
    const b = col.books[0]
    return (
      <Sheet open={open} onClose={onClose} title={`${col.name}: ${col.chapterLabel === 'Surah' ? 'surahs' : 'chapters'}`}>
        <ul className="space-y-1">
          {b.lengths.map((_, ch) => (
            <li key={ch}>
              <button
                onClick={() => onPick(0, ch + 1)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-2"
              >
                <span className="w-8 shrink-0 text-right text-sm font-semibold text-accent">{ch + 1}</span>
                <span className="text-sm">{b.chapterNames?.[ch] ?? `${col.chapterLabel} ${ch + 1}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={col.name}>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Find a book"
        aria-label="Find a book"
        className="mb-3 h-11 w-full rounded-xl border border-line bg-bg px-3 outline-none focus:border-accent"
      />
      {groups.map((g) => {
        const list = books.filter(({ i }) => i >= g.from && i <= g.to)
        if (!list.length) return null
        return (
          <section key={g.name} className="mb-4">
            {g.name && <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-ink-3">{g.name}</h3>}
            <ul>
              {list.map(({ b, i }) => (
                <li key={b.slug}>
                  <button
                    onClick={() => (b.lengths.length === 1 ? onPick(i, 1) : setExpanded(expanded === i ? null : i))}
                    aria-expanded={expanded === i}
                    className={`flex h-11 w-full items-center justify-between rounded-lg px-3 text-left hover:bg-surface-2 ${
                      i === currentBook ? 'font-semibold text-accent' : ''
                    }`}
                  >
                    <span>
                      {b.name}
                      {b.title && <span className="ml-2 text-xs text-ink-3">{b.title}</span>}
                    </span>
                    <span className="text-xs text-ink-3">{b.lengths.length}</span>
                  </button>
                  {expanded === i && b.lengths.length > 1 && (
                    <div className="grid grid-cols-6 gap-1.5 px-1 pb-3 pt-1 sm:grid-cols-8">
                      {b.lengths.map((_, ch) => (
                        <button
                          key={ch}
                          onClick={() => onPick(i, ch + 1)}
                          className="h-11 rounded-lg bg-surface-2 text-sm font-medium hover:bg-accent-soft hover:text-accent"
                        >
                          {ch + 1}
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

export function TranslationSheet({ c, open, onClose }: { c: string; open: boolean; onClose: () => void }) {
  const col = collectionById(c)
  const current = useTranslation(c, col.translations)
  const showOriginal = useStore((s) => s.settings.showOriginal)
  return (
    <Sheet open={open} onClose={onClose} title="Translation">
      <ul className="space-y-1">
        {translationsOf(c).map((t) => (
          <li key={t.id}>
            <button
              onClick={() => {
                setTranslation(c, t.id)
                onClose()
              }}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-surface-2 ${current === t.id ? 'bg-accent-soft' : ''}`}
            >
              <span className="w-16 shrink-0 text-sm font-bold text-accent">{t.short}</span>
              <span className="flex-1">
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-ink-3">{t.year} · free to read</span>
              </span>
              {current === t.id && <Check className="h-5 w-5 text-accent" />}
            </button>
          </li>
        ))}
      </ul>
      {col.original && (
        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3 text-sm font-medium">
          Show the Arabic alongside the English
          <input
            type="checkbox"
            checked={showOriginal}
            onChange={(e) => updateSettings({ showOriginal: e.target.checked })}
            className="h-5 w-5 accent-[var(--accent)]"
          />
        </label>
      )}
      {c === 'bible' && (
        <p className="mt-4 text-xs leading-relaxed text-ink-3">
          Modern translations like the NIV and ESV are owned by publishers and need their permission. We add them only if it
          can stay free. See <a className="underline" href="/about/#costs">what costs money</a>.
        </p>
      )}
    </Sheet>
  )
}
