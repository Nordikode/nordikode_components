import type { FloorPlanPoint, FloorPlanRoom } from './model'

/**
 * What a sketch has changed, as marks for the drawings (SIGN-2014).
 *
 * The server works out what differs between the rooms a sketch started from
 * (`baseRooms`) and the rooms as they are now (`rooms`), and answers it as
 * `changes`. This file only turns that list into something to draw — it
 * never compares the two documents itself, so Sign on the web, the Sign app
 * and the customer's offer always mark the same elements.
 *
 * An element is addressed by its type and id (`wall:<id>`). A type or a
 * change the app does not know is left unmarked; it is not guessed.
 */

/** What an element is (`elementType`). */
export const SKETCH_ELEMENT_TYPES = ['room', 'wall', 'opening', 'object'] as const
export type SketchElementType = (typeof SKETCH_ELEMENT_TYPES)[number]

export const toSketchElementType = (type: string | null | undefined): SketchElementType | null =>
  SKETCH_ELEMENT_TYPES.find((known) => known === type) ?? null

/** How an element differs from the rooms the sketch started from (`change`). */
export const SKETCH_CHANGES = ['added', 'removed', 'moved', 'changed'] as const
export type SketchChangeKind = (typeof SKETCH_CHANGES)[number]

export const toSketchChange = (change: string | null | undefined): SketchChangeKind | null =>
  SKETCH_CHANGES.find((known) => known === change) ?? null

/** How an element of the plan that is drawn differs from the base. */
export type FloorPlanMarkChange = 'added' | 'moved' | 'changed'

/** A base element drawn as a ghost under the plan, in the plan's own numbers (metres). */
export interface FloorPlanGhost {
  /** `sketchElementKey` of the element. */
  key: string
  /** `removed`: it is gone (dashed, the error tone). `moved`: where a moved element stood (faint, neutral). */
  change: 'removed' | 'moved'
  shape:
    | { kind: 'outline'; points: FloorPlanPoint[] }
    | { kind: 'line'; of: 'wall' | 'opening'; start: FloorPlanPoint; end: FloorPlanPoint }
    | { kind: 'box'; center: FloorPlanPoint; width: number; depth: number; rotation: number }
}

/** The `marks` of `FloorPlanDrawing`: everything the drawing shows on top of the plan itself. */
export interface FloorPlanMarks {
  /** The elements of the plan that is drawn, and how each differs from the base. Keyed by `sketchElementKey`. */
  elements: Record<string, FloorPlanMarkChange>
  /** Base elements drawn as ghosts: what was removed, and where what was moved stood. */
  ghosts: FloorPlanGhost[]
  /** Elements to draw attention to — the candidates of a question: a pulsing outline. */
  attention?: readonly string[]
  /** Elements the person has pointed at — the chips of the composer: an outline in the action colour. */
  picked?: readonly string[]
}

/** The key of one element: its type (`room`, `wall`, `opening`, `object`) and id. */
export const sketchElementKey = (elementType: string, elementId: string): string => `${elementType}:${elementId}`

interface SketchChangeLike {
  elementType: string
  elementId: string
  roomId?: string | null
  change: string
}

interface SketchLike {
  rooms: readonly FloorPlanRoom[]
  baseRooms: readonly FloorPlanRoom[]
  changes: readonly SketchChangeLike[]
}

const point = ({ x, y }: FloorPlanPoint): FloorPlanPoint => ({ x, y })

/** The shape a base element is drawn as; null when the element is not in the base rooms. */
const ghostShape = (rooms: readonly FloorPlanRoom[], elementType: SketchElementType, elementId: string): FloorPlanGhost['shape'] | null => {
  for (const room of rooms) {
    if (elementType === 'room') {
      if (room.id === elementId) {
        return { kind: 'outline', points: room.outline.map(point) }
      }

      continue
    }

    if (elementType === 'wall') {
      const wall = room.walls.find((candidate) => candidate.id === elementId)

      if (wall !== undefined) {
        return { kind: 'line', of: 'wall', start: point(wall.start), end: point(wall.end) }
      }
    } else if (elementType === 'opening') {
      const opening = room.openings.find((candidate) => candidate.id === elementId)

      if (opening !== undefined) {
        return { kind: 'line', of: 'opening', start: point(opening.start), end: point(opening.end) }
      }
    } else {
      const object = room.objects.find((candidate) => candidate.id === elementId)

      if (object !== undefined) {
        return { kind: 'box', center: point(object.center), width: object.width, depth: object.depth, rotation: object.rotation }
      }
    }
  }

  return null
}

/**
 * The marks for the «after» drawing of a sketch, built from the server's
 * `changes`: what is new or different is marked on the element itself, what
 * was removed is drawn as a ghost from the base rooms, and what was moved
 * gets a faint ghost where it stood.
 */
export const sketchMarks = (sketch: SketchLike): FloorPlanMarks => {
  const elements: Record<string, FloorPlanMarkChange> = {}
  const ghosts: FloorPlanGhost[] = []

  for (const entry of sketch.changes) {
    const elementType = toSketchElementType(entry.elementType)
    const change = toSketchChange(entry.change)

    if (elementType === null || change === null) {
      continue
    }

    const key = sketchElementKey(elementType, entry.elementId)

    if (change !== 'removed') {
      elements[key] = change
    }

    // A room that only changed name or colour has no other place to show; a moved or removed element has.
    if (change === 'removed' || change === 'moved') {
      const shape = ghostShape(sketch.baseRooms, elementType, entry.elementId)

      if (shape !== null) {
        ghosts.push({ key, change, shape })
      }
    }
  }

  return { elements, ghosts }
}

export interface SketchChangeCounts {
  /** What is new. */
  added: number
  /** What stands somewhere else. */
  moved: number
  /** What is changed in another way (a colour, a height, a size). */
  changed: number
  /** What is gone. */
  removed: number
  total: number
}

/** The four kinds of change, in the order the legend names them. */
export const SKETCH_CHANGE_TONES = ['added', 'moved', 'changed', 'removed'] as const
export type SketchChangeTone = (typeof SKETCH_CHANGE_TONES)[number]

/** The server's own summary of what a sketch has changed (`changeSummary`). */
export interface SketchChangeSummary {
  added: number
  moved: number
  changed: number
  removed: number
}

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)

/** How many elements of each kind the list of differences holds. A type or a change the app does not know is not counted. */
export const sketchChangeCounts = (changes: readonly Pick<SketchChangeLike, 'elementType' | 'change'>[]): SketchChangeCounts => {
  const counts: SketchChangeCounts = { added: 0, moved: 0, changed: 0, removed: 0, total: 0 }

  for (const entry of changes) {
    const change = toSketchChange(entry.change)

    if (toSketchElementType(entry.elementType) === null || change === null) {
      continue
    }

    counts[change] += 1
    counts.total += 1
  }

  return counts
}

/**
 * How much a sketch has changed, as the person asked for it — for the
 * legend, the cards and the text read aloud. The numbers are the server's
 * own summary (`changeSummary`): it counts what was asked for, so a wall two
 * rooms share that was removed is ONE removed wall, though it is two rows in
 * `changes` (one per room). `changes` is still what the drawing marks.
 * Without a summary — an older answer — the rows are counted.
 */
export const sketchChangeTotals = (sketch: {
  changes: readonly Pick<SketchChangeLike, 'elementType' | 'change'>[]
  changeSummary?: Partial<SketchChangeSummary> | null
}): SketchChangeCounts => {
  const summary = sketch.changeSummary

  if (summary === null || summary === undefined) {
    return sketchChangeCounts(sketch.changes)
  }

  const counts = { added: count(summary.added), moved: count(summary.moved), changed: count(summary.changed), removed: count(summary.removed) }

  return { ...counts, total: counts.added + counts.moved + counts.changed + counts.removed }
}

/** The marks of the 3D view: what is new (tinted) and what is gone (translucent ghosts). */
export interface SketchMarks3d {
  /** `sketchElementKey` of the walls, openings and objects that are new. */
  added: ReadonlySet<string>
  /** The base rooms, holding only the walls and objects that were removed. */
  removed: FloorPlanRoom[]
}

/**
 * The same changes for the 3D view: the keys of what is new, and the base
 * rooms reduced to the walls and objects that are gone, so the view can draw
 * them as ghosts where they stood.
 */
export const sketchMarks3d = (sketch: SketchLike): SketchMarks3d => {
  const added = new Set<string>()
  const removedWalls = new Set<string>()
  const removedObjects = new Set<string>()

  for (const entry of sketch.changes) {
    const elementType = toSketchElementType(entry.elementType)
    const change = toSketchChange(entry.change)

    if (elementType === null || change === null) {
      continue
    }

    if (change === 'added') {
      added.add(sketchElementKey(elementType, entry.elementId))
    } else if (change === 'removed' && elementType === 'wall') {
      removedWalls.add(entry.elementId)
    } else if (change === 'removed' && elementType === 'object') {
      removedObjects.add(entry.elementId)
    }
  }

  const removed = sketch.baseRooms
    .map((room) => ({
      ...room,
      // Only the geometry of what is gone: no openings to cut, no colours of its own.
      walls: room.walls.filter((wall) => removedWalls.has(wall.id)).map((wall) => ({ ...wall, color: null })),
      openings: [],
      objects: room.objects.filter((object) => removedObjects.has(object.id)),
      floorColor: null,
      wallColor: null,
      ceilingColor: null,
    }))
    .filter((room) => room.walls.length > 0 || room.objects.length > 0)

  return { added, removed }
}
