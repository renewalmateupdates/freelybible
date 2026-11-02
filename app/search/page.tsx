import type { Metadata } from 'next'
import { Suspense } from 'react'
import SearchView from '@/components/SearchView'

export const metadata: Metadata = {
  title: 'Search the Bible',
  description: 'Search every verse of the Bible free, or jump straight to a reference like John 3:16.',
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  )
}
