import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FLOOR_PLAN_FURNITURE_CATEGORIES, FLOOR_PLAN_OBJECT_CATEGORIES } from '../../src/floor-plan/model'
import { OBJECT_DEFAULT_SIZES } from '../../src/floor-plan/floorPlanEditing'
import {
  FLOOR_PLAN_OBJECT_VARIANTS,
  furniturePlan,
  furnitureSolid,
  hasFurnitureSymbol,
  objectVariantsFor,
  toFloorPlanObjectVariant,
  type FurnitureShape,
} from '../../src/floor-plan/floorPlanFurniture'

// Inventarets symboler (SIGN-1987). Symbolene er data som ligger byte for
// byte her (delt av Sign og Sketch på nett, SIGN-2041) og i Sign-appen, og
// begge prøves mot de samme svarene:
//
// - `FURNITURE_SHA256` er fingeravtrykket av `floorPlanFurniture.json`. Det
//   samme tallet står i appens test (`FloorPlanFurnitureTests.swift`). Endres
//   fila her, MÅ den kopieres til appen
//   (`Sources/SignKit/Resources/FloorPlanFurniture.json`) og tallet
//   oppdateres begge steder.
// - `floorPlanFurnitureAnswers.json` er fasiten: formene hvert symbol blir
//   til for noen mål. Fila ligger også i appens tester, og Swift-koden skal
//   gi nøyaktig de samme tallene. Lag den på nytt med
//   `UPDATE_FURNITURE_ANSWERS=1 npx vitest run tests/floor-plan/floorPlanFurniture.test.ts`
//   og kopier den til appen.

const FURNITURE_SHA256 = '8760ae16f55dc014721caee143f6435a80adaa1e7f8f19026b587dc2b1dc726e'
const ANSWERS_SHA256 = '3cb5c04317eaf4786cf5707c5f08be1a9e71fdf541508986ab38970f335b9967'

const dataFile = resolve(process.cwd(), 'src/floor-plan/floorPlanFurniture.json')
const answersFile = resolve(process.cwd(), 'tests/floor-plan/support/floorPlanFurnitureAnswers.json')

const sha256 = (file: string): string => createHash('sha256').update(readFileSync(file)).digest('hex')

interface Answer {
  category: string
  variant: string | null
  width: number
  depth: number
  plan: FurnitureShape[]
}

/** Målene fasiten regnes for: hver type og utforming i standardstørrelsen, og noen uvanlige mål. */
const answerCases = (): Omit<Answer, 'plan'>[] => [
  // Møbler og utstyr: de bærende objektene (SIGN-2014) tegnes av kode og har ingen fasit i fila.
  ...FLOOR_PLAN_FURNITURE_CATEGORIES.flatMap((category) =>
    [null, ...objectVariantsFor(category)].map((variant) => ({ category, variant, ...OBJECT_DEFAULT_SIZES[category] })),
  ),
  // En lang sofa får flere puter, en lang trapp flere trinn, og en bred hylle flere fag.
  { category: 'sofa', variant: null, width: 3.1, depth: 0.95 },
  { category: 'stairs', variant: null, width: 0.9, depth: 3.4 },
  { category: 'storage', variant: 'shelf', width: 2.4, depth: 0.35 },
  // En smal seng og et avlangt, rundt bord.
  { category: 'bed', variant: 'single', width: 0.9, depth: 2 },
  { category: 'table', variant: 'round', width: 1.6, depth: 1.1 },
  // Så lite at meterne i dataene klemmes: delene bytter aldri side.
  { category: 'sofa', variant: 'armchair', width: 0.3, depth: 0.25 },
  { category: 'toilet', variant: null, width: 0.12, depth: 0.2 },
  // En type koden ikke kjenner, og en utforming typen ikke har.
  { category: 'jacuzzi', variant: null, width: 1.8, depth: 1.2 },
  { category: 'toilet', variant: 'round', width: 0.4, depth: 0.65 },
]

const answers = (): Answer[] => answerCases().map((entry) => ({ ...entry, plan: furniturePlan(entry) }))

describe('floorPlanFurniture: dataene', () => {
  it('fila er den samme som i Sign-appen (fingeravtrykket er likt i begge testene)', () => {
    expect(sha256(dataFile)).toBe(FURNITURE_SHA256)
  })

  it('hver type i kontrakten har sitt eget symbol', () => {
    for (const category of FLOOR_PLAN_FURNITURE_CATEGORIES) {
      expect(hasFurnitureSymbol(category), category).toBe(true)
    }

    expect(hasFurnitureSymbol('jacuzzi')).toBe(false)
  })

  it('utformingene er kontraktens, per type', () => {
    expect(FLOOR_PLAN_OBJECT_VARIANTS).toEqual({
      bed: ['single', 'double'],
      chair: ['dining', 'stool', 'office'],
      sofa: ['straight', 'armchair', 'chaise'],
      storage: ['cabinet', 'shelf'],
      table: ['rectangular', 'round', 'l_shaped'],
      // Søylen (SIGN-2014) er bærende og tegnes av kode; utformingene står ikke i datafila.
      column: ['square', 'round'],
    })
    expect(Object.keys(FLOOR_PLAN_OBJECT_VARIANTS).every((category) => (FLOOR_PLAN_OBJECT_CATEGORIES as readonly string[]).includes(category))).toBe(true)
    expect(objectVariantsFor('toilet')).toEqual([])
    expect(objectVariantsFor(null)).toEqual([])
  })

  it('en utforming gjelder bare for typen som har den', () => {
    expect(toFloorPlanObjectVariant('table', 'round')).toBe('round')
    expect(toFloorPlanObjectVariant('table', null)).toBeNull()
    expect(toFloorPlanObjectVariant('table', undefined)).toBeNull()
    // Et rundt toalett finnes ikke, og heller ikke en utforming ingen kjenner.
    expect(toFloorPlanObjectVariant('toilet', 'round')).toBeNull()
    expect(toFloorPlanObjectVariant('table', 'oval')).toBeNull()
    expect(toFloorPlanObjectVariant('jacuzzi', 'round')).toBeNull()
  })
})

describe('floorPlanFurniture: symbolet sett ovenfra', () => {
  it('gir de samme formene som Sign-appen (fasiten ligger i begge testene)', () => {
    if (process.env.UPDATE_FURNITURE_ANSWERS) {
      writeFileSync(answersFile, `${JSON.stringify(answers(), null, 1)}\n`)
    }

    expect(existsSync(answersFile)).toBe(true)
    expect(answers()).toEqual(JSON.parse(readFileSync(answersFile, 'utf8')))
    expect(sha256(answersFile)).toBe(ANSWERS_SHA256)
  })

  it('en type uten symbol er ett avrundet rektangel over hele flaten, som før', () => {
    expect(furniturePlan({ category: 'jacuzzi', width: 1.8, depth: 1.2 })).toEqual([
      { kind: 'rect', x: -0.9, y: -0.6, width: 1.8, height: 1.2, radius: 0.216, fill: 'body', stroke: 'outline' },
    ])
    // En utforming typen ikke har, gir typens eget symbol.
    expect(furniturePlan({ category: 'toilet', variant: 'round', width: 0.4, depth: 0.65 })).toEqual(furniturePlan({ category: 'toilet', width: 0.4, depth: 0.65 }))
  })

  it('symbolet har en bakside: sisternen, hodeenden og sofaryggen ligger ved −y', () => {
    // Toalettet: sisternen er rektangelet, helt bak; skåla når helt fram.
    const toilet = furniturePlan({ category: 'toilet', width: 0.4, depth: 0.65 })
    const cistern = toilet.find((shape) => shape.kind === 'rect')
    const bowl = toilet.find((shape) => shape.kind === 'ellipse')

    expect(cistern).toMatchObject({ y: -0.325, height: 0.19 })
    expect(bowl?.kind === 'ellipse' ? bowl.cy + bowl.ry : null).toBeCloseTo(0.325, 4)

    // Senga: puta ligger i den bakre halvdelen, dyna i den fremre.
    const bed = furniturePlan({ category: 'bed', width: 1.6, depth: 2 }).filter((shape) => shape.kind === 'rect')
    expect(bed[1].y + bed[1].height).toBeLessThan(0)
    expect(bed[2].y + bed[2].height).toBeCloseTo(1 - 0.012, 4)

    // Sofaen: ryggen er den bakerste stripa, 20 cm dyp.
    const back = furniturePlan({ category: 'sofa', width: 2, depth: 0.9 })
      .filter((shape) => shape.kind === 'rect')
      .at(-1)
    expect(back).toMatchObject({ x: -1, y: -0.45, width: 2, height: 0.2 })
  })

  it('mål i meter står stille når inventaret blir større; andeler følger med', () => {
    const armWidth = (width: number): number => {
      const arm = furniturePlan({ category: 'sofa', width, depth: 0.9 }).filter((shape) => shape.kind === 'rect')[1]

      return arm.width
    }

    // Armlenet er 17 cm enten sofaen er 1,4 eller 3 m.
    expect(armWidth(1.4)).toBe(0.17)
    expect(armWidth(3)).toBe(0.17)
    // På en bitte liten sofa klemmes det til 45 % av bredden, så de to armlenene aldri møtes.
    expect(armWidth(0.3)).toBe(0.135)
  })

  it('en lang sofa får flere puter og en lang trapp flere trinn — av lengden, ikke av typen', () => {
    const dividers = (width: number): number => furniturePlan({ category: 'sofa', width, depth: 0.9 }).filter((shape) => shape.kind === 'path').length
    const treads = (depth: number): number =>
      furniturePlan({ category: 'stairs', width: 1, depth }).filter((shape) => shape.kind === 'path' && shape.stroke === 'detail').length

    // Én pute per 75 cm sete: 1,4 m → 1 (ingen skille), 2 m → 2, 3,1 m → 4, og aldri flere enn 5.
    expect([dividers(1.4), dividers(2), dividers(3.1), dividers(9)]).toEqual([0, 1, 3, 4])
    // Ett trinn per 25 cm: minst 3 og høyst 24.
    expect([treads(0.3), treads(2.5), treads(3.4), treads(20)]).toEqual([2, 9, 13, 23])
  })

  it('alle former ligger innenfor inventarets flate, for hver type og utforming og flere mål', () => {
    const sizes = [
      { width: 0.6, depth: 0.6 },
      { width: 2.4, depth: 0.5 },
      { width: 0.35, depth: 1.9 },
      { width: 0.08, depth: 0.08 },
    ]

    for (const category of FLOOR_PLAN_FURNITURE_CATEGORIES) {
      for (const variant of [null, ...objectVariantsFor(category)]) {
        for (const size of sizes) {
          const name = `${category}${variant === null ? '' : `:${variant}`} ${size.width}×${size.depth}`
          const shapes = furniturePlan({ category, variant, ...size })
          const xs: number[] = []
          const ys: number[] = []

          expect(shapes.length, name).toBeGreaterThan(0)
          // Den første formen med omriss er silhuetten: den finnes alltid, så symbolet leses også i miniatyr.
          expect(shapes.some((shape) => shape.stroke === 'outline'), name).toBe(true)

          for (const shape of shapes) {
            if (shape.kind === 'rect') {
              expect(shape.width, name).toBeGreaterThanOrEqual(0)
              expect(shape.height, name).toBeGreaterThanOrEqual(0)
              expect(shape.radius, name).toBeLessThanOrEqual(Math.min(shape.width, shape.height) / 2 + 1e-4)
              xs.push(shape.x, shape.x + shape.width)
              ys.push(shape.y, shape.y + shape.height)
            } else if (shape.kind === 'ellipse') {
              xs.push(shape.cx - shape.rx, shape.cx + shape.rx)
              ys.push(shape.cy - shape.ry, shape.cy + shape.ry)
            } else {
              xs.push(...shape.points.map((point) => point.x))
              ys.push(...shape.points.map((point) => point.y))
            }
          }

          expect([...xs, ...ys].every(Number.isFinite), name).toBe(true)
          expect(Math.min(...xs), name).toBeGreaterThanOrEqual(-size.width / 2 - 1e-4)
          expect(Math.max(...xs), name).toBeLessThanOrEqual(size.width / 2 + 1e-4)
          expect(Math.min(...ys), name).toBeGreaterThanOrEqual(-size.depth / 2 - 1e-4)
          expect(Math.max(...ys), name).toBeLessThanOrEqual(size.depth / 2 + 1e-4)
          // Symbolet fyller flaten: det når (så godt som) ut til alle fire kantene.
          expect(Math.max(...xs) - Math.min(...xs), name).toBeGreaterThanOrEqual(size.width * 0.9)
          expect(Math.max(...ys) - Math.min(...ys), name).toBeGreaterThanOrEqual(size.depth * 0.9)
        }
      }
    }
  })

  it('et inventar uten bredde eller dybde har ingen former', () => {
    expect(furniturePlan({ category: 'toilet', width: 0, depth: 0.6 })).toEqual([])
    expect(furniturePlan({ category: 'toilet', width: 0.4, depth: Number.NaN })).toEqual([])
  })
})

describe('floorPlanFurniture: 3D-formen', () => {
  it('en type uten form er én boks, fra undersiden til høyden', () => {
    expect(furnitureSolid({ category: 'jacuzzi', width: 1.8, depth: 1.2 }, 0.8)).toEqual([
      { kind: 'box', min: [-0.9, 0, -0.6], max: [0.9, 0.8, 0.6], axis: 'y', sides: 4, tone: 'base' },
    ])
  })

  it('et bord er en plate på fire bein, og platen er 4 cm uansett høyde', () => {
    const table = furnitureSolid({ category: 'table', width: 1.2, depth: 0.8 }, 0.75)

    expect(table).toHaveLength(5)
    expect(table[0]).toMatchObject({ kind: 'box', min: [-0.6, 0.71, -0.4], max: [0.6, 0.75, 0.4], tone: 'soft' })
    // Beina er 6 × 6 cm, 4 cm inn fra kantene, fra gulvet til platen.
    expect(table[1]).toMatchObject({ kind: 'box', min: [-0.56, 0, -0.36], max: [-0.5, 0.71, -0.3], tone: 'base' })
    expect(furnitureSolid({ category: 'table', width: 1.2, depth: 0.8 }, 1.1)[0].min[1]).toBe(1.06)
  })

  it('et rundt bord har rund plate, og en vaskemaskin en luke som vender fram', () => {
    const round = furnitureSolid({ category: 'table', variant: 'round', width: 1, depth: 1 }, 0.75)
    expect(round[0]).toMatchObject({ kind: 'cylinder', axis: 'y', sides: 24, min: [-0.5, 0.71, -0.5], max: [0.5, 0.75, 0.5] })

    const washer = furnitureSolid({ category: 'washer_dryer', width: 0.6, depth: 0.6 }, 0.85)
    const door = washer.find((part) => part.kind === 'cylinder')
    expect(door).toMatchObject({ axis: 'z', tone: 'strong' })
    // Luka sitter på forsiden (+z) og stikker 2 cm fram.
    expect(door?.min[2]).toBe(0.3)
    expect(door?.max[2]).toBe(0.32)
  })

  it('en trapp er trinn som stiger fra forsiden til baksiden', () => {
    const steps = furnitureSolid({ category: 'stairs', width: 1, depth: 2.5 }, 2.4)

    // Ett trinn per 25 cm: ti trinn, hvert en blokk fra gulvet.
    expect(steps).toHaveLength(10)
    expect(steps[0]).toMatchObject({ min: [-0.5, 0, 1], max: [0.5, 0.24, 1.25] })
    expect(steps[9]).toMatchObject({ min: [-0.5, 0, -1.25], max: [0.5, 2.4, -1] })
  })

  it('uten høyde finnes ingen form', () => {
    expect(furnitureSolid({ category: 'toilet', width: 0.4, depth: 0.65 }, 0)).toEqual([])
    expect(furnitureSolid({ category: 'toilet', width: 0, depth: 0.65 }, 0.78)).toEqual([])
  })
})
