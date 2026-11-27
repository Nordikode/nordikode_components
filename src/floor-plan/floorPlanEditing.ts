import type {
  FloorPlanDocument,
  FloorPlanDoorHinge,
  FloorPlanDoorSwing,
  FloorPlanObject,
  FloorPlanObjectCategory,
  FloorPlanOpening,
  FloorPlanOpeningKind,
  FloorPlanPoint,
  FloorPlanRoom,
  FloorPlanWall,
  FloorPlanWallProfilePoint,
} from './model'
import {
  isStructuralObjectCategory,
  toFloorPlanDoorHinge,
  toFloorPlanDoorSwing,
  toFloorPlanObjectCategory,
  toFloorPlanOpeningKind,
  toFloorPlanRoomCategory,
} from './model'
import { ceilingProfileAlong, isSlopedRoom, levelHeight, profileHeight, PROFILE_MAX_POINTS, slopedProfile } from './floorPlanCeiling'
import { toFloorPlanObjectVariant } from './floorPlanFurniture'
import { distance, distanceToSegment, isInside, leftNormal, polygonArea, roomCenter } from './floorPlanGeometry'

/**
 * Redigeringsreglene for plantegninger (SIGN-1980), som rene funksjoner på
 * et rom eller en plan. De samme reglene er skrevet i Swift for Sign-appen
 * (`SignKit`), og oppførselen skal være lik på begge sider — fasiten er
 * kontrakten «Editing floor plans» (kapittel 3).
 *
 * Hver funksjon gir et NYTT rom (eller en ny plan) og rører aldri det den
 * fikk. En endring som ikke kan gjøres — ukjent id, ugyldig verdi, siste rom
 * — gir det samme objektet tilbake, så den som kaller ser på identiteten at
 * ingenting skjedde. Tall utenfor et gyldig område klemmes inn i området.
 *
 * Alt er meter, x mot høyre og y nedover, og alle posisjoner legges på
 * nærmeste hele centimeter. Målene (`measurements`) røres ikke her: de
 * regnes av geometrien (`roomMeasurements`) for visning, og av serveren ved
 * lagring.
 */

/** Rutenettet alle posisjoner legges på, i meter. */
export const GRID = 0.01
/** En veggende «står i» et hjørne når den er nærmere enn dette. */
export const CORNER_TOLERANCE = 0.05
/** En åpning «står på» veggen midtpunktet dens er nærmest, innenfor dette. */
export const OPENING_WALL_TOLERANCE = 0.15
/** Et hjørne som dras, legger seg på nabohjørnets x eller y innenfor dette. */
export const SNAP_TOLERANCE = 0.05
/** En åpning står alltid minst så langt fra hver veggende. */
export const OPENING_MARGIN = 0.05
/** En vegg kortere enn dette får ingen ny åpning. */
export const OPENING_MIN_WALL = 0.3
/** Den smaleste åpningen et menneske kan sette. */
export const OPENING_MIN_WIDTH = 0.05

export const CEILING_HEIGHT_RANGE = { min: 0.5, max: 30 } as const
export const WALL_LENGTH_RANGE = { min: 0.1, max: 200 } as const
export const OBJECT_SIZE_RANGE = { min: 0.05, max: 20 } as const
/** Hvor høyt over gulvet inventarets underside kan være (SIGN-1987). */
export const OBJECT_ELEVATION_RANGE = { min: 0, max: 20 } as const
export const OPENING_HEIGHT_RANGE = { min: 0.05, max: 30 } as const
export const OPENING_SILL_RANGE = { min: 0, max: 30 } as const
export const ROOM_NAME_MAX_LENGTH = 120
export const PLAN_NAME_MAX_LENGTH = 120
/** Høyden i ett punkt på en veggs overkant: taket kan gå helt ned til gulvet. */
export const WALL_PROFILE_HEIGHT_RANGE = { min: 0, max: 30 } as const
export const WALL_PROFILE_MAX_POINTS = PROFILE_MAX_POINTS
/** Et knekkpunkt står minst så langt fra naboene, som andel av veggens lengde. */
export const WALL_PROFILE_MIN_GAP = 0.001
/** Grensene en plan har i kontrakten: rom per plan, og punkter, vegger, åpninger og inventar per rom. */
export const PLAN_MAX_ROOMS = 50
export const ROOM_MAX_OUTLINE_POINTS = 200
export const ROOM_MAX_WALLS = 200
export const ROOM_MAX_OPENINGS = 200
export const ROOM_MAX_OBJECTS = 300
/** Det minste gulvet et rom kan ha etter en deling, i m². */
export const ROOM_MIN_AREA = 0.01
/** To rom kan slås sammen når de har hver sin kant langs samme linje, høyst så langt fra hverandre (veggen mellom dem). */
export const MERGE_GAP = 0.4
/** … og kantene ligger langs hverandre minst så langt. */
export const MERGE_MIN_OVERLAP = 0.1

/** Det som kan velges i tegningen. */
export type FloorPlanSelection =
  | { kind: 'room'; roomId: string }
  | { kind: 'wall'; roomId: string; wallId: string }
  | { kind: 'corner'; roomId: string; index: number }
  | { kind: 'opening'; roomId: string; openingId: string }
  | { kind: 'object'; roomId: string; objectId: string }

const EPSILON = 1e-9

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/**
 * En posisjon eller lengde lagt på nærmeste hele centimeter: `v × 100` rundet
 * til nærmeste heltall, halve bort fra null (Swift: `(v * 100).rounded() / 100`).
 */
export const snap = (value: number): number => {
  const cents = Math.round(Math.abs(value) * 100) / 100

  return value < 0 ? -cents : cents
}

const snapPoint = <P extends FloorPlanPoint>(base: P, x: number, y: number): P => ({ ...base, x: snap(x), y: snap(y) })

const samePoint = (left: FloorPlanPoint, right: FloorPlanPoint): boolean => left.x === right.x && left.y === right.y

/** Nye id-er er UUID-er, som ellers i planen. */
export const newFloorPlanId = (): string => globalThis.crypto.randomUUID()

/* ------------------------------------------------------------------ */
/* Farger                                                              */
/* ------------------------------------------------------------------ */

/**
 * En farge er data personen har valgt: `#` og seks heksadesimale sifre.
 * Tas imot med store eller små bokstaver, lagres med små. Alt annet er
 * ingen farge (null).
 */
export const normalizeColor = (color: string | null | undefined): string | null => {
  const text = (color ?? '').trim()

  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : null
}

/* ------------------------------------------------------------------ */
/* Planen                                                              */
/* ------------------------------------------------------------------ */

/** Nytt navn på plantegningen: 1–120 tegn etter at mellomrom i endene er fjernet. */
export const renamePlan = <P extends { name: string }>(plan: P, name: string): P => {
  const trimmed = name.trim()

  return trimmed.length < 1 || trimmed.length > PLAN_NAME_MAX_LENGTH || trimmed === plan.name ? plan : { ...plan, name: trimmed }
}

/* ------------------------------------------------------------------ */
/* Rom                                                                 */
/* ------------------------------------------------------------------ */

/** Nytt navn: 1–120 tegn etter at mellomrom i endene er fjernet. */
export const renameRoom = (room: FloorPlanRoom, name: string): FloorPlanRoom => {
  const trimmed = name.trim()

  return trimmed.length < 1 || trimmed.length > ROOM_NAME_MAX_LENGTH || trimmed === room.name ? room : { ...room, name: trimmed }
}

/** Romtypen, eller ingen (null). En type koden ikke kjenner settes ikke. */
export const setRoomCategory = (room: FloorPlanRoom, category: string | null): FloorPlanRoom => {
  const next = category === null ? null : toFloorPlanRoomCategory(category)

  return (category !== null && next === null) || next === (room.category ?? null) ? room : { ...room, category: next }
}

const withColor = <T extends object, K extends keyof T>(target: T, key: K, color: string | null): T => {
  const next = color === null ? null : normalizeColor(color)

  // En ugyldig farge er ikke «ingen farge»: den lar det som står, stå.
  if ((color !== null && next === null) || next === ((target[key] as string | null | undefined) ?? null)) {
    return target
  }

  return { ...target, [key]: next }
}

export const setRoomFloorColor = (room: FloorPlanRoom, color: string | null): FloorPlanRoom => withColor(room, 'floorColor', color)

export const setRoomWallColor = (room: FloorPlanRoom, color: string | null): FloorPlanRoom => withColor(room, 'wallColor', color)

/** Takfargen (SIGN-1981). Taket tegnes ikke i planen; fargen vises i 3D-visningen. */
export const setRoomCeilingColor = (room: FloorPlanRoom, color: string | null): FloorPlanRoom => withColor(room, 'ceilingColor', color)

/** Takhøyden: høyden på hver vegg i rommet, 0,5–30 m. Taket blir flatt: en skrå overkant på en vegg fjernes. */
export const setCeilingHeight = (room: FloorPlanRoom, height: number): FloorPlanRoom => {
  if (!Number.isFinite(height) || room.walls.length === 0) {
    return room
  }

  const next = snap(clamp(height, CEILING_HEIGHT_RANGE.min, CEILING_HEIGHT_RANGE.max))

  return room.walls.every((wall) => wall.height === next && (wall.profile ?? null) === null)
    ? room
    : { ...room, walls: room.walls.map((wall) => ({ ...wall, height: next, profile: null })) }
}

/** Sletter rommet. Det siste rommet i en plan kan ikke slettes — da slettes planen. */
export const deleteRoom = <P extends FloorPlanDocument>(plan: P, roomId: string): P =>
  plan.rooms.length <= 1 || !plan.rooms.some((room) => room.id === roomId) ? plan : { ...plan, rooms: plan.rooms.filter((room) => room.id !== roomId) }

/** Bytter ut ett rom i planen med det `edit` gir; gir samme plan tilbake når rommet er urørt. */
export const updateRoom = <P extends FloorPlanDocument>(plan: P, roomId: string, edit: (room: FloorPlanRoom) => FloorPlanRoom): P => {
  let changed = false

  const rooms = plan.rooms.map((room) => {
    if (room.id !== roomId) {
      return room
    }

    const next = edit(room)
    changed = changed || next !== room

    return next
  })

  return changed ? { ...plan, rooms } : plan
}

/* ------------------------------------------------------------------ */
/* Åpninger på vegger                                                  */
/* ------------------------------------------------------------------ */

const wallLength = (wall: Pick<FloorPlanWall, 'start' | 'end'>): number => distance(wall.start, wall.end)

export interface OpeningSeat {
  wall: FloorPlanWall
  /** Avstanden langs veggen fra veggens start til åpningens nærmeste ende. */
  distance: number
  width: number
  /** Åpningens start ligger lenger ut på veggen enn slutten. */
  reversed: boolean
}

/**
 * Veggen åpningen står på: den hvis linjestykke åpningens midtpunkt er
 * nærmest, innenfor 0,15 m (er to like nær, vinner den første). Null når
 * ingen vegg er nær nok.
 */
export const openingSeat = (room: Pick<FloorPlanRoom, 'walls'>, opening: Pick<FloorPlanOpening, 'start' | 'end'>): OpeningSeat | null => {
  const middle = { x: (opening.start.x + opening.end.x) / 2, y: (opening.start.y + opening.end.y) / 2 }
  let best: { wall: FloorPlanWall; distance: number; share: number } | null = null

  for (const wall of room.walls) {
    const length = wallLength(wall)

    if (length === 0) {
      continue
    }

    const hit = distanceToSegment(middle, wall.start, wall.end)

    if (hit.distance <= OPENING_WALL_TOLERANCE + EPSILON && (best === null || hit.distance < best.distance - EPSILON)) {
      best = { wall, distance: hit.distance, share: hit.share }
    }
  }

  if (best === null) {
    return null
  }

  const { wall } = best
  const length = wallLength(wall)
  const along = (point: FloorPlanPoint): number =>
    ((point.x - wall.start.x) * (wall.end.x - wall.start.x) + (point.y - wall.start.y) * (wall.end.y - wall.start.y)) / length
  const width = distance(opening.start, opening.end)

  return { wall, distance: best.share * length - width / 2, width, reversed: along(opening.start) > along(opening.end) }
}

/**
 * Setter åpningen på veggen, `from` meter fra veggens start og `width` bred,
 * klemt så den står inne i veggen med 0,05 m til hver ende. Er veggen
 * kortere enn åpningen + 0,1 m, krympes åpningen til det veggen har plass
 * til (aldri smalere enn én centimeter), midt på veggen.
 */
const seatOpening = (opening: FloorPlanOpening, wall: Pick<FloorPlanWall, 'start' | 'end'>, from: number, width: number, reversed: boolean): FloorPlanOpening => {
  const length = wallLength(wall)

  if (length === 0) {
    return opening
  }

  const fitted = Math.max(GRID, Math.min(width, length - OPENING_MARGIN * 2))
  const last = length - OPENING_MARGIN - fitted
  const start = last < OPENING_MARGIN ? (length - fitted) / 2 : clamp(from, OPENING_MARGIN, last)
  const at = (along: number): { x: number; y: number } => ({
    x: wall.start.x + ((wall.end.x - wall.start.x) * along) / length,
    y: wall.start.y + ((wall.end.y - wall.start.y) * along) / length,
  })
  const near = at(start)
  const far = at(start + fitted)
  const [first, second] = reversed ? [far, near] : [near, far]

  return { ...opening, start: snapPoint(opening.start, first.x, first.y), end: snapPoint(opening.end, second.x, second.y) }
}

interface OpeningDefaults {
  width: number
  height: number
  sill: number
}

/** Størrelsen en ny åpning får: dør 0,8 × 2,0 m, vindu 1,0 × 1,2 m med brystning 0,9 m, åpning 0,9 × 2,0 m. */
export const OPENING_DEFAULTS: Record<FloorPlanOpeningKind, OpeningDefaults> = {
  door: { width: 0.8, height: 2, sill: 0 },
  window: { width: 1, height: 1.2, sill: 0.9 },
  opening: { width: 0.9, height: 2, sill: 0 },
}

/**
 * Ny åpning midt på veggen, i typens standardstørrelse — smalere når veggen
 * er kort (alltid minst 0,05 m til hver veggende). En vegg kortere enn 0,3 m
 * får ingen åpning.
 */
export const addOpening = (room: FloorPlanRoom, wallId: string, kind: FloorPlanOpeningKind, id: string = newFloorPlanId()): FloorPlanRoom => {
  const wall = room.walls.find((candidate) => candidate.id === wallId)

  if (wall === undefined || wallLength(wall) < OPENING_MIN_WALL - EPSILON) {
    return room
  }

  const length = wallLength(wall)
  const defaults = OPENING_DEFAULTS[kind]
  const width = Math.min(defaults.width, length - OPENING_MARGIN * 2)
  const blank: FloorPlanOpening = { id, kind, start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, height: defaults.height, sill: defaults.sill, hinge: null, swing: null }
  const seated = seatOpening(blank, wall, (length - width) / 2, width, false)

  // En ny dør sier selv hvordan den står: hengslet i starten, inn mot rommet.
  return { ...room, openings: [...room.openings, kind === 'door' ? { ...seated, ...doorLeaf(room, seated) } : seated] }
}

const editOpening = (room: FloorPlanRoom, openingId: string, edit: (opening: FloorPlanOpening) => FloorPlanOpening): FloorPlanRoom => {
  let changed = false

  const openings = room.openings.map((opening) => {
    if (opening.id !== openingId) {
      return opening
    }

    const next = edit(opening)
    changed = changed || next !== opening

    return next
  })

  return changed ? { ...room, openings } : room
}

const unchangedOpening = (before: FloorPlanOpening, after: FloorPlanOpening): FloorPlanOpening =>
  samePoint(before.start, after.start) && samePoint(before.end, after.end) ? before : after

/** Skyver åpningen langs veggen sin: `distanceFromWallStart` er avstanden fra veggens start til åpningens nærmeste ende. */
export const moveOpening = (room: FloorPlanRoom, openingId: string, distanceFromWallStart: number): FloorPlanRoom =>
  editOpening(room, openingId, (opening) => {
    const seat = openingSeat(room, opening)

    return seat === null || !Number.isFinite(distanceFromWallStart)
      ? opening
      : unchangedOpening(opening, seatOpening(opening, seat.wall, snap(distanceFromWallStart), seat.width, seat.reversed))
  })

/** Ny bredde rundt samme midtpunkt, klemt så åpningen står inne i veggen. */
export const resizeOpening = (room: FloorPlanRoom, openingId: string, width: number): FloorPlanRoom =>
  editOpening(room, openingId, (opening) => {
    const seat = openingSeat(room, opening)

    if (seat === null || !Number.isFinite(width)) {
      return opening
    }

    const length = wallLength(seat.wall)
    const centre = seat.distance + seat.width / 2
    // Så bred den kan bli rundt samme midtpunkt uten å komme nærmere en veggende enn 0,05 m.
    const widest = Math.max(GRID, 2 * Math.min(centre - OPENING_MARGIN, length - OPENING_MARGIN - centre))
    const next = snap(Math.min(Math.max(width, OPENING_MIN_WIDTH), widest))

    return unchangedOpening(opening, seatOpening(opening, seat.wall, centre - next / 2, next, seat.reversed))
  })

/** Åpningens avstand fra veggens start når midtpunktet dras til `point` — det `moveOpening` skal ha. */
export const openingDistanceAt = (room: FloorPlanRoom, openingId: string, point: FloorPlanPoint): number | null => {
  const opening = room.openings.find((candidate) => candidate.id === openingId)
  const seat = opening === undefined ? null : openingSeat(room, opening)

  if (seat === null) {
    return null
  }

  const length = wallLength(seat.wall)
  const along =
    ((point.x - seat.wall.start.x) * (seat.wall.end.x - seat.wall.start.x) + (point.y - seat.wall.start.y) * (seat.wall.end.y - seat.wall.start.y)) / length

  return along - seat.width / 2
}

/**
 * Typen: dør, vindu eller åpning. Størrelsen står. Bare en dør har blad: blir
 * åpningen en dør, sier den hvordan den står (hengslet i starten, inn mot
 * rommet); blir den noe annet, er hengsel og slag borte.
 */
export const setOpeningKind = (room: FloorPlanRoom, openingId: string, kind: string): FloorPlanRoom => {
  const next = toFloorPlanOpeningKind(kind)

  return next === null
    ? room
    : editOpening(room, openingId, (opening) => {
        if (opening.kind === next) {
          return opening
        }

        return next === 'door' ? { ...opening, kind: next, ...doorLeaf(room, opening) } : { ...opening, kind: next, hinge: null, swing: null }
      })
}

/* ------------------------------------------------------------------ */
/* Dører: hengsel og slag (SIGN-1982)                                  */
/* ------------------------------------------------------------------ */

/**
 * Siden av åpningen rommet ligger på: venstre eller høyre for linja fra
 * åpningens start til slutt (se `leftNormal`), etter rommets midte. Kan det
 * ikke avgjøres — ingen midte, eller midten ligger på linja — er det venstre.
 */
export const openingRoomSide = (room: Pick<FloorPlanRoom, 'outline'>, opening: Pick<FloorPlanOpening, 'start' | 'end'>): FloorPlanDoorSwing => {
  const middle = roomCenter(room.outline)
  const left = leftNormal(opening.start, opening.end)

  if (middle === null || left === null) {
    return 'left'
  }

  const centre = { x: (opening.start.x + opening.end.x) / 2, y: (opening.start.y + opening.end.y) / 2 }

  return left.x * (middle.x - centre.x) + left.y * (middle.y - centre.y) >= 0 ? 'left' : 'right'
}

/**
 * Slik døra står: enden den er hengslet i, og siden den slår mot. Det døra
 * selv sier gjelder; sier den ingenting, er den hengslet i starten og slår
 * inn mot rommet — slik en dør uten feltene alltid har vært tegnet.
 */
export const doorLeaf = (
  room: Pick<FloorPlanRoom, 'outline'>,
  opening: Pick<FloorPlanOpening, 'start' | 'end' | 'hinge' | 'swing'>,
): { hinge: FloorPlanDoorHinge; swing: FloorPlanDoorSwing } => ({
  hinge: toFloorPlanDoorHinge(opening.hinge) ?? 'start',
  swing: toFloorPlanDoorSwing(opening.swing) ?? openingRoomSide(room, opening),
})

const editDoor = (room: FloorPlanRoom, openingId: string, change: Partial<{ hinge: FloorPlanDoorHinge; swing: FloorPlanDoorSwing }>): FloorPlanRoom =>
  editOpening(room, openingId, (opening) => {
    if (opening.kind !== 'door') {
      return opening
    }

    // Begge sies samtidig, så døra står likt også om rommet rundt den endres.
    const next = { ...doorLeaf(room, opening), ...change }

    return opening.hinge === next.hinge && opening.swing === next.swing ? opening : { ...opening, ...next }
  })

/** Enden døra er hengslet i: åpningens start eller slutt. Bare dører; en ukjent verdi endrer ingenting. */
export const setDoorHinge = (room: FloorPlanRoom, openingId: string, hinge: string): FloorPlanRoom => {
  const next = toFloorPlanDoorHinge(hinge)

  return next === null ? room : editDoor(room, openingId, { hinge: next })
}

/** Siden døra slår mot: venstre eller høyre for linja fra åpningens start til slutt. Bare dører; en ukjent verdi endrer ingenting. */
export const setDoorSwing = (room: FloorPlanRoom, openingId: string, swing: string): FloorPlanRoom => {
  const next = toFloorPlanDoorSwing(swing)

  return next === null ? room : editDoor(room, openingId, { swing: next })
}

/**
 * Slik et menneske sier det, stående i rommet med ansiktet mot døra: er
 * hengslene til venstre eller til høyre, og slår døra inn i rommet (mot en)
 * eller ut av det?
 */
export const doorHingeSide = (room: Pick<FloorPlanRoom, 'outline'>, opening: Pick<FloorPlanOpening, 'start' | 'end' | 'hinge' | 'swing'>): 'left' | 'right' =>
  // Med rommet til høyre for linja ligger åpningens start til venstre for den som ser mot døra.
  (doorLeaf(room, opening).hinge === 'start') === (openingRoomSide(room, opening) === 'right') ? 'left' : 'right'

export const doorOpensInward = (room: Pick<FloorPlanRoom, 'outline'>, opening: Pick<FloorPlanOpening, 'start' | 'end' | 'hinge' | 'swing'>): boolean =>
  doorLeaf(room, opening).swing === openingRoomSide(room, opening)

/** Hengslene til venstre eller høyre, sett fra rommet. */
export const setDoorHingeSide = (room: FloorPlanRoom, openingId: string, side: 'left' | 'right'): FloorPlanRoom => {
  const opening = room.openings.find((candidate) => candidate.id === openingId)

  if (opening === undefined || (side !== 'left' && side !== 'right')) {
    return room
  }

  return editDoor(room, openingId, { hinge: (side === 'left') === (openingRoomSide(room, opening) === 'right') ? 'start' : 'end' })
}

/** Døra slår inn i rommet (`true`) eller ut av det. */
export const setDoorOpensInward = (room: FloorPlanRoom, openingId: string, inward: boolean): FloorPlanRoom => {
  const opening = room.openings.find((candidate) => candidate.id === openingId)

  if (opening === undefined) {
    return room
  }

  const roomSide = openingRoomSide(room, opening)

  return editDoor(room, openingId, { swing: inward ? roomSide : roomSide === 'left' ? 'right' : 'left' })
}

const numberOrNull = (value: number | null, range: { min: number; max: number }): number | null | undefined => {
  if (value === null) {
    return null
  }

  return Number.isFinite(value) ? snap(clamp(value, range.min, range.max)) : undefined
}

/** Åpningens høyde (0,05–30 m), eller ikke målt (null). */
export const setOpeningHeight = (room: FloorPlanRoom, openingId: string, height: number | null): FloorPlanRoom => {
  const next = numberOrNull(height, OPENING_HEIGHT_RANGE)

  return next === undefined ? room : editOpening(room, openingId, (opening) => ((opening.height ?? null) === next ? opening : { ...opening, height: next }))
}

/** Brystningen: høyden fra gulvet til åpningens underkant (0–30 m), eller ikke målt (null). */
export const setOpeningSill = (room: FloorPlanRoom, openingId: string, sill: number | null): FloorPlanRoom => {
  const next = numberOrNull(sill, OPENING_SILL_RANGE)

  return next === undefined ? room : editOpening(room, openingId, (opening) => ((opening.sill ?? null) === next ? opening : { ...opening, sill: next }))
}

export const deleteOpening = (room: FloorPlanRoom, openingId: string): FloorPlanRoom =>
  room.openings.some((opening) => opening.id === openingId) ? { ...room, openings: room.openings.filter((opening) => opening.id !== openingId) } : room

/* ------------------------------------------------------------------ */
/* Hjørner og vegger                                                   */
/* ------------------------------------------------------------------ */

/** Hvor hver åpning står før en vegg flyttes, så den kan settes tilbake etterpå. */
const seatsOf = (room: FloorPlanRoom): Map<string, OpeningSeat> => {
  const seats = new Map<string, OpeningSeat>()

  for (const opening of room.openings) {
    const seat = openingSeat(room, opening)

    if (seat !== null) {
      seats.set(opening.id, seat)
    }
  }

  return seats
}

/** Setter åpningene på veggene som har flyttet seg tilbake på veggens nye linje, med samme avstand fra veggens start og samme bredde. */
const reseatOpenings = (room: FloorPlanRoom, walls: FloorPlanWall[], moved: ReadonlySet<string>, seats: ReadonlyMap<string, OpeningSeat>): FloorPlanOpening[] =>
  room.openings.map((opening) => {
    const seat = seats.get(opening.id)
    const wall = seat === undefined || !moved.has(seat.wall.id) ? undefined : walls.find((candidate) => candidate.id === seat.wall.id)

    return seat === undefined || wall === undefined ? opening : seatOpening(opening, wall, seat.distance, seat.width, seat.reversed)
  })

/**
 * Flytter hjørnet `cornerIndex` i omrisset til `to`. Hver veggende som sto i
 * det gamle hjørnet (innenfor 0,05 m) følger med, og åpningene på veggene
 * som flyttet seg settes tilbake på veggens nye linje.
 */
export const moveCorner = (room: FloorPlanRoom, cornerIndex: number, to: FloorPlanPoint): FloorPlanRoom => {
  const from = room.outline[cornerIndex]

  if (from === undefined || !Number.isFinite(to.x) || !Number.isFinite(to.y)) {
    return room
  }

  const target = snapPoint(from, to.x, to.y)

  if (samePoint(from, target)) {
    return room
  }

  const seats = seatsOf(room)
  const stoodHere = (point: FloorPlanPoint): boolean => distance(point, from) <= CORNER_TOLERANCE + EPSILON
  const moved = new Set<string>()

  const walls = room.walls.map((wall) => {
    const start = stoodHere(wall.start)
    const end = stoodHere(wall.end)

    if (!start && !end) {
      return wall
    }

    moved.add(wall.id)

    return {
      ...wall,
      start: start ? snapPoint(wall.start, target.x, target.y) : wall.start,
      end: end ? snapPoint(wall.end, target.x, target.y) : wall.end,
    }
  })

  return {
    ...room,
    outline: room.outline.map((point, index) => (index === cornerIndex ? target : point)),
    walls,
    openings: reseatOpenings(room, walls, moved, seats),
  }
}

/**
 * Hvor et hjørne som dras skal stå: på nærmeste centimeter, og på
 * nabohjørnets x eller y når det er innenfor 0,05 m — så rette vinkler
 * holder seg rette. Er begge naboene nær nok på samme akse, vinner den
 * nærmeste.
 */
export const snapCorner = (room: Pick<FloorPlanRoom, 'outline'>, cornerIndex: number, to: FloorPlanPoint): FloorPlanPoint => {
  const count = room.outline.length
  const point = { x: snap(to.x), y: snap(to.y) }

  if (count < 2 || room.outline[cornerIndex] === undefined) {
    return point
  }

  const neighbours = [room.outline[(cornerIndex + count - 1) % count], room.outline[(cornerIndex + 1) % count]]

  for (const axis of ['x', 'y'] as const) {
    let nearest: number | null = null

    for (const neighbour of neighbours) {
      const gap = Math.abs(point[axis] - neighbour[axis])

      if (gap <= SNAP_TOLERANCE + EPSILON && (nearest === null || gap < Math.abs(point[axis] - nearest) - EPSILON)) {
        nearest = neighbour[axis]
      }
    }

    if (nearest !== null) {
      point[axis] = nearest
    }
  }

  return point
}

/**
 * Ny lengde på veggen (0,1–200 m): starten står, og enden flyttes langs
 * veggens egen retning. Står enden i et hjørne av omrisset, flyttes hjørnet
 * (`moveCorner`), så naboveggen følger med; ellers flyttes bare denne veggen.
 */
export const setWallLength = (room: FloorPlanRoom, wallId: string, length: number): FloorPlanRoom => {
  const wall = room.walls.find((candidate) => candidate.id === wallId)
  const current = wall === undefined ? 0 : wallLength(wall)

  if (wall === undefined || current === 0 || !Number.isFinite(length)) {
    return room
  }

  const next = clamp(length, WALL_LENGTH_RANGE.min, WALL_LENGTH_RANGE.max)
  const end = {
    x: wall.start.x + ((wall.end.x - wall.start.x) * next) / current,
    y: wall.start.y + ((wall.end.y - wall.start.y) * next) / current,
  }
  const cornerIndex = room.outline.findIndex((point) => distance(point, wall.end) <= CORNER_TOLERANCE + EPSILON)

  if (cornerIndex !== -1) {
    return moveCorner(room, cornerIndex, end)
  }

  const target = snapPoint(wall.end, end.x, end.y)

  if (samePoint(wall.end, target)) {
    return room
  }

  const seats = seatsOf(room)
  const walls = room.walls.map((candidate) => (candidate.id === wallId ? { ...candidate, end: target } : candidate))

  return { ...room, walls, openings: reseatOpenings(room, walls, new Set([wallId]), seats) }
}

const editWall = (room: FloorPlanRoom, wallId: string, edit: (wall: FloorPlanWall) => FloorPlanWall): FloorPlanRoom => {
  let changed = false

  const walls = room.walls.map((wall) => {
    if (wall.id !== wallId) {
      return wall
    }

    const next = edit(wall)
    changed = changed || next !== wall

    return next
  })

  return changed ? { ...room, walls } : room
}

/** Høyden på én vegg (0,5–30 m), eller ikke målt (null). Veggen blir et rektangel: en skrå overkant fjernes. */
export const setWallHeight = (room: FloorPlanRoom, wallId: string, height: number | null): FloorPlanRoom => {
  const next = numberOrNull(height, CEILING_HEIGHT_RANGE)

  return next === undefined
    ? room
    : editWall(room, wallId, (wall) => ((wall.height ?? null) === next && (wall.profile ?? null) === null ? wall : { ...wall, height: next, profile: null }))
}

/* ------------------------------------------------------------------ */
/* Veggens overkant under skråtak (SIGN-1982)                          */
/* ------------------------------------------------------------------ */

const shareOf = (value: number): number => Math.round(value * 10_000) / 10_000

/**
 * Veggens overkant som punkter, uansett vegg: en vannrett vegg er to
 * punkter i veggens høyde. Null for en vegg uten høyde.
 */
export const wallProfile = (wall: Pick<FloorPlanWall, 'height' | 'profile'>): FloorPlanWallProfilePoint[] | null => {
  const sloped = slopedProfile(wall)

  if (sloped !== null) {
    return sloped.map((point) => ({ ...point }))
  }

  return (wall.height ?? 0) > 0 ? [{ at: 0, height: wall.height as number }, { at: 1, height: wall.height as number }] : null
}

/**
 * Veggen med denne overkanten, slik den lagres: høydene på hele centimeter
 * innenfor 0–30 m, plassene med fire desimaler. Er alle punktene i samme
 * høyde, er veggen et rektangel (ingen overkant, og den høyden — minst
 * 0,5 m). Ellers er veggens høyde overkantens høyeste punkt. Null når
 * punktene ikke er en overkant: færre enn to eller flere enn tolv, ikke fra
 * 0 til 1, ikke stigende, eller ingen høyde over gulvet.
 */
const withProfile = <W extends Pick<FloorPlanWall, 'height' | 'profile'>>(wall: W, points: readonly FloorPlanWallProfilePoint[]): W | null => {
  if (points.length < 2 || points.length > WALL_PROFILE_MAX_POINTS || !points.every((point) => Number.isFinite(point.at) && Number.isFinite(point.height))) {
    return null
  }

  const profile = points.map((point) => ({
    ...point,
    at: shareOf(point.at),
    height: snap(clamp(point.height, WALL_PROFILE_HEIGHT_RANGE.min, WALL_PROFILE_HEIGHT_RANGE.max)),
  }))

  if (profile[0].at !== 0 || profile[profile.length - 1].at !== 1 || profile.some((point, index) => index > 0 && point.at <= profile[index - 1].at)) {
    return null
  }

  const heights = profile.map((point) => point.height)
  const highest = Math.max(...heights)

  if (highest <= 0) {
    return null
  }

  return Math.min(...heights) === highest
    ? { ...wall, height: Math.max(highest, CEILING_HEIGHT_RANGE.min), profile: null }
    : { ...wall, height: highest, profile }
}

const sameProfile = (left: Pick<FloorPlanWall, 'height' | 'profile'>, right: Pick<FloorPlanWall, 'height' | 'profile'>): boolean =>
  (left.height ?? null) === (right.height ?? null) && JSON.stringify(left.profile ?? null) === JSON.stringify(right.profile ?? null)

const editProfile = (room: FloorPlanRoom, wallId: string, edit: (points: FloorPlanWallProfilePoint[]) => readonly FloorPlanWallProfilePoint[] | null): FloorPlanRoom =>
  editWall(room, wallId, (wall) => {
    const current = wallProfile(wall)
    const points = current === null ? null : edit(current)
    const next = points === null ? null : withProfile(wall, points)

    return next === null || sameProfile(wall, next) ? wall : next
  })

/**
 * Setter veggens overkant: punkter fra veggens start (`at` 0) til slutt
 * (`at` 1). Null gjør veggen til et rektangel i den høyden den har (det
 * høyeste punktet). Punkter som ikke er en overkant, endrer ingenting.
 */
export const setWallProfile = (room: FloorPlanRoom, wallId: string, profile: readonly FloorPlanWallProfilePoint[] | null): FloorPlanRoom =>
  editWall(room, wallId, (wall) => {
    if (profile === null) {
      return (wall.profile ?? null) === null ? wall : { ...wall, profile: null }
    }

    const next = withProfile(wall, profile)

    return next === null || sameProfile(wall, next) ? wall : next
  })

/**
 * Høyden i ett punkt på overkanten (0–30 m). `index` teller punktene slik
 * `wallProfile` gir dem: 0 er veggens start og det siste er veggens slutt —
 * slik blir en vannrett vegg skrå ved å endre høyden i den ene enden.
 */
export const setWallProfileHeight = (room: FloorPlanRoom, wallId: string, index: number, height: number): FloorPlanRoom =>
  editProfile(room, wallId, (points) =>
    !Number.isFinite(height) || points[index] === undefined ? null : points.map((point, at) => (at === index ? { ...point, height } : point)),
  )

/**
 * Flytter et knekkpunkt langs veggen: `at` er andelen av veggens lengde fra
 * start, klemt så punktet står mellom naboene. Endene kan ikke flyttes.
 */
export const moveWallProfilePoint = (room: FloorPlanRoom, wallId: string, index: number, at: number): FloorPlanRoom =>
  editProfile(room, wallId, (points) => {
    if (!Number.isFinite(at) || index <= 0 || index >= points.length - 1) {
      return null
    }

    const next = clamp(at, points[index - 1].at + WALL_PROFILE_MIN_GAP, points[index + 1].at - WALL_PROFILE_MIN_GAP)

    return points.map((point, position) => (position === index ? { ...point, at: next } : point))
  })

/**
 * Nytt knekkpunkt midt på det lengste strekket av overkanten (det første av
 * to like lange), i høyden overkanten har der — veggen ser lik ut til
 * punktet flyttes eller får en annen høyde. Tolv punkter er det meste.
 *
 * Et punkt på en vannrett vegg ville vært borte igjen med det samme (alle
 * punktene i samme høyde er et rektangel), så der løftes ingenting: en
 * vannrett vegg må først få ulik høyde i endene.
 */
export const addWallProfilePoint = (room: FloorPlanRoom, wallId: string): FloorPlanRoom =>
  editWall(room, wallId, (wall) => {
    const points = slopedProfile(wall)

    if (points === null || points.length >= WALL_PROFILE_MAX_POINTS) {
      return wall
    }

    let longest = 0

    for (let index = 1; index + 1 < points.length; index += 1) {
      if (points[index + 1].at - points[index].at > points[longest + 1].at - points[longest].at + EPSILON) {
        longest = index
      }
    }

    const at = shareOf((points[longest].at + points[longest + 1].at) / 2)
    const height = snap(profileHeight(wall, at) ?? 0)

    if (at <= points[longest].at || at >= points[longest + 1].at) {
      return wall
    }

    return { ...wall, profile: [...points.slice(0, longest + 1).map((point) => ({ ...point })), { ...points[longest], at, height }, ...points.slice(longest + 1).map((point) => ({ ...point }))] }
  })

/** Fjerner et knekkpunkt. Endene kan ikke fjernes. */
export const removeWallProfilePoint = (room: FloorPlanRoom, wallId: string, index: number): FloorPlanRoom =>
  editProfile(room, wallId, (points) => (index <= 0 || index >= points.length - 1 ? null : points.filter((_, position) => position !== index)))

/**
 * Stykket av en overkant fra andelen `from` til andelen `to` av veggen, som
 * en egen overkant fra 0 til 1 — baklengs når `from` er størst. Brukes når
 * en vegg deles eller kortes.
 */
export const sliceProfile = (wall: Pick<FloorPlanWall, 'height' | 'profile'>, from: number, to: number): FloorPlanWallProfilePoint[] | null => {
  const points = slopedProfile(wall)
  const low = Math.min(from, to)
  const high = Math.max(from, to)

  if (points === null || high - low <= EPSILON) {
    return null
  }

  const base = points[0]
  const at = (share: number): FloorPlanWallProfilePoint => ({ ...base, at: shareOf((share - low) / (high - low)), height: snap(profileHeight(wall, share) ?? 0) })
  const inside = points.filter((point) => point.at > low + WALL_PROFILE_MIN_GAP && point.at < high - WALL_PROFILE_MIN_GAP).map((point) => at(point.at))
  const slice = [{ ...at(low), at: 0 }, ...inside.filter((point) => point.at > 0 && point.at < 1), { ...at(high), at: 1 }]

  return from <= to ? slice : slice.map((point) => ({ ...point, at: shareOf(1 - point.at) })).reverse()
}

/** Stykket av veggen mellom to andeler av lengden, med sin del av overkanten. */
const wallSlice = (wall: FloorPlanWall, from: number, to: number, id: string): FloorPlanWall => {
  const point = (share: number, base: FloorPlanPoint): FloorPlanPoint =>
    snapPoint(base, wall.start.x + (wall.end.x - wall.start.x) * share, wall.start.y + (wall.end.y - wall.start.y) * share)
  const piece: FloorPlanWall = { ...wall, id, start: from <= 0 ? wall.start : point(from, wall.start), end: to >= 1 ? wall.end : point(to, wall.end) }
  const profile = sliceProfile(wall, from, to)

  return profile === null ? piece : (withProfile(piece, profile) ?? { ...piece, profile: null })
}

/** Veggens egen farge, som vinner over rommets veggfarge — eller ingen (null). */
export const setWallColor = (room: FloorPlanRoom, wallId: string, color: string | null): FloorPlanRoom =>
  editWall(room, wallId, (wall) => withColor(wall, 'color', color))

/* ------------------------------------------------------------------ */
/* Inventar                                                            */
/* ------------------------------------------------------------------ */

/** Størrelsen nytt inventar får, bredde × dybde i meter. */
export const OBJECT_DEFAULT_SIZES: Record<FloorPlanObjectCategory, { width: number; depth: number }> = {
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
  // Structural (SIGN-2014): a beam is 0.2 m wide and as long as it spans (its depth).
  column: { width: 0.2, depth: 0.2 },
  beam: { width: 0.2, depth: 1 },
}

/** How tall a new beam is, in metres; it hangs under the ceiling. */
export const BEAM_DEFAULT_HEIGHT = 0.25

/** The room's ceiling height as its walls give it: the tallest wall. Null when no wall has a height. */
const ceilingHeightOf = (room: Pick<FloorPlanRoom, 'walls'>): number | null => {
  const heights = room.walls.map((wall) => wall.height).filter((height): height is number => typeof height === 'number' && Number.isFinite(height) && height > 0)

  return heights.length === 0 ? null : Math.max(...heights)
}

/** Nytt inventar midt i rommet, i typens standardstørrelse, uten dreining. */
export const addObject = (room: FloorPlanRoom, category: FloorPlanObjectCategory, id: string = newFloorPlanId()): FloorPlanRoom => {
  const middle = roomCenter(room.outline)

  if (middle === null) {
    return room
  }

  const size = OBJECT_DEFAULT_SIZES[category]
  const ceiling = ceilingHeightOf(room)
  // A column is as tall as the room; a beam hangs under the ceiling (SIGN-2014, contract 1.6).
  const beam = category === 'beam' && ceiling !== null && ceiling > BEAM_DEFAULT_HEIGHT
  // Høyden er ukjent til noen oppgir den; 3D-visningen bruker da typens standardhøyde.
  const object: FloorPlanObject = {
    id,
    category,
    center: { x: snap(middle.x), y: snap(middle.y) },
    width: size.width,
    depth: size.depth,
    rotation: 0,
    height: category === 'column' ? ceiling : beam ? BEAM_DEFAULT_HEIGHT : null,
    variant: null,
    elevation: beam ? snap(ceiling - BEAM_DEFAULT_HEIGHT) : null,
  }

  return { ...room, objects: [...room.objects, object] }
}

const editObject = (room: FloorPlanRoom, objectId: string, edit: (object: FloorPlanObject) => FloorPlanObject): FloorPlanRoom => {
  let changed = false

  const objects = room.objects.map((object) => {
    if (object.id !== objectId) {
      return object
    }

    const next = edit(object)
    changed = changed || next !== object

    return next
  })

  return changed ? { ...room, objects } : room
}

/** Flytter inventarets midtpunkt. */
export const moveObject = (room: FloorPlanRoom, objectId: string, center: FloorPlanPoint): FloorPlanRoom =>
  editObject(room, objectId, (object) => {
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
      return object
    }

    const next = snapPoint(object.center, center.x, center.y)

    return samePoint(object.center, next) ? object : { ...object, center: next }
  })

const FULL_TURN = Math.PI * 2
const QUARTER_TURN = Math.PI / 2

/** En dreining lagt i [0, 2π). */
const normalizeRotation = (radians: number): number => {
  const turned = ((radians % FULL_TURN) + FULL_TURN) % FULL_TURN

  // Så godt som en hel runde er ingen dreining.
  return FULL_TURN - turned < 1e-9 ? 0 : turned
}

/** Setter dreiningen, i radianer rundt inventarets midtpunkt. */
export const rotateObject = (room: FloorPlanRoom, objectId: string, radians: number): FloorPlanRoom =>
  editObject(room, objectId, (object) => {
    if (!Number.isFinite(radians)) {
      return object
    }

    const next = normalizeRotation(radians)

    return next === object.rotation ? object : { ...object, rotation: next }
  })

/** «Snu 90°»: en kvart omdreining til. Fire steg er tilbake der det startet. */
export const turnObject = (room: FloorPlanRoom, objectId: string): FloorPlanRoom =>
  editObject(room, objectId, (object) => {
    const quarters = object.rotation / QUARTER_TURN
    const whole = Math.round(quarters)
    // Står inventaret alt på en kvart omdreining, telles det i hele steg, så fire steg gir nøyaktig 0.
    const next = Math.abs(quarters - whole) < 1e-6 ? ((((whole + 1) % 4) + 4) % 4) * QUARTER_TURN : normalizeRotation(object.rotation + QUARTER_TURN)

    return { ...object, rotation: next }
  })

/**
 * «Bytt forside» (SIGN-1987): symbolet dreies en kvart omdreining INNE I
 * det samme rektangelet — bredde og dybde bytter plass mens dreiningen går
 * et kvart steg, så inventaret dekker nøyaktig den samme flaten, men
 * baksiden (sisternen, hodeenden, ryggen) står mot neste side. Skannet vet
 * ikke alltid hvilken side som er forsiden; dette retter det uten å flytte
 * noe. Fire steg er tilbake der det startet.
 */
export const faceObject = (room: FloorPlanRoom, objectId: string): FloorPlanRoom =>
  editObject(turnObject(room, objectId), objectId, (object) => ({ ...object, width: object.depth, depth: object.width }))

/** Ny bredde og/eller dybde, 0,05–20 m. */
export const resizeObject = (room: FloorPlanRoom, objectId: string, size: { width?: number; depth?: number }): FloorPlanRoom =>
  editObject(room, objectId, (object) => {
    const fit = (value: number | undefined, current: number): number =>
      value === undefined || !Number.isFinite(value) ? current : snap(clamp(value, OBJECT_SIZE_RANGE.min, OBJECT_SIZE_RANGE.max))
    const width = fit(size.width, object.width)
    const depth = fit(size.depth, object.depth)

    return width === object.width && depth === object.depth ? object : { ...object, width, depth }
  })

/** Hvor høyt inventaret er (0,05–20 m, SIGN-1981), eller ukjent (null). */
export const setObjectHeight = (room: FloorPlanRoom, objectId: string, height: number | null): FloorPlanRoom => {
  const next = numberOrNull(height, OBJECT_SIZE_RANGE)

  return next === undefined ? room : editObject(room, objectId, (object) => ((object.height ?? null) === next ? object : { ...object, height: next }))
}

/** Hvor høyt over gulvet inventarets underside er (0–20 m, SIGN-1987), eller på gulvet (null). */
export const setObjectElevation = (room: FloorPlanRoom, objectId: string, elevation: number | null): FloorPlanRoom => {
  const next = numberOrNull(elevation, OBJECT_ELEVATION_RANGE)

  return next === undefined ? room : editObject(room, objectId, (object) => ((object.elevation ?? null) === next ? object : { ...object, elevation: next }))
}

/**
 * Hva inventaret er. Størrelsen står. Utformingen står når den nye typen
 * også har den; ellers er den ikke oppgitt lenger (et rundt bord som blir
 * en sofa, er ikke en rund sofa).
 */
export const setObjectCategory = (room: FloorPlanRoom, objectId: string, category: string): FloorPlanRoom => {
  const next = toFloorPlanObjectCategory(category)

  return next === null
    ? room
    : editObject(room, objectId, (object) =>
        object.category === next ? object : { ...object, category: next, variant: toFloorPlanObjectVariant(next, object.variant) },
      )
}

/**
 * Hvilken utforming av typen inventaret har (SIGN-1987) — et rundt bord, en
 * lenestol, en hylle — eller ikke oppgitt (null). En utforming typen ikke
 * har, endrer ingenting: den velges, den gjettes aldri av mål eller navn.
 */
export const setObjectVariant = (room: FloorPlanRoom, objectId: string, variant: string | null): FloorPlanRoom =>
  editObject(room, objectId, (object) => {
    const next = variant === null ? null : toFloorPlanObjectVariant(object.category, variant)

    return (variant !== null && next === null) || (object.variant ?? null) === next ? object : { ...object, variant: next }
  })

export const deleteObject = (room: FloorPlanRoom, objectId: string): FloorPlanRoom =>
  room.objects.some((object) => object.id === objectId) ? { ...room, objects: room.objects.filter((object) => object.id !== objectId) } : room

/** Is there furniture in the room? Columns and beams are part of the building and do not count. */
export const hasFurniture = (room: Pick<FloorPlanRoom, 'objects'>): boolean => room.objects.some((object) => !isStructuralObjectCategory(object.category))

/** Fjerner alt inventar i rommet. Bærende objekter (søyler, bjelker) er en del av bygget og står (SIGN-2014). */
export const removeAllObjects = (room: FloorPlanRoom): FloorPlanRoom =>
  hasFurniture(room) ? { ...room, objects: room.objects.filter((object) => isStructuralObjectCategory(object.category)) } : room

/** «Fjern alt inventar»: fjerner inventaret i alle rommene i planen. */
export const removeAllObjectsInPlan = <P extends FloorPlanDocument>(plan: P): P =>
  plan.rooms.some(hasFurniture) ? { ...plan, rooms: plan.rooms.map(removeAllObjects) } : plan

/* ------------------------------------------------------------------ */
/* Dele et rom, og slå to rom sammen (SIGN-1982)                       */
/* ------------------------------------------------------------------ */

export interface OutlineSpot {
  /** Kanten i omrisset stedet ligger på: fra punkt `edge` til det neste. */
  edge: number
  /** Stedet, på hele centimeter — eller hjørnet selv når stedet er et hjørne. */
  point: FloorPlanPoint
  /** Hjørnet stedet er (innenfor 0,05 m), ellers null. */
  corner: number | null
}

/**
 * Stedet på rommets omriss nærmest `point` — der en skillelinje kan starte
 * eller slutte. Innenfor 0,05 m fra et hjørne er stedet hjørnet. Null for et
 * omriss uten kanter.
 *
 * En skillevegg ender aldri midt i en dør eller et vindu: havner stedet i en
 * åpning på kanten (begge endene av åpningen innenfor 0,15 m fra kanten),
 * eller nærmere den enn 0,05 m, flyttes det til 0,05 m utenfor den nærmeste
 * enden av åpningen — den nærmest kantens start når det er like langt.
 */
export const outlineSpot = (room: Pick<FloorPlanRoom, 'outline'> & Partial<Pick<FloorPlanRoom, 'openings'>>, point: FloorPlanPoint): OutlineSpot | null => {
  const count = room.outline.length

  if (count < 3 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null
  }

  let best: { edge: number; distance: number; share: number } | null = null

  room.outline.forEach((start, edge) => {
    const hit = distanceToSegment(point, start, room.outline[(edge + 1) % count])

    if (best === null || hit.distance < best.distance - EPSILON) {
      best = { edge, distance: hit.distance, share: hit.share }
    }
  })

  const { edge, share: nearest } = best as unknown as { edge: number; share: number }
  const start = room.outline[edge]
  const end = room.outline[(edge + 1) % count]
  const edgeLength = distance(start, end)
  let along = nearest * edgeLength

  if (edgeLength > 0) {
    const alongEdge = (target: FloorPlanPoint): number => ((target.x - start.x) * (end.x - start.x) + (target.y - start.y) * (end.y - start.y)) / edgeLength
    // Åpningene som står på denne kanten, som strekk langs den.
    const spans = (room.openings ?? [])
      .filter((opening) => [opening.start, opening.end].every((tip) => distanceToSegment(tip, start, end).distance <= OPENING_WALL_TOLERANCE + EPSILON))
      .map((opening) => [Math.min(alongEdge(opening.start), alongEdge(opening.end)), Math.max(alongEdge(opening.start), alongEdge(opening.end))])

    // Ut av åpningen stedet står i — og av den neste, om den ligger tett inntil.
    for (let pass = 0; pass < spans.length; pass += 1) {
      const inside = spans.find(([from, to]) => along > from - OPENING_MARGIN + EPSILON && along < to + OPENING_MARGIN - EPSILON)

      if (inside === undefined) {
        break
      }

      const before = inside[0] - OPENING_MARGIN
      const after = inside[1] + OPENING_MARGIN

      // Like langt til begge ender (innenfor regnestøyen): enden nærmest kantens start.
      along = clamp(along - before <= after - along + EPSILON ? before : after, 0, edgeLength)
    }
  }

  const share = edgeLength > 0 ? along / edgeLength : nearest
  const raw = { x: start.x + (end.x - start.x) * share, y: start.y + (end.y - start.y) * share }
  const toStart = distance(raw, start)
  const toEnd = distance(raw, end)

  if (Math.min(toStart, toEnd) <= CORNER_TOLERANCE + EPSILON) {
    const corner = toStart <= toEnd ? edge : (edge + 1) % count

    return { edge, point: room.outline[corner], corner }
  }

  return { edge, point: snapPoint(start, raw.x, raw.y), corner: null }
}

/** Skjærer de to linjestykkene hverandre, eller berører de hverandre? */
const segmentsMeet = (a: FloorPlanPoint, b: FloorPlanPoint, c: FloorPlanPoint, d: FloorPlanPoint): boolean => {
  const side = (p: FloorPlanPoint, q: FloorPlanPoint, r: FloorPlanPoint): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const within = (p: FloorPlanPoint, q: FloorPlanPoint, r: FloorPlanPoint): boolean =>
    Math.min(p.x, q.x) - EPSILON <= r.x && r.x <= Math.max(p.x, q.x) + EPSILON && Math.min(p.y, q.y) - EPSILON <= r.y && r.y <= Math.max(p.y, q.y) + EPSILON
  const d1 = side(c, d, a)
  const d2 = side(c, d, b)
  const d3 = side(a, b, c)
  const d4 = side(a, b, d)

  if (((d1 > EPSILON && d2 < -EPSILON) || (d1 < -EPSILON && d2 > EPSILON)) && ((d3 > EPSILON && d4 < -EPSILON) || (d3 < -EPSILON && d4 > EPSILON))) {
    return true
  }

  return (
    (Math.abs(d1) <= EPSILON && within(c, d, a)) ||
    (Math.abs(d2) <= EPSILON && within(c, d, b)) ||
    (Math.abs(d3) <= EPSILON && within(a, b, c)) ||
    (Math.abs(d4) <= EPSILON && within(a, b, d))
  )
}

/** Avstanden fra et punkt til den nærmeste av kantene (punktpar etter hverandre i `path`, uten å lukke den). */
const distanceToPath = (point: FloorPlanPoint, path: readonly FloorPlanPoint[]): number => {
  let nearest = Number.POSITIVE_INFINITY

  for (let index = 0; index + 1 < path.length; index += 1) {
    nearest = Math.min(nearest, distanceToSegment(point, path[index], path[index + 1]).distance)
  }

  return nearest
}

/** Målene til et rom som ikke er målt ennå: den som viser rommet regner dem av geometrien, og serveren ved lagring. */
const unmeasured = (room: FloorPlanRoom): FloorPlanRoom['measurements'] =>
  Object.fromEntries(Object.keys(room.measurements).map((key) => [key, null])) as FloorPlanRoom['measurements']

export interface SplitRoomOptions {
  /** Navnet det nye rommet får: 1–120 tegn. Teksten kommer fra den som kaller (språkfilene). */
  name: string
  /** Id-en det nye rommet får. */
  roomId?: string
  /** Lager id-er til de nye veggene. */
  newId?: () => string
}

/**
 * Deler et rom i to med en skillelinje mellom to steder på omrisset.
 * `from` og `to` legges på omrisset (`outlineSpot`), og linja må gå gjennom
 * rommet: den kan ikke følge en kant, krysse omrisset eller gå utenfor, og
 * hvert av de to rommene må få et gulv på minst 0,01 m².
 *
 * - Omrisset deles i to langs linja. Rommet med størst gulv beholder id,
 *   navn, romtype og farger; det andre er nytt, med navnet fra `options`,
 *   samme farger og ingen romtype. Det nye står rett etter det gamle i planen.
 * - En vegg linja ender midt på (mer enn 0,05 m fra veggens ender), deles i
 *   to der; den første delen beholder id-en. En skrå overkant deles med.
 * - Vegger og åpninger følger rommet de står i: det rommet hvis egne kanter
 *   (ikke skillelinja) midtpunktet er nærmest, når det er innenfor 0,15 m;
 *   ellers rommet midtpunktet ligger inne i. Inventar følger midtpunktet sitt.
 * - Skillelinja blir en vegg i hvert av rommene. Under skråtak får den takets
 *   høyde langs linja som overkant; ellers rommets takhøyde (medianen av
 *   veggenes høyder), eller ingen høyde når ingen vegg har en.
 *
 * Kan rommet ikke deles slik, er planen den samme.
 */
export const splitRoom = <P extends FloorPlanDocument>(plan: P, roomId: string, from: FloorPlanPoint, to: FloorPlanPoint, options: SplitRoomOptions): P => {
  const room = plan.rooms.find((candidate) => candidate.id === roomId)
  const name = options.name.trim()
  const newId = options.newId ?? newFloorPlanId

  if (room === undefined || plan.rooms.length >= PLAN_MAX_ROOMS || name.length < 1 || name.length > ROOM_NAME_MAX_LENGTH) {
    return plan
  }

  const first = outlineSpot(room, from)
  const second = outlineSpot(room, to)

  if (first === null || second === null || samePoint(first.point, second.point)) {
    return plan
  }

  // Omrisset med de to stedene som egne punkter.
  const outline: FloorPlanPoint[] = []
  const placed = new Map<OutlineSpot, number>()

  room.outline.forEach((corner, edge) => {
    for (const spot of [first, second]) {
      if (spot.corner === edge) {
        placed.set(spot, outline.length)
      }
    }

    outline.push(corner)

    const onEdge = [first, second]
      .filter((spot) => spot.corner === null && spot.edge === edge)
      .sort((left, right) => distance(corner, left.point) - distance(corner, right.point))

    for (const spot of onEdge) {
      placed.set(spot, outline.length)
      outline.push(spot.point)
    }
  })

  const start = placed.get(first)
  const end = placed.get(second)

  if (start === undefined || end === undefined || start === end) {
    return plan
  }

  const walk = (fromIndex: number, toIndex: number): FloorPlanPoint[] => {
    const points: FloorPlanPoint[] = []

    for (let index = fromIndex; ; index = (index + 1) % outline.length) {
      points.push(outline[index])

      if (index === toIndex) {
        return points
      }
    }
  }

  // Hvert rom er sin vei rundt omrisset; skillelinja lukker begge.
  const paths = [walk(start, end), walk(end, start)]

  if (paths.some((path) => path.length < 3 || path.length > ROOM_MAX_OUTLINE_POINTS || polygonArea(path) < ROOM_MIN_AREA)) {
    return plan
  }

  const a = outline[start]
  const b = outline[end]
  const crossesOutline = outline.some((point, index) => {
    const next = (index + 1) % outline.length

    return index !== start && index !== end && next !== start && next !== end && segmentsMeet(a, b, point, outline[next])
  })

  if (crossesOutline || !isInside({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, room.outline)) {
    return plan
  }

  // Hvilket av de to rommene et punkt hører til: 0 eller 1.
  const partOf = (point: FloorPlanPoint): number => {
    const gaps = paths.map((path) => distanceToPath(point, path))

    if (Math.min(gaps[0], gaps[1]) <= OPENING_WALL_TOLERANCE + EPSILON) {
      return gaps[1] < gaps[0] - EPSILON ? 1 : 0
    }

    return isInside(point, paths[0]) ? 0 : 1
  }
  const middleOf = (line: { start: FloorPlanPoint; end: FloorPlanPoint }): FloorPlanPoint => ({ x: (line.start.x + line.end.x) / 2, y: (line.start.y + line.end.y) / 2 })

  let walls = room.walls

  for (const spot of [a, b]) {
    walls = walls.flatMap((wall) => {
      const length = wallLength(wall)
      const hit = distanceToSegment(spot, wall.start, wall.end)
      const inside = hit.distance <= CORNER_TOLERANCE + EPSILON && hit.share * length > CORNER_TOLERANCE + EPSILON && (1 - hit.share) * length > CORNER_TOLERANCE + EPSILON

      return inside ? [wallSlice(wall, 0, hit.share, wall.id), wallSlice(wall, hit.share, 1, newId())] : [wall]
    })
  }

  if (walls.length + 2 > ROOM_MAX_WALLS * 2) {
    return plan
  }

  // Skilleveggen: under skråtak takets høyde langs linja, ellers rommets takhøyde.
  const divider = (wallStart: FloorPlanPoint, wallEnd: FloorPlanPoint): FloorPlanWall => {
    const blank: FloorPlanWall = { id: newId(), start: wallStart, end: wallEnd, height: null, profile: null, color: null }
    const profile = isSlopedRoom(room) ? ceilingProfileAlong(room, wallStart, wallEnd) : null

    if (profile !== null) {
      return withProfile(blank, profile) ?? blank
    }

    const height = levelHeight(room.walls)

    return height === null ? blank : { ...blank, height: snap(clamp(height, CEILING_HEIGHT_RANGE.min, CEILING_HEIGHT_RANGE.max)) }
  }

  const parts = paths.map((path, part) => ({
    outline: path,
    walls: [...walls.filter((wall) => partOf(middleOf(wall)) === part), part === 0 ? divider(a, b) : divider(b, a)],
    openings: room.openings.filter((opening) => partOf(middleOf(opening)) === part),
    objects: room.objects.filter((object) => (isInside(object.center, paths[0]) ? 0 : 1) === part),
  }))

  if (parts.some((part) => part.walls.length > ROOM_MAX_WALLS)) {
    return plan
  }

  const keeper = polygonArea(paths[0]) >= polygonArea(paths[1]) ? 0 : 1
  const kept: FloorPlanRoom = { ...room, ...parts[keeper] }
  const added: FloorPlanRoom = { ...room, ...parts[1 - keeper], id: options.roomId ?? newId(), name, category: null, measurements: unmeasured(room) }

  return { ...plan, rooms: plan.rooms.flatMap((candidate) => (candidate.id === roomId ? [kept, added] : [candidate])) }
}

interface SharedEdge {
  /** Kanten i det første rommet, og kanten i det andre (i det andre rommets omriss slik det står). */
  edge: number
  otherEdge: number
  /** Stykket de to kantene ligger langs hverandre, som avstand langs den første kanten fra starten. */
  from: number
  to: number
  /** Det andre rommets omriss går motsatt vei av det første, og er snudd i sammenslåingen. */
  reversed: boolean
}

const signedPolygonArea = (outline: readonly FloorPlanPoint[]): number =>
  outline.reduce((sum, point, index) => {
    const next = outline[(index + 1) % outline.length]

    return sum + (point.x * next.y - next.x * point.y)
  }, 0) / 2

/**
 * Kantene to rom møtes langs: en kant i hvert omriss som går langs samme
 * linje (innenfor 3°), høyst 0,4 m fra hverandre (veggen mellom rommene), og
 * som ligger langs hverandre i minst 0,1 m. Av flere slike par gjelder det
 * med lengst felles stykke, det første av to like lange. Null når rommene
 * ikke møtes slik.
 */
const sharedEdge = (first: readonly FloorPlanPoint[], second: readonly FloorPlanPoint[]): SharedEdge | null => {
  if (first.length < 3 || second.length < 3) {
    return null
  }

  // Går omrissene samme vei rundt, går kantene de møtes langs hver sin vei.
  const reversed = signedPolygonArea(first) > 0 !== signedPolygonArea(second) > 0
  const other = reversed ? [...second].reverse() : second
  let best: (SharedEdge & { overlap: number }) | null = null

  first.forEach((a0, edge) => {
    const a1 = first[(edge + 1) % first.length]
    const length = distance(a0, a1)

    if (length <= EPSILON) {
      return
    }

    const dx = (a1.x - a0.x) / length
    const dy = (a1.y - a0.y) / length
    const alongEdge = (point: FloorPlanPoint): number => (point.x - a0.x) * dx + (point.y - a0.y) * dy
    const offLine = (point: FloorPlanPoint): number => Math.abs((point.x - a0.x) * dy - (point.y - a0.y) * dx)

    other.forEach((b0, otherEdge) => {
      const b1 = other[(otherEdge + 1) % other.length]
      const otherLength = distance(b0, b1)

      if (otherLength <= EPSILON) {
        return
      }

      const ex = (b1.x - b0.x) / otherLength
      const ey = (b1.y - b0.y) / otherLength

      if (Math.abs(dx * ey - dy * ex) > 0.05 || dx * ex + dy * ey >= 0 || offLine(b0) > MERGE_GAP + EPSILON || offLine(b1) > MERGE_GAP + EPSILON) {
        return
      }

      const from = Math.max(0, Math.min(alongEdge(b0), alongEdge(b1)))
      const to = Math.min(length, Math.max(alongEdge(b0), alongEdge(b1)))

      if (to - from >= MERGE_MIN_OVERLAP - EPSILON && (best === null || to - from > best.overlap + EPSILON)) {
        best = { edge, otherEdge: reversed ? (second.length - 2 - otherEdge + second.length) % second.length : otherEdge, from, to, reversed, overlap: to - from }
      }
    })
  })

  return best
}

/** Tar bort like punkter etter hverandre og punkter som ligger på den rette linja mellom naboene. */
const tidyOutline = (points: readonly FloorPlanPoint[]): FloorPlanPoint[] => {
  const result = [...points]

  for (let changed = true; changed && result.length > 3; ) {
    changed = false

    for (let index = 0; index < result.length && result.length > 3; index += 1) {
      const previous = result[(index + result.length - 1) % result.length]
      const next = result[(index + 1) % result.length]

      if (distance(result[index], previous) <= 0.005 || distanceToSegment(result[index], previous, next).distance <= 0.002) {
        result.splice(index, 1)
        changed = true
        index -= 1
      }
    }
  }

  return result
}

/**
 * Veggene uten stykket som lå langs kanten fra `start` til `end`, mellom
 * `from` og `to` meter fra `start`: en vegg langs kanten (begge endene
 * innenfor 0,15 m fra linja) kortes, deles i to eller blir borte. Et stykke
 * kortere enn 0,1 m blir ikke stående.
 */
const wallsWithout = (walls: readonly FloorPlanWall[], start: FloorPlanPoint, end: FloorPlanPoint, from: number, to: number, newId: () => string): FloorPlanWall[] => {
  const length = distance(start, end)
  const dx = (end.x - start.x) / length
  const dy = (end.y - start.y) / length
  const alongEdge = (point: FloorPlanPoint): number => (point.x - start.x) * dx + (point.y - start.y) * dy
  const offLine = (point: FloorPlanPoint): number => Math.abs((point.x - start.x) * dy - (point.y - start.y) * dx)

  return walls.flatMap((wall) => {
    const span = alongEdge(wall.end) - alongEdge(wall.start)

    if (offLine(wall.start) > OPENING_WALL_TOLERANCE + EPSILON || offLine(wall.end) > OPENING_WALL_TOLERANCE + EPSILON || Math.abs(span) <= EPSILON) {
      return [wall]
    }

    const low = Math.min(alongEdge(wall.start), alongEdge(wall.end))
    const high = Math.max(alongEdge(wall.start), alongEdge(wall.end))
    const cutFrom = Math.max(low, from)
    const cutTo = Math.min(high, to)

    if (cutTo - cutFrom <= EPSILON) {
      return [wall]
    }

    // Stykkene som blir stående, som andeler av veggen fra veggens egen start.
    const share = (value: number): number => (value - alongEdge(wall.start)) / span
    const kept = [
      [low, cutFrom],
      [cutTo, high],
    ]
      .filter(([pieceFrom, pieceTo]) => pieceTo - pieceFrom >= WALL_LENGTH_RANGE.min - EPSILON)
      .map(([pieceFrom, pieceTo]) => [share(pieceFrom), share(pieceTo)].sort((left, right) => left - right))
      .sort((left, right) => left[0] - right[0])

    return kept.map(([pieceFrom, pieceTo], index) => wallSlice(wall, clamp(pieceFrom, 0, 1), clamp(pieceTo, 0, 1), index === 0 ? wall.id : newId()))
  })
}

/** Rommene `roomId` kan slås sammen med: de som møter det langs en kant (`mergeRooms`). */
export const mergeableRoomIds = (plan: FloorPlanDocument, roomId: string): string[] => {
  const room = plan.rooms.find((candidate) => candidate.id === roomId)

  return room === undefined
    ? []
    : plan.rooms.filter((other) => other.id !== roomId && sharedEdge(room.outline, other.outline) !== null).map((other) => other.id)
}

/**
 * Slår to rom sammen til ett — det motsatte av å dele. Rommene må møtes
 * langs en kant (`sharedEdge`): veggen mellom dem blir borte, og omrisset
 * går rundt begge.
 *
 * - Rommet `roomId` består, med id, navn, romtype og farger; `otherRoomId`
 *   blir borte, og det som sto i det (vegger, åpninger, inventar) flyttes over.
 * - Stykket der kantene lå langs hverandre er ikke lenger vegg: vegger langs
 *   det kortes, deles eller fjernes i begge rommene, og åpninger som sto der
 *   (midtpunktet innenfor 0,15 m fra kanten, på stykket) fjernes.
 *
 * Møtes rommene ikke langs en kant, eller blir rommet for stort for
 * kontrakten, er planen den samme.
 */
export const mergeRooms = <P extends FloorPlanDocument>(plan: P, roomId: string, otherRoomId: string, newId: () => string = newFloorPlanId): P => {
  const room = plan.rooms.find((candidate) => candidate.id === roomId)
  const other = plan.rooms.find((candidate) => candidate.id === otherRoomId)
  const shared = room === undefined || other === undefined || roomId === otherRoomId ? null : sharedEdge(room.outline, other.outline)

  if (room === undefined || other === undefined || shared === null) {
    return plan
  }

  const count = room.outline.length
  const otherCount = other.outline.length
  const a0 = room.outline[shared.edge]
  const a1 = room.outline[(shared.edge + 1) % count]
  const b0 = other.outline[shared.otherEdge]
  const b1 = other.outline[(shared.otherEdge + 1) % otherCount]
  const length = distance(a0, a1)
  const pointAt = (metres: number): FloorPlanPoint => ({ ...a0, x: a0.x + ((a1.x - a0.x) * metres) / length, y: a0.y + ((a1.y - a0.y) * metres) / length })

  // Rundt det første rommet fra kantens slutt til kantens start, så rundt det andre på samme måte.
  const around = Array.from({ length: count }, (_, step) => room.outline[(shared.edge + 1 + step) % count])
  const aroundOther = Array.from({ length: otherCount }, (_, step) =>
    shared.reversed ? other.outline[(shared.otherEdge - step + otherCount * 2) % otherCount] : other.outline[(shared.otherEdge + 1 + step) % otherCount],
  )
  const outline = tidyOutline([...around, ...aroundOther])

  if (outline.length < 3 || outline.length > ROOM_MAX_OUTLINE_POINTS) {
    return plan
  }

  // Det felles stykket, målt langs hver sin kant.
  const otherLength = distance(b0, b1)
  const alongOther = (point: FloorPlanPoint): number => ((point.x - b0.x) * (b1.x - b0.x) + (point.y - b0.y) * (b1.y - b0.y)) / otherLength
  const otherFrom = Math.min(alongOther(pointAt(shared.from)), alongOther(pointAt(shared.to)))
  const otherTo = Math.max(alongOther(pointAt(shared.from)), alongOther(pointAt(shared.to)))

  const stoodThere = (opening: FloorPlanOpening, start: FloorPlanPoint, end: FloorPlanPoint, from: number, to: number): boolean => {
    const edgeLength = distance(start, end)
    const middle = { x: (opening.start.x + opening.end.x) / 2, y: (opening.start.y + opening.end.y) / 2 }
    const along = ((middle.x - start.x) * (end.x - start.x) + (middle.y - start.y) * (end.y - start.y)) / edgeLength
    const off = Math.abs((middle.x - start.x) * (end.y - start.y) - (middle.y - start.y) * (end.x - start.x)) / edgeLength

    return off <= OPENING_WALL_TOLERANCE + EPSILON && along >= from - EPSILON && along <= to + EPSILON
  }

  const walls = [...wallsWithout(room.walls, a0, a1, shared.from, shared.to, newId), ...wallsWithout(other.walls, b0, b1, otherFrom, otherTo, newId)]
  const openings = [
    ...room.openings.filter((opening) => !stoodThere(opening, a0, a1, shared.from, shared.to)),
    ...other.openings.filter((opening) => !stoodThere(opening, b0, b1, otherFrom, otherTo)),
  ]
  const objects = [...room.objects, ...other.objects]

  if (walls.length > ROOM_MAX_WALLS || openings.length > ROOM_MAX_OPENINGS || objects.length > ROOM_MAX_OBJECTS) {
    return plan
  }

  const merged: FloorPlanRoom = { ...room, outline, walls, openings, objects }

  return { ...plan, rooms: plan.rooms.flatMap((candidate) => (candidate.id === otherRoomId ? [] : candidate.id === roomId ? [merged] : [candidate])) }
}

/* ------------------------------------------------------------------ */
/* Treff i tegningen                                                   */
/* ------------------------------------------------------------------ */

/** Er punktet inne i inventarets (dreide) rektangel? */
const insideObject = (point: FloorPlanPoint, object: FloorPlanObject, slack: number): boolean => {
  const dx = point.x - object.center.x
  const dy = point.y - object.center.y
  const cos = Math.cos(-object.rotation)
  const sin = Math.sin(-object.rotation)
  const localX = dx * cos - dy * sin
  const localY = dx * sin + dy * cos

  return Math.abs(localX) <= object.width / 2 + slack && Math.abs(localY) <= object.depth / 2 + slack
}

/**
 * Hva et trykk i tegningen treffer. Rekkefølgen er fast: hjørne foran
 * åpning foran inventar foran vegg foran rom. `tolerance` er hvor langt fra
 * et hjørne, en åpning eller en vegg trykket kan være, i meter (tegningen
 * regner den om fra piksler). Innen samme slag vinner det nærmeste; står to
 * like nær — en vegg to rom deler — vinner rommet i `preferRoomId`, ellers
 * det første. Inventar og rom som ligger oppå hverandre: det som er tegnet
 * sist (øverst) vinner.
 */
export const hitTest = (
  plan: FloorPlanDocument,
  point: FloorPlanPoint,
  tolerance: number,
  preferRoomId: string | null = null,
  /** Without corners (SIGN-2017): where the drawing only picks elements, a corner is not something to pick. */
  corners = true,
): FloorPlanSelection | null => {
  // Det foretrukne rommet prøves først, så det vinner når to står like nær.
  const rooms = [...plan.rooms].sort((left, right) => Number(right.id === preferRoomId) - Number(left.id === preferRoomId))

  let corner: { selection: FloorPlanSelection; distance: number } | null = null

  for (const room of corners ? rooms : []) {
    for (let index = 0; index < room.outline.length; index += 1) {
      const gap = distance(point, room.outline[index])

      if (gap <= tolerance + EPSILON && (corner === null || gap < corner.distance - EPSILON)) {
        corner = { selection: { kind: 'corner', roomId: room.id, index }, distance: gap }
      }
    }
  }

  if (corner !== null) {
    return corner.selection
  }

  let opening: { selection: FloorPlanSelection; distance: number } | null = null

  for (const room of rooms) {
    for (const candidate of room.openings) {
      const gap = distanceToSegment(point, candidate.start, candidate.end).distance

      if (gap <= tolerance + EPSILON && (opening === null || gap < opening.distance - EPSILON)) {
        opening = { selection: { kind: 'opening', roomId: room.id, openingId: candidate.id }, distance: gap }
      }
    }
  }

  if (opening !== null) {
    return opening.selection
  }

  for (const room of [...plan.rooms].reverse()) {
    for (const candidate of [...room.objects].reverse()) {
      if (insideObject(point, candidate, 0)) {
        return { kind: 'object', roomId: room.id, objectId: candidate.id }
      }
    }
  }

  let wall: { selection: FloorPlanSelection; distance: number } | null = null

  for (const room of rooms) {
    for (const candidate of room.walls) {
      const gap = distanceToSegment(point, candidate.start, candidate.end).distance

      if (gap <= tolerance + EPSILON && (wall === null || gap < wall.distance - EPSILON)) {
        wall = { selection: { kind: 'wall', roomId: room.id, wallId: candidate.id }, distance: gap }
      }
    }
  }

  if (wall !== null) {
    return wall.selection
  }

  for (const room of [...plan.rooms].reverse()) {
    if (isInside(point, room.outline)) {
      return { kind: 'room', roomId: room.id }
    }
  }

  return null
}

/** Finnes det som er valgt fortsatt i planen? Etter angring kan det være borte. */
export const selectionExists = (plan: FloorPlanDocument, selection: FloorPlanSelection | null): boolean => {
  const room = selection === null ? undefined : plan.rooms.find((candidate) => candidate.id === selection.roomId)

  if (selection === null || room === undefined) {
    return false
  }

  switch (selection.kind) {
    case 'room':
      return true
    case 'wall':
      return room.walls.some((wall) => wall.id === selection.wallId)
    case 'corner':
      return selection.index >= 0 && selection.index < room.outline.length
    case 'opening':
      return room.openings.some((opening) => opening.id === selection.openingId)
    case 'object':
      return room.objects.some((object) => object.id === selection.objectId)
  }
}
