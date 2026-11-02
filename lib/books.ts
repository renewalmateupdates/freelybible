import booksJson from './books.json'
import chapterLengths from './chapter-lengths.json'

export type Book = {
  id: string
  name: string
  slug: string
  abbr: string
  testament: 'OT' | 'NT'
  chapters: number
  aliases: string[]
}

export const BOOKS = booksJson as Book[]
export const CHAPTER_LENGTHS = chapterLengths as number[][]

const bySlug = new Map(BOOKS.map((b, i) => [b.slug, i]))

export function bookIndexBySlug(slug: string): number | undefined {
  return bySlug.get(slug)
}

/** A verse location. book is the 0-based index into BOOKS. */
export type Ref = { book: number; chapter: number; verse?: number; endVerse?: number }

export function refKey(book: number, chapter: number, verse: number) {
  return `${book}.${chapter}.${verse}`
}

export function parseKey(key: string): Ref {
  const [book, chapter, verse] = key.split('.').map(Number)
  return { book, chapter, verse }
}

export function refLabel(ref: Ref, short = false) {
  const b = BOOKS[ref.book]
  const name = short ? b.abbr : b.name
  if (!ref.verse) return `${name} ${ref.chapter}`
  const end = ref.endVerse && ref.endVerse !== ref.verse ? `–${ref.endVerse}` : ''
  return `${name} ${ref.chapter}:${ref.verse}${end}`
}

export function chapterHref(book: number, chapter: number, verse?: number) {
  return `/read/${BOOKS[book].slug}/${chapter}/${verse ? `#v${verse}` : ''}`
}

/** Next and previous chapters across book boundaries. */
export function neighbor(book: number, chapter: number, dir: 1 | -1): { book: number; chapter: number } | null {
  let b = book
  let c = chapter + dir
  if (c < 1) {
    b -= 1
    if (b < 0) return null
    c = BOOKS[b].chapters
  } else if (c > BOOKS[b].chapters) {
    b += 1
    if (b >= BOOKS.length) return null
    c = 1
  }
  return { book: b, chapter: c }
}
