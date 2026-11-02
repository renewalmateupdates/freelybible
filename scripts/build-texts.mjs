// Builds every collection beyond the Protestant Bible (which build-data.mjs builds), and
// writes lib/catalog.json: the one list of collections, books, chapters and translations
// the whole app reads. Run after build-data.mjs:  node scripts/build-texts.mjs
//
// Output per translation: public/data/<translation>/<book-slug>.json, chapters -> verses.
// Poetry keeps its line breaks as "\n" inside a verse.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { TRANSLATIONS as BIBLE_TRANSLATIONS } from '../lib/translations.mjs'

const OUT = 'public/data'
const src = (f) => readFile(`data-src/${f}`, 'utf8')
const json = async (f) => JSON.parse(await src(f))
const stats = {}

function tidy(s) {
  return s
    .replace(/--/g, '—')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}
const roman = (r) => {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 }
  let n = 0
  for (let i = 0; i < r.length; i++) n += v[r[i]] < (v[r[i + 1]] ?? 0) ? -v[r[i]] : v[r[i]]
  return n
}
const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, p, c) => p + c.toUpperCase()).replace(/\b(Of|The|By|And|In|From)\b/g, (w, _, i) => (i === 0 ? w : w.toLowerCase()))

async function writeBooks(translation, books) {
  await mkdir(`${OUT}/${translation}`, { recursive: true })
  for (const b of books) await writeFile(`${OUT}/${translation}/${b.slug}.json`, JSON.stringify(b.text))
  stats[translation] = books.reduce((n, b) => n + b.text.reduce((m, ch) => m + ch.filter(Boolean).length, 0), 0)
}

// ---------------------------------------------------------------- scrollmapper JSON Bibles
function bibleBookName(raw) {
  return raw
    .replace(/^III /, '3 ')
    .replace(/^II /, '2 ')
    .replace(/^I /, '1 ')
    .replace('Revelation of John', 'Revelation')
    .replace('Prayer of Manasses', 'Prayer of Manasseh')
    .replace('Additional Psalm', 'Psalm 151')
}
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function jsonBible(file) {
  const d = await json(file)
  return d.books.map((book) => {
    const name = bibleBookName(book.name)
    const text = book.chapters.map((ch) => {
      const max = Math.max(...ch.verses.map((v) => v.verse))
      const verses = Array(max).fill('')
      for (const v of ch.verses) verses[v.verse - 1] = v.text.replace(/\s+/g, ' ').trim()
      // Chapter openings carry decorative capitals ("IN THE beginning"); make them sentence case.
      if (verses[0]) {
        verses[0] = verses[0].replace(/^((?:[A-Z]{2,}[,;:]?\s+)+)(?=[A-Za-z])/, (caps) => {
          const words = caps.trim().split(/\s+/)
          if (words.some((w) => ['LORD', 'GOD'].includes(w.replace(/\W/g, '')))) return caps
          return words.map((w, i) => (i === 0 ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase())).join(' ') + ' '
        })
      }
      return verses
    })
    return { slug: slugify(name), name, text }
  })
}

// ---------------------------------------------------------------- Quran
async function quran() {
  const info = await json('quran-info.json')
  const build = async (file) => {
    const { quran } = await json(file)
    const chapters = info.chapters.map((c) => Array(c.verses.length).fill(''))
    for (const v of quran) chapters[v.chapter - 1][v.verse - 1] = v.text.trim()
    return chapters
  }
  const en = await build('quran-eng-mohammedmarmadu.json')
  const ar = await build('quran-ara-quransimple.json')
  const chapterNames = info.chapters.map((c) => `${c.name} (${c.englishname})`)
  // Juz' (the traditional 30 parts) start points, for the "Quran in 30 days" plan.
  const juz = []
  for (const c of info.chapters) for (const v of c.verses) if (!juz[v.juz - 1]) juz[v.juz - 1] = [c.chapter, v.verse]
  return { en, ar, chapterNames, juz }
}

// ---------------------------------------------------------------- Gutenberg helpers
function between(text, startRe, endRe) {
  const s = text.search(startRe)
  const rest = text.slice(s)
  const e = rest.search(endRe)
  return e === -1 ? rest : rest.slice(0, e)
}

// Bhagavad Gita (Edwin Arnold, 1885): 18 chapters of verse; passages are stanzas.
async function gita() {
  const raw = await src('gita-arnold.txt')
  const names = [...raw.matchAll(/^\s*([IVXL]+)\. ([A-Z][A-Z ,'-]+)$/gm)].slice(0, 18).map((m) => titleCase(m[2]))
  const body = between(raw, /^CHAPTER I\s*$/m, /\*\*\* END OF/)
  const parts = body.split(/^\s*CHAPTER [IVXL]+\s*$/m).slice(1)
  const chapters = parts.map((part) => {
    const main = part.split(/^\s*HERE ENDETH/m)[0]
    return main
      .split(/\n\s*\n/)
      .map((stanza) => tidy(stanza.split('\n').map((l) => l.trim()).join('\n')))
      .filter(Boolean)
  })
  if (chapters.length !== 18) throw new Error(`Gita: ${chapters.length} chapters`)
  return { chapters, names }
}

// Dhammapada (Max Müller, 1881): 26 chapters, verses numbered 1–423 straight through.
async function dhammapada() {
  const raw = await src('dhammapada-muller.txt')
  const body = between(raw, /^Chapter I\. /m, /\*\*\* END OF/)
  const names = []
  const chapters = []
  const verseStart = []
  for (const block of body.split(/^Chapter [IVXL]+\. /m).slice(1)) {
    const [title, ...lines] = block.split('\n')
    names.push(title.trim())
    const verses = []
    let first = null
    // Müller sometimes translates two or three verses together ("58, 59. ...").
    for (const m of lines.join('\n').matchAll(/^(\d+)((?:, \d+)*)\. ([\s\S]*?)(?=^\d+(?:, \d+)*\. |(?![\s\S]))/gm)) {
      if (first === null) first = Number(m[1])
      verses.push(tidy(m[3]).replace(/\n/g, ' '))
      for (const _ of m[2].split(',').slice(1)) verses.push(`(Translated together with verse ${m[1]}.)`)
    }
    chapters.push(verses)
    verseStart.push(first)
  }
  // The Gutenberg transcription skipped from the middle of verse 127 to the middle of 128
  // (both begin "Not in the sky, not in the midst of the sea..."), so the text it numbers
  // 127 is really verse 128. Put it there and mark 127 as missing rather than invent it.
  const ci = verseStart.findIndex((s, i) => s <= 127 && 127 < s + chapters[i].length)
  if (ci !== -1 && chapters[ci][127 - verseStart[ci]].endsWith('death could not overcome (the mortal).')) {
    chapters[ci].splice(127 - verseStart[ci], 0, '(Verse 127 is missing from the Project Gutenberg edition used here.)')
  }
  const total = chapters.reduce((n, c) => n + c.length, 0)
  if (chapters.length !== 26 || total !== 423) throw new Error(`Dhammapada: ${chapters.length} chapters, ${total} verses`)
  return { chapters, names, verseStart }
}

// Tao Te Ching (James Legge, 1891): 81 chapters separated by two blank lines; numbered
// paragraphs inside; indented lines are verse and keep their line breaks.
async function tao() {
  const raw = await src('tao-legge.txt')
  const body = between(raw, /^Ch\. 1\. 1\./m, /\*\*\* END OF/).replace(/^PART [0-9I]+\.\s*$/gm, '')
  const blocks = body.split(/\n\s*\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const chapters = []
  for (const block of blocks) {
    const m = block.match(/^(?:Ch\. )?(\d+)\.\s*/)
    if (!m || Number(m[1]) !== chapters.length + 1) {
      // A stray triple gap inside a chapter: attach to the previous one.
      if (chapters.length) chapters[chapters.length - 1].push(...paragraphs(block))
      continue
    }
    chapters.push(paragraphs(block.slice(m[0].length)))
  }
  function paragraphs(text) {
    const out = []
    for (const p of text.split(/\n\s*\n(?=\d+\.(?:\s|$))/)) {
      const lines = p.replace(/^\d+\.\s*/, '').split('\n')
      const joined = lines
        .map((l) => (/^\s{2,}\S/.test(l) ? `\n${l.trim()}` : ` ${l.trim()}`))
        .join('')
        .replace(/\n\s*\n/g, '\n')
      const t = tidy(joined)
      if (t) out.push(t)
    }
    return out
  }
  if (chapters.length !== 81) throw new Error(`Tao Te Ching: ${chapters.length} chapters`)
  return { chapters }
}

// Analects (James Legge): 20 books; each book has chapters with numbered paragraphs.
async function analects() {
  const raw = await src('analects-legge.txt')
  const body = between(raw, /^BOOK I\. /m, /^End of (the )?Project Gutenberg/m)
  const books = []
  for (const block of body.split(/^BOOK [IVXL]+\.\s*/m).slice(1)) {
    const [titleLine, ...rest] = block.split('\n')
    const text = rest.join('\n')
    const chapters = []
    // Headings vary: "CHAPTER I.", "CHAP. II.", "CHAP II.", "CHAP. XVII", indented or not.
    const chunks = text.split(/^\s*(?:CHAPTER|CHAP\.?)\s+[IVXLC]+\.?\s*/m).slice(1)
    for (const chunk of chunks) {
      const paras = chunk
        .split(/\n\s*(?=\d+\.\s)/)
        .map((p) => tidy(p.replace(/^\d+\.\s*/, '').replace(/\s*\n\s*/g, ' ')))
        .filter(Boolean)
      chapters.push(paras)
    }
    books.push({ title: titleCase(titleLine.replace(/\.$/, '').trim()), chapters })
  }
  if (books.length !== 20) throw new Error(`Analects: ${books.length} books`)
  return books
}

// Book of Mormon: "1 Nephi 1:1" reference lines, each followed by the verse.
async function bookOfMormon() {
  const raw = await src('book-of-mormon.txt')
  const body = between(raw, /^1 Nephi 1:1$/m, /\*\*\* END OF/)
  const books = []
  const re = /^((?:[1-4] )?[A-Z][a-z]+(?: of [A-Z][a-z]+)?) (\d+):(\d+)\n([\s\S]*?)(?=\n\s*\n|\n(?:[1-4] )?[A-Z][a-z]+(?: of [A-Z][a-z]+)? \d+:\d+\n)/gm
  for (const m of body.matchAll(re)) {
    const [, name, c, v, text] = m
    let book = books[books.length - 1]
    if (!book || book.name !== name) books.push((book = { name, slug: slugify(name), text: [] }))
    const ch = (book.text[Number(c) - 1] ||= [])
    ch[Number(v) - 1] = tidy(text.replace(/^\s*\d+\s+/, '')).replace(/\n/g, ' ')
  }
  for (const b of books) b.text = b.text.map((ch) => Array.from(ch, (x) => x ?? ''))
  const total = books.reduce((n, b) => n + b.text.reduce((m, ch) => m + ch.length, 0), 0)
  if (books.length !== 15) throw new Error(`Book of Mormon: ${books.length} books`)
  stats.bomVerses = total
  return books
}

// ---------------------------------------------------------------- assemble
const lengthsOf = (text) => text.map((ch) => ch.length)

const bibleBooks = JSON.parse(await src('../lib/books.json'))
const bibleLengths = JSON.parse(await src('../lib/chapter-lengths.json'))

const catholic = await jsonBible('DRC.json')
const cpdv = await jsonBible('CPDV.json')
await writeBooks('drc', catholic)
await writeBooks('cpdv', cpdv)

const tanakh = await jsonBible('JPS.json')
await writeBooks('jps', tanakh)

const q = await quran()
await writeBooks('pickthall', [{ slug: 'surah', text: q.en }])
await writeBooks('quran-ar', [{ slug: 'surah', text: q.ar }])

const g = await gita()
await writeBooks('gita-arnold', [{ slug: 'chapter', text: g.chapters }])

const dh = await dhammapada()
await writeBooks('dhammapada-muller', [{ slug: 'chapter', text: dh.chapters }])

const t = await tao()
await writeBooks('tao-legge', [{ slug: 'chapter', text: t.chapters }])

const an = await analects()
const anBooks = an.map((b, i) => ({ slug: `book-${i + 1}`, name: `Book ${i + 1}`, title: b.title, text: b.chapters }))
await writeBooks('analects-legge', anBooks)

const bom = await bookOfMormon()
await writeBooks('bom', bom)

const T = (id, collection, short, name, year, license, extra = {}) => ({ id, collection, short, name, year, license, lang: 'en', dir: 'ltr', ...extra })

const catalog = {
  traditions: [
    { id: 'christianity', name: 'Christianity', collections: ['bible', 'catholic'] },
    { id: 'judaism', name: 'Judaism', collections: ['tanakh'] },
    { id: 'islam', name: 'Islam', collections: ['quran'] },
    { id: 'hinduism', name: 'Hinduism', collections: ['gita'] },
    { id: 'buddhism', name: 'Buddhism', collections: ['dhammapada'] },
    { id: 'taoism', name: 'Taoism', collections: ['tao-te-ching'] },
    { id: 'confucianism', name: 'Confucianism', collections: ['analects'] },
    { id: 'latter-day-saints', name: 'Latter-day Saints', collections: ['book-of-mormon', 'bible'] },
  ],
  collections: [
    {
      id: 'bible',
      name: 'Bible',
      description: 'The 66 books of the Protestant Bible.',
      tradition: 'christianity',
      translations: BIBLE_TRANSLATIONS.map((x) => x.id),
      chapterLabel: 'Chapter',
      verseLabel: 'verse',
      xref: true,
      seo: true,
      groups: [
        { name: 'Old Testament', from: 0, to: 38 },
        { name: 'New Testament', from: 39, to: 65 },
      ],
      books: bibleBooks.map((b, i) => ({ slug: b.slug, name: b.name, abbr: b.abbr, aliases: [b.id, ...b.aliases], lengths: bibleLengths[i] })),
    },
    {
      id: 'catholic',
      name: 'Catholic Bible',
      description: 'All 73 books, including Tobit, Judith, Wisdom, Sirach, Baruch and Maccabees, plus the Vulgate appendix. Psalms use the Vulgate numbering (Psalm 22 here is Psalm 23 in most Bibles).',
      tradition: 'christianity',
      translations: ['drc', 'cpdv'],
      chapterLabel: 'Chapter',
      verseLabel: 'verse',
      groups: [
        { name: 'Old Testament', from: 0, to: 45 },
        { name: 'New Testament', from: 46, to: 72 },
        { name: 'Appendix (Vulgate)', from: 73, to: 77 },
      ],
      books: catholic.map((b) => ({ slug: b.slug, name: b.name, lengths: lengthsOf(b.text) })),
    },
    {
      id: 'tanakh',
      name: 'Tanakh',
      description: 'The Hebrew Bible in Jewish order: Torah, Prophets and Writings, with Jewish verse numbering. This edition writes God’s name as HaShem and G-d, as many Jewish readers prefer.',
      tradition: 'judaism',
      translations: ['jps'],
      chapterLabel: 'Chapter',
      verseLabel: 'verse',
      groups: [
        { name: 'Torah', from: 0, to: 4 },
        { name: "Nevi'im (Prophets)", from: 5, to: 25 },
        { name: 'Ketuvim (Writings)', from: 26, to: 38 },
      ],
      books: tanakh.map((b) => ({ slug: b.slug, name: b.name, lengths: lengthsOf(b.text) })),
    },
    {
      id: 'quran',
      name: 'Quran',
      description: 'All 114 surahs, in English with the Arabic text alongside.',
      tradition: 'islam',
      translations: ['pickthall', 'quran-ar'],
      original: 'quran-ar',
      chapterLabel: 'Surah',
      verseLabel: 'ayah',
      seo: true,
      single: true,
      juz: q.juz,
      books: [{ slug: 'surah', name: 'Quran', chapterNames: q.chapterNames, lengths: lengthsOf(q.en) }],
    },
    {
      id: 'gita',
      name: 'Bhagavad Gita',
      description: 'The dialogue between Krishna and Arjuna, in Edwin Arnold’s verse translation. Passages are Arnold’s stanzas, not the traditional verse numbers.',
      tradition: 'hinduism',
      translations: ['gita-arnold'],
      chapterLabel: 'Chapter',
      verseLabel: 'passage',
      poetry: true,
      seo: true,
      single: true,
      books: [{ slug: 'chapter', name: 'Bhagavad Gita', chapterNames: g.names, lengths: lengthsOf(g.chapters) }],
    },
    {
      id: 'dhammapada',
      name: 'Dhammapada',
      description: 'The sayings of the Buddha in 26 chapters and 423 verses.',
      tradition: 'buddhism',
      translations: ['dhammapada-muller'],
      chapterLabel: 'Chapter',
      verseLabel: 'verse',
      seo: true,
      single: true,
      books: [{ slug: 'chapter', name: 'Dhammapada', chapterNames: dh.names, verseStart: dh.verseStart, lengths: lengthsOf(dh.chapters) }],
    },
    {
      id: 'tao-te-ching',
      name: 'Tao Te Ching',
      description: 'Lao Tzu’s 81 short chapters on the Way.',
      tradition: 'taoism',
      translations: ['tao-legge'],
      chapterLabel: 'Chapter',
      verseLabel: 'paragraph',
      poetry: true,
      seo: true,
      single: true,
      books: [{ slug: 'chapter', name: 'Tao Te Ching', lengths: lengthsOf(t.chapters) }],
    },
    {
      id: 'analects',
      name: 'Analects',
      description: 'The sayings of Confucius in 20 books.',
      tradition: 'confucianism',
      translations: ['analects-legge'],
      chapterLabel: 'Chapter',
      verseLabel: 'paragraph',
      books: anBooks.map((b) => ({ slug: b.slug, name: b.name, title: b.title, lengths: lengthsOf(b.text) })),
    },
    {
      id: 'book-of-mormon',
      name: 'Book of Mormon',
      description: 'The 15 books of the Book of Mormon.',
      tradition: 'latter-day-saints',
      translations: ['bom'],
      chapterLabel: 'Chapter',
      verseLabel: 'verse',
      books: bom.map((b) => ({ slug: b.slug, name: b.name, lengths: lengthsOf(b.text) })),
    },
  ],
  translations: [
    ...BIBLE_TRANSLATIONS.map(({ source, ...x }) => ({ ...x, collection: 'bible', lang: 'en', dir: 'ltr' })),
    T('drc', 'catholic', 'DRA', 'Douay-Rheims (Challoner)', 1752, 'Public domain'),
    T('cpdv', 'catholic', 'CPDV', 'Catholic Public Domain Version', 2009, 'Public domain'),
    T('jps', 'tanakh', 'JPS', 'Jewish Publication Society Tanakh', 1917, 'Public domain'),
    T('pickthall', 'quran', 'Pickthall', 'The Meaning of the Glorious Koran (Pickthall)', 1930, 'Public domain in the US since 2026. Digital text via the Tanzil Project'),
    T('quran-ar', 'quran', 'Arabic', 'Arabic text (Tanzil Simple)', 2008, 'Quran text by the Tanzil Project (tanzil.net), used verbatim with credit', { lang: 'ar', dir: 'rtl' }),
    T('gita-arnold', 'gita', 'Arnold', 'The Song Celestial (Edwin Arnold)', 1885, 'Public domain (Project Gutenberg)'),
    T('dhammapada-muller', 'dhammapada', 'Müller', 'Dhammapada (F. Max Müller)', 1881, 'Public domain (Project Gutenberg)'),
    T('tao-legge', 'tao-te-ching', 'Legge', 'Tao Te Ching (James Legge)', 1891, 'Public domain (Project Gutenberg)'),
    T('analects-legge', 'analects', 'Legge', 'Confucian Analects (James Legge)', 1893, 'Public domain (Project Gutenberg)'),
    T('bom', 'book-of-mormon', 'BOM', 'The Book of Mormon', 1830, 'Public domain (Project Gutenberg)'),
  ],
}

// ---- feed and verse of the day for every collection except the Bible (build-data.mjs
// ranks the Bible's by cross-references). Passages that read well on their own, in a
// fixed shuffled order; every translation of a collection shares the same references.
let seed = 11
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
await mkdir(`${OUT}/votd`, { recursive: true })
for (const col of catalog.collections) {
  if (col.id === 'bible') continue
  const texts = {}
  for (const tid of col.translations) {
    texts[tid] = await Promise.all(col.books.map(async (b) => JSON.parse(await readFile(`${OUT}/${tid}/${b.slug}.json`, 'utf8'))))
  }
  const main = texts[col.translations[0]]
  const candidates = []
  main.forEach((chapters, bi) =>
    chapters.forEach((verses, ci) =>
      verses.forEach((v, vi) => {
        if (v.length >= 40 && v.length <= 360 && !v.startsWith('(')) candidates.push([bi, ci + 1, vi + 1])
      }),
    ),
  )
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const pool = candidates.slice(0, 1500)
  for (const tid of col.translations) {
    await writeFile(`${OUT}/${tid}/feed.json`, JSON.stringify(pool.map(([b, c, v]) => [b, c, v, texts[tid][b][c - 1][v - 1] || ''])))
  }
  const votd = pool.filter(([b, c, v]) => main[b][c - 1][v - 1].length <= 260).slice(0, 366)
  await writeFile(`${OUT}/votd/${col.id}.json`, JSON.stringify(votd))
}

await writeFile('lib/catalog.json', JSON.stringify(catalog))
console.log('verses per translation:', stats)
console.log('collections:', catalog.collections.map((c) => `${c.id} ${c.books.length} books ${c.books.reduce((n, b) => n + b.lengths.length, 0)} chapters`).join(' | '))
