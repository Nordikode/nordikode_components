import { describe, expect, it } from 'vitest'
import { compact, firstFreeSpot, moveTile, placeTiles, resizeTile, sortTiles, type GridTile } from '../src/widgets/gridLayout'

// Geometrien i widgetrutenettet (SIGN-1850, delt i SIGN-1873): rene
// funksjoner over fliser i celler. Ingen to fliser overlapper etter en
// operasjon, og alt pakkes oppover — slik gridstack og react-grid-layout
// oppfører seg.

const tile = (key: string, x: number, y: number, w = 1, h = 1): GridTile => ({ key, x, y, w, h })

const overlaps = (a: GridTile, b: GridTile): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const expectNoOverlap = (tiles: readonly GridTile[]): void => {
  tiles.forEach((a) => tiles.forEach((b) => {
    if (a !== b) {
      expect(overlaps(a, b), `${a.key} overlapper ${b.key}`).toBe(false)
    }
  }))
}

const at = (tiles: readonly GridTile[], key: string): GridTile => {
  const found = tiles.find((entry) => entry.key === key)
  expect(found, key).toBeDefined()

  return found as GridTile
}

describe('gridLayout', () => {
  it('sorterer i leserekkefølge: ovenfra og ned, så fra venstre', () => {
    const sorted = sortTiles([tile('c', 2, 1), tile('a', 1, 0), tile('b', 0, 1)])

    expect(sorted.map((entry) => entry.key)).toEqual(['a', 'b', 'c'])
  })

  it('pakker fliser oppover uten å hoppe forbi flisen over', () => {
    const packed = compact([tile('a', 0, 2), tile('b', 0, 5, 1, 2), tile('c', 1, 4)])

    expect(at(packed, 'a').y).toBe(0)
    expect(at(packed, 'b').y).toBe(1)
    expect(at(packed, 'c').y).toBe(0)
    expectNoOverlap(packed)
  })

  it('flytter en flis til cellen og dytter det som står der nedover', () => {
    const before = [tile('a', 0, 0, 2, 2), tile('b', 2, 0, 2, 2), tile('c', 0, 2, 4, 1)]
    const after = moveTile(before, 'c', 0, 0, 4)

    expect(at(after, 'c')).toMatchObject({ x: 0, y: 0 })
    expect(at(after, 'a').y).toBe(1)
    expect(at(after, 'b').y).toBe(1)
    expectNoOverlap(after)
  })

  it('bytter plass med naboen når flisen dras ett hakk ned', () => {
    const before = [tile('a', 0, 0), tile('b', 0, 1)]
    const after = moveTile(before, 'a', 0, 1, 1)

    expect(at(after, 'a').y).toBe(1)
    expect(at(after, 'b').y).toBe(0)
  })

  it('returnerer samme liste når flisen allerede står der', () => {
    const before = [tile('a', 0, 0)]

    expect(moveTile(before, 'a', 0, 0, 4)).toBe(before)
    expect(moveTile(before, 'finnes-ikke', 1, 1, 4)).toBe(before)
  })

  it('holder flisen innenfor kolonnene', () => {
    const after = moveTile([tile('a', 0, 0, 2, 1)], 'a', 9, 0, 4)

    expect(at(after, 'a').x).toBe(2)
  })

  it('gir en flis nytt fotavtrykk og dytter naboene ned', () => {
    const before = [tile('a', 0, 0), tile('b', 1, 0), tile('c', 0, 1)]
    const after = resizeTile(before, 'a', 2, 2, 2)

    expect(at(after, 'a')).toMatchObject({ w: 2, h: 2 })
    expect(at(after, 'b').y).toBe(2)
    expect(at(after, 'c').y).toBe(2)
    expectNoOverlap(after)
  })

  it('finner første ledige plass i leserekkefølge', () => {
    const tiles = [tile('a', 0, 0, 2, 1), tile('b', 2, 0, 1, 2)]

    expect(firstFreeSpot(tiles, 1, 1, 4)).toEqual({ x: 3, y: 0 })
    expect(firstFreeSpot(tiles, 2, 1, 4)).toEqual({ x: 0, y: 1 })
    expect(firstFreeSpot(tiles, 4, 1, 4)).toEqual({ x: 0, y: 2 })
  })

  it('plasserer lagrede fliser der de sto og nye på første ledige plass', () => {
    const placed = placeTiles(
      [
        { key: 'a', w: 2, h: 1, x: 0, y: 0 },
        { key: 'b', w: 2, h: 1, x: 0, y: 0 },
        { key: 'ny', w: 1, h: 1 },
      ],
      4,
    )

    expect(at(placed, 'a')).toMatchObject({ x: 0, y: 0 })
    expect(at(placed, 'b')).toMatchObject({ x: 0, y: 1 })
    expect(at(placed, 'ny')).toMatchObject({ x: 2, y: 0 })
    expectNoOverlap(placed)
  })

  it('krymper fliser som er bredere enn rutenettet', () => {
    const placed = placeTiles([{ key: 'bred', w: 6, h: 1 }], 2)

    expect(at(placed, 'bred')).toMatchObject({ x: 0, y: 0, w: 2 })
  })
})
