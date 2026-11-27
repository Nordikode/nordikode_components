/**
 * The room document (SIGN-794, shared since SIGN-2041): the rooms of a floor
 * plan or a sketch, exactly as the API answers them. One or more rooms lie in
 * ONE common coordinate system — metres, seen from above, x to the right and
 * y downwards — so an SVG draws the numbers as they are.
 *
 * Everything is SI (metres, m², m³), and nothing is stored with a unit. What
 * a thing is stands in its type field (`kind`, `category`) — never in a
 * name. A type the code does not know is drawn neutrally; it is not guessed.
 *
 * The apps get the document from their own API (Sign: the floor plans in
 * cases, Sketch: the sketches) and hand it to the drawing and the editing
 * rules here. The types below are that document, field for field: an app
 * whose API type drifts from them fails its own type check. They are type
 * aliases, not interfaces, so they behave exactly like the object types an
 * API client generates.
 */
export type FloorPlanPoint = {
  x: number
  y: number
}

/** One point on a wall's upper edge (SIGN-1982): how far along the wall (0–1), and the height there. */
export type FloorPlanWallProfilePoint = {
  at: number
  height: number
}

export type FloorPlanWall = {
  id: string
  start: FloorPlanPoint
  end: FloorPlanPoint
  /** Metres. Null = not measured. */
  height: number | null
  /** The wall's upper edge when it is not level; null = level at `height`. */
  profile: FloorPlanWallProfilePoint[] | null
  /** `#rrggbb`. Null = the room's wall colour. */
  color: string | null
}

export type FloorPlanOpening = {
  id: string
  /** `door`, `window` or `opening` — see `toFloorPlanOpeningKind`. */
  kind: string
  start: FloorPlanPoint
  end: FloorPlanPoint
  height: number | null
  /** Metres from the floor to the lower edge. */
  sill: number | null
  /** For a door: the end it is hinged at — see `toFloorPlanDoorHinge`. */
  hinge: string | null
  /** For a door: the side it opens to — see `toFloorPlanDoorSwing`. */
  swing: string | null
}

export type FloorPlanObject = {
  id: string
  /** See `toFloorPlanObjectCategory`. */
  category: string
  center: FloorPlanPoint
  width: number
  depth: number
  /** Radians. */
  rotation: number
  height: number | null
  /** Which form of its category the object is — see `toFloorPlanObjectVariant`. */
  variant: string | null
  /** Metres from the floor to the object's underside. Null = it stands on the floor. */
  elevation: number | null
}

/** The measurements of one room, computed by the server from the geometry. Null = not measured, never 0. */
export type FloorPlanMeasurements = {
  floorArea: number | null
  wallArea: number | null
  wallAreaGross: number | null
  ceilingArea: number | null
  perimeter: number | null
  ceilingHeight: number | null
  ceilingHeightMin: number | null
  volume: number | null
}

export type FloorPlanRoom = {
  id: string
  name: string
  /** See `toFloorPlanRoomCategory`. */
  category: string | null
  floorColor: string | null
  wallColor: string | null
  ceilingColor: string | null
  /** The floor as a polygon, in order. */
  outline: FloorPlanPoint[]
  walls: FloorPlanWall[]
  openings: FloorPlanOpening[]
  objects: FloorPlanObject[]
  measurements: FloorPlanMeasurements
}

/**
 * What the drawing, the 3D view and the editing rules need of a plan: its
 * rooms. The app's own plan type (with id, name, timestamps …) is passed as
 * it is — everything here that changes a plan gives the same type back.
 */
export type FloorPlanDocument = {
  rooms: FloorPlanRoom[]
}

/** One room as it is saved: the document without the measurements, which the server computes. */
export type FloorPlanRoomInput = {
  id: string
  name: string
  category: string | null
  floorColor: string | null
  wallColor: string | null
  ceilingColor: string | null
  outline: FloorPlanPoint[]
  walls: FloorPlanWall[]
  openings: FloorPlanOpening[]
  objects: FloorPlanObject[]
}

/** Åpningstypene tegningen har egne tegn for; alt annet tegnes som en nøytral åpning. */
export const FLOOR_PLAN_OPENING_KINDS = ['door', 'window', 'opening'] as const
export type FloorPlanOpeningKind = (typeof FLOOR_PLAN_OPENING_KINDS)[number]

export const toFloorPlanOpeningKind = (kind: string | null | undefined): FloorPlanOpeningKind | null =>
  FLOOR_PLAN_OPENING_KINDS.find((known) => known === kind) ?? null

/**
 * Hvilken ende av åpningen en dør er hengslet i, og hvilken side den slår
 * mot (SIGN-1982): venstre eller høyre for linja fra åpningens start til
 * slutt, slik planen er tegnet (x mot høyre, y nedover). Med retningen
 * (dx, dy) er venstre den siden (dy, −dx) peker mot. Nøklene eies av koden;
 * en verdi appen ikke kjenner, er «ikke oppgitt».
 */
export const FLOOR_PLAN_DOOR_HINGES = ['start', 'end'] as const
export type FloorPlanDoorHinge = (typeof FLOOR_PLAN_DOOR_HINGES)[number]

export const toFloorPlanDoorHinge = (hinge: string | null | undefined): FloorPlanDoorHinge | null =>
  FLOOR_PLAN_DOOR_HINGES.find((known) => known === hinge) ?? null

export const FLOOR_PLAN_DOOR_SWINGS = ['left', 'right'] as const
export type FloorPlanDoorSwing = (typeof FLOOR_PLAN_DOOR_SWINGS)[number]

export const toFloorPlanDoorSwing = (swing: string | null | undefined): FloorPlanDoorSwing | null =>
  FLOOR_PLAN_DOOR_SWINGS.find((known) => known === swing) ?? null

/** Antall åpninger av én type i rommet — telt på typefeltet, aldri på navn. */
export const countOpenings = (room: Pick<FloorPlanRoom, 'openings'>, kind: FloorPlanOpeningKind): number =>
  room.openings.filter((opening) => opening.kind === kind).length

/** Et mål som faktisk er målt: et tall, ikke null og ikke NaN. Null er «ikke målt», aldri 0. */
export const measured = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * Samlet gulvareal for plantegningen. Mangler ett rom arealet, finnes ikke
 * summen: et tall som bare gjelder noen av rommene ville sett ut som hele.
 */
export const totalFloorArea = (plan: FloorPlanDocument): number | null => {
  if (plan.rooms.length === 0) {
    return null
  }

  let total = 0

  for (const room of plan.rooms) {
    const area = measured(room.measurements.floorArea)

    if (area === null) {
      return null
    }

    total += area
  }

  return total
}

export interface FloorPlanBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Rammen rundt alt tegningen viser: gulv, vegger og åpninger. Inventar
 * teller ikke — det står inne i rommene. Null når planen ikke har et
 * eneste punkt.
 */
export const floorPlanBounds = (plan: FloorPlanDocument): FloorPlanBounds | null => {
  const points: FloorPlanPoint[] = plan.rooms.flatMap((room) => [
    ...room.outline,
    ...room.walls.flatMap((wall) => [wall.start, wall.end]),
    ...room.openings.flatMap((opening) => [opening.start, opening.end]),
  ])

  if (points.length === 0) {
    return null
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  }
}

/** Romtypene koden eier (`category` på rommet). */
export const FLOOR_PLAN_ROOM_CATEGORIES = ['living_room', 'bedroom', 'bathroom', 'kitchen', 'dining_room'] as const
export type FloorPlanRoomCategory = (typeof FLOOR_PLAN_ROOM_CATEGORIES)[number]

export const toFloorPlanRoomCategory = (category: string | null | undefined): FloorPlanRoomCategory | null =>
  FLOOR_PLAN_ROOM_CATEGORIES.find((known) => known === category) ?? null

/** Inventartypene koden eier (`category` på inventaret): møbler og utstyr, med symbol i `floorPlanFurniture.json`. */
export const FLOOR_PLAN_FURNITURE_CATEGORIES = [
  'storage',
  'refrigerator',
  'stove',
  'bed',
  'sink',
  'washer_dryer',
  'toilet',
  'bathtub',
  'oven',
  'dishwasher',
  'table',
  'sofa',
  'chair',
  'fireplace',
  'television',
  'stairs',
] as const

/**
 * The structural object categories (SIGN-2014, contract 1.6): a column
 * carries the ceiling and a beam hangs under it. They are part of the
 * building, so «remove all furniture» never removes them, and they are drawn
 * by code — not by a symbol in `floorPlanFurniture.json`.
 */
export const FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES = ['column', 'beam'] as const
export type FloorPlanStructuralObjectCategory = (typeof FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES)[number]

/** Every object category the code owns: the furniture, then the structural ones. */
export const FLOOR_PLAN_OBJECT_CATEGORIES = [...FLOOR_PLAN_FURNITURE_CATEGORIES, ...FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES] as const
export type FloorPlanObjectCategory = (typeof FLOOR_PLAN_OBJECT_CATEGORIES)[number]

export const toFloorPlanObjectCategory = (category: string | null | undefined): FloorPlanObjectCategory | null =>
  FLOOR_PLAN_OBJECT_CATEGORIES.find((known) => known === category) ?? null

/** Is the object part of the building (a column, a beam)? Decided by the type field, never by a name. */
export const isStructuralObjectCategory = (category: string | null | undefined): category is FloorPlanStructuralObjectCategory =>
  FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES.some((known) => known === category)

/** One room as it is saved (SIGN-1980) — the same document for a floor plan and a sketch (SIGN-2014). The measurements are not sent. */
export const toFloorPlanRoomInput = (room: FloorPlanRoom): FloorPlanRoomInput => ({
  id: room.id,
  name: room.name,
  category: room.category ?? null,
  floorColor: room.floorColor ?? null,
  wallColor: room.wallColor ?? null,
  ceilingColor: room.ceilingColor ?? null,
  outline: room.outline.map(({ x, y }) => ({ x, y })),
  walls: room.walls.map((wall) => ({
    id: wall.id,
    start: { x: wall.start.x, y: wall.start.y },
    end: { x: wall.end.x, y: wall.end.y },
    height: wall.height ?? null,
    profile: wall.profile?.map(({ at, height }) => ({ at, height })) ?? null,
    color: wall.color ?? null,
  })),
  openings: room.openings.map((opening) => ({
    id: opening.id,
    kind: opening.kind,
    start: { x: opening.start.x, y: opening.start.y },
    end: { x: opening.end.x, y: opening.end.y },
    height: opening.height ?? null,
    sill: opening.sill ?? null,
    hinge: opening.hinge ?? null,
    swing: opening.swing ?? null,
  })),
  objects: room.objects.map((object) => ({
    id: object.id,
    category: object.category,
    center: { x: object.center.x, y: object.center.y },
    width: object.width,
    depth: object.depth,
    rotation: object.rotation,
    height: object.height ?? null,
    variant: object.variant ?? null,
    elevation: object.elevation ?? null,
  })),
})
