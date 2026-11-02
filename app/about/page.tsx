import type { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { COST_ITEMS, FREE_FEATURES } from '@/lib/costs'
import { COLLECTIONS, TRANSLATIONS } from '@/lib/library'
import { PageTitle } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Why Freely is free',
  description:
    'Freely Scripture is free because the Word is free. No ads, no account, no paywall. Here is exactly what costs money and how it is priced.',
}

const STATUS_LABEL = { live: 'In the app', planned: 'Planned', 'not built': 'Not built yet' } as const

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle eyebrow="About" title="Free because the Word is free">
        Freely gives away everything that costs nothing to run, and only charges for something if it costs money, at
        what it costs. No ads. No account. No selling your data.
      </PageTitle>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Free, for good</h2>
        <p className="mt-2 text-ink-2">These run on your own phone, so they cost nothing no matter how many people use them.</p>
        <ul className="mt-4 space-y-2">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="costs" className="mt-12 scroll-mt-20">
        <h2 className="font-serif text-xl font-semibold">What costs money, and how it is priced</h2>
        <p className="mt-2 text-ink-2">If something has a real cost, here it is, in the open.</p>
        <ul className="mt-4 space-y-3">
          {COST_ITEMS.map((c) => (
            <li key={c.name} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{c.name}</h3>
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-3">{STATUS_LABEL[c.status]}</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">{c.whyItCosts}</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Price: </span>
                {c.price}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-semibold">Your privacy</h2>
        <p className="mt-2 text-ink-2">
          There is no account and no ads. Your highlights, notes and plans are stored on your device and never leave it
          unless you export a backup yourself. We count anonymous page visits with Vercel Web Analytics, which uses no
          cookies and collects no personal data, so we know which pages people use.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-semibold">Credits</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-2">
          {TRANSLATIONS.map((t) => (
            <li key={t.id}>
              <span className="font-semibold text-ink">{t.name}</span> ({COLLECTIONS.find((c) => c.id === t.collection)?.name}, {t.year}): {t.license}.
            </li>
          ))}
          <li>
            Quran Arabic text and the digital Pickthall text from the{' '}
            <a className="text-accent underline" href="https://tanzil.net" target="_blank" rel="noreferrer">
              Tanzil Project (tanzil.net)
            </a>
            , via the{' '}
            <a className="text-accent underline" href="https://github.com/fawazahmed0/quran-api" target="_blank" rel="noreferrer">
              quran-api
            </a>{' '}
            collection. The Arabic is shown exactly as published.
          </li>
          <li>
            Bhagavad Gita, Dhammapada, Tao Te Ching, Analects and Book of Mormon texts from{' '}
            <a className="text-accent underline" href="https://www.gutenberg.org" target="_blank" rel="noreferrer">
              Project Gutenberg
            </a>
            . In the Dhammapada, verse 127 is missing from that edition and is marked as missing.
          </li>
          <li>
            Cross-references from{' '}
            <a className="text-accent underline" href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noreferrer">
              OpenBible.info
            </a>
            , licensed CC BY.
          </li>
          <li>
            Bible, Tanakh and Catholic Bible text files from the{' '}
            <a className="text-accent underline" href="https://github.com/scrollmapper/bible_databases" target="_blank" rel="noreferrer">
              scrollmapper Bible databases
            </a>
            .
          </li>
          <li>
            In the KJV, the capitalized divine name (LORD) was restored using the markup of the CrossWire Bible Society KJV
            module.
          </li>
          <li>Literata, Inter and Amiri typefaces, SIL Open Font License. Icons by Lucide, ISC License.</li>
        </ul>
      </section>

      <p className="mt-12 text-center text-sm text-ink-3">
        <Link href="/" className="text-accent underline">Back to Freely</Link>
      </p>
    </div>
  )
}
