import { describe, expect, it } from 'vitest'
import { useFloorPlanEditor } from '../../src/floor-plan/useFloorPlanEditor'
import { removeAllObjectsInPlan, renamePlan, renameRoom, setCeilingHeight, setRoomFloorColor } from '../../src/floor-plan/floorPlanEditing'
import { toFloorPlanRoomInput } from '../../src/floor-plan/model'
import { floorPlan, type FixturePlan } from './support/floorPlanFixture'

// Redigeringen av én plantegning (SIGN-1980): planen, det valgte og
// angre/gjør om holdt sammen. Reglene selv har sine egne tester
// (`floorPlanEditing.test.ts`); her handler det om stegene.

// The editor as an app sets it up: the app says what it saves — here the
// plan's name and the rooms, as Sign's floor plans do (SIGN-2041).
const appEditor = () =>
  useFloorPlanEditor<FixturePlan>({ signature: (plan) => JSON.stringify({ name: plan.name, rooms: plan.rooms.map(toFloorPlanRoomInput) }) })

const loaded = () => {
  const editor = appEditor()
  editor.load(floorPlan())

  return editor
}

const room = (editor: ReturnType<typeof appEditor>, id: string) => editor.plan.value!.rooms.find((candidate) => candidate.id === id)!

describe('useFloorPlanEditor (SIGN-1980)', () => {
  it('starter uten plan, og en lastet plan er ikke ulagret', () => {
    const editor = appEditor()
    expect(editor.plan.value).toBeNull()
    expect(editor.dirty.value).toBe(false)

    editor.load(floorPlan())
    expect(editor.plan.value?.name).toBe('1. etasje')
    expect(editor.dirty.value).toBe(false)
    expect(editor.canUndo.value).toBe(false)
  })

  it('hver endring er ett steg som kan angres og gjøres om', () => {
    const editor = loaded()

    editor.editRoom('room-bad', (current) => renameRoom(current, 'Hovedbad'))
    editor.editRoom('room-bad', (current) => setRoomFloorColor(current, '#d8b98a'))

    expect(room(editor, 'room-bad')).toMatchObject({ name: 'Hovedbad', floorColor: '#d8b98a' })
    expect(editor.dirty.value).toBe(true)

    editor.undo()
    expect(room(editor, 'room-bad')).toMatchObject({ name: 'Hovedbad', floorColor: null })
    editor.undo()
    expect(room(editor, 'room-bad').name).toBe('Bad')
    // Angret helt tilbake: ingenting å lagre.
    expect(editor.dirty.value).toBe(false)
    expect(editor.canUndo.value).toBe(false)

    editor.redo()
    editor.redo()
    expect(room(editor, 'room-bad')).toMatchObject({ name: 'Hovedbad', floorColor: '#d8b98a' })
    expect(editor.canRedo.value).toBe(false)
  })

  it('without a signature of its own, what is saved is the rooms: a change of anything else on the plan is not unsaved (SIGN-2041)', () => {
    const editor = useFloorPlanEditor<FixturePlan>()
    editor.load(floorPlan())

    editor.apply((current) => renamePlan(current, '2. etasje'))
    expect(editor.plan.value?.name).toBe('2. etasje')
    expect(editor.dirty.value).toBe(false)

    editor.editRoom('room-bad', (current) => renameRoom(current, 'Hovedbad'))
    expect(editor.dirty.value).toBe(true)
  })

  it('planens navn er en endring som alt annet: ulagret, og kan angres', () => {
    const editor = loaded()
    const roomsBefore = editor.plan.value!.rooms

    editor.apply((current) => renamePlan(current, '2. etasje'))

    expect(editor.plan.value?.name).toBe('2. etasje')
    expect(editor.dirty.value).toBe(true)
    // Rommene er urørt: ingen mål regnes på nytt for et navnebytte.
    expect(editor.plan.value!.rooms.every((current, index) => current === roomsBefore[index])).toBe(true)

    editor.undo()
    expect(editor.plan.value?.name).toBe('1. etasje')
    expect(editor.dirty.value).toBe(false)

    editor.redo()
    expect(editor.plan.value?.name).toBe('2. etasje')
  })

  it('en endring som ikke endret noe er ikke et steg', () => {
    const editor = loaded()

    editor.editRoom('room-bad', (current) => renameRoom(current, 'Bad'))
    editor.editRoom('finnes-ikke', (current) => renameRoom(current, 'X'))

    expect(editor.canUndo.value).toBe(false)
    expect(editor.dirty.value).toBe(false)
  })

  it('et hjørne som dras legger seg på nabohjørnene, og hele draget er ett steg', () => {
    const editor = loaded()
    const corner = { kind: 'corner' as const, roomId: 'room-gang', index: 2 }

    editor.drag({ selection: corner, to: { x: 6.2, y: 4.4 } })
    editor.drag({ selection: corner, to: { x: 6.6, y: 4.7 } })
    // Nær nabohjørnets x (6,0 fra hjørnet over) og y (4,2 fra hjørnet til venstre): hjørnet legger seg der.
    editor.drag({ selection: corner, to: { x: 6.03, y: 4.83 } })

    expect(room(editor, 'room-gang').outline[2]).toEqual({ x: 6, y: 4.83 })
    // Veggene som møtes i hjørnet fulgte med.
    expect(room(editor, 'room-gang').walls.find((wall) => wall.id === 'gang-e')?.end).toEqual({ x: 6, y: 4.83 })

    editor.undo()
    expect(room(editor, 'room-gang').outline[2]).toEqual({ x: 6, y: 4.2 })
    expect(editor.canUndo.value).toBe(false)
  })

  it('drag av to ulike håndtak er to steg', () => {
    const editor = loaded()

    editor.drag({ selection: { kind: 'corner', roomId: 'room-gang', index: 2 }, to: { x: 6.5, y: 4.5 } })
    editor.drag({ selection: { kind: 'object', roomId: 'room-bad', objectId: 'object-sink' }, to: { x: 1.2, y: 1.2 } })

    editor.undo()
    expect(room(editor, 'room-bad').objects[1].center).toEqual({ x: 0.9, y: 0.3 })
    expect(room(editor, 'room-gang').outline[2]).toEqual({ x: 6.5, y: 4.5 })
  })

  it('en åpning som dras glir langs veggen sin og blir stående i den', () => {
    const editor = loaded()
    const door = { kind: 'opening' as const, roomId: 'room-bad', openingId: 'bad-door' }

    // Midtpunktet dras til x = 0,6 (og litt ut fra veggen): døra står 0,2–1,0.
    editor.drag({ selection: door, to: { x: 0.6, y: 2.2 } })
    expect(room(editor, 'room-bad').openings[0]).toMatchObject({ start: { x: 0.2, y: 2.6 }, end: { x: 1, y: 2.6 } })

    // Dratt langt forbi veggens ende: klemt inn, 0,05 m fra enden.
    editor.drag({ selection: door, to: { x: -3, y: 2.6 } })
    expect(room(editor, 'room-bad').openings[0]).toMatchObject({ start: { x: 0.05, y: 2.6 }, end: { x: 0.85, y: 2.6 } })
  })

  it('piltastene flytter det valgte hjørnet eller inventaret, og flere trykk er ett steg', () => {
    const editor = loaded()
    const sink = { kind: 'object' as const, roomId: 'room-bad', objectId: 'object-sink' }

    editor.nudge({ selection: sink, dx: 0.01, dy: 0 })
    editor.nudge({ selection: sink, dx: 0.01, dy: 0 })
    editor.nudge({ selection: sink, dx: 0, dy: -0.01 })
    expect(room(editor, 'room-bad').objects[1].center).toEqual({ x: 0.92, y: 0.29 })

    editor.nudge({ selection: { kind: 'corner', roomId: 'room-bad', index: 0 }, dx: -0.01, dy: 0 })
    expect(room(editor, 'room-bad').outline[0]).toEqual({ x: -0.01, y: 0 })

    editor.undo()
    editor.undo()
    expect(room(editor, 'room-bad').objects[1].center).toEqual({ x: 0.9, y: 0.3 })
    expect(editor.dirty.value).toBe(false)
  })

  it('et rom som endres får målene regnet på nytt for visning; de andre står', () => {
    const editor = loaded()
    const kitchenBefore = room(editor, 'room-kjokken')

    editor.editRoom('room-bad', (current) => setCeilingHeight(current, 3))

    expect(room(editor, 'room-bad').measurements).toMatchObject({ ceilingHeight: 3, wallAreaGross: 30, volume: 18.72, floorArea: 6.24 })
    expect(room(editor, 'room-kjokken')).toBe(kitchenBefore)
  })

  it('fjerner det valgte og velger rommet det sto i', () => {
    const editor = loaded()
    const door = { kind: 'opening' as const, roomId: 'room-bad', openingId: 'bad-door' }

    editor.select(door)
    editor.remove(door)

    expect(room(editor, 'room-bad').openings.map((opening) => opening.id)).toEqual(['bad-window'])
    expect(editor.selection.value).toEqual({ kind: 'room', roomId: 'room-bad' })

    editor.remove({ kind: 'object', roomId: 'room-bad', objectId: 'object-sink' })
    expect(room(editor, 'room-bad').objects.map((object) => object.id)).toEqual(['object-toilet'])

    // En vegg og et rom fjernes ikke herfra.
    const steps = editor.plan.value
    editor.remove({ kind: 'wall', roomId: 'room-bad', wallId: 'bad-n' })
    expect(editor.plan.value).toBe(steps)
  })

  it('en ny åpning eller et nytt inventar blir valgt', () => {
    const editor = loaded()

    editor.addOpening('room-bad', 'bad-n', 'window')
    const added = editor.selection.value
    expect(added).toMatchObject({ kind: 'opening', roomId: 'room-bad' })
    expect(room(editor, 'room-bad').openings).toHaveLength(3)
    expect(room(editor, 'room-bad').openings[2]).toMatchObject({ kind: 'window', start: { x: 0.7, y: 0 }, end: { x: 1.7, y: 0 } })

    editor.addObject('room-gang', 'storage')
    expect(editor.selection.value).toMatchObject({ kind: 'object', roomId: 'room-gang' })
    expect(room(editor, 'room-gang').objects[1]).toMatchObject({ category: 'storage', center: { x: 3, y: 3.4 }, width: 1, depth: 0.6 })

    // Et rom som ikke finnes: ingenting legges til, og valget står.
    editor.addObject('finnes-ikke', 'bed')
    expect(editor.selection.value).toMatchObject({ kind: 'object', roomId: 'room-gang' })
  })

  it('det valgte slippes når det ikke finnes lenger etter en angring', () => {
    const editor = loaded()

    editor.addObject('room-bad', 'bathtub')
    expect(editor.selection.value?.kind).toBe('object')

    editor.undo()
    expect(editor.selection.value).toBeNull()

    // Et valg som fortsatt finnes, står.
    editor.select({ kind: 'room', roomId: 'room-bad' })
    editor.apply(removeAllObjectsInPlan)
    editor.undo()
    expect(editor.selection.value).toEqual({ kind: 'room', roomId: 'room-bad' })
  })

  it('en ny lasting — lagret eller hentet på nytt — er et nytt utgangspunkt uten historikk', () => {
    const editor = loaded()

    editor.editRoom('room-bad', (current) => renameRoom(current, 'Hovedbad'))
    expect(editor.dirty.value).toBe(true)

    editor.load(editor.plan.value!)
    expect(editor.dirty.value).toBe(false)
    expect(editor.canUndo.value).toBe(false)
    expect(room(editor, 'room-bad').name).toBe('Hovedbad')
  })

  it('målene serveren regner er ikke en ulagret endring', () => {
    const editor = loaded()
    const answer = { ...floorPlan(), updatedAt: '2026-11-25T08:00:00Z' }
    answer.rooms = answer.rooms.map((current) => ({ ...current, measurements: { ...current.measurements, floorArea: 99 } }))

    editor.apply(() => answer)

    // Bare det som lagres teller: mål og tidsstempler er serverens.
    expect(editor.dirty.value).toBe(false)
  })
})

// SIGN-1982: å dele et rom og å slå to rom sammen er steg som alt annet.
describe('useFloorPlanEditor: dele og slå sammen rom (SIGN-1982)', () => {
  it('delingen velger to steder på omrisset; det andre deler rommet, og det nye rommet blir valgt', () => {
    const editor = loaded()

    expect(editor.pickSplitPoint({ x: 1.8, y: 0 }, 'Rom 4')).toBe('idle')

    editor.startSplit('room-bad')
    expect(editor.split.value).toEqual({ roomId: 'room-bad', from: null })
    expect(editor.selection.value).toEqual({ kind: 'room', roomId: 'room-bad' })

    // Det første stedet legges på veggen og huskes.
    expect(editor.pickSplitPoint({ x: 1.8, y: -0.4 }, 'Rom 4')).toBe('started')
    expect(editor.split.value).toEqual({ roomId: 'room-bad', from: { x: 1.8, y: 0 } })
    expect(editor.dirty.value).toBe(false)

    expect(editor.pickSplitPoint({ x: 1.8, y: 3 }, 'Rom 4')).toBe('split')
    expect(editor.split.value).toBeNull()
    expect(editor.plan.value!.rooms.map((candidate) => candidate.name)).toEqual(['Bad', 'Rom 4', 'Kjøkken', 'Gang'])
    expect(editor.selection.value).toMatchObject({ kind: 'room' })
    expect(room(editor, editor.selection.value!.roomId).name).toBe('Rom 4')
    // Begge rommene er målt på nytt for visning.
    expect(room(editor, 'room-bad').measurements.floorArea).toBe(4.68)
    expect(room(editor, editor.selection.value!.roomId).measurements).toMatchObject({ floorArea: 1.56, ceilingHeight: 2.4, volume: 3.74 })

    // Ett steg.
    editor.undo()
    expect(editor.plan.value!.rooms).toHaveLength(3)
    expect(editor.canUndo.value).toBe(false)
    expect(editor.selection.value).toBeNull()
  })

  it('en linje som ikke går gjennom rommet deler ingenting, og delingen står klar for et nytt forsøk', () => {
    const editor = loaded()
    editor.startSplit('room-bad')
    editor.pickSplitPoint({ x: 0.5, y: 0 }, 'Rom 4')

    expect(editor.pickSplitPoint({ x: 1.5, y: 0 }, 'Rom 4')).toBe('refused')
    expect(editor.split.value).toEqual({ roomId: 'room-bad', from: { x: 0.5, y: 0 } })
    expect(editor.dirty.value).toBe(false)
    expect(editor.canUndo.value).toBe(false)

    editor.cancelSplit()
    expect(editor.split.value).toBeNull()
  })

  it('delingen av et rom som ikke finnes starter ikke, og avbrytes når rommet blir borte', () => {
    const editor = loaded()

    editor.startSplit('finnes-ikke')
    expect(editor.split.value).toBeNull()

    expect(editor.splitRoom('room-bad', { x: 1.8, y: 0 }, { x: 1.8, y: 2.6 }, 'Rom 4')).toBe(true)
    const added = editor.selection.value!.roomId
    editor.startSplit(added)
    expect(editor.split.value).toEqual({ roomId: added, from: null })

    // Angringen tar bort rommet som var i ferd med å deles.
    editor.undo()
    expect(editor.split.value).toBeNull()
  })

  it('to rom som møtes slås sammen i ett steg; rom som ikke møtes gjør ingenting', () => {
    const editor = loaded()

    expect(editor.mergeRooms('room-bad', 'finnes-ikke')).toBe(false)
    expect(editor.dirty.value).toBe(false)

    expect(editor.mergeRooms('room-bad', 'room-kjokken')).toBe(true)
    expect(editor.plan.value!.rooms.map((candidate) => candidate.id)).toEqual(['room-bad', 'room-gang'])
    expect(editor.selection.value).toEqual({ kind: 'room', roomId: 'room-bad' })
    expect(room(editor, 'room-bad').measurements.floorArea).toBe(15.6)

    editor.undo()
    expect(editor.plan.value!.rooms).toHaveLength(3)
  })
})
