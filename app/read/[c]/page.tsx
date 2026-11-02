import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { COLLECTIONS, collectionById, hasCollection } from '@/lib/library'
import CollectionView from '@/components/library/CollectionView'

export const dynamicParams = false

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ c: c.id }))
}

type Params = { params: Promise<{ c: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { c } = await params
  if (!hasCollection(c)) return {}
  const col = collectionById(c)
  return { title: `${col.name}: read free`, description: `${col.description} Free to read, with no ads or account.` }
}

export default async function CollectionPage({ params }: Params) {
  const { c } = await params
  if (!hasCollection(c)) notFound()
  return <CollectionView c={c} />
}
