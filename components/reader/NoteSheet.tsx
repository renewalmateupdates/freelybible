'use client'

import { useState } from 'react'
import { refKey, refLabel } from '@/lib/library'
import { setNote, useStore } from '@/lib/store'
import { Sheet } from '@/components/ui'

export default function NoteSheet({
  c,
  book,
  chapter,
  verse,
  verseText,
  onClose,
}: {
  c: string
  book: number
  chapter: number
  verse: number
  verseText: string
  onClose: () => void
}) {
  const key = refKey(c, book, chapter, verse)
  const existing = useStore((s) => s.notes[key])
  const [text, setText] = useState(existing?.text ?? '')

  return (
    <Sheet open onClose={onClose} title={`Note on ${refLabel({ c, book, chapter, verse })}`}>
      <blockquote className="mb-3 whitespace-pre-line border-l-2 border-accent pl-3 font-serif text-ink-2">{verseText}</blockquote>
      <label htmlFor="note" className="sr-only">
        Your note
      </label>
      <textarea
        id="note"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="What stands out to you? A prayer, a question, something to remember."
        className="w-full rounded-xl border border-line bg-bg p-3 outline-none focus:border-accent"
      />
      <p className="mt-1 text-xs text-ink-3">Saved only on this device. Back it up from Settings.</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            setNote(key, text)
            onClose()
          }}
          className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-ink"
        >
          Save note
        </button>
        {existing && (
          <button
            onClick={() => {
              setNote(key, '')
              onClose()
            }}
            className="h-11 rounded-xl border border-line px-4 font-semibold text-ink-2"
          >
            Delete
          </button>
        )}
      </div>
    </Sheet>
  )
}
