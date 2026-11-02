import type { Metadata } from 'next'
import { Suspense } from 'react'
import ClientReader from '@/components/reader/ClientReader'

export const metadata: Metadata = { title: 'Read' }

export default function ReaderPage() {
  return (
    <Suspense>
      <ClientReader />
    </Suspense>
  )
}
