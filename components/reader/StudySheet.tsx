'use client'

import { useEffect, useState } from 'react'
import { chapterHref, collectionById, refLabel, translationsOf } from '@/lib/library'
import { getChapter, getVerse, getXref, type XrefTarget } from '@/lib/data'
import { useTranslation } from '@/lib/store'
import { Sheet } from '@/components/ui'

type Tab = 'xref' | 'compare'

/** Free study tools for one verse: Bible cross-references and translations side by side. */
export default function StudySheet({
  c,
  book,
  chapter,
  verse,
  onClose,
  onNavigate,
}: {
  c: string
  book: number
  chapter: number
  verse: number
  onClose: () => void
  onNavigate: (href: string) => void
}) {
  const col = collectionById(c)
  const tabs: [Tab, string][] = []
  if (col.xref) tabs.push(['xref', 'Cross-references'])
  if (col.translations.length > 1) tabs.push(['compare', c === 'quran' ? 'Arabic & English' : 'Compare translations'])
  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? 'compare')

  return (
    <Sheet open onClose={onClose} title={`Study ${refLabel({ c, book, chapter, verse })}`}>
      {tabs.length > 1 && (
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`h-10 rounded-lg ${tab === id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === 'xref' && col.xref ? (
        <CrossReferences book={book} chapter={chapter} verse={verse} onNavigate={onNavigate} />
      ) : (
        <Compare c={c} book={book} chapter={chapter} verse={verse} />
      )}
    </Sheet>
  )
}

function CrossReferences({
  book,
  chapter,
  verse,
  onNavigate,
}: {
  book: number
  chapter: number
  verse: number
  onNavigate: (href: string) => void
}) {
  const translation = useTranslation('bible', collectionById('bible').translations)
  const [items, setItems] = useState<{ target: XrefTarget; text: string }[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    getXref(book)
      .then(async (map) => {
        const targets = map[`${chapter}.${verse}`] ?? []
        const withText = await Promise.all(
          targets.map(async (target) => {
            const [b, ch, v, ec, ev] = target
            const verses = await getChapter(translation, b, ch)
            // Ranges show up to three verses; longer or cross-chapter ranges end with an ellipsis.
            const last = ec === undefined ? v : ec === ch ? (ev ?? v) : verses.length
            const shown = Math.min(last, v + 2)
            const more = shown < last || (ec !== undefined && ec !== ch)
            const text = verses.slice(v - 1, shown).join(' ').replace(/¶/g, '')
            return { target, text: more ? `${text} …` : text }
          }),
        )
        if (!cancelled) setItems(withText)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [book, chapter, verse, translation])

  if (error) return <p className="text-sm text-ink-2">Could not load cross-references.</p>
  if (!items) return <p className="text-sm text-ink-3">Loading…</p>
  if (!items.length) return <p className="text-sm text-ink-2">No cross-references for this verse.</p>

  return (
    <>
      <ul className="space-y-2">
        {items.map(({ target, text }) => {
          const [b, ch, v, ec, ev] = target
          const label =
            ec && ec !== ch
              ? `${collectionById('bible').books[b].name} ${ch}:${v}–${ec}:${ev}`
              : refLabel({ c: 'bible', book: b, chapter: ch, verse: v, endVerse: ev })
          return (
            <li key={target.join('.')}>
              <button
                onClick={() => onNavigate(chapterHref('bible', b, ch, v))}
                className="w-full rounded-xl border border-line p-3 text-left hover:bg-surface-2"
              >
                <span className="block text-sm font-semibold text-accent">{label}</span>
                <span className="mt-1 block font-serif text-[15px] leading-relaxed text-ink-2">{text}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-3">
        Ranked by readers at{' '}
        <a href="https://www.openbible.info/labs/cross-references/" className="underline" target="_blank" rel="noreferrer">
          OpenBible.info
        </a>{' '}
        (CC BY).
      </p>
    </>
  )
}

function Compare({ c, book, chapter, verse }: { c: string; book: number; chapter: number; verse: number }) {
  const [rows, setRows] = useState<{ id: string; short: string; name: string; text: string; rtl: boolean }[] | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all(
      translationsOf(c).map(async (t) => ({
        id: t.id,
        short: t.short,
        name: t.name,
        rtl: t.dir === 'rtl',
        text: await getVerse(t.id, book, chapter, verse).catch(() => ''),
      })),
    ).then((r) => !cancelled && setRows(r))
    return () => {
      cancelled = true
    }
  }, [c, book, chapter, verse])

  if (!rows) return <p className="text-sm text-ink-3">Loading…</p>
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-xl border border-line p-3">
          <span className="block text-xs font-bold text-accent">
            {r.short} <span className="font-normal text-ink-3">· {r.name}</span>
          </span>
          <span
            dir={r.rtl ? 'rtl' : undefined}
            lang={r.rtl ? 'ar' : undefined}
            className={`mt-1 block whitespace-pre-line font-serif leading-relaxed ${r.rtl ? 'arabic text-right text-xl' : ''}`}
          >
            {r.text.replace('¶', '').trim() || <em className="text-ink-3">Not included in this translation.</em>}
          </span>
        </li>
      ))}
    </ul>
  )
}
