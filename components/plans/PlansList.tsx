'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { COLLECTIONS, visibleCollections } from '@/lib/library'
import { PLANS, type Plan } from '@/lib/plans'
import { useHydrated, useStore } from '@/lib/store'
import { PageTitle } from '@/components/ui'

function PlanRow({ plan, done }: { plan: Plan; done?: number }) {
  const pct = done !== undefined ? Math.round((done / plan.days.length) * 100) : 0
  return (
    <li>
      <Link href={`/plans/${plan.id}/`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2">
        <div className="min-w-0 flex-1">
          <span className="block font-serif text-lg font-semibold">{plan.name}</span>
          <span className="mt-1 block text-sm text-ink-2">{plan.description}</span>
          {done !== undefined ? (
            <span className="mt-3 block">
              <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </span>
              <span className="mt-1 block text-xs text-ink-3">
                {done} of {plan.days.length} days · {pct}%
              </span>
            </span>
          ) : (
            <span className="mt-2 block text-xs text-ink-3">{plan.days.length} days</span>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
      </Link>
    </li>
  )
}

export default function PlansList() {
  const hydrated = useHydrated()
  const progress = useStore((s) => s.plans)
  const library = useStore((s) => s.settings.library)
  const [showAll, setShowAll] = useState(false)
  const mine = hydrated ? visibleCollections(library) : COLLECTIONS
  const cols = showAll ? COLLECTIONS : mine
  const active = hydrated ? PLANS.filter((p) => progress[p.id]) : []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="Plans" title="Reading plans">
        A little each day. Your progress stays on this device.
      </PageTitle>

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Your plans</h2>
          <ul className="space-y-3">
            {active.map((p) => (
              <PlanRow key={p.id} plan={p} done={progress[p.id].done.length} />
            ))}
          </ul>
        </section>
      )}

      {cols.map((col) => {
        const plans = PLANS.filter((p) => p.c === col.id && !progress[p.id])
        if (!plans.length) return null
        return (
          <section key={col.id} className="mb-10">
            <h2 className="mb-3 font-serif text-xl font-semibold">{col.name}</h2>
            {(['Start here', 'Book by book', 'Topics'] as const).map((cat) => {
              const list = plans.filter((p) => p.category === cat)
              if (!list.length) return null
              return (
                <div key={cat} className="mb-5">
                  {plans.length > 2 && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">{cat}</h3>}
                  <ul className="space-y-3">
                    {list.map((p) => (
                      <PlanRow key={p.id} plan={p} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        )
      })}

      {hydrated && mine.length < COLLECTIONS.length && (
        <button onClick={() => setShowAll(!showAll)} className="h-11 w-full rounded-xl border border-line font-semibold text-ink-2 hover:bg-surface-2">
          {showAll ? 'Show plans for my library only' : 'Show plans for every text'}
        </button>
      )}
    </div>
  )
}
