import { describe, expect, it } from 'vitest'
import { defaultLayout, isDefaultLayout, isStoredLayout, positionsFor, resolveLayout, widgetSpan } from '../src/widgets/layoutModel'
import type { WidgetDefinition } from '../src/widgets/types'

// Oppsettsmodellen (SIGN-1850, delt i SIGN-1873): det som er lagret på
// brukeren renses mot registeret flaten har i dag, så nye widgeter dukker
// opp og fjernede forsvinner — uten at brukerens valg for resten går tapt.

const definitions: WidgetDefinition[] = [
  { key: 'a', title: 'A', icon: 'mdi-a', sizes: ['medium', 'small'], zone: 'main' },
  { key: 'b', title: 'B', icon: 'mdi-b', sizes: ['large'], zone: 'main', rows: { large: 2 } },
  { key: 'c', title: 'C', icon: 'mdi-c', sizes: ['medium'], zone: 'side', hidden: true },
]

const zones = ['main', 'side']

describe('layoutModel', () => {
  it('standardoppsettet følger registeret: sone, første størrelse, skjult etter definisjonen', () => {
    expect(defaultLayout(definitions, zones)).toEqual({
      widgets: [
        { key: 'a', size: 'medium', visible: true, zone: 'main' },
        { key: 'b', size: 'large', visible: true, zone: 'main' },
        { key: 'c', size: 'medium', visible: false, zone: 'side' },
      ],
    })
  })

  it('kaster ukjente widgeter og dubletter, og legger nye bakerst', () => {
    const layout = resolveLayout(
      { widgets: [{ key: 'b', size: 'large', visible: false, zone: 'side' }, { key: 'borte', size: 'small' }, { key: 'b' }] },
      definitions,
      zones,
    )

    expect(layout.widgets.map((item) => item.key)).toEqual(['b', 'a', 'c'])
    expect(layout.widgets[0]).toEqual({ key: 'b', size: 'large', visible: false, zone: 'side' })
  })

  it('faller tilbake til standard når størrelsen eller sonen ikke finnes', () => {
    const layout = resolveLayout({ widgets: [{ key: 'a', size: 'large', visible: true, zone: 'bortenfor' }] }, definitions, zones)

    expect(layout.widgets[0]).toEqual({ key: 'a', size: 'medium', visible: true, zone: 'main' })
  })

  it('beholder bare velformede posisjoner for kjente widgeter', () => {
    const layout = resolveLayout(
      {
        widgets: [{ key: 'a' }],
        positions: [
          { zone: 'main', columns: 4, tiles: { a: { x: 1, y: 0 }, borte: { x: 0, y: 0 }, b: { x: -1, y: 0 } } },
          { zone: 'main', columns: 4, tiles: { a: { x: 3, y: 3 } } },
          { zone: 'ukjent', columns: 4, tiles: { a: { x: 0, y: 0 } } },
          { columns: 0, tiles: { a: { x: 0, y: 0 } } },
        ],
      },
      definitions,
      zones,
    )

    expect(layout.positions).toEqual([{ zone: 'main', columns: 4, tiles: { a: { x: 1, y: 0 } } }])
    expect(positionsFor(layout, 'main', 4)?.tiles.a).toEqual({ x: 1, y: 0 })
    expect(positionsFor(layout, 'main', 6)).toBeUndefined()
  })

  it('tåler søppel som lagret verdi', () => {
    expect(resolveLayout(null, definitions, zones)).toEqual(defaultLayout(definitions, zones))
    expect(resolveLayout('tekst', definitions, zones)).toEqual(defaultLayout(definitions, zones))
    expect(resolveLayout({ widgets: 'nei', positions: 'nei' }, definitions, zones)).toEqual(defaultLayout(definitions, zones))
  })

  it('kjenner igjen standardoppsettet', () => {
    expect(isDefaultLayout(defaultLayout(definitions, zones), definitions, zones)).toBe(true)
    expect(isDefaultLayout(resolveLayout({ widgets: [{ key: 'a', visible: false }] }, definitions, zones), definitions, zones)).toBe(false)
  })

  it('spennet følger størrelsen og kolonneantallet, med radene fra definisjonen', () => {
    expect(widgetSpan('small', 6)).toEqual({ w: 1, h: 1 })
    expect(widgetSpan('medium', 6)).toEqual({ w: 3, h: 2 })
    expect(widgetSpan('medium', 1)).toEqual({ w: 1, h: 2 })
    expect(widgetSpan('medium', 2)).toEqual({ w: 2, h: 2 })
    expect(widgetSpan('medium', 4)).toEqual({ w: 2, h: 2 })
    expect(widgetSpan('large', 4)).toEqual({ w: 4, h: 3 })
    expect(widgetSpan('large', 4, definitions[1])).toEqual({ w: 4, h: 2 })
  })

  it('høyden brukeren har valgt vinner over størrelsens standard, og bare 1–3 rader gjelder (SIGN-1903)', () => {
    expect(widgetSpan('medium', 4, undefined, 1)).toEqual({ w: 2, h: 1 })
    expect(widgetSpan('small', 4, undefined, 3)).toEqual({ w: 1, h: 3 })
    expect(widgetSpan('large', 4, definitions[1], 1)).toEqual({ w: 4, h: 1 })
    expect(widgetSpan('medium', 4, undefined, 7)).toEqual({ w: 2, h: 2 })
    expect(widgetSpan('medium', 4, undefined, 0)).toEqual({ w: 2, h: 2 })
  })

  it('beholder en gyldig lagret høyde og kaster en ugyldig', () => {
    const layout = resolveLayout(
      { widgets: [{ key: 'a', size: 'medium', visible: true, zone: 'main', rows: 1 }, { key: 'b', rows: 9 }] },
      definitions,
      zones,
    )

    expect(layout.widgets.find((item) => item.key === 'a')?.rows).toBe(1)
    expect(layout.widgets.find((item) => item.key === 'b')).not.toHaveProperty('rows')
  })

  it('setter en widget skilt ut av en annen rett etter den i et lagret oppsett (SIGN-1903)', () => {
    const split: WidgetDefinition[] = [...definitions, { key: 'a2', title: 'A2', icon: 'mdi-a', sizes: ['medium'], zone: zones[0], after: 'a' }]
    const other = zones[zones.length - 1]

    const moved = resolveLayout({ widgets: [{ key: 'a', size: 'medium', visible: true, zone: other }, { key: 'b' }] }, split, zones)
    expect(moved.widgets.slice(0, 2).map((item) => [item.key, item.zone, item.visible])).toEqual([
      ['a', other, true],
      ['a2', other, true],
    ])

    const hidden = resolveLayout({ widgets: [{ key: 'b' }, { key: 'a', visible: false }] }, split, zones)
    expect(hidden.widgets.find((item) => item.key === 'a2')?.visible).toBe(false)

    // Uten lagret oppsett gjelder registerets rekkefølge.
    expect(resolveLayout(null, split, zones).widgets.map((item) => item.key)).toEqual(defaultLayout(split, zones).widgets.map((item) => item.key))
  })

  it('typevakten slipper bare gjennom noe med en widgetliste', () => {
    expect(isStoredLayout({ widgets: [] })).toBe(true)
    expect(isStoredLayout(['a', 'b'])).toBe(false)
    expect(isStoredLayout(null)).toBe(false)
  })
})
