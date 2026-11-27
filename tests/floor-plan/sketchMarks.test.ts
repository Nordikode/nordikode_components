import { describe, expect, it } from 'vitest'
import { sketchChangeCounts, sketchChangeTotals, sketchElementKey, sketchMarks, sketchMarks3d } from '../../src/floor-plan/sketchMarks'
import { bathroom, hall, kitchen } from './support/floorPlanFixture'
import { sketch, untouchedSketch } from './support/sketchFixture'

// What a sketch has changed, as marks for the drawings (SIGN-2014). The
// server computes `changes`; the client only turns the list into something
// to draw — it never compares the two room documents itself.

describe('sketchMarks', () => {
  it('addresses an element by its type and id', () => {
    expect(sketchElementKey('wall', 'bad-e')).toBe('wall:bad-e')
  })

  it('marks what is new or different on the element, and draws what is gone as a ghost from the base rooms', () => {
    const marks = sketchMarks(sketch())

    // The column is new, the window is moved; removed elements are not in the rooms and get no mark of their own.
    expect(marks.elements).toEqual({ 'object:object-column': 'added', 'opening:kjokken-window': 'moved' })
    expect(marks.ghosts).toEqual([
      { key: 'wall:bad-e', change: 'removed', shape: { kind: 'line', of: 'wall', start: { x: 2.4, y: 0 }, end: { x: 2.4, y: 2.6 } } },
      { key: 'wall:kjokken-w', change: 'removed', shape: { kind: 'line', of: 'wall', start: { x: 2.4, y: 2.6 }, end: { x: 2.4, y: 0 } } },
      // A moved element gets a ghost where it stood: the window's place in the base rooms.
      { key: 'opening:kjokken-window', change: 'moved', shape: { kind: 'line', of: 'opening', start: { x: 3.4, y: 0 }, end: { x: 5, y: 0 } } },
    ])
  })

  it('draws a removed room as its outline and a removed object as its box', () => {
    const marks = sketchMarks({
      rooms: [bathroom(), kitchen()],
      baseRooms: [bathroom(), kitchen(), hall()],
      changes: [
        { elementType: 'room', elementId: 'room-gang', roomId: 'room-gang', change: 'removed' },
        { elementType: 'object', elementId: 'object-storage', roomId: 'room-gang', change: 'removed' },
      ],
    })

    expect(marks.elements).toEqual({})
    expect(marks.ghosts[0]).toEqual({ key: 'room:room-gang', change: 'removed', shape: { kind: 'outline', points: hall().outline } })
    expect(marks.ghosts[1]).toEqual({
      key: 'object:object-storage',
      change: 'removed',
      shape: { kind: 'box', center: { x: 0.8, y: 3.95 }, width: 1.2, depth: 0.4, rotation: 0 },
    })
  })

  it('a changed element is marked without a ghost: it stands where it stood', () => {
    const marks = sketchMarks({ ...sketch(), changes: [{ elementType: 'wall', elementId: 'gang-n', roomId: 'room-gang', change: 'changed' }] })

    expect(marks.elements).toEqual({ 'wall:gang-n': 'changed' })
    expect(marks.ghosts).toEqual([])
  })

  it('leaves a type or a change it does not know unmarked — it is not guessed', () => {
    const marks = sketchMarks({
      ...sketch(),
      changes: [
        { elementType: 'roof', elementId: 'r1', roomId: null, change: 'added' },
        { elementType: 'wall', elementId: 'gang-n', roomId: 'room-gang', change: 'painted' },
      ],
    })

    expect(marks).toEqual({ elements: {}, ghosts: [] })
  })

  it('a removed element that is not in the base rooms gets no ghost', () => {
    const marks = sketchMarks({ ...sketch(), changes: [{ elementType: 'wall', elementId: 'unknown-wall', roomId: 'room-bad', change: 'removed' }] })

    expect(marks.ghosts).toEqual([])
  })

  it('an untouched sketch has nothing to mark', () => {
    expect(sketchMarks(untouchedSketch())).toEqual({ elements: {}, ghosts: [] })
  })
})

describe('sketchChangeCounts', () => {
  it('counts the rows of each kind', () => {
    expect(sketchChangeCounts(sketch().changes)).toEqual({ added: 1, moved: 1, changed: 0, removed: 2, total: 4 })
    expect(sketchChangeCounts([{ elementType: 'wall', change: 'changed' }])).toEqual({ added: 0, moved: 0, changed: 1, removed: 0, total: 1 })
    // What the app does not know is not counted.
    expect(sketchChangeCounts([{ elementType: 'roof', change: 'added' }, { elementType: 'wall', change: 'painted' }]).total).toBe(0)
  })
})

describe('sketchChangeTotals', () => {
  it('uses the server\'s own summary — what the person asked for — not the number of rows', () => {
    // One wall between two rooms was removed: two rows in `changes` (one per room), one wall to the person.
    const totals = sketchChangeTotals({ changes: sketch().changes, changeSummary: { added: 1, moved: 1, changed: 0, removed: 1 } })

    expect(totals).toEqual({ added: 1, moved: 1, changed: 0, removed: 1, total: 3 })
  })

  it('counts the rows when the answer has no summary', () => {
    expect(sketchChangeTotals({ changes: sketch().changes })).toEqual({ added: 1, moved: 1, changed: 0, removed: 2, total: 4 })
    expect(sketchChangeTotals({ changes: sketch().changes, changeSummary: null }).total).toBe(4)
  })

  it('takes nothing but whole, positive numbers from the summary', () => {
    const totals = sketchChangeTotals({ changes: [], changeSummary: { added: 2.9, moved: -1, changed: Number.NaN, removed: undefined } })

    expect(totals).toEqual({ added: 2, moved: 0, changed: 0, removed: 0, total: 2 })
  })
})

describe('sketchMarks3d', () => {
  it('gives the keys of what is new and the base rooms reduced to the walls and objects that are gone', () => {
    const marks = sketchMarks3d(sketch())

    expect([...marks.added]).toEqual(['object:object-column'])
    expect(marks.removed.map((room) => [room.id, room.walls.map((wall) => wall.id), room.objects.length, room.openings.length])).toEqual([
      ['room-bad', ['bad-e'], 0, 0],
      ['room-kjokken', ['kjokken-w'], 0, 0],
    ])
  })

  it('has nothing for a sketch where only something is moved', () => {
    const marks = sketchMarks3d({ ...sketch(), changes: [{ elementType: 'opening', elementId: 'kjokken-window', roomId: 'room-kjokken', change: 'moved' }] })

    expect(marks.added.size).toBe(0)
    expect(marks.removed).toEqual([])
  })
})
