# What Freely costs to run, and how anything paid would be priced

Freely's rule: **give away everything that costs nothing to run, and charge only for what
costs money, at what it costs.** This file is the working math behind that rule. The
short public version lives in `lib/costs.ts` and shows on `/about/#costs`; keep the two
in step.

Estimates are marked **(verify)**. Check the vendor's current price page before charging
anyone, and put the source and date next to the number when you do.

## Free forever (runs on the reader's phone, so it costs the same for 10 or 10 million readers)

- Four public-domain translations (BSB, KJV, NHEB, ASV), bundled and offline
- Search, verse of the day, verse feed
- Highlights, notes, saved verses, reading plans
- Cross-references and side-by-side translation comparison
- Backup and restore to a file

## Fixed costs today

| Item | Cost | Notes |
| --- | --- | --- |
| Apple Developer Program | $99 / year | Needed for the App Store. |
| Google Play developer account | $25 once | Needed for Google Play. |
| Website hosting | $0 | The site is static files (about 105 MB, roughly 6,500 files). Cloudflare Pages' free plan has no bandwidth charge and allows 20,000 files per deploy (verify). Vercel's free Hobby plan is for non-commercial use (verify). |
| Domain | about $10–20 / year (verify) | For a .com or .app name. |

**First-year total: about $135–145.** Nothing else is needed to launch.

## Things that would cost money, and the proposed price

### Sync notes across devices (not built)
- **What it needs:** a database for each reader's notes. A heavy user's notes are tens of kilobytes.
- **Cost:** Supabase's free plan covers 50,000 monthly active users and 500 MB of data; Pro is $25/month (verify).
- **Price:** free while it fits the free plan. If it ever outgrows it, split the server bill across the people who sync, about $1 a year each, and say so in the app.
- **Free alternative already shipped:** Settings > Back up your notes (download a file, restore it on the new phone).

### Audio Bible (not built)
- **What it needs:** recordings plus storage and streaming. A full Bible at 64 kbps mono is about 2 GB.
- **Cost:** Cloudflare R2 gives 10 GB of storage free and charges nothing for downloads (egress) (verify). Public domain recordings exist for the KJV, for example LibriVox volunteers (verify each recording's license).
- **Price:** free, as long as the recordings are public domain and storage stays in the free plan. Professional narrations are licensed and would need their own price.

### AI study help, "ask about this passage" (not built)
- **What it needs:** a call to an AI model for every question.
- **Cost per question (verify):** tokens in × input price + tokens out × output price. A question with a passage attached is roughly 1,500 tokens in and 400 out. On a small, fast model that is around a tenth of a cent.
- **Price:** an optional pack, priced at cost plus the app store's cut and rounded up to the nearest price the store allows. For example: if a question costs $0.001, then 300 questions cost $0.30. After Apple's 15% (Small Business Program) and rounding, that is **$0.99 for 300 questions**. Recheck whenever the AI provider changes its prices.
- **Guardrails:** a hard daily cap per device, so a bug or an abuser cannot run up a bill.

### Modern copyrighted translations: NIV, ESV, NLT, CSB, NKJV, NASB (not built)
- **Owners:** Biblica (NIV, licensed through HarperCollins), Crossway (ESV), Tyndale (NLT), Lifeway (CSB), HarperCollins (NKJV), Lockman Foundation (NASB).
- **Cost:** set by each publisher. Crossway offers a free ESV API for non-commercial apps, and the American Bible Society's API.Bible offers many translations free for non-commercial use, usually online only and with limits (verify each license, and check whether taking donations affects "non-commercial").
- **Price:** free wherever the publisher allows it. Otherwise the publisher's fee for that one translation, passed through, with nothing added.

## Store rules to remember (verify before shipping)

- **In-app purchases:** Apple and Google take 15% from small developers. Any paid pack must include that in its price.
- **Donations:** on iOS, tips and donations to a developer generally have to go through in-app purchase. Approved nonprofits can link out to an external donation page instead (App Store Review Guidelines 3.1.1 and 3.2.1(vi)).
- **Money and ownership** are not decided yet: who owns the app (Gilgamesh Enterprise LLC or a nonprofit) and whether to take donations at all.
