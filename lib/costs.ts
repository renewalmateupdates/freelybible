// The motto, applied: everything that costs nothing to run is free, and anything that
// costs money is priced at what it costs. Shown on /about/#costs. Detail in COSTS.md.

export const FREE_FEATURES = [
  'Nine holy books: the Bible (four translations), the Catholic Bible, the Tanakh, the Quran in Arabic and English, the Bhagavad Gita, the Dhammapada, the Tao Te Ching, the Analects and the Book of Mormon, readable offline',
  'Search every verse, or jump to any reference',
  'Verse of the day and the verse feed',
  'Highlights (whole verses or just the words you pick), notes and saved verses',
  'Verse images to share on Instagram, TikTok, X and anywhere else',
  'Installing it on your phone like an app',
  'More than 30 reading plans with progress tracking',
  'Cross-references and side-by-side translation comparison',
  'Backing up your notes to a file',
]

export type CostItem = {
  name: string
  whyItCosts: string
  price: string
  status: 'live' | 'planned' | 'not built'
}

export const COST_ITEMS: CostItem[] = [
  {
    name: 'Keeping the app in the app stores',
    whyItCosts: 'Apple charges $99 a year and Google charges $25 once to list an app.',
    price: 'Free to you. Paid by the founder for now.',
    status: 'live',
  },
  {
    name: 'Website hosting',
    whyItCosts: 'The website is plain files, which free hosting plans serve at no cost.',
    price: 'Free',
    status: 'live',
  },
  {
    name: 'Optional accounts that sync your notes across devices',
    whyItCosts: 'Needs a server to hold your notes. Free server plans cover tens of thousands of readers.',
    price: 'Free while it fits a free server plan. If it outgrows that, the cost is shared at cost, about $1 a year.',
    status: 'planned',
  },
  {
    name: 'Audio Bible',
    whyItCosts: 'Audio files need storage and streaming. Public domain recordings exist, and some hosts charge nothing for streaming.',
    price: 'Free, as long as the recordings are public domain.',
    status: 'not built',
  },
  {
    name: 'AI study buddy',
    whyItCosts: 'Every question asked of an AI model is billed by the AI company, roughly a tenth of a cent each.',
    price: 'An optional pack priced at what the questions cost, plus the app store fee. Nothing more.',
    status: 'not built',
  },
  {
    name: 'NIV, ESV, NLT and other modern translations',
    whyItCosts: 'Publishers own them and set the terms. Some allow free online use in non-commercial apps.',
    price: 'Free wherever the publisher allows it. Otherwise only the publisher’s fee, passed through.',
    status: 'not built',
  },
]
