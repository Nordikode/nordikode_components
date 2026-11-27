import { describe, expect, it } from 'vitest'
import {
  countOpenings,
  floorPlanBounds,
  measured,
  toFloorPlanOpeningKind,
  totalFloorArea,
} from '../../src/floor-plan/model'
import { bathroom, floorPlan, hall, kitchen } from './support/floorPlanFixture'

// Plantegningene (SIGN-794): hva noe er leses fra typefeltet, og et mål som
// ikke er målt er null — aldri 0.

describe('floorPlans (SIGN-794)', () => {
  it('teller dører og vinduer på typefeltet, aldri på navn', () => {
    expect(countOpenings(bathroom(), 'door')).toBe(1)
    expect(countOpenings(bathroom(), 'window')).toBe(1)
    expect(countOpenings(hall(), 'window')).toBe(0)
    expect(countOpenings(hall(), 'opening')).toBe(1)
  })

  it('kjenner bare typene koden eier — resten er ukjent, ikke gjettet', () => {
    expect(toFloorPlanOpeningKind('door')).toBe('door')
    expect(toFloorPlanOpeningKind('Dør')).toBeNull()
    expect(toFloorPlanOpeningKind('skylight')).toBeNull()
  })

  it('summerer gulvarealet når alle rom har det', () => {
    expect(totalFloorArea(floorPlan())).toBeCloseTo(25.2, 5)
  })

  it('gir ingen sum når ett rom mangler gulvarealet, eller planen ikke har rom', () => {
    const partly = floorPlan({
      rooms: [kitchen(), bathroom({ measurements: { ...bathroom().measurements, floorArea: null } })],
    })

    expect(totalFloorArea(partly)).toBeNull()
    expect(totalFloorArea({ rooms: [] })).toBeNull()
  })

  it('et mål som mangler er null, og 0 er et mål', () => {
    expect(measured(null)).toBeNull()
    expect(measured(undefined)).toBeNull()
    expect(measured(Number.NaN)).toBeNull()
    expect(measured(0)).toBe(0)
    expect(measured(2.4)).toBe(2.4)
  })

  it('rammen dekker gulv, vegger og åpninger i alle rom', () => {
    expect(floorPlanBounds(floorPlan())).toEqual({ minX: 0, minY: 0, maxX: 6, maxY: 4.2 })
    expect(floorPlanBounds({ rooms: [] })).toBeNull()
  })
})
