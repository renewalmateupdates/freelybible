'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Highlighter,
  Library,
  NotebookPen,
  Share2,
  StickyNote,
  X,
} from 'lucide-react'
import { BOOKS, chapterHref, neighbor, refKey, refLabel } from '@/lib/books'
import { getChapter } from '@/lib/data'
import {
  HIGHLIGHT_COLORS,
  setBookmarks,
  setHighlight,
  setLastRead,
  useStore,
  type HighlightColor,
} from '@/lib/store'
import { translationById } from '@/lib/translations'
import { SITE_URL } from '@/lib/site'
import { shareOrCopy, useToast } from '@/components/ui'
import { BookPickerSheet, TranslationSheet } from './Pickers'
import NoteSheet from './NoteSheet'
import StudySheet from './StudySheet'

const PARAGRAPH = '¶'

export default function ChapterReader({
  book,
  chapter,
  initialVerses,
}: {
  book: number
  chapter: number
  initialVerses: string[]
}) {
  const router = useRouter()
  const translation = useStore((s) => s.settings.translation)
  const layout = useStore((s) => s.settings.layout)
  const highlights = useStore((s) => s.highlights)
  const notes = useStore((s) => s.notes)
  const bookmarks = useStore((s) => s.bookmarks)

  const [text, setText] = useState<{ t: string; verses: string[] }>({ t: 'bsb', verses: initialVerses })
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [picker, setPicker] = useState<'book' | 'translation' | null>(null)
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [studyFor, setStudyFor] = useState<number | null>(null)
  const toast = useToast()

  // Load the reader's translation if it is not the pre-rendered BSB text.
  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    if (translation === 'bsb') {
      setText({ t: 'bsb', verses: initialVerses })
      return
    }
    getChapter(translation, book, chapter)
      .then((verses) => !cancelled && setText({ t: translation, verses }))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [translation, book, chapter, initialVerses])

  useEffect(() => {
    setLastRead(book, chapter)
    setSelected([])
  }, [book, chapter])

  // Jump to #vN after load, with a brief flash so the eye finds it.
  useEffect(() => {
    const m = window.location.hash.match(/^#v(\d+)$/)
    if (!m) return
    const el = document.getElementById(`v${m[1]}`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.classList.add('selected')
    const t = setTimeout(() => el.classList.remove('selected'), 2000)
    return () => clearTimeout(t)
  }, [book, chapter])

  const prev = neighbor(book, chapter, -1)
  const next = neighbor(book, chapter, 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowLeft' && prev) router.push(chapterHref(prev.book, prev.chapter))
      if (e.key === 'ArrowRight' && next) router.push(chapterHref(next.book, next.chapter))
      if (e.key === 'Escape') setSelected([])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, router])

  const t = translationById(text.t)
  const verses = text.verses
  const keys = useMemo(() => selected.map((v) => refKey(book, chapter, v)), [selected, book, chapter])
  const allBookmarked = keys.length > 0 && keys.every((k) => bookmarks[k])

  const toggle = useCallback((v: number) => {
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v].sort((a, b) => a - b)))
  }, [])

  function selectionText() {
    const lines = selected.map((v) => `${selected.length > 1 ? `${v} ` : ''}${verses[v - 1].replace(PARAGRAPH, '').trim()}`)
    const first = selected[0]
    const last = selected[selected.length - 1]
    const contiguous = last - first + 1 === selected.length
    const label = contiguous
      ? refLabel({ book, chapter, verse: first, endVerse: last })
      : `${refLabel({ book, chapter })}:${selected.join(', ')}`
    return `${lines.join(' ')}\n— ${label} (${t.short})`
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(selectionText())
      toast.show('Copied')
    } catch {
      toast.show('Could not copy')
    }
    setSelected([])
  }

  async function share() {
    const url = SITE_URL ? `${SITE_URL}${chapterHref(book, chapter, selected[0])}` : undefined
    const r = await shareOrCopy(selectionText(), url)
    if (r === 'copied') toast.show('Copied to share')
    setSelected([])
  }

  function highlight(color: HighlightColor | null) {
    setHighlight(keys, color)
    setSelected([])
  }

  function renderVerse(v: number, raw: string) {
    const key = refKey(book, chapter, v)
    const hl = highlights[key]
    const isSel = selected.includes(v)
    const body = raw.replace(PARAGRAPH, '').trim()
    return (
      <span
        id={`v${v}`}
        role="button"
        tabIndex={0}
        aria-pressed={isSel}
        onClick={() => toggle(v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle(v)
          }
        }}
        className={`verse scroll-mt-32 ${hl ? `hl-${hl}` : ''} ${isSel ? 'selected' : ''}`}
      >
        <sup className="verse-num">{v}</sup>
        {body ? body : <em className="text-ink-3">Not included in this translation.</em>}
        {notes[key] && <StickyNote className="mx-1 inline h-[0.8em] w-[0.8em] text-accent" aria-label="Has a note" />}
        {bookmarks[key] && <Bookmark className="mx-1 inline h-[0.8em] w-[0.8em] fill-accent text-accent" aria-label="Bookmarked" />}
      </span>
    )
  }

  // Paragraph mode: KJV's ¶ marks start new paragraphs; other translations flow as one.
  const paragraphs = useMemo(() => {
    const out: number[][] = [[]]
    verses.forEach((raw, i) => {
      if (raw.startsWith(PARAGRAPH) && out[out.length - 1].length) out.push([])
      out[out.length - 1].push(i + 1)
    })
    return out
  }, [verses])

  const title = BOOKS[book].name === 'Psalms' ? `Psalm ${chapter}` : `${BOOKS[book].name} ${chapter}`

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-14 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-1 px-2">
          {prev ? (
            <Link
              href={chapterHref(prev.book, prev.chapter)}
              aria-label={`Previous: ${refLabel(prev)}`}
              className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <span className="h-10 w-10" />
          )}
          <button
            onClick={() => setPicker('book')}
            className="flex h-10 items-center gap-1 rounded-full px-3 font-semibold hover:bg-surface-2"
          >
            {title}
            <ChevronDown className="h-4 w-4 text-ink-3" />
          </button>
          <button
            onClick={() => setPicker('translation')}
            className="flex h-10 items-center gap-1 rounded-full border border-line px-3 text-sm font-semibold text-ink-2 hover:bg-surface-2"
            aria-label={`Translation: ${t.name}. Change`}
          >
            {t.short}
            <ChevronDown className="h-4 w-4 text-ink-3" />
          </button>
          {next ? (
            <Link
              href={chapterHref(next.book, next.chapter)}
              aria-label={`Next: ${refLabel(next)}`}
              className="ml-auto grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <span className="ml-auto h-10 w-10" />
          )}
        </div>
      </div>

      <article className="mx-auto max-w-2xl px-5 pb-40 pt-8">
        <h1 className="mb-6 text-center font-serif text-3xl font-semibold tracking-tight">{title}</h1>
        {loadError && (
          <p className="mb-4 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">
            Could not load the {translationById(translation).short} text. Showing the Berean Standard Bible instead.
          </p>
        )}
        <div className="scripture text-ink">
          {layout === 'paragraph'
            ? paragraphs.map((group, i) => (
                <p key={i} className="mb-4">
                  {group.map((v) => (
                    <span key={v}>{renderVerse(v, verses[v - 1])} </span>
                  ))}
                </p>
              ))
            : verses.map((raw, i) => (
                <p key={i} className="mb-2">
                  {renderVerse(i + 1, raw)}
                </p>
              ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3">
          {prev ? (
            <Link href={chapterHref(prev.book, prev.chapter)} className="rounded-xl border border-line p-4 hover:bg-surface-2">
              <span className="block text-xs text-ink-3">Previous</span>
              <span className="font-semibold">{refLabel(prev)}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={chapterHref(next.book, next.chapter)} className="rounded-xl border border-line p-4 text-right hover:bg-surface-2">
              <span className="block text-xs text-ink-3">Next</span>
              <span className="font-semibold">{refLabel(next)}</span>
            </Link>
          ) : (
            <span />
          )}
        </div>
        <p className="mt-8 text-center text-xs text-ink-3">
          {t.name} ({t.short}). {t.license}.
        </p>
      </article>

      {/* Actions for the selected verses */}
      {selected.length > 0 && (
        <div
          className="fixed inset-x-0 z-40 px-3"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                {selected.length === 1 ? refLabel({ book, chapter, verse: selected[0] }) : `${selected.length} verses selected`}
              </p>
              <button
                onClick={() => setSelected([])}
                aria-label="Clear selection"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <Highlighter className="h-4 w-4 text-ink-3" aria-hidden="true" />
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => highlight(c)}
                  aria-label={`Highlight ${c}`}
                  className={`hl-${c} h-9 w-9 rounded-full border border-line`}
                />
              ))}
              {keys.some((k) => highlights[k]) && (
                <button onClick={() => highlight(null)} className="ml-1 rounded-full px-3 py-2 text-xs font-semibold text-ink-2 hover:bg-surface-2">
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1 text-[11px] font-medium text-ink-2">
              <ActionButton
                label={allBookmarked ? 'Saved' : 'Save'}
                onClick={() => {
                  setBookmarks(keys, !allBookmarked)
                  toast.show(allBookmarked ? 'Removed from saved' : 'Saved')
                  setSelected([])
                }}
              >
                {allBookmarked ? <BookmarkCheck className="h-5 w-5 text-accent" /> : <Bookmark className="h-5 w-5" />}
              </ActionButton>
              <ActionButton label="Note" onClick={() => setNoteFor(selected[0])}>
                <NotebookPen className="h-5 w-5" />
              </ActionButton>
              <ActionButton label="Study" onClick={() => setStudyFor(selected[0])}>
                <Library className="h-5 w-5" />
              </ActionButton>
              <ActionButton label="Copy" onClick={copy}>
                <Copy className="h-5 w-5" />
              </ActionButton>
              <ActionButton label="Share" onClick={share}>
                <Share2 className="h-5 w-5" />
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <BookPickerSheet
        open={picker === 'book'}
        onClose={() => setPicker(null)}
        currentBook={book}
        onPick={(b, c) => {
          setPicker(null)
          router.push(chapterHref(b, c))
        }}
      />
      <TranslationSheet open={picker === 'translation'} onClose={() => setPicker(null)} />
      {noteFor !== null && (
        <NoteSheet
          book={book}
          chapter={chapter}
          verse={noteFor}
          verseText={verses[noteFor - 1]?.replace(PARAGRAPH, '') ?? ''}
          onClose={() => {
            setNoteFor(null)
            setSelected([])
          }}
        />
      )}
      {studyFor !== null && (
        <StudySheet
          book={book}
          chapter={chapter}
          verse={studyFor}
          onClose={() => setStudyFor(null)}
          onNavigate={(href) => {
            setStudyFor(null)
            setSelected([])
            router.push(href)
          }}
        />
      )}
      {toast.node}
    </div>
  )
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl hover:bg-surface-2">
      {children}
      {label}
    </button>
  )
}
