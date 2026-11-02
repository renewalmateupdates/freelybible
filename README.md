# Freely Bible

**The free Bible app. Free because the Word is free.** No ads, no account, no paywall.

Freely gives away everything that costs nothing to run, and only charges for something if
it costs money, at what it costs. See [COSTS.md](COSTS.md).

## What's in it

- **Four public-domain translations:** Berean Standard Bible (default), King James Version
  (Pure Cambridge Edition, with LORD restored), New Heart English Bible, American Standard
  Version. All bundled and readable offline.
- **Reader:** every chapter is a real, pre-rendered web page. Tap verses to highlight in
  five colors, write a note, save, copy or share. Two layouts, three themes (light, sepia,
  dark), adjustable text size.
- **Study tools, no AI needed:** about 340,000 crowd-ranked cross-references from
  OpenBible.info (top 12 per verse), plus any verse compared across all four translations.
- **Verse feed:** swipe through the 2,000 most cross-referenced verses, in a different
  order for each reader, picking up where you left off. Double-tap to save.
- **Search:** every verse, word-prefix matching, "exact phrases", filters (Old Testament,
  New Testament, Gospels), and reference jumps ("jn 3 16", "1 cor 13", "Psalm 119:105").
- **Reading plans:** the Bible in a year, the New Testament in 90 days, the Gospels in 30
  days, Psalms in 30 days and Proverbs in 31 days, balanced by verse count.
- **Verse of the day**, the same for everyone on a given date.
- **Private by design:** everything a reader saves stays on their device. Backup and
  restore to a file from Settings.

## Stack

Next.js 16 static export, React 19, TypeScript, Tailwind CSS 4, Capacitor 8 for the iOS
and Android apps. No backend. Fonts (Literata, Inter) ship from npm, so they work offline.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
npm test           # reference parser tests
```

## Bible data

The app reads compact JSON under `public/data/`, which is committed. To rebuild it from
the sources:

```bash
node scripts/fetch-sources.mjs   # downloads into data-src/ (git-ignored)
npm run data                     # writes public/data/ and lib/chapter-lengths.json
```

Sources: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
for the texts, [OpenBible.info](https://www.openbible.info/labs/cross-references/) for
cross-references (CC BY, credited in the app). The KJV source lost the capitals of the
divine name, so `build-data.mjs` restores LORD and GOD from the CrossWire KJV markup
(6,864 restored; 19 verses where the two sources disagree still read "Lord").

## Ship it

**Website:** deploy `out/` to any static host (Cloudflare Pages or Vercel). Set
`NEXT_PUBLIC_SITE_URL` to the real domain, with no trailing slash, so the sitemap and share
links use it.

**Phone apps** (needs Android Studio or Xcode on a computer, or a CI build):

```bash
npx cap add android
npx cap add ios
npm run cap:sync   # build + copy out/ into the native projects
```

App ID `app.freelybible`, display name "Freely Bible". "Freely" alone is also the name of
a UK TV service run by the BBC, ITV, Channel 4 and Channel 5, so keep "Bible" in the store
name.

## Not decided yet

- Domain name
- Who owns it (Gilgamesh Enterprise LLC or a nonprofit), and whether to take donations
- A license for the code
