import { describe, expect, it } from 'vitest'
import { FLOOR_PLAN_TONES, INK_ON_DARK, INK_ON_LIGHT, readableInk, relativeLuminance, toneOf } from '../../src/floor-plan/floorPlanColors'
import { normalizeColor } from '../../src/floor-plan/floorPlanEditing'

// Fargene i en plantegning (SIGN-1980): en palett med ferdige toner, definert
// ett sted som data, og blekket som leses på en hvilken som helst valgt farge.

describe('floorPlanColors (SIGN-1980)', () => {
  it('paletten har rundt tolv toner, lagret som #rrggbb med små bokstaver og uten dubletter', () => {
    expect(FLOOR_PLAN_TONES.length).toBeGreaterThanOrEqual(10)
    expect(FLOOR_PLAN_TONES.length).toBeLessThanOrEqual(14)

    for (const tone of FLOOR_PLAN_TONES) {
      expect(normalizeColor(tone.hex), tone.key).toBe(tone.hex)
    }

    expect(new Set(FLOOR_PLAN_TONES.map((tone) => tone.hex)).size).toBe(FLOOR_PLAN_TONES.length)
    expect(new Set(FLOOR_PLAN_TONES.map((tone) => tone.key)).size).toBe(FLOOR_PLAN_TONES.length)
  })

  it('kjenner igjen en lagret farge som en av tonene', () => {
    expect(toneOf('#d8b98a')?.key).toBe('lightOak')
    expect(toneOf('#D8B98A')?.key).toBe('lightOak')
    expect(toneOf('#123456')).toBeNull()
    expect(toneOf(null)).toBeNull()
  })

  it('regner fargens lyshet', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('ikke en farge')).toBeNull()
    expect(relativeLuminance(null)).toBeNull()
  })

  it('velger mørkt blekk på lyse farger og hvitt på mørke', () => {
    expect(readableInk('#ffffff')).toBe(INK_ON_LIGHT)
    expect(readableInk('#f4f1ea')).toBe(INK_ON_LIGHT)
    expect(readableInk('#d8b98a')).toBe(INK_ON_LIGHT)
    expect(readableInk('#000000')).toBe(INK_ON_DARK)
    expect(readableInk('#4a4f54')).toBe(INK_ON_DARK)
    expect(readableInk('#7a5234')).toBe(INK_ON_DARK)
    // Ingen farge: temaets eget blekk gjelder.
    expect(readableInk(null)).toBeNull()
  })

  it('blekket holder minst 4,5:1 mot hver tone i paletten', () => {
    const inkLuminance = { [INK_ON_LIGHT]: relativeLuminance('#0d1c26')!, [INK_ON_DARK]: 1 }

    for (const tone of FLOOR_PLAN_TONES) {
      const ink = readableInk(tone.hex)!
      const [lighter, darker] = [relativeLuminance(tone.hex)!, inkLuminance[ink]].sort((left, right) => right - left)

      expect((lighter + 0.05) / (darker + 0.05), tone.key).toBeGreaterThanOrEqual(4.5)
    }
  })
})
