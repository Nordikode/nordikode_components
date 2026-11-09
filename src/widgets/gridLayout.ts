import type { GridPosition } from './types'

/**
 * Geometrien i et widgetrutenett: et fast antall kolonner og rader med lik
 * høyde, der hver synlig widget opptar et rektangel (`x`, `y`, `w`, `h` i
 * celler). Ingenting her kjenner Vue eller lagringen — funksjonene er rene:
 * de tar en liste plasserte fliser og gir en ny, gyldig liste der ingen to
 * overlapper og hver flis ligger så høyt den kan («tyngdekraft»), så
 * rutenettet holder seg ryddig uten at brukeren må tette hull selv.
 *
 * Modellen er den dashbord pleier å bruke (gridstack, react-grid-layout):
 * slippes en flis et sted, dyttes flisene den lander på nedover, og hele
 * rutenettet pakkes så oppover.
 */
export interface GridTile {
  key: string
  x: number
  y: number
  w: number
  h: number
}

const overlaps = (a: GridTile, b: GridTile): boolean =>
  a !== b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

const firstCollision = (tiles: readonly GridTile[], tile: GridTile): GridTile | undefined =>
  tiles.find((other) => other.key !== tile.key && overlaps(other, tile))

const collisions = (tiles: readonly GridTile[], tile: GridTile): GridTile[] =>
  tiles.filter((other) => other.key !== tile.key && overlaps(other, tile))

/** Leserekkefølge: ovenfra og ned, så fra venstre mot høyre. */
export const sortTiles = <T extends GridTile>(tiles: readonly T[]): T[] =>
  [...tiles].sort((a, b) => a.y - b.y || a.x - b.x)

const clampX = (x: number, w: number, columns: number): number =>
  Math.max(0, Math.min(Math.round(x), columns - w))

/**
 * Trekker hver flis så høyt opp den kan uten å overlappe en flis over seg.
 * Flisene tas i leserekkefølge, så en flis hopper aldri forbi en som lå over den.
 */
export const compact = <T extends GridTile>(tiles: readonly T[]): T[] => {
  const placed: T[] = []

  sortTiles(tiles).forEach((tile) => {
    const moved = { ...tile }

    while (moved.y > 0 && firstCollision(placed, { ...moved, y: moved.y - 1 }) === undefined) {
      moved.y -= 1
    }

    let collision = firstCollision(placed, moved)

    while (collision !== undefined) {
      moved.y = collision.y + collision.h
      collision = firstCollision(placed, moved)
    }

    placed.push(moved)
  })

  return placed
}

/**
 * Flytter flisene som overlapper `tile` ut av veien: under den, og det de
 * lander på dyttes videre ned. Når det er brukeren som flytter, får en flis
 * som får plass rett over den flyttede heller den plassen — da bytter et
 * drag ett hakk ned plass med naboen i stedet for å dytte naboen nederst.
 */
const pushAway = <T extends GridTile>(tiles: T[], tile: T, userAction: boolean, movingUp: boolean, moved: Set<string>): void => {
  let others = sortTiles(collisions(tiles, tile)) as T[]

  if (movingUp) {
    others = others.reverse()
  }

  others.forEach((other) => {
    if (moved.has(other.key)) {
      return
    }

    if (userAction) {
      const above = { ...other, y: Math.max(0, tile.y - other.h) }

      if (above.y + above.h <= tile.y && firstCollision(tiles, above) === undefined) {
        other.y = above.y
        moved.add(other.key)

        return
      }
    }

    other.y = tile.y + tile.h
    moved.add(other.key)
    pushAway(tiles, other, false, false, moved)
  })
}

/**
 * Setter flisen `key` på (`x`, `y`), dytter flisene den lander på unna og
 * pakker rutenettet. Returnerer samme liste når ingenting endret seg.
 */
export const moveTile = <T extends GridTile>(tiles: readonly T[], key: string, x: number, y: number, columns: number): readonly T[] => {
  const copy = tiles.map((tile) => ({ ...tile }))
  const tile = copy.find((item) => item.key === key)

  if (tile === undefined) {
    return tiles
  }

  const targetX = clampX(x, tile.w, columns)
  const targetY = Math.max(0, Math.round(y))

  if (tile.x === targetX && tile.y === targetY) {
    return tiles
  }

  const movingUp = targetY < tile.y
  tile.x = targetX
  tile.y = targetY
  pushAway(copy, tile, true, movingUp, new Set([key]))

  return compact(copy)
}

/**
 * Gir flisen `key` nytt fotavtrykk der den står, dytter naboene ned om den
 * vokste inn i dem, og pakker rutenettet.
 */
export const resizeTile = <T extends GridTile>(tiles: readonly T[], key: string, w: number, h: number, columns: number): readonly T[] => {
  const copy = tiles.map((tile) => ({ ...tile }))
  const tile = copy.find((item) => item.key === key)

  if (tile === undefined) {
    return tiles
  }

  tile.w = Math.min(w, columns)
  tile.h = h
  tile.x = clampX(tile.x, tile.w, columns)
  pushAway(copy, tile, false, false, new Set([key]))

  return compact(copy)
}

/**
 * Første ledige plass (leserekkefølge) der en flis på `w` × `h` får plass
 * blant `tiles`. Brukes for fliser uten lagret posisjon: nye widgeter og
 * widgeter som vises igjen.
 */
export const firstFreeSpot = (tiles: readonly GridTile[], w: number, h: number, columns: number): GridPosition => {
  const bottom = tiles.reduce((max, tile) => Math.max(max, tile.y + tile.h), 0)
  const probe: GridTile = { key: '', x: 0, y: 0, w, h }

  for (let y = 0; y <= bottom; y += 1) {
    for (let x = 0; x + w <= columns; x += 1) {
      probe.x = x
      probe.y = y

      if (firstCollision(tiles, probe) === undefined) {
        return { x, y }
      }
    }
  }

  return { x: 0, y: bottom }
}

/**
 * Bygger et gyldig rutenett av fliser som kan være plassert for hånd
 * (`x`/`y` satt) eller ikke. Plasserte fliser beholder plassen der det går;
 * det som overlapper dyttes ned i leserekkefølge; uplasserte fliser tar
 * første ledige plass i gitt rekkefølge; og resultatet pakkes.
 */
export const placeTiles = <T extends Omit<GridTile, 'x' | 'y'> & Partial<GridPosition>>(
  tiles: readonly T[],
  columns: number,
): Array<T & GridTile> => {
  const placed: Array<T & GridTile> = []
  const unplaced: T[] = []

  tiles.forEach((tile) => {
    const w = Math.min(tile.w, columns)

    if (tile.x !== undefined && tile.y !== undefined) {
      placed.push({ ...tile, w, x: clampX(tile.x, w, columns), y: Math.max(0, Math.round(tile.y)) })
    } else {
      unplaced.push({ ...tile, w })
    }
  })

  const resolved: Array<T & GridTile> = []

  sortTiles(placed).forEach((tile) => {
    let collision = firstCollision(resolved, tile)

    while (collision !== undefined) {
      tile.y = collision.y + collision.h
      collision = firstCollision(resolved, tile)
    }

    resolved.push(tile)
  })

  unplaced.forEach((tile) => {
    const spot = firstFreeSpot(resolved, tile.w, tile.h, columns)
    resolved.push({ ...tile, ...spot } as T & GridTile)
  })

  return compact(resolved)
}
