import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BOOKS, bookIndexBySlug } from '@/lib/books'
import ChapterReader from '@/components/reader/ChapterReader'

// Every chapter is pre-rendered with the Berean Standard Bible text, so each one is a
// real page search engines and AI tools can read. Other translations load on the device.
export const dynamicParams = false

export function generateStaticParams() {
  return BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ book: b.slug, chapter: String(i + 1) })))
}

const bsbCache = new Map<number, string[][]>()
function bsbBook(book: number): string[][] {
  let text = bsbCache.get(book)
  if (!text) {
    const file = path.join(process.cwd(), 'public', 'data', 'bsb', `${BOOKS[book].slug}.json`)
    text = JSON.parse(fs.readFileSync(file, 'utf8')) as string[][]
    bsbCache.set(book, text)
  }
  return text
}

type Params = { params: Promise<{ book: string; chapter: string }> }

function resolve(slug: string, chapterRaw: string) {
  const book = bookIndexBySlug(slug)
  const chapter = Number(chapterRaw)
  if (book === undefined || !Number.isInteger(chapter) || chapter < 1 || chapter > BOOKS[book].chapters) return null
  return { book, chapter }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { book: slug, chapter: c } = await params
  const r = resolve(slug, c)
  if (!r) return {}
  const name = BOOKS[r.book].name === 'Psalms' ? 'Psalm' : BOOKS[r.book].name
  const first = bsbBook(r.book)[r.chapter - 1].find(Boolean) ?? ''
  return {
    title: `${name} ${r.chapter} (BSB)`,
    description: `Read ${name} ${r.chapter} free in the Berean Standard Bible, KJV and more. ${first.slice(0, 120)}`,
    alternates: { canonical: `/read/${slug}/${r.chapter}/` },
  }
}

export default async function ChapterPage({ params }: Params) {
  const { book: slug, chapter: c } = await params
  const r = resolve(slug, c)
  if (!r) notFound()
  return <ChapterReader book={r.book} chapter={r.chapter} initialVerses={bsbBook(r.book)[r.chapter - 1]} />
}
