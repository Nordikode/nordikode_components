import { describe, expect, it } from 'vitest'
import type { FloorPlanDocument, FloorPlanPoint, FloorPlanRoom, FloorPlanWall } from '../../src/floor-plan/model'
import {
  addOpening,
  addWallProfilePoint,
  doorHingeSide,
  doorLeaf,
  doorOpensInward,
  mergeRooms,
  mergeableRoomIds,
  moveWallProfilePoint,
  openingRoomSide,
  outlineSpot,
  removeWallProfilePoint,
  setCeilingHeight,
  setDoorHinge,
  setDoorHingeSide,
  setDoorOpensInward,
  setDoorSwing,
  setOpeningKind,
  setWallHeight,
  setWallProfile,
  setWallProfileHeight,
  sliceProfile,
  splitRoom,
  wallProfile,
} from '../../src/floor-plan/floorPlanEditing'
import { doorSwing, polygonArea, roomMeasurements } from '../../src/floor-plan/floorPlanGeometry'
import { bathroom, floorPlan, hall, kitchen } from './support/floorPlanFixture'

// Redigeringsreglene fra SIGN-1982: veggens overkant under skråtak, dørens
// hengsel og slag, og å dele et rom i to eller slå to rom sammen. De samme
// reglene er skrevet i Swift for Sign-appen (`FloorPlanEditing`), og testene
// der prøver de samme tilfellene mot de samme svarene.
// Badet er 2,4 × 2,6 m med hjørnene (0,0) (2,4,0) (2,4,2,6) (0,2,6), en dør
// 0,8 m i sørveggen (fra x = 0,8 til 1,6) og et vindu i vestveggen.

const wall = (room: FloorPlanRoom, id: string): FloorPlanWall => room.walls.find((candidate) => candidate.id === id)!
const opening = (room: FloorPlanRoom, id: string) => room.openings.find((candidate) => candidate.id === id)!
const room = (plan: FloorPlanDocument, id: string): FloorPlanRoom => plan.rooms.find((candidate) => candidate.id === id)!
const point = (x: number, y: number): FloorPlanPoint => ({ x, y })
const profile = (...pairs: [number, number][]) => pairs.map(([at, height]) => ({ at, height }))
const ids = (prefix = 'new'): (() => string) => {
  let count = 0

  return () => `${prefix}-${(count += 1)}`
}
const corners = (outline: readonly FloorPlanPoint[]): string[] => outline.map(({ x, y }) => `${x},${y}`).sort()

/** Et loftsrom 6 × 4 m under møne: knevegger 1,0 m langs x, gavlvegger med mønet 3,0 m over midten. */
const attic = (): FloorPlanRoom => {
  const gable = profile([0, 1], [0.5, 3], [1, 1])

  return {
    ...bathroom(),
    id: 'room-loft',
    name: 'Loft',
    category: null,
    outline: [point(0, 0), point(6, 0), point(6, 4), point(0, 4)],
    walls: [
      { id: 'loft-n', start: point(0, 0), end: point(6, 0), height: 1, profile: null, color: null },
      { id: 'loft-e', start: point(6, 0), end: point(6, 4), height: 3, profile: gable, color: '#aabbcc' },
      { id: 'loft-s', start: point(6, 4), end: point(0, 4), height: 1, profile: null, color: null },
      { id: 'loft-w', start: point(0, 4), end: point(0, 0), height: 3, profile: gable, color: null },
    ],
    openings: [],
    objects: [],
  }
}

describe('veggens overkant under skråtak (SIGN-1982)', () => {
  it('en vannrett vegg er to punkter i veggens høyde, og en vegg uten høyde har ingen overkant', () => {
    expect(wallProfile(wall(bathroom(), 'bad-n'))).toEqual(profile([0, 2.4], [1, 2.4]))
    expect(wallProfile({ height: null, profile: null })).toBeNull()
    expect(wallProfile(wall(attic(), 'loft-e'))).toEqual(profile([0, 1], [0.5, 3], [1, 1]))
  })

  it('ulik høyde i endene gjør veggen skrå, og veggens høyde er det høyeste punktet', () => {
    const sloped = setWallProfileHeight(bathroom(), 'bad-n', 0, 1.2)

    expect(wall(sloped, 'bad-n').profile).toEqual(profile([0, 1.2], [1, 2.4]))
    expect(wall(sloped, 'bad-n').height).toBe(2.4)

    const higher = setWallProfileHeight(sloped, 'bad-n', 1, 3.456)

    // På hele centimeter.
    expect(wall(higher, 'bad-n').profile).toEqual(profile([0, 1.2], [1, 3.46]))
    expect(wall(higher, 'bad-n').height).toBe(3.46)
  })

  it('samme høyde i alle punktene er en vegg med én høyde igjen', () => {
    const sloped = setWallProfileHeight(bathroom(), 'bad-n', 0, 1.2)
    const level = setWallProfileHeight(sloped, 'bad-n', 0, 2.4)

    expect(wall(level, 'bad-n').profile).toBeNull()
    expect(wall(level, 'bad-n').height).toBe(2.4)
  })

  it('høyden klemmes til 0–30 m, og taket kan gå helt ned til gulvet', () => {
    const toFloor = setWallProfileHeight(bathroom(), 'bad-n', 0, -3)
    const tooHigh = setWallProfileHeight(bathroom(), 'bad-n', 1, 99)

    expect(wall(toFloor, 'bad-n').profile).toEqual(profile([0, 0], [1, 2.4]))
    expect(wall(tooHigh, 'bad-n').profile).toEqual(profile([0, 2.4], [1, 30]))
    expect(wall(tooHigh, 'bad-n').height).toBe(30)
  })

  it('et knekkpunkt legges midt på det lengste strekket, i høyden overkanten har der', () => {
    const sloped = setWallProfileHeight(bathroom(), 'bad-n', 0, 1.2)
    const withPoint = addWallProfilePoint(sloped, 'bad-n')

    expect(wall(withPoint, 'bad-n').profile).toEqual(profile([0, 1.2], [0.5, 1.8], [1, 2.4]))

    // Punktet får en annen høyde: en gavlvegg.
    const gable = setWallProfileHeight(setWallProfileHeight(withPoint, 'bad-n', 1, 3), 'bad-n', 2, 1.2)
    expect(wall(gable, 'bad-n').profile).toEqual(profile([0, 1.2], [0.5, 3], [1, 1.2]))
    expect(wall(gable, 'bad-n').height).toBe(3)

    // Det neste havner midt på det første av de to like lange strekkene.
    expect(wall(addWallProfilePoint(gable, 'bad-n'), 'bad-n').profile).toEqual(profile([0, 1.2], [0.25, 2.1], [0.5, 3], [1, 1.2]))
  })

  it('en vannrett vegg får ikke knekkpunkt, og tolv punkter er det meste', () => {
    const level = bathroom()
    expect(addWallProfilePoint(level, 'bad-n')).toBe(level)

    const full = setWallProfile(
      bathroom(),
      'bad-n',
      Array.from({ length: 12 }, (_, index) => ({ at: index / 11, height: 1 + index / 10 })).map((entry, index) => (index === 11 ? { ...entry, at: 1 } : entry)),
    )
    expect(wall(full, 'bad-n').profile).toHaveLength(12)
    expect(addWallProfilePoint(full, 'bad-n')).toBe(full)
  })

  it('et knekkpunkt flyttes langs veggen, men aldri forbi naboene, og endene står', () => {
    const gable = setWallProfile(bathroom(), 'bad-n', profile([0, 1.2], [0.5, 3], [1, 1.2]))

    expect(wall(moveWallProfilePoint(gable, 'bad-n', 1, 0.25), 'bad-n').profile).toEqual(profile([0, 1.2], [0.25, 3], [1, 1.2]))
    expect(wall(moveWallProfilePoint(gable, 'bad-n', 1, 7), 'bad-n').profile).toEqual(profile([0, 1.2], [0.999, 3], [1, 1.2]))
    expect(wall(moveWallProfilePoint(gable, 'bad-n', 1, -7), 'bad-n').profile).toEqual(profile([0, 1.2], [0.001, 3], [1, 1.2]))
    expect(moveWallProfilePoint(gable, 'bad-n', 0, 0.3)).toBe(gable)
    expect(moveWallProfilePoint(gable, 'bad-n', 2, 0.3)).toBe(gable)
  })

  it('et knekkpunkt kan fjernes, endene ikke', () => {
    const gable = setWallProfile(bathroom(), 'bad-n', profile([0, 1.2], [0.5, 3], [1, 2]))

    expect(wall(removeWallProfilePoint(gable, 'bad-n', 1), 'bad-n').profile).toEqual(profile([0, 1.2], [1, 2]))
    expect(wall(removeWallProfilePoint(gable, 'bad-n', 1), 'bad-n').height).toBe(2)
    expect(removeWallProfilePoint(gable, 'bad-n', 0)).toBe(gable)
    expect(removeWallProfilePoint(gable, 'bad-n', 2)).toBe(gable)
  })

  it('punkter som ikke er en overkant, endrer ingenting', () => {
    const before = bathroom()

    for (const invalid of [
      profile([0, 1.2]),
      profile([0.1, 1.2], [1, 2.4]),
      profile([0, 1.2], [0.9, 2.4]),
      profile([0, 1.2], [0.6, 2], [0.6, 2.2], [1, 2.4]),
      profile([0, 0], [1, 0]),
      profile([0, Number.NaN], [1, 2.4]),
    ]) {
      expect(setWallProfile(before, 'bad-n', invalid), JSON.stringify(invalid)).toBe(before)
    }

    expect(setWallProfile(before, 'finnes-ikke', profile([0, 1], [1, 2]))).toBe(before)
    expect(setWallProfileHeight(before, 'bad-n', 5, 2)).toBe(before)
    expect(setWallProfileHeight(before, 'bad-n', 0, Number.NaN)).toBe(before)
  })

  it('én høyde på veggen, eller én takhøyde i rommet, gjør overkanten vannrett igjen', () => {
    const sloped = attic()

    const oneWall = setWallHeight(sloped, 'loft-e', 2.4)
    expect(wall(oneWall, 'loft-e')).toMatchObject({ height: 2.4, profile: null })
    expect(wall(oneWall, 'loft-w').profile).not.toBeNull()

    const flat = setCeilingHeight(sloped, 2.4)
    expect(flat.walls.every((candidate) => candidate.height === 2.4 && candidate.profile === null)).toBe(true)

    // Uten overkant står veggen i høyden den hadde: det høyeste punktet.
    expect(wall(setWallProfile(sloped, 'loft-e', null), 'loft-e')).toMatchObject({ height: 3, profile: null })
  })

  it('et stykke av en overkant er en egen overkant fra 0 til 1', () => {
    const gable = wall(attic(), 'loft-e')

    expect(sliceProfile(gable, 0, 0.25)).toEqual(profile([0, 1], [1, 2]))
    expect(sliceProfile(gable, 0.25, 1)).toEqual(profile([0, 2], [0.3333, 3], [1, 1]))
    // Baklengs: fra veggens slutt til en kvart inn.
    expect(sliceProfile(gable, 1, 0.25)).toEqual(profile([0, 1], [0.6667, 3], [1, 2]))
    expect(sliceProfile(wall(bathroom(), 'bad-n'), 0, 0.5)).toBeNull()
  })
})

describe('dører: hengsel og slag (SIGN-1982)', () => {
  // Døra i badets sørvegg går fra (0,8, 2,6) til (1,6, 2,6): mot høyre i
  // tegningen. Rommet ligger over linja, altså til venstre for den.

  it('rommet ligger på den ene siden av åpningen', () => {
    expect(openingRoomSide(bathroom(), opening(bathroom(), 'bad-door'))).toBe('left')
    // Samme åpning tegnet andre veien: rommet er til høyre.
    expect(openingRoomSide(bathroom(), { start: point(1.6, 2.6), end: point(0.8, 2.6) })).toBe('right')
    // Vinduet i vestveggen går nedover; rommet er til venstre for den som går nedover.
    expect(openingRoomSide(bathroom(), opening(bathroom(), 'bad-window'))).toBe('left')
  })

  it('en dør som ikke sier noe, står som den alltid har vært tegnet: hengslet i starten, inn mot rommet', () => {
    const door = opening(bathroom(), 'bad-door')

    expect(doorLeaf(bathroom(), door)).toEqual({ hinge: 'start', swing: 'left' })
    expect(doorOpensInward(bathroom(), door)).toBe(true)
    // Sett fra rommet, med ansiktet mot døra (ned i tegningen), er x = 0,8 til høyre.
    expect(doorHingeSide(bathroom(), door)).toBe('right')
  })

  it('hengselet byttes til den andre enden, og slaget sies samtidig', () => {
    const edited = setDoorHinge(bathroom(), 'bad-door', 'end')

    expect(opening(edited, 'bad-door')).toMatchObject({ hinge: 'end', swing: 'left' })
    expect(doorHingeSide(edited, opening(edited, 'bad-door'))).toBe('left')
    expect(setDoorHinge(edited, 'bad-door', 'end')).toBe(edited)
  })

  it('slaget byttes til den andre siden, og hengselet sies samtidig', () => {
    const edited = setDoorSwing(bathroom(), 'bad-door', 'right')

    expect(opening(edited, 'bad-door')).toMatchObject({ hinge: 'start', swing: 'right' })
    expect(doorOpensInward(edited, opening(edited, 'bad-door'))).toBe(false)
  })

  it('slik et menneske sier det: hengslene til venstre eller høyre sett fra rommet, og inn eller ut', () => {
    const left = setDoorHingeSide(bathroom(), 'bad-door', 'left')
    expect(opening(left, 'bad-door')).toMatchObject({ hinge: 'end', swing: 'left' })

    const right = setDoorHingeSide(left, 'bad-door', 'right')
    expect(opening(right, 'bad-door')).toMatchObject({ hinge: 'start', swing: 'left' })

    const out = setDoorOpensInward(bathroom(), 'bad-door', false)
    expect(opening(out, 'bad-door')).toMatchObject({ hinge: 'start', swing: 'right' })
    expect(opening(setDoorOpensInward(out, 'bad-door', true), 'bad-door')).toMatchObject({ hinge: 'start', swing: 'left' })
  })

  it('en ukjent verdi, et vindu og en åpning som ikke finnes endrer ingenting', () => {
    const before = bathroom()

    expect(setDoorHinge(before, 'bad-door', 'left')).toBe(before)
    expect(setDoorSwing(before, 'bad-door', 'inward')).toBe(before)
    expect(setDoorHinge(before, 'bad-window', 'end')).toBe(before)
    expect(setDoorSwing(before, 'bad-window', 'right')).toBe(before)
    expect(setDoorHingeSide(before, 'bad-window', 'left')).toBe(before)
    expect(setDoorOpensInward(before, 'finnes-ikke', false)).toBe(before)
  })

  it('en ny dør sier selv hvordan den står; et vindu sier ingenting', () => {
    const withDoor = addOpening(bathroom(), 'bad-n', 'door', 'ny-dor')
    const withWindow = addOpening(bathroom(), 'bad-n', 'window', 'nytt-vindu')

    // Nordveggen går mot høyre, og rommet ligger under den: til høyre.
    expect(opening(withDoor, 'ny-dor')).toMatchObject({ hinge: 'start', swing: 'right' })
    expect(doorOpensInward(withDoor, opening(withDoor, 'ny-dor'))).toBe(true)
    expect(opening(withWindow, 'nytt-vindu')).toMatchObject({ hinge: null, swing: null })
  })

  it('bare en dør har blad: typen bestemmer om hengsel og slag finnes', () => {
    const door = setOpeningKind(bathroom(), 'bad-window', 'door')
    expect(opening(door, 'bad-window')).toMatchObject({ kind: 'door', hinge: 'start', swing: 'left' })

    const turned = setDoorHinge(setDoorSwing(bathroom(), 'bad-door', 'right'), 'bad-door', 'end')
    expect(opening(setOpeningKind(turned, 'bad-door', 'opening'), 'bad-door')).toMatchObject({ kind: 'opening', hinge: null, swing: null })
  })

  it('tegnet følger det døra sier: bladet står ut fra hengselet på slagsiden', () => {
    const start = point(0.8, 2.6)
    const end = point(1.6, 2.6)
    const middle = point(1.2, 1.3)

    // Uten feltene: som før, fra starten og inn i rommet (oppover).
    expect(doorSwing(start, end, middle)).toEqual({ leaf: { from: start, to: point(0.8, 1.8) }, arc: 'M 0.8 1.8 A 0.8 0.8 0 0 1 1.6 2.6' })
    expect(doorSwing(start, end, middle, { hinge: null, swing: null })).toEqual(doorSwing(start, end, middle))
    // Hengslet i slutten, inn i rommet.
    expect(doorSwing(start, end, middle, { hinge: 'end', swing: 'left' })).toEqual({ leaf: { from: end, to: point(1.6, 1.8) }, arc: 'M 1.6 1.8 A 0.8 0.8 0 0 0 0.8 2.6' })
    // Hengslet i slutten, ut av rommet (nedover).
    expect(doorSwing(start, end, middle, { hinge: 'end', swing: 'right' })).toEqual({ leaf: { from: end, to: point(1.6, 3.4) }, arc: 'M 1.6 3.4 A 0.8 0.8 0 0 1 0.8 2.6' })
    // Slaget gjelder også uten rommets midte, og en ukjent verdi er «ikke oppgitt».
    expect(doorSwing(start, end, null, { hinge: 'start', swing: 'right' })!.leaf.to).toEqual(point(0.8, 3.4))
    expect(doorSwing(start, end, middle, { hinge: 'sideways', swing: 'up' })).toEqual(doorSwing(start, end, middle))
  })
})

describe('dele et rom i to (SIGN-1982)', () => {
  it('et sted på omrisset er nærmeste punkt på en kant, eller hjørnet når det er nær nok', () => {
    expect(outlineSpot(bathroom(), point(1.8, -5))).toEqual({ edge: 0, point: point(1.8, 0), corner: null })
    expect(outlineSpot(bathroom(), point(1.234, 0.4))).toEqual({ edge: 0, point: point(1.23, 0), corner: null })
    expect(outlineSpot(bathroom(), point(2.37, 0.01))).toEqual({ edge: 0, point: point(2.4, 0), corner: 1 })
    expect(outlineSpot(bathroom(), point(0.04, 2.7))).toMatchObject({ point: point(0, 2.6), corner: 3 })
    expect(outlineSpot({ outline: [point(0, 0), point(1, 0)] }, point(0.5, 0))).toBeNull()
  })

  it('et sted havner aldri i en dør eller et vindu: det flyttes 0,05 m utenfor den nærmeste enden av åpningen', () => {
    const room = bathroom()

    // Døra i sørveggen dekker x = 0,8–1,6. Sørkanten går fra (2,4, 2,6) mot (0, 2,6).
    expect(outlineSpot(room, point(1.0, 2.7))?.point).toEqual(point(0.75, 2.6))
    expect(outlineSpot(room, point(1.5, 2.7))?.point).toEqual(point(1.65, 2.6))
    // Midt i døra er det like langt: enden nærmest kantens start vinner.
    expect(outlineSpot(room, point(1.2, 2.7))?.point).toEqual(point(1.65, 2.6))
    // Rett utenfor åpningen, nærmere enn 0,05 m, flyttes også.
    expect(outlineSpot(room, point(1.62, 2.7))?.point).toEqual(point(1.65, 2.6))
    // Vinduet i vestveggen dekker y = 0,8–1,6; kanten går fra (0, 2,6) mot (0, 0).
    expect(outlineSpot(room, point(-0.1, 1.5))?.point).toEqual(point(0, 1.65))
    // Utenfor åpningene står stedet der det ble satt, og uten åpninger er regelen som før.
    expect(outlineSpot(room, point(2.0, 2.7))?.point).toEqual(point(2, 2.6))
    expect(outlineSpot({ outline: room.outline }, point(1.2, 2.7))?.point).toEqual(point(1.2, 2.6))

    // En åpning helt inntil et hjørne skyver stedet til hjørnet, aldri forbi det.
    const cornerDoor = bathroom({ openings: [{ ...room.openings[0], start: point(0.02, 2.6), end: point(0.82, 2.6) }] })
    expect(outlineSpot(cornerDoor, point(0.3, 2.7))).toMatchObject({ point: point(0, 2.6), corner: 3 })
  })

  it('en skillelinje som siktes midt i et vindu, deler rommet ved siden av vinduet', () => {
    const split = splitRoom(floorPlan(), 'room-kjokken', point(4.2, -1), point(4.2, 9), { name: 'Rom 4', roomId: 'room-ny', newId: ids() })

    // Vinduet i kjøkkenets nordvegg dekker x = 3,4–5,0: midt i vinduet er det like langt til begge ender, og linja legger seg 0,05 m utenfor enden nærmest kantens start.
    const rooms = [room(split, 'room-kjokken'), room(split, 'room-ny')]
    expect(rooms.flatMap((candidate) => candidate.outline).filter((corner) => corner.y === 0 && corner.x > 2.4 && corner.x < 6).map((corner) => corner.x)).toEqual([3.35, 3.35])
    // Vinduet står helt på veggen i rommet det havnet i.
    const owner = rooms.find((candidate) => candidate.openings.some((entry) => entry.id === 'kjokken-window'))!
    const xs = owner.walls.filter((entry) => entry.start.y === 0 && entry.end.y === 0).flatMap((entry) => [entry.start.x, entry.end.x])
    expect(Math.min(...xs)).toBeLessThanOrEqual(3.4)
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(5)
  })

  it('skillelinja deler omriss, vegger, åpninger og inventar på de to rommene', () => {
    const plan = floorPlan()
    const split = splitRoom(plan, 'room-bad', point(1.8, -1), point(1.8, 9), { name: 'Rom 4', roomId: 'room-ny', newId: ids() })

    expect(split.rooms.map((candidate) => candidate.id)).toEqual(['room-bad', 'room-ny', 'room-kjokken', 'room-gang'])

    // Det største rommet (vest, 1,8 × 2,6 m) beholder id, navn, romtype og farger.
    const kept = room(split, 'room-bad')
    expect(kept).toMatchObject({ name: 'Bad', category: 'bathroom' })
    expect(kept.outline).toEqual([point(1.8, 2.6), point(0, 2.6), point(0, 0), point(1.8, 0)])
    expect(kept.walls).toEqual([
      { id: 'bad-n', start: point(0, 0), end: point(1.8, 0), height: 2.4, profile: null, color: null },
      { id: 'new-2', start: point(1.8, 2.6), end: point(0, 2.6), height: 2.4, profile: null, color: null },
      { id: 'bad-w', start: point(0, 2.6), end: point(0, 0), height: 2.4, profile: null, color: null },
      // Skilleveggen, i rommets takhøyde.
      { id: 'new-4', start: point(1.8, 2.6), end: point(1.8, 0), height: 2.4, profile: null, color: null },
    ])
    expect(kept.openings.map((candidate) => candidate.id)).toEqual(['bad-door', 'bad-window'])
    expect(kept.objects.map((candidate) => candidate.id)).toEqual(['object-sink'])

    // Det nye rommet (øst, 0,6 × 2,6 m) har navnet det fikk, samme farger og ingen romtype.
    const added = room(split, 'room-ny')
    expect(added).toMatchObject({ name: 'Rom 4', category: null, floorColor: null })
    expect(added.outline).toEqual([point(1.8, 0), point(2.4, 0), point(2.4, 2.6), point(1.8, 2.6)])
    expect(added.walls).toEqual([
      { id: 'new-1', start: point(1.8, 0), end: point(2.4, 0), height: 2.4, profile: null, color: null },
      { id: 'bad-e', start: point(2.4, 0), end: point(2.4, 2.6), height: 2.4, profile: null, color: null },
      { id: 'bad-s', start: point(2.4, 2.6), end: point(1.8, 2.6), height: 2.4, profile: null, color: null },
      { id: 'new-3', start: point(1.8, 0), end: point(1.8, 2.6), height: 2.4, profile: null, color: null },
    ])
    expect(added.openings).toEqual([])
    expect(added.objects.map((candidate) => candidate.id)).toEqual(['object-toilet'])
    // Ikke målt ennå: den som viser rommet regner målene av geometrien.
    expect(Object.values(added.measurements).every((value) => value === null)).toBe(true)

    // Gulvene til sammen er det gamle gulvet, og planen som kom inn er urørt.
    expect(roomMeasurements(kept).floorArea).toBe(4.68)
    expect(roomMeasurements(added).floorArea).toBe(1.56)
    expect(plan.rooms).toHaveLength(3)
    expect(room(plan, 'room-bad').walls).toHaveLength(4)
  })

  it('fargene følger med til begge rommene', () => {
    const plan = floorPlan({ rooms: [bathroom({ floorColor: '#d8b98a', wallColor: '#f4f1ea', ceilingColor: '#ffffff' })] })
    const split = splitRoom(plan, 'room-bad', point(1.8, 0), point(1.8, 2.6), { name: 'Rom 2', roomId: 'room-ny', newId: ids() })

    expect(room(split, 'room-ny')).toMatchObject({ floorColor: '#d8b98a', wallColor: '#f4f1ea', ceilingColor: '#ffffff' })
    expect(room(split, 'room-bad')).toMatchObject({ floorColor: '#d8b98a', wallColor: '#f4f1ea', ceilingColor: '#ffffff' })
  })

  it('en linje fra hjørne til hjørne deler rommet uten å dele en vegg', () => {
    const split = splitRoom(floorPlan(), 'room-bad', point(0, 0), point(2.4, 2.6), { name: 'Rom 4', roomId: 'room-ny', newId: ids() })

    expect(room(split, 'room-bad').outline).toEqual([point(0, 0), point(2.4, 0), point(2.4, 2.6)])
    expect(room(split, 'room-ny').outline).toEqual([point(2.4, 2.6), point(0, 2.6), point(0, 0)])
    expect(room(split, 'room-bad').walls.map((candidate) => candidate.id)).toEqual(['bad-n', 'bad-e', 'new-1'])
    expect(room(split, 'room-ny').walls.map((candidate) => candidate.id)).toEqual(['bad-s', 'bad-w', 'new-2'])
  })

  it('rommet kan deles flere ganger', () => {
    const once = splitRoom(floorPlan(), 'room-bad', point(1.8, 0), point(1.8, 2.6), { name: 'Rom 4', roomId: 'room-ny', newId: ids('a') })
    const twice = splitRoom(once, 'room-bad', point(0, 1.3), point(1.8, 1.3), { name: 'Rom 5', roomId: 'room-ny-2', newId: ids('b') })

    expect(twice.rooms.map((candidate) => candidate.id)).toEqual(['room-bad', 'room-ny-2', 'room-ny', 'room-kjokken', 'room-gang'])
    expect(twice.rooms.slice(0, 3).reduce((sum, candidate) => sum + polygonArea(candidate.outline), 0)).toBeCloseTo(6.24, 10)
    // Skilleveggen fra første deling ble selv delt i to av den andre.
    expect(room(twice, 'room-bad').walls.concat(room(twice, 'room-ny-2').walls).filter((candidate) => candidate.start.x === 1.8 && candidate.end.x === 1.8)).toHaveLength(2)
  })

  it('under skråtak får skilleveggen takets høyde langs linja, og gavlveggen deles med overkanten sin', () => {
    const plan = floorPlan({ rooms: [attic()] })

    // På tvers av mønet, 2 m inn: skilleveggen er en gavl.
    const across = splitRoom(plan, 'room-loft', point(2, 0), point(2, 4), { name: 'Loft 2', roomId: 'room-ny', newId: ids() })
    const divider = room(across, 'room-loft').walls.at(-1)!

    expect(divider).toMatchObject({ height: 3, profile: profile([0, 1], [0.5, 3], [1, 1]) })
    expect(roomMeasurements(room(across, 'room-loft')).volume).toBe(32)
    expect(roomMeasurements(room(across, 'room-ny')).volume).toBe(16)

    // Langs mønet, 1 m fra kneveggen: skilleveggen er 2 m høy hele veien.
    const along = splitRoom(plan, 'room-loft', point(0, 1), point(6, 1), { name: 'Kott', roomId: 'room-kott', newId: ids() })
    const loft = room(along, 'room-loft')
    const closet = room(along, 'room-kott')

    expect(loft.walls.at(-1)).toMatchObject({ height: 2, profile: null })
    expect(closet.walls.at(-1)).toMatchObject({ height: 2, profile: null })
    // Gavlveggen i øst er delt en kvart inn: 1–2 m i kottet, 2–3–1 m i loftet.
    expect(closet.walls.find((candidate) => candidate.start.x === 6 && candidate.end.x === 6)).toMatchObject({ height: 2, profile: profile([0, 1], [1, 2]), color: '#aabbcc' })
    expect(loft.walls.find((candidate) => candidate.start.x === 6 && candidate.end.x === 6)).toMatchObject({ height: 3, profile: profile([0, 2], [0.3333, 3], [1, 1]), color: '#aabbcc' })
    // 6 × (1 × 1,5) under skråtaket i kottet, og resten av de 48 m³ i loftet.
    expect(roomMeasurements(closet).volume).toBe(9)
    expect(roomMeasurements(loft).volume).toBe(39)
    expect(roomMeasurements(closet)).toMatchObject({ ceilingHeight: 2, ceilingHeightMin: 1 })
  })

  it('en linje som ikke går gjennom rommet, deler ingenting', () => {
    const plan = floorPlan()
    const options = { name: 'Rom 4', roomId: 'room-ny', newId: ids() }

    // Langs én og samme kant, og fra et hjørne til nabohjørnet.
    expect(splitRoom(plan, 'room-bad', point(0.5, 0), point(1.5, 0), options)).toBe(plan)
    expect(splitRoom(plan, 'room-bad', point(0, 0), point(2.4, 0), options)).toBe(plan)
    // Samme sted to ganger.
    expect(splitRoom(plan, 'room-bad', point(1.2, 0), point(1.2, 0.01), options)).toBe(plan)
    // Et rom som ikke finnes, et tomt navn og et navn som er for langt.
    expect(splitRoom(plan, 'finnes-ikke', point(1.8, 0), point(1.8, 2.6), options)).toBe(plan)
    expect(splitRoom(plan, 'room-bad', point(1.8, 0), point(1.8, 2.6), { ...options, name: '  ' })).toBe(plan)
    expect(splitRoom(plan, 'room-bad', point(1.8, 0), point(1.8, 2.6), { ...options, name: 'a'.repeat(121) })).toBe(plan)

    // I et vinkelrom: linja går utenfor rommet forbi det innvendige hjørnet.
    const angle = { ...bathroom(), outline: [point(0, 0), point(5, 0), point(5, 2), point(3, 2), point(3, 4), point(0, 4)], walls: [], openings: [], objects: [] }
    const anglePlan = floorPlan({ rooms: [angle] })
    expect(splitRoom(anglePlan, 'room-bad', point(4, 2), point(1, 4), options)).toBe(anglePlan)
    // … men en linje som holder seg inne, deler det.
    expect(splitRoom(anglePlan, 'room-bad', point(3, 2), point(0, 2), options).rooms).toHaveLength(2)
  })

  it('en plan med femti rom kan ikke få flere', () => {
    const rooms = Array.from({ length: 50 }, (_, index) => bathroom({ id: `room-${index}` }))
    const plan = floorPlan({ rooms })

    expect(splitRoom(plan, 'room-0', point(1.8, 0), point(1.8, 2.6), { name: 'Rom 51' })).toBe(plan)
  })
})

describe('slå to rom sammen (SIGN-1982)', () => {
  it('rommene som møtes langs en kant kan slås sammen', () => {
    expect(mergeableRoomIds(floorPlan(), 'room-bad')).toEqual(['room-kjokken', 'room-gang'])
    expect(mergeableRoomIds(floorPlan(), 'room-gang')).toEqual(['room-bad', 'room-kjokken'])
    expect(mergeableRoomIds(floorPlan({ rooms: [bathroom()] }), 'room-bad')).toEqual([])
    expect(mergeableRoomIds(floorPlan(), 'finnes-ikke')).toEqual([])
  })

  it('å slå sammen det som ble delt, gir rommet tilbake', () => {
    const split = splitRoom(floorPlan(), 'room-bad', point(1.8, 0), point(1.8, 2.6), { name: 'Rom 4', roomId: 'room-ny', newId: ids() })
    const merged = mergeRooms(split, 'room-bad', 'room-ny', ids('m'))
    const bath = room(merged, 'room-bad')

    expect(merged.rooms.map((candidate) => candidate.id)).toEqual(['room-bad', 'room-kjokken', 'room-gang'])
    expect(corners(bath.outline)).toEqual(corners(bathroom().outline))
    expect(polygonArea(bath.outline)).toBeCloseTo(6.24, 10)
    // Skilleveggene er borte; nord- og sørveggen står igjen som to stykker hver.
    expect(bath.walls.map((candidate) => candidate.id)).toEqual(['bad-n', 'new-2', 'bad-w', 'new-1', 'bad-e', 'bad-s'])
    expect(bath.openings.map((candidate) => candidate.id)).toEqual(['bad-door', 'bad-window'])
    expect(bath.objects.map((candidate) => candidate.id).sort()).toEqual(['object-sink', 'object-toilet'])
    expect(roomMeasurements(bath)).toMatchObject({ floorArea: 6.24, perimeter: 10, wallAreaGross: 24, volume: 14.98 })
  })

  it('to rom med felles vegg blir ett: veggen mellom dem er borte', () => {
    const merged = mergeRooms(floorPlan(), 'room-bad', 'room-kjokken', ids())
    const bath = room(merged, 'room-bad')

    expect(merged.rooms.map((candidate) => candidate.id)).toEqual(['room-bad', 'room-gang'])
    expect(bath).toMatchObject({ name: 'Bad', category: 'bathroom' })
    expect(corners(bath.outline)).toEqual(corners([point(0, 0), point(6, 0), point(6, 2.6), point(0, 2.6)]))
    expect(bath.walls.map((candidate) => candidate.id)).toEqual(['bad-n', 'bad-s', 'bad-w', 'kjokken-n', 'kjokken-e', 'kjokken-s'])
    expect(bath.openings.map((candidate) => candidate.id)).toEqual(['bad-door', 'bad-window', 'kjokken-door', 'kjokken-window'])
    expect(bath.objects).toHaveLength(4)
    expect(roomMeasurements(bath).floorArea).toBe(15.6)
  })

  it('møtes rommene bare langs en del av en vegg, kortes veggen, og døra mellom dem er borte', () => {
    const merged = mergeRooms(floorPlan(), 'room-bad', 'room-gang', ids())
    const bath = room(merged, 'room-bad')

    expect(merged.rooms.map((candidate) => candidate.id)).toEqual(['room-bad', 'room-kjokken'])
    expect(corners(bath.outline)).toEqual(corners([point(0, 0), point(2.4, 0), point(2.4, 2.6), point(6, 2.6), point(6, 4.2), point(0, 4.2)]))
    expect(polygonArea(bath.outline)).toBeCloseTo(15.84, 10)
    // Badets sørvegg er borte; gangens nordvegg står igjen der kjøkkenet ligger.
    expect(bath.walls.map((candidate) => candidate.id)).toEqual(['bad-n', 'bad-e', 'bad-w', 'gang-n', 'gang-e', 'gang-s', 'gang-w'])
    expect(wall(bath, 'gang-n')).toMatchObject({ start: point(2.4, 2.6), end: point(6, 2.6), height: 2.4 })
    expect(bath.openings.map((candidate) => candidate.id)).toEqual(['bad-window', 'gang-door', 'gang-passage'])
  })

  it('en vegg mellom to skannede rom (opptil 0,4 m) regnes som felles', () => {
    const square = (id: string, fromX: number, toX: number): FloorPlanRoom => ({
      ...bathroom(),
      id,
      outline: [point(fromX, 0), point(toX, 0), point(toX, 3), point(fromX, 3)],
      walls: [
        { id: `${id}-w`, start: point(fromX, 3), end: point(fromX, 0), height: 2.4, profile: null, color: null },
        { id: `${id}-e`, start: point(toX, 0), end: point(toX, 3), height: 2.4, profile: null, color: null },
      ],
      openings: [],
      objects: [],
    })
    const plan = floorPlan({ rooms: [square('a', 0, 3), square('b', 3.1, 6)] })
    const merged = mergeRooms(plan, 'a', 'b', ids())

    expect(corners(room(merged, 'a').outline)).toEqual(corners([point(0, 0), point(6, 0), point(6, 3), point(0, 3)]))
    expect(room(merged, 'a').walls.map((candidate) => candidate.id)).toEqual(['a-w', 'b-e'])

    // Samme rom med omrisset tegnet andre veien rundt gir samme resultat.
    const reversed = floorPlan({ rooms: [square('a', 0, 3), { ...square('b', 3.1, 6), outline: [...square('b', 3.1, 6).outline].reverse() }] })
    expect(corners(room(mergeRooms(reversed, 'a', 'b', ids()), 'a').outline)).toEqual(corners([point(0, 0), point(6, 0), point(6, 3), point(0, 3)]))

    // En halv meter mellom rommene er to rom.
    const apart = floorPlan({ rooms: [square('a', 0, 3), square('b', 3.5, 6)] })
    expect(mergeRooms(apart, 'a', 'b', ids())).toBe(apart)
    expect(mergeableRoomIds(apart, 'a')).toEqual([])
  })

  it('rom som ikke møtes, et rom med seg selv og rom som ikke finnes endrer ingenting', () => {
    const far = floorPlan({ rooms: [bathroom(), { ...kitchen(), outline: kitchen().outline.map(({ x, y }) => point(x + 5, y)) }, hall()] })

    expect(mergeRooms(far, 'room-bad', 'room-kjokken')).toBe(far)
    expect(mergeRooms(far, 'room-bad', 'room-bad')).toBe(far)
    expect(mergeRooms(far, 'room-bad', 'finnes-ikke')).toBe(far)
    expect(mergeRooms(far, 'finnes-ikke', 'room-bad')).toBe(far)
  })

  it('under skråtak beholder veggene overkanten sin, og stykket som blir stående får sin del av den', () => {
    const split = splitRoom(floorPlan({ rooms: [attic()] }), 'room-loft', point(0, 1), point(6, 1), { name: 'Kott', roomId: 'room-kott', newId: ids() })
    const merged = mergeRooms(split, 'room-loft', 'room-kott', ids('m'))
    const loft = room(merged, 'room-loft')

    expect(merged.rooms).toHaveLength(1)
    expect(corners(loft.outline)).toEqual(corners(attic().outline))
    // Samme rom som før delingen, målt på nytt.
    expect(roomMeasurements(loft)).toMatchObject({ floorArea: 24, ceilingArea: 33.94, volume: 48, wallAreaGross: 28, ceilingHeight: 3, ceilingHeightMin: 1 })
  })
})
