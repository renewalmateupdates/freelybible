// Parses what people type into a Bible reference: "John 3:16", "jn 3 16", "1 cor 13",
// "ps 23", "Song of Solomon 2:4-7", "1st john 4". Pure function, tested in scripts/.
import books from './books.json' with { type: 'json' }

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const ordinal = { first: '1', second: '2', third: '3', '1st': '1', '2nd': '2', '3rd': '3', i: '1', ii: '2', iii: '3' }

const lookup = new Map()
books.forEach((b, i) => {
  const keys = [b.name, b.id, b.abbr, b.slug, ...b.aliases]
  for (const k of keys) lookup.set(norm(k), i)
})

function findBook(raw) {
  let words = raw.trim().toLowerCase().split(/\s+/)
  if (words.length > 1 && ordinal[words[0]]) words = [ordinal[words[0]], ...words.slice(1)]
  const key = norm(words.join(''))
  if (!key) return undefined
  if (lookup.has(key)) return lookup.get(key)
  // Unique prefix of a full book name ("phile" -> Philemon, "rev" -> Revelation).
  const matches = books
    .map((b, i) => ({ i, n: norm(b.name) }))
    .filter((x) => x.n.startsWith(key))
  if (matches.length === 1) return matches[0].i
  return undefined
}

/**
 * @param {string} input
 * @returns {{ book: number, chapter: number, verse?: number, endVerse?: number } | null}
 */
export function parseReference(input) {
  if (!input) return null
  const s = input.trim().replace(/[–—]/g, '-')
  const m = s.match(/^((?:[1-3]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*[a-z][a-z .]*?)\s*(\d+)?(?:\s*[:.\s]\s*(\d+))?(?:\s*-\s*(\d+))?\s*$/i)
  if (!m) return null
  const book = findBook(m[1])
  if (book === undefined) return null
  const max = books[book].chapters
  let chapter = m[2] ? parseInt(m[2], 10) : 1
  let verse = m[3] ? parseInt(m[3], 10) : undefined
  // One-chapter books: "Jude 5" means verse 5.
  if (max === 1 && m[2] && !m[3]) {
    verse = chapter
    chapter = 1
  }
  if (chapter < 1 || chapter > max) return null
  const endVerse = m[4] ? parseInt(m[4], 10) : undefined
  const ref = { book, chapter }
  if (verse) ref.verse = verse
  if (verse && endVerse && endVerse > verse) ref.endVerse = endVerse
  return ref
}
