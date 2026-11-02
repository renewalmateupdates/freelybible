'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bookmark, BookmarkCheck, BookOpen, CalendarCheck, Download, Image as ImageIcon, Search, Sparkles } from 'lucide-react'
import { chapterHref, collectionById, refKey, refLabel, translationById, visibleCollections } from '@/lib/library'
import { getVerseOfTheDay } from '@/lib/data'
import { dayLabel, planById, scheduledDay } from '@/lib/plans'
import { useInstall } from '@/lib/install'
import { setBookmarks, useHydrated, useStore } from '@/lib/store'
import { useToast } from '@/components/ui'
import ShareImageSheet from '@/components/ShareImageSheet'
import InstallSheet from '@/components/InstallSheet'

type Votd = { c: string; book: number; chapter: number; verse: number; text: string }

function greeting(h: number) {
  if (h < 5) return 'Peace to you tonight'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const dayOfYear = () => {
  const d = new Date()
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000)
}

export default function Home() {
  const hydrated = useHydrated()
  const library = useStore((s) => s.settings.library)
  const translations = useStore((s) => s.settings.translations)
  const lastRead = useStore((s) => s.lastRead)
  const plans = useStore((s) => s.plans)
  const bookmarks = useStore((s) => s.bookmarks)
  const install = useInstall()
  const cols = useMemo(() => visibleCollections(library), [library])
  const [pick, setPick] = useState<string | null>(null)
  const [votd, setVotd] = useState<Votd | null>(null)
  const [sharing, setSharing] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const toast = useToast()

  // Each day features a different text from the reader's library; chips switch it.
  const c = pick && cols.some((x) => x.id === pick) ? pick : cols[dayOfYear() % cols.length].id
  const col = collectionById(c)
  const chosen = translations[c]
  const t = chosen && col.translations.includes(chosen) ? chosen : col.translations[0]

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    getVerseOfTheDay(c, t)
      .then((v) => !cancelled && setVotd(v))
      .catch(() => !cancelled && setVotd(null))
    return () => {
      cancelled = true
    }
  }, [c, t, hydrated])

  const ref = votd && votd.c === c ? votd : null
  const key = ref ? refKey(ref.c, ref.book, ref.chapter, ref.verse) : ''
  const saved = Boolean(key && bookmarks[key])
  const text = ref?.text.replace('¶', '').trim() ?? ''
  const tr = translationById(t)
  const activePlans = Object.entries(plans)
    .map(([id, p]) => ({ plan: planById(id), progress: p }))
    .filter((x) => x.plan)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-medium text-ink-3">{hydrated ? greeting(new Date().getHours()) : ' '}</p>

      {/* Verse of the day */}
      <section aria-labelledby="votd" className="mt-3 rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 id="votd" className="text-xs font-semibold uppercase tracking-wider text-accent">
            Verse of the day
          </h2>
          <span className="text-xs text-ink-3">{col.name}</span>
        </div>
        {hydrated && cols.length > 1 && (
          <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
            {cols.map((x) => (
              <button
                key={x.id}
                onClick={() => setPick(x.id)}
                aria-pressed={x.id === c}
                className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium ${x.id === c ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-3'}`}
              >
                {x.name}
              </button>
            ))}
          </div>
        )}
        {ref ? (
          <>
            <blockquote
              dir={tr.dir === 'rtl' ? 'rtl' : undefined}
              className={`mt-4 whitespace-pre-line font-serif text-2xl leading-snug tracking-tight ${tr.dir === 'rtl' ? 'arabic text-right' : ''}`}
            >
              {text}
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-ink-2">
              {refLabel(ref)} <span className="font-normal text-ink-3">· {tr.short}</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={chapterHref(ref.c, ref.book, ref.chapter, ref.verse)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink"
              >
                Read in context <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setSharing(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-surface-2"
              >
                <ImageIcon className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => {
                  setBookmarks([key], !saved)
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
          <Link href={chapterHref(lastRead.c, lastRead.book, lastRead.chapter)} className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="mt-3 block text-xs text-ink-3">Continue reading</span>
            <span className="font-serif text-lg font-semibold">{refLabel(lastRead)}</span>
          </Link>
        ) : (
          <Link href="/read/" className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="mt-3 block text-xs text-ink-3">Start reading</span>
            <span className="font-serif text-lg font-semibold">Open the library</span>
          </Link>
        )}

        {hydrated && activePlans.length > 0 ? (
          activePlans.slice(0, 1).map(({ plan, progress }) => {
            const p = plan!
            const day = scheduledDay(p, progress.startedAt)
            const firstOpen = p.days.findIndex((_, i) => !progress.done.includes(i + 1)) + 1 || p.days.length
            const today = Math.min(day, firstOpen)
            return (
              <Link key={p.id} href={`/plans/${p.id}/`} className="rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
                <CalendarCheck className="h-5 w-5 text-accent" />
                <span className="mt-3 block text-xs text-ink-3">
                  {p.name} · day {today} of {p.days.length}
                </span>
                <span className="font-serif text-lg font-semibold">{dayLabel(p.c, p.days[today - 1])}</span>
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

      {hydrated && !install.installed && (
        <button
          onClick={() => setInstallOpen(true)}
          className="mt-3 flex w-full items-center gap-4 rounded-2xl bg-accent-soft p-5 text-left"
        >
          <Download className="h-6 w-6 shrink-0 text-accent" />
          <span>
            <span className="block font-semibold">Get the app, free</span>
            <span className="block text-sm text-ink-2">Install Freely on your phone. Works offline, and your notes stay on your device.</span>
          </span>
        </button>
      )}

      <p className="mt-10 text-center text-sm text-ink-3">
        Free because the Word is free. No ads, no account, no paywall.{' '}
        <Link href="/about/" className="font-medium text-accent underline-offset-2 hover:underline">
          Why
        </Link>
      </p>
      {sharing && ref && (
        <ShareImageSheet
          text={text}
          reference={`${refLabel(ref)} · ${tr.short}`}
          rtl={tr.dir === 'rtl'}
          link={chapterHref(ref.c, ref.book, ref.chapter, ref.verse)}
          onClose={() => setSharing(false)}
        />
      )}
      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
      {toast.node}
    </div>
  )
}
