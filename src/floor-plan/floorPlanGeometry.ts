import type { FloorPlanPoint } from './model'
import { toFloorPlanDoorHinge, toFloorPlanDoorSwing } from './model'
import { ceilingArea, ceilingPieces, ceilingVolume, isSlopedRoom, meanWallHeight, wallHeightRange, type WallProfilePoint } from './floorPlanCeiling'

/**
 * Geometrien bak plantegningen (SIGN-794). Alt regnes i planens egne tall —
 * meter, x mot høyre, y nedover — og tegneren avgjør selv hvor mange piksler
 * en meter er.
 */

export const distance = (from: FloorPlanPoint, to: FloorPlanPoint): number => Math.hypot(to.x - from.x, to.y - from.y)

export const midpoint = (from: FloorPlanPoint, to: FloorPlanPoint): FloorPlanPoint => ({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })

const signedArea = (outline: readonly FloorPlanPoint[]): number => {
  let sum = 0

  outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length]

    sum += point.x * next.y - next.x * point.y
  })

  return sum / 2
}

export const isInside = (point: FloorPlanPoint, outline: readonly FloorPlanPoint[]): boolean => {
  let inside = false

  outline.forEach((current, index) => {
    const previous = outline[(index + outline.length - 1) % outline.length]

    if (current.y > point.y !== previous.y > point.y && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x) {
      inside = !inside
    }
  })

  return inside
}

const average = (outline: readonly FloorPlanPoint[]): FloorPlanPoint => ({
  x: outline.reduce((sum, point) => sum + point.x, 0) / outline.length,
  y: outline.reduce((sum, point) => sum + point.y, 0) / outline.length,
})

/**
 * Punktet «midt i rommet», der navnet står. Tyngdepunktet holder for de
 * fleste rom; i et vinkelrom kan det havne utenfor gulvet, og da brukes
 * midten av det bredeste gulvstykket på samme høyde.
 */
export const roomCenter = (outline: readonly FloorPlanPoint[]): FloorPlanPoint | null => {
  if (outline.length === 0) {
    return null
  }

  const area = signedArea(outline)

  if (outline.length < 3 || Math.abs(area) < 1e-9) {
    return average(outline)
  }

  let x = 0
  let y = 0

  outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length]
    const cross = point.x * next.y - next.x * point.y

    x += (point.x + next.x) * cross
    y += (point.y + next.y) * cross
  })

  const centroid = { x: x / (6 * area), y: y / (6 * area) }

  if (isInside(centroid, outline)) {
    return centroid
  }

  // Skjæringene mellom en vannrett linje gjennom tyngdepunktet og gulvkanten.
  const crossings: number[] = []

  outline.forEach((point, index) => {
    const next = outline[(index + 1) % outline.length]

    if (point.y > centroid.y !== next.y > centroid.y) {
      crossings.push(point.x + ((centroid.y - point.y) * (next.x - point.x)) / (next.y - point.y))
    }
  })

  crossings.sort((left, right) => left - right)

  let widest: [number, number] | null = null

  for (let index = 0; index + 1 < crossings.length; index += 2) {
    if (widest === null || crossings[index + 1] - crossings[index] > widest[1] - widest[0]) {
      widest = [crossings[index], crossings[index + 1]]
    }
  }

  return widest === null ? centroid : { x: (widest[0] + widest[1]) / 2, y: centroid.y }
}

/**
 * Enhetsvektoren vinkelrett på linjen, på den siden `toward` ligger
 * (`away: true` gir motsatt side). Null for en linje uten lengde.
 */
export const normalToward = (
  start: FloorPlanPoint,
  end: FloorPlanPoint,
  toward: FloorPlanPoint | null,
  away = false,
): FloorPlanPoint | null => {
  const length = distance(start, end)

  if (length === 0) {
    return null
  }

  const normal = { x: -(end.y - start.y) / length, y: (end.x - start.x) / length }

  if (toward === null) {
    return normal
  }

  const middle = midpoint(start, end)
  const facing = normal.x * (toward.x - middle.x) + normal.y * (toward.y - middle.y) >= 0

  return facing !== away ? normal : { x: -normal.x, y: -normal.y }
}

/** Tideler av en millimeter holder for en tegning, og sparer markeringen for flyttallsstøy. */
const tidy = (value: number): number => Math.round(value * 10_000) / 10_000

export interface DoorSwing {
  /** Dørbladet: fra hengselet og rett inn i rommet, like langt som åpningen er bred. */
  leaf: { from: FloorPlanPoint; to: FloorPlanPoint }
  /** Kvartsirkelen bladet slår, som SVG-sti i planens egne tall. */
  arc: string
}

/**
 * Enhetsvektoren vinkelrett på linjen fra `start` til `end`, på venstre
 * side slik planen er tegnet (x mot høyre, y nedover): med retningen
 * (dx, dy) er venstre den siden (dy, −dx) peker mot. Null for en linje uten
 * lengde.
 */
export const leftNormal = (start: FloorPlanPoint, end: FloorPlanPoint): FloorPlanPoint | null => {
  const length = distance(start, end)

  return length === 0 ? null : { x: (end.y - start.y) / length, y: -(end.x - start.x) / length }
}

/** Det døra selv sier om hengsel og slag (SIGN-1982); null eller ukjent verdi er «ikke oppgitt». */
export interface DoorLeafFields {
  hinge?: string | null
  swing?: string | null
}

/**
 * Dørsymbolet: bladet står vinkelrett ut fra hengselet, like langt som
 * åpningen er bred, og buen går fra bladets ende til åpningens andre ende.
 * Hengselet er enden døra sier (`hinge`), og bladet står på siden den sier
 * (`swing`). Sier døra ingenting — en dør fra før feltene fantes — tegnes
 * tegnet for «dør» som før: hengslet i åpningens start, inn mot rommets
 * midte.
 */
export const doorSwing = (start: FloorPlanPoint, end: FloorPlanPoint, roomMiddle: FloorPlanPoint | null, door: DoorLeafFields = {}): DoorSwing | null => {
  const width = distance(start, end)
  const swing = toFloorPlanDoorSwing(door.swing)
  const left = leftNormal(start, end)
  const normal = swing === null || left === null ? normalToward(start, end, roomMiddle) : swing === 'left' ? left : { x: -left.x, y: -left.y }

  if (normal === null) {
    return null
  }

  const [hinge, far] = toFloorPlanDoorHinge(door.hinge) === 'end' ? [end, start] : [start, end]
  const tip = { x: tidy(hinge.x + normal.x * width), y: tidy(hinge.y + normal.y * width) }
  const clockwise = normal.x * (far.y - hinge.y) - normal.y * (far.x - hinge.x) > 0
  const radius = tidy(width)

  return {
    leaf: { from: hinge, to: tip },
    arc: `M ${tip.x} ${tip.y} A ${radius} ${radius} 0 0 ${clockwise ? 1 : 0} ${far.x} ${far.y}`,
  }
}

/**
 * Vinkelen teksten langs en linje skrives i, i grader. Teksten står aldri
 * opp ned: vinkelen legges i (−90°, 90°]. Langs en loddrett linje leses den
 * nedenfra og opp (−90°) — på begge sider av planen, som på en tegning man
 * leser fra høyre.
 */
export const readableAngle = (start: FloorPlanPoint, end: FloorPlanPoint): number => {
  let angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI

  if (angle > 90) {
    angle -= 180
  } else if (angle <= -90) {
    angle += 180
  }

  // Så godt som loddrett: samme leseretning som en helt loddrett linje.
  return angle > 90 - VERTICAL_TOLERANCE ? angle - 180 : angle
}

/** Hvor nær loddrett (i grader) en linje må være for å leses nedenfra og opp. */
const VERTICAL_TOLERANCE = 0.5

/** Hvor langt utenfor en vegg det sjekkes om det ligger et annet rom, i meter. */
export const SHARED_WALL_PROBE = 0.3

/**
 * Er veggen delt med et annet rom? Et punkt 0,3 m utenfor veggens midte —
 * på siden som vender bort fra rommets midte — ligger da på gulvet i et av
 * de andre rommene. En delt vegg får ikke mål i tegningen av hele planen;
 * målet står i tegningen av rommet alene.
 */
export const isSharedWall = (
  start: FloorPlanPoint,
  end: FloorPlanPoint,
  roomMiddle: FloorPlanPoint | null,
  otherOutlines: readonly (readonly FloorPlanPoint[])[],
): boolean => {
  const outward = normalToward(start, end, roomMiddle, true)

  if (outward === null) {
    return false
  }

  const middle = midpoint(start, end)
  const probe = { x: middle.x + outward.x * SHARED_WALL_PROBE, y: middle.y + outward.y * SHARED_WALL_PROBE }

  return otherOutlines.some((outline) => isInside(probe, outline))
}

/**
 * Et mål rundet til to desimaler, nøyaktig slik serveren gjør det:
 * `floor(v × 100 + 0,5) / 100`. Samme formel, så forhåndsvisningen viser det
 * tallet lagringen kommer til å svare med.
 */
export const roundMeasurement = (value: number): number => Math.floor(value * 100 + 0.5) / 100

/** Avstanden fra et punkt til et linjestykke, og hvor langt ut på stykket (0–1) det nærmeste punktet ligger. */
export const distanceToSegment = (point: FloorPlanPoint, start: FloorPlanPoint, end: FloorPlanPoint): { distance: number; share: number } => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return { distance: distance(point, start), share: 0 }
  }

  const share = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))

  return { distance: distance(point, { x: start.x + dx * share, y: start.y + dy * share }), share }
}

/** Flaten av en mangekant (skolissformelen), alltid positiv. */
export const polygonArea = (outline: readonly FloorPlanPoint[]): number => Math.abs(signedArea(outline))

export interface RoomMeasurements {
  floorArea: number | null
  wallArea: number | null
  wallAreaGross: number | null
  ceilingArea: number | null
  perimeter: number | null
  ceilingHeight: number | null
  ceilingHeightMin: number | null
  volume: number | null
}

interface MeasuredRoom {
  outline: readonly FloorPlanPoint[]
  walls: readonly { start: FloorPlanPoint; end: FloorPlanPoint; height?: number | null; profile?: readonly WallProfilePoint[] | null }[]
  openings: readonly { start: FloorPlanPoint; end: FloorPlanPoint; height?: number | null }[]
}

const median = (values: number[]): number | null => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const rounded = (value: number | null): number | null => (value === null ? null : roundMeasurement(value))

/**
 * Rommets mål, regnet av geometrien slik serveren regner dem ved lagring
 * (SIGN-1980) — her bare for å vise tallene mens man redigerer; serverens
 * svar er fasiten. Meter, to desimaler (`roundMeasurement`). Et mål som
 * ikke kan regnes er null, aldri 0.
 *
 * - gulv: flaten av omrisset — null når den rundes til 0,00; tak = gulv
 * - omkrets: summen av vegglengdene når rommet har vegger med lengde, ellers omrissets omkrets
 * - takhøyde: medianen av veggenes positive høyder
 * - volum: gulv × takhøyde (urundet)
 * - vegger med åpninger: Σ lengde × høyde over veggene med positiv høyde
 * - vegger: det samme minus Σ bredde × høyde over ALLE åpningene, aldri under 0
 *
 * Et rom under skråtak (SIGN-1982) — minst én vegg har en overkant som ikke
 * er vannrett — måles etter den virkelige formen: en vegg teller med
 * gjennomsnittshøyden sin, takhøyden er veggenes høyeste punkt og
 * `ceilingHeightMin` det laveste, og takflaten og volumet er de til taket
 * veggene bærer (`floorPlanCeiling`). Kan taket ikke bygges over omrisset, er
 * taket lik gulvet og volumet ukjent. Ellers er `ceilingHeightMin` null.
 */
export const roomMeasurements = (room: MeasuredRoom): RoomMeasurements => {
  const area = room.outline.length >= 3 ? polygonArea(room.outline) : 0
  // Et gulv som rundes til 0,00 m² finnes ikke (serveren svarer null).
  const floorArea = roundMeasurement(area) > 0 ? area : null

  const wallLengths = room.walls.map((wall) => distance(wall.start, wall.end)).filter((length) => length > 0)
  const outlinePerimeter = room.outline.length >= 2
    ? room.outline.reduce((sum, point, index) => sum + distance(point, room.outline[(index + 1) % room.outline.length]), 0)
    : 0
  const perimeterLength = wallLengths.length > 0 ? wallLengths.reduce((sum, length) => sum + length, 0) : outlinePerimeter

  const heights = room.walls.map((wall) => wall.height ?? 0).filter((height) => height > 0)
  let ceilingHeight = median(heights)
  let ceilingHeightMin: number | null = null
  let ceiling = floorArea
  let volume = floorArea !== null && ceilingHeight !== null ? floorArea * ceilingHeight : null

  if (isSlopedRoom(room)) {
    const range = wallHeightRange(room.walls)
    const pieces = floorArea === null ? [] : ceilingPieces(room)

    ceilingHeight = range?.max ?? null
    ceilingHeightMin = range?.min ?? null
    ceiling = pieces.length === 0 ? floorArea : ceilingArea(pieces)
    volume = pieces.length === 0 ? null : ceilingVolume(pieces)
  }

  // Flaten under veggens overkant; for en vannrett vegg lengde × høyde.
  const withHeight = room.walls.filter((wall) => (meanWallHeight(wall) ?? 0) > 0)
  const wallAreaGross = withHeight.length > 0
    ? withHeight.reduce((sum, wall) => sum + distance(wall.start, wall.end) * (meanWallHeight(wall) ?? 0), 0)
    : null
  const openingsArea = room.openings.reduce((sum, opening) => sum + distance(opening.start, opening.end) * Math.max(0, opening.height ?? 0), 0)

  return {
    floorArea: rounded(floorArea),
    ceilingArea: rounded(ceiling),
    perimeter: rounded(perimeterLength > 0 ? perimeterLength : null),
    ceilingHeight: rounded(ceilingHeight),
    ceilingHeightMin: rounded(ceilingHeightMin),
    volume: rounded(volume),
    wallAreaGross: rounded(wallAreaGross),
    wallArea: rounded(wallAreaGross === null ? null : Math.max(0, wallAreaGross - openingsArea)),
  }
}
