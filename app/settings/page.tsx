import type { Metadata } from 'next'
import SettingsView from '@/components/SettingsView'

export const metadata: Metadata = { title: 'Settings', robots: { index: false } }

export default function SettingsPage() {
  return <SettingsView />
}
