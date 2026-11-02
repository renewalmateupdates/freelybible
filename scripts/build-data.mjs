// Builds the compact data the app ships with, from data-src/ (see fetch-sources.mjs).
//   public/data/<t>/<book-slug>.json   chapters -> verse strings ("" = verse not in this translation)
//   public/data/<t>/feed.json          popular verses for the scroll feed: [book, chapter, verse, text]
//   public/data/xref/<book-slug>.json  { "c.v": [[book, chapter, verse, endChapter?, endVerse?], ...] }
//   public/data/votd.json              verse-of-the-day references, one per day of the year
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { TRANSLATIONS } from '../lib/translations.mjs'

const books = JSON.parse(await readFile('lib/books.json', 'utf8'))
const bookIndex = new Map(books.map((b, i) => [b.id, i]))
const OUT = 'public/data'

await rm(OUT, { recursive: true, force: true })
await mkdir(`${OUT}/xref`, { recursive: true })

function clean(text) {
  return text.replace(/\s+/g, ' ').trim()
}

// ---- KJV fixes
// 1. The source lost the small capitals the KJV uses for God's name (LORD, GOD). The CrossWire
//    KJV marks those words <divineName>; we re-capitalize the same occurrences in our text.
// 2. Chapter openings carry a decorative all-caps first word ("IN the beginning").
const NAME_RE = /(?<![A-Za-z])(Lord|God|Jehovah|Jah|LORD)(’s)?(?![A-Za-z])/g
async function divineNameFlags() {
  const osis = JSON.parse(await readFile('data-src/KJV-osis.json', 'utf8'))
  const flags = new Map()
  osis.books.forEach((book, bi) =>
    book.chapters.forEach((ch) =>
      ch.verses.forEach((v) => {
        const marked = v.text
          .replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, '') // margin notes are not verse text
          .replace(/<divineName>([^<]*)<\/divineName>/g, '\u0001$1\u0002')
          .replace(/<[^>]+>/g, '')
        const seq = []
        for (const m of marked.matchAll(/(\u0001)?(?<![A-Za-z])(Lord|God|Jehovah|Jah|LORD)(’s)?(?![A-Za-z])(\u0002)?/g)) seq.push(Boolean(m[1]))
        flags.set(`${bi}.${ch.chapter}.${v.verse}`, seq)
      }),
    ),
  )
  return flags
}
const kjvStats = { lord: 0, mismatched: 0, openings: 0 }
function fixKjv(text, key, verse, flags) {
  let t = text
  if (verse === 1) {
    t = t.replace(/(?<![A-Za-z])([A-Z])([A-Z]+)(?![A-Za-z])/, (w, a, rest) => {
      if (['LORD', 'GOD'].includes(w)) return w
      kjvStats.openings++
      return a + rest.toLowerCase()
    })
  }
  const seq = flags.get(key)
  const matches = [...t.matchAll(NAME_RE)]
  if (!seq || seq.length !== matches.length) {
    if (seq && seq.some(Boolean)) kjvStats.mismatched++
    return t
  }
  let i = 0
  return t.replace(NAME_RE, (w, name, poss = '') => {
    const divine = seq[i++]
    if (!divine) return w
    kjvStats.lord++
    return name.toUpperCase() + poss
  })
}

// ---- translations
const texts = {}
const kjvFlags = await divineNameFlags()
for (const t of TRANSLATIONS) {
  const src = JSON.parse(await readFile(`data-src/${t.source}`, 'utf8'))
  if (src.books.length !== 66) throw new Error(`${t.id}: expected 66 books`)
  await mkdir(`${OUT}/${t.id}`, { recursive: true })
  texts[t.id] = src.books.map((book, bi) => {
    if (book.chapters.length !== books[bi].chapters) throw new Error(`${t.id} ${books[bi].name}: chapter count`)
    const chapters = book.chapters.map((ch) => {
      const max = Math.max(...ch.verses.map((v) => v.verse))
      const verses = Array(max).fill('')
      for (const v of ch.verses) {
        const text = clean(v.text)
        verses[v.verse - 1] = t.id === 'kjv' ? fixKjv(text, `${bi}.${ch.chapter}.${v.verse}`, v.verse, kjvFlags) : text
      }
      return verses
    })
    return chapters
  })
  for (let bi = 0; bi < 66; bi++) {
    await writeFile(`${OUT}/${t.id}/${books[bi].slug}.json`, JSON.stringify(texts[t.id][bi]))
  }
  console.log(t.id, 'written', t.id === 'kjv' ? kjvStats : '')
}

// ---- cross-references (openbible.info, CC-BY): keep the strongest 12 per verse with 2+ votes
function parseRef(s) {
  const [start, end] = s.split('-')
  const [b, c, v] = start.split('.')
  const bi = bookIndex.get(b)
  if (bi === undefined) return null
  const ref = [bi, +c, +v]
  if (end) {
    const [eb, ec, ev] = end.split('.')
    if (eb === b) ref.push(+ec, +ev)
  }
  return ref
}
const xrefLines = (await readFile('data-src/cross_references.txt', 'utf8')).split('\n').slice(1)
const xref = books.map(() => ({}))
const popularity = new Map() // "b.c.v" -> incoming votes
for (const line of xrefLines) {
  if (!line.trim()) continue
  const [from, to, votesRaw] = line.split('\t')
  const votes = +votesRaw
  const f = parseRef(from)
  const t = parseRef(to)
  if (!f || !t) continue
  if (votes > 0) {
    const key = `${t[0]}.${t[1]}.${t[2]}`
    popularity.set(key, (popularity.get(key) || 0) + votes)
  }
  if (votes < 2) continue
  const k = `${f[1]}.${f[2]}`
  ;(xref[f[0]][k] ||= []).push([votes, t])
}
for (let bi = 0; bi < 66; bi++) {
  const out = {}
  for (const [k, list] of Object.entries(xref[bi])) {
    out[k] = list.sort((a, b) => b[0] - a[0]).slice(0, 12).map((x) => x[1])
  }
  await writeFile(`${OUT}/xref/${books[bi].slug}.json`, JSON.stringify(out))
}
console.log('xref written')

// ---- feed: the most cross-referenced verses that read well on their own
const ranked = [...popularity.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k.split('.').map(Number))
const bsb = texts.bsb
const pool = []
for (const [b, c, v] of ranked) {
  const text = bsb[b]?.[c - 1]?.[v - 1]
  if (!text || text.length < 40 || text.length > 320) continue
  pool.push([b, c, v])
  if (pool.length >= 2000) break
}
for (const t of TRANSLATIONS) {
  const feed = pool.map(([b, c, v]) => [b, c, v, texts[t.id][b][c - 1]?.[v - 1] || ''])
  await writeFile(`${OUT}/${t.id}/feed.json`, JSON.stringify(feed))
}
console.log('feed written', pool.length)

// ---- verse of the day: 366 short, well-known verses in a fixed shuffled order
let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const votdPool = pool.filter(([b, c, v]) => {
  const len = bsb[b][c - 1][v - 1].length
  return len >= 60 && len <= 240
}).slice(0, 366)
for (let i = votdPool.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1))
  ;[votdPool[i], votdPool[j]] = [votdPool[j], votdPool[i]]
}
await mkdir(`${OUT}/votd`, { recursive: true })
await writeFile(`${OUT}/votd/bible.json`, JSON.stringify(votdPool))
console.log('votd written', votdPool.length)

// ---- verse counts per chapter (BSB numbering), used to balance reading plans
await writeFile('lib/chapter-lengths.json', JSON.stringify(bsb.map((chapters) => chapters.map((v) => v.length))))
console.log('chapter lengths written')
