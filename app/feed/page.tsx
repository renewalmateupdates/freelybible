import type { Metadata } from 'next'
import Feed from '@/components/Feed'

export const metadata: Metadata = {
  title: 'Verse feed',
  description: 'Scroll through the most-loved verses of the Bible, free. Tap any verse to read the whole chapter.',
}

export default function FeedPage() {
  return <Feed />
}
