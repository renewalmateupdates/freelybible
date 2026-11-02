'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bookmark, BookmarkCheck, BookOpen, CalendarCheck, Search, Share2, Sparkles } from 'lucide-react'
import { chapterHref, refKey, refLabel } from '@/lib/books'
import { getVerseOfTheDay } from '@/lib/data'
import { dayLabel, planById, scheduledDay } from '@/lib/plans'
import { setBookmarks, useHydrated, useStore } from '@/lib/store'
import { translationById } from '@/lib/translations'
import { SITE_URL } from '@/lib/site'
import { shareOrCopy, useToast } from '@/components/ui'

type Votd = { book: number; chapter: number; verse: number; text: string }

function greeting(h: number) {
  if (h < 5) return 'Peace to you tonight'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const hydrated = useHydrated()
  const translation = useStore((s) => s.settings.translation)
  const lastRead = useStore((s) => s.lastRead)
  const plans = useStore((s) => s.plans)
  const bookmarks = useStore((s) => s.bookmarks)
  const [votd, setVotd] = useState<Votd | null>(null)
  const toast = useToast()

  useEffect(() => {
    if (!hydrated) return
    getVerseOfTheDay(translation).then(setVotd).catch(() => setVotd(null))
  }, [translation, hydrated])

  const votdKey = votd ? refKey(votd.book, votd.chapter, votd.verse) : ''
  const saved = votd ? Boolean(bookmarks[votdKey]) : false
  const activePlans = Object.entries(plans)
    .map(([id, p]) => ({ plan: planById(id), progress: p }))
    .filter((x) => x.plan)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium text-ink-3">{hydrated ? greeting(new Date().getHours()) : ' '}</p>

      {/* Verse of the day */}
      <section aria-labelledby="votd" className="mt-3 rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <h2 id="votd" className="text-xs font-semibold uppercase tracking-wider text-accent">
          Verse of the day
        </h2>
        {votd ? (
          <>
            <blockquote className="mt-4 font-serif text-2xl leading-snug tracking-tight">
              {votd.text.replace('¶', '').trim()}
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-ink-2">
              {refLabel(votd)} <span className="font-normal text-ink-3">· {translationById(translation).short}</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={chapterHref(votd.book, votd.chapter, votd.verse)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink"
              >
                Read in context <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={async () => {
                  const r = await shareOrCopy(
                    `${votd.text.replace('¶', '').trim()}\n— ${refLabel(votd)} (${translationById(translation).short})`,
                    SITE_URL ? `${SITE_URL}${chapterHref(votd.book, votd.chapter, votd.verse)}` : undefined,
                  )
                  if (r === 'copied') toast.show('Copied to share')
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-surface-2"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => {
                  setBookmarks([votdKey], !saved)
                  toast.show(saved ? 'Removed from saved' : 'Saved')
                }}
                aria-pressed={saved}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-surface-2"
              >
                {saved ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3" aria-hidden="true">
            <div className="h-6 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-6 w-4/5 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          </div>
        )}
      </section>

      {/* Continue or start */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {hydrated && lastRead ? (
          <Link href={chapterHref(lastRead.book, lastRead.chapter)} className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="mt-3 block text-xs text-ink-3">Continue reading</span>
            <span className="font-serif text-lg font-semibold">{refLabel(lastRead)}</span>
          </Link>
        ) : (
          <Link href={chapterHref(42, 1)} className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="mt-3 block text-xs text-ink-3">New to the Bible? Start here</span>
            <span className="font-serif text-lg font-semibold">The Gospel of John</span>
          </Link>
        )}

        {hydrated && activePlans.length > 0 ? (
          activePlans.slice(0, 1).map(({ plan, progress }) => {
            const day = scheduledDay(plan!, progress.startedAt)
            const firstOpen = plan!.days.findIndex((_, i) => !progress.done.includes(i + 1)) + 1 || plan!.days.length
            const today = Math.min(day, firstOpen)
            return (
              <Link key={plan!.id} href={`/plans/${plan!.id}/`} className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
                <CalendarCheck className="h-5 w-5 text-accent" />
                <span className="mt-3 block text-xs text-ink-3">
                  {plan!.name} · day {today} of {plan!.days.length}
                </span>
                <span className="font-serif text-lg font-semibold">{dayLabel(plan!.days[today - 1])}</span>
              </Link>
            )
          })
        ) : (
          <Link href="/plans/" className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
            <CalendarCheck className="h-5 w-5 text-accent" />
            <span className="mt-3 block text-xs text-ink-3">Build a daily habit</span>
            <span className="font-serif text-lg font-semibold">Start a reading plan</span>
          </Link>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/feed/" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold">Verse feed</span>
        </Link>
        <Link href="/search/" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
          <Search className="h-5 w-5 text-accent" />
          <span className="font-semibold">Search</span>
        </Link>
      </div>

      <p className="mt-10 text-center text-sm text-ink-3">
        Free because the Word is free. No ads, no account, no paywall.{' '}
        <Link href="/about/" className="font-medium text-accent underline-offset-2 hover:underline">
          Why
        </Link>
      </p>
      {toast.node}
    </div>
  )
}
