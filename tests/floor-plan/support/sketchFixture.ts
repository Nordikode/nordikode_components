import type { FloorPlanRoom } from '../../../src/floor-plan/model'
import { bathroom, hall, kitchen } from './floorPlanFixture'

/**
 * What a sketch has changed, as the server answers it (SIGN-2014), made
 * from the floor plan of the fixture (bathroom and kitchen side by side, the
 * hall under them) with three things changed:
 *
 *  - the wall between the bathroom and the kitchen is removed (both rooms'
 *    own wall on that line: `bad-e` and `kjokken-w`),
 *  - a column is added in the kitchen (`object-column`),
 *  - the kitchen window is moved 40 cm to the right (`kjokken-window`).
 *
 * `changes` is what the server computed from the two documents — the client
 * never works it out itself. Only what the drawings read is here; the rest
 * of a sketch (conversation, steps, pictures) belongs to the apps.
 */
export interface FixtureSketch {
  rooms: FloorPlanRoom[]
  baseRooms: FloorPlanRoom[]
  changes: { elementType: string; elementId: string; roomId: string | null; change: string }[]
  changeSummary: { added: number; moved: number; changed: number; removed: number }
}

export const sketchRooms = (): FloorPlanRoom[] => [
  bathroom({ walls: bathroom().walls.filter((wall) => wall.id !== 'bad-e') }),
  kitchen({
    walls: kitchen().walls.filter((wall) => wall.id !== 'kjokken-w'),
    openings: kitchen().openings.map((opening) =>
      opening.id === 'kjokken-window' ? { ...opening, start: { x: 3.8, y: 0 }, end: { x: 5.4, y: 0 } } : opening,
    ),
    objects: [
      ...kitchen().objects,
      { id: 'object-column', category: 'column', center: { x: 2.4, y: 1.3 }, width: 0.2, depth: 0.2, rotation: 0, height: 2.4, variant: null, elevation: null },
    ],
  }),
  hall(),
]

export const sketchChanges = (): FixtureSketch['changes'] => [
  { elementType: 'wall', elementId: 'bad-e', roomId: 'room-bad', change: 'removed' },
  { elementType: 'wall', elementId: 'kjokken-w', roomId: 'room-kjokken', change: 'removed' },
  { elementType: 'object', elementId: 'object-column', roomId: 'room-kjokken', change: 'added' },
  { elementType: 'opening', elementId: 'kjokken-window', roomId: 'room-kjokken', change: 'moved' },
]

export const sketch = (overrides: Partial<FixtureSketch> = {}): FixtureSketch => ({
  rooms: sketchRooms(),
  baseRooms: [bathroom(), kitchen(), hall()],
  changes: sketchChanges(),
  // What the person asked for: the wall between the bathroom and the kitchen is ONE wall, though it is two rows in `changes`.
  changeSummary: { added: 1, moved: 1, changed: 0, removed: 1 },
  ...overrides,
})

/** A sketch that is just made from the floor plan: nothing is changed yet. */
export const untouchedSketch = (overrides: Partial<FixtureSketch> = {}): FixtureSketch =>
  sketch({
    rooms: [bathroom(), kitchen(), hall()],
    changes: [],
    changeSummary: { added: 0, moved: 0, changed: 0, removed: 0 },
    ...overrides,
  })
