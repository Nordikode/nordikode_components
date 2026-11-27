import { describe, expect, it } from 'vitest'
import {
  formatArea,
  formatLength,
  formatMeasurement,
  formatMeasurementInput,
  formatVolume,
  measurementUnit,
  parseMeasurement,
} from '../../src/floor-plan/measurements'

// Den ene formatteren for lengder, flater og volumer (SIGN-794). Verdien er
// alltid SI; tallet skrives slik brukerens språk skriver det, og enheten
// kommer fra Intl — flate og volum som lengdeenheten med potensen bak.

/** Intl bruker hardt mellomrom mellom tall og enhet og som tusenskille. */
const plain = (text: string): string => text.replace(/[  ]/g, ' ')

describe('formatMeasurement (SIGN-794)', () => {
  it('skriver lengde, flate og volum med enheten bak tallet', () => {
    expect(plain(formatLength(2.4, 'no'))).toBe('2,40 m')
    expect(plain(formatArea(6.24, 'no'))).toBe('6,2 m²')
    expect(plain(formatVolume(14.98, 'no'))).toBe('15,0 m³')
  })

  it('følger brukerens språk: desimaltegn og tusenskille', () => {
    expect(plain(formatArea(1234.56, 'no'))).toBe('1 234,6 m²')
    expect(plain(formatArea(1234.56, 'en'))).toBe('1,234.6 m²')
    expect(plain(formatLength(2.4, 'en'))).toBe('2.40 m')
    expect(plain(formatLength(2.4, 'sv'))).toBe('2,40 m')
    expect(plain(formatLength(2.4, 'fr'))).toBe('2,40 m')
    expect(plain(formatVolume(37.8, 'pl'))).toBe('37,8 m³')
  })

  it('et mål som ikke finnes er tomt — aldri 0', () => {
    expect(formatArea(null, 'no')).toBe('')
    expect(formatLength(undefined, 'no')).toBe('')
    expect(formatVolume(Number.NaN, 'no')).toBe('')
  })

  it('null er et mål, og skrives', () => {
    expect(plain(formatLength(0, 'no'))).toBe('0,00 m')
  })

  it('antall desimaler kan velges der flaten trenger det', () => {
    expect(plain(formatMeasurement(15.12, 'area', 'no', { fractionDigits: 2 }))).toBe('15,12 m²')
    expect(plain(formatMeasurement(15.12, 'area', 'no', { fractionDigits: 0 }))).toBe('15 m²')
  })
})

// Feltene i redigeringen av en plantegning (SIGN-1980): tallet skrives uten
// enhet, enheten står bak feltet, og det som skrives leses slik brukerens
// språk skriver tall. Meter lagres.
describe('mål i felt (SIGN-1980)', () => {
  it('enheten kommer fra Intl, med potensen for flate og volum', () => {
    expect(measurementUnit('length', 'no')).toBe('m')
    expect(measurementUnit('area', 'en')).toBe('m²')
    expect(measurementUnit('volume', 'pl')).toBe('m³')
  })

  it('tallet i feltet står uten enhet og uten tusenskille', () => {
    expect(formatMeasurementInput(2.4, 'length', 'no')).toBe('2,40')
    expect(formatMeasurementInput(2.4, 'length', 'en')).toBe('2.40')
    expect(formatMeasurementInput(1234.5, 'length', 'no')).toBe('1234,50')
    expect(formatMeasurementInput(null, 'length', 'no')).toBe('')
  })

  it('leser tallet slik brukerens språk skriver det', () => {
    expect(parseMeasurement('2,4', 'length', 'no')).toBe(2.4)
    expect(parseMeasurement('2,40', 'length', 'sv')).toBe(2.4)
    expect(parseMeasurement('2,4', 'length', 'fr')).toBe(2.4)
    expect(parseMeasurement('2,4', 'length', 'pl')).toBe(2.4)
    expect(parseMeasurement('2.4', 'length', 'en')).toBe(2.4)
    expect(parseMeasurement('12', 'length', 'no')).toBe(12)
    expect(parseMeasurement(' 0,85 ', 'length', 'no')).toBe(0.85)
    expect(parseMeasurement(',5', 'length', 'no')).toBe(0.5)
  })

  it('tåler enheten bak tallet og tusenskille', () => {
    expect(parseMeasurement('2,4 m', 'length', 'no')).toBe(2.4)
    expect(parseMeasurement('2.4m', 'length', 'en')).toBe(2.4)
    expect(parseMeasurement('6,2 m²', 'area', 'no')).toBe(6.2)
    expect(parseMeasurement('6,2 m2', 'area', 'no')).toBe(6.2)
    expect(parseMeasurement('1\u00a0234,5', 'length', 'no')).toBe(1234.5)
    expect(parseMeasurement('1 234,5', 'length', 'fr')).toBe(1234.5)
    expect(parseMeasurement('1,234.5', 'length', 'en')).toBe(1234.5)
    expect(parseMeasurement('1,234', 'length', 'en')).toBe(1234)
  })

  it('et punktum eller komma skrevet med feil tegn leses som desimaltegn', () => {
    // Norsk skriver desimalkomma, men «2.4» er like tydelig.
    expect(parseMeasurement('2.4', 'length', 'no')).toBe(2.4)
    expect(parseMeasurement('2.45', 'length', 'sv')).toBe(2.45)
    // Engelsk skriver punktum; «2,4» kan ikke være et tusenskille.
    expect(parseMeasurement('2,4', 'length', 'en')).toBe(2.4)
    expect(parseMeasurement('2,45', 'length', 'en')).toBe(2.45)
  })

  it('det som ikke er et tall er null — aldri 0', () => {
    expect(parseMeasurement('', 'length', 'no')).toBeNull()
    expect(parseMeasurement('   ', 'length', 'no')).toBeNull()
    expect(parseMeasurement('to meter', 'length', 'no')).toBeNull()
    expect(parseMeasurement('2,4,5', 'length', 'no')).toBeNull()
    expect(parseMeasurement('2..4', 'length', 'en')).toBeNull()
    expect(parseMeasurement(null, 'length', 'no')).toBeNull()
    expect(parseMeasurement('m', 'length', 'no')).toBeNull()
  })

  it('negative tall leses, så den som kaller kan klemme dem', () => {
    expect(parseMeasurement('-1,5', 'length', 'no')).toBe(-1.5)
    expect(parseMeasurement('\u22121,5', 'length', 'no')).toBe(-1.5)
  })
})
