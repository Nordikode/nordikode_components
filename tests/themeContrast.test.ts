import { describe, expect, it } from 'vitest'

import { backofficeTheme } from '../src/tokens/products/backoffice'
import { timeTheme } from '../src/tokens/products/time'
import type { NkProductTheme, NkScheme } from '../src/tokens/types'

// Fargeparene i Time og backoffice skal holde WCAG 2.1 AA for tekst (4,5:1) i
// lys og mørk modus. Statusfargene brukes både som tekst og som fyll med
// etikett, og de målte under kravet til SIGN-1158 og SIGN-1198. Testen regner
// kontrasten fra token-verdiene, så en ny verdi som ikke holder stopper i CI
// i stedet for å bli funnet i en gjennomgang.

const AA_TEXT = 4.5

type Rgb = [number, number, number]

function rgb(hex: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new Error(`Ikke en sekssifret hex-farge: ${hex}`)
  const value = match[1]
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16)) as Rgb
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

/** Vuetifys tonal-variant: fargen på 12 % over flaten den står på. */
function tonal(color: string, surface: string): string {
  const [from, to] = [rgb(surface), rgb(color)]
  const mixed = from.map((channel, index) => Math.round(channel + (to[index] - channel) * 0.12))
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

type Pair = { name: string; foreground: string; background: string }

/** Par som gjelder i begge moduser. */
function sharedPairs(scheme: NkScheme): Pair[] {
  return [
    // Etikett på fylt farge (knapper, varsler, fylte chips).
    { name: 'onPrimary på primary', foreground: scheme.onPrimary, background: scheme.primary },
    { name: 'onInfo på info', foreground: scheme.onInfo, background: scheme.info },
    { name: 'onSuccess på success', foreground: scheme.onSuccess, background: scheme.success },
    { name: 'onWarning på warning', foreground: scheme.onWarning, background: scheme.warning },
    { name: 'onError på error', foreground: scheme.onError, background: scheme.error },
    { name: 'onAttention på attention', foreground: scheme.onAttention, background: scheme.attention },
    // Statusfargen som tekst på side og kort (feiltekst, beløp, ikoner med tekst).
    { name: 'success på surface', foreground: scheme.success, background: scheme.surface },
    { name: 'success på page', foreground: scheme.success, background: scheme.page },
    { name: 'warning på surface', foreground: scheme.warning, background: scheme.surface },
    { name: 'warning på page', foreground: scheme.warning, background: scheme.page },
    { name: 'error på surface', foreground: scheme.error, background: scheme.surface },
    { name: 'error på page', foreground: scheme.error, background: scheme.page },
    // Tekst på myke flater (NkStatusChip og tonal-chips via productCss()).
    { name: 'onPrimarySoft på primarySoft', foreground: scheme.onPrimarySoft, background: scheme.primarySoft },
    { name: 'onInfoSoft på infoSoft', foreground: scheme.onInfoSoft, background: scheme.infoSoft },
    { name: 'onAiSoft på aiSoft', foreground: scheme.onAiSoft, background: scheme.aiSoft },
    { name: 'onSuccessSoft på successSoft', foreground: scheme.onSuccessSoft, background: scheme.successSoft },
    { name: 'onInflightSoft på inflightSoft', foreground: scheme.onInflightSoft, background: scheme.inflightSoft },
    { name: 'onMutedSoft på mutedSoft', foreground: scheme.onMutedSoft, background: scheme.mutedSoft },
    { name: 'onWarningSoft på warningSoft', foreground: scheme.onWarningSoft, background: scheme.warningSoft },
    { name: 'onErrorSoft på errorSoft', foreground: scheme.onErrorSoft, background: scheme.errorSoft },
    // Nøytralt merke (NkStatusChip tone="neutral") og sekundærtekst.
    { name: 'textSecondary på surfaceSoft', foreground: scheme.textSecondary, background: scheme.surfaceSoft },
    { name: 'textSecondary på page', foreground: scheme.textSecondary, background: scheme.page },
    { name: 'textSecondary på surface', foreground: scheme.textSecondary, background: scheme.surface },
  ]
}

/** Time bruker `secondary` som tonal-chip på kort («Til godkjenning»). */
function timePairs(scheme: NkScheme): Pair[] {
  return [
    {
      name: 'secondary som tonal-chip på surface',
      foreground: scheme.secondary,
      background: tonal(scheme.secondary, scheme.surface),
    },
    { name: 'onSecondary på secondary', foreground: scheme.onSecondary, background: scheme.secondary },
  ]
}

const themes: Array<{ theme: NkProductTheme; extra: (scheme: NkScheme) => Pair[] }> = [
  { theme: timeTheme, extra: timePairs },
  { theme: backofficeTheme, extra: () => [] },
]

describe('kontrast i Time og backoffice (WCAG AA, 4,5:1)', () => {
  it('regner kontrast etter WCAG 2.1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
    expect(tonal('#c98f57', '#ffffff')).toBe('#f9f2eb')
  })

  for (const { theme, extra } of themes) {
    for (const mode of ['light', 'dark'] as const) {
      const scheme = theme[mode]

      for (const pair of [...sharedPairs(scheme), ...extra(scheme)]) {
        it(`${theme.product}, ${mode}: ${pair.name}`, () => {
          const measured = contrast(pair.foreground, pair.background)

          expect(
            measured,
            `${pair.foreground} på ${pair.background} måler ${measured.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_TEXT)
        })
      }
    }
  }
})
