import type { Metadata } from 'next'
import LibraryView from '@/components/library/LibraryView'

export const metadata: Metadata = {
  title: 'Library',
  description:
    'Read the Bible, Quran, Tanakh, Bhagavad Gita, Dhammapada, Tao Te Ching, Analects and Book of Mormon free. No ads, no account.',
}

export default function LibraryPage() {
  return <LibraryView />
}
