import type { NkTemplatePlaceholder } from './types/NkTemplatePlaceholder'

/**
 * Malteksten som brukeren redigerer i NkTemplateField (SIGN-1465), som
 * biter: vanlig tekst og plassholdere. Lagringsformatet er uendret — en
 * plassholder er `{key}` i teksten, og bare nøklene feltet kjenner blir
 * brikker. En ukjent `{…}` er tekst.
 */
export type NkTemplateSegment = { kind: 'text'; text: string } | { kind: 'placeholder'; key: string }

const TOKEN = /\{([A-Za-z0-9_]+)\}/g

/** Nøklene som står som `{key}` i en malt tekst, i rekkefølge og uten duplikater. */
export const templatePlaceholderKeys = (text: string | null | undefined): string[] => {
  const keys: string[] = []

  for (const match of (text ?? '').matchAll(TOKEN)) {
    if (!keys.includes(match[1])) {
      keys.push(match[1])
    }
  }

  return keys
}

/** Deler teksten i tekst og plassholdere; bare `knownKeys` blir plassholdere. */
export const parseTemplate = (text: string, knownKeys: readonly string[]): NkTemplateSegment[] => {
  const segments: NkTemplateSegment[] = []
  let last = 0

  for (const match of text.matchAll(TOKEN)) {
    if (!knownKeys.includes(match[1])) {
      continue
    }

    const index = match.index ?? 0

    if (index > last) {
      segments.push({ kind: 'text', text: text.slice(last, index) })
    }

    segments.push({ kind: 'placeholder', key: match[1] })
    last = index + match[0].length
  }

  if (last < text.length) {
    segments.push({ kind: 'text', text: text.slice(last) })
  }

  return segments
}

/** Lagringsformatet for en plassholder. */
export const templateToken = (key: string): string => `{${key}}`

/**
 * De obligatoriske plassholderne (`missingMessage` satt) som mangler i
 * teksten. Et tomt felt betyr «bruk standardteksten» og mangler ingenting.
 */
export const missingTemplatePlaceholders = (
  text: string | null | undefined,
  placeholders: readonly NkTemplatePlaceholder[],
): NkTemplatePlaceholder[] => {
  const value = text ?? ''

  if (value.trim() === '') {
    return []
  }

  return placeholders.filter(
    (placeholder) => placeholder.missingMessage !== undefined && !value.includes(templateToken(placeholder.key)),
  )
}
