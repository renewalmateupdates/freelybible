'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { useHydrated, useStore } from '@/lib/store'
import { PageTitle } from '@/components/ui'

export default function PlansList() {
  const hydrated = useHydrated()
  const progress = useStore((s) => s.plans)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="Plans" title="Reading plans">
        A little each day. Your progress stays on this device.
      </PageTitle>
      <ul className="space-y-3">
        {PLANS.map((plan) => {
          const p = hydrated ? progress[plan.id] : undefined
          const pct = p ? Math.round((p.done.length / plan.days.length) * 100) : 0
          return (
            <li key={plan.id}>
              <Link
                href={`/plans/${plan.id}/`}
                className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="block font-serif text-lg font-semibold">{plan.name}</span>
                  <span className="mt-1 block text-sm text-ink-2">{plan.description}</span>
                  {p ? (
                    <span className="mt-3 block">
                      <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="mt-1 block text-xs text-ink-3">
                        {p.done.length} of {plan.days.length} days · {pct}%
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
        })}
      </ul>
    </div>
  )
}
