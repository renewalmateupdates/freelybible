import { BOOKS, CHAPTER_LENGTHS } from './books'

export type Chapter = [book: number, chapter: number]

export type Plan = {
  id: string
  name: string
  description: string
  days: Chapter[][]
}

function chaptersOf(fromBook: number, toBook: number): Chapter[] {
  const out: Chapter[] = []
  for (let b = fromBook; b <= toBook; b++) {
    for (let c = 1; c <= BOOKS[b].chapters; c++) out.push([b, c])
  }
  return out
}

/** Splits chapters into `days` consecutive groups of roughly equal verse counts. */
export function splitByLength(chapters: Chapter[], days: number): Chapter[][] {
  const lengths = chapters.map(([b, c]) => CHAPTER_LENGTHS[b][c - 1])
  const total = lengths.reduce((a, n) => a + n, 0)
  const groups: Chapter[][] = []
  let i = 0
  let done = 0
  for (let d = 0; d < days; d++) {
    const daysLeft = days - d
    const chaptersLeft = chapters.length - i
    const group: Chapter[] = []
    if (daysLeft === 1) {
      while (i < chapters.length) {
        group.push(chapters[i])
        done += lengths[i++]
      }
    } else {
      const target = (total * (d + 1)) / days
      // Always take at least one chapter, and leave at least one for each remaining day.
      while (i < chapters.length && chapters.length - i > daysLeft - 1) {
        const next = done + lengths[i]
        if (group.length > 0 && Math.abs(next - target) > Math.abs(done - target)) break
        group.push(chapters[i])
        done = next
        i++
        if (done >= target) break
      }
      if (group.length === 0 && chaptersLeft > 0) {
        group.push(chapters[i])
        done += lengths[i++]
      }
    }
    groups.push(group)
  }
  return groups
}

const b = (name: string) => BOOKS.findIndex((x) => x.name === name)

export const PLANS: Plan[] = [
  {
    id: 'bible-in-a-year',
    name: 'The Bible in a year',
    description: 'Genesis to Revelation in 365 days, about 12 minutes a day.',
    days: splitByLength(chaptersOf(0, 65), 365),
  },
  {
    id: 'new-testament-90',
    name: 'The New Testament in 90 days',
    description: 'Matthew to Revelation in three months, about 10 minutes a day.',
    days: splitByLength(chaptersOf(b('Matthew'), 65), 90),
  },
  {
    id: 'gospels-30',
    name: 'The Gospels in 30 days',
    description: 'The life of Jesus through Matthew, Mark, Luke and John.',
    days: splitByLength(chaptersOf(b('Matthew'), b('John')), 30),
  },
  {
    id: 'psalms-30',
    name: 'Psalms in 30 days',
    description: 'All 150 psalms, a few each day.',
    days: splitByLength(chaptersOf(b('Psalms'), b('Psalms')), 30),
  },
  {
    id: 'proverbs-31',
    name: 'Proverbs in 31 days',
    description: 'One chapter of wisdom for each day of the month.',
    days: splitByLength(chaptersOf(b('Proverbs'), b('Proverbs')), 31),
  },
]

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

/** "Genesis 1–3", "Genesis 50 – Exodus 2", "Psalm 119". */
export function dayLabel(day: Chapter[]): string {
  if (day.length === 0) return ''
  const [fb, fc] = day[0]
  const [lb, lc] = day[day.length - 1]
  const name = (bi: number) => (BOOKS[bi].name === 'Psalms' && day.length === 1 ? 'Psalm' : BOOKS[bi].name)
  if (fb === lb) return fc === lc ? `${name(fb)} ${fc}` : `${BOOKS[fb].name} ${fc}–${lc}`
  return `${BOOKS[fb].name} ${fc} – ${BOOKS[lb].name} ${lc}`
}

/** The day a reader should be on, counting from when they started (1-based, capped). */
export function scheduledDay(plan: Plan, startedAt: number, now = Date.now()): number {
  const start = new Date(startedAt)
  start.setHours(0, 0, 0, 0)
  const days = Math.floor((now - start.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(days, 1), plan.days.length)
}
