'use client'

import Link from 'next/link'
import { ArrowRight, Settings2 } from 'lucide-react'
import { COLLECTIONS, TRADITIONS, chapterHref, collectionHref, refLabel, visibleCollections, type Collection } from '@/lib/library'
import { useHydrated, useStore } from '@/lib/store'
import { PageTitle } from '@/components/ui'

function CollectionCard({ col }: { col: Collection }) {
  const tradition = TRADITIONS.find((t) => t.id === col.tradition)?.name
  return (
    <Link href={collectionHref(col.id)} className="flex flex-col rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-accent">{tradition}</span>
      <span className="mt-1 font-serif text-xl font-semibold">{col.name}</span>
      <span className="mt-1 text-sm text-ink-2">{col.description.split('. ')[0].replace(/\.$/, '')}.</span>
    </Link>
  )
}

export default function LibraryView() {
  const hydrated = useHydrated()
  const library = useStore((s) => s.settings.library)
  const lastRead = useStore((s) => s.lastRead)
  const mine = hydrated ? visibleCollections(library) : COLLECTIONS
  const others = COLLECTIONS.filter((c) => !mine.includes(c))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="Library" title="Holy books, free for everyone">
        Read offline, highlight, take notes. No ads, no account.
      </PageTitle>

      {hydrated && lastRead && (
        <Link
          href={chapterHref(lastRead.c, lastRead.book, lastRead.chapter)}
          className="mb-8 flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-ink"
        >
          <span>
            <span className="block text-xs opacity-80">Continue reading</span>
            <span className="font-serif text-lg font-semibold">{refLabel(lastRead)}</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {mine.map((col) => (
          <CollectionCard key={col.id} col={col} />
        ))}
      </div>

      {others.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Also in Freely</h2>
            <Link href="/settings/#library" className="inline-flex items-center gap-1 text-sm font-medium text-accent">
              <Settings2 className="h-4 w-4" /> Change my library
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((col) => (
              <CollectionCard key={col.id} col={col} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
