'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { bookIndexBySlug, collectionById, hasCollection } from '@/lib/library'
import ChapterReader from './ChapterReader'

/** Reader for collections without pre-rendered pages: /reader/?c=tanakh&b=genesis&ch=1 */
export default function ClientReader() {
  const params = useSearchParams()
  const c = params.get('c') ?? ''
  const book = hasCollection(c) ? bookIndexBySlug(c, params.get('b') ?? '') : undefined
  const chapter = Number(params.get('ch') ?? '1')
  if (book === undefined || !Number.isInteger(chapter) || chapter < 1 || chapter > collectionById(c).books[book].lengths.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-serif text-2xl">That passage could not be found.</p>
        <Link href="/read/" className="mt-4 inline-block font-semibold text-accent">
          Open the library
        </Link>
      </div>
    )
  }
  return <ChapterReader key={`${c}.${book}.${chapter}`} c={c} book={book} chapter={chapter} />
}
