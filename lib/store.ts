'use client'

import { useSyncExternalStore } from 'react'
import { migrateKey } from './library'

// Everything a reader saves lives on their own device. No account needed.
// One JSON blob in localStorage; Settings > Back up exports it as a file.

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'purple']

export type Theme = 'system' | 'light' | 'sepia' | 'dark'

export type Settings = {
  /** Chosen translation per collection, e.g. { bible: 'kjv', quran: 'pickthall' }. */
  translations: Record<string, string>
  theme: Theme
  fontSize: number
  layout: 'verse' | 'paragraph'
  /** Collections the reader picked. null = not asked yet, [] = show everything. */
  library: string[] | null
  /** Show the original language (the Quran's Arabic) alongside the translation. */
  showOriginal: boolean
}

export type Note = { text: string; updatedAt: number }
export type PlanProgress = { startedAt: number; done: number[] }
/** A highlight on part of a verse: characters s to e of that translation's text. */
export type Mark = { t: string; s: number; e: number; color: HighlightColor }

export type State = {
  version: 2
  settings: Settings
  lastRead: { c: string; book: number; chapter: number } | null
  highlights: Record<string, HighlightColor>
  marks: Record<string, Mark[]>
  notes: Record<string, Note>
  bookmarks: Record<string, number>
  plans: Record<string, PlanProgress>
  feed: { seen: string[] }
}

const KEY = 'freely:v1'

export const DEFAULT_STATE: State = {
  version: 2,
  settings: { translations: {}, theme: 'system', fontSize: 19, layout: 'verse', library: null, showOriginal: true },
  lastRead: null,
  highlights: {},
  marks: {},
  notes: {},
  bookmarks: {},
  plans: {},
  feed: { seen: [] },
}

let state: State = DEFAULT_STATE
let loaded = false
const listeners = new Set<() => void>()

function rekey<T>(obj: Record<string, T> | undefined): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(obj ?? {})) out[migrateKey(k)] = v
  return out
}

/** Accepts both the current shape and the Bible-only shape from before the library grew. */
type Legacy = Partial<State> & {
  settings?: Partial<Settings> & { translation?: string }
  lastRead?: { c?: string; book: number; chapter: number } | null
}
function normalize(data: Legacy): State {
  const s: Partial<Settings> & { translation?: string } = data.settings ?? {}
  const translations = { ...(s.translations ?? {}) }
  if (s.translation && !translations.bible) translations.bible = s.translation
  return {
    version: 2,
    settings: {
      ...DEFAULT_STATE.settings,
      theme: s.theme ?? DEFAULT_STATE.settings.theme,
      fontSize: s.fontSize ?? DEFAULT_STATE.settings.fontSize,
      layout: s.layout ?? DEFAULT_STATE.settings.layout,
      library: s.library ?? null,
      showOriginal: s.showOriginal ?? true,
      translations,
    },
    lastRead: data.lastRead ? { c: data.lastRead.c ?? 'bible', book: data.lastRead.book, chapter: data.lastRead.chapter } : null,
    highlights: rekey(data.highlights),
    marks: rekey(data.marks),
    notes: rekey(data.notes),
    bookmarks: rekey(data.bookmarks),
    plans: { ...(data.plans ?? {}) },
    feed: { seen: Array.isArray(data.feed?.seen) ? data.feed!.seen.slice(-600) : [] },
  }
}

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) state = normalize(JSON.parse(raw))
  } catch {
    state = DEFAULT_STATE
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked (private mode). The session still works; nothing is saved.
  }
}

function set(update: (s: State) => State) {
  load()
  state = update(state)
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false
      load()
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot() {
  load()
  return state
}

function getServerSnapshot() {
  return DEFAULT_STATE
}

export function useStore<T>(select: (s: State) => T): T {
  return select(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot))
}

/** True after hydration, when the reader's saved state is available. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function getState(): State {
  return getSnapshot()
}

// ---- actions

export function updateSettings(patch: Partial<Settings>) {
  set((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
}

export function setTranslation(c: string, t: string) {
  set((s) => ({ ...s, settings: { ...s.settings, translations: { ...s.settings.translations, [c]: t } } }))
}

export function setLastRead(c: string, book: number, chapter: number) {
  set((s) => ({ ...s, lastRead: { c, book, chapter } }))
}

export function setHighlight(keys: string[], color: HighlightColor | null) {
  set((s) => {
    const highlights = { ...s.highlights }
    for (const k of keys) {
      if (color) highlights[k] = color
      else delete highlights[k]
    }
    return { ...s, highlights }
  })
}

/** Adds a word-level highlight, replacing any overlapping marks in the same translation. */
export function addMark(key: string, mark: Mark) {
  set((s) => {
    const existing = (s.marks[key] ?? []).filter((m) => m.t !== mark.t || m.e <= mark.s || m.s >= mark.e)
    return { ...s, marks: { ...s.marks, [key]: [...existing, mark].sort((a, b) => a.s - b.s) } }
  })
}

export function clearMarks(keys: string[], translation: string) {
  set((s) => {
    const marks = { ...s.marks }
    for (const k of keys) {
      const left = (marks[k] ?? []).filter((m) => m.t !== translation)
      if (left.length) marks[k] = left
      else delete marks[k]
    }
    return { ...s, marks }
  })
}

export function setNote(key: string, text: string) {
  set((s) => {
    const notes = { ...s.notes }
    if (text.trim()) notes[key] = { text: text.trim(), updatedAt: Date.now() }
    else delete notes[key]
    return { ...s, notes }
  })
}

export function setBookmarks(keys: string[], on: boolean) {
  set((s) => {
    const bookmarks = { ...s.bookmarks }
    for (const k of keys) {
      if (on) bookmarks[k] = bookmarks[k] ?? Date.now()
      else delete bookmarks[k]
    }
    return { ...s, bookmarks }
  })
}

export function startPlan(id: string) {
  set((s) => ({ ...s, plans: { ...s.plans, [id]: { startedAt: Date.now(), done: [] } } }))
}

export function stopPlan(id: string) {
  set((s) => {
    const plans = { ...s.plans }
    delete plans[id]
    return { ...s, plans }
  })
}

export function setPlanDay(id: string, day: number, done: boolean) {
  set((s) => {
    const p = s.plans[id] ?? { startedAt: Date.now(), done: [] }
    const doneSet = new Set(p.done)
    if (done) doneSet.add(day)
    else doneSet.delete(day)
    return { ...s, plans: { ...s.plans, [id]: { ...p, done: Array.from(doneSet).sort((a, b) => a - b) } } }
  })
}

/** Remembers the last 600 feed cards so a fresh shuffle does not repeat them. */
export function markFeedSeen(ids: string[]) {
  set((s) => {
    const seen = new Set(s.feed.seen)
    for (const id of ids) seen.add(id)
    return { ...s, feed: { seen: Array.from(seen).slice(-600) } }
  })
}

export function resetFeedSeen() {
  set((s) => ({ ...s, feed: { seen: [] } }))
}

// ---- backup

export function exportData(): string {
  load()
  return JSON.stringify({ app: 'freely-scripture', exportedAt: new Date().toISOString(), data: state }, null, 2)
}

/** Merges a backup into what is already on the device. Newer notes win. */
export function importData(json: string): { highlights: number; notes: number; bookmarks: number } {
  const parsed = JSON.parse(json)
  const incoming: Legacy = parsed?.data ?? parsed
  if (!incoming || typeof incoming !== 'object' || !('settings' in incoming || 'notes' in incoming)) {
    throw new Error('Not a Freely backup file')
  }
  const inc = normalize(incoming)
  set((s) => {
    const notes = { ...s.notes }
    for (const [k, n] of Object.entries(inc.notes)) {
      if (!notes[k] || notes[k].updatedAt < n.updatedAt) notes[k] = n
    }
    return {
      ...s,
      highlights: { ...s.highlights, ...inc.highlights },
      marks: { ...inc.marks, ...s.marks },
      notes,
      bookmarks: { ...inc.bookmarks, ...s.bookmarks },
      plans: { ...inc.plans, ...s.plans },
    }
  })
  return {
    highlights: Object.keys(inc.highlights).length + Object.keys(inc.marks).length,
    notes: Object.keys(inc.notes).length,
    bookmarks: Object.keys(inc.bookmarks).length,
  }
}

export function clearAll() {
  set((s) => ({ ...DEFAULT_STATE, settings: { ...DEFAULT_STATE.settings, library: s.settings.library } }))
}

/** The translation a reader uses for a collection. */
export function useTranslation(c: string, translations: string[]): string {
  const chosen = useStore((s) => s.settings.translations[c])
  return chosen && translations.includes(chosen) ? chosen : translations[0]
}
