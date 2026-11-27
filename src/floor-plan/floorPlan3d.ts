import type { FloorPlanDocument, FloorPlanObject, FloorPlanOpening, FloorPlanPoint, FloorPlanRoom, FloorPlanWall } from './model'
import { toFloorPlanObjectCategory, toFloorPlanOpeningKind, type FloorPlanObjectCategory, type FloorPlanOpeningKind } from './model'
import { ceilingPieces, ceilingTriangles, profileHeight, slopedProfile } from './floorPlanCeiling'
import { doorLeaf, openingSeat } from './floorPlanEditing'
import { furnitureSolid, type FurniturePart, type FurnitureTone } from './floorPlanFurniture'
import { distance, distanceToSegment, isSharedWall, leftNormal, normalToward, roomCenter } from './floorPlanGeometry'

/**
 * 3D-visningen av en plantegning (SIGN-1981), som rene tall. Visningen
 * BYGGES AV PLANENS EGNE DATA, så den alltid stemmer med det som er
 * redigert — USDZ-modellen fra skanningen er et frosset bilde av skanningen.
 * Her regnes bare geometrien: punkter, trekanter og farger. Den som tegner
 * (three.js i `floorPlan3dRenderer`) gjør tallene om til flater, og testene
 * leser tallene uten WebGL.
 *
 * Reglene er kontraktens (kapittel 2), de samme som i Sign-appen. Planens x
 * er 3D-ens x, planens y er 3D-ens z, og høyden er y — alt i meter:
 *
 * - Gulvet er rommets omriss som en flate i y = 0, i gulvfargen.
 * - En vegg er en stående skive fra start til slutt, 0,1 m tykk, fra y = 0
 *   til veggens høyde (uten høyde: medianen av rommets vegghøyder, ellers
 *   2,4 m), i veggens egen farge eller rommets veggfarge. En vegg to rom
 *   deler er hvert roms halvdel av skiven, så hver side får sitt roms farge.
 * - En åpning er et hull gjennom veggen den står på (samme regel som i
 *   redigeringen), fra brystningen til brystning + høyde, klemt til veggen.
 *   Et vindu får en tynn, gjennomskinnelig rute; dør og åpning står åpne.
 * - Inventar er typens form (SIGN-1987) — satt sammen av bokser og
 *   sylindre i `floorPlanFurniture`, strukket til inventarets bredde, dybde
 *   og høyde — dreid om loddlinjen, så høy som oppgitt (eller typens vanlige
 *   høyde), og stående på gulvet eller så høyt over det som inventaret sier
 *   (`elevation`: en servant på veggen). En type uten form er en boks.
 * - Taket tegnes ikke (man ser ned i rommene, som i et dukkehus). Takfargen
 *   vises som et smalt bånd langs toppen av rommets vegger.
 *
 * Skråtak (SIGN-1982): en vegg med skrå overkant (`profile`) tegnes med
 * toppen langs overkanten, og takbåndet følger den. I et rom med skråtak
 * tegnes også selve takflaten — den veggene bærer (`floorPlanCeiling`) — som
 * en gjennomskinnelig hinne i takfargen, så formen på taket synes uten at
 * rommet skjules. En dør som sier hvor den er hengslet og hvilken vei den
 * slår, får et dørblad som står åpent, slik buen i plantegningen viser.
 */

export type Vec3 = [number, number, number]

/** En farge som tre tall mellom 0 og 1 (sRGB). */
export type Rgb = [number, number, number]

/** `ghost` (SIGN-2014): a wall or an object a sketch has removed, drawn translucent where it stood. */
export type FloorPlan3dMeshKind = 'floor' | 'wall' | 'pane' | 'object' | 'ceiling' | 'roof' | 'door' | 'ghost'

export interface FloorPlan3dMesh {
  kind: FloorPlan3dMeshKind
  roomId: string
  /** Veggen, åpningen eller inventaret flaten hører til; null for gulv, takbånd og takflate. */
  id: string | null
  /** x, y, z for hvert punkt, etter hverandre. */
  positions: number[]
  /** Tre og tre punktnumre: én trekant hver, med forsiden ut (mot klokka sett utenfra). */
  indices: number[]
  color: Rgb
  /** 1 er tett; vindusruta er gjennomskinnelig. */
  opacity: number
}

export interface FloorPlan3dBounds {
  min: Vec3
  max: Vec3
}

export interface FloorPlan3dScene {
  meshes: FloorPlan3dMesh[]
  /** Rammen rundt alt som tegnes; null for en plan uten noe å tegne. */
  bounds: FloorPlan3dBounds | null
}

/** Tonene som gjelder der personen ikke har valgt farge, som `#rrggbb`. Den som tegner henter dem fra temaet. */
export interface FloorPlan3dTones {
  floor: string
  wall: string
  object: string
  pane: string
  /** Inventarets lyse deler (porselen, madrass, puter) og mørke (skjerm, glass, sokkel); uten dem blandes de av `object`. */
  objectSoft?: string
  objectStrong?: string
  /** What a sketch has added is tinted with this, and what it has removed is a ghost in this (SIGN-2014). */
  added?: string
  removed?: string
}

/**
 * What a sketch has changed, for the 3D view (SIGN-2014): the keys
 * (`wall:<id>`, `opening:<id>`, `object:<id>`) of what is new, and the base
 * rooms holding only the walls and objects that are gone.
 */
export interface FloorPlan3dMarks {
  added: ReadonlySet<string>
  removed: readonly FloorPlanRoom[]
}

/** The tones of the marks for the one who has no theme to read them from (tests). */
export const DEFAULT_3D_MARK_TONES = { added: '#4f8a3c', removed: '#b4392b' } as const
/** How much of the «new» tone a new element takes, and how dense a ghost is. */
export const ADDED_TINT = 0.6
export const GHOST_OPACITY = 0.3

/** Nøytrale toner for den som ikke har et tema å hente fra (tester, prøvebilder). */
export const DEFAULT_3D_TONES: FloorPlan3dTones = { floor: '#e9eaeb', wall: '#c9cdd0', object: '#9aa1a6', pane: '#9fb1c1' }

/**
 * The tones and the background of the snapshot «Make picture» sends
 * (SIGN-2014): always light, whatever theme the person has, and never with
 * the marks of what a sketch has changed. The picture is made from what the
 * snapshot shows — a dark room would be drawn dark, and the ghost of a wall
 * that is gone would be drawn as a wall. The same rule as in the Sign app.
 */
export const ILLUSTRATION_3D_TONES: FloorPlan3dTones = DEFAULT_3D_TONES
export const ILLUSTRATION_3D_BACKGROUND = '#ffffff'

export const WALL_THICKNESS = 0.1
/** Høyden på en vegg uten høyde, når ingen av rommets vegger har en. */
export const DEFAULT_WALL_HEIGHT = 2.4
export const PANE_THICKNESS = 0.02
export const PANE_OPACITY = 0.35
/** Takbåndet: så høyt, og så langt ut fra veggen. */
export const CEILING_BAND_HEIGHT = 0.06
const CEILING_BAND_PROUD = 0.004
/** Takflaten under skråtak er en hinne man ser gjennom. */
export const ROOF_OPACITY = 0.28
/** Dørbladet: så tykt. */
export const DOOR_LEAF_THICKNESS = 0.04

/**
 * Hver vegg er noen tideler av en centimeter lavere enn den forrige (null
 * til sju millimeter). Der to vegger møtes i et hjørne ligger toppene ellers
 * i nøyaktig samme plan, og to flater i samme plan flimrer når de har ulik
 * farge. Forskjellen er for liten til å se, men nok til at én alltid ligger
 * øverst.
 */
const WALL_TOP_STAGGER = 0.001
const WALL_TOP_STAGGER_STEPS = 8
/**
 * Der en vegg ender i et åpent hjørne går skiven nesten en halv
 * veggtykkelse forbi enden, så to vegger som møtes fyller hjørnet.
 * Endeflaten stopper fire millimeter før naboveggens ytterside, så de to
 * aldri ligger i samme plan.
 */
const WALL_OVERLAP = WALL_THICKNESS / 2 - 0.004

/** Brystningen og høyden en åpning får når den ikke har egne mål. */
export const OPENING_3D_DEFAULTS: Record<FloorPlanOpeningKind, { sill: number; height: number }> = {
  door: { sill: 0, height: 2 },
  window: { sill: 0.9, height: 1.2 },
  opening: { sill: 0, height: 2 },
}

/** Høyden inventar får når den ikke er oppgitt. */
export const OBJECT_DEFAULT_HEIGHTS: Record<FloorPlanObjectCategory, number> = {
  // Til toppen av sisternen: setet ligger litt over halvveis opp.
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
  // Structural (SIGN-2014): a column without a height is as tall as a wall without one; a beam is a quarter of a metre.
  column: 2.4,
  beam: 0.25,
}

/** Inventar av en type koden ikke kjenner tegnes som en lav, nøytral boks — typen gjettes ikke. */
export const UNKNOWN_OBJECT_HEIGHT = 0.8

const EPSILON = 1e-6
/** En åpning i naborommet skjærer også denne veggen når midtpunktet er så nær den (som «står på»-regelen). */
const SHARED_OPENING_TOLERANCE = 0.15

/* ------------------------------------------------------------------ */
/* Farger                                                              */
/* ------------------------------------------------------------------ */

/** `#rrggbb` som tre tall mellom 0 og 1; null for alt annet. */
export const hexToRgb = (color: string | null | undefined): Rgb | null => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec((color ?? '').trim())

  return match === null ? null : [Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255]
}

/** To farger blandet: `share` av `over` oppå `base`. */
export const mixHex = (base: string, over: string, share: number): string => {
  const from = hexToRgb(base) ?? [1, 1, 1]
  const to = hexToRgb(over) ?? from
  const channel = (index: number): string =>
    Math.round((from[index] + (to[index] - from[index]) * share) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** Fargen personen har valgt, ellers tonen som gjelder uten valg. */
const colorOr = (chosen: string | null | undefined, tone: string, fallback: string): Rgb => hexToRgb(chosen) ?? hexToRgb(tone) ?? (hexToRgb(fallback) as Rgb)

/* ------------------------------------------------------------------ */
/* Flater                                                              */
/* ------------------------------------------------------------------ */

interface MeshBuilder {
  positions: number[]
  indices: number[]
}

const builder = (): MeshBuilder => ({ positions: [], indices: [] })

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/**
 * En firkant med egne punkter (så lyset faller flatt på den), snudd slik at
 * forsiden vender den veien `outward` peker.
 */
const quad = (mesh: MeshBuilder, a: Vec3, b: Vec3, c: Vec3, d: Vec3, outward: Vec3): void => {
  const facing = dot(cross(subtract(b, a), subtract(c, a)), outward) >= 0
  const corners = facing ? [a, b, c, d] : [a, d, c, b]
  const first = mesh.positions.length / 3

  for (const corner of corners) {
    mesh.positions.push(corner[0], corner[1], corner[2])
  }

  mesh.indices.push(first, first + 1, first + 2, first, first + 2, first + 3)
}

/* ------------------------------------------------------------------ */
/* Gulv                                                                */
/* ------------------------------------------------------------------ */

const signedArea2d = (points: readonly FloorPlanPoint[]): number => {
  let sum = 0

  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length]

    sum += points[index].x * next.y - next.x * points[index].y
  }

  return sum / 2
}

const cross2d = (origin: FloorPlanPoint, a: FloorPlanPoint, b: FloorPlanPoint): number => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)

const insideTriangle = (point: FloorPlanPoint, a: FloorPlanPoint, b: FloorPlanPoint, c: FloorPlanPoint): boolean =>
  cross2d(a, b, point) >= -EPSILON && cross2d(b, c, point) >= -EPSILON && cross2d(c, a, point) >= -EPSILON

/**
 * Deler en mangekant i trekanter (ørekutting): tre og tre punktnumre i
 * omrisset. Tåler omriss tegnet begge veier og rom med innhukk (L-form).
 * Færre enn tre punkter, eller et omriss uten flate, gir ingen trekanter.
 */
export const triangulatePolygon = (outline: readonly FloorPlanPoint[]): number[] => {
  const area = signedArea2d(outline)

  if (outline.length < 3 || Math.abs(area) < EPSILON) {
    return []
  }

  // Ørekuttingen går mot klokka; et omriss tegnet andre veien leses baklengs.
  const order = outline.map((_, index) => index)

  if (area < 0) {
    order.reverse()
  }

  const triangles: number[] = []
  let guard = order.length * order.length

  while (order.length > 3 && guard > 0) {
    guard -= 1
    let cut = false

    for (let index = 0; index < order.length; index += 1) {
      const previous = order[(index + order.length - 1) % order.length]
      const current = order[index]
      const next = order[(index + 1) % order.length]
      const [a, b, c] = [outline[previous], outline[current], outline[next]]
      const turn = cross2d(a, b, c)

      // Et hjørne som bøyer innover er ikke et øre.
      if (turn < -EPSILON) {
        continue
      }

      // Tre punkter på linje: midtpunktet kuttes uten å gi en trekant.
      if (turn > EPSILON && order.some((other) => other !== previous && other !== current && other !== next && insideTriangle(outline[other], a, b, c))) {
        continue
      }

      if (turn > EPSILON) {
        triangles.push(previous, current, next)
      }

      order.splice(index, 1)
      cut = true
      break
    }

    if (!cut) {
      break
    }
  }

  if (order.length === 3 && Math.abs(cross2d(outline[order[0]], outline[order[1]], outline[order[2]])) > EPSILON) {
    triangles.push(order[0], order[1], order[2])
  }

  return triangles
}

const floorMesh = (room: FloorPlanRoom, tones: FloorPlan3dTones): FloorPlan3dMesh | null => {
  const triangles = triangulatePolygon(room.outline)

  if (triangles.length === 0) {
    return null
  }

  const indices: number[] = []

  // I planen går trekantene mot klokka; sett ovenfra i 3D (y opp, planens y
  // er z) er det med klokka. De snus, så forsiden vender opp.
  for (let index = 0; index < triangles.length; index += 3) {
    indices.push(triangles[index], triangles[index + 2], triangles[index + 1])
  }

  return {
    kind: 'floor',
    roomId: room.id,
    id: null,
    positions: room.outline.flatMap((point) => [point.x, 0, point.y]),
    indices,
    color: colorOr(room.floorColor, tones.floor, DEFAULT_3D_TONES.floor),
    opacity: 1,
  }
}

/* ------------------------------------------------------------------ */
/* Vegger og åpninger                                                  */
/* ------------------------------------------------------------------ */

/** Høyden veggene uten egen høyde får: medianen av rommets positive vegghøyder, ellers 2,4 m. */
export const fallbackWallHeight = (room: Pick<FloorPlanRoom, 'walls'>): number => {
  const heights = room.walls
    .map((wall) => wall.height ?? 0)
    .filter((height) => height > 0)
    .sort((left, right) => left - right)

  if (heights.length === 0) {
    return DEFAULT_WALL_HEIGHT
  }

  const middle = Math.floor(heights.length / 2)

  return heights.length % 2 === 1 ? heights[middle] : (heights[middle - 1] + heights[middle]) / 2
}

export const wallHeight = (room: Pick<FloorPlanRoom, 'walls'>, wall: Pick<FloorPlanWall, 'height'>): number =>
  (wall.height ?? 0) > 0 ? (wall.height as number) : fallbackWallHeight(room)

export interface WallHole {
  openingId: string
  /** Vindu får rute; alt annet står åpent. */
  pane: boolean
  /** Langs veggen fra veggens start, i meter. */
  from: number
  to: number
  /** Fra gulvet, i meter. */
  bottom: number
  top: number
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/**
 * Hullene i en vegg: åpningene som står på den (nærmeste vegg til åpningens
 * midtpunkt innenfor 0,15 m — samme regel som i redigeringen), fra
 * brystningen til brystning + høyde, klemt til veggen. Uten egne mål gjelder
 * typens: dør og åpning fra gulvet og 2,0 m opp, vindu fra 0,9 m og 1,2 m
 * opp. En type koden ikke kjenner er et hull som en åpning, uten rute. Et
 * hull uten utstrekning etter klemmingen finnes ikke.
 *
 * En vegg to rom deler er to skiver på samme sted, og åpningen hører bare
 * til det ene rommet. `neighbours` er de andre rommene i planen: en åpning
 * der som står på en vegg som ligger oppå denne (midtpunktet innenfor
 * 0,15 m av denne veggen, og langs den) skjærer hull i denne også — ellers
 * ville døra mellom to rom vært åpen fra den ene siden og murt igjen fra den
 * andre. Ruta i et vindu tegnes bare av rommet som eier vinduet.
 */
export const wallHoles = (
  room: Pick<FloorPlanRoom, 'walls' | 'openings'>,
  wall: FloorPlanWall,
  neighbours: readonly Pick<FloorPlanRoom, 'walls' | 'openings'>[] = [],
): WallHole[] => {
  const length = distance(wall.start, wall.end)
  const height = wallHeight(room, wall)

  if (length < EPSILON) {
    return []
  }

  const hole = (opening: FloorPlanOpening, from: number, width: number, own: boolean): WallHole[] => {
    const kind = toFloorPlanOpeningKind(opening.kind)
    const defaults = OPENING_3D_DEFAULTS[kind ?? 'opening']
    const sill = typeof opening.sill === 'number' && Number.isFinite(opening.sill) ? opening.sill : defaults.sill
    const tall = typeof opening.height === 'number' && Number.isFinite(opening.height) && opening.height > 0 ? opening.height : defaults.height
    const cut: WallHole = {
      openingId: opening.id,
      pane: own && kind === 'window',
      from: clamp(from, 0, length),
      to: clamp(from + width, 0, length),
      bottom: clamp(sill, 0, height),
      top: clamp(sill + tall, 0, height),
    }

    return cut.to - cut.from > EPSILON && cut.top - cut.bottom > EPSILON ? [cut] : []
  }

  const own = room.openings.flatMap((opening: FloorPlanOpening) => {
    const seat = openingSeat(room, opening)

    return seat === null || seat.wall.id !== wall.id ? [] : hole(opening, seat.distance, seat.width, true)
  })

  const along = { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length }

  const shared = neighbours.flatMap((neighbour) =>
    neighbour.openings.flatMap((opening: FloorPlanOpening) => {
      // Åpningen må stå på en vegg i sitt eget rom, og den veggen må ligge langs denne.
      const seat = openingSeat(neighbour, opening)
      const width = distance(opening.start, opening.end)

      if (seat === null || width < EPSILON) {
        return []
      }

      const parallel = Math.abs(((opening.end.x - opening.start.x) * along.x + (opening.end.y - opening.start.y) * along.y) / width)
      const middle = { x: (opening.start.x + opening.end.x) / 2, y: (opening.start.y + opening.end.y) / 2 }
      const hit = distanceToSegment(middle, wall.start, wall.end)

      return parallel < 0.95 || hit.distance > SHARED_OPENING_TOLERANCE ? [] : hole(opening, hit.share * length - width / 2, width, false)
    }),
  )

  return [...own, ...shared]
}

/** Ligger punktet inne i skiven rundt en vegg (en halv veggtykkelse til hver side, fra start til slutt)? */
const insideSlabOf = (point: FloorPlanPoint, wall: Pick<FloorPlanWall, 'start' | 'end'>): boolean => {
  const length = distance(wall.start, wall.end)

  if (length < EPSILON) {
    return false
  }

  const dx = (wall.end.x - wall.start.x) / length
  const dy = (wall.end.y - wall.start.y) / length
  const along = (point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy
  const across = (point.x - wall.start.x) * dy - (point.y - wall.start.y) * dx

  return along >= -EPSILON && along <= length + EPSILON && Math.abs(across) <= WALL_THICKNESS / 2 + EPSILON
}

/**
 * Hvor langt skiven går forbi en veggende. Rett utenfor enden ligger en
 * liten rute, en veggtykkelse bred: der to vegger møtes i et hjørne dekker
 * naboveggen bare den ene halvdelen, og skiven forlenges så hjørnet blir
 * fylt. Dekker andre vegger begge halvdelene — veggen fortsetter i en annen
 * vegg, eller ender midt på en vegg — forlenges den ikke: da ville enden
 * bare ligget skjult inne i en annen vegg, tett bak flaten dens.
 */
const endOverlap = (wall: FloorPlanWall, atEnd: boolean, others: readonly FloorPlanWall[]): number => {
  const length = distance(wall.start, wall.end)
  const sign = atEnd ? 1 : -1
  const out = { x: (sign * (wall.end.x - wall.start.x)) / length, y: (sign * (wall.end.y - wall.start.y)) / length }
  const tip = atEnd ? wall.end : wall.start
  const quarter = WALL_THICKNESS / 4
  const covered = [1, -1].every((side) => {
    const sample = { x: tip.x + out.x * quarter - out.y * side * quarter, y: tip.y + out.y * quarter + out.x * side * quarter }

    return others.some((other) => insideSlabOf(sample, other))
  })

  return covered ? 0 : WALL_OVERLAP
}

/** Veggens egne akser — langs veggen, og inn mot rommet — og hvor skiven står i dem. */
interface WallFrame {
  length: number
  /** Veggens høyde (det høyeste punktet), og toppen skiven tegnes til der (se `WALL_TOP_STAGGER`). */
  height: number
  top: number
  /** Toppen `along` meter fra veggens start: lik `top` for en vannrett vegg, langs overkanten for en skrå. */
  topAt: (along: number) => number
  /** Knekkene i en skrå overkant, i meter fra veggens start (begge endene med); tom for en vannrett vegg. */
  bends: number[]
  /** Skivens to sider, målt fra vegglinja inn mot rommet: en yttervegg står midt på linja, en delt vegg bare på rommets egen side. */
  outer: number
  inner: number
  /** Hvor langt skiven går forbi starten og slutten. */
  before: number
  after: number
  /** Punktet `along` meter fra start, `up` meter over gulvet og `inward` meter inn mot rommet. */
  at: (along: number, up: number, inward: number) => Vec3
  alongAxis: Vec3
  inwardAxis: Vec3
}

interface WallSetting {
  /** Rommets midte, som sier hvilken side av veggen rommet ligger på. */
  middle: FloorPlanPoint | null
  /** Omrissene til de andre rommene i planen, og alle de andre veggene. */
  otherOutlines: readonly (readonly FloorPlanPoint[])[]
  otherWalls: readonly FloorPlanWall[]
  /** Veggens nummer i planen. */
  order: number
}

const wallFrame = (room: FloorPlanRoom, wall: FloorPlanWall, setting: WallSetting): WallFrame | null => {
  const length = distance(wall.start, wall.end)
  const inward = normalToward(wall.start, wall.end, setting.middle)

  if (length < EPSILON || inward === null) {
    return null
  }

  const along = { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length }
  const height = wallHeight(room, wall)
  // En vegg to rom deler er to halve skiver, én på hver side av vegglinja:
  // til sammen én vegg på 0,1 m, med hvert roms farge på sin side.
  const shared = isSharedWall(wall.start, wall.end, setting.middle, setting.otherOutlines)
  const stagger = (setting.order % WALL_TOP_STAGGER_STEPS) * WALL_TOP_STAGGER
  const sloped = slopedProfile(wall)

  return {
    length,
    height,
    top: height - stagger,
    topAt: (u) => (sloped === null ? height - stagger : Math.max(0, (profileHeight(wall, u / length) ?? height) - stagger)),
    bends: sloped === null ? [] : sloped.map((point) => point.at * length),
    outer: shared ? 0 : -WALL_THICKNESS / 2,
    inner: WALL_THICKNESS / 2,
    before: endOverlap(wall, false, setting.otherWalls),
    after: endOverlap(wall, true, setting.otherWalls),
    at: (u, v, w) => [wall.start.x + along.x * u + inward.x * w, v, wall.start.y + along.y * u + inward.y * w],
    alongAxis: [along.x, 0, along.y],
    inwardAxis: [inward.x, 0, inward.y],
  }
}

const UP: Vec3 = [0, 1, 0]
const negate = (axis: Vec3): Vec3 => [-axis[0], -axis[1], -axis[2]]

/** Sorterte, unike snitt mellom `min` og `max`. */
const cuts = (values: number[], min: number, max: number): number[] => {
  const sorted = [...values, min, max].filter((value) => value >= min - EPSILON && value <= max + EPSILON).sort((left, right) => left - right)

  return sorted.filter((value, index) => index === 0 || value - sorted[index - 1] > EPSILON)
}

/**
 * En boks i veggens akser, med de flatene som bes om. `faces` sier hvilke
 * sider som skal med (alle når den mangler).
 */
const frameBox = (
  mesh: MeshBuilder,
  frame: Pick<WallFrame, 'at' | 'alongAxis' | 'inwardAxis'>,
  along: [number, number],
  up: [number, number],
  inward: [number, number],
  faces: { bottom?: boolean; outer?: boolean } = {},
): void => {
  const [u0, u1] = along
  const [v0, v1] = up
  const [w0, w1] = inward
  const p = frame.at

  quad(mesh, p(u0, v0, w1), p(u1, v0, w1), p(u1, v1, w1), p(u0, v1, w1), frame.inwardAxis)

  if (faces.outer !== false) {
    quad(mesh, p(u0, v0, w0), p(u1, v0, w0), p(u1, v1, w0), p(u0, v1, w0), negate(frame.inwardAxis))
  }

  quad(mesh, p(u0, v0, w0), p(u0, v0, w1), p(u0, v1, w1), p(u0, v1, w0), negate(frame.alongAxis))
  quad(mesh, p(u1, v0, w0), p(u1, v0, w1), p(u1, v1, w1), p(u1, v1, w0), frame.alongAxis)
  quad(mesh, p(u0, v1, w0), p(u1, v1, w0), p(u1, v1, w1), p(u0, v1, w1), UP)

  if (faces.bottom !== false) {
    quad(mesh, p(u0, v0, w0), p(u1, v0, w0), p(u1, v0, w1), p(u0, v0, w1), negate(UP))
  }
}

/**
 * Veggskiven med hull: veggen deles i ruter av hullenes kanter, og hver rute
 * som ikke ligger i et hull får for- og bakside — og en kant mot hver
 * naborute som er hull, så man ser veggtykkelsen i åpningene. Undersiden mot
 * gulvet tegnes ikke.
 *
 * Under en skrå overkant (SIGN-1982) er toppen av en rute skåret av
 * overkanten: kolonnene deles også ved hver knekk og der overkanten krysser
 * en hullkant, så overkanten i hver rute enten ligger over den, under den
 * eller går rett gjennom den fra side til side.
 */
const wallSlab = (mesh: MeshBuilder, frame: WallFrame, holes: readonly WallHole[]): void => {
  const { outer, inner, top } = frame
  const from = -frame.before
  const to = frame.length + frame.after
  const vs = cuts(holes.flatMap((hole) => [Math.min(hole.bottom, top), Math.min(hole.top, top)]), 0, top)
  const p = frame.at

  // Der overkanten krysser en rad (en hullkant), deles kolonnen.
  const crossings: number[] = []

  for (let index = 0; index + 1 < frame.bends.length; index += 1) {
    const [u0, u1] = [frame.bends[index], frame.bends[index + 1]]
    const [t0, t1] = [frame.topAt(u0), frame.topAt(u1)]

    for (const level of vs) {
      if ((t0 - level) * (t1 - level) < 0) {
        crossings.push(u0 + ((u1 - u0) * (level - t0)) / (t1 - t0))
      }
    }
  }

  const us = cuts([...holes.flatMap((hole) => [hole.from, hole.to]), ...frame.bends, ...crossings], from, to)

  const inHole = (column: number, row: number): boolean => {
    const u = (us[column] + us[column + 1]) / 2
    const v = (vs[row] + vs[row + 1]) / 2

    return holes.some((hole) => u > hole.from && u < hole.to && v > hole.bottom && v < hole.top)
  }

  /** Finnes det vegg i ruta: den er ikke et hull, og overkanten ligger over rutas underkant et sted. */
  const solid = (column: number, row: number): boolean => {
    if (column < 0 || row < 0 || column >= us.length - 1 || row >= vs.length - 1) {
      return false
    }

    return !inHole(column, row) && Math.max(frame.topAt(us[column]), frame.topAt(us[column + 1])) > vs[row] + EPSILON
  }

  for (let column = 0; column < us.length - 1; column += 1) {
    const [u0, u1] = [us[column], us[column + 1]]
    const [topLeft, topRight] = [frame.topAt(u0), frame.topAt(u1)]

    for (let row = 0; row < vs.length - 1; row += 1) {
      if (!solid(column, row)) {
        continue
      }

      const v0 = vs[row]
      // Rutas overkant i hver side: radens, eller veggens overkant når den ligger lavere.
      const left = Math.min(vs[row + 1], topLeft)
      const right = Math.min(vs[row + 1], topRight)
      const cut = left < vs[row + 1] - EPSILON || right < vs[row + 1] - EPSILON

      for (const [w, outward] of [
        [inner, frame.inwardAxis],
        [outer, negate(frame.inwardAxis)],
      ] as const) {
        // En rute som er skåret ned til et hjørne er en trekant: hjørnene tas i en rekkefølge der de tre første ikke ligger på linje.
        if (right - v0 <= EPSILON) {
          quad(mesh, p(u0, v0, w), p(u1, v0, w), p(u0, left, w), p(u0, left, w), outward)
        } else {
          quad(mesh, p(u0, v0, w), p(u1, v0, w), p(u1, right, w), p(u0, left, w), outward)
        }
      }

      if (!solid(column - 1, row) && left - v0 > EPSILON) {
        quad(mesh, p(u0, v0, outer), p(u0, v0, inner), p(u0, left, inner), p(u0, left, outer), negate(frame.alongAxis))
      }

      if (!solid(column + 1, row) && right - v0 > EPSILON) {
        quad(mesh, p(u1, v0, outer), p(u1, v0, inner), p(u1, right, inner), p(u1, right, outer), frame.alongAxis)
      }

      // Toppen: der ruta er skåret av overkanten, og der det ikke står vegg over den.
      if (cut || !solid(column, row + 1)) {
        quad(mesh, p(u0, left, outer), p(u1, right, outer), p(u1, right, inner), p(u0, left, inner), UP)
      }

      // Undersiden: bare over et hull (overkanten av en åpning) — aldri mot gulvet.
      if (row > 0 && !solid(column, row - 1)) {
        quad(mesh, p(u0, v0, outer), p(u1, v0, outer), p(u1, v0, inner), p(u0, v0, inner), negate(UP))
      }
    }
  }
}

/**
 * Takbåndet langs toppen av en vegg med skrå overkant: en smal stripe i
 * takfargen på veggens innside, stykke for stykke langs overkanten.
 */
const slopedBand = (mesh: MeshBuilder, frame: WallFrame): void => {
  const p = frame.at
  const w = frame.inner + CEILING_BAND_PROUD

  for (let index = 0; index + 1 < frame.bends.length; index += 1) {
    const [u0, u1] = [frame.bends[index], frame.bends[index + 1]]
    const [t0, t1] = [frame.topAt(u0), frame.topAt(u1)]

    quad(
      mesh,
      p(u0, Math.max(0, t0 - CEILING_BAND_HEIGHT), w),
      p(u1, Math.max(0, t1 - CEILING_BAND_HEIGHT), w),
      p(u1, t1 + CEILING_BAND_PROUD, w),
      p(u0, t0 + CEILING_BAND_PROUD, w),
      frame.inwardAxis,
    )
  }
}

/**
 * Takflaten i et rom med skråtak: flaten veggene bærer, som trekanter. Null
 * for et rom med flatt tak — der tegnes taket ikke.
 */
const roofMesh = (room: FloorPlanRoom, tones: FloorPlan3dTones): FloorPlan3dMesh | null => {
  const triangles = ceilingTriangles(ceilingPieces(room))

  if (triangles.length === 0) {
    return null
  }

  const positions: number[] = []
  const indices: number[] = []

  for (const triangle of triangles) {
    for (const [x, y, height] of triangle) {
      indices.push(positions.length / 3)
      positions.push(x, height, y)
    }
  }

  return { kind: 'roof', roomId: room.id, id: null, positions, indices, color: colorOr(room.ceilingColor, tones.wall, DEFAULT_3D_TONES.wall), opacity: ROOF_OPACITY }
}

/**
 * Dørbladet til en dør som sier hvor den er hengslet eller hvilken vei den
 * slår: en tynn plate fra hengselet og rett ut på slagsiden, like lang som
 * åpningen er bred — døra står åpen, som buen i plantegningen viser. En dør
 * som ikke sier noe, har ikke blad (den tegnes som før: et hull i veggen).
 */
const doorLeafMesh = (room: FloorPlanRoom, opening: FloorPlanOpening, tones: FloorPlan3dTones): FloorPlan3dMesh | null => {
  const stated = (opening.hinge ?? null) !== null || (opening.swing ?? null) !== null
  const width = distance(opening.start, opening.end)
  const left = leftNormal(opening.start, opening.end)

  if (toFloorPlanOpeningKind(opening.kind) !== 'door' || !stated || left === null || width < EPSILON) {
    return null
  }

  const leaf = doorLeaf(room, opening)
  const [hinge, far] = leaf.hinge === 'end' ? [opening.end, opening.start] : [opening.start, opening.end]
  const out = leaf.swing === 'left' ? left : { x: -left.x, y: -left.y }
  const across = { x: (far.x - hinge.x) / width, y: (far.y - hinge.y) / width }
  const defaults = OPENING_3D_DEFAULTS.door
  const bottom = typeof opening.sill === 'number' && Number.isFinite(opening.sill) ? Math.max(0, opening.sill) : defaults.sill
  const tall = typeof opening.height === 'number' && Number.isFinite(opening.height) && opening.height > 0 ? opening.height : defaults.height
  const mesh = builder()

  // Bladets egne akser: ut fra veggen langs bladet, og tykkelsen inn i åpningen.
  frameBox(
    mesh,
    {
      at: (u, v, w) => [hinge.x + out.x * u + across.x * w, v, hinge.y + out.y * u + across.y * w],
      alongAxis: [out.x, 0, out.y],
      inwardAxis: [across.x, 0, across.y],
    },
    [0, width],
    [bottom, bottom + tall],
    [0, DOOR_LEAF_THICKNESS],
  )

  return { kind: 'door', roomId: room.id, id: opening.id, ...mesh, color: colorOr(null, tones.object, DEFAULT_3D_TONES.object), opacity: 1 }
}

/* ------------------------------------------------------------------ */
/* Inventar                                                            */
/* ------------------------------------------------------------------ */

/** Høyden inventaret tegnes med: den oppgitte, ellers typens vanlige. */
export const objectHeight = (object: Pick<FloorPlanObject, 'category' | 'height'>): number => {
  if (typeof object.height === 'number' && Number.isFinite(object.height) && object.height > 0) {
    return object.height
  }

  const category = toFloorPlanObjectCategory(object.category)

  return category === null ? UNKNOWN_OBJECT_HEIGHT : OBJECT_DEFAULT_HEIGHTS[category]
}

/** Hvor høyt over gulvet inventarets underside er: det oppgitte, ellers står det på gulvet. */
export const objectElevation = (object: Pick<FloorPlanObject, 'elevation'>): number =>
  typeof object.elevation === 'number' && Number.isFinite(object.elevation) && object.elevation > 0 ? object.elevation : 0

/** En trekant med egne punkter, snudd slik at forsiden vender den veien `outward` peker. */
const triangle = (mesh: MeshBuilder, a: Vec3, b: Vec3, c: Vec3, outward: Vec3): void => {
  const facing = dot(cross(subtract(b, a), subtract(c, a)), outward) >= 0
  const first = mesh.positions.length / 3

  for (const corner of facing ? [a, b, c] : [a, c, b]) {
    mesh.positions.push(corner[0], corner[1], corner[2])
  }

  mesh.indices.push(first, first + 1, first + 2)
}

/** Aksene inventarets egen ramme har i rommet: dit et punkt (x, y, z) i ramma havner, og hvilken vei aksene peker. */
interface ObjectFrame {
  at: (x: number, y: number, z: number) => Vec3
  right: Vec3
  forward: Vec3
}

/** En boks i inventarets egen ramme, med alle seks sidene (undersiden synes når inventaret henger på veggen). */
const partBox = (mesh: MeshBuilder, frame: ObjectFrame, part: FurniturePart): void => {
  const [x0, y0, z0] = part.min
  const [x1, y1, z1] = part.max
  const p = frame.at

  quad(mesh, p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), frame.forward)
  quad(mesh, p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0), negate(frame.forward))
  quad(mesh, p(x1, y0, z0), p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0), frame.right)
  quad(mesh, p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), negate(frame.right))
  quad(mesh, p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1), UP)
  quad(mesh, p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), negate(UP))
}

/**
 * En sylinder som fyller boksen sin: en mangekant rundt aksen, med flate
 * sider (lavpoly). Står aksen (`y`), ligger mangekanten i gulvplanet; ligger
 * den (`z`), vender mangekanten forsiden fram — som luka på en vaskemaskin.
 */
const partCylinder = (mesh: MeshBuilder, frame: ObjectFrame, part: FurniturePart): void => {
  const [x0, y0, z0] = part.min
  const [x1, y1, z1] = part.max
  const sides = Math.max(3, Math.round(part.sides))
  const upright = part.axis === 'y'
  // Mangekanten ligger i planet på tvers av aksen: (x, z) når aksen står, (x, y) når den ligger.
  const centerU = (x0 + x1) / 2
  const centerV = upright ? (z0 + z1) / 2 : (y0 + y1) / 2
  const radiusU = (x1 - x0) / 2
  const radiusV = upright ? (z1 - z0) / 2 : (y1 - y0) / 2
  const [low, high] = upright ? [y0, y1] : [z0, z1]
  const place = (u: number, v: number, w: number): Vec3 => (upright ? frame.at(u, w, v) : frame.at(u, v, w))
  const direction = (u: number, v: number, w: number): Vec3 => {
    const origin = frame.at(0, 0, 0)
    const tip = upright ? frame.at(u, w, v) : frame.at(u, v, w)

    return [tip[0] - origin[0], tip[1] - origin[1], tip[2] - origin[2]]
  }
  // Halv vinkel forskjøvet, så en flate — ikke en kant — vender rett fram, og
  // hjørnene så langt ut at flatene ligger på ellipsen: mangekanten fyller boksen sin.
  const reach = 1 / Math.cos(Math.PI / sides)
  const corner = (index: number): [number, number] => {
    const angle = ((index + 0.5) * 2 * Math.PI) / sides

    return [centerU + Math.cos(angle) * radiusU * reach, centerV + Math.sin(angle) * radiusV * reach]
  }

  for (let index = 0; index < sides; index += 1) {
    const [u0, v0] = corner(index)
    const [u1, v1] = corner(index + 1)
    const middle = ((index + 1) * 2 * Math.PI) / sides

    quad(mesh, place(u0, v0, low), place(u1, v1, low), place(u1, v1, high), place(u0, v0, high), direction(Math.cos(middle), Math.sin(middle), 0))
    triangle(mesh, place(centerU, centerV, high), place(u0, v0, high), place(u1, v1, high), direction(0, 0, 1))
    triangle(mesh, place(centerU, centerV, low), place(u0, v0, low), place(u1, v1, low), direction(0, 0, -1))
  }
}

/** Tonene inventarets deler tegnes i: den vanlige, den lyse og den mørke. */
const objectTones = (tones: FloorPlan3dTones): Record<FurnitureTone, Rgb> => {
  const base = hexToRgb(tones.object) === null ? DEFAULT_3D_TONES.object : tones.object

  return {
    base: hexToRgb(base) as Rgb,
    soft: hexToRgb(tones.objectSoft) ?? (hexToRgb(mixHex(base, '#ffffff', 0.45)) as Rgb),
    strong: hexToRgb(tones.objectStrong) ?? (hexToRgb(mixHex(base, '#000000', 0.35)) as Rgb),
  }
}

/**
 * Inventaret som flater: én samling per tone delene har, alle med
 * inventarets id. Formen er typens (og utformingens), strukket til bredden,
 * dybden og høyden, og løftet så høyt over gulvet som inventaret sier.
 */
const objectMeshes = (roomId: string, object: FloorPlanObject, tones: FloorPlan3dTones): FloorPlan3dMesh[] => {
  if (!(object.width > 0) || !(object.depth > 0)) {
    return []
  }

  const cos = Math.cos(object.rotation)
  const sin = Math.sin(object.rotation)
  const base = objectElevation(object)
  // Inventarets egne akser, dreid om loddlinjen: planens dreining fra x mot y er 3D-ens fra x mot z.
  const right: Vec3 = [cos, 0, sin]
  const forward: Vec3 = [-sin, 0, cos]
  const frame: ObjectFrame = {
    at: (x, y, z) => [object.center.x + right[0] * x + forward[0] * z, base + y, object.center.y + right[2] * x + forward[2] * z],
    right,
    forward,
  }
  const colors = objectTones(tones)
  const builders = new Map<FurnitureTone, MeshBuilder>()

  for (const part of furnitureSolid(object, objectHeight(object))) {
    const mesh = builders.get(part.tone) ?? builder()

    builders.set(part.tone, mesh)

    if (part.kind === 'cylinder') {
      partCylinder(mesh, frame, part)
    } else {
      partBox(mesh, frame, part)
    }
  }

  return [...builders].map(([tone, mesh]) => ({ kind: 'object', roomId, id: object.id, ...mesh, color: colors[tone], opacity: 1 }))
}

/* ------------------------------------------------------------------ */
/* Scenen                                                              */
/* ------------------------------------------------------------------ */

const boundsOf = (meshes: readonly FloorPlan3dMesh[]): FloorPlan3dBounds | null => {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]

  for (const mesh of meshes) {
    for (let index = 0; index < mesh.positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], mesh.positions[index + axis])
        max[axis] = Math.max(max[axis], mesh.positions[index + axis])
      }
    }
  }

  return Number.isFinite(min[0]) ? { min, max } : null
}

/** The key a mark addresses a mesh by; null for what cannot be marked (floors, ceilings). */
const markKey = (mesh: FloorPlan3dMesh): string | null => {
  if (mesh.id === null) {
    return null
  }

  switch (mesh.kind) {
    case 'wall':
      return `wall:${mesh.id}`
    case 'object':
      return `object:${mesh.id}`
    case 'pane':
    case 'door':
      return `opening:${mesh.id}`
    default:
      return null
  }
}

/**
 * The scene with a sketch's changes shown (SIGN-2014): what is new is
 * tinted, and the walls and objects that are gone stand as translucent
 * ghosts where they stood. Nothing else in the scene changes.
 */
const withMarks = (scene: FloorPlan3dScene, marks: FloorPlan3dMarks, tones: FloorPlan3dTones): FloorPlan3dScene => {
  const addedTone = hexToRgb(tones.added) ?? (hexToRgb(DEFAULT_3D_MARK_TONES.added) as Rgb)
  const removedTone = hexToRgb(tones.removed) ?? (hexToRgb(DEFAULT_3D_MARK_TONES.removed) as Rgb)
  const tint = (color: Rgb): Rgb => [0, 1, 2].map((channel) => color[channel] + (addedTone[channel] - color[channel]) * ADDED_TINT) as Rgb

  const meshes = scene.meshes.map((mesh) => {
    const key = markKey(mesh)

    return key !== null && marks.added.has(key) ? { ...mesh, color: tint(mesh.color) } : mesh
  })

  const ghosts = buildFloorPlan3d({ rooms: [...marks.removed] }, tones)
    .meshes.filter((mesh) => mesh.kind === 'wall' || mesh.kind === 'object')
    .map((mesh): FloorPlan3dMesh => ({ ...mesh, kind: 'ghost', color: removedTone, opacity: GHOST_OPACITY }))

  const all = [...meshes, ...ghosts]

  return { meshes: all, bounds: boundsOf(all) }
}

/**
 * Hele planen som flater: gulv, vegger med hull, vindusruter, inventar og
 * takbånd for hvert rom. `tones` er tonene som gjelder der personen ikke har
 * valgt farge. `options.marks` shows what a sketch has changed (SIGN-2014).
 */
export const buildFloorPlan3d = (
  plan: FloorPlanDocument,
  tones: FloorPlan3dTones = DEFAULT_3D_TONES,
  options: { marks?: FloorPlan3dMarks | null } = {},
): FloorPlan3dScene => {
  const marked = options.marks ?? null

  if (marked !== null) {
    return withMarks(buildFloorPlan3d(plan, tones), marked, tones)
  }

  const meshes: FloorPlan3dMesh[] = []
  const allWalls = plan.rooms.flatMap((room) => room.walls)
  let wallOrder = 0

  for (const room of plan.rooms) {
    const middle = roomCenter(room.outline)
    const floor = floorMesh(room, tones)

    if (floor !== null) {
      meshes.push(floor)
    }

    const ceilingColor = hexToRgb(room.ceilingColor)
    const band = builder()
    const others = plan.rooms.filter((other) => other.id !== room.id)
    const otherOutlines = others.map((other) => other.outline)

    for (const wall of room.walls) {
      const frame = wallFrame(room, wall, { middle, otherOutlines, otherWalls: allWalls.filter((other) => other !== wall), order: wallOrder })

      if (frame === null) {
        continue
      }

      wallOrder += 1

      const holes = wallHoles(room, wall, others)
      const slab = builder()

      wallSlab(slab, frame, holes)
      meshes.push({ kind: 'wall', roomId: room.id, id: wall.id, ...slab, color: colorOr(wall.color ?? room.wallColor, tones.wall, DEFAULT_3D_TONES.wall), opacity: 1 })

      for (const hole of holes.filter((candidate) => candidate.pane)) {
        const pane = builder()

        // Ruta står midt i veggen, på vegglinja.
        frameBox(pane, frame, [hole.from, hole.to], [hole.bottom, hole.top], [-PANE_THICKNESS / 2, PANE_THICKNESS / 2])
        meshes.push({ kind: 'pane', roomId: room.id, id: hole.openingId, ...pane, color: colorOr(null, tones.pane, DEFAULT_3D_TONES.pane), opacity: PANE_OPACITY })
      }

      // Takbåndet: øverst på veggens innside, fra vegglinja og litt ut i rommet — langs overkanten når den er skrå.
      if (ceilingColor !== null && frame.bends.length > 0) {
        slopedBand(band, frame)
      } else if (ceilingColor !== null) {
        frameBox(
          band,
          frame,
          [-frame.before, frame.length + frame.after],
          [Math.max(0, frame.height - CEILING_BAND_HEIGHT), frame.height + CEILING_BAND_PROUD],
          [0, frame.inner + CEILING_BAND_PROUD],
          { outer: false },
        )
      }
    }

    if (ceilingColor !== null && band.indices.length > 0) {
      meshes.push({ kind: 'ceiling', roomId: room.id, id: null, ...band, color: ceilingColor, opacity: 1 })
    }

    for (const opening of room.openings) {
      const leaf = doorLeafMesh(room, opening, tones)

      if (leaf !== null) {
        meshes.push(leaf)
      }
    }

    // Under skråtak tegnes takflaten veggene bærer, som en hinne man ser gjennom.
    const roof = roofMesh(room, tones)

    if (roof !== null) {
      meshes.push(roof)
    }

    for (const object of room.objects) {
      meshes.push(...objectMeshes(room.id, object, tones))
    }
  }

  return { meshes, bounds: boundsOf(meshes) }
}

/* ------------------------------------------------------------------ */
/* Kameraet                                                            */
/* ------------------------------------------------------------------ */

export interface FloorPlan3dCamera {
  position: Vec3
  target: Vec3
  near: number
  far: number
}

/** Synsvinkelen loddrett, i grader. */
export const CAMERA_FOV = 40
/** Hvor høyt over vannrett kameraet står når visningen åpnes, og hvor langt det er vridd til siden. */
const CAMERA_ELEVATION = (62 * Math.PI) / 180
const CAMERA_AZIMUTH = (-22 * Math.PI) / 180
const CAMERA_MARGIN = 1.12

/**
 * Utgangspunktet: kameraet ser ned på hele planen på skrå, forfra (planens
 * nedre kant nærmest) og litt fra siden, så langt unna at alt får plass i
 * bildet uansett om det er bredt eller høyt.
 */
export const fitCamera = (bounds: FloorPlan3dBounds, aspect: number, fov = CAMERA_FOV): FloorPlan3dCamera => {
  const target: Vec3 = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2, (bounds.min[2] + bounds.max[2]) / 2]
  const radius = Math.max(0.5, Math.hypot(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]) / 2)
  const vertical = (fov * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * Math.max(aspect, 0.01))
  // Kula rundt planen skal få plass i den smaleste av de to synsvinklene.
  const reach = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * CAMERA_MARGIN
  const direction: Vec3 = [Math.sin(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION), Math.sin(CAMERA_ELEVATION), Math.cos(CAMERA_AZIMUTH) * Math.cos(CAMERA_ELEVATION)]

  return {
    position: [target[0] + direction[0] * reach, target[1] + direction[1] * reach, target[2] + direction[2] * reach],
    target,
    near: Math.max(0.05, reach / 50),
    far: reach * 10 + radius,
  }
}
