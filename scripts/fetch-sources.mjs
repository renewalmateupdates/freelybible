// Downloads the public-domain source texts and the openbible.info cross-references
// into data-src/ (git-ignored). Run once, then `npm run data`.
import { mkdir, writeFile } from 'node:fs/promises'

const BASE = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master'
const QURAN = 'https://raw.githubusercontent.com/fawazahmed0/quran-api/1'
const GUT = 'https://raw.githubusercontent.com/GITenberg'
const FILES = {
  'BSB.json': `${BASE}/formats/json/BSB.json`, // Berean Standard Bible, CC0 / public domain
  'KJVPCE.json': `${BASE}/formats/json/KJVPCE.json`, // KJV Pure Cambridge Edition, public domain
  'ASV.json': `${BASE}/formats/json/ASV.json`, // American Standard Version 1901, public domain
  'NHEB.json': `${BASE}/formats/json/NHEB.json`, // New Heart English Bible, public domain
  // CrossWire KJV markup, used only to find which "Lord"s are the divine name (printed LORD).
  'KJV-osis.json': `${BASE}/sources/en/KJV/KJV-osis.json`,
  'JPS.json': `${BASE}/formats/json/JPS.json`, // Jewish Publication Society Tanakh (1917), public domain
  'DRC.json': `${BASE}/formats/json/DRC.json`, // Douay-Rheims, Challoner revision, public domain
  'CPDV.json': `${BASE}/formats/json/CPDV.json`, // Catholic Public Domain Version
  // Quran: Arabic text from the Tanzil Project (verbatim, credited with a link) and
  // Pickthall's 1930 English translation (US public domain since January 1, 2026).
  'quran-ara-quransimple.json': `${QURAN}/editions/ara-quransimple.json`,
  'quran-eng-mohammedmarmadu.json': `${QURAN}/editions/eng-mohammedmarmadu.json`,
  'quran-info.json': `${QURAN}/info.json`,
  // Project Gutenberg texts (public domain), via the GITenberg mirrors.
  'gita-arnold.txt': `${GUT}/The-Song-Celestial--Or-Bhagavad-G-t---from-the-Mah-bh-rata---13-Being-a-discourse-between-Arju__2388/master/2388.txt`,
  'dhammapada-muller.txt': `${GUT}/Dhammapada-a-Collection-of-Verses--Being-One-of-the-Canonical-Books-of-the-Buddhists_2017/master/2017.txt`,
  'tao-legge.txt': `${GUT}/The-Tao-Teh-King-or-the-Tao-and-its-Characteristics_216/master/216.txt`,
  'analects-legge.txt': `${GUT}/The-Analects-of-Confucius-from-the-Chinese-Classics_3330/master/3330.txt`,
  'book-of-mormon.txt': `${GUT}/The-Book-of-Mormon--13-An-Account-Written-by-the-Hand-of-Mormon-Upon-Plates-Taken-from-the-Plate__17/master/17.txt`,
  'cross_references.txt': `${BASE}/sources/extras/cross_references.txt`, // openbible.info, CC-BY
}

await mkdir('data-src', { recursive: true })
for (const [name, url] of Object.entries(FILES)) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // Gutenberg files use Windows line endings; normalize so the parsers see plain \n.
  await writeFile(`data-src/${name}`, name.endsWith('.txt') ? buf.toString('utf8').replace(/\r/g, '') : buf)
  console.log('saved', name)
}
