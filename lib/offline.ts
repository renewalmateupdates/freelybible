'use client'

import { visibleCollections } from './library'
import { translationFiles } from './data'
import { getState } from './store'

const DONE_KEY = 'freely:offline-saved'

/** Every file needed to read the reader's library with no connection. */
export function libraryFiles(): string[] {
  const s = getState().settings
  const files = new Set<string>(['/data/votd/bible.json'])
  for (const col of visibleCollections(s.library)) {
    const chosen = s.translations[col.id]
    const t = chosen && col.translations.includes(chosen) ? chosen : col.translations[0]
    for (const f of translationFiles(t)) files.add(f)
    if (col.original && s.showOriginal) for (const f of translationFiles(col.original)) files.add(f)
  }
  return Array.from(files)
}

/** Fetches files so the service worker keeps them. Returns how many failed. */
export async function saveFiles(files: string[], onProgress?: (done: number, total: number) => void): Promise<number> {
  let done = 0
  let failed = 0
  const queue = [...files]
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift()!
      try {
        const r = await fetch(path)
        if (!r.ok) failed++
        await r.arrayBuffer()
      } catch {
        failed++
      }
      onProgress?.(++done, files.length)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return failed
}

export function offlineSaved(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === libraryFiles().length.toString()
  } catch {
    return false
  }
}

export function markOfflineSaved() {
  try {
    localStorage.setItem(DONE_KEY, libraryFiles().length.toString())
  } catch {}
}

