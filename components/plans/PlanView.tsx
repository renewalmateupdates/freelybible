'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { chapterHref } from '@/lib/books'
import { dayLabel, planById, scheduledDay } from '@/lib/plans'
import { setPlanDay, startPlan, stopPlan, useHydrated, useStore } from '@/lib/store'
import { PageTitle } from '@/components/ui'

export default function PlanView({ id }: { id: string }) {
  const plan = planById(id)!
  const hydrated = useHydrated()
  const progress = useStore((s) => s.plans[id])
  const todayRef = useRef<HTMLLIElement>(null)

  const done = new Set(progress?.done ?? [])
  const scheduled = progress ? scheduledDay(plan, progress.startedAt) : 1
  const firstOpen = (plan.days.findIndex((_, i) => !done.has(i + 1)) + 1) || plan.days.length
  const current = Math.min(scheduled, firstOpen)
  // Days before today's scheduled day that are not ticked off yet.
  const behind = progress ? Array.from({ length: scheduled - 1 }, (_, i) => i + 1).filter((d) => !done.has(d)).length : 0
  const pct = Math.round((done.size / plan.days.length) * 100)

  useEffect(() => {
    if (hydrated && progress) todayRef.current?.scrollIntoView({ block: 'center' })
  }, [hydrated]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/plans/" className="text-sm font-medium text-accent">
        ← All plans
      </Link>
      <div className="mt-4">
        <PageTitle eyebrow={`${plan.days.length} days`} title={plan.name}>
          {plan.description}
        </PageTitle>
      </div>

      {hydrated && !progress && (
        <button
          onClick={() => startPlan(id)}
          className="mb-8 h-12 w-full rounded-xl bg-accent font-semibold text-accent-ink"
        >
          Start this plan today
        </button>
      )}

      {hydrated && progress && (
        <div className="mb-8 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">
              Day {current} of {plan.days.length}
            </span>
            <span className="text-sm text-ink-3">{pct}% done</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-ink-2">
            {behind > 0
              ? `${behind} ${behind === 1 ? 'day' : 'days'} to catch up. No pressure: pick up wherever you are.`
              : done.size === plan.days.length
                ? 'You finished the plan. Well done.'
                : 'You are on track.'}
          </p>
          <button
            onClick={() => {
              if (window.confirm('Stop this plan and clear its progress?')) stopPlan(id)
            }}
            className="mt-3 text-xs font-medium text-ink-3 underline"
          >
            Stop plan
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {plan.days.map((day, i) => {
          const n = i + 1
          const isDone = done.has(n)
          const isToday = hydrated && progress && n === current
          return (
            <li
              key={n}
              ref={isToday ? todayRef : undefined}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                isToday ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
              }`}
            >
              <button
                onClick={() => {
                  if (!progress) startPlan(id)
                  setPlanDay(id, n, !isDone)
                }}
                aria-pressed={isDone}
                aria-label={`Day ${n} ${isDone ? 'done' : 'not done'}`}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${
                  isDone ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-3'
                }`}
              >
                {isDone ? <Check className="h-5 w-5" /> : <span className="text-xs font-semibold">{n}</span>}
              </button>
              <div className="min-w-0 flex-1">
                <span className="block text-xs text-ink-3">Day {n}</span>
                <span className="font-medium">{dayLabel(day)}</span>
              </div>
              <Link
                href={chapterHref(day[0][0], day[0][1])}
                className="h-10 shrink-0 rounded-full border border-line px-4 text-sm font-semibold leading-10 text-ink-2 hover:bg-surface-2"
              >
                Read
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
