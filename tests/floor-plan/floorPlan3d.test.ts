import { describe, expect, it } from 'vitest'
import type { FloorPlanRoom } from '../../src/floor-plan/model'
import { FLOOR_PLAN_OBJECT_CATEGORIES } from '../../src/floor-plan/model'
import {
  CAMERA_FOV,
  CEILING_BAND_HEIGHT,
  DEFAULT_3D_TONES,
  OBJECT_DEFAULT_HEIGHTS,
  DOOR_LEAF_THICKNESS,
  PANE_OPACITY,
  ROOF_OPACITY,
  WALL_THICKNESS,
  buildFloorPlan3d,
  fallbackWallHeight,
  fitCamera,
  hexToRgb,
  mixHex,
  objectElevation,
  objectHeight,
  triangulatePolygon,
  wallHoles,
  type FloorPlan3dMesh,
  type Vec3,
} from '../../src/floor-plan/floorPlan3d'
import { objectVariantsFor } from '../../src/floor-plan/floorPlanFurniture'
import { isInside } from '../../src/floor-plan/floorPlanGeometry'
import { bathroom, floorPlan, hall, kitchen } from './support/floorPlanFixture'

// 3D-visningen av en plantegning (SIGN-1981) som rene tall: gulv, vegger med
// hull, vindusruter, inventar og takbånd. Reglene er kontraktens (kapittel
// 2), de samme som i Sign-appen. Planens x er x, planens y er z, høyden er y.

const point = (mesh: FloorPlan3dMesh, index: number): Vec3 => [mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]]

const triangles = (mesh: FloorPlan3dMesh): [Vec3, Vec3, Vec3][] => {
  const result: [Vec3, Vec3, Vec3][] = []

  for (let index = 0; index < mesh.indices.length; index += 3) {
    result.push([point(mesh, mesh.indices[index]), point(mesh, mesh.indices[index + 1]), point(mesh, mesh.indices[index + 2])])
  }

  return result
}

const normal = ([a, b, c]: [Vec3, Vec3, Vec3]): Vec3 => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]

  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
}

const area = (triangle: [Vec3, Vec3, Vec3]): number => Math.hypot(...normal(triangle)) / 2

/**
 * Rommet en flate omslutter, regnet av forsidene (divergensteoremet langs
 * y). Stemmer bare når hver flate vender ut — en flate som vender feil vei
 * trekker fra. Undersiden mot gulvet (y = 0) teller null, så den kan mangle.
 */
const volume = (mesh: FloorPlan3dMesh): number =>
  triangles(mesh).reduce((sum, triangle) => sum + (normal(triangle)[1] / 2) * ((triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3), 0)

const extent = (mesh: FloorPlan3dMesh, axis: 0 | 1 | 2): [number, number] => {
  const values = mesh.positions.filter((_, index) => index % 3 === axis)

  return [Math.min(...values), Math.max(...values)]
}

const rgb = (hex: string) => hexToRgb(hex)!

/** Dekker en av flatens trekanter i planet `axis = value` punktet (a, b) i de to andre aksene? */
const covers = (mesh: FloorPlan3dMesh, axis: 0 | 2, value: number, at: [number, number]): boolean => {
  const other = axis === 0 ? 2 : 0

  return triangles(mesh).some((triangle) => {
    if (!triangle.every((corner) => Math.abs(corner[axis] - value) < 1e-6)) {
      return false
    }

    const [a, b, c] = triangle.map((corner) => ({ x: corner[other], y: corner[1] }))
    const side = (p: { x: number; y: number }, q: { x: number; y: number }): number => (q.x - p.x) * (at[1] - p.y) - (q.y - p.y) * (at[0] - p.x)
    const signs = [side(a, b), side(b, c), side(c, a)]

    return signs.every((sign) => sign >= -1e-9) || signs.every((sign) => sign <= 1e-9)
  })
}

const meshesOf = (room: FloorPlanRoom, kind: FloorPlan3dMesh['kind']): FloorPlan3dMesh[] => buildFloorPlan3d({ rooms: [room] }).meshes.filter((mesh) => mesh.kind === kind)
const wallMesh = (room: FloorPlanRoom, id: string): FloorPlan3dMesh => meshesOf(room, 'wall').find((mesh) => mesh.id === id)!

describe('floorPlan3d: gulv', () => {
  it('deler et rektangel i to trekanter med riktig flate', () => {
    const outline = bathroom().outline
    const indices = triangulatePolygon(outline)

    expect(indices).toHaveLength(6)
    expect([...new Set(indices)].sort()).toEqual([0, 1, 2, 3])

    const floor = meshesOf(bathroom(), 'floor')[0]
    expect(triangles(floor).reduce((sum, triangle) => sum + area(triangle), 0)).toBeCloseTo(2.4 * 2.6, 9)
  })

  it('gulvet ligger i y = 0 med forsiden opp, i planens tall (x er x, planens y er z)', () => {
    const floor = meshesOf(kitchen(), 'floor')[0]

    expect(extent(floor, 0)).toEqual([2.4, 6])
    expect(extent(floor, 1)).toEqual([0, 0])
    expect(extent(floor, 2)).toEqual([0, 2.6])

    for (const triangle of triangles(floor)) {
      expect(normal(triangle)[1]).toBeGreaterThan(0)
    }
  })

  it('deler et rom med innhukk (L-form) uten å dekke innhukket', () => {
    // 4 × 3 m med et hjørne på 2 × 1 m skåret ut: 12 − 2 = 10 m².
    const outline = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 0, y: 3 },
    ]
    const floor = meshesOf({ ...bathroom(), outline, walls: [], openings: [], objects: [] }, 'floor')[0]
    const parts = triangles(floor)

    expect(parts).toHaveLength(4)
    expect(parts.reduce((sum, triangle) => sum + area(triangle), 0)).toBeCloseTo(10, 9)

    for (const triangle of parts) {
      expect(normal(triangle)[1]).toBeGreaterThan(0)
      // Hver trekant ligger på gulvet — midten av den er inne i omrisset.
      expect(isInside({ x: (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3, y: (triangle[0][2] + triangle[1][2] + triangle[2][2]) / 3 }, outline)).toBe(true)
    }
  })

  it('tåler et omriss tegnet andre veien, og punkter på linje', () => {
    const reversed = [...bathroom().outline].reverse()
    const withMidpoint = [{ x: 0, y: 0 }, { x: 1.2, y: 0 }, { x: 2.4, y: 0 }, { x: 2.4, y: 2.6 }, { x: 0, y: 2.6 }]

    for (const outline of [reversed, withMidpoint]) {
      const floor = meshesOf({ ...bathroom(), outline }, 'floor')[0]

      expect(triangles(floor).reduce((sum, triangle) => sum + area(triangle), 0)).toBeCloseTo(6.24, 9)
      expect(triangles(floor).every((triangle) => normal(triangle)[1] > 0)).toBe(true)
    }
  })

  it('et omriss uten flate gir ikke noe gulv', () => {
    expect(triangulatePolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toEqual([])
    expect(triangulatePolygon([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }])).toEqual([])
    expect(meshesOf({ ...bathroom(), outline: [] }, 'floor')).toEqual([])
  })
})

describe('floorPlan3d: vegger', () => {
  it('en vegg er en stående skive, 0,1 m tykk, fra gulvet til veggens høyde', () => {
    const room = { ...bathroom(), openings: [] }
    const north = wallMesh(room, 'bad-n')

    // Nordveggen går langs x fra 0 til 2,4 i z = 0, og er 2,4 m høy.
    expect(extent(north, 1)).toEqual([0, 2.4])
    const [zMin, zMax] = extent(north, 2)
    expect(zMax - zMin).toBeCloseTo(WALL_THICKNESS, 9)
    // En yttervegg står midt på vegglinja.
    expect((zMin + zMax) / 2).toBeCloseTo(0, 9)
    // Nesten en halv veggtykkelse forbi hver ende, så hjørnene fylles.
    const [xMin, xMax] = extent(north, 0)
    expect(xMin).toBeCloseTo(-0.046, 9)
    expect(xMax).toBeCloseTo(2.446, 9)
  })

  it('hver flate på skiven vender ut', () => {
    const room = { ...bathroom(), openings: [] }

    for (const wall of meshesOf(room, 'wall')) {
      const [xMin, xMax] = extent(wall, 0)
      const [zMin, zMax] = extent(wall, 2)

      const [, top] = extent(wall, 1)

      // Rommet skiven omslutter er lengde × tykkelse × høyde — bare når alle flatene vender ut.
      expect(volume(wall), wall.id ?? '').toBeCloseTo((xMax - xMin) * (zMax - zMin) * top, 6)
    }
  })

  it('hver vegg er sin egen millimeter lavere, så toppene i et hjørne aldri ligger i samme plan', () => {
    const walls = meshesOf({ ...bathroom(), openings: [] }, 'wall')
    const tops = walls.map((wall) => extent(wall, 1)[1])

    // Null til sju millimeter: for lite til å se, nok til at én topp alltid ligger øverst.
    expect(new Set(tops.map((top) => Math.round(top * 10000))).size).toBe(walls.length)
    expect(Math.max(...tops)).toBe(2.4)
    expect(Math.min(...tops)).toBeGreaterThan(2.39)

    for (const wall of walls) {
      const thickness = Math.min(extent(wall, 0)[1] - extent(wall, 0)[0], extent(wall, 2)[1] - extent(wall, 2)[0])

      expect(thickness).toBeCloseTo(WALL_THICKNESS, 9)
    }
  })

  it('en vegg uten høyde får medianen av rommets vegghøyder, ellers 2,4 m', () => {
    const room = bathroom({ openings: [] })
    room.walls = [
      { ...room.walls[0], height: null },
      { ...room.walls[1], height: 2.2 },
      { ...room.walls[2], height: 2.6 },
      { ...room.walls[3], height: 3 },
    ]

    expect(fallbackWallHeight(room)).toBe(2.6)
    expect(extent(wallMesh(room, 'bad-n'), 1)[1]).toBeCloseTo(2.6, 2)
    expect(extent(wallMesh(room, 'bad-e'), 1)[1]).toBeCloseTo(2.2, 2)

    const unmeasured = bathroom({ openings: [] })
    unmeasured.walls = unmeasured.walls.map((wall) => ({ ...wall, height: null }))
    expect(fallbackWallHeight(unmeasured)).toBe(2.4)
    expect(extent(wallMesh(unmeasured, 'bad-n'), 1)[1]).toBeCloseTo(2.4, 2)
  })

  it('en vegg tegnes i sin egen farge, ellers rommets veggfarge, ellers tonen uten valg', () => {
    const room = bathroom({ wallColor: '#f4f1ea' })
    room.walls[0] = { ...room.walls[0], color: '#9fb1c1' }

    expect(wallMesh(room, 'bad-n').color).toEqual(rgb('#9fb1c1'))
    expect(wallMesh(room, 'bad-e').color).toEqual(rgb('#f4f1ea'))
    expect(wallMesh(bathroom(), 'bad-n').color).toEqual(rgb(DEFAULT_3D_TONES.wall))

    const themed = buildFloorPlan3d({ rooms: [bathroom()] }, { ...DEFAULT_3D_TONES, wall: '#112233' })
    expect(themed.meshes.find((mesh) => mesh.kind === 'wall')?.color).toEqual(rgb('#112233'))
  })

  it('en vegg uten lengde tegnes ikke', () => {
    const room = bathroom({ openings: [] })
    room.walls = [...room.walls, { id: 'null', start: { x: 1, y: 1 }, end: { x: 1, y: 1 }, height: 2.4, color: null }]

    expect(meshesOf(room, 'wall').map((mesh) => mesh.id)).toEqual(['bad-n', 'bad-e', 'bad-s', 'bad-w'])
  })
})

describe('floorPlan3d: åpninger', () => {
  it('finner hullene i veggen åpningen står på, med brystning og høyde', () => {
    const room = bathroom()
    const south = room.walls.find((wall) => wall.id === 'bad-s')!
    const west = room.walls.find((wall) => wall.id === 'bad-w')!

    // Døra: 0,8 m bred, 0,8 m fra sørveggens start, fra gulvet og 2,0 m opp.
    expect(wallHoles(room, south)).toEqual([
      { openingId: 'bad-door', pane: false, from: expect.closeTo(0.8, 9), to: expect.closeTo(1.6, 9), bottom: 0, top: 2 },
    ])
    // Vinduet: brystning 1,4 m og 0,6 m høyt.
    expect(wallHoles(room, west)).toEqual([
      { openingId: 'bad-window', pane: true, from: expect.closeTo(1, 9), to: expect.closeTo(1.8, 9), bottom: 1.4, top: 2 },
    ])
    // Veggene uten åpninger har ingen hull.
    expect(wallHoles(room, room.walls[0])).toEqual([])
  })

  it('uten egne mål gjelder typens: dør og åpning fra gulvet og 2,0 m opp, vindu fra 0,9 m og 1,2 m opp', () => {
    const room = bathroom()
    const north = room.walls[0]
    const hole = (kind: string) =>
      wallHoles({ ...room, openings: [{ id: 'x', kind, start: { x: 0.8, y: 0 }, end: { x: 1.6, y: 0 }, height: null, sill: null }] }, north)[0]

    expect(hole('door')).toMatchObject({ bottom: 0, top: 2, pane: false })
    expect(hole('opening')).toMatchObject({ bottom: 0, top: 2, pane: false })
    expect(hole('window')).toMatchObject({ bottom: 0.9, top: expect.closeTo(2.1, 9), pane: true })
    // En type koden ikke kjenner er et hull som en åpning, uten rute.
    expect(hole('skylight')).toMatchObject({ bottom: 0, top: 2, pane: false })
  })

  it('et hull klemmes til veggen, og et hull uten utstrekning finnes ikke', () => {
    const room = bathroom()
    const north = room.walls[0]
    const holes = (opening: Partial<FloorPlanRoom['openings'][number]>) =>
      wallHoles({ ...room, openings: [{ id: 'x', kind: 'window', start: { x: 0.8, y: 0 }, end: { x: 1.6, y: 0 }, height: 1.2, sill: 0.9, ...opening }] }, north)

    // Høyere enn veggen (2,4 m): toppen stopper i veggens topp.
    expect(holes({ sill: 2, height: 1.2 })[0]).toMatchObject({ bottom: 2, top: 2.4 })
    // En brystning under gulvet starter i gulvet.
    expect(holes({ sill: -0.5, height: 1 })[0]).toMatchObject({ bottom: 0, top: 0.5 })
    // Bredere enn veggen: klemt til veggens ender.
    expect(holes({ start: { x: -1, y: 0 }, end: { x: 5, y: 0 } })[0]).toMatchObject({ from: 0, to: 2.4 })
    // Helt over veggen: ikke noe hull.
    expect(holes({ sill: 3, height: 1 })).toEqual([])
    // En åpning som ikke står på noen vegg (lenger unna enn 0,15 m) gir ikke noe hull.
    expect(holes({ start: { x: 0.8, y: 1 }, end: { x: 1.6, y: 1 } })).toEqual([])
  })

  it('hullet er åpent: ingen flate dekker åpningen, og veggen rundt står', () => {
    const south = wallMesh(bathroom(), 'bad-s')
    // Sørveggen ligger i z = 2,6, med rommet på −z-siden: innsiden er flaten lengst inn, utsiden den lengst ut.
    const [inner, outer] = extent(south, 2)
    expect(inner).toBeCloseTo(2.6 - WALL_THICKNESS / 2, 2)
    expect(outer).toBeCloseTo(2.6 + WALL_THICKNESS / 2, 2)

    for (const face of [inner, outer]) {
      // Midt i døråpningen (x 0,8–1,6, opp til 2,0 m).
      expect(covers(south, 2, face, [1.2, 1])).toBe(false)
      expect(covers(south, 2, face, [0.9, 1.9])).toBe(false)
      // Veggen ved siden av og over døra.
      expect(covers(south, 2, face, [0.4, 1])).toBe(true)
      expect(covers(south, 2, face, [2, 1])).toBe(true)
      expect(covers(south, 2, face, [1.2, 2.2])).toBe(true)
    }
  })

  it('hullet går tvers gjennom veggen: det som mangler er åpningens rom, og kantene viser veggtykkelsen', () => {
    const room = bathroom()
    const south = wallMesh(room, 'bad-s')
    const solid = wallMesh({ ...room, openings: [] }, 'bad-s')

    // Døra er 0,8 × 2,0 m gjennom 0,1 m vegg.
    expect(volume(solid) - volume(south)).toBeCloseTo(0.8 * 2 * WALL_THICKNESS, 6)

    // Karmene: flater på tvers av veggen ved x = 0,8 og x = 1,6, fra gulvet til 2,0 m.
    for (const x of [0.8, 1.6]) {
      expect(covers(south, 0, x, [2.6, 1])).toBe(true)
      expect(covers(south, 0, x, [2.6, 2.2])).toBe(false)
    }
  })

  it('et vindu har hull med brystning under og vegg over, og en tynn gjennomskinnelig rute', () => {
    const room = bathroom()
    const west = wallMesh(room, 'bad-w')
    // Vestveggen ligger i x = 0, med rommet på +x-siden: innsiden er flaten lengst inn.
    const inner = extent(west, 0)[1]

    // Vinduet står mellom z 0,8 og 1,6, fra 1,4 til 2,0 m.
    expect(covers(west, 0, inner, [1.2, 1.7])).toBe(false)
    expect(covers(west, 0, inner, [1.2, 0.7])).toBe(true)
    expect(covers(west, 0, inner, [1.2, 2.2])).toBe(true)
    expect(volume(wallMesh({ ...room, openings: [] }, 'bad-w')) - volume(west)).toBeCloseTo(0.8 * 0.6 * WALL_THICKNESS, 6)

    const panes = meshesOf(room, 'pane')
    expect(panes.map((pane) => pane.id)).toEqual(['bad-window'])
    expect(panes[0].opacity).toBe(PANE_OPACITY)
    expect(panes[0].color).toEqual(rgb(DEFAULT_3D_TONES.pane))
    // Ruta fyller hullet, midt i veggen.
    expect(extent(panes[0], 2).map((value) => Math.round(value * 1000) / 1000)).toEqual([0.8, 1.6])
    expect(extent(panes[0], 1)).toEqual([1.4, 2])
    const [xMin, xMax] = extent(panes[0], 0)
    expect(xMax - xMin).toBeCloseTo(0.02, 9)
    // Inne i veggen, ikke utenpå den.
    expect(xMin).toBeGreaterThan(extent(west, 0)[0])
    expect(xMax).toBeLessThan(extent(west, 0)[1])
  })

  it('dør og åpning står åpne: bare vinduer får rute', () => {
    const scene = buildFloorPlan3d(floorPlan())

    expect(scene.meshes.filter((mesh) => mesh.kind === 'pane').map((mesh) => mesh.id)).toEqual(['bad-window', 'kjokken-window'])
  })

  it('en dør mellom to rom er åpen fra begge sider: åpningen skjærer også naborommets vegg', () => {
    // Baddøra står i veggen mot gangen (z = 2,6) og hører til badet. Gangens nordvegg ligger oppå den.
    const north = hall().walls.find((wall) => wall.id === 'gang-n')!

    expect(wallHoles(hall(), north)).toEqual([])
    expect(wallHoles(hall(), north, [bathroom(), kitchen()])).toEqual([
      { openingId: 'bad-door', pane: false, from: expect.closeTo(0.8, 9), to: expect.closeTo(1.6, 9), bottom: 0, top: 2 },
      { openingId: 'kjokken-door', pane: false, from: expect.closeTo(3.4, 9), to: expect.closeTo(4.3, 9), bottom: 0, top: 2 },
    ])

    const scene = buildFloorPlan3d(floorPlan())
    const hallNorth = scene.meshes.find((mesh) => mesh.id === 'gang-n')!
    const [, inner] = extent(hallNorth, 2)

    // Sett fra gangen: hull der dørene står, vegg ellers.
    expect(covers(hallNorth, 2, inner, [1.2, 1])).toBe(false)
    expect(covers(hallNorth, 2, inner, [3.85, 1])).toBe(false)
    expect(covers(hallNorth, 2, inner, [2.4, 1])).toBe(true)
    expect(covers(hallNorth, 2, inner, [1.2, 2.2])).toBe(true)
  })

  it('en åpning i naborommet skjærer bare vegger som ligger oppå veggen den står på', () => {
    const rooms = [bathroom(), kitchen()]
    // Baddøra står i badets sørvegg: kjøkkenets vegger ligger ikke der.
    for (const wall of kitchen().walls) {
      expect(wallHoles(kitchen(), wall, [bathroom()]).map((hole) => hole.openingId), wall.id).not.toContain('bad-door')
    }

    // Vinduet i badets vestvegg er i en yttervegg: ingen andre vegger får hull, og ruta tegnes én gang.
    expect(buildFloorPlan3d({ rooms }).meshes.filter((mesh) => mesh.kind === 'pane' && mesh.id === 'bad-window')).toHaveLength(1)
  })

  it('et vindu i en delt vegg får én rute, tegnet av rommet som eier det', () => {
    const bath = bathroom()
    bath.openings = [{ id: 'luke', kind: 'window', start: { x: 2.4, y: 0.8 }, end: { x: 2.4, y: 1.6 }, height: 0.6, sill: 1.2 }]
    const scene = buildFloorPlan3d({ rooms: [bath, kitchen({ openings: [] })] })

    expect(scene.meshes.filter((mesh) => mesh.kind === 'pane').map((mesh) => [mesh.roomId, mesh.id])).toEqual([['room-bad', 'luke']])
    // Begge skivene har hullet.
    const kitchenWest = scene.meshes.find((mesh) => mesh.id === 'kjokken-w')!
    expect(covers(kitchenWest, 0, extent(kitchenWest, 0)[1], [1.2, 1.5])).toBe(false)
    expect(covers(kitchenWest, 0, extent(kitchenWest, 0)[1], [1.2, 0.5])).toBe(true)
  })

  it('to åpninger i samme vegg gir to hull', () => {
    const room = bathroom()
    room.openings = [
      { id: 'a', kind: 'door', start: { x: 0.2, y: 0 }, end: { x: 1, y: 0 }, height: 2, sill: 0 },
      { id: 'b', kind: 'window', start: { x: 1.4, y: 0 }, end: { x: 2.2, y: 0 }, height: 1, sill: 1 },
    ]
    const north = wallMesh(room, 'bad-n')
    const inner = extent(north, 2)[1]

    expect(covers(north, 2, inner, [0.6, 1])).toBe(false)
    expect(covers(north, 2, inner, [1.8, 1.5])).toBe(false)
    expect(covers(north, 2, inner, [1.2, 1])).toBe(true)
    expect(covers(north, 2, inner, [1.8, 0.5])).toBe(true)
    expect(volume(wallMesh({ ...room, openings: [] }, 'bad-n')) - volume(north)).toBeCloseTo((0.8 * 2 + 0.8 * 1) * WALL_THICKNESS, 6)
  })
})

describe('floorPlan3d: inventar', () => {
  it('har en standardhøyde for hver inventartype i kontrakten', () => {
    expect(Object.keys(OBJECT_DEFAULT_HEIGHTS).sort()).toEqual([...FLOOR_PLAN_OBJECT_CATEGORIES].sort())
    expect(OBJECT_DEFAULT_HEIGHTS).toEqual({
      // Til toppen av sisternen (SIGN-1987).
      toilet: 0.78,
      sink: 0.85,
      bathtub: 0.55,
      bed: 0.5,
      sofa: 0.8,
      table: 0.75,
      chair: 0.9,
      storage: 2,
      refrigerator: 1.8,
      stove: 0.9,
      oven: 0.9,
      dishwasher: 0.85,
      washer_dryer: 0.85,
      fireplace: 1.2,
      television: 0.6,
      stairs: 2.4,
      // Bærende (SIGN-2014): en søyle uten høyde er like høy som en vegg uten, en bjelke en kvart meter.
      column: 2.4,
      beam: 0.25,
    })
  })

  it('høyden er den oppgitte, ellers typens vanlige', () => {
    expect(objectHeight({ category: 'toilet', height: null })).toBe(0.78)
    expect(objectHeight({ category: 'toilet', height: 0.45 })).toBe(0.45)
    expect(objectHeight({ category: 'storage', height: undefined })).toBe(2)
    // 0 og tull er ikke en høyde.
    expect(objectHeight({ category: 'sink', height: 0 })).toBe(0.85)
    expect(objectHeight({ category: 'sink', height: Number.NaN })).toBe(0.85)
    // En type koden ikke kjenner gjettes ikke: en lav, nøytral boks.
    expect(objectHeight({ category: 'jacuzzi', height: null })).toBe(0.8)
  })

  it('står på gulvet til noe annet er oppgitt (SIGN-1987)', () => {
    expect(objectElevation({ elevation: null })).toBe(0)
    expect(objectElevation({ elevation: undefined })).toBe(0)
    expect(objectElevation({ elevation: 0.7 })).toBe(0.7)
    // Under gulvet og tull er ikke en høyde over gulvet.
    expect(objectElevation({ elevation: -1 })).toBe(0)
    expect(objectElevation({ elevation: Number.NaN })).toBe(0)
  })

  /** Alle flatene til ett inventar, uansett tone. */
  const partsOf = (room: FloorPlanRoom, id: string): FloorPlan3dMesh[] => meshesOf(room, 'object').filter((mesh) => mesh.id === id)
  const span = (meshes: FloorPlan3dMesh[], axis: 0 | 1 | 2): [number, number] => {
    const ranges = meshes.map((mesh) => extent(mesh, axis))

    return [Math.min(...ranges.map(([low]) => low)), Math.max(...ranges.map(([, high]) => high))].map((value) => Math.round(value * 1000) / 1000) as [number, number]
  }

  it('en type uten form er en boks på gulvet rundt midtpunktet, i en nøytral tone', () => {
    // Et boblebad koden ikke kjenner: 0,6 × 0,45 m rundt (0,9, 0,3), ikke dreid, 0,8 m høyt.
    const room = bathroom({ objects: [{ id: 'ukjent', category: 'jacuzzi', center: { x: 0.9, y: 0.3 }, width: 0.6, depth: 0.45, rotation: 0, height: null }] })
    const [box, ...rest] = partsOf(room, 'ukjent')

    expect(rest).toEqual([])
    expect(extent(box, 0).map((value) => Math.round(value * 1000) / 1000)).toEqual([0.6, 1.2])
    expect(extent(box, 1)).toEqual([0, 0.8])
    expect(extent(box, 2).map((value) => Math.round(value * 1000) / 1000)).toEqual([0.075, 0.525])
    expect(box.color).toEqual(rgb(DEFAULT_3D_TONES.object))
    expect(box.opacity).toBe(1)
    // Alle flatene vender ut.
    expect(volume(box)).toBeCloseTo(0.6 * 0.45 * 0.8, 9)
  })

  it('en kjent type er typens form: satt sammen av deler i opptil tre toner, innenfor inventarets mål (SIGN-1987)', () => {
    // Servanten: 0,6 × 0,45 m rundt (0,9, 0,3), ikke dreid, 0,85 m høy — et skap med en kum oppå og en kran.
    const sink = partsOf(bathroom(), 'object-sink')

    expect(sink.length).toBeGreaterThan(1)
    expect(new Set(sink.map((mesh) => mesh.color.join())).size).toBe(sink.length)
    expect(span(sink, 0)).toEqual([0.6, 1.2])
    expect(span(sink, 2)).toEqual([0.075, 0.525])
    // Fra gulvet og opp til høyden — krana stikker litt over.
    expect(span(sink, 1)[0]).toBe(0)
    expect(span(sink, 1)[1]).toBeGreaterThanOrEqual(0.85)
    expect(span(sink, 1)[1]).toBeLessThanOrEqual(0.85 + 0.15)

    for (const mesh of sink) {
      expect(mesh.opacity).toBe(1)
      // Hver del er lukket, med alle flatene ut.
      expect(volume(mesh)).toBeGreaterThan(0)
    }
  })

  it('formen er dreid om loddlinjen slik planen sier, med baksiden mot −y i inventarets egen ramme', () => {
    // Toalettet er 0,4 × 0,6 m dreid 90°: det dekker 0,6 m langs x rundt (2,0, 0,5), og sisternen (den høye delen) står mot østveggen.
    const toilet = partsOf(bathroom(), 'object-toilet')

    expect(span(toilet, 0)).toEqual([1.7, 2.3])
    expect(span(toilet, 2)[0]).toBeGreaterThanOrEqual(0.3)
    expect(span(toilet, 2)[1]).toBeLessThanOrEqual(0.7)
    expect(span(toilet, 1)).toEqual([0, 0.78])

    // Det høyeste punktet er sisternen: den ligger i den østre enden (høy x), 19 cm dyp.
    const tall = toilet.flatMap((mesh) => triangles(mesh).flat()).filter((corner) => Math.abs(corner[1] - 0.78) < 1e-9)
    expect(Math.min(...tall.map((corner) => corner[0]))).toBeCloseTo(2.3 - 0.19, 6)
    expect(Math.max(...tall.map((corner) => corner[0]))).toBeCloseTo(2.3, 6)

    // 45°: et bord på 1 × 1 m når ut til hjørnene på en sirkel rundt midtpunktet.
    const room = bathroom({ objects: [{ id: 'bord', category: 'table', center: { x: 1, y: 1 }, width: 1, depth: 1, rotation: Math.PI / 4, height: 0.7 }] })
    const table = partsOf(room, 'bord')
    expect(span(table, 0)[1]).toBeCloseTo(1 + Math.SQRT1_2, 3)
    expect(span(table, 2)[0]).toBeCloseTo(1 - Math.SQRT1_2, 3)
    expect(span(table, 1)).toEqual([0, 0.7])
  })

  it('et inventar som henger på veggen, tegnes så høyt over gulvet som det sier (SIGN-1987)', () => {
    const television = { id: 'tv', category: 'television', center: { x: 1, y: 0.1 }, width: 1.2, depth: 0.1, rotation: 0, height: 0.6 }
    const onFloor = partsOf(bathroom({ objects: [television] }), 'tv')
    const onWall = partsOf(bathroom({ objects: [{ ...television, elevation: 1.1 }] }), 'tv')

    expect(span(onFloor, 1)).toEqual([0, 0.6])
    expect(span(onWall, 1)).toEqual([1.1, 1.7])
    // Bare høyden er flyttet.
    expect(span(onWall, 0)).toEqual(span(onFloor, 0))
    expect(span(onWall, 2)).toEqual(span(onFloor, 2))
  })

  it('utformingen velger formen: et rundt bord har ingen hjørner (SIGN-1987)', () => {
    const table = { id: 'bord', category: 'table', center: { x: 1, y: 1 }, width: 1, depth: 1, rotation: 0, height: 0.75 }
    const corners = (variant: string | null) =>
      partsOf(bathroom({ objects: [{ ...table, variant }] }), 'bord')
        .flatMap((mesh) => triangles(mesh).flat())
        .filter((corner) => Math.hypot(corner[0] - 1, corner[2] - 1) > 0.6).length

    // Den firkantede bordplata når ut i hjørnene (0,71 m fra midten); den runde gjør det ikke.
    expect(corners(null)).toBeGreaterThan(0)
    expect(corners('rectangular')).toBeGreaterThan(0)
    expect(corners('round')).toBe(0)
    // En utforming bordet ikke har, er ikke oppgitt.
    expect(corners('armchair')).toBeGreaterThan(0)
  })

  it('hver type og utforming gir lukkede deler innenfor inventarets mål', () => {
    const kinds = FLOOR_PLAN_OBJECT_CATEGORIES.flatMap((category) => [null, ...objectVariantsFor(category)].map((variant) => ({ category, variant })))

    for (const { category, variant } of kinds) {
      const object = { id: 'x', category, variant, center: { x: 0, y: 0 }, width: 1.3, depth: 0.7, rotation: 0, height: 1.1, elevation: 0.2 }
      const parts = partsOf(bathroom({ objects: [object] }), 'x')
      const name = `${category}${variant === null ? '' : `:${variant}`}`

      expect(parts.length, name).toBeGreaterThan(0)
      // Innenfor flaten (håndtak og luker stikker noen centimeter fram), og fra undersiden til litt over høyden.
      expect(span(parts, 0)[0], name).toBeGreaterThanOrEqual(-0.65)
      expect(span(parts, 0)[1], name).toBeLessThanOrEqual(0.65)
      expect(span(parts, 2)[0], name).toBeGreaterThanOrEqual(-0.35)
      expect(span(parts, 2)[1], name).toBeLessThanOrEqual(0.35 + 0.06)
      expect(span(parts, 1)[0], name).toBeGreaterThanOrEqual(0.2)
      expect(span(parts, 1)[1], name).toBeLessThanOrEqual(0.2 + 1.1 + 0.13)
      // Formen fyller inventarets flate: den når ut til kantene i begge retninger.
      expect(span(parts, 0)[1] - span(parts, 0)[0], name).toBeGreaterThan(1.3 * 0.9)
      expect(span(parts, 2)[1] - span(parts, 2)[0], name).toBeGreaterThan(0.7 * 0.9)

      for (const mesh of parts) {
        expect(volume(mesh), name).toBeGreaterThan(0)
        expect(mesh.positions.every(Number.isFinite), name).toBe(true)
      }
    }
  })

  it('inventar uten bredde eller dybde tegnes ikke', () => {
    const room = bathroom({ objects: [{ id: 'flat', category: 'table', center: { x: 1, y: 1 }, width: 0, depth: 1, rotation: 0, height: 1 }] })

    expect(meshesOf(room, 'object')).toEqual([])
  })
})

describe('floorPlan3d: tak og farger', () => {
  it('taket tegnes ikke som lokk — uten takfarge finnes ingenting av taket', () => {
    const scene = buildFloorPlan3d(floorPlan())

    expect(scene.meshes.filter((mesh) => mesh.kind === 'ceiling')).toEqual([])
    // Ingen vannrett flate i takhøyde som dekker rommet: det høyeste er veggenes topp.
    expect(scene.bounds?.max[1]).toBe(2.4)
  })

  it('takfargen er et smalt bånd langs toppen av rommets vegger, på rommets side', () => {
    const band = meshesOf(bathroom({ ceilingColor: '#F4F1EA' }), 'ceiling')

    expect(band).toHaveLength(1)
    expect(band[0].color).toEqual(rgb('#f4f1ea'))

    const [bottom, top] = extent(band[0], 1)
    expect(bottom).toBeCloseTo(2.4 - CEILING_BAND_HEIGHT, 9)
    // Båndet ligger et par millimeter utenpå veggen, så de to aldri ligger i samme plan.
    expect(top).toBeGreaterThan(2.4)
    expect(top - 2.4).toBeLessThan(0.01)

    // Rundt hele rommet, og aldri på utsiden av veggene (rommet er x 0–2,4, z 0–2,6).
    const [xMin, xMax] = extent(band[0], 0)
    const [zMin, zMax] = extent(band[0], 2)
    expect(xMin).toBeGreaterThan(-0.05)
    expect(xMax).toBeLessThan(2.45)
    expect(zMin).toBeGreaterThan(-0.05)
    expect(zMax).toBeLessThan(2.65)
    expect(xMax - xMin).toBeGreaterThan(2.3)
    expect(zMax - zMin).toBeGreaterThan(2.5)
  })

  it('bare rommene med takfarge får bånd', () => {
    const scene = buildFloorPlan3d({ rooms: [bathroom(), kitchen({ ceilingColor: '#d3d4d1' }), hall()] })

    expect(scene.meshes.filter((mesh) => mesh.kind === 'ceiling').map((mesh) => mesh.roomId)).toEqual(['room-kjokken'])
  })

  it('gulvet tegnes i gulvfargen, og en ugyldig farge er ingen farge', () => {
    expect(meshesOf(bathroom({ floorColor: '#D8B98A' }), 'floor')[0].color).toEqual(rgb('#d8b98a'))
    expect(meshesOf(bathroom(), 'floor')[0].color).toEqual(rgb(DEFAULT_3D_TONES.floor))
    expect(meshesOf(bathroom({ floorColor: 'eik' }), 'floor')[0].color).toEqual(rgb(DEFAULT_3D_TONES.floor))
  })

  it('tonene uten valg kommer fra den som tegner, for gulv, vegger, inventar og ruter', () => {
    const tones = { floor: '#101010', wall: '#202020', object: '#303030', pane: '#404040', objectSoft: '#505050', objectStrong: '#606060' }
    const scene = buildFloorPlan3d({ rooms: [bathroom()] }, tones)
    const colorOf = (kind: FloorPlan3dMesh['kind']) => scene.meshes.find((mesh) => mesh.kind === kind)?.color
    const objectColors = (from: typeof scene) => [...new Set(from.meshes.filter((mesh) => mesh.kind === 'object').map((mesh) => mesh.color.join()))].sort()

    expect(colorOf('floor')).toEqual(rgb('#101010'))
    expect(colorOf('wall')).toEqual(rgb('#202020'))
    expect(colorOf('pane')).toEqual(rgb('#404040'))
    // Inventaret har tre toner (SIGN-1987): den vanlige, den lyse og den mørke.
    expect(objectColors(scene)).toEqual([rgb('#303030'), rgb('#505050'), rgb('#606060')].map((color) => color.join()).sort())

    // Uten de to siste blandes de av den vanlige: lysere og mørkere.
    const mixed = buildFloorPlan3d({ rooms: [bathroom()] }, { floor: '#101010', wall: '#202020', object: '#808080', pane: '#404040' })
    expect(objectColors(mixed)).toEqual([rgb('#808080'), rgb(mixHex('#808080', '#ffffff', 0.45)), rgb(mixHex('#808080', '#000000', 0.35))].map((color) => color.join()).sort())
  })

  it('leser og blander farger', () => {
    expect(hexToRgb('#ffffff')).toEqual([1, 1, 1])
    expect(hexToRgb('#FF8000')).toEqual([1, 128 / 255, 0])
    expect(hexToRgb('fff')).toBeNull()
    expect(hexToRgb(null)).toBeNull()
    expect(mixHex('#ffffff', '#000000', 0.5)).toBe('#808080')
    expect(mixHex('#ffffff', '#0d1c26', 0)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })
})

describe('floorPlan3d: scenen og kameraet', () => {
  it('bygger gulv, vegger, ruter og inventar for hvert rom', () => {
    const scene = buildFloorPlan3d(floorPlan())
    const count = (kind: FloorPlan3dMesh['kind']) => scene.meshes.filter((mesh) => mesh.kind === kind).length

    expect(count('floor')).toBe(3)
    expect(count('wall')).toBe(12)
    expect(count('pane')).toBe(2)
    // Hvert inventar er typens form i opptil tre toner (SIGN-1987): fem inventar.
    expect(new Set(scene.meshes.filter((mesh) => mesh.kind === 'object').map((mesh) => mesh.id)).size).toBe(5)

    // Hver trekant peker på punkter som finnes, og alle tall er tall.
    for (const mesh of scene.meshes) {
      expect(mesh.positions.length % 3).toBe(0)
      expect(mesh.indices.length % 3).toBe(0)
      expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3)
      expect(mesh.positions.every((value) => Number.isFinite(value))).toBe(true)
      expect(mesh.color.every((value) => value >= 0 && value <= 1)).toBe(true)
    }
  })

  it('rammen dekker hele planen: fra gulvet til veggenes topp', () => {
    const { bounds } = buildFloorPlan3d(floorPlan())

    // Planen er 6,0 × 4,2 m; veggene stikker en halv veggtykkelse utenfor.
    expect(bounds?.min[0]).toBeCloseTo(-0.048, 2)
    expect(bounds?.max[0]).toBeCloseTo(6.048, 2)
    expect(bounds?.min[1]).toBe(0)
    expect(bounds?.max[1]).toBe(2.4)
    expect(bounds?.min[2]).toBeCloseTo(-0.048, 2)
    expect(bounds?.max[2]).toBeCloseTo(4.248, 2)
    expect(buildFloorPlan3d({ rooms: [] })).toEqual({ meshes: [], bounds: null })
  })

  it('en vegg to rom deler er hvert roms halvdel av skiven, så hver side får sitt roms farge', () => {
    const scene = buildFloorPlan3d({ rooms: [bathroom({ wallColor: '#f4f1ea' }), kitchen({ wallColor: '#4a4f54' })] })
    const bathEast = scene.meshes.find((mesh) => mesh.id === 'bad-e')!
    const kitchenWest = scene.meshes.find((mesh) => mesh.id === 'kjokken-w')!

    // Veggen ligger i x = 2,4: badets halvdel på badets side, kjøkkenets på kjøkkenets — til sammen 0,1 m.
    expect(extent(bathEast, 0).map((value) => Math.round(value * 1000) / 1000)).toEqual([2.35, 2.4])
    expect(extent(kitchenWest, 0).map((value) => Math.round(value * 1000) / 1000)).toEqual([2.4, 2.45])
    expect(bathEast.color).toEqual(rgb('#f4f1ea'))
    expect(kitchenWest.color).toEqual(rgb('#4a4f54'))

    // Ytterveggene står midt på linja, i full tykkelse.
    const bathWest = scene.meshes.find((mesh) => mesh.id === 'bad-w')!
    expect(extent(bathWest, 0).map((value) => Math.round(value * 1000) / 1000)).toEqual([-0.05, 0.05])
  })

  it('skiven går forbi enden bare i et åpent hjørne — aldri inn i en vegg som fortsetter eller krysser', () => {
    const scene = buildFloorPlan3d(floorPlan())
    const z = (id: string) => extent(scene.meshes.find((mesh) => mesh.id === id)!, 2).map((value) => Math.round(value * 1000) / 1000)
    const x = (id: string) => extent(scene.meshes.find((mesh) => mesh.id === id)!, 0).map((value) => Math.round(value * 1000) / 1000)

    // Badets og gangens vestvegger ligger etter hverandre i x = 0: de møtes i z = 2,6 uten å gå inn i hverandre.
    expect(z('bad-w')).toEqual([-0.046, 2.6])
    expect(z('gang-w')).toEqual([2.6, 4.246])
    // Veggen mellom bad og kjøkken ender midt på ytterveggen i nord og på veggen mot gangen i sør: ingen forlengelse.
    expect(z('bad-e')).toEqual([0, 2.6])
    expect(z('kjokken-w')).toEqual([0, 2.6])
    // Nordveggene møtes over den: de stopper i hverandre, og fyller de åpne hjørnene ytterst.
    expect(x('bad-n')).toEqual([-0.046, 2.4])
    expect(x('kjokken-n')).toEqual([2.4, 6.046])
    // Gangens sørvegg har åpne hjørner i begge ender.
    expect(x('gang-s')).toEqual([-0.046, 6.046])
  })

  it('kameraet ser ned på hele planen på skrå, og hele planen får plass', () => {
    const bounds = buildFloorPlan3d(floorPlan()).bounds!

    for (const aspect of [16 / 9, 1, 0.5]) {
      const camera = fitCamera(bounds, aspect)
      const view = [camera.target[0] - camera.position[0], camera.target[1] - camera.position[1], camera.target[2] - camera.position[2]]
      const reach = Math.hypot(...view)

      // Midt i planen, ovenfra og forfra (planens nedre kant nærmest).
      expect(camera.target).toEqual([expect.closeTo(3, 1), 1.2, expect.closeTo(2.1, 1)])
      expect(camera.position[1]).toBeGreaterThan(bounds.max[1])
      expect(camera.position[2]).toBeGreaterThan(bounds.max[2])
      const elevation = (Math.asin(-view[1] / reach) * 180) / Math.PI
      expect(elevation).toBeGreaterThan(30)
      expect(elevation).toBeLessThan(75)

      // Hvert hjørne av rammen ligger innenfor synsvinkelen, både loddrett og vannrett.
      const forward = view.map((value) => value / reach)
      const right = [forward[2], 0, -forward[0]].map((value, _, all) => value / Math.hypot(all[0], all[2]))
      const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]]
      const halfVertical = Math.tan((CAMERA_FOV * Math.PI) / 360)

      for (const x of [bounds.min[0], bounds.max[0]]) {
        for (const y of [bounds.min[1], bounds.max[1]]) {
          for (const z of [bounds.min[2], bounds.max[2]]) {
            const offset = [x - camera.position[0], y - camera.position[1], z - camera.position[2]]
            const depth = offset[0] * forward[0] + offset[1] * forward[1] + offset[2] * forward[2]
            const across = offset[0] * right[0] + offset[1] * right[1] + offset[2] * right[2]
            const along = offset[0] * up[0] + offset[1] * up[1] + offset[2] * up[2]

            expect(depth).toBeGreaterThan(camera.near)
            expect(depth).toBeLessThan(camera.far)
            expect(Math.abs(along) / depth).toBeLessThan(halfVertical)
            expect(Math.abs(across) / depth).toBeLessThan(halfVertical * aspect)
          }
        }
      }
    }
  })

  it('en smal visning flytter kameraet lenger unna', () => {
    const bounds = buildFloorPlan3d(floorPlan()).bounds!
    const far = (aspect: number): number => {
      const camera = fitCamera(bounds, aspect)

      return Math.hypot(camera.position[0] - camera.target[0], camera.position[1] - camera.target[1], camera.position[2] - camera.target[2])
    }

    expect(far(0.5)).toBeGreaterThan(far(1.5))
    expect(far(1.5)).toBeCloseTo(far(3), 9)
  })
})

// SIGN-1982: en vegg med skrå overkant tegnes langs overkanten, takflaten i
// et rom med skråtak tegnes som en hinne, og en dør som sier hvordan den
// står, får et dørblad.
describe('floorPlan3d: skråtak og dørblad (SIGN-1982)', () => {
  const gable = [
    { at: 0, height: 1 },
    { at: 0.5, height: 3 },
    { at: 1, height: 1 },
  ]
  /** Loft 6 × 4 m under møne: knevegger 1,0 m langs x, gavlvegger med mønet 3,0 m over midten. */
  const attic = (overrides: Partial<FloorPlanRoom> = {}): FloorPlanRoom => ({
    ...bathroom(),
    id: 'room-loft',
    outline: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 4 },
      { x: 0, y: 4 },
    ],
    walls: [
      { id: 'loft-n', start: { x: 0, y: 0 }, end: { x: 6, y: 0 }, height: 1, profile: null, color: null },
      { id: 'loft-e', start: { x: 6, y: 0 }, end: { x: 6, y: 4 }, height: 3, profile: gable, color: null },
      { id: 'loft-s', start: { x: 6, y: 4 }, end: { x: 0, y: 4 }, height: 1, profile: null, color: null },
      { id: 'loft-w', start: { x: 0, y: 4 }, end: { x: 0, y: 0 }, height: 3, profile: gable, color: null },
    ],
    openings: [],
    objects: [],
    ...overrides,
  })
  const meshOf = (room: FloorPlanRoom, kind: string, id: string | null = null): FloorPlan3dMesh | undefined =>
    buildFloorPlan3d({ rooms: [room] }).meshes.find((mesh) => mesh.kind === kind && (id === null || mesh.id === id))
  const heights = (mesh: FloorPlan3dMesh): number[] => mesh.positions.filter((_, index) => index % 3 === 1)
  const area = (mesh: FloorPlan3dMesh): number =>
    triangles(mesh).reduce((sum, [a, b, c]) => {
      const p = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      const q = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]

      return sum + Math.hypot(p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]) / 2
    }, 0)

  it('en gavlvegg er høyest under mønet og lavest i endene', () => {
    const wall = meshOf(attic(), 'wall', 'loft-e')!
    // Punktene på veggens innside (x = 5,95), etter hvor langt ut på veggen de står.
    const top = (z: number): number =>
      Math.max(...triangles(wall).flatMap((corners) => corners).filter((corner) => Math.abs(corner[2] - z) < 1e-6).map((corner) => corner[1]))

    expect(top(2)).toBeCloseTo(3, 2)
    expect(top(0)).toBeCloseTo(1, 2)
    expect(top(4)).toBeCloseTo(1, 2)
    expect(Math.max(...heights(wall))).toBeCloseTo(3, 2)
    // Veggens innside er en femkant: 4 × 1 + 4 × 2 / 2 = 8 m² — pluss det skiven går forbi hver ende for å fylle hjørnene (under 5 cm, 1 m høyt).
    const facing = triangles(wall).filter(([a, b, c]) => [a, b, c].every((corner) => Math.abs(corner[0] - 5.95) < 1e-6))
    const faceArea = facing.reduce((sum, [a, b, c]) => sum + Math.abs((b[2] - a[2]) * (c[1] - a[1]) - (c[2] - a[2]) * (b[1] - a[1])) / 2, 0)
    expect(faceArea).toBeGreaterThan(7.95)
    expect(faceArea).toBeLessThan(8.1)
  })

  it('en vannrett vegg i samme rom er som før', () => {
    const wall = meshOf(attic(), 'wall', 'loft-n')!

    expect(Math.max(...heights(wall))).toBeCloseTo(1, 2)
    expect(Math.min(...heights(wall))).toBe(0)
  })

  it('et hull i en skrå vegg står åpent, og veggen over det følger overkanten', () => {
    // En dør 0,8 × 2,0 m midt i gavlveggen, under mønet.
    const room = attic({ openings: [{ id: 'gavl-dor', kind: 'door', start: { x: 6, y: 1.6 }, end: { x: 6, y: 2.4 }, height: 2, sill: 0, hinge: null, swing: null }] })
    const wall = meshOf(room, 'wall', 'loft-e')!
    const inner = triangles(wall).filter(([a, b, c]) => [a, b, c].every((corner) => Math.abs(corner[0] - 5.95) < 1e-6))
    const covers = (z: number, y: number): boolean =>
      inner.some(([a, b, c]) => {
        const sign = (p: Vec3, q: Vec3): number => (z - q[2]) * (p[1] - q[1]) - (p[2] - q[2]) * (y - q[1])
        const [d1, d2, d3] = [sign(a, b), sign(b, c), sign(c, a)]

        return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))
      })

    // I døråpningen er det ingen vegg; over den, under mønet, er det vegg; over overkanten ingenting.
    expect(covers(2, 1)).toBe(false)
    expect(covers(2, 2.5)).toBe(true)
    expect(covers(0.5, 1)).toBe(true)
    expect(covers(0.5, 1.8)).toBe(false)
  })

  it('takflaten i et rom med skråtak er en gjennomskinnelig hinne i takfargen, så stor som taket', () => {
    const roof = meshOf(attic({ ceilingColor: '#ffeecc' }), 'roof')!

    expect(roof.opacity).toBe(ROOF_OPACITY)
    expect(roof.color).toEqual(hexToRgb('#ffeecc'))
    // 2 × 6 × √(2² + 2²)
    expect(area(roof)).toBeCloseTo(12 * Math.sqrt(8), 6)
    expect(Math.max(...heights(roof))).toBeCloseTo(3, 6)
    expect(Math.min(...heights(roof))).toBeCloseTo(1, 6)

    // Uten takfarge får hinna veggtonen.
    expect(meshOf(attic(), 'roof')!.color).toEqual(hexToRgb(DEFAULT_3D_TONES.wall))
  })

  it('et rom med flatt tak har ingen takflate', () => {
    expect(meshOf(bathroom({ ceilingColor: '#ffeecc' }), 'roof')).toBeUndefined()
  })

  it('takbåndet følger den skrå overkanten', () => {
    const band = meshOf(attic({ ceilingColor: '#ffeecc' }), 'ceiling')!

    expect(Math.max(...heights(band))).toBeGreaterThan(2.9)
    expect(Math.min(...heights(band))).toBeGreaterThan(1 - CEILING_BAND_HEIGHT - 0.01)
  })

  it('en dør som sier hvordan den står, får et dørblad ut fra hengselet på slagsiden', () => {
    const door = { id: 'bad-door', kind: 'door', start: { x: 0.8, y: 2.6 }, end: { x: 1.6, y: 2.6 }, height: 2, sill: 0 }
    // Hengslet i slutten (x = 1,6), slår ut av rommet (nedover i planen: større y).
    const leaf = meshOf(bathroom({ openings: [{ ...door, hinge: 'end', swing: 'right' }] }), 'door', 'bad-door')!
    const xs = leaf.positions.filter((_, index) => index % 3 === 0)
    const zs = leaf.positions.filter((_, index) => index % 3 === 2)

    // Bladet er 0,8 m langt, 0,04 m tykt og 2,0 m høyt.
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([1.6 - DOOR_LEAF_THICKNESS, 1.6])
    expect([Math.min(...zs), Math.max(...zs)].map((value) => Math.round(value * 100) / 100)).toEqual([2.6, 3.4])
    expect([Math.min(...heights(leaf)), Math.max(...heights(leaf))]).toEqual([0, 2])
    expect(leaf.opacity).toBe(1)

    // Inn i rommet står bladet på den andre siden av veggen.
    const inward = meshOf(bathroom({ openings: [{ ...door, hinge: 'start', swing: 'left' }] }), 'door', 'bad-door')!
    expect(Math.min(...inward.positions.filter((_, index) => index % 3 === 2))).toBeCloseTo(1.8, 6)
  })

  it('en dør som ikke sier noe, et vindu og en åpning har ikke blad', () => {
    expect(buildFloorPlan3d(floorPlan()).meshes.filter((mesh) => mesh.kind === 'door')).toEqual([])

    const window = { id: 'v', kind: 'window', start: { x: 0.8, y: 2.6 }, end: { x: 1.6, y: 2.6 }, height: 1, sill: 1, hinge: 'end', swing: 'right' }
    expect(meshOf(bathroom({ openings: [window] }), 'door')).toBeUndefined()
  })
})
