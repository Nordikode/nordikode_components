/**
 * Fargene i en plantegning (SIGN-1980). En gulv- eller veggfarge er DATA
 * personen har valgt, lagret som `#rrggbb` — ikke en del av appens tema.
 * Paletten under er de ferdige tonene redigeringen tilbyr; ved siden av den
 * kan personen velge en hvilken som helst farge, eller ingen (da tegnes
 * planen i temaets egne toner).
 *
 * Tonene er valgt for å ligne det som faktisk ligger på gulv og vegger:
 * hvitt og gråtoner, tre i tre toner, og noen dempede farger. Navnet på hver
 * tone står i pakkas språkfiler (`texts/editor/<språk>.json`, `tones.<key>`).
 */
export interface FloorPlanTone {
  /** Stabil nøkkel for navnet i språkfilene. */
  key: string
  /** Fargen slik den lagres: `#rrggbb` med små bokstaver. */
  hex: string
}

export const FLOOR_PLAN_TONES: readonly FloorPlanTone[] = [
  { key: 'white', hex: '#f4f1ea' },
  { key: 'eggshell', hex: '#e7dfcf' },
  { key: 'lightGrey', hex: '#d3d4d1' },
  { key: 'grey', hex: '#a3a6a4' },
  { key: 'charcoal', hex: '#4a4f54' },
  { key: 'sand', hex: '#cdbfa3' },
  { key: 'lightOak', hex: '#d8b98a' },
  { key: 'oak', hex: '#b98b56' },
  { key: 'walnut', hex: '#7a5234' },
  { key: 'sage', hex: '#a9b8a0' },
  { key: 'dustyBlue', hex: '#9fb1c1' },
  { key: 'terracotta', hex: '#c08a6e' },
]

/** Tonen en lagret farge er, når den er en av de ferdige. */
export const toneOf = (color: string | null | undefined): FloorPlanTone | null =>
  FLOOR_PLAN_TONES.find((tone) => tone.hex === (color ?? '').toLowerCase()) ?? null

/** Blekket som står oppå en lys farge, og det som står oppå en mørk. */
export const INK_ON_LIGHT = 'rgb(13 28 38)'
export const INK_ON_DARK = 'rgb(255 255 255)'

/** Fargens lyshet slik øyet ser den (WCAG relativ luminans), 0–1. Null for noe som ikke er `#rrggbb`. */
export const relativeLuminance = (color: string | null | undefined): number | null => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color ?? '')

  if (match === null) {
    return null
  }

  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * Blekket som leses best oppå en farge personen har valgt: mørkt på lyse
 * farger, hvitt på mørke — det av de to som gir størst kontrast. Null for
 * «ingen farge»: da gjelder temaets eget blekk.
 */
export const readableInk = (color: string | null | undefined): string | null => {
  const luminance = relativeLuminance(color)

  if (luminance === null) {
    return null
  }

  // Kontrasten mot hvitt er (1,05) / (L + 0,05), mot det mørke blekket (L + 0,05) / (0,0106 + 0,05).
  return 1.05 / (luminance + 0.05) > (luminance + 0.05) / 0.0606 ? INK_ON_DARK : INK_ON_LIGHT
}
