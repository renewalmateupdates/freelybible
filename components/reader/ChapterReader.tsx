'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  ImageIcon,
  Library,
  NotebookPen,
  StickyNote,
  X,
} from 'lucide-react'
import {
  chapterHref,
  chapterTitle,
  collectionById,
  collectionHref,
  displayVerse,
  neighbor,
  refKey,
  refLabel,
  translationById,
} from '@/lib/library'
import { getChapter } from '@/lib/data'
import {
  HIGHLIGHT_COLORS,
  addMark,
  clearMarks,
  setBookmarks,
  setHighlight,
  setLastRead,
  useStore,
  useTranslation,
  type HighlightColor,
  type Mark,
} from '@/lib/store'
import { useToast } from '@/components/ui'
import ShareImageSheet from '@/components/ShareImageSheet'
import { BookPickerSheet, TranslationSheet } from './Pickers'
import NoteSheet from './NoteSheet'
import StudySheet from './StudySheet'

const PARAGRAPH = '¶'
const clean = (raw: string) => raw.replace(PARAGRAPH, '').trim()

type Pending = { v: number; s: number; e: number }[]

function offsetWithin(el: HTMLElement, node: Node, offset: number) {
  const r = document.createRange()
  r.setStart(el, 0)
  r.setEnd(node, offset)
  return r.toString().length
}

export default function ChapterReader({
  c,
  book,
  chapter,
  initialVerses,
  initialTranslation,
}: {
  c: string
  book: number
  chapter: number
  initialVerses?: string[]
  initialTranslation?: string
}) {
  const router = useRouter()
  const col = collectionById(c)
  const translation = useTranslation(c, col.translations)
  const layout = useStore((s) => s.settings.layout)
  const showOriginal = useStore((s) => s.settings.showOriginal)
  const highlights = useStore((s) => s.highlights)
  const marks = useStore((s) => s.marks)
  const notes = useStore((s) => s.notes)
  const bookmarks = useStore((s) => s.bookmarks)

  const [text, setText] = useState<{ t: string; verses: string[] } | null>(
    initialVerses && initialTranslation ? { t: initialTranslation, verses: initialVerses } : null,
  )
  const [original, setOriginal] = useState<string[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [picker, setPicker] = useState<'book' | 'translation' | null>(null)
  const [noteFor, setNoteFor] = useState<number | null>(null)
  const [studyFor, setStudyFor] = useState<number | null>(null)
  const [shareText, setShareText] = useState<{ text: string; label: string } | null>(null)
  const article = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const t = translationById(text?.t ?? translation)
  const verses = text?.verses ?? []
  const wantOriginal = Boolean(col.original && showOriginal && translation !== col.original)

  // Load the reader's translation unless it is the pre-rendered one.
  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    if (initialVerses && initialTranslation === translation) {
      setText({ t: translation, verses: initialVerses })
      return
    }
    getChapter(translation, book, chapter)
      .then((v) => !cancelled && setText({ t: translation, verses: v }))
      .catch(() => !cancelled && setLoadError(true))
    return () => {
      cancelled = true
    }
  }, [translation, book, chapter, initialVerses, initialTranslation])

  useEffect(() => {
    let cancelled = false
    setOriginal(null)
    if (!wantOriginal || !col.original) return
    getChapter(col.original, book, chapter)
      .then((v) => !cancelled && setOriginal(v))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [wantOriginal, col.original, book, chapter])

  useEffect(() => {
    setLastRead(c, book, chapter)
    setSelected([])
    setPending(null)
  }, [c, book, chapter])

  // Jump to #vN once the text is on screen, with a brief flash so the eye finds it.
  const hasText = verses.length > 0
  useEffect(() => {
    if (!hasText) return
    const m = window.location.hash.match(/^#v(\d+)$/)
    if (!m) return
    const el = document.getElementById(`v${m[1]}`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.classList.add('selected')
    const timer = setTimeout(() => el.classList.remove('selected'), 2000)
    return () => clearTimeout(timer)
  }, [hasText, book, chapter])

  // Word-level highlighting: watch the reader's own text selection.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const read = () => {
      const sel = window.getSelection()
      const root = article.current
      if (!sel || sel.isCollapsed || !sel.rangeCount || !root) return setPending(null)
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) return setPending(null)
      const out: Pending = []
      root.querySelectorAll<HTMLElement>('[data-body]').forEach((el) => {
        if (!range.intersectsNode(el)) return
        const body = el.textContent ?? ''
        let s = el.contains(range.startContainer) ? offsetWithin(el, range.startContainer, range.startOffset) : 0
        let e = el.contains(range.endContainer) ? offsetWithin(el, range.endContainer, range.endOffset) : body.length
        while (s < e && /\s/.test(body[s])) s++
        while (e > s && /\s/.test(body[e - 1])) e--
        if (e > s) out.push({ v: Number(el.dataset.body), s, e })
      })
      setPending(out.length ? out : null)
    }
    const onChange = () => {
      clearTimeout(timer)
      timer = setTimeout(read, 150)
    }
    document.addEventListener('selectionchange', onChange)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', onChange)
    }
  }, [])

  const prev = neighbor(c, book, chapter, -1)
  const next = neighbor(c, book, chapter, 1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowLeft' && prev) router.push(chapterHref(c, prev.book, prev.chapter))
      if (e.key === 'ArrowRight' && next) router.push(chapterHref(c, next.book, next.chapter))
      if (e.key === 'Escape') setSelected([])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, router, c])

  const keys = useMemo(() => selected.map((v) => refKey(c, book, chapter, v)), [selected, c, book, chapter])
  const allBookmarked = keys.length > 0 && keys.every((k) => bookmarks[k])

  const toggle = useCallback((v: number) => {
    // A finished drag-select also fires a click; leave that to the highlighter.
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v].sort((a, b) => a - b)))
  }, [])

  function labelFor(vs: number[]) {
    const first = vs[0]
    const last = vs[vs.length - 1]
    if (last - first + 1 === vs.length) return refLabel({ c, book, chapter, verse: first, endVerse: last })
    return `${refLabel({ c, book, chapter })}:${vs.map((v) => displayVerse(c, book, chapter, v)).join(', ')}`
  }

  function selectionText() {
    return selected.map((v) => `${selected.length > 1 ? `${displayVerse(c, book, chapter, v)} ` : ''}${clean(verses[v - 1])}`).join(' ')
  }

  function pendingText(p: Pending) {
    return p.map(({ v, s, e }) => clean(verses[v - 1]).slice(s, e)).join(' … ')
  }

  async function copy(textToCopy: string, label: string) {
    try {
      await navigator.clipboard.writeText(`${textToCopy}\n— ${label} (${t.short})`)
      toast.show('Copied')
    } catch {
      toast.show('Could not copy')
    }
  }

  function highlightVerses(color: HighlightColor | null) {
    setHighlight(keys, color)
    if (!color) clearMarks(keys, t.id)
    setSelected([])
  }

  function highlightWords(color: HighlightColor) {
    if (!pending) return
    for (const { v, s, e } of pending) addMark(refKey(c, book, chapter, v), { t: t.id, s, e, color })
    window.getSelection()?.removeAllRanges()
    setPending(null)
  }

  function renderBody(key: string, body: string) {
    const ms = (marks[key] ?? []).filter((m: Mark) => m.t === t.id && m.e <= body.length)
    if (!ms.length) return body
    const parts: React.ReactNode[] = []
    let at = 0
    ms.forEach((m, i) => {
      if (m.s > at) parts.push(body.slice(at, m.s))
      parts.push(
        <mark key={i} className={`hl-${m.color} rounded-[2px] text-inherit`}>
          {body.slice(Math.max(m.s, at), m.e)}
        </mark>,
      )
      at = Math.max(at, m.e)
    })
    if (at < body.length) parts.push(body.slice(at))
    return parts
  }

  function renderVerse(v: number, raw: string) {
    const key = refKey(c, book, chapter, v)
    const hl = highlights[key]
    const isSel = selected.includes(v)
    const body = clean(raw)
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
        <sup className="verse-num">{displayVerse(c, book, chapter, v)}</sup>
        {body ? (
          <span data-body={v} className={col.poetry ? 'whitespace-pre-line' : undefined}>
            {renderBody(key, body)}
          </span>
        ) : (
          <em className="text-ink-3">Not included in this translation.</em>
        )}
        {notes[key] && <StickyNote className="mx-1 inline h-[0.8em] w-[0.8em] text-accent" aria-label="Has a note" />}
        {bookmarks[key] && <Bookmark className="mx-1 inline h-[0.8em] w-[0.8em] fill-accent text-accent" aria-label="Saved" />}
      </span>
    )
  }

  // Paragraph mode: KJV's ¶ marks start new paragraphs; other texts flow together.
  const paragraphs = useMemo(() => {
    const out: number[][] = [[]]
    verses.forEach((raw, i) => {
      if (raw.startsWith(PARAGRAPH) && out[out.length - 1].length) out.push([])
      out[out.length - 1].push(i + 1)
    })
    return out
  }, [verses])

  const heading = chapterTitle(c, book, chapter)
  const rtl = t.dir === 'rtl'
  const verseMode = layout === 'verse' || col.poetry || original || rtl
  const toolbarTitle = col.single ? `${col.chapterLabel} ${chapter}` : heading.title

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-14 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-1 px-2">
          {prev ? (
            <Link
              href={chapterHref(c, prev.book, prev.chapter)}
              aria-label={`Previous: ${refLabel({ c, ...prev })}`}
              className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <span className="h-10 w-10" />
          )}
          <button
            onClick={() => setPicker('book')}
            className="flex h-10 min-w-0 items-center gap-1 rounded-full px-3 font-semibold hover:bg-surface-2"
          >
            <span className="truncate">{toolbarTitle}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
          </button>
          {col.translations.length > 1 && (
            <button
              onClick={() => setPicker('translation')}
              className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-sm font-semibold text-ink-2 hover:bg-surface-2"
              aria-label={`Translation: ${t.name}. Change`}
            >
              {t.short}
              <ChevronDown className="h-4 w-4 text-ink-3" />
            </button>
          )}
          {next ? (
            <Link
              href={chapterHref(c, next.book, next.chapter)}
              aria-label={`Next: ${refLabel({ c, ...next })}`}
              className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          ) : (
            <span className="ml-auto h-10 w-10" />
          )}
        </div>
      </div>

      <article className="mx-auto max-w-2xl px-5 pb-48 pt-8">
        <Link href={collectionHref(c)} className="mb-1 block text-center text-xs font-semibold uppercase tracking-wider text-accent">
          {col.name}
        </Link>
        <h1 className="text-center font-serif text-3xl font-semibold tracking-tight">{heading.title}</h1>
        {heading.subtitle && <p className="mt-1 text-center text-ink-2">{heading.subtitle}</p>}
        <div className="mb-6" />
        {loadError && (
          <p className="mb-4 rounded-lg bg-surface-2 p-3 text-sm text-ink-2">
            Could not load the {translationById(translation).short} text. Check your connection and try again.
          </p>
        )}
        {!text && !loadError && (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-surface-2" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
            ))}
          </div>
        )}
        <div
          ref={article}
          dir={rtl ? 'rtl' : undefined}
          lang={t.lang}
          className={`scripture text-ink ${rtl ? 'arabic text-right' : ''}`}
        >
          {verseMode
            ? verses.map((raw, i) => (
                <div key={i} className={original ? 'mb-5' : 'mb-2'}>
                  {original?.[i] && (
                    <p dir="rtl" lang="ar" className="arabic mb-1 text-right text-ink">
                      {original[i]}
                    </p>
                  )}
                  <p>{renderVerse(i + 1, raw)}</p>
                </div>
              ))
            : paragraphs.map((group, i) => (
                <p key={i} className="mb-4">
                  {group.map((v) => (
                    <span key={v}>{renderVerse(v, verses[v - 1])} </span>
                  ))}
                </p>
              ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3">
          {prev ? (
            <Link href={chapterHref(c, prev.book, prev.chapter)} className="rounded-xl border border-line p-4 hover:bg-surface-2">
              <span className="block text-xs text-ink-3">Previous</span>
              <span className="font-semibold">{refLabel({ c, ...prev })}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={chapterHref(c, next.book, next.chapter)} className="rounded-xl border border-line p-4 text-right hover:bg-surface-2">
              <span className="block text-xs text-ink-3">Next</span>
              <span className="font-semibold">{refLabel({ c, ...next })}</span>
            </Link>
          ) : (
            <span />
          )}
        </div>
        <p className="mt-8 text-center text-xs text-ink-3">
          {t.name}. {t.license}.
          {original && ' Arabic text: Tanzil Project (tanzil.net).'}
        </p>
        <p className="mt-2 text-center text-xs text-ink-3">Tip: tap a verse for options, or select words to highlight just those.</p>
      </article>

      {/* Highlight selected words */}
      {pending && selected.length === 0 && (
        <div className="fixed inset-x-0 z-40 px-3" style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3 shadow-2xl">
            <Highlighter className="h-4 w-4 text-ink-3" aria-hidden="true" />
            <span className="mr-1 text-sm font-semibold">Highlight</span>
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => highlightWords(color)}
                aria-label={`Highlight selected words ${color}`}
                className={`hl-${color} h-9 w-9 rounded-full border border-line`}
              />
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShareText({ text: pendingText(pending), label: labelFor(pending.map((p) => p.v)) })}
              className="ml-auto inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-sm font-semibold text-ink-2"
            >
              <ImageIcon className="h-4 w-4" /> Share
            </button>
          </div>
        </div>
      )}

      {/* Actions for selected verses */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 z-40 px-3" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{selected.length === 1 ? labelFor(selected) : `${selected.length} selected`}</p>
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
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => highlightVerses(color)}
                  aria-label={`Highlight ${color}`}
                  className={`hl-${color} h-9 w-9 rounded-full border border-line`}
                />
              ))}
              {keys.some((k) => highlights[k] || marks[k]?.some((m) => m.t === t.id)) && (
                <button onClick={() => highlightVerses(null)} className="ml-1 rounded-full px-3 py-2 text-xs font-semibold text-ink-2 hover:bg-surface-2">
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
              {col.xref || col.translations.length > 1 ? (
                <ActionButton label="Study" onClick={() => setStudyFor(selected[0])}>
                  <Library className="h-5 w-5" />
                </ActionButton>
              ) : (
                <ActionButton
                  label="Copy"
                  onClick={() => {
                    copy(selectionText(), labelFor(selected))
                    setSelected([])
                  }}
                >
                  <Copy className="h-5 w-5" />
                </ActionButton>
              )}
              {(col.xref || col.translations.length > 1) && (
                <ActionButton
                  label="Copy"
                  onClick={() => {
                    copy(selectionText(), labelFor(selected))
                    setSelected([])
                  }}
                >
                  <Copy className="h-5 w-5" />
                </ActionButton>
              )}
              <ActionButton label="Share" onClick={() => setShareText({ text: selectionText(), label: labelFor(selected) })}>
                <ImageIcon className="h-5 w-5" />
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <BookPickerSheet
        open={picker === 'book'}
        onClose={() => setPicker(null)}
        c={c}
        currentBook={book}
        onPick={(b, ch) => {
          setPicker(null)
          router.push(chapterHref(c, b, ch))
        }}
      />
      <TranslationSheet c={c} open={picker === 'translation'} onClose={() => setPicker(null)} />
      {noteFor !== null && (
        <NoteSheet
          c={c}
          book={book}
          chapter={chapter}
          verse={noteFor}
          verseText={clean(verses[noteFor - 1] ?? '')}
          onClose={() => {
            setNoteFor(null)
            setSelected([])
          }}
        />
      )}
      {studyFor !== null && (
        <StudySheet
          c={c}
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
      {shareText && (
        <ShareImageSheet
          text={shareText.text}
          reference={`${shareText.label} · ${t.short}`}
          rtl={rtl}
          link={chapterHref(c, book, chapter, selected[0] ?? pending?.[0]?.v)}
          onClose={() => {
            setShareText(null)
            setSelected([])
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
