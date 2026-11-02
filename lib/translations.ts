import { TRANSLATIONS as RAW } from './translations.mjs'

export type Translation = { id: string; short: string; name: string; year: number; license: string }

export const TRANSLATIONS: Translation[] = RAW.map(({ id, short, name, year, license }) => ({
  id,
  short,
  name,
  year,
  license,
}))

export const DEFAULT_TRANSLATION = 'bsb'

export function translationById(id: string): Translation {
  return TRANSLATIONS.find((t) => t.id === id) ?? TRANSLATIONS[0]
}
