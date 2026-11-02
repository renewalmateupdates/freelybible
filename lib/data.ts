'use client'

import { collectionById, translationById } from './library'

// All scripture data is static files under /data, bundled with the app.
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

export function bookPath(translation: string, book: number) {
  const col = collectionById(translationById(translation).collection)
  return `/data/${translation}/${col.books[book].slug}.json`
}

export function getBook(translation: string, book: number): Promise<BookText> {
  return getJson<BookText>(bookPath(translation, book))
}

export async function getChapter(translation: string, book: number, chapter: number): Promise<string[]> {
  const text = await getBook(translation, book)
  return text[chapter - 1] ?? []
}

export async function getVerse(translation: string, book: number, chapter: number, verse: number): Promise<string> {
  const ch = await getChapter(translation, book, chapter)
  return ch[verse - 1] ?? ''
}

/** Bible cross-references (OpenBible.info), keyed "chapter.verse". */
export function getXref(book: number): Promise<Record<string, XrefTarget[]>> {
  return getJson(`/data/xref/${collectionById('bible').books[book].slug}.json`)
}

export function getFeed(translation: string): Promise<FeedItem[]> {
  return getJson(`/data/${translation}/feed.json`)
}

/** Today's verse for a collection: the same for everyone on a given calendar day. */
export async function getVerseOfTheDay(c: string, translation: string, date = new Date()) {
  const refs = await getJson<[number, number, number][]>(`/data/votd/${c}.json`)
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  const [book, chapter, verse] = refs[(day - 1 + refs.length) % refs.length]
  const text = await getVerse(translation, book, chapter, verse)
  return { c, book, chapter, verse, text }
}

/** Every data file for a translation, for "Save for offline". */
export function translationFiles(translation: string): string[] {
  const t = translationById(translation)
  const col = collectionById(t.collection)
  const files = col.books.map((b) => `/data/${translation}/${b.slug}.json`)
  files.push(`/data/${translation}/feed.json`, `/data/votd/${col.id}.json`)
  if (col.xref) files.push(...col.books.map((b) => `/data/xref/${b.slug}.json`))
  return files
}
