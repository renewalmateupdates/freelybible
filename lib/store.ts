'use client'

import { useSyncExternalStore } from 'react'

// Everything a reader saves lives on their own device. No account, no server.
// One JSON blob in localStorage; Settings > Back up exports it as a file.

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
export const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'purple']

export type Theme = 'system' | 'light' | 'sepia' | 'dark'

export type Settings = {
  translation: string
  theme: Theme
  fontSize: number
  layout: 'verse' | 'paragraph'
}

export type Note = { text: string; updatedAt: number }
export type PlanProgress = { startedAt: number; done: number[] }

export type State = {
  version: 1
  settings: Settings
  lastRead: { book: number; chapter: number } | null
  highlights: Record<string, HighlightColor>
  notes: Record<string, Note>
  bookmarks: Record<string, number>
  plans: Record<string, PlanProgress>
  feed: { seed: number; cursor: number }
}

const KEY = 'freely:v1'

export const DEFAULT_STATE: State = {
  version: 1,
  settings: { translation: 'bsb', theme: 'system', fontSize: 19, layout: 'verse' },
  lastRead: null,
  highlights: {},
  notes: {},
  bookmarks: {},
  plans: {},
  feed: { seed: 1, cursor: 0 },
}

let state: State = DEFAULT_STATE
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) state = normalize(JSON.parse(raw))
    else state = { ...DEFAULT_STATE, feed: { seed: Math.floor(Math.random() * 1e9) + 1, cursor: 0 } }
  } catch {
    state = DEFAULT_STATE
  }
}

function normalize(data: Partial<State>): State {
  return {
    ...DEFAULT_STATE,
    ...data,
    version: 1,
    settings: { ...DEFAULT_STATE.settings, ...(data.settings ?? {}) },
    highlights: { ...(data.highlights ?? {}) },
    notes: { ...(data.notes ?? {}) },
    bookmarks: { ...(data.bookmarks ?? {}) },
    plans: { ...(data.plans ?? {}) },
    feed: { ...DEFAULT_STATE.feed, ...(data.feed ?? {}) },
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
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return select(s)
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

export function setLastRead(book: number, chapter: number) {
  set((s) => ({ ...s, lastRead: { book, chapter } }))
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

export function setFeedCursor(cursor: number) {
  set((s) => ({ ...s, feed: { ...s.feed, cursor } }))
}

export function resetFeed() {
  set((s) => ({ ...s, feed: { seed: Math.floor(Math.random() * 1e9) + 1, cursor: 0 } }))
}

// ---- backup

export function exportData(): string {
  load()
  return JSON.stringify({ app: 'freely-bible', exportedAt: new Date().toISOString(), data: state }, null, 2)
}

/** Merges a backup into what is already on the device. Newer notes win. */
export function importData(json: string): { highlights: number; notes: number; bookmarks: number } {
  const parsed = JSON.parse(json)
  const incoming: Partial<State> = parsed?.data ?? parsed
  if (!incoming || typeof incoming !== 'object') throw new Error('Not a Freely backup file')
  const inc = normalize(incoming)
  set((s) => {
    const notes = { ...s.notes }
    for (const [k, n] of Object.entries(inc.notes)) {
      if (!notes[k] || notes[k].updatedAt < n.updatedAt) notes[k] = n
    }
    return {
      ...s,
      highlights: { ...s.highlights, ...inc.highlights },
      notes,
      bookmarks: { ...inc.bookmarks, ...s.bookmarks },
      plans: { ...inc.plans, ...s.plans },
    }
  })
  return {
    highlights: Object.keys(inc.highlights).length,
    notes: Object.keys(inc.notes).length,
    bookmarks: Object.keys(inc.bookmarks).length,
  }
}

export function clearAll() {
  set(() => ({ ...DEFAULT_STATE, feed: { seed: Math.floor(Math.random() * 1e9) + 1, cursor: 0 } }))
}
