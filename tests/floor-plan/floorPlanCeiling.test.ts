import { describe, expect, it } from 'vitest'
import {
  ceilingArea,
  ceilingHeightAt,
  ceilingPieces,
  ceilingProfileAlong,
  ceilingTriangles,
  ceilingVolume,
  isSlopedRoom,
  levelHeight,
  meanWallHeight,
  profileHeight,
  simplifyProfile,
  slopedProfile,
  wallHeightRange,
  type CeilingPoint,
  type CeilingRoom,
  type CeilingWall,
  type WallProfilePoint,
} from '../../src/floor-plan/floorPlanCeiling'
import { roomMeasurements } from '../../src/floor-plan/floorPlanGeometry'

// Taket under skråtak (SIGN-1982). Fasiten er den samme i cases
// (`FloorPlanMeasurementsTest`), her og i Sign-appen, og hvert tall kan
// regnes for hånd.

const point = (x: number, y: number): CeilingPoint => ({ x, y })
const profile = (...pairs: [number, number][]): WallProfilePoint[] => pairs.map(([at, height]) => ({ at, height }))
const rectangle = (width: number, depth: number): CeilingPoint[] => [point(0, 0), point(width, 0), point(width, depth), point(0, depth)]

/** Veggene rundt omrisset, én per kant: høyden, og overkanten når veggen er skrå. */
const around = (outline: CeilingPoint[], walls: [number, WallProfilePoint[]?][]): CeilingWall[] =>
  walls.map(([height, top], index) => ({ start: outline[index], end: outline[(index + 1) % outline.length], height, profile: top ?? null }))

const turned = (outline: CeilingPoint[], degrees: number): CeilingPoint[] => {
  const cos = Math.cos((degrees * Math.PI) / 180)
  const sin = Math.sin((degrees * Math.PI) / 180)

  return outline.map(({ x, y }) => point(x * cos - y * sin, x * sin + y * cos))
}

// Ett fall: 4 × 3 m, 1,2 m langs den ene langveggen og 2,4 m langs den andre.
const monoPitchWalls: [number, WallProfilePoint[]?][] = [[1.2], [2.4, profile([0, 1.2], [1, 2.4])], [2.4], [2.4, profile([0, 2.4], [1, 1.2])]]
const monoPitch: CeilingRoom = { outline: rectangle(4, 3), walls: around(rectangle(4, 3), monoPitchWalls) }

// Møne: 6 × 4 m, knevegger 1,0 m, mønet 3,0 m over midten av gavlveggene.
const gableTop = profile([0, 1], [0.5, 3], [1, 1])
const gable: CeilingRoom = { outline: rectangle(6, 4), walls: around(rectangle(6, 4), [[1], [3, gableTop], [1], [3, gableTop]]) }

// Møne kuttet av en himling: 6 × 5 m, knevegger 0,9 m, vannrett på 2,4 m fra 30 % til 70 % av gavlveggene.
const cutTop = profile([0, 0.9], [0.3, 2.4], [0.7, 2.4], [1, 0.9])
const cut: CeilingRoom = { outline: rectangle(6, 5), walls: around(rectangle(6, 5), [[0.9], [2.4, cutTop], [0.9], [2.4, cutTop]]) }

// Et vinkelrom under ett fall som stiger 0,4 m per meter: 1,0 m ved y = 0, 2,6 m ved y = 4.
const angleOutline = [point(0, 0), point(5, 0), point(5, 2), point(3, 2), point(3, 4), point(0, 4)]
const angle: CeilingRoom = {
  outline: angleOutline,
  walls: around(angleOutline, [[1], [1.8, profile([0, 1], [1, 1.8])], [1.8], [2.6, profile([0, 1.8], [1, 2.6])], [2.6], [2.6, profile([0, 2.6], [1, 1])]]),
}

const measured = (room: CeilingRoom, openings: { start: CeilingPoint; end: CeilingPoint; height: number }[] = []) => roomMeasurements({ ...room, openings })

describe('målene i et rom under skråtak (SIGN-1982) — fasiten', () => {
  const monoPitchAnswer = {
    floorArea: 12,
    // 4 × 1,2 + 4 × 2,4 + 2 × (3 × 1,8)
    wallArea: 25.2,
    wallAreaGross: 25.2,
    // 4 × √(3² + 1,2²)
    ceilingArea: 12.92,
    perimeter: 14,
    ceilingHeight: 2.4,
    ceilingHeightMin: 1.2,
    // 12 × 1,8
    volume: 21.6,
  }

  it('ett fall', () => {
    expect(measured(monoPitch)).toEqual(monoPitchAnswer)
  })

  it('ett fall, rommet dreid 30 grader', () => {
    expect(measured({ outline: turned(rectangle(4, 3), 30), walls: around(turned(rectangle(4, 3), 30), monoPitchWalls) })).toEqual(monoPitchAnswer)
  })

  it('møne, med en luke 0,8 × 0,9 m i en knevegg', () => {
    expect(measured(gable, [{ start: point(2, 0), end: point(2.8, 0), height: 0.9 }])).toEqual({
      floorArea: 24,
      wallArea: 27.28,
      // 2 × (6 × 1) + 2 × (4 × 1 + 4 × 2 / 2)
      wallAreaGross: 28,
      // 2 × 6 × √(2² + 2²)
      ceilingArea: 33.94,
      perimeter: 20,
      ceilingHeight: 3,
      ceilingHeightMin: 1,
      // 6 × (4 × 1 + 4 × 2 / 2)
      volume: 48,
    })
  })

  it('møne kuttet av en himling', () => {
    expect(measured(cut)).toEqual({
      floorArea: 30,
      wallArea: 30.3,
      wallAreaGross: 30.3,
      // 2 × 6 × √(1,5² + 1,5²) + 6 × 2
      ceilingArea: 37.46,
      perimeter: 22,
      ceilingHeight: 2.4,
      ceilingHeightMin: 0.9,
      // 6 × (5 × 0,9 + (5 + 2) / 2 × 1,5)
      volume: 58.5,
    })
  })

  it('vinkelrom under ett fall', () => {
    expect(measured(angle)).toEqual({
      floorArea: 16,
      wallArea: 30.8,
      wallAreaGross: 30.8,
      // 16 × √(1 + 0,4²)
      ceilingArea: 17.23,
      perimeter: 18,
      ceilingHeight: 2.6,
      ceilingHeightMin: 1,
      // 10 × 1,4 + 6 × 2,2
      volume: 27.2,
    })
  })

  it('én vegg alene er skrå: taket går jevnt fra den til veggen tvers over rommet', () => {
    const walls = around(rectangle(4, 3), [[2.4, profile([0, 1.2], [1, 2.4])], [2.4], [2.4], [2.4]])
    const measurements = measured({ outline: rectangle(4, 3), walls })

    expect(measurements.ceilingHeight).toBe(2.4)
    expect(measurements.ceilingHeightMin).toBe(1.2)
    // Veggen ved y = 0 er 1,8 m i snitt, den ved y = 3 er 2,4 m: 12 × 2,1.
    expect(measurements.volume).toBe(25.2)
    // 4 × 1,8 + 3 × 2,4 + 4 × 2,4 + 3 × 2,4
    expect(measurements.wallAreaGross).toBe(31.2)
    expect(measurements.ceilingArea).toBeGreaterThan(12)
  })

  it('en overkant der alle punktene er i samme høyde er en vegg med én høyde', () => {
    const level = profile([0, 2.4], [0.5, 2.4], [1, 2.4])
    const room = { outline: rectangle(2.4, 2.6), walls: around(rectangle(2.4, 2.6), [[2.4, level], [2.4, level], [2.4, level], [2.4, level]]) }

    expect(isSlopedRoom(room)).toBe(false)
    expect(slopedProfile(room.walls[0])).toBeNull()
    expect(measured(room)).toMatchObject({ ceilingHeight: 2.4, ceilingHeightMin: null, ceilingArea: 6.24, volume: 14.98 })
  })

  it('et skrått rom uten omriss har veggflater og høyder, men ikke tak eller volum', () => {
    const walls = [{ start: point(0, 0), end: point(4, 0), height: 2.4, profile: profile([0, 1], [1, 2.4]) }]

    expect(measured({ outline: [], walls })).toMatchObject({ floorArea: null, ceilingArea: null, volume: null, wallAreaGross: 6.8, ceilingHeight: 2.4, ceilingHeightMin: 1 })
  })
})

describe('veggens overkant', () => {
  const gableWall = gable.walls[1]

  it('høyden leses langs overkanten, rett mellom punktene', () => {
    expect(profileHeight(gableWall, 0)).toBe(1)
    expect(profileHeight(gableWall, 0.25)).toBe(2)
    expect(profileHeight(gableWall, 0.5)).toBe(3)
    expect(profileHeight(gableWall, 0.75)).toBe(2)
    expect(profileHeight(gableWall, 1)).toBe(1)
    // Utenfor veggen gjelder enden.
    expect(profileHeight(gableWall, -1)).toBe(1)
    expect(profileHeight(gableWall, 2)).toBe(1)
  })

  it('en vannrett vegg har høyden sin overalt, og en vegg uten høyde ingen', () => {
    expect(profileHeight({ height: 2.4, profile: null }, 0.3)).toBe(2.4)
    expect(profileHeight({ height: null, profile: null }, 0.3)).toBeNull()
    expect(profileHeight({ height: 0 }, 0.3)).toBeNull()
  })

  it('gjennomsnittshøyden er flaten under overkanten', () => {
    // 1 m i endene og 3 m på midten: 2 m i snitt.
    expect(meanWallHeight(gableWall)).toBe(2)
    expect(meanWallHeight(cut.walls[1])).toBeCloseTo(0.9 + (((5 + 2) / 2) * 1.5) / 5, 10)
    expect(meanWallHeight({ height: 2.4 })).toBe(2.4)
    expect(meanWallHeight({ height: null })).toBeNull()
  })

  it('det laveste og det høyeste punktet, og rommets vannrette høyde', () => {
    expect(wallHeightRange(gable.walls)).toEqual({ min: 1, max: 3 })
    expect(wallHeightRange([{ height: null }])).toBeNull()
    // Kneveggene er vannrette: 1,0 m.
    expect(levelHeight(gable.walls)).toBe(1)
    // Bare skrå vegger: medianen av de høyeste punktene.
    expect(levelHeight([gable.walls[1], cut.walls[1]])).toBe(2.7)
    expect(levelHeight([{ height: null }])).toBeNull()
  })
})

describe('takflaten', () => {
  it('bygges i stykker som til sammen dekker gulvet', () => {
    const pieces = ceilingPieces(gable)
    const floor = ceilingTriangles(pieces).reduce(
      (sum, [a, b, c]) => sum + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2,
      0,
    )

    // To striper: fra den ene kneveggen til mønet, og fra mønet til den andre.
    expect(pieces).toHaveLength(2)
    expect(floor).toBeCloseTo(24, 10)
    expect(ceilingArea(pieces)).toBeCloseTo(12 * Math.sqrt(8), 10)
    expect(ceilingVolume(pieces)).toBeCloseTo(48, 10)
  })

  it('et rom uten skråtak, og et omriss uten flate, har ingen takflate', () => {
    expect(ceilingPieces({ outline: rectangle(4, 3), walls: around(rectangle(4, 3), [[2.4], [2.4], [2.4], [2.4]]) })).toEqual([])
    expect(ceilingPieces({ outline: [point(0, 0), point(4, 0)], walls: monoPitch.walls })).toEqual([])
  })

  it('høyden over et punkt i rommet følger taket', () => {
    // Møne langs x midt i rommet (y = 2): 1 m ved kneveggene, 3 m under mønet.
    expect(ceilingHeightAt(gable, point(3, 2))).toBeCloseTo(3, 10)
    expect(ceilingHeightAt(gable, point(1, 1))).toBeCloseTo(2, 10)
    expect(ceilingHeightAt(gable, point(5, 3.5))).toBeCloseTo(1.5, 10)
    // På omrisset: veggens egen høyde der.
    expect(ceilingHeightAt(gable, point(6, 2))).toBeCloseTo(3, 6)
    expect(ceilingHeightAt(gable, point(0, 0))).toBeCloseTo(1, 6)
    expect(ceilingHeightAt(gable, point(3, 4))).toBeCloseTo(1, 6)
    // Vinkelrommet: 1,0 m + 0,4 m per meter i y.
    expect(ceilingHeightAt(angle, point(4, 1))).toBeCloseTo(1.4, 10)
    expect(ceilingHeightAt(angle, point(1, 3))).toBeCloseTo(2.2, 10)
    // Uten skråtak finnes ingen takflate å lese av.
    expect(ceilingHeightAt({ outline: rectangle(4, 3), walls: around(rectangle(4, 3), [[2.4], [2.4], [2.4], [2.4]]) }, point(1, 1))).toBeNull()
  })

  it('overkanten på en ny vegg gjennom rommet følger taket langs veggen', () => {
    // På tvers av mønet: opp til 3 m på midten og ned igjen.
    expect(ceilingProfileAlong(gable, point(2, 0), point(2, 4))).toEqual(profile([0, 1], [0.5, 3], [1, 1]))
    // Langs mønet, 1 m fra kneveggen: 2 m hele veien.
    expect(ceilingProfileAlong(gable, point(0, 1), point(6, 1))).toEqual(profile([0, 2], [1, 2]))
    // Under himlingen i det kuttede rommet: knekk der skråtaket møter himlingen.
    expect(ceilingProfileAlong(cut, point(3, 0), point(3, 5))).toEqual(profile([0, 0.9], [0.3, 2.4], [0.7, 2.4], [1, 0.9]))
    // Baklengs er den samme overkanten speilvendt.
    expect(ceilingProfileAlong(monoPitch, point(1, 3), point(1, 0))).toEqual(profile([0, 2.4], [1, 1.2]))
    // På skrå gjennom rommet under ett fall: fortsatt en rett linje.
    expect(ceilingProfileAlong(monoPitch, point(0, 0), point(4, 3))).toEqual(profile([0, 1.2], [1, 2.4]))
    expect(ceilingProfileAlong(monoPitch, point(1, 1), point(1, 1))).toBeNull()
  })

  it('en overkant får ikke flere punkter enn den trenger, og aldri flere enn tolv', () => {
    // Punktet midt på den rette linja er overflødig.
    expect(simplifyProfile(profile([0, 1], [0.5, 2], [1, 3]))).toEqual(profile([0, 1], [1, 3]))
    expect(simplifyProfile(profile([0, 1], [0.5, 3], [1, 1]))).toEqual(profile([0, 1], [0.5, 3], [1, 1]))

    // Tjue knekker: de minste tas bort til tolv står igjen, og endene står alltid.
    const jagged = Array.from({ length: 21 }, (_, index) => ({ at: index / 20, height: 2 + (index % 2) * (0.1 + index / 100) }))
    const simplified = simplifyProfile(jagged)

    expect(simplified).toHaveLength(12)
    expect(simplified[0]).toEqual(jagged[0])
    expect(simplified[11]).toEqual(jagged[20])
  })
})
