import { toBcp47 } from '../money'

/**
 * Den ene formatteren for lengder, flater og volumer i Sign (SIGN-794).
 *
 * Mål lagres og sendes alltid i SI: meter, kvadratmeter og kubikkmeter, uten
 * enhet ved siden av. Her — og bare her — blir tallet til tekst for
 * brukeren: tallet skrives slik brukerens språk skriver det (desimaltegn,
 * tusenskille, mellomrom foran enheten), og enheten kommer fra `Intl`, aldri
 * fra en mal eller en språkfil.
 *
 * `Intl` har lengdeenheten (`meter`), men ingen enhet for flate eller volum
 * («square-meter» og «cubic-meter» finnes ikke i enhetslisten nettleserne
 * støtter, og gir `RangeError`). Flate og volum skrives derfor med
 * lengdeenheten fra `Intl` og potensen bak: «m» blir «m²» og «m³». Det er
 * SI-skrivemåten i alle språk plattformen har.
 *
 * Plattformen har ikke noe målesystem på firma eller bruker ennå; alt vises
 * metrisk. Kommer det (fot og tommer), er dette det ene stedet det kobles
 * inn: regn om SI-verdien og bytt enhet i `LENGTH_UNIT`. Ingen visning
 * trenger å endres.
 */
export type MeasurementQuantity = 'length' | 'area' | 'volume'

export interface FormatMeasurementOptions {
  /** Antall desimaler; standard er to for lengde og én for flate og volum. */
  fractionDigits?: number
}

/** Lengdeenheten målene vises i. SI-verdien er alltid i meter. */
const LENGTH_UNIT = 'meter'

const EXPONENT: Record<MeasurementQuantity, string> = { length: '', area: '²', volume: '³' }

/** To desimaler på lengder (centimeteren teller når noe skal bestilles), én på flater og volumer. */
const DEFAULT_FRACTION_DIGITS: Record<MeasurementQuantity, number> = { length: 2, area: 1, volume: 1 }

/**
 * `value` er SI: meter for lengde, m² for flate, m³ for volum. Et mål som
 * ikke finnes (null, undefined, NaN) er en tom streng — aldri «0 m».
 */
export const formatMeasurement = (
  value: number | null | undefined,
  quantity: MeasurementQuantity,
  locale: string,
  options: FormatMeasurementOptions = {},
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return ''
  }

  const fractionDigits = options.fractionDigits ?? DEFAULT_FRACTION_DIGITS[quantity]

  return new Intl.NumberFormat(toBcp47(locale), {
    style: 'unit',
    unit: LENGTH_UNIT,
    unitDisplay: 'short',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
    .formatToParts(value)
    .map((part) => (part.type === 'unit' ? `${part.value}${EXPONENT[quantity]}` : part.value))
    .join('')
}

export const formatLength = (meters: number | null | undefined, locale: string, options?: FormatMeasurementOptions): string =>
  formatMeasurement(meters, 'length', locale, options)

export const formatArea = (squareMeters: number | null | undefined, locale: string, options?: FormatMeasurementOptions): string =>
  formatMeasurement(squareMeters, 'area', locale, options)

export const formatVolume = (cubicMeters: number | null | undefined, locale: string, options?: FormatMeasurementOptions): string =>
  formatMeasurement(cubicMeters, 'volume', locale, options)

/**
 * Enheten et mål vises i («m», «m²», «m³»), slik brukerens språk skriver den
 * — til etiketten bak et felt der tallet skrives uten enhet.
 */
export const measurementUnit = (quantity: MeasurementQuantity, locale: string): string => {
  const unit = new Intl.NumberFormat(toBcp47(locale), { style: 'unit', unit: LENGTH_UNIT, unitDisplay: 'short' })
    .formatToParts(1)
    .find((part) => part.type === 'unit')?.value ?? ''

  return `${unit}${EXPONENT[quantity]}`
}

/**
 * Tallet alene, uten enhet, slik det står i et felt brukeren skriver i:
 * brukerens desimaltegn, ingen tusenskille. `value` er SI, som i
 * `formatMeasurement`; et mål som ikke finnes er en tom streng.
 */
export const formatMeasurementInput = (
  value: number | null | undefined,
  quantity: MeasurementQuantity,
  locale: string,
  options: FormatMeasurementOptions = {},
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return ''
  }

  const fractionDigits = options.fractionDigits ?? DEFAULT_FRACTION_DIGITS[quantity]

  return new Intl.NumberFormat(toBcp47(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  }).format(value)
}

/**
 * Leser et tall brukeren har skrevet, slik brukerens språk skriver det:
 * språkets desimaltegn og tusenskille (hentet fra `Intl`, aldri en egen
 * liste). Et komma eller punktum som ikke kan være tusenskille i språket
 * leses som desimaltegn, så «2.4» og «2,4» gir det samme for en som skriver
 * med feil tegn. Tom tekst og alt som ikke er et tall er null — aldri 0.
 * Den ene tallparseren i Sign: `Number()` rett på det brukeren skrev er feil.
 */
export const parseLocaleNumber = (text: string | null | undefined, locale: string): number | null => {
  const parts = new Intl.NumberFormat(toBcp47(locale), { useGrouping: true }).formatToParts(-1234567.5)
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.'
  const group = parts.find((part) => part.type === 'group')?.value ?? ''

  // Mellomrom (også harde og smale) er tusenskille eller luft i alle språk.
  let value = (text ?? '').replace(/[\s\u00a0\u202f]/g, '').replace(/^[−–]/, '-')

  if (value === '') {
    return null
  }

  const other = decimal === ',' ? '.' : ','

  if (group === other || group.trim() === '') {
    // Språkets tusenskille er det andre tegnet (eller et mellomrom): står det
    // andre tegnet nøyaktig én gang og ikke som en gyldig tusengruppe, er det
    // skrevet som desimaltegn.
    const groups = value.split(other)
    const isGrouping = group === other && groups.length > 1 && groups.slice(1).every((part) => /^\d{3}(?:\D|$)/.test(part))

    if (!isGrouping && groups.length === 2 && !value.includes(decimal)) {
      value = value.replace(other, decimal)
    } else if (group === other) {
      value = value.split(other).join('')
    }
  }

  const normalized = value.replace(decimal, '.')

  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return null
  }

  const parsed = Number.parseFloat(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Leser et mål brukeren har skrevet, og gir SI-verdien (meter, m², m³).
 * Tallet leses med `parseLocaleNumber`, med eller uten enheten bak.
 *
 * Dette er motstykket til `formatMeasurement`, og det samme ene stedet et
 * målesystem kobles inn: regn om fra brukerens enhet til SI her.
 */
export const parseMeasurement = (text: string | null | undefined, quantity: MeasurementQuantity, locale: string): number | null => {
  const unit = measurementUnit(quantity, locale)

  let value = (text ?? '').trim()

  // Enheten bak tallet («2,4 m», «6 m²», også skrevet «m2») er lov, men ikke nødvendig.
  for (const suffix of [unit, `${measurementUnit('length', locale)}${quantity === 'area' ? '2' : quantity === 'volume' ? '3' : ''}`]) {
    if (suffix !== '' && value.toLowerCase().endsWith(suffix.toLowerCase())) {
      value = value.slice(0, -suffix.length).trim()
      break
    }
  }

  return parseLocaleNumber(value, locale)
}

/**
 * Et tall med en enhet `Intl` kjenner («12 cm», «3,5 kg», «15 %»), skrevet
 * slik brukerens språk skriver det. `exponent` gir flate og volum av en
 * lengdeenhet («m²», «m³»), som i `formatMeasurement`. Til tall som ikke er
 * SI-mål fra plantegningene — tallene som ble sagt på en befaring
 * (SIGN-1983). Desimalene som finnes vises, inntil tre; ingen legges til.
 */
export const formatUnitValue = (
  value: number | null | undefined,
  unit: string,
  locale: string,
  options: { exponent?: '' | '²' | '³'; maximumFractionDigits?: number } = {},
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return ''
  }

  return new Intl.NumberFormat(toBcp47(locale), {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: options.maximumFractionDigits ?? 3,
  })
    .formatToParts(value)
    .map((part) => (part.type === 'unit' ? `${part.value}${options.exponent ?? ''}` : part.value))
    .join('')
}

/** Enheten alene («cm», «kg», «m²»), slik brukerens språk skriver den. */
export const unitSymbol = (unit: string, locale: string, exponent: '' | '²' | '³' = ''): string => {
  const symbol = new Intl.NumberFormat(toBcp47(locale), { style: 'unit', unit, unitDisplay: 'short' })
    .formatToParts(1)
    .find((part) => part.type === 'unit')?.value ?? ''

  return symbol === '' ? '' : `${symbol}${exponent}`
}

/**
 * Et rent tall slik brukerens språk skriver det, uten enhet. `grouping: false`
 * gir tallet slik det står i et felt brukeren skriver i.
 */
export const formatPlainNumber = (
  value: number | null | undefined,
  locale: string,
  options: { maximumFractionDigits?: number; grouping?: boolean } = {},
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return ''
  }

  return new Intl.NumberFormat(toBcp47(locale), {
    maximumFractionDigits: options.maximumFractionDigits ?? 3,
    useGrouping: options.grouping ?? true,
  }).format(value)
}
