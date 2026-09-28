import { afterEach, describe, expect, it } from 'vitest'

import { configureLocales, formatMoney, toBcp47 } from '../src/money'

/** Rader slik språkregisteret (core `platformLocales`) leverer dem. */
const registry = [
  { code: 'en', bcp47: 'en-GB', aliases: [] },
  { code: 'no', bcp47: 'nb-NO', aliases: ['nb', 'nn'] },
  { code: 'sv', bcp47: 'sv-SE', aliases: [] },
  { code: 'de', bcp47: 'de-DE', aliases: [] },
  { code: 'pt-BR', bcp47: 'pt-BR', aliases: ['pt'] },
]

afterEach(() => {
  configureLocales([])
})

describe('toBcp47 uten konfigurasjon', () => {
  it('bruker startverdien for språkene plattformen har i dag', () => {
    expect(toBcp47('en')).toBe('en-GB')
    expect(toBcp47('no')).toBe('nb-NO')
    expect(toBcp47('nb')).toBe('nb-NO')
    expect(toBcp47('nn')).toBe('nn-NO')
    expect(toBcp47('sv')).toBe('sv-SE')
    expect(toBcp47('fr')).toBe('fr-FR')
    expect(toBcp47('pl')).toBe('pl-PL')
  })

  it('slipper ukjente koder og fulle tagger uendret gjennom', () => {
    expect(toBcp47('de')).toBe('de')
    expect(toBcp47('sv-SE')).toBe('sv-SE')
    expect(toBcp47('fr-CA')).toBe('fr-CA')
  })

  it('gir kildespråket for tom verdi, aldri norsk', () => {
    expect(toBcp47('')).toBe('en-GB')
    expect(toBcp47('   ')).toBe('en-GB')
    expect(toBcp47(null)).toBe('en-GB')
    expect(toBcp47(undefined)).toBe('en-GB')
  })

  it('skiller ikke mellom store og små bokstaver', () => {
    expect(toBcp47('NO')).toBe('nb-NO')
    expect(toBcp47(' Sv ')).toBe('sv-SE')
  })
})

describe('configureLocales', () => {
  it('gir full tag for et språk registeret har fått', () => {
    expect(toBcp47('de')).toBe('de')

    configureLocales(registry)

    expect(toBcp47('de')).toBe('de-DE')
    expect(toBcp47('DE')).toBe('de-DE')
  })

  it('løser alias til språkets tag', () => {
    configureLocales(registry)

    expect(toBcp47('nb')).toBe('nb-NO')
    expect(toBcp47('nn')).toBe('nb-NO')
    expect(toBcp47('pt')).toBe('pt-BR')
    expect(toBcp47('pt-br')).toBe('pt-BR')
  })

  it('erstatter tabellen: et språk registeret ikke har, passerer uendret', () => {
    configureLocales(registry)

    expect(toBcp47('pl')).toBe('pl')
    expect(toBcp47('fr')).toBe('fr')
  })

  it('lar en kode vinne over et annet språks alias', () => {
    configureLocales([
      { code: 'no', bcp47: 'nb-NO', aliases: ['nb', 'nn'] },
      { code: 'nn', bcp47: 'nn-NO', aliases: [] },
    ])

    expect(toBcp47('nn')).toBe('nn-NO')
    expect(toBcp47('nb')).toBe('nb-NO')
  })

  it('beholder kildespråket når registeret ikke nevner det', () => {
    configureLocales([{ code: 'de', bcp47: 'de-DE', aliases: ['en'] }])

    expect(toBcp47('en')).toBe('en-GB')
    expect(toBcp47('')).toBe('en-GB')
  })

  it('følger registerets tag for kildespråket', () => {
    configureLocales([{ code: 'en', bcp47: 'en-IE' }])

    expect(toBcp47('en')).toBe('en-IE')
    expect(toBcp47(null)).toBe('en-IE')
  })

  it('hopper over rader uten kode eller tag', () => {
    configureLocales([
      { code: '', bcp47: 'xx-XX' },
      { code: 'de', bcp47: ' ' },
      { code: 'sv', bcp47: 'sv-SE', aliases: null },
    ])

    expect(toBcp47('sv')).toBe('sv-SE')
    expect(toBcp47('de')).toBe('de')
  })

  it('setter tabellen tilbake til startverdien med en tom liste', () => {
    configureLocales(registry)
    configureLocales([])

    expect(toBcp47('pl')).toBe('pl-PL')
    expect(toBcp47('nn')).toBe('nn-NO')
    expect(toBcp47('de')).toBe('de')
  })

  it('styrer formateringen av beløp', () => {
    const before = formatMoney(1234.5, 'EUR', 'de')

    configureLocales(registry)

    expect(formatMoney(1234.5, 'EUR', 'de')).toBe(
      new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5),
    )
    expect(before).toBe(new Intl.NumberFormat('de', { style: 'currency', currency: 'EUR' }).format(1234.5))
  })
})
