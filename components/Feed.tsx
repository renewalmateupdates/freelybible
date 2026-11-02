'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bookmark, BookOpen, RefreshCw, Share2 } from 'lucide-react'
import { chapterHref, refKey, refLabel } from '@/lib/books'
import { getFeed, type FeedItem } from '@/lib/data'
import { getState, resetFeed, setBookmarks, setFeedCursor, useHydrated, useStore } from '@/lib/store'
import { translationById } from '@/lib/translations'
import { SITE_URL } from '@/lib/site'
import { shareOrCopy, useToast } from '@/components/ui'

const PAGE = 15

// Background washes made from theme colors, so every card reads in light, sepia and dark.
const WASHES = [
  'radial-gradient(120% 80% at 20% 10%, var(--accent-soft), var(--bg) 70%)',
  'radial-gradient(120% 80% at 80% 90%, var(--accent-soft), var(--surface) 70%)',
  'linear-gradient(160deg, var(--surface-2), var(--bg))',
  'radial-gradient(100% 70% at 50% 0%, var(--surface-2), var(--bg) 75%)',
  'linear-gradient(200deg, var(--accent-soft), var(--surface) 65%)',
]

/** Same seed, same order: a reader continues where they left off instead of seeing repeats. */
function shuffledOrder(length: number, seed: number) {
  const order = Array.from({ length }, (_, i) => i)
  let s = seed % 2147483647 || 1
  for (let i = length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export default function Feed() {
  const hydrated = useHydrated()
  const translation = useStore((s) => s.settings.translation)
  const seed = useStore((s) => s.feed.seed)
  const bookmarks = useStore((s) => s.bookmarks)
  const [pool, setPool] = useState<FeedItem[] | null>(null)
  const [start, setStart] = useState(0)
  const [count, setCount] = useState(PAGE)
  const scroller = useRef<HTMLDivElement>(null)
  const toast = useToast()
  const lastTap = useRef<{ key: string; at: number } | null>(null)

  useEffect(() => {
    if (!hydrated) return
    getFeed(translation).then(setPool).catch(() => setPool([]))
  }, [translation, hydrated])

  // Begin where the reader left off. Read once per seed so scrolling does not re-render the list.
  useEffect(() => {
    if (!hydrated) return
    setStart(getState().feed.cursor)
    setCount(PAGE)
    scroller.current?.scrollTo({ top: 0 })
  }, [hydrated, seed])

  const order = useMemo(() => (pool ? shuffledOrder(pool.length, seed) : []), [pool, seed])
  const end = Math.min(start + count, order.length)
  const items = pool ? order.slice(start, end).map((i) => pool[i]) : []
  const exhausted = pool !== null && end >= order.length

  // Track the card in view: remember position, and load more near the end.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const idx = Number((e.target as HTMLElement).dataset.index)
          setFeedCursor(idx)
          if (idx >= start + count - 4) setCount((c) => c + PAGE)
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items.length, start, count])

  function save(item: FeedItem, force?: boolean) {
    const key = refKey(item[0], item[1], item[2])
    const on = force ?? !bookmarks[key]
    setBookmarks([key], on)
    toast.show(on ? 'Saved' : 'Removed from saved')
  }

  const short = translationById(translation).short

  return (
    <div
      ref={scroller}
      className="feed-scroller no-scrollbar snap-y snap-mandatory overflow-y-auto"
    >
      {pool === null && (
        <div className="grid h-full place-items-center text-ink-3">Loading verses…</div>
      )}
      {items.map((item, i) => {
        const [b, c, v, text] = item
        const key = refKey(b, c, v)
        const saved = Boolean(bookmarks[key])
        const label = refLabel({ book: b, chapter: c, verse: v })
        return (
          <section
            key={`${seed}-${start + i}`}
            data-index={start + i}
            className="relative flex h-full snap-start snap-always flex-col justify-center px-6"
            style={{ background: WASHES[(start + i) % WASHES.length] }}
            onClick={() => {
              const now = Date.now()
              if (lastTap.current?.key === key && now - lastTap.current.at < 350) save(item, true)
              lastTap.current = { key, at: now }
            }}
          >
            <div className="mx-auto w-full max-w-xl pr-14">
              <blockquote className="font-serif text-[clamp(1.5rem,5.5vw,2.25rem)] leading-snug tracking-tight">
                {text.replace('¶', '').trim()}
              </blockquote>
              <p className="mt-6 text-sm font-semibold text-ink-2">
                {label} <span className="font-normal text-ink-3">· {short}</span>
              </p>
            </div>
            <div className="absolute bottom-10 right-4 flex flex-col items-center gap-4">
              <FeedAction label={saved ? 'Saved' : 'Save'} onClick={() => save(item)}>
                <Bookmark className={`h-6 w-6 ${saved ? 'fill-accent text-accent' : ''}`} />
              </FeedAction>
              <FeedAction
                label="Share"
                onClick={async () => {
                  const r = await shareOrCopy(
                    `${text.replace('¶', '').trim()}\n— ${label} (${short})`,
                    SITE_URL ? `${SITE_URL}${chapterHref(b, c, v)}` : undefined,
                  )
                  if (r === 'copied') toast.show('Copied to share')
                }}
              >
                <Share2 className="h-6 w-6" />
              </FeedAction>
              <Link
                href={chapterHref(b, c, v)}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1 text-[11px] font-medium text-ink-2"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface/80 backdrop-blur">
                  <BookOpen className="h-6 w-6" />
                </span>
                Read
              </Link>
            </div>
            {start === 0 && i === 0 && (
              <p className="absolute inset-x-0 bottom-4 text-center text-xs text-ink-3">Swipe up for the next verse · double-tap to save</p>
            )}
          </section>
        )
      })}
      {exhausted && (
        <section className="flex h-full snap-start flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-serif text-2xl">You have read all {pool?.length.toLocaleString()} verses in the feed.</p>
          <button
            onClick={() => resetFeed()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink"
          >
            <RefreshCw className="h-4 w-4" /> Start a fresh shuffle
          </button>
        </section>
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
