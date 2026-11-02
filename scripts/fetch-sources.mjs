// Downloads the public-domain source texts and the openbible.info cross-references
// into data-src/ (git-ignored). Run once, then `npm run data`.
import { mkdir, writeFile } from 'node:fs/promises'

const BASE = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master'
const FILES = {
  'BSB.json': `${BASE}/formats/json/BSB.json`, // Berean Standard Bible, CC0 / public domain
  'KJVPCE.json': `${BASE}/formats/json/KJVPCE.json`, // KJV Pure Cambridge Edition, public domain
  'ASV.json': `${BASE}/formats/json/ASV.json`, // American Standard Version 1901, public domain
  'NHEB.json': `${BASE}/formats/json/NHEB.json`, // New Heart English Bible, public domain
  // CrossWire KJV markup, used only to find which "Lord"s are the divine name (printed LORD).
  'KJV-osis.json': `${BASE}/sources/en/KJV/KJV-osis.json`,
  'cross_references.txt': `${BASE}/sources/extras/cross_references.txt`, // openbible.info, CC-BY
}

await mkdir('data-src', { recursive: true })
for (const [name, url] of Object.entries(FILES)) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  await writeFile(`data-src/${name}`, Buffer.from(await res.arrayBuffer()))
  console.log('saved', name)
}
