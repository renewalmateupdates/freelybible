'use client'

import { BOOKS } from './books'

// All Bible data is static files under /data, bundled with the app.
// Fetches are cached in memory for the session (and by the service worker on the web).

export type BookText = string[][] // chapters -> verses ("" = not in this translation)
export type XrefTarget = [number, number, number, number?, number?] // book, chapter, verse, endChapter?, endVerse?
export type FeedItem = [number, number, number, string] // book, chapter, verse, text

const cache = new Map<string, Promise<unknown>>()

function getJson<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined
  if (!p) {
    p = fetch(path).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${path}`)
      return r.json() as Promise<T>
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}

export function getBook(translation: string, book: number): Promise<BookText> {
  return getJson<BookText>(`/data/${translation}/${BOOKS[book].slug}.json`)
}

export async function getChapter(translation: string, book: number, chapter: number): Promise<string[]> {
  const text = await getBook(translation, book)
  return text[chapter - 1] ?? []
}

export async function getVerse(translation: string, book: number, chapter: number, verse: number): Promise<string> {
  const ch = await getChapter(translation, book, chapter)
  return ch[verse - 1] ?? ''
}

export function getXref(book: number): Promise<Record<string, XrefTarget[]>> {
  return getJson(`/data/xref/${BOOKS[book].slug}.json`)
}

export function getFeed(translation: string): Promise<FeedItem[]> {
  return getJson(`/data/${translation}/feed.json`)
}

export function getVotdRefs(): Promise<[number, number, number][]> {
  return getJson('/data/votd.json')
}

/** Today's verse: the same for everyone on a given calendar day. */
export async function getVerseOfTheDay(translation: string, date = new Date()) {
  const refs = await getVotdRefs()
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  const [book, chapter, verse] = refs[(day - 1 + refs.length) % refs.length]
  const text = await getVerse(translation, book, chapter, verse)
  return { book, chapter, verse, text }
}
