'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { BOOKS, chapterHref, refLabel } from '@/lib/books'
import { getBook } from '@/lib/data'
import { parseReference } from '@/lib/reference.mjs'
import { updateSettings, useHydrated, useStore } from '@/lib/store'
import { TRANSLATIONS, translationById } from '@/lib/translations'

type Entry = { b: number; c: number; v: number; text: string; norm: string }
type Scope = 'all' | 'OT' | 'NT' | 'gospels'

const indexes = new Map<string, Promise<Entry[]>>()

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function buildIndex(translation: string, onProgress: (n: number) => void): Promise<Entry[]> {
  let p = indexes.get(translation)
  if (!p) {
    let loaded = 0
    p = Promise.all(
      BOOKS.map((_, b) =>
        getBook(translation, b).then((chapters) => {
          onProgress(++loaded)
          const out: Entry[] = []
          chapters.forEach((verses, ci) =>
            verses.forEach((raw, vi) => {
              if (!raw) return
              const text = raw.replace('¶', '').trim()
              out.push({ b, c: ci + 1, v: vi + 1, text, norm: ` ${normalize(text)} ` })
            }),
          )
          return out
        }),
      ),
    ).then((books) => books.flat())
    p.catch(() => indexes.delete(translation))
    indexes.set(translation, p)
  }
  return p
}

function parseQuery(q: string) {
  const phrases: string[] = []
  const rest = q.replace(/"([^"]+)"/g, (_, phrase) => {
    phrases.push(normalize(phrase).trim())
    return ' '
  })
  const words = normalize(rest).trim().split(' ').filter(Boolean)
  return { phrases: phrases.filter(Boolean), words }
}

function inScope(b: number, scope: Scope) {
  if (scope === 'all') return true
  if (scope === 'gospels') return b >= 39 && b <= 42
  return BOOKS[b].testament === scope
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export default function SearchView() {
  const router = useRouter()
  const params = useSearchParams()
  const hydrated = useHydrated()
  const translation = useStore((s) => s.settings.translation)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [scope, setScope] = useState<Scope>('all')
  const [index, setIndex] = useState<Entry[] | null>(null)
  const [progress, setProgress] = useState(0)
  const [limit, setLimit] = useState(50)
  const input = useRef<HTMLInputElement>(null)

  const ref = useMemo(() => parseReference(q), [q])

  // Debounce typing into a search.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    setLimit(50)
    const url = query ? `/search/?q=${encodeURIComponent(query)}` : '/search/'
    window.history.replaceState(null, '', url)
  }, [query, scope])

  useEffect(() => {
    if (!hydrated || query.length < 2) return
    let cancelled = false
    setIndex(null)
    setProgress(0)
    buildIndex(translation, (n) => !cancelled && setProgress(n))
      .then((idx) => !cancelled && setIndex(idx))
      .catch(() => !cancelled && setIndex([]))
    return () => {
      cancelled = true
    }
  }, [translation, hydrated, query.length >= 2]) // eslint-disable-line react-hooks/exhaustive-deps

  const { phrases, words } = useMemo(() => parseQuery(query), [query])
  const results = useMemo(() => {
    if (!index || query.length < 2 || (!words.length && !phrases.length)) return []
    const exact = normalize(query.replace(/"/g, '')).trim()
    const hits = index.filter((e) => {
      if (!inScope(e.b, scope)) return false
      for (const p of phrases) if (!e.norm.includes(` ${p} `) && !e.norm.includes(` ${p}`)) return false
      for (const w of words) if (!e.norm.includes(` ${w}`)) return false
      return true
    })
    // Verses containing the whole query as typed come first.
    return hits.sort((a, b) => Number(b.norm.includes(` ${exact}`)) - Number(a.norm.includes(` ${exact}`)))
  }, [index, query, words, phrases, scope])

  const terms = [...phrases, ...words]
  const t = translationById(translation)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ref) router.push(chapterHref(ref.book, ref.chapter, ref.verse))
          else setQuery(q.trim())
        }}
        role="search"
      >
        <label htmlFor="q" className="sr-only">
          Search the Bible
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
          <input
            id="q"
            ref={input}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Try "love is patient" or John 3:16'
            enterKeyHint="search"
            autoComplete="off"
            className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-4 text-lg outline-none focus:border-accent"
          />
        </div>
      </form>

      {ref && (
        <Link
          href={chapterHref(ref.book, ref.chapter, ref.verse)}
          className="mt-3 flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-ink"
        >
          <span>
            <span className="block text-xs opacity-80">Go to</span>
            <span className="font-serif text-lg font-semibold">{refLabel(ref)}</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {(
          [
            ['all', 'Whole Bible'],
            ['OT', 'Old Testament'],
            ['NT', 'New Testament'],
            ['gospels', 'Gospels'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setScope(id)}
            aria-pressed={scope === id}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium ${
              scope === id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2 hover:bg-surface-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {query.length >= 2 && !index && (
          <p className="text-sm text-ink-3" role="status">
            Getting the Bible ready to search… {progress} of 66 books
          </p>
        )}
        {index && query.length >= 2 && (
          <>
            <p className="mb-3 text-sm text-ink-3" role="status">
              {results.length.toLocaleString()} {results.length === 1 ? 'verse' : 'verses'} in the {t.short}
              {results.length === 0 && ref ? '. Did you mean the reference above?' : ''}
            </p>
            {results.length === 0 && (
              <div className="mb-4 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
                <p>Translations word things differently. Try the same search in:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TRANSLATIONS.filter((x) => x.id !== translation).map((x) => (
                    <button
                      key={x.id}
                      onClick={() => updateSettings({ translation: x.id })}
                      className="h-9 rounded-full border border-line bg-surface px-4 font-semibold text-ink-2 hover:bg-bg"
                    >
                      {x.short}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ul className="space-y-2">
              {results.slice(0, limit).map((r) => (
                <li key={`${r.b}.${r.c}.${r.v}`}>
                  <Link
                    href={chapterHref(r.b, r.c, r.v)}
                    className="block rounded-xl border border-line bg-surface p-4 hover:bg-surface-2"
                  >
                    <span className="block text-sm font-semibold text-accent">
                      {refLabel({ book: r.b, chapter: r.c, verse: r.v })}
                    </span>
                    <span className="mt-1 block font-serif leading-relaxed">
                      <Highlighted text={r.text} terms={terms} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length > limit && (
              <button
                onClick={() => setLimit((l) => l + 50)}
                className="mt-4 h-11 w-full rounded-xl border border-line font-semibold text-ink-2 hover:bg-surface-2"
              >
                Show more ({(results.length - limit).toLocaleString()} left)
              </button>
            )}
          </>
        )}
        {query.length < 2 && !ref && (
          <div className="text-sm text-ink-3">
            <p>Search every verse, or type a reference to jump there.</p>
            <p className="mt-2">Put words in quotes for an exact phrase, like &quot;the Lord is my shepherd&quot;.</p>
          </div>
        )}
      </div>
    </div>
  )
}
