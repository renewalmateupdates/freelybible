'use client'

import { Check } from 'lucide-react'
import { TRADITIONS, collectionById } from '@/lib/library'

/** Tradition cards; picking one adds its texts (Latter-day Saints adds the Book of Mormon and the Bible). */
export default function LibraryPicker({ picked, onChange }: { picked: string[]; onChange: (traditions: string[]) => void }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {TRADITIONS.map((t) => {
        const on = picked.includes(t.id)
        return (
          <li key={t.id}>
            <button
              onClick={() => onChange(on ? picked.filter((x) => x !== t.id) : [...picked, t.id])}
              aria-pressed={on}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-surface-2'}`}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>
                {on && <Check className="h-4 w-4" />}
              </span>
              <span>
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-xs text-ink-3">{t.collections.map((c) => collectionById(c).name).join(' · ')}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Turns picked traditions into the collections to show. */
export function collectionsFor(traditions: string[]): string[] {
  return Array.from(new Set(TRADITIONS.filter((t) => traditions.includes(t.id)).flatMap((t) => t.collections)))
}

/** The traditions whose texts are all in a library (for showing the current choice). */
export function traditionsFor(library: string[] | null): string[] {
  if (!library || library.length === 0) return []
  return TRADITIONS.filter((t) => t.collections.every((c) => library.includes(c)) && library.includes(t.collections[0])).map((t) => t.id)
}
