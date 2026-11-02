import type { Metadata } from 'next'
import Saved from '@/components/Saved'

export const metadata: Metadata = { title: 'Saved', robots: { index: false } }

export default function SavedPage() {
  return <Saved />
}
