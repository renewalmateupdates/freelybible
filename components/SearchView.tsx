'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { chapterHref, collectionById, refLabel, translationById, translationsOf, visibleCollections } from '@/lib/library'
import { getBook } from '@/lib/data'
import { parseReference } from '@/lib/reference.mjs'
import { setTranslation, useHydrated, useStore } from '@/lib/store'

type Entry = { b: number; c: number; v: number; text: string; norm: string }

const indexes = new Map<string, Promise<Entry[]>>()

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
}

function buildIndex(translation: string, onProgress: (n: number) => void): Promise<Entry[]> {
  let p = indexes.get(translation)
  if (!p) {
    const col = collectionById(translationById(translation).collection)
    let loaded = 0
    p = Promise.all(
      col.books.map((_, b) =>
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

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
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
  const library = useStore((s) => s.settings.library)
  const translations = useStore((s) => s.settings.translations)
  const lastRead = useStore((s) => s.lastRead)
  const cols = useMemo(() => visibleCollections(library), [library])
  const [c, setC] = useState(params.get('c') ?? '')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [group, setGroup] = useState<string>('all')
  const [index, setIndex] = useState<Entry[] | null>(null)
  const [progress, setProgress] = useState(0)
  const [limit, setLimit] = useState(50)

  // Default to the text read last, else the first in the reader's library.
  const current = cols.some((x) => x.id === c) ? c : lastRead && cols.some((x) => x.id === lastRead.c) ? lastRead.c : cols[0].id
  const col = collectionById(current)
  const chosen = translations[current]
  const translation = chosen && col.translations.includes(chosen) ? chosen : col.translations[0]
  const books = col.books.length

  const ref = useMemo(() => parseReference(q, cols.map((x) => x.id)), [q, cols])

  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 250)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    setLimit(50)
    const url = query ? `/search/?q=${encodeURIComponent(query)}&c=${current}` : '/search/'
    window.history.replaceState(null, '', url)
  }, [query, group, current])

  useEffect(() => setGroup('all'), [current])

  const active = hydrated && query.length >= 2
  useEffect(() => {
    if (!active) return
    let cancelled = false
    setIndex(null)
    setProgress(0)
    buildIndex(translation, (n) => !cancelled && setProgress(n))
      .then((idx) => !cancelled && setIndex(idx))
      .catch(() => !cancelled && setIndex([]))
    return () => {
      cancelled = true
    }
  }, [translation, active])

  const { phrases, words } = useMemo(() => parseQuery(query), [query])
  const results = useMemo(() => {
    if (!index || query.length < 2 || (!words.length && !phrases.length)) return []
    const g = col.groups?.find((x) => x.name === group)
    const exact = normalize(query.replace(/"/g, '')).trim()
    const hits = index.filter((e) => {
      if (g && (e.b < g.from || e.b > g.to)) return false
      for (const p of phrases) if (!e.norm.includes(` ${p}`)) return false
      for (const w of words) if (!e.norm.includes(` ${w}`)) return false
      return true
    })
    return hits.sort((a, b) => Number(b.norm.includes(` ${exact}`)) - Number(a.norm.includes(` ${exact}`)))
  }, [index, query, words, phrases, group, col])

  const terms = [...phrases, ...words]
  const t = translationById(translation)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ref) router.push(chapterHref(ref.c, ref.book, ref.chapter, ref.verse))
          else setQuery(q.trim())
        }}
        role="search"
      >
        <label htmlFor="q" className="sr-only">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
          <input
            id="q"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={current === 'quran' ? 'Try "mercy" or Quran 2:255' : 'Try "love is patient" or John 3:16'}
            enterKeyHint="search"
            autoComplete="off"
            className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-4 text-lg outline-none focus:border-accent"
          />
        </div>
      </form>

      {ref && (
        <Link href={chapterHref(ref.c, ref.book, ref.chapter, ref.verse)} className="mt-3 flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-ink">
          <span>
            <span className="block text-xs opacity-80">Go to</span>
            <span className="font-serif text-lg font-semibold">{refLabel(ref)}</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      {hydrated && cols.length > 1 && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto" role="group" aria-label="Search in">
          {cols.map((x) => (
            <button
              key={x.id}
              onClick={() => setC(x.id)}
              aria-pressed={x.id === current}
              className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium ${x.id === current ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-2 hover:bg-surface-2'}`}
            >
              {x.name}
            </button>
          ))}
        </div>
      )}
      {col.groups && col.groups.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {[{ name: 'all' }, ...col.groups].map((g) => (
            <button
              key={g.name}
              onClick={() => setGroup(g.name)}
              aria-pressed={group === g.name}
              className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium ${group === g.name ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-3 hover:bg-surface-2'}`}
            >
              {g.name === 'all' ? `All of the ${col.name}` : g.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        {active && !index && (
          <p className="text-sm text-ink-3" role="status">
            Getting the {col.name} ready to search… {progress} of {books}
          </p>
        )}
        {index && query.length >= 2 && (
          <>
            <p className="mb-3 text-sm text-ink-3" role="status">
              {results.length.toLocaleString()} {results.length === 1 ? 'result' : 'results'} in the {col.name} ({t.short})
            </p>
            {results.length === 0 && col.translations.length > 1 && (
              <div className="mb-4 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
                <p>Translations word things differently. Try the same search in:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {translationsOf(current)
                    .filter((x) => x.id !== translation)
                    .map((x) => (
                      <button
                        key={x.id}
                        onClick={() => setTranslation(current, x.id)}
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
                  <Link href={chapterHref(current, r.b, r.c, r.v)} className="block rounded-xl border border-line bg-surface p-4 hover:bg-surface-2">
                    <span className="block text-sm font-semibold text-accent">{refLabel({ c: current, book: r.b, chapter: r.c, verse: r.v })}</span>
                    <span
                      dir={t.dir === 'rtl' ? 'rtl' : undefined}
                      className={`mt-1 block whitespace-pre-line font-serif leading-relaxed ${t.dir === 'rtl' ? 'arabic text-right' : ''}`}
                    >
                      <Highlighted text={r.text} terms={terms} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length > limit && (
              <button onClick={() => setLimit((l) => l + 50)} className="mt-4 h-11 w-full rounded-xl border border-line font-semibold text-ink-2 hover:bg-surface-2">
                Show more ({(results.length - limit).toLocaleString()} left)
              </button>
            )}
          </>
        )}
        {query.length < 2 && !ref && (
          <div className="text-sm text-ink-3">
            <p>Search every verse, or type a reference to jump there: John 3:16, Quran 2:255, Dhammapada 183.</p>
            <p className="mt-2">Put words in quotes for an exact phrase.</p>
          </div>
        )}
      </div>
    </div>
  )
}
