import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseReference as p } from '../lib/reference.mjs'

const cases = [
  ['John 3:16', { c: 'bible', book: 42, chapter: 3, verse: 16 }],
  ['jn 3 16', { c: 'bible', book: 42, chapter: 3, verse: 16 }],
  ['john3:16', { c: 'bible', book: 42, chapter: 3, verse: 16 }],
  ['1 cor 13', { c: 'bible', book: 45, chapter: 13 }],
  ['1co 13:4-7', { c: 'bible', book: 45, chapter: 13, verse: 4, endVerse: 7 }],
  ['ps 23', { c: 'bible', book: 18, chapter: 23 }],
  ['Psalm 119:105', { c: 'bible', book: 18, chapter: 119, verse: 105 }],
  ['Song of Solomon 2:4', { c: 'bible', book: 21, chapter: 2, verse: 4 }],
  ['1st john 4', { c: 'bible', book: 61, chapter: 4 }],
  ['I John 4:8', { c: 'bible', book: 61, chapter: 4, verse: 8 }],
  ['Jude 5', { c: 'bible', book: 64, chapter: 1, verse: 5 }],
  ['Philemon', { c: 'bible', book: 56, chapter: 1 }],
  ['rev 21:4', { c: 'bible', book: 65, chapter: 21, verse: 4 }],
  ['Romans 8:28–39', { c: 'bible', book: 44, chapter: 8, verse: 28, endVerse: 39 }],
  ['Quran 2:255', { c: 'quran', book: 0, chapter: 2, verse: 255 }],
  ['surah 36', { c: 'quran', book: 0, chapter: 36 }],
  ['koran 1:1-7', { c: 'quran', book: 0, chapter: 1, verse: 1, endVerse: 7 }],
  ['Gita 2', { c: 'gita', book: 0, chapter: 2 }],
  ['Bhagavad Gita 18:3', { c: 'gita', book: 0, chapter: 18, verse: 3 }],
  ['Dhammapada 1', { c: 'dhammapada', book: 0, chapter: 1, verse: 1 }],
  ['dhp 183', { c: 'dhammapada', book: 0, chapter: 14, verse: 5 }],
  ['Tao Te Ching 1', { c: 'tao-te-ching', book: 0, chapter: 1 }],
  ['tao 81', { c: 'tao-te-ching', book: 0, chapter: 81 }],
  ['Analects 2.4', { c: 'analects', book: 1, chapter: 4 }],
  ['analects 1.1.1', { c: 'analects', book: 0, chapter: 1, verse: 1 }],
  ['Alma 32:21', { c: 'book-of-mormon', book: 8, chapter: 32, verse: 21 }],
  ['1 Nephi 3:7', { c: 'book-of-mormon', book: 0, chapter: 3, verse: 7 }],
  ['Moroni 10:4', { c: 'book-of-mormon', book: 14, chapter: 10, verse: 4 }],
  ['Tobit 4', { c: 'catholic', book: 16, chapter: 4 }],
  ['Sirach 1:1', { c: 'catholic', book: 25, chapter: 1, verse: 1 }],
  ['2 Maccabees 7', { c: 'catholic', book: 45, chapter: 7 }],
]
for (const [input, expected] of cases) {
  test(input, () => assert.deepEqual(p(input), expected))
}

test('prefers the reader’s collections for shared book names', () => {
  assert.deepEqual(p('Genesis 1:1', ['tanakh']), { c: 'tanakh', book: 0, chapter: 1, verse: 1 })
  assert.deepEqual(p('Genesis 1:1', ['catholic']), { c: 'catholic', book: 0, chapter: 1, verse: 1 })
  assert.deepEqual(p('Genesis 1:1'), { c: 'bible', book: 0, chapter: 1, verse: 1 })
})

test('rejects non-references', () => {
  assert.equal(p('love one another'), null)
  assert.equal(p('John 99'), null)
  assert.equal(p('Quran 115'), null)
  assert.equal(p('John 3:99'), null)
  assert.equal(p(''), null)
  assert.equal(p('hello'), null)
})
