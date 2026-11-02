// Turns what people type into a place in the library: "John 3:16", "jn 3 16", "1 cor 13",
// "Quran 2:255", "surah 36", "Gita 2", "Dhammapada 183", "Tao 1", "Analects 2.4",
// "Alma 32:21", "Tobit 4". Pure function, tested in scripts/reference.test.mjs.
import catalog from './catalog.json' with { type: 'json' }

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const ORDINAL = { first: '1', second: '2', third: '3', fourth: '4', '1st': '1', '2nd': '2', '3rd': '3', '4th': '4', i: '1', ii: '2', iii: '3', iv: '4' }

// Names for the single-book texts, which people cite by the work's name.
const WORK_ALIASES = {
  quran: ['quran', 'koran', 'quraan', 'surah', 'sura', 'surat'],
  gita: ['gita', 'bhagavad gita', 'bhagavadgita', 'bhagavad', 'bg'],
  dhammapada: ['dhammapada', 'dhp'],
  'tao-te-ching': ['tao te ching', 'tao teh king', 'taoteching', 'tao', 'daodejing', 'ttc'],
  analects: ['analects', 'lunyu', 'confucius'],
}

const lookup = new Map() // normalized name -> [{ c, book }]
function add(name, c, book) {
  const k = norm(name)
  if (!k) return
  const list = lookup.get(k) ?? []
  if (!list.some((x) => x.c === c && x.book === book)) list.push({ c, book })
  lookup.set(k, list)
}
const bible = catalog.collections.find((c) => c.id === 'bible')
const bibleAliases = new Map(bible.books.map((b) => [b.slug, [b.name, b.abbr, ...(b.aliases ?? [])]]))
for (const col of catalog.collections) {
  if (WORK_ALIASES[col.id]) {
    for (const a of WORK_ALIASES[col.id]) add(a, col.id, 0)
    continue
  }
  col.books.forEach((b, i) => {
    for (const n of [b.name, b.slug, b.abbr, ...(b.aliases ?? []), ...(bibleAliases.get(b.slug) ?? [])]) if (n) add(n, col.id, i)
  })
}
for (const [extra, slug] of [['ecclesiasticus', 'sirach'], ['sir', 'sirach'], ['wis', 'wisdom'], ['tob', 'tobit'], ['jdt', 'judith'], ['bar', 'baruch'], ['1 macc', '1-maccabees'], ['2 macc', '2-maccabees']]) {
  const cat = catalog.collections.find((c) => c.id === 'catholic')
  const i = cat.books.findIndex((b) => b.slug === slug)
  if (i !== -1) add(extra, 'catholic', i)
}

const DEFAULT_ORDER = catalog.collections.map((c) => c.id)

function findBook(raw, prefer) {
  let words = raw.trim().toLowerCase().split(/\s+/)
  if (words.length > 1 && ORDINAL[words[0]]) words = [ORDINAL[words[0]], ...words.slice(1)]
  const key = norm(words.join(''))
  if (!key) return null
  let hits = lookup.get(key)
  if (!hits) {
    // A unique prefix of a full name: "phile" -> Philemon, "moro" -> Moroni.
    const keys = [...lookup.keys()].filter((k) => k.length > 3 && k.startsWith(key))
    const found = new Map()
    for (const k of keys) for (const h of lookup.get(k)) found.set(`${h.c}.${h.book}`, h)
    const names = new Set([...found.values()].map((h) => norm(catalog.collections.find((c) => c.id === h.c).books[h.book].name)))
    if (names.size !== 1) return null
    hits = [...found.values()]
  }
  const order = [...prefer, ...DEFAULT_ORDER]
  return hits.slice().sort((a, b) => order.indexOf(a.c) - order.indexOf(b.c))[0]
}

/**
 * @param {string} input
 * @param {string[]} [prefer] collection ids to prefer when a name exists in several (e.g. Genesis)
 * @returns {{ c: string, book: number, chapter: number, verse?: number, endVerse?: number } | null}
 */
export function parseReference(input, prefer = []) {
  if (!input) return null
  const s = input.trim().replace(/[–—]/g, '-')
  const m = s.match(/^((?:[1-4]|i{1,3}|iv|first|second|third|fourth|1st|2nd|3rd|4th)?\s*[a-z][a-z .']*?)\s*(\d+(?:\s*[:.\s]\s*\d+)*)?(?:\s*-\s*(\d+))?\s*$/i)
  if (!m) return null
  const hit = findBook(m[1], prefer)
  if (!hit) return null
  const col = catalog.collections.find((c) => c.id === hit.c)
  const nums = m[2] ? m[2].split(/\s*[:.\s]\s*/).map(Number) : []
  const end = m[3] ? Number(m[3]) : undefined

  let book = hit.book
  let chapter = nums[0] ?? 1
  let verse = nums[1]

  if (col.id === 'analects') {
    // Analects book.chapter.paragraph
    book = (nums[0] ?? 1) - 1
    chapter = nums[1] ?? 1
    verse = nums[2]
    if (!col.books[book]) return null
  } else if (col.id === 'dhammapada' && nums.length === 1) {
    // A single number is the traditional verse number, 1-423.
    const starts = col.books[0].verseStart
    const n = nums[0]
    const ci = starts.findIndex((st, i) => n >= st && n < st + col.books[0].lengths[i])
    if (ci === -1) return null
    chapter = ci + 1
    verse = n - starts[ci] + 1
  }

  const lengths = col.books[book].lengths
  // One-chapter books: "Jude 5" means verse 5.
  if (lengths.length === 1 && nums.length === 1 && col.id !== 'dhammapada') {
    verse = chapter
    chapter = 1
  }
  if (chapter < 1 || chapter > lengths.length) return null
  if (verse !== undefined && (verse < 1 || verse > lengths[chapter - 1])) return null
  const ref = { c: col.id, book, chapter }
  if (verse) ref.verse = verse
  if (verse && end && end > verse) ref.endVerse = Math.min(end, lengths[chapter - 1])
  return ref
}
