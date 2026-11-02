# Freely Scripture

**Holy books, free for everyone. Free because the Word is free.** No ads, no account, no paywall.

Freely gives away everything that costs nothing to run, and only charges for something if
it costs money, at what it costs. See [COSTS.md](COSTS.md).

Live at https://freelybible.vercel.app (repo name kept from the first, Bible-only version).

## The library

All public domain or free to use with credit; every source is listed in the app's About page.

| Collection | Tradition | Translations |
| --- | --- | --- |
| Bible (66 books) | Christianity | Berean Standard Bible, KJV (Pure Cambridge, LORD restored), New Heart English Bible, ASV |
| Catholic Bible (73 books + Vulgate appendix) | Christianity | Douay-Rheims (Challoner), Catholic Public Domain Version |
| Tanakh | Judaism | Jewish Publication Society 1917 (this edition writes HaShem and G-d) |
| Quran | Islam | Pickthall 1930 (US public domain since 2026), with the Tanzil Arabic text alongside |
| Bhagavad Gita | Hinduism | Edwin Arnold, 1885 (verse; passages are his stanzas) |
| Dhammapada | Buddhism | F. Max Müller, 1881 (verse 127 is missing from the source and marked so) |
| Tao Te Ching | Taoism | James Legge, 1891 |
| Analects | Confucianism | James Legge |
| Book of Mormon | Latter-day Saints | 1830 text via Project Gutenberg |

## Features, all free

- **First open:** "What would you like to read?" Pick traditions, or see everything.
- **Reader:** tap a verse to save, note, study, copy or share; select any words to highlight
  just those. Five highlight colors, three themes, adjustable text size, poetry kept as verse,
  Arabic shown beside the Quran's English.
- **Share images:** verse cards (4:5, four styles, small Freely mark) drawn on the device.
- **Study:** Bible cross-references from OpenBible.info; compare translations side by side.
- **Feed:** a fresh random mix from your library every visit, a Shuffle button, and it skips
  verses you have already seen.
- **Search:** every verse of a collection, plus references: John 3:16, Quran 2:255,
  Dhammapada 183, Analects 2.4, Alma 32:21, Tobit 4.
- **Plans:** 33 plans, including the Bible in a year (canonical or historical order), topical
  7-day plans, the Quran in 30 days by juz', the Gita in 18 days and the Tao Te Ching in 81.
- **Get the app:** installs to the home screen and saves your library for offline use.
- **Private by design:** everything you save stays on your device; back up to a file.

## Stack

Next.js 16 static export, React 19, TypeScript, Tailwind CSS 4, Capacitor 8 for the iOS and
Android apps. No backend yet. Fonts (Literata, Inter, Amiri) ship from npm, so they work offline.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
npm test           # reference parser tests
```

## Data

The app reads JSON under `public/data/` and the catalog in `lib/catalog.json`, both committed.
To rebuild them from the sources:

```bash
node scripts/fetch-sources.mjs   # downloads into data-src/ (git-ignored)
npm run data                     # build-data.mjs (Bible) then build-texts.mjs (everything else)
```

`lib/catalog.json` is generated; never edit it by hand. The Bible, Quran and short texts get a
pre-rendered page per chapter (`/read/<collection>/<book>/<chapter>/`); the larger collections
open in the client reader (`/reader/?c=...`) to keep the site small.

## Ship it

**Website:** Vercel builds `out/`. Set `NEXT_PUBLIC_SITE_URL` (a Config variable, no trailing
slash) so the sitemap and share links use the real address.

**Phone apps** (needs Android Studio or Xcode, or a CI build):

```bash
npx cap add android
npx cap add ios
npm run cap:sync
```

App ID `app.freelyscripture`. "Freely" alone is also a UK TV service (BBC, ITV, Channel 4,
Channel 5), so keep "Scripture" in the store name.

## Next

- Optional accounts (email + password, display name) with note sync: needs a Supabase project.
- AI study buddy at $4.99/month with a fair-use cap: needs accounts, an AI key and Stripe.
- Not decided: domain, owner (Gilgamesh Enterprise LLC or a nonprofit), code license.
