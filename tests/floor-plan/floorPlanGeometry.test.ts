import { describe, expect, it } from 'vitest'
import {
  distanceToSegment,
  doorSwing,
  isInside,
  isSharedWall,
  normalToward,
  polygonArea,
  readableAngle,
  roomCenter,
  roomMeasurements,
  roundMeasurement,
} from '../../src/floor-plan/floorPlanGeometry'

// Geometrien bak plantegningen (SIGN-794), i planens egne tall: meter, x mot
// høyre, y nedover.

describe('floorPlanGeometry (SIGN-794)', () => {
  it('midten av et rektangulært rom er tyngdepunktet', () => {
    const center = roomCenter([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 0, y: 2 },
    ])

    expect(center).toEqual({ x: 2, y: 1 })
  })

  it('midten av et vinkelrom ligger alltid på gulvet', () => {
    // En smal L: tyngdepunktet faller i hjørnet utenfor gulvet.
    const outline = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 6 },
      { x: 0, y: 6 },
    ]
    const center = roomCenter(outline)

    expect(center).not.toBeNull()
    expect(isInside(center!, outline)).toBe(true)
  })

  it('et rom uten punkter har ingen midte', () => {
    expect(roomCenter([])).toBeNull()
  })

  it('normalen peker mot rommet, eller bort fra det', () => {
    const start = { x: 0, y: 0 }
    const end = { x: 4, y: 0 }
    const middle = { x: 2, y: 1 }

    expect(normalToward(start, end, middle)).toEqual({ x: -0, y: 1 })
    expect(normalToward(start, end, middle, true)).toEqual({ x: 0, y: -1 })
    expect(normalToward(start, start, middle)).toBeNull()
  })

  it('dørbladet står inn i rommet, like langt som åpningen er bred, og buen ender i åpningens andre side', () => {
    const swing = doorSwing({ x: 4.2, y: 0.9 }, { x: 4.2, y: 1.7 }, { x: 5.4, y: 1.3 })

    expect(swing).not.toBeNull()
    expect(swing!.leaf.from).toEqual({ x: 4.2, y: 0.9 })
    expect(swing!.leaf.to).toEqual({ x: 5, y: 0.9 })
    // Fra bladets ende, med urviseren (y vokser nedover), til åpningens andre side.
    expect(swing!.arc).toBe('M 5 0.9 A 0.8 0.8 0 0 1 4.2 1.7')
  })

  it('døra slår inn i rommet den hører til, uansett hvilken vei åpningen er tegnet', () => {
    const outline = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
      { x: 0, y: 3 },
    ]
    const middle = roomCenter(outline)

    // En dør i hver av de fire veggene, tegnet begge veier.
    const doors = [
      [{ x: 1, y: 0 }, { x: 1.9, y: 0 }],
      [{ x: 1.9, y: 0 }, { x: 1, y: 0 }],
      [{ x: 4, y: 1 }, { x: 4, y: 1.9 }],
      [{ x: 1, y: 3 }, { x: 1.9, y: 3 }],
      [{ x: 0, y: 1.9 }, { x: 0, y: 1 }],
    ]

    for (const [start, end] of doors) {
      const swing = doorSwing(start, end, middle)

      expect(isInside(swing!.leaf.to, outline), JSON.stringify(start)).toBe(true)
    }
  })

  it('en vegg er delt når et annet rom ligger 0,3 m utenfor midten av den', () => {
    const room = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]
    const neighbour = [
      { x: 2, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 2 },
      { x: 2, y: 2 },
    ]
    const middle = roomCenter(room)

    // Østveggen vender mot naborommet; de tre andre vender ut.
    expect(isSharedWall({ x: 2, y: 0 }, { x: 2, y: 2 }, middle, [neighbour])).toBe(true)
    expect(isSharedWall({ x: 2, y: 2 }, { x: 2, y: 0 }, middle, [neighbour])).toBe(true)
    expect(isSharedWall({ x: 0, y: 0 }, { x: 2, y: 0 }, middle, [neighbour])).toBe(false)
    expect(isSharedWall({ x: 0, y: 2 }, { x: 0, y: 0 }, middle, [neighbour])).toBe(false)
    // Rommet alene har bare yttervegger.
    expect(isSharedWall({ x: 2, y: 0 }, { x: 2, y: 2 }, middle, [])).toBe(false)
    // Et rom som ligger lenger unna enn 0,3 m deler ikke veggen.
    const apart = neighbour.map((point) => ({ x: point.x + 0.5, y: point.y }))
    expect(isSharedWall({ x: 2, y: 0 }, { x: 2, y: 2 }, middle, [apart])).toBe(false)
  })

  it('tekst langs en linje står aldri opp ned', () => {
    expect(readableAngle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0)
    expect(readableAngle({ x: 1, y: 0 }, { x: 0, y: 0 })).toBe(0)
    expect(readableAngle({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45, 5)
    expect(readableAngle({ x: 1, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(45, 5)
    expect(readableAngle({ x: 0, y: 1 }, { x: 1, y: 0 })).toBeCloseTo(-45, 5)

    // Hele sirkelen rundt: aldri utenfor [−90°, 90°).
    for (let degrees = 0; degrees < 360; degrees += 7) {
      const radians = (degrees * Math.PI) / 180
      const angle = readableAngle({ x: 0, y: 0 }, { x: Math.cos(radians), y: Math.sin(radians) })

      expect(angle, `${degrees}°`).toBeGreaterThanOrEqual(-90.5)
      expect(angle, `${degrees}°`).toBeLessThan(90)
    }
  })

  it('tekst langs en loddrett linje leses nedenfra og opp, uansett hvilken vei linjen er tegnet', () => {
    expect(readableAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(-90)
    expect(readableAngle({ x: 0, y: 1 }, { x: 0, y: 0 })).toBe(-90)
    // Så godt som loddrett (skanningen er aldri helt rett) leses samme vei.
    expect(readableAngle({ x: 0, y: 0 }, { x: 0.002, y: 1 })).toBeCloseTo(-90, 0)
    expect(readableAngle({ x: 0, y: 1 }, { x: 0.002, y: 0 })).toBeCloseTo(-90, 0)
  })

  it('runder et mål til to desimaler med serverens formel: floor(v × 100 + 0,5) / 100', () => {
    expect(roundMeasurement(14.976)).toBe(14.98)
    expect(roundMeasurement(6.244)).toBe(6.24)
    expect(roundMeasurement(0.125)).toBe(0.13)
    expect(roundMeasurement(10)).toBe(10)
    expect(roundMeasurement(0.004)).toBe(0)
    // Samme svar som serveren også der flyttallet ligger rett under halvveis (1,005 er lagret som 1,00499…).
    expect(roundMeasurement(1.005)).toBe(Math.floor(1.005 * 100 + 0.5) / 100)
  })

  it('måler avstanden fra et punkt til et linjestykke', () => {
    expect(distanceToSegment({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual({ distance: 1, share: 0.5 })
    // Utenfor enden: avstanden til endepunktet.
    expect(distanceToSegment({ x: 3, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual({ distance: 1, share: 1 })
    expect(distanceToSegment({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }).distance).toBe(1)
  })

  it('regner flaten av et omriss uansett hvilken vei det er tegnet', () => {
    const outline = [
      { x: 0, y: 0 },
      { x: 2.4, y: 0 },
      { x: 2.4, y: 2.6 },
      { x: 0, y: 2.6 },
    ]

    expect(polygonArea(outline)).toBeCloseTo(6.24, 9)
    expect(polygonArea([...outline].reverse())).toBeCloseTo(6.24, 9)
  })
})

// Målene regnes av serveren ved hver lagring (SIGN-1980); her regnes de samme
// tallene bare for å vise dem mens man redigerer. Fasiten under er den alle
// implementasjonene (cases, Swift, TypeScript) tester.
describe('roomMeasurements (SIGN-1980)', () => {
  const wall = (start: [number, number], end: [number, number], height: number | null = 2.4) => ({
    start: { x: start[0], y: start[1] },
    end: { x: end[0], y: end[1] },
    height,
  })
  const opening = (start: [number, number], end: [number, number], height: number | null) => ({
    start: { x: start[0], y: start[1] },
    end: { x: end[0], y: end[1] },
    height,
  })
  const outline = [
    { x: 0, y: 0 },
    { x: 2.4, y: 0 },
    { x: 2.4, y: 2.6 },
    { x: 0, y: 2.6 },
  ]
  const walls = [wall([0, 0], [2.4, 0]), wall([2.4, 0], [2.4, 2.6]), wall([2.4, 2.6], [0, 2.6]), wall([0, 2.6], [0, 0])]

  it('kjent svar: et rom 2,4 × 2,6 m, fire vegger 2,4 m høye, to dører 0,8 × 2,0 m og ett vindu 1,0 × 1,2 m', () => {
    const openings = [opening([0.8, 0], [1.6, 0], 2), opening([2.4, 0.9], [2.4, 1.7], 2), opening([0.7, 2.6], [1.7, 2.6], 1.2)]

    expect(roomMeasurements({ outline, walls, openings })).toEqual({
      floorArea: 6.24,
      ceilingArea: 6.24,
      perimeter: 10,
      ceilingHeight: 2.4,
      ceilingHeightMin: null,
      wallAreaGross: 24,
      wallArea: 19.6,
      volume: 14.98,
    })
  })

  it('et mål som ikke kan regnes er null, aldri 0', () => {
    // Ingen vegghøyder: ingen takhøyde, ikke noe volum og ingen veggflater.
    const unmeasured = roomMeasurements({ outline, walls: walls.map((candidate) => ({ ...candidate, height: null })), openings: [] })
    expect(unmeasured).toEqual({
      floorArea: 6.24,
      ceilingArea: 6.24,
      perimeter: 10,
      ceilingHeight: null,
      ceilingHeightMin: null,
      wallAreaGross: null,
      wallArea: null,
      volume: null,
    })

    // Færre enn tre punkter, eller et omriss uten flate.
    expect(roomMeasurements({ outline: outline.slice(0, 2), walls: [], openings: [] }).floorArea).toBeNull()
    expect(roomMeasurements({ outline: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], walls: [], openings: [] })).toMatchObject({
      floorArea: null,
      ceilingArea: null,
      volume: null,
    })
    expect(roomMeasurements({ outline: [], walls: [], openings: [] }).perimeter).toBeNull()

    // Et gulv som rundes til 0,00 m² finnes ikke: 0,05 × 0,05 m = 0,0025 m².
    const tiny = [
      { x: 0, y: 0 },
      { x: 0.05, y: 0 },
      { x: 0.05, y: 0.05 },
      { x: 0, y: 0.05 },
    ]
    expect(roomMeasurements({ outline: tiny, walls: [wall([0, 0], [0.05, 0])], openings: [] })).toMatchObject({
      floorArea: null,
      ceilingArea: null,
      volume: null,
    })
    // 0,1 × 0,1 m = 0,01 m² er et gulv.
    const small = tiny.map((point) => ({ x: point.x * 2, y: point.y * 2 }))
    expect(roomMeasurements({ outline: small, walls: [], openings: [] }).floorArea).toBe(0.01)
  })

  it('omkretsen er summen av vegglengdene, eller omrissets omkrets når rommet ikke har vegger', () => {
    expect(roomMeasurements({ outline, walls: [], openings: [] }).perimeter).toBe(10)
    // Tre vegger (en åpen side): bare veggene telles.
    expect(roomMeasurements({ outline, walls: walls.slice(0, 3), openings: [] }).perimeter).toBe(7.4)
    // Vegger uten lengde teller ikke som vegger.
    expect(roomMeasurements({ outline, walls: [wall([1, 1], [1, 1])], openings: [] }).perimeter).toBe(10)
  })

  it('takhøyden er medianen av veggenes positive høyder', () => {
    const heights = (values: Array<number | null>) =>
      roomMeasurements({ outline, walls: walls.map((candidate, index) => ({ ...candidate, height: values[index] })), openings: [] }).ceilingHeight

    expect(heights([2.4, 2.4, 2.6, 3])).toBe(2.5)
    expect(heights([2.4, 2.5, 3, null])).toBe(2.5)
    expect(heights([2.4, 0, null, 2.8])).toBe(2.6)
    expect(heights([null, null, null, 2.7])).toBe(2.7)
  })

  it('volumet regnes av urundede tall', () => {
    // 2,45 × 2,45 = 6,0025 m², høyde 2,45 m: 14,706125 → 14,71 (ikke 6,00 × 2,45 = 14,70).
    const square = [
      { x: 0, y: 0 },
      { x: 2.45, y: 0 },
      { x: 2.45, y: 2.45 },
      { x: 0, y: 2.45 },
    ]
    const measurements = roomMeasurements({
      outline: square,
      walls: [wall([0, 0], [2.45, 0], 2.45), wall([2.45, 0], [2.45, 2.45], 2.45), wall([2.45, 2.45], [0, 2.45], 2.45), wall([0, 2.45], [0, 0], 2.45)],
      openings: [],
    })

    expect(measurements.floorArea).toBe(6)
    expect(measurements.volume).toBe(14.71)
  })

  it('veggflaten trekker fra alle åpningene med høyde, og blir aldri negativ', () => {
    // En åpning uten høyde trekker ingenting.
    expect(roomMeasurements({ outline, walls, openings: [opening([0.8, 0], [1.6, 0], null)] }).wallArea).toBe(24)
    expect(roomMeasurements({ outline, walls, openings: [opening([0.8, 0], [1.6, 0], -1)] }).wallArea).toBe(24)
    // Bare vegger med høyde teller i bruttoflaten: 2,4 × 2,4 = 5,76.
    const oneWall = [wall([0, 0], [2.4, 0], 2.4), ...walls.slice(1).map((candidate) => ({ ...candidate, height: null }))]
    expect(roomMeasurements({ outline, walls: oneWall, openings: [] }).wallAreaGross).toBe(5.76)
    // Åpninger større enn veggene gir 0, ikke et negativt tall.
    expect(roomMeasurements({ outline, walls: oneWall, openings: [opening([0, 0], [2.4, 0], 30)] }).wallArea).toBe(0)
  })
})
