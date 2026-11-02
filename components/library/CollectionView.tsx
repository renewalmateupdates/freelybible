'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TRADITIONS, chapterHref, collectionById } from '@/lib/library'
import { PageTitle } from '@/components/ui'

export default function CollectionView({ c }: { c: string }) {
  const col = collectionById(c)
  const [open, setOpen] = useState<number | null>(null)
  const tradition = TRADITIONS.find((t) => t.id === col.tradition)?.name

  if (col.single) {
    const b = col.books[0]
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/read/" className="text-sm font-medium text-accent">
          ← Library
        </Link>
        <div className="mt-4">
          <PageTitle eyebrow={tradition} title={col.name}>
            {col.description}
          </PageTitle>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {b.lengths.map((n, ch) => (
            <li key={ch}>
              <Link href={chapterHref(c, 0, ch + 1)} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:bg-surface-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{ch + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{b.chapterNames?.[ch] ?? `${col.chapterLabel} ${ch + 1}`}</span>
                  <span className="block text-xs text-ink-3">
                    {n} {col.verseLabel}
                    {n === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const groups = col.groups ?? [{ name: '', from: 0, to: col.books.length - 1 }]
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/read/" className="text-sm font-medium text-accent">
        ← Library
      </Link>
      <div className="mt-4">
        <PageTitle eyebrow={tradition} title={col.name}>
          {col.description}
        </PageTitle>
      </div>
      {groups.map((g) => (
        <section key={g.name} className="mb-8">
          {g.name && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-3">{g.name}</h2>}
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {col.books.map((b, i) =>
              i < g.from || i > g.to ? null : (
                <li key={b.slug} className={open === i ? 'col-span-2 sm:col-span-3' : ''}>
                  {b.lengths.length === 1 ? (
                    <Link href={chapterHref(c, i, 1)} className="flex h-12 items-center rounded-xl border border-line bg-surface px-3 font-medium hover:bg-surface-2">
                      {b.name}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setOpen(open === i ? null : i)}
                      aria-expanded={open === i}
                      className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3 py-2 text-left font-medium ${
                        open === i ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <span>
                        {b.name}
                        {b.title && <span className="block text-xs font-normal text-ink-3">{b.title}</span>}
                      </span>
                      <span className="text-xs text-ink-3">{b.lengths.length}</span>
                    </button>
                  )}
                  {open === i && (
                    <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                      {b.lengths.map((_, ch) => (
                        <Link
                          key={ch}
                          href={chapterHref(c, i, ch + 1)}
                          className="grid h-11 place-items-center rounded-lg bg-surface-2 text-sm font-medium hover:bg-accent-soft hover:text-accent"
                        >
                          {ch + 1}
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
