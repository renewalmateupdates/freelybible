import { chapterTitle, collectionById, refLabel } from './library'

/** One reading: a whole chapter, or verses vStart–vEnd of it. book is an index in the plan's collection. */
export type Reading = [book: number, chapter: number, vStart?: number, vEnd?: number]

export type PlanCategory = 'Start here' | 'Book by book' | 'Topics'

export type Plan = {
  id: string
  c: string
  name: string
  description: string
  category: PlanCategory
  days: Reading[][]
}

const lengthsOf = (c: string) => collectionById(c).books.map((b) => b.lengths)
const bookIdx = (c: string, name: string) => {
  const i = collectionById(c).books.findIndex((b) => b.name === name)
  if (i === -1) throw new Error(`plans: no book ${name} in ${c}`)
  return i
}

function chapters(c: string, books: number[]): Reading[] {
  const L = lengthsOf(c)
  return books.flatMap((b) => L[b].map((_, i) => [b, i + 1] as Reading))
}
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Splits readings into `days` consecutive groups of roughly equal verse counts. */
export function splitByLength(c: string, readings: Reading[], days: number): Reading[][] {
  const L = lengthsOf(c)
  const sizes = readings.map(([b, ch, s, e]) => (s ? (e ?? s) - s + 1 : L[b][ch - 1]))
  const total = sizes.reduce((a, n) => a + n, 0)
  const groups: Reading[][] = []
  let i = 0
  let done = 0
  for (let d = 0; d < days; d++) {
    const daysLeft = days - d
    const group: Reading[] = []
    if (daysLeft === 1) {
      while (i < readings.length) {
        group.push(readings[i])
        done += sizes[i++]
      }
    } else {
      const target = (total * (d + 1)) / days
      while (i < readings.length && readings.length - i > daysLeft - 1) {
        const next = done + sizes[i]
        if (group.length > 0 && Math.abs(next - target) > Math.abs(done - target)) break
        group.push(readings[i])
        done = next
        i++
        if (done >= target) break
      }
      if (group.length === 0 && i < readings.length) {
        group.push(readings[i])
        done += sizes[i++]
      }
    }
    groups.push(group)
  }
  return groups
}

const perDay = (readings: Reading[], n: number): Reading[][] =>
  Array.from({ length: Math.ceil(readings.length / n) }, (_, i) => readings.slice(i * n, i * n + n))

// ---- topical plans: hand-picked Bible passages, one per day (checked against verse counts below)
type Passage = [string, number, number?, number?]
function topical(id: string, name: string, description: string, passages: Passage[]): Plan {
  return {
    id,
    c: 'bible',
    name,
    description,
    category: 'Topics',
    days: passages.map(([book, ch, s, e]) => [[bookIdx('bible', book), ch, s, e] as Reading]),
  }
}

// Roughly the order events happened, book by book (Job beside Genesis, prophets beside Kings,
// letters beside Acts). Scholars differ on details; this is a reading order, not a timeline.
const HISTORICAL = [
  'Genesis', 'Job', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel',
  '2 Samuel', 'Psalms', '1 Chronicles', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', '1 Kings', 'Jonah', 'Amos',
  'Hosea', 'Isaiah', 'Micah', '2 Kings', '2 Chronicles', 'Nahum', 'Zephaniah', 'Habakkuk', 'Jeremiah', 'Lamentations',
  'Obadiah', 'Ezekiel', 'Daniel', 'Joel', 'Ezra', 'Haggai', 'Zechariah', 'Esther', 'Nehemiah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'James', 'Galatians', '1 Thessalonians', '2 Thessalonians',
  '1 Corinthians', '2 Corinthians', 'Romans', 'Ephesians', 'Philippians', 'Colossians', 'Philemon', '1 Timothy',
  'Titus', '1 Peter', 'Hebrews', '2 Timothy', '2 Peter', 'Jude', '1 John', '2 John', '3 John', 'Revelation',
]

function quranByJuz(): Reading[][] {
  const col = collectionById('quran')
  const juz = col.juz!
  const L = col.books[0].lengths
  return juz.map(([s, v], i) => {
    const [es, ev] = i + 1 < juz.length ? juz[i + 1] : [L.length, L[L.length - 1] + 1]
    const day: Reading[] = []
    for (let surah = s; surah <= es; surah++) {
      const from = surah === s ? v : 1
      const to = surah === es ? ev - 1 : L[surah - 1]
      if (to >= from) day.push([0, surah, from, to])
    }
    return day
  })
}

const B = (n: string) => bookIdx('bible', n)

export const PLANS: Plan[] = [
  // ---- Bible
  { id: 'bible-in-a-year', c: 'bible', category: 'Start here', name: 'The Bible in a year', description: 'Genesis to Revelation in 365 days, about 12 minutes a day.', days: splitByLength('bible', chapters('bible', range(0, 65)), 365) },
  { id: 'bible-historical', c: 'bible', category: 'Start here', name: 'The Bible in a year, in historical order', description: 'All 66 books in roughly the order events happened: Job beside Genesis, the prophets beside the kings, the letters beside Acts.', days: splitByLength('bible', chapters('bible', HISTORICAL.map(B)), 365) },
  { id: 'bible-two-years', c: 'bible', category: 'Start here', name: 'The Bible in two years', description: 'The whole Bible at a gentler pace, about 6 minutes a day.', days: splitByLength('bible', chapters('bible', range(0, 65)), 730) },
  { id: 'gospels-30', c: 'bible', category: 'Start here', name: 'The Gospels in 30 days', description: 'The life of Jesus through Matthew, Mark, Luke and John.', days: splitByLength('bible', chapters('bible', range(B('Matthew'), B('John'))), 30) },
  { id: 'new-testament-90', c: 'bible', category: 'Book by book', name: 'The New Testament in 90 days', description: 'Matthew to Revelation in three months, about 10 minutes a day.', days: splitByLength('bible', chapters('bible', range(B('Matthew'), 65)), 90) },
  { id: 'old-testament-year', c: 'bible', category: 'Book by book', name: 'The Old Testament in a year', description: 'Genesis to Malachi in 365 days.', days: splitByLength('bible', chapters('bible', range(0, B('Malachi'))), 365) },
  { id: 'acts-28', c: 'bible', category: 'Book by book', name: 'Acts in 28 days', description: 'The early church, one chapter a day.', days: perDay(chapters('bible', [B('Acts')]), 1) },
  { id: 'paul-30', c: 'bible', category: 'Book by book', name: 'Paul’s letters in 30 days', description: 'Romans to Philemon.', days: splitByLength('bible', chapters('bible', range(B('Romans'), B('Philemon'))), 30) },
  { id: 'wisdom-60', c: 'bible', category: 'Book by book', name: 'The wisdom books in 60 days', description: 'Job, Psalms, Proverbs, Ecclesiastes and the Song of Solomon.', days: splitByLength('bible', chapters('bible', range(B('Job'), B('Song of Solomon'))), 60) },
  { id: 'psalms-30', c: 'bible', category: 'Book by book', name: 'Psalms in 30 days', description: 'All 150 psalms, a few each day.', days: splitByLength('bible', chapters('bible', [B('Psalms')]), 30) },
  { id: 'proverbs-31', c: 'bible', category: 'Book by book', name: 'Proverbs in 31 days', description: 'One chapter of wisdom for each day of the month.', days: perDay(chapters('bible', [B('Proverbs')]), 1) },
  topical('topic-anxiety', 'When you’re anxious', 'Seven days of passages about worry, rest and trust.', [
    ['Matthew', 6, 25, 34], ['Philippians', 4, 4, 9], ['Psalms', 23], ['1 Peter', 5, 6, 11], ['Isaiah', 41, 10, 13], ['Psalms', 46], ['John', 14, 1, 27],
  ]),
  topical('topic-grief', 'When you’re grieving', 'Seven days of comfort for loss.', [
    ['Psalms', 34, 15, 22], ['John', 11, 17, 44], ['Psalms', 42], ['Lamentations', 3, 19, 33], ['2 Corinthians', 1, 3, 11], ['1 Thessalonians', 4, 13, 18], ['Revelation', 21, 1, 7],
  ]),
  topical('topic-hope', 'Hope', 'Seven days on hope that holds.', [
    ['Romans', 8, 18, 39], ['Lamentations', 3, 21, 26], ['Isaiah', 40, 27, 31], ['Romans', 5, 1, 5], ['Jeremiah', 29, 10, 14], ['Hebrews', 6, 13, 20], ['1 Peter', 1, 3, 9],
  ]),
  topical('topic-forgiveness', 'Forgiveness', 'Seven days on being forgiven and forgiving others.', [
    ['Psalms', 51], ['Luke', 15, 11, 32], ['Matthew', 18, 21, 35], ['Colossians', 3, 12, 17], ['1 John', 1, 5, 10], ['Psalms', 103], ['Ephesians', 4, 25, 32],
  ]),
  topical('topic-purpose', 'Purpose', 'Seven days on what you were made for.', [
    ['Ephesians', 2, 1, 10], ['Jeremiah', 1, 4, 10], ['Romans', 12, 1, 8], ['Micah', 6, 6, 8], ['Matthew', 5, 13, 16], ['Ecclesiastes', 12, 9, 14], ['Philippians', 3, 7, 14],
  ]),
  topical('topic-gratitude', 'Gratitude', 'Seven days of giving thanks.', [
    ['Psalms', 100], ['Luke', 17, 11, 19], ['Psalms', 136], ['1 Thessalonians', 5, 12, 24], ['Philippians', 4, 10, 20], ['Psalms', 107, 1, 9], ['James', 1, 2, 18],
  ]),
  topical('topic-love', 'Love', 'Seven days on God’s love and loving others.', [
    ['1 Corinthians', 13], ['1 John', 4, 7, 21], ['John', 15, 9, 17], ['Romans', 8, 31, 39], ['Luke', 10, 25, 37], ['Song of Solomon', 8, 6, 7], ['John', 3, 16, 21],
  ]),

  // ---- Catholic Bible
  { id: 'catholic-year', c: 'catholic', category: 'Start here', name: 'The Catholic Bible in a year', description: 'All 73 books in 365 days.', days: splitByLength('catholic', chapters('catholic', range(0, 72)), 365) },
  { id: 'deuterocanon-30', c: 'catholic', category: 'Book by book', name: 'The deuterocanonical books in 30 days', description: 'Tobit, Judith, Wisdom, Sirach, Baruch and 1–2 Maccabees.', days: splitByLength('catholic', chapters('catholic', ['Tobit', 'Judith', 'Wisdom', 'Sirach', 'Baruch', '1 Maccabees', '2 Maccabees'].map((n) => bookIdx('catholic', n))), 30) },

  // ---- Tanakh
  { id: 'tanakh-year', c: 'tanakh', category: 'Start here', name: 'The Tanakh in a year', description: 'Torah, Prophets and Writings in 365 days.', days: splitByLength('tanakh', chapters('tanakh', range(0, 38)), 365) },
  { id: 'torah-50', c: 'tanakh', category: 'Book by book', name: 'The Torah in 50 days', description: 'Genesis to Deuteronomy, the five books of Moses.', days: splitByLength('tanakh', chapters('tanakh', range(0, 4)), 50) },
  { id: 'prophets-90', c: 'tanakh', category: 'Book by book', name: "Nevi'im (the Prophets) in 90 days", description: 'Joshua to Malachi.', days: splitByLength('tanakh', chapters('tanakh', range(5, 25)), 90) },
  { id: 'tanakh-psalms-30', c: 'tanakh', category: 'Book by book', name: 'Tehillim (Psalms) in 30 days', description: 'All 150 psalms in a month.', days: splitByLength('tanakh', chapters('tanakh', [bookIdx('tanakh', 'Psalms')]), 30) },

  // ---- Quran
  { id: 'quran-30', c: 'quran', category: 'Start here', name: 'The Quran in 30 days', description: 'One juz’ a day, the traditional way to finish the Quran in Ramadan.', days: quranByJuz() },
  { id: 'juz-amma-14', c: 'quran', category: 'Book by book', name: 'Juz’ ʿAmma in 14 days', description: 'The short surahs 78 to 114, often the first ones memorized.', days: splitByLength('quran', range(78, 114).map((s) => [0, s] as Reading), 14) },

  // ---- Other texts
  { id: 'gita-18', c: 'gita', category: 'Start here', name: 'The Bhagavad Gita in 18 days', description: 'One chapter a day.', days: perDay(chapters('gita', [0]), 1) },
  { id: 'dhammapada-26', c: 'dhammapada', category: 'Start here', name: 'The Dhammapada in 26 days', description: 'One chapter a day.', days: perDay(chapters('dhammapada', [0]), 1) },
  { id: 'tao-81', c: 'tao-te-ching', category: 'Start here', name: 'The Tao Te Ching in 81 days', description: 'One short chapter a day.', days: perDay(chapters('tao-te-ching', [0]), 1) },
  { id: 'tao-27', c: 'tao-te-ching', category: 'Book by book', name: 'The Tao Te Ching in 27 days', description: 'Three chapters a day.', days: perDay(chapters('tao-te-ching', [0]), 3) },
  { id: 'analects-20', c: 'analects', category: 'Start here', name: 'The Analects in 20 days', description: 'One book of sayings a day.', days: range(0, 19).map((b) => chapters('analects', [b])) },
  { id: 'bom-90', c: 'book-of-mormon', category: 'Start here', name: 'The Book of Mormon in 90 days', description: '1 Nephi to Moroni in three months.', days: splitByLength('book-of-mormon', chapters('book-of-mormon', range(0, 14)), 90) },
]

// Fail the build if a hand-picked passage points past the end of a chapter.
for (const plan of PLANS) {
  const L = lengthsOf(plan.c)
  for (const day of plan.days) {
    for (const [b, ch, s, e] of day) {
      const n = L[b]?.[ch - 1]
      if (!n || (s && (s < 1 || s > n)) || (e && (e < (s ?? 1) || e > n))) throw new Error(`plan ${plan.id}: bad reading ${b} ${ch}:${s}-${e}`)
    }
  }
}
if (new Set(HISTORICAL).size !== 66) throw new Error('historical order must list all 66 books once')

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

/** "Genesis 1–3", "Psalm 23", "Matthew 6:25–34", "Surah 2:142 – 2:252", "Book 3 (Pa Yih)". */
export function dayLabel(c: string, day: Reading[]): string {
  if (!day.length) return ''
  const col = collectionById(c)
  const [fb, fc, fs] = day[0]
  const [lb, lc, ls, le] = day[day.length - 1]
  if (fs) {
    if (c === 'quran') return day.length === 1 ? `Surah ${fc}:${fs}–${le ?? ls}` : `Surah ${fc}:${fs} – ${lc}:${le ?? ls}`
    if (day.length === 1) return refLabel({ c, book: fb, chapter: fc, verse: fs, endVerse: le ?? ls })
  }
  if (c === 'analects' && fb === lb && fc === 1 && lc === col.books[lb].lengths.length) {
    return `Book ${fb + 1}${col.books[fb].title ? ` (${col.books[fb].title})` : ''}`
  }
  if (col.single) {
    if (fc === lc) {
      const t = chapterTitle(c, fb, fc)
      return t.subtitle ? `${t.title}: ${t.subtitle}` : t.title
    }
    return `${col.chapterLabel === 'Surah' ? 'Surahs' : 'Chapters'} ${fc}–${lc}`
  }
  const name = (b: number) => col.books[b].name
  if (fb === lb) return fc === lc ? refLabel({ c, book: fb, chapter: fc }) : `${name(fb)} ${fc}–${lc}`
  return `${name(fb)} ${fc} – ${name(lb)} ${lc}`
}

/** The day a reader should be on, counting from when they started (1-based, capped). */
export function scheduledDay(plan: Plan, startedAt: number, now = Date.now()): number {
  const start = new Date(startedAt)
  start.setHours(0, 0, 0, 0)
  const days = Math.floor((now - start.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(days, 1), plan.days.length)
}
