import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseReference as p } from '../lib/reference.mjs'

const cases = [
  ['John 3:16', { book: 42, chapter: 3, verse: 16 }],
  ['jn 3 16', { book: 42, chapter: 3, verse: 16 }],
  ['john3:16', { book: 42, chapter: 3, verse: 16 }],
  ['1 cor 13', { book: 45, chapter: 13 }],
  ['1co 13:4-7', { book: 45, chapter: 13, verse: 4, endVerse: 7 }],
  ['ps 23', { book: 18, chapter: 23 }],
  ['Psalm 119:105', { book: 18, chapter: 119, verse: 105 }],
  ['Song of Solomon 2:4', { book: 21, chapter: 2, verse: 4 }],
  ['song of songs 1', { book: 21, chapter: 1 }],
  ['1st john 4', { book: 61, chapter: 4 }],
  ['I John 4:8', { book: 61, chapter: 4, verse: 8 }],
  ['Jude 5', { book: 64, chapter: 1, verse: 5 }],
  ['Philemon', { book: 56, chapter: 1 }],
  ['rev 21:4', { book: 65, chapter: 21, verse: 4 }],
  ['Genesis', { book: 0, chapter: 1 }],
  ['Romans 8:28–39', { book: 44, chapter: 8, verse: 28, endVerse: 39 }],
]
for (const [input, expected] of cases) {
  test(input, () => assert.deepEqual(p(input), expected))
}
test('rejects non-references', () => {
  assert.equal(p('love one another'), null)
  assert.equal(p('John 99'), null)
  assert.equal(p(''), null)
  assert.equal(p('hello'), null)
})
