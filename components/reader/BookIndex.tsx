'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BOOKS, chapterHref, refLabel } from '@/lib/books'
import { useHydrated, useStore } from '@/lib/store'
import { PageTitle } from '@/components/ui'

export default function BookIndex() {
  const hydrated = useHydrated()
  const lastRead = useStore((s) => s.lastRead)
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="Read" title="The Bible">
        66 books, free to read and keep offline.
      </PageTitle>

      {hydrated && lastRead && (
        <Link
          href={chapterHref(lastRead.book, lastRead.chapter)}
          className="mb-8 flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-ink"
        >
          <span>
            <span className="block text-xs opacity-80">Continue reading</span>
            <span className="font-serif text-lg font-semibold">{refLabel(lastRead)}</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      )}

      {(['OT', 'NT'] as const).map((testament) => (
        <section key={testament} className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-3">
            {testament === 'OT' ? 'Old Testament' : 'New Testament'}
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BOOKS.map((b, i) =>
              b.testament !== testament ? null : (
                <li key={b.id} className={open === i ? 'col-span-2 sm:col-span-3' : ''}>
                  {b.chapters === 1 ? (
                    <Link href={chapterHref(i, 1)} className="flex h-12 items-center rounded-xl border border-line bg-surface px-3 font-medium hover:bg-surface-2">
                      {b.name}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setOpen(open === i ? null : i)}
                      aria-expanded={open === i}
                      className={`flex h-12 w-full items-center justify-between rounded-xl border px-3 text-left font-medium ${
                        open === i ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:bg-surface-2'
                      }`}
                    >
                      {b.name}
                      <span className="text-xs text-ink-3">{b.chapters}</span>
                    </button>
                  )}
                  {open === i && (
                    <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                      {Array.from({ length: b.chapters }, (_, c) => (
                        <Link
                          key={c}
                          href={chapterHref(i, c + 1)}
                          className="grid h-11 place-items-center rounded-lg bg-surface-2 text-sm font-medium hover:bg-accent-soft hover:text-accent"
                        >
                          {c + 1}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}
