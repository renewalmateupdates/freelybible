'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Download, Upload } from 'lucide-react'
import { BOOKS } from '@/lib/books'
import { clearAll, exportData, importData, updateSettings, useHydrated, useStore, type Theme } from '@/lib/store'
import { TRANSLATIONS } from '@/lib/translations'
import { PageTitle, useToast } from '@/components/ui'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'Match phone' },
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
]

function isNative() {
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
  return Boolean(w.Capacitor?.isNativePlatform?.())
}

export default function SettingsView() {
  const hydrated = useHydrated()
  const settings = useStore((s) => s.settings)
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [offline, setOffline] = useState<{ done: number; total: number } | null>(null)

  async function downloadOffline() {
    const paths = [
      ...TRANSLATIONS.flatMap((t) => [...BOOKS.map((b) => `/data/${t.id}/${b.slug}.json`), `/data/${t.id}/feed.json`]),
      ...BOOKS.map((b) => `/data/xref/${b.slug}.json`),
      '/data/votd.json',
    ]
    setOffline({ done: 0, total: paths.length })
    let done = 0
    let failed = 0
    const queue = [...paths]
    const worker = async () => {
      while (queue.length) {
        const p = queue.shift()!
        try {
          const r = await fetch(p)
          if (!r.ok) failed++
          await r.arrayBuffer()
        } catch {
          failed++
        }
        setOffline({ done: ++done, total: paths.length })
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
    toast.show(failed ? `Saved, but ${failed} files failed. Try again on a better connection.` : 'Everything is saved for offline')
  }

  function backup() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `freely-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.show('Backup downloaded')
  }

  async function restore(f: File) {
    try {
      const r = importData(await f.text())
      toast.show(`Restored ${r.bookmarks} saved, ${r.highlights} highlights, ${r.notes} notes`)
    } catch {
      toast.show('That file is not a Freely backup')
    }
  }

  if (!hydrated) return <div className="mx-auto max-w-3xl px-4 py-8" />

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="Settings" title="Make it yours" />

      <Section title="Translation">
        <div className="space-y-1">
          {TRANSLATIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => updateSettings({ translation: t.id })}
              aria-pressed={settings.translation === t.id}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${
                settings.translation === t.id ? 'bg-accent-soft' : 'hover:bg-surface-2'
              }`}
            >
              <span className="w-12 text-sm font-bold text-accent">{t.short}</span>
              <span className="flex-1 font-medium">{t.name}</span>
              {settings.translation === t.id && <Check className="h-5 w-5 text-accent" />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Reading">
        <label htmlFor="size" className="flex items-center justify-between text-sm font-medium">
          Text size <span className="text-ink-3">{settings.fontSize}px</span>
        </label>
        <input
          id="size"
          type="range"
          min={15}
          max={28}
          value={settings.fontSize}
          onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
          className="mt-2 w-full accent-[var(--accent)]"
        />
        <p className="scripture mt-3 rounded-xl bg-surface-2 p-4">
          <sup className="verse-num">1</sup>In the beginning was the Word, and the Word was with God, and the Word was God.
        </p>

        <p className="mt-5 text-sm font-medium">Layout</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ['verse', 'Verse by verse'],
              ['paragraph', 'Paragraphs'],
            ] as const
          ).map(([id, label]) => (
            <Choice key={id} on={settings.layout === id} onClick={() => updateSettings({ layout: id })}>
              {label}
            </Choice>
          ))}
        </div>

        <p className="mt-5 text-sm font-medium">Theme</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <Choice key={t.id} on={settings.theme === t.id} onClick={() => updateSettings({ theme: t.id })}>
              {t.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Offline">
        {isNative() ? (
          <p className="text-sm text-ink-2">Every translation is already on your phone. Freely works without a connection.</p>
        ) : (
          <>
            <p className="text-sm text-ink-2">
              Save all four translations, cross-references and the feed to this browser (about 20 MB) so Freely works without
              a connection.
            </p>
            <button
              onClick={downloadOffline}
              disabled={offline !== null && offline.done < offline.total}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 font-semibold text-ink-2 hover:bg-surface-2 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {offline ? (offline.done < offline.total ? `Saving… ${offline.done} of ${offline.total}` : 'Saved for offline') : 'Save for offline'}
            </button>
          </>
        )}
      </Section>

      <Section title="Back up your notes" id="backup">
        <p className="text-sm text-ink-2">
          Your highlights, notes, saved verses and plan progress live only on this device. Download a backup before you
          change phones or clear your browser, then restore it on the new one.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={backup} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-ink">
            <Download className="h-4 w-4" /> Download backup
          </button>
          <button
            onClick={() => file.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-4 font-semibold text-ink-2 hover:bg-surface-2"
          >
            <Upload className="h-4 w-4" /> Restore a backup
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) restore(f)
              e.target.value = ''
            }}
          />
        </div>
      </Section>

      <Section title="About">
        <p className="text-sm text-ink-2">
          Free because the Word is free. <Link href="/about/" className="font-medium text-accent underline">What is free and what costs money</Link>
        </p>
        <button
          onClick={() => {
            if (window.confirm('Delete all your highlights, notes, saved verses and plan progress from this device? This cannot be undone.')) {
              clearAll()
              toast.show('Everything was cleared')
            }
          }}
          className="mt-4 text-sm font-medium text-red-600 underline dark:text-red-400"
        >
          Clear all my data
        </button>
      </Section>
      {toast.node}
    </div>
  )
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-6 scroll-mt-20 rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`h-11 rounded-xl border text-sm font-medium ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-2 hover:bg-surface-2'}`}
    >
      {children}
    </button>
  )
}
