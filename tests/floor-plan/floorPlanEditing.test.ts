import { describe, expect, it } from 'vitest'
import type { FloorPlanRoom } from '../../src/floor-plan/model'
import {
  OBJECT_DEFAULT_SIZES,
  addObject,
  addOpening,
  deleteObject,
  deleteOpening,
  deleteRoom,
  faceObject,
  hitTest,
  moveCorner,
  moveObject,
  moveOpening,
  normalizeColor,
  openingDistanceAt,
  openingSeat,
  removeAllObjects,
  removeAllObjectsInPlan,
  renamePlan,
  renameRoom,
  resizeObject,
  resizeOpening,
  rotateObject,
  selectionExists,
  setCeilingHeight,
  setObjectCategory,
  setObjectElevation,
  setObjectVariant,
  setOpeningHeight,
  setOpeningKind,
  setOpeningSill,
  setObjectHeight,
  setRoomCategory,
  setRoomCeilingColor,
  setRoomFloorColor,
  setRoomWallColor,
  setWallColor,
  setWallHeight,
  setWallLength,
  snap,
  snapCorner,
  turnObject,
  updateRoom,
} from '../../src/floor-plan/floorPlanEditing'
import { FLOOR_PLAN_OBJECT_CATEGORIES } from '../../src/floor-plan/model'
import { bathroom, floorPlan, hall, kitchen } from './support/floorPlanFixture'

// Redigeringsreglene for plantegninger (SIGN-1980), slik kontrakten
// «Editing floor plans» kapittel 3 beskriver dem. De samme reglene er skrevet
// i Swift for Sign-appen: testene her er fasiten oppførselen måles mot.
// Badet er 2,4 × 2,6 m med hjørnene (0,0) (2,4,0) (2,4,2,6) (0,2,6), en dør
// 0,8 m i sørveggen og et vindu 0,8 m i vestveggen.

const wall = (room: FloorPlanRoom, id: string) => room.walls.find((candidate) => candidate.id === id)!
const opening = (room: FloorPlanRoom, id: string) => room.openings.find((candidate) => candidate.id === id)!
const object = (room: FloorPlanRoom, id: string) => room.objects.find((candidate) => candidate.id === id)!
const length = (room: FloorPlanRoom, id: string): number => Math.hypot(wall(room, id).end.x - wall(room, id).start.x, wall(room, id).end.y - wall(room, id).start.y)

/** Et rom med én frittstående vegg som ikke ender i et hjørne av omrisset. */
const withLooseWall = (): FloorPlanRoom => ({
  ...bathroom(),
  walls: [...bathroom().walls, { id: 'loose', start: { x: 0.5, y: 1 }, end: { x: 1.5, y: 1 }, height: 2.4, color: null }],
})

describe('floorPlanEditing: posisjoner og farger', () => {
  it('legger alt på nærmeste hele centimeter, halve bort fra null', () => {
    expect(snap(1.234)).toBe(1.23)
    expect(snap(1.236)).toBe(1.24)
    expect(snap(0.125)).toBe(0.13)
    expect(snap(-0.125)).toBe(-0.13)
    expect(snap(-1.236)).toBe(-1.24)
    expect(snap(-0.004)).toBe(-0)
    expect(snap(2.4)).toBe(2.4)
  })

  it('en farge er # og seks heksadesimale sifre, lagret med små bokstaver', () => {
    expect(normalizeColor('#AABBCC')).toBe('#aabbcc')
    expect(normalizeColor(' #a1b2c3 ')).toBe('#a1b2c3')
    expect(normalizeColor('#abc')).toBeNull()
    expect(normalizeColor('aabbcc')).toBeNull()
    expect(normalizeColor('red')).toBeNull()
    expect(normalizeColor('#aabbccdd')).toBeNull()
    expect(normalizeColor(null)).toBeNull()
  })
})

describe('floorPlanEditing: planen', () => {
  it('gir plantegningen nytt navn, 1–120 tegn etter at mellomrom i endene er fjernet', () => {
    const plan = floorPlan()

    expect(renamePlan(plan, '  2. etasje ').name).toBe('2. etasje')
    expect(renamePlan(plan, 'x'.repeat(120)).name).toHaveLength(120)
    // Rommene er de samme objektene: bare navnet er nytt.
    expect(renamePlan(plan, 'Loft').rooms).toBe(plan.rooms)

    expect(renamePlan(plan, '   ')).toBe(plan)
    expect(renamePlan(plan, '')).toBe(plan)
    expect(renamePlan(plan, 'x'.repeat(121))).toBe(plan)
    expect(renamePlan(plan, ' 1. etasje ')).toBe(plan)
  })
})

describe('floorPlanEditing: rom', () => {
  it('gir rommet nytt navn, 1–120 tegn etter at mellomrom i endene er fjernet', () => {
    expect(renameRoom(bathroom(), '  Hovedbad ').name).toBe('Hovedbad')
    expect(renameRoom(bathroom(), 'x'.repeat(120)).name).toHaveLength(120)

    const room = bathroom()
    expect(renameRoom(room, '   ')).toBe(room)
    expect(renameRoom(room, 'x'.repeat(121))).toBe(room)
    expect(renameRoom(room, 'Bad')).toBe(room)
  })

  it('setter romtypen eller ingen, og aldri en type koden ikke kjenner', () => {
    expect(setRoomCategory(bathroom(), 'kitchen').category).toBe('kitchen')
    expect(setRoomCategory(bathroom(), null).category).toBeNull()

    const room = bathroom()
    expect(setRoomCategory(room, 'garage')).toBe(room)
    expect(setRoomCategory(room, 'bathroom')).toBe(room)
  })

  it('setter og fjerner gulvfarge og veggfarge', () => {
    const coloured = setRoomWallColor(setRoomFloorColor(bathroom(), '#D8B98A'), '#f4f1ea')

    expect(coloured.floorColor).toBe('#d8b98a')
    expect(coloured.wallColor).toBe('#f4f1ea')
    expect(setRoomFloorColor(coloured, null).floorColor).toBeNull()
    expect(setRoomWallColor(coloured, null).wallColor).toBeNull()
    // En ugyldig farge lar det som står, stå.
    expect(setRoomFloorColor(coloured, 'oak')).toBe(coloured)
    expect(setRoomFloorColor(coloured, '#d8b98a')).toBe(coloured)
  })

  it('setter og fjerner takfargen (SIGN-1981)', () => {
    const room = setRoomCeilingColor(bathroom(), '#F4F1EA')

    expect(room.ceilingColor).toBe('#f4f1ea')
    // Gulv og vegger er urørt.
    expect(room).toMatchObject({ floorColor: null, wallColor: null })
    expect(setRoomCeilingColor(room, null).ceilingColor).toBeNull()
    expect(setRoomCeilingColor(room, 'hvit')).toBe(room)
    expect(setRoomCeilingColor(room, '#f4f1ea')).toBe(room)
  })

  it('takhøyden settes på hver vegg, 0,5–30 m', () => {
    expect(setCeilingHeight(bathroom(), 2.7).walls.map((candidate) => candidate.height)).toEqual([2.7, 2.7, 2.7, 2.7])
    expect(setCeilingHeight(bathroom(), 0.1).walls.map((candidate) => candidate.height)).toEqual([0.5, 0.5, 0.5, 0.5])
    expect(setCeilingHeight(bathroom(), 99).walls.map((candidate) => candidate.height)).toEqual([30, 30, 30, 30])

    const room = bathroom()
    expect(setCeilingHeight(room, 2.4)).toBe(room)
    expect(setCeilingHeight(room, Number.NaN)).toBe(room)
  })

  it('sletter et rom, men aldri det siste i planen', () => {
    const plan = floorPlan()
    const without = deleteRoom(plan, 'room-kjokken')

    expect(without.rooms.map((room) => room.id)).toEqual(['room-bad', 'room-gang'])
    expect(deleteRoom(plan, 'finnes-ikke')).toBe(plan)

    const single = floorPlan({ rooms: [bathroom()] })
    expect(deleteRoom(single, 'room-bad')).toBe(single)
  })

  it('updateRoom bytter ut ett rom og gir samme plan tilbake når ingenting endret seg', () => {
    const plan = floorPlan()
    const renamed = updateRoom(plan, 'room-bad', (room) => renameRoom(room, 'Hovedbad'))

    expect(renamed.rooms.map((room) => room.name)).toEqual(['Hovedbad', 'Kjøkken', 'Gang'])
    expect(renamed.rooms[1]).toBe(plan.rooms[1])
    expect(updateRoom(plan, 'room-bad', (room) => room)).toBe(plan)
    expect(updateRoom(plan, 'finnes-ikke', (room) => renameRoom(room, 'X'))).toBe(plan)
  })
})

describe('floorPlanEditing: hjørner og vegger', () => {
  it('et hjørne som flyttes tar med seg veggendene som sto i det', () => {
    const moved = moveCorner(bathroom(), 2, { x: 3, y: 2.6 })

    expect(moved.outline[2]).toEqual({ x: 3, y: 2.6 })
    // Østveggen ender i hjørnet, sørveggen starter i det.
    expect(wall(moved, 'bad-e').end).toEqual({ x: 3, y: 2.6 })
    expect(wall(moved, 'bad-e').start).toEqual({ x: 2.4, y: 0 })
    expect(wall(moved, 'bad-s').start).toEqual({ x: 3, y: 2.6 })
    expect(wall(moved, 'bad-s').end).toEqual({ x: 0, y: 2.6 })
    // De to andre veggene og de andre hjørnene er urørt.
    expect(moved.walls[0]).toEqual(bathroom().walls[0])
    expect(moved.walls[3]).toEqual(bathroom().walls[3])
    expect(moved.outline.filter((_, index) => index !== 2)).toEqual(bathroom().outline.filter((_, index) => index !== 2))
  })

  it('åpningene på en vegg som flyttet seg settes tilbake med samme avstand fra veggens start og samme bredde', () => {
    // Sørveggen går fra (2,4, 2,6) til (0, 2,6); døra står 0,8 m fra veggens start.
    expect(openingSeat(bathroom(), opening(bathroom(), 'bad-door'))).toMatchObject({ distance: expect.closeTo(0.8, 9), width: expect.closeTo(0.8, 9), reversed: true })

    const moved = moveCorner(bathroom(), 2, { x: 3, y: 2.6 })

    // Veggen starter nå i x = 3,0: døra står fortsatt 0,8 m fra starten, og er like bred.
    expect(opening(moved, 'bad-door').start).toEqual({ x: 1.4, y: 2.6 })
    expect(opening(moved, 'bad-door').end).toEqual({ x: 2.2, y: 2.6 })
    // Vinduet står i vestveggen, som ikke flyttet seg.
    expect(opening(moved, 'bad-window')).toBe(moved.openings[1])
    expect(moved.openings[1]).toEqual(bathroom().openings[1])
  })

  it('åpningen følger veggen når den vris', () => {
    // Hjørnet nede til venstre flyttes ned: sørveggen går nå på skrå fra (2,4, 2,6) til (0, 3,6).
    const moved = moveCorner(bathroom(), 3, { x: 0, y: 3.6 })
    const door = opening(moved, 'bad-door')
    const seat = openingSeat(moved, door)

    expect(seat?.wall.id).toBe('bad-s')
    expect(seat?.distance).toBeCloseTo(0.8, 1)
    expect(seat?.width).toBeCloseTo(0.8, 1)
    // Vinduet sto 1,0 m fra vestveggens start (0, 2,6), som nå er (0, 3,6).
    expect(opening(moved, 'bad-window').end).toEqual({ x: 0, y: 2.6 })
    expect(opening(moved, 'bad-window').start).toEqual({ x: 0, y: 1.8 })
  })

  it('en åpning krympes når veggen blir kortere enn åpningen + 0,1 m', () => {
    // Sørveggen blir 0,7 m: døra (0,8 m) får 0,6 m, med 0,05 m til hver veggende.
    const moved = moveCorner(bathroom(), 2, { x: 0.7, y: 2.6 })

    expect(opening(moved, 'bad-door').end).toEqual({ x: 0.65, y: 2.6 })
    expect(opening(moved, 'bad-door').start).toEqual({ x: 0.05, y: 2.6 })
  })

  it('en åpning som havner utenfor en kortere vegg klemmes inn i den', () => {
    // Sørveggen blir 1,2 m: døra beholder bredden 0,8 m, men avstanden 0,8 m får ikke plass.
    const moved = moveCorner(bathroom(), 2, { x: 1.2, y: 2.6 })

    expect(opening(moved, 'bad-door').end).toEqual({ x: 0.85, y: 2.6 })
    expect(opening(moved, 'bad-door').start).toEqual({ x: 0.05, y: 2.6 })
  })

  it('et hjørne legges på nærmeste centimeter, og et ukjent hjørne flytter ingenting', () => {
    expect(moveCorner(bathroom(), 2, { x: 2.987, y: 2.604 }).outline[2]).toEqual({ x: 2.99, y: 2.6 })

    const room = bathroom()
    expect(moveCorner(room, 9, { x: 1, y: 1 })).toBe(room)
    expect(moveCorner(room, 2, { x: 2.4, y: 2.6 })).toBe(room)
    expect(moveCorner(room, 2, { x: 2.401, y: 2.6 })).toBe(room)
  })

  it('et hjørne som dras legger seg på nabohjørnets x eller y innenfor 0,05 m', () => {
    // Naboene til hjørne 2 er (2,4, 0) og (0, 2,6).
    expect(snapCorner(bathroom(), 2, { x: 2.43, y: 2.64 })).toEqual({ x: 2.4, y: 2.6 })
    expect(snapCorner(bathroom(), 2, { x: 2.37, y: 3.1 })).toEqual({ x: 2.4, y: 3.1 })
    expect(snapCorner(bathroom(), 2, { x: 3, y: 2.56 })).toEqual({ x: 3, y: 2.6 })
    // Akkurat 0,05 m unna teller; 0,06 m gjør ikke.
    expect(snapCorner(bathroom(), 2, { x: 2.45, y: 3 })).toEqual({ x: 2.4, y: 3 })
    expect(snapCorner(bathroom(), 2, { x: 2.46, y: 2.66 })).toEqual({ x: 2.46, y: 2.66 })
    // Uten nabo i nærheten: bare rutenettet.
    expect(snapCorner(bathroom(), 2, { x: 3.126, y: 3.333 })).toEqual({ x: 3.13, y: 3.33 })
  })

  it('ny vegglengde holder starten og flytter enden langs veggen — og hjørnet den ender i', () => {
    const longer = setWallLength(bathroom(), 'bad-n', 3)

    expect(wall(longer, 'bad-n').start).toEqual({ x: 0, y: 0 })
    expect(wall(longer, 'bad-n').end).toEqual({ x: 3, y: 0 })
    // Enden sto i hjørne 1: hjørnet og østveggens start følger med.
    expect(longer.outline[1]).toEqual({ x: 3, y: 0 })
    expect(wall(longer, 'bad-e').start).toEqual({ x: 3, y: 0 })
    expect(length(longer, 'bad-n')).toBeCloseTo(3, 9)

    // Sørveggen går mot venstre: starten (2,4, 2,6) står, enden flyttes.
    const shorter = setWallLength(bathroom(), 'bad-s', 2)
    expect(wall(shorter, 'bad-s').start).toEqual({ x: 2.4, y: 2.6 })
    expect(wall(shorter, 'bad-s').end).toEqual({ x: 0.4, y: 2.6 })
    expect(shorter.outline[3]).toEqual({ x: 0.4, y: 2.6 })
    expect(wall(shorter, 'bad-w').start).toEqual({ x: 0.4, y: 2.6 })
  })

  it('vegglengden holdes innenfor 0,1–200 m', () => {
    expect(length(setWallLength(bathroom(), 'bad-n', 0.01), 'bad-n')).toBeCloseTo(0.1, 9)
    expect(length(setWallLength(bathroom(), 'bad-n', 5000), 'bad-n')).toBeCloseTo(200, 9)

    const room = bathroom()
    expect(setWallLength(room, 'bad-n', 2.4)).toBe(room)
    expect(setWallLength(room, 'bad-n', Number.NaN)).toBe(room)
    expect(setWallLength(room, 'finnes-ikke', 3)).toBe(room)
  })

  it('en vegg som ikke ender i et hjørne flyttes alene', () => {
    const room = setWallLength(withLooseWall(), 'loose', 1.5)

    expect(wall(room, 'loose').end).toEqual({ x: 2, y: 1 })
    expect(room.outline).toEqual(bathroom().outline)
    expect(room.walls.slice(0, 4)).toEqual(bathroom().walls)
  })

  it('setter høyde og egen farge på én vegg', () => {
    const room = setWallColor(setWallHeight(bathroom(), 'bad-n', 2.75), 'bad-n', '#9FB1C1')

    expect(wall(room, 'bad-n')).toMatchObject({ height: 2.75, color: '#9fb1c1' })
    expect(wall(room, 'bad-e')).toMatchObject({ height: 2.4, color: null })
    expect(wall(setWallHeight(room, 'bad-n', null), 'bad-n').height).toBeNull()
    expect(wall(setWallHeight(room, 'bad-n', 100), 'bad-n').height).toBe(30)
    expect(wall(setWallColor(room, 'bad-n', null), 'bad-n').color).toBeNull()
    expect(setWallColor(room, 'bad-n', 'blue')).toBe(room)
  })
})

describe('floorPlanEditing: åpninger', () => {
  it('en ny åpning står midt på veggen i typens standardstørrelse', () => {
    const room = { ...bathroom(), openings: [] }

    const door = opening(addOpening(room, 'bad-n', 'door', 'ny'), 'ny')
    expect(door).toMatchObject({ kind: 'door', start: { x: 0.8, y: 0 }, end: { x: 1.6, y: 0 }, height: 2, sill: 0 })

    const window = opening(addOpening(room, 'bad-n', 'window', 'ny'), 'ny')
    expect(window).toMatchObject({ kind: 'window', start: { x: 0.7, y: 0 }, end: { x: 1.7, y: 0 }, height: 1.2, sill: 0.9 })

    const passage = opening(addOpening(room, 'bad-n', 'opening', 'ny'), 'ny')
    expect(passage).toMatchObject({ kind: 'opening', start: { x: 0.75, y: 0 }, end: { x: 1.65, y: 0 }, height: 2, sill: 0 })
  })

  it('en ny åpning får en egen id når ingen er gitt', () => {
    const room = addOpening(addOpening({ ...bathroom(), openings: [] }, 'bad-n', 'door'), 'bad-e', 'window')

    expect(room.openings).toHaveLength(2)
    expect(room.openings[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(room.openings[0].id).not.toBe(room.openings[1].id)
  })

  it('åpningen blir smalere på en kort vegg, og en vegg under 0,3 m får ingen', () => {
    const short = (wallLength: number): FloorPlanRoom => ({
      ...bathroom(),
      openings: [],
      walls: [{ id: 'kort', start: { x: 0, y: 0 }, end: { x: wallLength, y: 0 }, height: 2.4, color: null }],
    })

    // 0,5 m vegg: 0,05 m til hver ende gir en åpning på 0,4 m.
    expect(opening(addOpening(short(0.5), 'kort', 'door', 'ny'), 'ny')).toMatchObject({ start: { x: 0.05, y: 0 }, end: { x: 0.45, y: 0 } })
    expect(opening(addOpening(short(0.3), 'kort', 'window', 'ny'), 'ny')).toMatchObject({ start: { x: 0.05, y: 0 }, end: { x: 0.25, y: 0 } })

    const tooShort = short(0.29)
    expect(addOpening(tooShort, 'kort', 'door', 'ny')).toBe(tooShort)
    expect(addOpening(tooShort, 'finnes-ikke', 'door', 'ny')).toBe(tooShort)
  })

  it('en åpning skyves langs veggen sin, målt fra veggens start', () => {
    // Nordveggen går fra (0,0) til (2,4, 0).
    const room = addOpening({ ...bathroom(), openings: [] }, 'bad-n', 'door', 'ny')
    const moved = moveOpening(room, 'ny', 0.3)

    expect(opening(moved, 'ny')).toMatchObject({ start: { x: 0.3, y: 0 }, end: { x: 1.1, y: 0 } })
    expect(openingSeat(moved, opening(moved, 'ny'))?.width).toBeCloseTo(0.8, 9)
  })

  it('en åpning som skyves holder seg inne i veggen, 0,05 m fra hver ende', () => {
    const room = addOpening({ ...bathroom(), openings: [] }, 'bad-n', 'door', 'ny')

    expect(opening(moveOpening(room, 'ny', -5), 'ny')).toMatchObject({ start: { x: 0.05, y: 0 }, end: { x: 0.85, y: 0 } })
    expect(opening(moveOpening(room, 'ny', 99), 'ny')).toMatchObject({ start: { x: 1.55, y: 0 }, end: { x: 2.35, y: 0 } })

    // Vinduet i vestveggen er tegnet mot veggens retning: rekkefølgen på endene står.
    const window = opening(moveOpening(bathroom(), 'bad-window', 0), 'bad-window')
    expect(window.start).toEqual({ x: 0, y: 1.75 })
    expect(window.end).toEqual({ x: 0, y: 2.55 })

    const same = bathroom()
    expect(moveOpening(same, 'bad-window', 1)).toBe(same)
    expect(moveOpening(same, 'finnes-ikke', 1)).toBe(same)
  })

  it('ny bredde holder midtpunktet, og klemmes så åpningen står inne i veggen', () => {
    const room = addOpening({ ...bathroom(), openings: [] }, 'bad-n', 'door', 'ny')

    expect(opening(resizeOpening(room, 'ny', 1.2), 'ny')).toMatchObject({ start: { x: 0.6, y: 0 }, end: { x: 1.8, y: 0 } })
    // Midt på en 2,4 m vegg er det plass til 2,3 m.
    expect(opening(resizeOpening(room, 'ny', 10), 'ny')).toMatchObject({ start: { x: 0.05, y: 0 }, end: { x: 2.35, y: 0 } })
    // Aldri smalere enn 0,05 m.
    expect(openingSeat(room, opening(resizeOpening(room, 'ny', 0), 'ny'))?.width).toBeCloseTo(0.05, 1)

    // Nær en veggende er det mindre plass: midtpunktet 0,45 m fra starten gir høyst 0,8 m.
    const nearEnd = moveOpening(room, 'ny', 0.05)
    expect(opening(resizeOpening(nearEnd, 'ny', 2), 'ny')).toMatchObject({ start: { x: 0.05, y: 0 }, end: { x: 0.85, y: 0 } })
  })

  it('avstanden fra veggens start når midtpunktet dras til et punkt', () => {
    const room = addOpening({ ...bathroom(), openings: [] }, 'bad-n', 'door', 'ny')

    // Midtpunktet dratt til x = 1,5: nærmeste ende står 1,1 m fra veggens start.
    expect(openingDistanceAt(room, 'ny', { x: 1.5, y: 0.2 })).toBeCloseTo(1.1, 9)
    expect(openingDistanceAt(room, 'finnes-ikke', { x: 1, y: 0 })).toBeNull()
  })

  it('setter type, høyde og brystning, og sletter', () => {
    let room = setOpeningKind(bathroom(), 'bad-door', 'opening')
    expect(opening(room, 'bad-door').kind).toBe('opening')
    // Størrelsen står når typen byttes.
    expect(opening(room, 'bad-door')).toMatchObject({ start: { x: 0.8, y: 2.6 }, end: { x: 1.6, y: 2.6 }, height: 2 })
    expect(setOpeningKind(room, 'bad-door', 'skylight')).toBe(room)

    room = setOpeningSill(setOpeningHeight(room, 'bad-window', 1.25), 'bad-window', 0.85)
    expect(opening(room, 'bad-window')).toMatchObject({ height: 1.25, sill: 0.85 })
    expect(opening(setOpeningHeight(room, 'bad-window', null), 'bad-window').height).toBeNull()
    expect(opening(setOpeningSill(room, 'bad-window', -1), 'bad-window').sill).toBe(0)
    expect(opening(setOpeningHeight(room, 'bad-window', 0), 'bad-window').height).toBe(0.05)

    const without = deleteOpening(room, 'bad-door')
    expect(without.openings.map((candidate) => candidate.id)).toEqual(['bad-window'])
    expect(deleteOpening(without, 'bad-door')).toBe(without)
  })

  it('en åpning står på veggen midtpunktet er nærmest, innenfor 0,15 m', () => {
    const room = bathroom()

    expect(openingSeat(room, { start: { x: 1, y: 0.1 }, end: { x: 1.8, y: 0.1 } })?.wall.id).toBe('bad-n')
    expect(openingSeat(room, { start: { x: 1, y: 0.15 }, end: { x: 1.8, y: 0.15 } })?.wall.id).toBe('bad-n')
    expect(openingSeat(room, { start: { x: 1, y: 0.2 }, end: { x: 1.8, y: 0.2 } })).toBeNull()
  })
})

describe('floorPlanEditing: inventar', () => {
  it('nytt inventar står midt i rommet i typens standardstørrelse', () => {
    const room = addObject({ ...bathroom(), objects: [] }, 'bathtub', 'ny')

    // Høyden er ukjent til noen oppgir den; utformingen er ikke oppgitt, og inventaret står på gulvet.
    expect(object(room, 'ny')).toEqual({ id: 'ny', category: 'bathtub', center: { x: 1.2, y: 1.3 }, width: 0.75, depth: 1.6, rotation: 0, height: null, variant: null, elevation: null })
    expect(addObject({ ...bathroom(), objects: [] }, 'toilet').objects[0].id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('har en standardstørrelse for hver inventartype i kontrakten', () => {
    expect(Object.keys(OBJECT_DEFAULT_SIZES).sort()).toEqual([...FLOOR_PLAN_OBJECT_CATEGORIES].sort())
    expect(OBJECT_DEFAULT_SIZES).toMatchObject({
      toilet: { width: 0.4, depth: 0.65 },
      sink: { width: 0.6, depth: 0.5 },
      bathtub: { width: 0.75, depth: 1.6 },
      bed: { width: 1.6, depth: 2 },
      sofa: { width: 2, depth: 0.9 },
      table: { width: 1.2, depth: 0.8 },
      chair: { width: 0.5, depth: 0.5 },
      storage: { width: 1, depth: 0.6 },
      refrigerator: { width: 0.6, depth: 0.6 },
      stove: { width: 0.6, depth: 0.6 },
      oven: { width: 0.6, depth: 0.6 },
      dishwasher: { width: 0.6, depth: 0.6 },
      washer_dryer: { width: 0.6, depth: 0.6 },
      fireplace: { width: 1, depth: 0.5 },
      television: { width: 1.2, depth: 0.1 },
      stairs: { width: 1, depth: 2.5 },
    })
  })

  it('flytter, dreier og endrer størrelse og type', () => {
    let room = moveObject(bathroom(), 'object-sink', { x: 1.234, y: 0.456 })
    expect(object(room, 'object-sink').center).toEqual({ x: 1.23, y: 0.46 })

    room = rotateObject(room, 'object-sink', Math.PI)
    expect(object(room, 'object-sink').rotation).toBeCloseTo(Math.PI, 9)
    // En dreining ligger alltid i [0, 2π).
    expect(object(rotateObject(room, 'object-sink', -Math.PI / 2), 'object-sink').rotation).toBeCloseTo((3 * Math.PI) / 2, 9)
    expect(object(rotateObject(room, 'object-sink', 5 * Math.PI), 'object-sink').rotation).toBeCloseTo(Math.PI, 9)

    room = resizeObject(room, 'object-sink', { width: 0.8 })
    expect(object(room, 'object-sink')).toMatchObject({ width: 0.8, depth: 0.45 })
    expect(object(resizeObject(room, 'object-sink', { width: 0.001, depth: 99 }), 'object-sink')).toMatchObject({ width: 0.05, depth: 20 })

    room = setObjectCategory(room, 'object-sink', 'bathtub')
    // Størrelsen står når typen byttes.
    expect(object(room, 'object-sink')).toMatchObject({ category: 'bathtub', width: 0.8, depth: 0.45 })
    expect(setObjectCategory(room, 'object-sink', 'jacuzzi')).toBe(room)

    const same = bathroom()
    expect(moveObject(same, 'object-sink', { x: 0.9, y: 0.3 })).toBe(same)
    expect(resizeObject(same, 'object-sink', {})).toBe(same)
    expect(moveObject(same, 'finnes-ikke', { x: 1, y: 1 })).toBe(same)
  })

  it('setter høyden på inventaret, 0,05–20 m, eller ukjent (SIGN-1981)', () => {
    const room = setObjectHeight(bathroom(), 'object-sink', 0.853)

    expect(object(room, 'object-sink').height).toBe(0.85)
    // Bredde, dybde og plass står.
    expect(object(room, 'object-sink')).toMatchObject({ width: 0.6, depth: 0.45, center: { x: 0.9, y: 0.3 } })
    expect(object(setObjectHeight(room, 'object-sink', 0.001), 'object-sink').height).toBe(0.05)
    expect(object(setObjectHeight(room, 'object-sink', 99), 'object-sink').height).toBe(20)
    expect(object(setObjectHeight(room, 'object-sink', null), 'object-sink').height).toBeNull()

    expect(setObjectHeight(room, 'object-sink', 0.85)).toBe(room)
    expect(setObjectHeight(room, 'object-sink', Number.NaN)).toBe(room)
    expect(setObjectHeight(room, 'finnes-ikke', 1)).toBe(room)
  })

  it('«Snu 90°» dreier en kvart omdreining, og fire steg er tilbake der det startet', () => {
    let room = bathroom()
    const turns: number[] = []

    for (let step = 0; step < 4; step += 1) {
      room = turnObject(room, 'object-sink')
      turns.push(object(room, 'object-sink').rotation)
    }

    expect(turns[0]).toBeCloseTo(Math.PI / 2, 9)
    expect(turns[1]).toBeCloseTo(Math.PI, 9)
    expect(turns[2]).toBeCloseTo((3 * Math.PI) / 2, 9)
    expect(turns[3]).toBe(0)

    // Et møbel som står på skrå dreies også en kvart omdreining.
    const skewed = turnObject(rotateObject(bathroom(), 'object-sink', 0.3), 'object-sink')
    expect(object(skewed, 'object-sink').rotation).toBeCloseTo(0.3 + Math.PI / 2, 9)
  })

  it('«Bytt forside» dreier symbolet inne i samme flate, og fire steg er tilbake der det startet (SIGN-1987)', () => {
    // Servanten: 0,6 × 0,45 m rundt (0,9, 0,3), ikke dreid — baksiden mot nordveggen.
    const corners = (room: FloorPlanRoom): string[] => {
      const { center, width, depth, rotation } = object(room, 'object-sink')
      const cos = Math.cos(rotation)
      const sin = Math.sin(rotation)

      return [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]
        .map(([x, y]) => [center.x + (x * width * cos - y * depth * sin) / 2, center.y + (x * width * sin + y * depth * cos) / 2])
        .map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`)
        .sort()
    }
    /** Hvor baksiden (kanten ved −y i inventarets egen ramme) peker, i planen. */
    const back = (room: FloorPlanRoom): [number, number] => {
      const { rotation } = object(room, 'object-sink')

      return [Math.round(Math.sin(rotation)) + 0, Math.round(-Math.cos(rotation)) + 0]
    }

    let room = bathroom()
    const backs: [number, number][] = [back(room)]

    for (let step = 0; step < 4; step += 1) {
      const before = corners(room)

      room = faceObject(room, 'object-sink')
      // Flaten inventaret dekker er nøyaktig den samme …
      expect(corners(room)).toEqual(before)
      expect(object(room, 'object-sink').center).toEqual({ x: 0.9, y: 0.3 })
      backs.push(back(room))
    }

    // … men baksiden går rundt: nord, øst, sør, vest og nord igjen.
    expect(backs).toEqual([
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ])
    expect(object(room, 'object-sink')).toMatchObject({ width: 0.6, depth: 0.45, rotation: 0 })
    // Bredde og dybde bytter plass for hvert steg.
    expect(object(faceObject(bathroom(), 'object-sink'), 'object-sink')).toMatchObject({ width: 0.45, depth: 0.6 })
    expect(faceObject(bathroom(), 'finnes-ikke')).toEqual(bathroom())
  })

  it('utformingen er et valg typen må ha, og den følger ikke med til en type som ikke har den (SIGN-1987)', () => {
    const room = bathroom({ objects: [{ id: 'bord', category: 'table', center: { x: 1, y: 1 }, width: 0.9, depth: 0.9, rotation: 0, height: null }] })
    const round = setObjectVariant(room, 'bord', 'round')

    expect(object(round, 'bord').variant).toBe('round')
    // Det samme valget en gang til endrer ingenting.
    expect(setObjectVariant(round, 'bord', 'round')).toBe(round)
    // En utforming bordet ikke har, endrer ingenting: den gjettes ikke.
    expect(setObjectVariant(round, 'bord', 'armchair')).toBe(round)
    expect(setObjectVariant(round, 'bord', 'oval')).toBe(round)
    // «Ikke angitt».
    expect(object(setObjectVariant(round, 'bord', null), 'bord').variant).toBeNull()

    // Bordet blir en sofa: et rundt bord er ikke en rund sofa.
    expect(object(setObjectCategory(round, 'bord', 'sofa'), 'bord')).toMatchObject({ category: 'sofa', variant: null })
    // Et toalett har ingen utforminger.
    expect(setObjectVariant(bathroom(), 'object-toilet', 'round')).toEqual(bathroom())
  })

  it('høyden over gulvet kan settes og fjernes, innenfor 0–20 m (SIGN-1987)', () => {
    const raised = setObjectElevation(bathroom(), 'object-sink', 0.7)

    expect(object(raised, 'object-sink').elevation).toBe(0.7)
    expect(setObjectElevation(raised, 'object-sink', 0.7)).toBe(raised)
    expect(object(setObjectElevation(raised, 'object-sink', null), 'object-sink').elevation).toBeNull()
    // Klemt inn i området, og tull endrer ingenting.
    expect(object(setObjectElevation(raised, 'object-sink', -1), 'object-sink').elevation).toBe(0)
    expect(object(setObjectElevation(raised, 'object-sink', 25), 'object-sink').elevation).toBe(20)
    expect(setObjectElevation(raised, 'object-sink', Number.NaN)).toBe(raised)
  })

  it('sletter ett, alt i rommet og alt i planen', () => {
    const one = deleteObject(bathroom(), 'object-toilet')
    expect(one.objects.map((candidate) => candidate.id)).toEqual(['object-sink'])
    expect(deleteObject(one, 'object-toilet')).toBe(one)

    expect(removeAllObjects(bathroom()).objects).toEqual([])
    const empty = removeAllObjects(bathroom())
    expect(removeAllObjects(empty)).toBe(empty)

    const plan = removeAllObjectsInPlan(floorPlan())
    expect(plan.rooms.map((room) => room.objects.length)).toEqual([0, 0, 0])
    // Rom, vegger og åpninger står.
    expect(plan.rooms.map((room) => room.openings.length)).toEqual([2, 2, 2])
    expect(removeAllObjectsInPlan(plan)).toBe(plan)
  })
})

describe('floorPlanEditing: treff i tegningen', () => {
  const plan = floorPlan()
  const tolerance = 0.1

  it('hjørne foran åpning foran inventar foran vegg foran rom', () => {
    // Et hjørne: også veggene som møtes der er innenfor rekkevidde.
    expect(hitTest(plan, { x: 0.03, y: 0.04 }, tolerance)).toEqual({ kind: 'corner', roomId: 'room-bad', index: 0 })
    // En åpning: baddøra står i veggen mot gangen.
    expect(hitTest(plan, { x: 1.2, y: 2.62 }, tolerance)).toEqual({ kind: 'opening', roomId: 'room-bad', openingId: 'bad-door' })
    // Inventar inne i rommet.
    expect(hitTest(plan, { x: 0.9, y: 0.3 }, tolerance)).toEqual({ kind: 'object', roomId: 'room-bad', objectId: 'object-sink' })
    // En vegg, utenom åpningene.
    expect(hitTest(plan, { x: 1.2, y: 0.02 }, tolerance)).toEqual({ kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' })
    // Gulvet.
    expect(hitTest(plan, { x: 1.2, y: 1.6 }, tolerance)).toEqual({ kind: 'room', roomId: 'room-bad' })
    // Utenfor planen.
    expect(hitTest(plan, { x: 9, y: 9 }, tolerance)).toBeNull()
  })

  it('en åpning vinner over inventar som står inntil den, og inventar over veggen bak', () => {
    const room = bathroom({
      objects: [{ id: 'skap', category: 'storage', center: { x: 1.2, y: 2.45 }, width: 1, depth: 0.3, rotation: 0 }],
    })
    const single = { rooms: [room] }

    // Punktet er i skapet, 0,05 m fra døra og fra veggen: døra vinner.
    expect(hitTest(single, { x: 1.2, y: 2.55 }, tolerance)).toMatchObject({ kind: 'opening', openingId: 'bad-door' })
    // Til siden for døra: skapet vinner over veggen.
    expect(hitTest(single, { x: 1.69, y: 2.5 }, tolerance)).toMatchObject({ kind: 'object', objectId: 'skap' })
    // Utenfor skapet: veggen.
    expect(hitTest(single, { x: 2, y: 2.55 }, tolerance)).toMatchObject({ kind: 'wall', wallId: 'bad-s' })
  })

  it('treffer inventar som er dreid', () => {
    // Toalettet er 0,4 × 0,6 m dreid 90°: det dekker 0,6 m i x og 0,4 m i y rundt (2,0, 0,5).
    expect(hitTest(plan, { x: 1.75, y: 0.5 }, 0.01)).toMatchObject({ kind: 'object', objectId: 'object-toilet' })
    expect(hitTest(plan, { x: 2, y: 0.75 }, 0.01)).toEqual({ kind: 'room', roomId: 'room-bad' })
  })

  it('en vegg to rom deler går til rommet som er valgt, ellers til det første', () => {
    // Veggen mellom bad og kjøkken (x = 2,4), midt på.
    const point = { x: 2.4, y: 1.3 }

    expect(hitTest(plan, point, tolerance)).toEqual({ kind: 'wall', roomId: 'room-bad', wallId: 'bad-e' })
    expect(hitTest(plan, point, tolerance, 'room-kjokken')).toEqual({ kind: 'wall', roomId: 'room-kjokken', wallId: 'kjokken-w' })
    // Hjørnet badet og kjøkkenet deler.
    expect(hitTest(plan, { x: 2.4, y: 2.6 }, tolerance)).toEqual({ kind: 'corner', roomId: 'room-bad', index: 2 })
    expect(hitTest(plan, { x: 2.4, y: 2.6 }, tolerance, 'room-kjokken')).toEqual({ kind: 'corner', roomId: 'room-kjokken', index: 3 })
  })

  it('det nærmeste hjørnet vinner', () => {
    const rooms = [bathroom(), kitchen(), hall()]

    expect(hitTest({ rooms }, { x: 5.96, y: 4.17 }, tolerance)).toEqual({ kind: 'corner', roomId: 'room-gang', index: 2 })
  })

  it('vet om det som er valgt fortsatt finnes', () => {
    expect(selectionExists(plan, { kind: 'room', roomId: 'room-bad' })).toBe(true)
    expect(selectionExists(plan, { kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' })).toBe(true)
    expect(selectionExists(plan, { kind: 'corner', roomId: 'room-bad', index: 3 })).toBe(true)
    expect(selectionExists(plan, { kind: 'corner', roomId: 'room-bad', index: 4 })).toBe(false)
    expect(selectionExists(plan, { kind: 'opening', roomId: 'room-bad', openingId: 'kjokken-door' })).toBe(false)
    expect(selectionExists(plan, { kind: 'object', roomId: 'room-bad', objectId: 'object-sink' })).toBe(true)
    expect(selectionExists(plan, { kind: 'room', roomId: 'borte' })).toBe(false)
    expect(selectionExists(plan, null)).toBe(false)
  })
})
