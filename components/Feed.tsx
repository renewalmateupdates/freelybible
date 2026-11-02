'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bookmark, BookOpen, Image as ImageIcon, Shuffle } from 'lucide-react'
import { chapterHref, collectionById, refKey, refLabel, translationById, visibleCollections } from '@/lib/library'
import { getFeed } from '@/lib/data'
import { getState, markFeedSeen, resetFeedSeen, setBookmarks, useHydrated, useStore } from '@/lib/store'
import { useToast } from '@/components/ui'
import ShareImageSheet from '@/components/ShareImageSheet'

const PAGE = 15

// Background washes made from theme colors, so every card reads in light, sepia and dark.
const WASHES = [
  'radial-gradient(120% 80% at 20% 10%, var(--accent-soft), var(--bg) 70%)',
  'radial-gradient(120% 80% at 80% 90%, var(--accent-soft), var(--surface) 70%)',
  'linear-gradient(160deg, var(--surface-2), var(--bg))',
  'radial-gradient(100% 70% at 50% 0%, var(--surface-2), var(--bg) 75%)',
  'linear-gradient(200deg, var(--accent-soft), var(--surface) 65%)',
]

type Card = { c: string; t: string; book: number; chapter: number; verse: number; text: string; key: string }

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** A fresh random mix every visit: each text's unseen verses, shuffled and taken in turns. */
function mix(pools: Card[][], seen: Set<string>): Card[] {
  let lists = pools.map((p) => shuffle(p.filter((card) => !seen.has(card.key))))
  if (lists.every((l) => l.length === 0)) lists = pools.map((p) => shuffle(p))
  const out: Card[] = []
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i])
  return out
}

export default function Feed() {
  const hydrated = useHydrated()
  const library = useStore((s) => s.settings.library)
  const translations = useStore((s) => s.settings.translations)
  const bookmarks = useStore((s) => s.bookmarks)
  const [pools, setPools] = useState<Card[][] | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [count, setCount] = useState(PAGE)
  const [sharing, setSharing] = useState<Card | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const pendingSeen = useRef(new Set<string>())
  const lastTap = useRef<{ key: string; at: number } | null>(null)
  const toast = useToast()

  const cols = useMemo(() => visibleCollections(library), [library])

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    Promise.all(
      cols.map(async (col) => {
        const chosen = translations[col.id]
        const t = chosen && col.translations.includes(chosen) ? chosen : col.translations[0]
        const items = await getFeed(t).catch(() => [])
        return items
          .filter(([, , , text]) => text)
          .map(([book, chapter, verse, text]) => ({ c: col.id, t, book, chapter, verse, text, key: refKey(col.id, book, chapter, verse) }))
      }),
    ).then((p) => !cancelled && setPools(p))
    return () => {
      cancelled = true
    }
  }, [hydrated, cols, translations])

  const reshuffle = useCallback(() => {
    if (!pools) return
    setCards(mix(pools, new Set(getState().feed.seen)))
    setCount(PAGE)
    scroller.current?.scrollTo({ top: 0 })
  }, [pools])

  useEffect(() => {
    reshuffle()
  }, [reshuffle])

  // Remember cards as they are seen (in batches), and load more near the end.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          pendingSeen.current.add(el.dataset.key!)
          if (Number(el.dataset.index) >= count - 4) setCount((n) => Math.min(n + PAGE, cards.length))
        }
        if (pendingSeen.current.size >= 5) {
          markFeedSeen(Array.from(pendingSeen.current))
          pendingSeen.current.clear()
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [cards, count])

  useEffect(
    () => () => {
      if (pendingSeen.current.size) markFeedSeen(Array.from(pendingSeen.current))
    },
    [],
  )

  function save(card: Card, force?: boolean) {
    const on = force ?? !bookmarks[card.key]
    setBookmarks([card.key], on)
    toast.show(on ? 'Saved' : 'Removed from saved')
  }

  const visible = cards.slice(0, count)

  return (
    <div className="relative">
      <button
        onClick={reshuffle}
        className="absolute left-1/2 top-3 z-10 inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface/90 px-4 text-sm font-semibold text-ink-2 shadow-sm backdrop-blur"
      >
        <Shuffle className="h-4 w-4" /> Shuffle
      </button>
      <div ref={scroller} className="feed-scroller no-scrollbar snap-y snap-mandatory overflow-y-auto">
        {!pools && <div className="grid h-full place-items-center text-ink-3">Loading verses…</div>}
        {visible.map((card, i) => {
          const saved = Boolean(bookmarks[card.key])
          const label = refLabel({ c: card.c, book: card.book, chapter: card.chapter, verse: card.verse })
          const tr = translationById(card.t)
          const rtl = tr.dir === 'rtl'
          return (
            <section
              key={`${card.key}-${i}`}
              data-index={i}
              data-key={card.key}
              className="relative flex h-full snap-start snap-always flex-col justify-center px-6"
              style={{ background: WASHES[i % WASHES.length] }}
              onClick={() => {
                const now = Date.now()
                if (lastTap.current?.key === card.key && now - lastTap.current.at < 350) save(card, true)
                lastTap.current = { key: card.key, at: now }
              }}
            >
              <div className="mx-auto w-full max-w-xl pr-14">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-accent">{collectionById(card.c).name}</p>
                <blockquote
                  dir={rtl ? 'rtl' : undefined}
                  className={`whitespace-pre-line font-serif text-[clamp(1.4rem,5.2vw,2.1rem)] leading-snug tracking-tight ${rtl ? 'arabic text-right' : ''}`}
                >
                  {card.text.replace('¶', '').trim()}
                </blockquote>
                <p className="mt-6 text-sm font-semibold text-ink-2">
                  {label} <span className="font-normal text-ink-3">· {tr.short}</span>
                </p>
              </div>
              <div className="absolute bottom-10 right-4 flex flex-col items-center gap-4">
                <FeedAction label={saved ? 'Saved' : 'Save'} onClick={() => save(card)}>
                  <Bookmark className={`h-6 w-6 ${saved ? 'fill-accent text-accent' : ''}`} />
                </FeedAction>
                <FeedAction label="Share" onClick={() => setSharing(card)}>
                  <ImageIcon className="h-6 w-6" />
                </FeedAction>
                <Link
                  href={chapterHref(card.c, card.book, card.chapter, card.verse)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center gap-1 text-[11px] font-medium text-ink-2"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface/80 backdrop-blur">
                    <BookOpen className="h-6 w-6" />
                  </span>
                  Read
                </Link>
              </div>
              {i === 0 && <p className="absolute inset-x-0 bottom-4 text-center text-xs text-ink-3">Swipe up for the next one · double-tap to save</p>}
            </section>
          )
        })}
        {pools && count >= cards.length && cards.length > 0 && (
          <section className="flex h-full snap-start flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-serif text-2xl">You have seen every verse in the feed.</p>
            <button
              onClick={() => {
                resetFeedSeen()
                reshuffle()
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink"
            >
              <Shuffle className="h-4 w-4" /> Start over
            </button>
          </section>
        )}
      </div>
      {sharing && (
        <ShareImageSheet
          text={sharing.text.replace('¶', '').trim()}
          reference={`${refLabel({ c: sharing.c, book: sharing.book, chapter: sharing.chapter, verse: sharing.verse })} · ${translationById(sharing.t).short}`}
          rtl={translationById(sharing.t).dir === 'rtl'}
          link={chapterHref(sharing.c, sharing.book, sharing.chapter, sharing.verse)}
          onClose={() => setSharing(null)}
        />
      )}
      {toast.node}
    </div>
  )
}

function FeedAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex flex-col items-center gap-1 text-[11px] font-medium text-ink-2"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface/80 backdrop-blur">{children}</span>
      {label}
    </button>
  )
}
