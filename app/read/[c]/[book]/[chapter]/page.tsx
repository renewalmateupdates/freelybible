import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { COLLECTIONS, bookIndexBySlug, chapterTitle, collectionById, hasCollection } from '@/lib/library'
import ChapterReader from '@/components/reader/ChapterReader'

// Pre-rendered chapters for the collections marked seo (Bible, Quran and the short texts):
// each is a real page that search engines and AI tools can read. Other translations load
// on the device; the larger collections open in the client reader at /reader/.
export const dynamicParams = false

export function generateStaticParams() {
  return COLLECTIONS.filter((c) => c.seo).flatMap((c) =>
    c.books.flatMap((b) => b.lengths.map((_, i) => ({ c: c.id, book: b.slug, chapter: String(i + 1) }))),
  )
}

const cache = new Map<string, string[][]>()
function readBook(translation: string, slug: string): string[][] {
  const key = `${translation}/${slug}`
  let text = cache.get(key)
  if (!text) {
    text = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', translation, `${slug}.json`), 'utf8')) as string[][]
    cache.set(key, text)
  }
  return text
}

type Params = { params: Promise<{ c: string; book: string; chapter: string }> }

async function resolve(params: Params['params']) {
  const { c, book: slug, chapter: ch } = await params
  if (!hasCollection(c)) return null
  const col = collectionById(c)
  const book = bookIndexBySlug(c, slug)
  const chapter = Number(ch)
  if (book === undefined || !Number.isInteger(chapter) || chapter < 1 || chapter > col.books[book].lengths.length) return null
  const translation = col.translations[0]
  return { c, col, book, chapter, slug, translation, verses: readBook(translation, slug)[chapter - 1] }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = await resolve(params)
  if (!r) return {}
  const { title, subtitle } = chapterTitle(r.c, r.book, r.chapter)
  const first = (r.verses.find(Boolean) ?? '').replace('¶', '').trim()
  const name = subtitle ? `${title}: ${subtitle}` : title
  return {
    title: name,
    description: `Read ${name} free, with no ads or account. ${first.slice(0, 120)}`,
    alternates: { canonical: `/read/${r.c}/${r.slug}/${r.chapter}/` },
  }
}

export default async function ChapterPage({ params }: Params) {
  const r = await resolve(params)
  if (!r) notFound()
  return <ChapterReader c={r.c} book={r.book} chapter={r.chapter} initialVerses={r.verses} initialTranslation={r.translation} />
}
