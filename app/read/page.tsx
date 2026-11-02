import type { Metadata } from 'next'
import BookIndex from '@/components/reader/BookIndex'

export const metadata: Metadata = {
  title: 'Read the Bible',
  description: 'All 66 books of the Bible, free to read in four translations. No account, no ads.',
}

export default function ReadPage() {
  return <BookIndex />
}
