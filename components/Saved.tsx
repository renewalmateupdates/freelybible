'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { chapterHref, collectionById, parseKey, refLabel, translationById } from '@/lib/library'
import { getVerse } from '@/lib/data'
import { clearMarks, setBookmarks, setHighlight, setNote, useHydrated, useStore } from '@/lib/store'
import { PageTitle } from '@/components/ui'

type Tab = 'bookmarks' | 'highlights' | 'notes'

function translationFor(c: string, chosen: Record<string, string>) {
  const col = collectionById(c)
  return chosen[c] && col.translations.includes(chosen[c]) ? chosen[c] : col.translations[0]
}

function sortInOrder(keys: string[]) {
  return [...keys].sort((a, b) => {
    const x = parseKey(a)
    const y = parseKey(b)
    return x.c.localeCompare(y.c) || x.book - y.book || x.chapter - y.chapter || x.verse! - y.verse!
  })
}

export default function Saved() {
  const hydrated = useHydrated()
  const translations = useStore((s) => s.settings.translations)
  const bookmarks = useStore((s) => s.bookmarks)
  const highlights = useStore((s) => s.highlights)
  const marks = useStore((s) => s.marks)
  const notes = useStore((s) => s.notes)
  const [tab, setTab] = useState<Tab>('bookmarks')
  const [texts, setTexts] = useState<Record<string, string>>({})

  const keys = useMemo(() => {
    if (tab === 'bookmarks') return Object.entries(bookmarks).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    if (tab === 'notes') return Object.entries(notes).sort((a, b) => b[1].updatedAt - a[1].updatedAt).map(([k]) => k)
    return sortInOrder(Array.from(new Set([...Object.keys(highlights), ...Object.keys(marks)])))
  }, [tab, bookmarks, highlights, marks, notes])

  useEffect(() => {
    let cancelled = false
    const want = keys.map((k) => ({ k, t: translationFor(parseKey(k).c, translations) }))
    const missing = want.filter(({ k, t }) => texts[`${t}:${k}`] === undefined).slice(0, 200)
    if (!missing.length) return
    Promise.all(
      missing.map(async ({ k, t }) => {
        const { book, chapter, verse } = parseKey(k)
        return [`${t}:${k}`, (await getVerse(t, book, chapter, verse!).catch(() => '')).replace('¶', '').trim()] as const
      }),
    ).then((pairs) => !cancelled && setTexts((t) => ({ ...t, ...Object.fromEntries(pairs) })))
    return () => {
      cancelled = true
    }
  }, [keys, translations]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = {
    bookmarks: Object.keys(bookmarks).length,
    highlights: new Set([...Object.keys(highlights), ...Object.keys(marks)]).size,
    notes: Object.keys(notes).length,
  }

  function remove(key: string) {
    if (tab === 'bookmarks') setBookmarks([key], false)
    if (tab === 'highlights') {
      setHighlight([key], null)
      for (const t of collectionById(parseKey(key).c).translations) clearMarks([key], t)
    }
    if (tab === 'notes' && window.confirm('Delete this note?')) setNote(key, '')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="Saved" title="Your verses">
        Kept on this device. Back them up from <Link href="/settings/#backup" className="text-accent underline">Settings</Link>.
      </PageTitle>

      <div className="mb-6 grid grid-cols-3 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {(['bookmarks', 'highlights', 'notes'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`h-10 rounded-lg capitalize ${tab === id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}
          >
            {id === 'bookmarks' ? 'Saved' : id} {hydrated ? `(${counts[id]})` : ''}
          </button>
        ))}
      </div>

      {hydrated && keys.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-2">
          <p className="font-serif text-lg">Nothing here yet.</p>
          <p className="mt-2 text-sm text-ink-3">
            Tap any verse while reading to save it, highlight it or write a note.
          </p>
          <Link href="/read/" className="mt-4 inline-block font-semibold text-accent">
            Open the Bible
          </Link>
        </div>
      )}

      <ul className="space-y-2">
        {keys.map((key) => {
          const ref = parseKey(key)
          const t = translationFor(ref.c, translations)
          const text = texts[`${t}:${key}`]
          const color = highlights[key]
          const rtl = translationById(t).dir === 'rtl'
          const partial = !color && tab === 'highlights' ? (marks[key] ?? []).filter((m) => m.t === t) : []
          return (
            <li key={key} className="flex gap-2 rounded-xl border border-line bg-surface p-4">
              <Link href={chapterHref(ref.c, ref.book, ref.chapter, ref.verse)} className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-accent">{refLabel(ref)}</span>
                <span
                  dir={rtl ? 'rtl' : undefined}
                  className={`mt-1 block whitespace-pre-line font-serif leading-relaxed ${rtl ? 'arabic text-right' : ''} ${tab === 'highlights' && color ? `hl-${color}` : ''}`}
                >
                  {text === undefined
                    ? '…'
                    : partial.length
                      ? partial.map((m, i) => (
                          <mark key={i} className={`hl-${m.color} mr-1 rounded text-inherit`}>
                            {text.slice(m.s, m.e)}
                          </mark>
                        ))
                      : text}
                </span>
                {tab === 'notes' && notes[key] && (
                  <span className="mt-2 block whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm text-ink-2">{notes[key].text}</span>
                )}
              </Link>
              <button
                onClick={() => remove(key)}
                aria-label={`Remove ${refLabel(ref)}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
