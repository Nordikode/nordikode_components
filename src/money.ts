/**
 * Delt beløps- og valutaformatering for alle Nordikode-flater (SIGN-499).
 *
 * Reglene (jf. skillen `internasjonalisering`, regel 5 og 7):
 * - Valutaen er alltid data — tenantens valuta (core `activeTenant.currency`)
 *   eller dokumentets (tilbud, faktura, marked). Aldri en konstant, aldri
 *   `'NOK'`/`kr` som fallback. Mangler valutaen vises et rent tall.
 * - Formateringen følger brukerens UI-locale som full BCP-47-tag
 *   (`no → nb-NO`); symbolposisjon, skilletegn og desimaler er Intl sine.
 *   Norsk UI: «100 000,00 kr», engelsk UI: «NOK 100,000.00», svensk tenant
 *   i svensk UI: «100 000,00 kr» (SEK). Ingen egne symboler eller suffikser.
 * - Standard er valutaens egne desimaler (to for NOK/SEK/EUR). Flater som
 *   bevisst viser hele beløp (kundedokument, dashboards) sier det eksplisitt
 *   med `maximumFractionDigits: 0` — de finner aldri på et eget format.
 *
 * Helperen er ren TypeScript og eksporteres fra både hovedinngangen og
 * `@nordikode/components/web`, slik at Vuetify-frie flater (nettsiden,
 * company-appen) bruker nøyaktig samme implementasjon som produktappene.
 */

const BCP47: Record<string, string> = {
  en: 'en-GB',
  no: 'nb-NO',
  nb: 'nb-NO',
  nn: 'nn-NO',
  sv: 'sv-SE',
  fr: 'fr-FR',
  pl: 'pl-PL',
}

/**
 * Full BCP-47-tag for Intl. En bar språkkode gir feil regionale
 * konvensjoner (`en` → amerikansk, `no` er ikke et ICU-språk alle steder), så
 * all Intl-formatering skal gå gjennom denne. Tagger som allerede har region
 * (`sv-SE`, `fr-CA`) passerer uendret; tom/ukjent locale gir `en-GB` — aldri
 * norsk (regel 2).
 */
export const toBcp47 = (locale: string | null | undefined): string => {
  const trimmed = (locale ?? '').trim()

  if (trimmed === '') {
    return BCP47.en
  }

  return BCP47[trimmed.toLowerCase()] ?? trimmed
}

export interface FormatMoneyOptions {
  /**
   * Maks antall desimaler. Standard er valutaens egne (to for NOK/EUR/SEK).
   * `0` gir hele beløp («5 400 kr»); settes bare maks, vises desimaler kun
   * når beløpet faktisk har dem.
   */
  maximumFractionDigits?: number
  /** Minste antall desimaler. Standard: valutaens egne, eller `0` når `maximumFractionDigits` er satt. */
  minimumFractionDigits?: number
  /** Kompakt notasjon for nøkkeltall («1,2 mill. kr», «NOK 1.2m»). */
  compact?: boolean
  /** Hvordan valutaen vises. Standard `symbol` (Intl velger «kr», «€» eller koden etter locale). */
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  /** Fortegnsvisning, f.eks. `exceptZero` for prisendringer («+1 200,00 kr»). */
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero'
}

const digitOptions = (options: FormatMoneyOptions): Intl.NumberFormatOptions => {
  if (options.maximumFractionDigits === undefined && options.minimumFractionDigits === undefined) {
    return {}
  }

  const maximumFractionDigits = options.maximumFractionDigits ?? Math.max(options.minimumFractionDigits ?? 0, 2)
  const minimumFractionDigits = Math.min(options.minimumFractionDigits ?? 0, maximumFractionDigits)

  return { maximumFractionDigits, minimumFractionDigits }
}

const buildOptions = (currency: string | null | undefined, options: FormatMoneyOptions): Intl.NumberFormatOptions => ({
  ...(currency ? { style: 'currency', currency, currencyDisplay: options.currencyDisplay ?? 'symbol' } : {}),
  ...(options.compact ? { notation: 'compact' } : {}),
  ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  ...digitOptions(options),
})

// Uten valuta: to desimaler som standard, så et beløp uten valutaoppslag ser
// ut som et beløp («5 400,00») og ikke som et antall («5 400»).
const plainOptions = (options: FormatMoneyOptions): Intl.NumberFormatOptions =>
  buildOptions(null, {
    ...options,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? (options.maximumFractionDigits === undefined ? 2 : 0),
  })

const createFormatter = (
  currency: string | null | undefined,
  locale: string | null | undefined,
  options: FormatMoneyOptions,
): { formatter: Intl.NumberFormat; currencySuffix: string } => {
  const tag = toBcp47(locale)

  if (currency) {
    try {
      return { formatter: new Intl.NumberFormat(tag, buildOptions(currency, options)), currencySuffix: '' }
    } catch {
      // Ugyldig/ukjent valutakode fra data: vis tallet med koden slik den
      // kom i stedet for å kaste — aldri et symbol vi finner på selv.
    }
  }

  return {
    formatter: new Intl.NumberFormat(tag, plainOptions(options)),
    currencySuffix: currency ? ` ${currency}` : '',
  }
}

/**
 * Beløp i hovedenhet (kroner, euro) → lokalisert pengesum.
 *
 * @param amount   beløpet i hovedenhet
 * @param currency ISO 4217-kode fra tenant/dokument; `null` gir et rent tall
 * @param locale   brukerens UI-locale (`no`, `en`, `sv-SE`, …)
 */
export const formatMoney = (
  amount: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options: FormatMoneyOptions = {},
): string => {
  const { formatter, currencySuffix } = createFormatter(currency, locale, options)

  return `${formatter.format(amount)}${currencySuffix}`
}

/**
 * Beløp i minste enhet (øre/cent, slik licensing og Stripe lagrer det) →
 * lokalisert pengesum. Hele plattformen regner med 100 minor per major.
 */
export const formatMinorAmount = (
  amountMinor: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options: FormatMoneyOptions = {},
): string => formatMoney(amountMinor / 100, currency, locale, options)

/**
 * Beløpsspenn med valutaen én gang der localen tillater det
 * («920 000–1 125 000 kr», «NOK 920,000–1,125,000»). Tankestreken får luft
 * rundt seg for lesbarhet.
 */
export const formatMoneyRange = (
  from: number,
  to: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options: FormatMoneyOptions = {},
): string => {
  const { formatter, currencySuffix } = createFormatter(currency, locale, options)
  const rangeFormatter = formatter as Intl.NumberFormat & { formatRange?: (start: number, end: number) => string }

  const text = typeof rangeFormatter.formatRange === 'function'
    ? `${rangeFormatter.formatRange(from, to)}${currencySuffix}`
    : `${formatter.format(from)}${currencySuffix} – ${formatter.format(to)}${currencySuffix}`

  return text.replace(/\s*[–—-]\s*/, ' – ')
}

/**
 * ISO 4217-kodene Intl kjenner, til valutavelgere (backoffice-markeder,
 * kuponger, gavekort) — aldri en håndskrevet liste med NOK øverst.
 */
export const supportedCurrencyCodes = (): string[] => {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }

  return typeof intl.supportedValuesOf === 'function' ? intl.supportedValuesOf('currency') : []
}
