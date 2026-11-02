'use client'

import { Download, Share, SquarePlus } from 'lucide-react'
import { useInstall } from '@/lib/install'
import { Sheet } from '@/components/ui'

export default function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const install = useInstall()
  return (
    <Sheet open={open} onClose={onClose} title="Get the app">
      <h3 className="font-serif text-xl font-semibold">Put Freely on your home screen</h3>
      <p className="mt-2 text-sm text-ink-2">
        It opens like any app, works with no connection, and keeps your highlights and notes on your phone. Free, no app
        store needed.
      </p>
      {install.installed ? (
        <p className="mt-4 rounded-xl bg-accent-soft p-4 text-sm font-medium text-accent">Freely is installed on this device.</p>
      ) : install.canPrompt ? (
        <button
          onClick={async () => {
            if ((await install.prompt()) === 'accepted') onClose()
          }}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-ink"
        >
          <Download className="h-5 w-5" /> Install Freely
        </button>
      ) : install.ios ? (
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
            <Share className="h-5 w-5 shrink-0 text-accent" />
            <span>
              Tap the <strong>Share</strong> button in Safari (the square with an arrow).
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
            <SquarePlus className="h-5 w-5 shrink-0 text-accent" />
            <span>
              Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </span>
          </li>
        </ol>
      ) : (
        <p className="mt-4 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
          In Chrome or Edge, open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
          Firefox on a computer cannot install web apps; Chrome, Edge and Safari can.
        </p>
      )}
      <p className="mt-4 text-xs text-ink-3">Phone apps for the App Store and Google Play are coming too.</p>
    </Sheet>
  )
}
