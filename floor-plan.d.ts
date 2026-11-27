import type { ComputedRef, Ref } from 'vue'

/**
 * `@nordikode/components/floor-plan` (SIGN-2041): ONE implementation of the
 * floor plan — the drawing, the editing rules, the geometry, the furniture
 * symbols, the editor and the 3D view — for every app that shows or edits
 * rooms (floor plans in Sign, sketches in Sketch).
 *
 * This file is maintained by hand, like `index.d.ts` and `web.d.ts`: the
 * build does not write it. It is checked, though — `npm run type-check`
 * fails when the values declared here are not the ones `src/floor-plan`
 * exports (`src/floor-plan/declarations.check.ts`). A type changed in the
 * source is changed here in the same pull request.
 */

/** Flattens an intersection of props into one object type (the generic components below). */
type FloorPlanPrettify<T> = (T extends any ? { [K in keyof T]: T[K] } : { [K in keyof T as K]: T[K] }) & {}

/* ---------- The room document (src/floor-plan/model.ts) ---------- */

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
export declare const FLOOR_PLAN_OPENING_KINDS: readonly ["door", "window", "opening"]
export type FloorPlanOpeningKind = (typeof FLOOR_PLAN_OPENING_KINDS)[number]
export declare const toFloorPlanOpeningKind: (kind: string | null | undefined) => FloorPlanOpeningKind | null
/**
 * Hvilken ende av åpningen en dør er hengslet i, og hvilken side den slår
 * mot (SIGN-1982): venstre eller høyre for linja fra åpningens start til
 * slutt, slik planen er tegnet (x mot høyre, y nedover). Med retningen
 * (dx, dy) er venstre den siden (dy, −dx) peker mot. Nøklene eies av koden;
 * en verdi appen ikke kjenner, er «ikke oppgitt».
 */
export declare const FLOOR_PLAN_DOOR_HINGES: readonly ["start", "end"]
export type FloorPlanDoorHinge = (typeof FLOOR_PLAN_DOOR_HINGES)[number]
export declare const toFloorPlanDoorHinge: (hinge: string | null | undefined) => FloorPlanDoorHinge | null
export declare const FLOOR_PLAN_DOOR_SWINGS: readonly ["left", "right"]
export type FloorPlanDoorSwing = (typeof FLOOR_PLAN_DOOR_SWINGS)[number]
export declare const toFloorPlanDoorSwing: (swing: string | null | undefined) => FloorPlanDoorSwing | null
/** Antall åpninger av én type i rommet — telt på typefeltet, aldri på navn. */
export declare const countOpenings: (room: Pick<FloorPlanRoom, "openings">, kind: FloorPlanOpeningKind) => number
/** Et mål som faktisk er målt: et tall, ikke null og ikke NaN. Null er «ikke målt», aldri 0. */
export declare const measured: (value: number | null | undefined) => number | null
/**
 * Samlet gulvareal for plantegningen. Mangler ett rom arealet, finnes ikke
 * summen: et tall som bare gjelder noen av rommene ville sett ut som hele.
 */
export declare const totalFloorArea: (plan: FloorPlanDocument) => number | null
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
export declare const floorPlanBounds: (plan: FloorPlanDocument) => FloorPlanBounds | null
/** Romtypene koden eier (`category` på rommet). */
export declare const FLOOR_PLAN_ROOM_CATEGORIES: readonly ["living_room", "bedroom", "bathroom", "kitchen", "dining_room"]
export type FloorPlanRoomCategory = (typeof FLOOR_PLAN_ROOM_CATEGORIES)[number]
export declare const toFloorPlanRoomCategory: (category: string | null | undefined) => FloorPlanRoomCategory | null
/** Inventartypene koden eier (`category` på inventaret): møbler og utstyr, med symbol i `floorPlanFurniture.json`. */
export declare const FLOOR_PLAN_FURNITURE_CATEGORIES: readonly ["storage", "refrigerator", "stove", "bed", "sink", "washer_dryer", "toilet", "bathtub", "oven", "dishwasher", "table", "sofa", "chair", "fireplace", "television", "stairs"]
/**
 * The structural object categories (SIGN-2014, contract 1.6): a column
 * carries the ceiling and a beam hangs under it. They are part of the
 * building, so «remove all furniture» never removes them, and they are drawn
 * by code — not by a symbol in `floorPlanFurniture.json`.
 */
export declare const FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES: readonly ["column", "beam"]
export type FloorPlanStructuralObjectCategory = (typeof FLOOR_PLAN_STRUCTURAL_OBJECT_CATEGORIES)[number]
/** Every object category the code owns: the furniture, then the structural ones. */
export declare const FLOOR_PLAN_OBJECT_CATEGORIES: readonly ["storage", "refrigerator", "stove", "bed", "sink", "washer_dryer", "toilet", "bathtub", "oven", "dishwasher", "table", "sofa", "chair", "fireplace", "television", "stairs", "column", "beam"]
export type FloorPlanObjectCategory = (typeof FLOOR_PLAN_OBJECT_CATEGORIES)[number]
export declare const toFloorPlanObjectCategory: (category: string | null | undefined) => FloorPlanObjectCategory | null
/** Is the object part of the building (a column, a beam)? Decided by the type field, never by a name. */
export declare const isStructuralObjectCategory: (category: string | null | undefined) => category is FloorPlanStructuralObjectCategory
/** One room as it is saved (SIGN-1980) — the same document for a floor plan and a sketch (SIGN-2014). The measurements are not sent. */
export declare const toFloorPlanRoomInput: (room: FloorPlanRoom) => FloorPlanRoomInput


/* ---------- Geometry (floorPlanGeometry.ts) ---------- */

/**
 * Geometrien bak plantegningen (SIGN-794). Alt regnes i planens egne tall —
 * meter, x mot høyre, y nedover — og tegneren avgjør selv hvor mange piksler
 * en meter er.
 */
export declare const distance: (from: FloorPlanPoint, to: FloorPlanPoint) => number
export declare const midpoint: (from: FloorPlanPoint, to: FloorPlanPoint) => FloorPlanPoint
export declare const isInside: (point: FloorPlanPoint, outline: readonly FloorPlanPoint[]) => boolean
/**
 * Punktet «midt i rommet», der navnet står. Tyngdepunktet holder for de
 * fleste rom; i et vinkelrom kan det havne utenfor gulvet, og da brukes
 * midten av det bredeste gulvstykket på samme høyde.
 */
export declare const roomCenter: (outline: readonly FloorPlanPoint[]) => FloorPlanPoint | null
/**
 * Enhetsvektoren vinkelrett på linjen, på den siden `toward` ligger
 * (`away: true` gir motsatt side). Null for en linje uten lengde.
 */
export declare const normalToward: (start: FloorPlanPoint, end: FloorPlanPoint, toward: FloorPlanPoint | null, away?: boolean) => FloorPlanPoint | null
export interface DoorSwing {
  /** Dørbladet: fra hengselet og rett inn i rommet, like langt som åpningen er bred. */
  leaf: {
    from: FloorPlanPoint
    to: FloorPlanPoint
  }
  /** Kvartsirkelen bladet slår, som SVG-sti i planens egne tall. */
  arc: string
}
/**
 * Enhetsvektoren vinkelrett på linjen fra `start` til `end`, på venstre
 * side slik planen er tegnet (x mot høyre, y nedover): med retningen
 * (dx, dy) er venstre den siden (dy, −dx) peker mot. Null for en linje uten
 * lengde.
 */
export declare const leftNormal: (start: FloorPlanPoint, end: FloorPlanPoint) => FloorPlanPoint | null
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
export declare const doorSwing: (start: FloorPlanPoint, end: FloorPlanPoint, roomMiddle: FloorPlanPoint | null, door?: DoorLeafFields) => DoorSwing | null
/**
 * Vinkelen teksten langs en linje skrives i, i grader. Teksten står aldri
 * opp ned: vinkelen legges i (−90°, 90°]. Langs en loddrett linje leses den
 * nedenfra og opp (−90°) — på begge sider av planen, som på en tegning man
 * leser fra høyre.
 */
export declare const readableAngle: (start: FloorPlanPoint, end: FloorPlanPoint) => number
/** Hvor langt utenfor en vegg det sjekkes om det ligger et annet rom, i meter. */
export declare const SHARED_WALL_PROBE = 0.3
/**
 * Er veggen delt med et annet rom? Et punkt 0,3 m utenfor veggens midte —
 * på siden som vender bort fra rommets midte — ligger da på gulvet i et av
 * de andre rommene. En delt vegg får ikke mål i tegningen av hele planen;
 * målet står i tegningen av rommet alene.
 */
export declare const isSharedWall: (start: FloorPlanPoint, end: FloorPlanPoint, roomMiddle: FloorPlanPoint | null, otherOutlines: readonly (readonly FloorPlanPoint[])[]) => boolean
/**
 * Et mål rundet til to desimaler, nøyaktig slik serveren gjør det:
 * `floor(v × 100 + 0,5) / 100`. Samme formel, så forhåndsvisningen viser det
 * tallet lagringen kommer til å svare med.
 */
export declare const roundMeasurement: (value: number) => number
/** Avstanden fra et punkt til et linjestykke, og hvor langt ut på stykket (0–1) det nærmeste punktet ligger. */
export declare const distanceToSegment: (point: FloorPlanPoint, start: FloorPlanPoint, end: FloorPlanPoint) => {
  distance: number
  share: number
}
/** Flaten av en mangekant (skolissformelen), alltid positiv. */
export declare const polygonArea: (outline: readonly FloorPlanPoint[]) => number
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
  walls: readonly {
    start: FloorPlanPoint
    end: FloorPlanPoint
    height?: number | null
    profile?: readonly WallProfilePoint[] | null
  }[]
  openings: readonly {
    start: FloorPlanPoint
    end: FloorPlanPoint
    height?: number | null
  }[]
}
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
export declare const roomMeasurements: (room: MeasuredRoom) => RoomMeasurements


/* ---------- Ceilings and sloped walls (floorPlanCeiling.ts) ---------- */

/**
 * Taket i et rom under skråtak (SIGN-1982), regnet ut av veggene. En
 * skanning ser vegger og gulv, aldri taket: det den gir, er overkanten på
 * hver vegg (`profile`), og taket er flaten som hviler på overkantene.
 *
 * Regelen er kontraktens («Sloped ceilings» i cases `docs/API_CONTRACT.md`),
 * lik i cases, her og i Sign-appen:
 *
 * - **Et rom har skråtak** når minst én vegg har en overkant som ikke er
 *   vannrett. Alle andre rom har flatt tak, og ingenting av dette gjelder.
 * - **Spennretningen** er retningen de skrå veggene går i, vektet med
 *   lengden: halve vinkelen til Σ lengde × (cos 2θ, sin 2θ). Blir summen
 *   ingenting, avgjør den lengste skrå veggen (den første av to like lange).
 *   Mønet går på tvers av spennretningen.
 * - **En vegg bærer én kant av omrisset:** den kanten veggens midtpunkt er
 *   nærmest, innenfor 0,15 m. Takets høyde i et punkt på omrisset leses av
 *   overkanten til veggen som bærer kanten og er nærmest punktet (innenfor
 *   0,15 m). Uten en slik vegg, eller når den ikke har høyde, gjelder rommets
 *   vannrette høyde: medianen av de vannrette veggenes høyder — eller av de
 *   skrå veggenes høyeste punkt når ingen vegg er vannrett.
 * - **Inne i rommet** går høyden jevnt mellom de to stedene linja gjennom
 *   punktet, langs mønet, treffer omrisset.
 *
 * Flaten bygges i stykker: rommet deles i striper på tvers av spennretningen
 * ved hvert hjørne i omrisset, hver ende av en bærende vegg og hver knekk i
 * en overkant. I en stripe kommer omrissets kanter i par, og hvert par
 * avgrenser et firkantet stykke med en høyde i hvert hjørne.
 */
export interface CeilingPoint {
  x: number
  y: number
}
export interface WallProfilePoint {
  /** Andelen av veggens lengde fra start: 0 ved veggens start, 1 ved slutten. */
  at: number
  /** Høyden over gulvet der, i meter. */
  height: number
}
export interface CeilingWall {
  start: CeilingPoint
  end: CeilingPoint
  height?: number | null
  profile?: readonly WallProfilePoint[] | null
}
export interface CeilingRoom {
  outline: readonly CeilingPoint[]
  walls: readonly CeilingWall[]
}
/** Et punkt i taket: x og y som i planen, og høyden over gulvet. */
export type CeilingCorner = [number, number, number]
export interface CeilingPiece {
  /** Rundt stykket: langs den første kanten fra stripens start til slutt, og tilbake langs den andre. */
  corners: [CeilingCorner, CeilingCorner, CeilingCorner, CeilingCorner]
  /** Stripens bredde langs spennretningen. */
  span: number
}
/** En vegg bærer omrisskanten midtpunktet er så nær, i meter. */
export declare const CEILING_WALL_TOLERANCE = 0.15
/**
 * Veggens overkant når den ikke er vannrett; null for alt annet — ingen
 * overkant, færre enn to punkter, et punkt som ikke er tall, eller alle
 * punktene i samme høyde (da er veggen et rektangel, og `height` sier det).
 */
export declare const slopedProfile: (wall: Pick<CeilingWall, "profile">) => readonly WallProfilePoint[] | null
export declare const isSlopedRoom: (room: Pick<CeilingRoom, "walls">) => boolean
/** Høyden på veggens overkant `share` av veien fra start (0) til slutt (1); null for en vannrett vegg uten høyde. */
export declare const profileHeight: (wall: Pick<CeilingWall, "height" | "profile">, share: number) => number | null
/** Veggens gjennomsnittshøyde langs lengden (flaten under overkanten delt på lengden); null uten høyde. */
export declare const meanWallHeight: (wall: Pick<CeilingWall, "height" | "profile">) => number | null
/** Det laveste og det høyeste punktet på veggenes overkanter; null uten en eneste høyde. */
export declare const wallHeightRange: (walls: readonly Pick<CeilingWall, "height" | "profile">[]) => {
  min: number
  max: number
} | null
/** Rommets vannrette høyde: medianen av de vannrette veggenes høyder, eller av de skrå veggenes høyeste punkt. */
export declare const levelHeight: (walls: readonly Pick<CeilingWall, "height" | "profile">[]) => number | null
/**
 * Taket som firkantede stykker. Tomt for et rom uten skråtak, og for et
 * omriss som ikke omslutter noe.
 */
export declare const ceilingPieces: (room: CeilingRoom) => CeilingPiece[]
/**
 * Stykkene som trekanter, til å måle flaten og til å tegne den: fire per
 * stykke, fra hver side til punktet midt i stykket (snittet av de fire
 * hjørnene). En trekant uten flate på gulvet er ikke med.
 */
export declare const ceilingTriangles: (pieces: readonly CeilingPiece[]) => [CeilingCorner, CeilingCorner, CeilingCorner][]
/** Takets flate i m². Et stykke som ligger i ett plan måles nøyaktig; et som vrir seg, tett på. */
export declare const ceilingArea: (pieces: readonly CeilingPiece[]) => number
/**
 * Volumet mellom gulvet og taket i m³, nøyaktig for regelen: tvers over et
 * stykke endrer både bredden (langs mønet) og snittet av de to kanthøydene
 * seg jevnt, så volumet under det er spenn ÷ 6 × (w₀m₀ + 4·w½m½ + w₁m₁).
 */
export declare const ceilingVolume: (pieces: readonly CeilingPiece[]) => number
/**
 * Takets høyde over et punkt i rommet. Null for et rom uten skråtak, og når
 * punktet ikke kan plasseres mot omrisset.
 */
export declare const ceilingHeightAt: (room: CeilingRoom, point: CeilingPoint) => number | null
/** Så mange punkter kan en overkant ha. */
export declare const PROFILE_MAX_POINTS = 12
/**
 * En overkant uten punkter den ikke trenger: et punkt som ligger på den
 * rette linja mellom naboene (innenfor 5 mm) tas bort, og blir det likevel
 * flere enn tolv, tas de som betyr minst bort først. Endene står alltid.
 */
export declare const simplifyProfile: (points: readonly WallProfilePoint[], maxPoints?: number) => WallProfilePoint[]
/**
 * Overkanten en ny vegg fra `from` til `to` gjennom rommet får: takets høyde
 * ved hver ende og ved hver stripegrense veggen krysser, på hele
 * centimeter. Null for et rom uten skråtak og for en vegg uten lengde.
 */
export declare const ceilingProfileAlong: (room: CeilingRoom, from: CeilingPoint, to: CeilingPoint) => WallProfilePoint[] | null


/* ---------- The editing rules (floorPlanEditing.ts) ---------- */

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
export declare const GRID = 0.01
/** En veggende «står i» et hjørne når den er nærmere enn dette. */
export declare const CORNER_TOLERANCE = 0.05
/** En åpning «står på» veggen midtpunktet dens er nærmest, innenfor dette. */
export declare const OPENING_WALL_TOLERANCE = 0.15
/** Et hjørne som dras, legger seg på nabohjørnets x eller y innenfor dette. */
export declare const SNAP_TOLERANCE = 0.05
/** En åpning står alltid minst så langt fra hver veggende. */
export declare const OPENING_MARGIN = 0.05
/** En vegg kortere enn dette får ingen ny åpning. */
export declare const OPENING_MIN_WALL = 0.3
/** Den smaleste åpningen et menneske kan sette. */
export declare const OPENING_MIN_WIDTH = 0.05
export declare const CEILING_HEIGHT_RANGE: {
  readonly min: 0.5
  readonly max: 30
}
export declare const WALL_LENGTH_RANGE: {
  readonly min: 0.1
  readonly max: 200
}
export declare const OBJECT_SIZE_RANGE: {
  readonly min: 0.05
  readonly max: 20
}
/** Hvor høyt over gulvet inventarets underside kan være (SIGN-1987). */
export declare const OBJECT_ELEVATION_RANGE: {
  readonly min: 0
  readonly max: 20
}
export declare const OPENING_HEIGHT_RANGE: {
  readonly min: 0.05
  readonly max: 30
}
export declare const OPENING_SILL_RANGE: {
  readonly min: 0
  readonly max: 30
}
export declare const ROOM_NAME_MAX_LENGTH = 120
export declare const PLAN_NAME_MAX_LENGTH = 120
/** Høyden i ett punkt på en veggs overkant: taket kan gå helt ned til gulvet. */
export declare const WALL_PROFILE_HEIGHT_RANGE: {
  readonly min: 0
  readonly max: 30
}
export declare const WALL_PROFILE_MAX_POINTS = 12
/** Et knekkpunkt står minst så langt fra naboene, som andel av veggens lengde. */
export declare const WALL_PROFILE_MIN_GAP = 0.001
/** Grensene en plan har i kontrakten: rom per plan, og punkter, vegger, åpninger og inventar per rom. */
export declare const PLAN_MAX_ROOMS = 50
export declare const ROOM_MAX_OUTLINE_POINTS = 200
export declare const ROOM_MAX_WALLS = 200
export declare const ROOM_MAX_OPENINGS = 200
export declare const ROOM_MAX_OBJECTS = 300
/** Det minste gulvet et rom kan ha etter en deling, i m². */
export declare const ROOM_MIN_AREA = 0.01
/** To rom kan slås sammen når de har hver sin kant langs samme linje, høyst så langt fra hverandre (veggen mellom dem). */
export declare const MERGE_GAP = 0.4
/** … og kantene ligger langs hverandre minst så langt. */
export declare const MERGE_MIN_OVERLAP = 0.1
/** Det som kan velges i tegningen. */
export type FloorPlanSelection = {
  kind: 'room'
  roomId: string
} | {
  kind: 'wall'
  roomId: string
  wallId: string
} | {
  kind: 'corner'
  roomId: string
  index: number
} | {
  kind: 'opening'
  roomId: string
  openingId: string
} | {
  kind: 'object'
  roomId: string
  objectId: string
}
/**
 * En posisjon eller lengde lagt på nærmeste hele centimeter: `v × 100` rundet
 * til nærmeste heltall, halve bort fra null (Swift: `(v * 100).rounded() / 100`).
 */
export declare const snap: (value: number) => number
/** Nye id-er er UUID-er, som ellers i planen. */
export declare const newFloorPlanId: () => string
/**
 * En farge er data personen har valgt: `#` og seks heksadesimale sifre.
 * Tas imot med store eller små bokstaver, lagres med små. Alt annet er
 * ingen farge (null).
 */
export declare const normalizeColor: (color: string | null | undefined) => string | null
/** Nytt navn på plantegningen: 1–120 tegn etter at mellomrom i endene er fjernet. */
export declare const renamePlan: <P extends {
  name: string
}>(plan: P, name: string) => P
/** Nytt navn: 1–120 tegn etter at mellomrom i endene er fjernet. */
export declare const renameRoom: (room: FloorPlanRoom, name: string) => FloorPlanRoom
/** Romtypen, eller ingen (null). En type koden ikke kjenner settes ikke. */
export declare const setRoomCategory: (room: FloorPlanRoom, category: string | null) => FloorPlanRoom
export declare const setRoomFloorColor: (room: FloorPlanRoom, color: string | null) => FloorPlanRoom
export declare const setRoomWallColor: (room: FloorPlanRoom, color: string | null) => FloorPlanRoom
/** Takfargen (SIGN-1981). Taket tegnes ikke i planen; fargen vises i 3D-visningen. */
export declare const setRoomCeilingColor: (room: FloorPlanRoom, color: string | null) => FloorPlanRoom
/** Takhøyden: høyden på hver vegg i rommet, 0,5–30 m. Taket blir flatt: en skrå overkant på en vegg fjernes. */
export declare const setCeilingHeight: (room: FloorPlanRoom, height: number) => FloorPlanRoom
/** Sletter rommet. Det siste rommet i en plan kan ikke slettes — da slettes planen. */
export declare const deleteRoom: <P extends FloorPlanDocument>(plan: P, roomId: string) => P
/** Bytter ut ett rom i planen med det `edit` gir; gir samme plan tilbake når rommet er urørt. */
export declare const updateRoom: <P extends FloorPlanDocument>(plan: P, roomId: string, edit: (room: FloorPlanRoom) => FloorPlanRoom) => P
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
export declare const openingSeat: (room: Pick<FloorPlanRoom, "walls">, opening: Pick<FloorPlanOpening, "start" | "end">) => OpeningSeat | null
interface OpeningDefaults {
  width: number
  height: number
  sill: number
}
/** Størrelsen en ny åpning får: dør 0,8 × 2,0 m, vindu 1,0 × 1,2 m med brystning 0,9 m, åpning 0,9 × 2,0 m. */
export declare const OPENING_DEFAULTS: Record<FloorPlanOpeningKind, OpeningDefaults>
/**
 * Ny åpning midt på veggen, i typens standardstørrelse — smalere når veggen
 * er kort (alltid minst 0,05 m til hver veggende). En vegg kortere enn 0,3 m
 * får ingen åpning.
 */
export declare const addOpening: (room: FloorPlanRoom, wallId: string, kind: FloorPlanOpeningKind, id?: string) => FloorPlanRoom
/** Skyver åpningen langs veggen sin: `distanceFromWallStart` er avstanden fra veggens start til åpningens nærmeste ende. */
export declare const moveOpening: (room: FloorPlanRoom, openingId: string, distanceFromWallStart: number) => FloorPlanRoom
/** Ny bredde rundt samme midtpunkt, klemt så åpningen står inne i veggen. */
export declare const resizeOpening: (room: FloorPlanRoom, openingId: string, width: number) => FloorPlanRoom
/** Åpningens avstand fra veggens start når midtpunktet dras til `point` — det `moveOpening` skal ha. */
export declare const openingDistanceAt: (room: FloorPlanRoom, openingId: string, point: FloorPlanPoint) => number | null
/**
 * Typen: dør, vindu eller åpning. Størrelsen står. Bare en dør har blad: blir
 * åpningen en dør, sier den hvordan den står (hengslet i starten, inn mot
 * rommet); blir den noe annet, er hengsel og slag borte.
 */
export declare const setOpeningKind: (room: FloorPlanRoom, openingId: string, kind: string) => FloorPlanRoom
/**
 * Siden av åpningen rommet ligger på: venstre eller høyre for linja fra
 * åpningens start til slutt (se `leftNormal`), etter rommets midte. Kan det
 * ikke avgjøres — ingen midte, eller midten ligger på linja — er det venstre.
 */
export declare const openingRoomSide: (room: Pick<FloorPlanRoom, "outline">, opening: Pick<FloorPlanOpening, "start" | "end">) => FloorPlanDoorSwing
/**
 * Slik døra står: enden den er hengslet i, og siden den slår mot. Det døra
 * selv sier gjelder; sier den ingenting, er den hengslet i starten og slår
 * inn mot rommet — slik en dør uten feltene alltid har vært tegnet.
 */
export declare const doorLeaf: (room: Pick<FloorPlanRoom, "outline">, opening: Pick<FloorPlanOpening, "start" | "end" | "hinge" | "swing">) => {
  hinge: FloorPlanDoorHinge
  swing: FloorPlanDoorSwing
}
/** Enden døra er hengslet i: åpningens start eller slutt. Bare dører; en ukjent verdi endrer ingenting. */
export declare const setDoorHinge: (room: FloorPlanRoom, openingId: string, hinge: string) => FloorPlanRoom
/** Siden døra slår mot: venstre eller høyre for linja fra åpningens start til slutt. Bare dører; en ukjent verdi endrer ingenting. */
export declare const setDoorSwing: (room: FloorPlanRoom, openingId: string, swing: string) => FloorPlanRoom
/**
 * Slik et menneske sier det, stående i rommet med ansiktet mot døra: er
 * hengslene til venstre eller til høyre, og slår døra inn i rommet (mot en)
 * eller ut av det?
 */
export declare const doorHingeSide: (room: Pick<FloorPlanRoom, "outline">, opening: Pick<FloorPlanOpening, "start" | "end" | "hinge" | "swing">) => "left" | "right"
export declare const doorOpensInward: (room: Pick<FloorPlanRoom, "outline">, opening: Pick<FloorPlanOpening, "start" | "end" | "hinge" | "swing">) => boolean
/** Hengslene til venstre eller høyre, sett fra rommet. */
export declare const setDoorHingeSide: (room: FloorPlanRoom, openingId: string, side: "left" | "right") => FloorPlanRoom
/** Døra slår inn i rommet (`true`) eller ut av det. */
export declare const setDoorOpensInward: (room: FloorPlanRoom, openingId: string, inward: boolean) => FloorPlanRoom
/** Åpningens høyde (0,05–30 m), eller ikke målt (null). */
export declare const setOpeningHeight: (room: FloorPlanRoom, openingId: string, height: number | null) => FloorPlanRoom
/** Brystningen: høyden fra gulvet til åpningens underkant (0–30 m), eller ikke målt (null). */
export declare const setOpeningSill: (room: FloorPlanRoom, openingId: string, sill: number | null) => FloorPlanRoom
export declare const deleteOpening: (room: FloorPlanRoom, openingId: string) => FloorPlanRoom
/**
 * Flytter hjørnet `cornerIndex` i omrisset til `to`. Hver veggende som sto i
 * det gamle hjørnet (innenfor 0,05 m) følger med, og åpningene på veggene
 * som flyttet seg settes tilbake på veggens nye linje.
 */
export declare const moveCorner: (room: FloorPlanRoom, cornerIndex: number, to: FloorPlanPoint) => FloorPlanRoom
/**
 * Hvor et hjørne som dras skal stå: på nærmeste centimeter, og på
 * nabohjørnets x eller y når det er innenfor 0,05 m — så rette vinkler
 * holder seg rette. Er begge naboene nær nok på samme akse, vinner den
 * nærmeste.
 */
export declare const snapCorner: (room: Pick<FloorPlanRoom, "outline">, cornerIndex: number, to: FloorPlanPoint) => FloorPlanPoint
/**
 * Ny lengde på veggen (0,1–200 m): starten står, og enden flyttes langs
 * veggens egen retning. Står enden i et hjørne av omrisset, flyttes hjørnet
 * (`moveCorner`), så naboveggen følger med; ellers flyttes bare denne veggen.
 */
export declare const setWallLength: (room: FloorPlanRoom, wallId: string, length: number) => FloorPlanRoom
/** Høyden på én vegg (0,5–30 m), eller ikke målt (null). Veggen blir et rektangel: en skrå overkant fjernes. */
export declare const setWallHeight: (room: FloorPlanRoom, wallId: string, height: number | null) => FloorPlanRoom
/**
 * Veggens overkant som punkter, uansett vegg: en vannrett vegg er to
 * punkter i veggens høyde. Null for en vegg uten høyde.
 */
export declare const wallProfile: (wall: Pick<FloorPlanWall, "height" | "profile">) => FloorPlanWallProfilePoint[] | null
/**
 * Setter veggens overkant: punkter fra veggens start (`at` 0) til slutt
 * (`at` 1). Null gjør veggen til et rektangel i den høyden den har (det
 * høyeste punktet). Punkter som ikke er en overkant, endrer ingenting.
 */
export declare const setWallProfile: (room: FloorPlanRoom, wallId: string, profile: readonly FloorPlanWallProfilePoint[] | null) => FloorPlanRoom
/**
 * Høyden i ett punkt på overkanten (0–30 m). `index` teller punktene slik
 * `wallProfile` gir dem: 0 er veggens start og det siste er veggens slutt —
 * slik blir en vannrett vegg skrå ved å endre høyden i den ene enden.
 */
export declare const setWallProfileHeight: (room: FloorPlanRoom, wallId: string, index: number, height: number) => FloorPlanRoom
/**
 * Flytter et knekkpunkt langs veggen: `at` er andelen av veggens lengde fra
 * start, klemt så punktet står mellom naboene. Endene kan ikke flyttes.
 */
export declare const moveWallProfilePoint: (room: FloorPlanRoom, wallId: string, index: number, at: number) => FloorPlanRoom
/**
 * Nytt knekkpunkt midt på det lengste strekket av overkanten (det første av
 * to like lange), i høyden overkanten har der — veggen ser lik ut til
 * punktet flyttes eller får en annen høyde. Tolv punkter er det meste.
 *
 * Et punkt på en vannrett vegg ville vært borte igjen med det samme (alle
 * punktene i samme høyde er et rektangel), så der løftes ingenting: en
 * vannrett vegg må først få ulik høyde i endene.
 */
export declare const addWallProfilePoint: (room: FloorPlanRoom, wallId: string) => FloorPlanRoom
/** Fjerner et knekkpunkt. Endene kan ikke fjernes. */
export declare const removeWallProfilePoint: (room: FloorPlanRoom, wallId: string, index: number) => FloorPlanRoom
/**
 * Stykket av en overkant fra andelen `from` til andelen `to` av veggen, som
 * en egen overkant fra 0 til 1 — baklengs når `from` er størst. Brukes når
 * en vegg deles eller kortes.
 */
export declare const sliceProfile: (wall: Pick<FloorPlanWall, "height" | "profile">, from: number, to: number) => FloorPlanWallProfilePoint[] | null
/** Veggens egen farge, som vinner over rommets veggfarge — eller ingen (null). */
export declare const setWallColor: (room: FloorPlanRoom, wallId: string, color: string | null) => FloorPlanRoom
/** Størrelsen nytt inventar får, bredde × dybde i meter. */
export declare const OBJECT_DEFAULT_SIZES: Record<FloorPlanObjectCategory, {
  width: number
  depth: number
}>
/** How tall a new beam is, in metres; it hangs under the ceiling. */
export declare const BEAM_DEFAULT_HEIGHT = 0.25
/** Nytt inventar midt i rommet, i typens standardstørrelse, uten dreining. */
export declare const addObject: (room: FloorPlanRoom, category: FloorPlanObjectCategory, id?: string) => FloorPlanRoom
/** Flytter inventarets midtpunkt. */
export declare const moveObject: (room: FloorPlanRoom, objectId: string, center: FloorPlanPoint) => FloorPlanRoom
/** Setter dreiningen, i radianer rundt inventarets midtpunkt. */
export declare const rotateObject: (room: FloorPlanRoom, objectId: string, radians: number) => FloorPlanRoom
/** «Snu 90°»: en kvart omdreining til. Fire steg er tilbake der det startet. */
export declare const turnObject: (room: FloorPlanRoom, objectId: string) => FloorPlanRoom
/**
 * «Bytt forside» (SIGN-1987): symbolet dreies en kvart omdreining INNE I
 * det samme rektangelet — bredde og dybde bytter plass mens dreiningen går
 * et kvart steg, så inventaret dekker nøyaktig den samme flaten, men
 * baksiden (sisternen, hodeenden, ryggen) står mot neste side. Skannet vet
 * ikke alltid hvilken side som er forsiden; dette retter det uten å flytte
 * noe. Fire steg er tilbake der det startet.
 */
export declare const faceObject: (room: FloorPlanRoom, objectId: string) => FloorPlanRoom
/** Ny bredde og/eller dybde, 0,05–20 m. */
export declare const resizeObject: (room: FloorPlanRoom, objectId: string, size: {
  width?: number
  depth?: number
}) => FloorPlanRoom
/** Hvor høyt inventaret er (0,05–20 m, SIGN-1981), eller ukjent (null). */
export declare const setObjectHeight: (room: FloorPlanRoom, objectId: string, height: number | null) => FloorPlanRoom
/** Hvor høyt over gulvet inventarets underside er (0–20 m, SIGN-1987), eller på gulvet (null). */
export declare const setObjectElevation: (room: FloorPlanRoom, objectId: string, elevation: number | null) => FloorPlanRoom
/**
 * Hva inventaret er. Størrelsen står. Utformingen står når den nye typen
 * også har den; ellers er den ikke oppgitt lenger (et rundt bord som blir
 * en sofa, er ikke en rund sofa).
 */
export declare const setObjectCategory: (room: FloorPlanRoom, objectId: string, category: string) => FloorPlanRoom
/**
 * Hvilken utforming av typen inventaret har (SIGN-1987) — et rundt bord, en
 * lenestol, en hylle — eller ikke oppgitt (null). En utforming typen ikke
 * har, endrer ingenting: den velges, den gjettes aldri av mål eller navn.
 */
export declare const setObjectVariant: (room: FloorPlanRoom, objectId: string, variant: string | null) => FloorPlanRoom
export declare const deleteObject: (room: FloorPlanRoom, objectId: string) => FloorPlanRoom
/** Is there furniture in the room? Columns and beams are part of the building and do not count. */
export declare const hasFurniture: (room: Pick<FloorPlanRoom, "objects">) => boolean
/** Fjerner alt inventar i rommet. Bærende objekter (søyler, bjelker) er en del av bygget og står (SIGN-2014). */
export declare const removeAllObjects: (room: FloorPlanRoom) => FloorPlanRoom
/** «Fjern alt inventar»: fjerner inventaret i alle rommene i planen. */
export declare const removeAllObjectsInPlan: <P extends FloorPlanDocument>(plan: P) => P
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
export declare const outlineSpot: (room: Pick<FloorPlanRoom, "outline"> & Partial<Pick<FloorPlanRoom, "openings">>, point: FloorPlanPoint) => OutlineSpot | null
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
export declare const splitRoom: <P extends FloorPlanDocument>(plan: P, roomId: string, from: FloorPlanPoint, to: FloorPlanPoint, options: SplitRoomOptions) => P
/** Rommene `roomId` kan slås sammen med: de som møter det langs en kant (`mergeRooms`). */
export declare const mergeableRoomIds: (plan: FloorPlanDocument, roomId: string) => string[]
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
export declare const mergeRooms: <P extends FloorPlanDocument>(plan: P, roomId: string, otherRoomId: string, newId?: () => string) => P
/**
 * Hva et trykk i tegningen treffer. Rekkefølgen er fast: hjørne foran
 * åpning foran inventar foran vegg foran rom. `tolerance` er hvor langt fra
 * et hjørne, en åpning eller en vegg trykket kan være, i meter (tegningen
 * regner den om fra piksler). Innen samme slag vinner det nærmeste; står to
 * like nær — en vegg to rom deler — vinner rommet i `preferRoomId`, ellers
 * det første. Inventar og rom som ligger oppå hverandre: det som er tegnet
 * sist (øverst) vinner.
 */
export declare const hitTest: (plan: FloorPlanDocument, point: FloorPlanPoint, tolerance: number, preferRoomId?: string | null, 
/** Without corners (SIGN-2017): where the drawing only picks elements, a corner is not something to pick. */
corners?: boolean) => FloorPlanSelection | null
/** Finnes det som er valgt fortsatt i planen? Etter angring kan det være borte. */
export declare const selectionExists: (plan: FloorPlanDocument, selection: FloorPlanSelection | null) => boolean


/* ---------- The furniture symbols (floorPlanFurniture.ts) ---------- */

/**
 * Inventaret i en plantegning tegnet som det det er (SIGN-1987): et toalett
 * som et toalett, en seng som en seng — i stedet for et rektangel og en boks.
 *
 * SYMBOLENE ER DATA, ikke kode: `floorPlanFurniture.json` beskriver for hver
 * type (`category`) og utforming (`category:variant`) formene symbolet består
 * av, sett ovenfra (`plan`), og delene 3D-formen er satt sammen av (`solid`).
 * Den samme fila ligger byte for byte i Sign-appen
 * (`Sources/SignKit/Resources/FloorPlanFurniture.json`), og begge klientene
 * prøves mot de samme svarene — så et toalett er likt i Sign web og i appen.
 * En type eller utforming uten symbol tegnes som før: et rektangel og en boks.
 *
 * Alt regnes i inventarets egen ramme, i meter: x langs bredden, y langs
 * dybden, origo i midten. BAKSIDEN — siden som står mot veggen: sisternen på
 * toalettet, hodeenden på senga, ryggen på sofaen — er kanten ved −y, og
 * forsiden kanten ved +y. Den som tegner, flytter og dreier ramma dit
 * inventaret står.
 *
 * Et tall i dataene er enten en andel av inventarets utstrekning langs aksen
 * (0 er den ene kanten, 1 den andre) eller et par `[andel, meter]`: andelen
 * pluss så mange meter. `[1, -0.17]` er 17 cm inn fra den borteste kanten —
 * et armlene er 17 cm bredt enten sofaen er 1,4 eller 3 meter. Meterne
 * klemmes til 45 % av utstrekningen, så delene aldri bytter side på et lite
 * inventar. Radier regnes av den korteste av bredden og dybden.
 */
/** `solid` and `dashed` are only used by the structural objects (SIGN-2014), which are drawn by code. */
export type FurnitureFill = 'body' | 'soft' | 'solid' | 'none'
export type FurnitureStroke = 'outline' | 'detail' | 'dashed' | 'none'
export type FurnitureTone = 'base' | 'soft' | 'strong'
/** Én form i symbolet, i inventarets egen ramme (meter, origo i midten). */
export type FurnitureShape = {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
  radius: number
  fill: FurnitureFill
  stroke: FurnitureStroke
} | {
  kind: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  fill: FurnitureFill
  stroke: FurnitureStroke
} | {
  kind: 'path'
  points: {
    x: number
    y: number
  }[]
  closed: boolean
  fill: FurnitureFill
  stroke: FurnitureStroke
}
/**
 * Én del av 3D-formen, i inventarets egen ramme: x langs bredden og z langs
 * dybden (origo i midten), y oppover fra inventarets underside. En sylinder
 * fyller boksen sin som en mangekant rundt aksen (`y` står, `z` ligger og
 * vender forsiden fram).
 */
export interface FurniturePart {
  kind: 'box' | 'cylinder'
  min: [number, number, number]
  max: [number, number, number]
  axis: 'y' | 'z'
  sides: number
  tone: FurnitureTone
}
/** Utformingene hver type kan ha (`variant` på inventaret); en type som ikke står her, har ingen. */
export declare const FLOOR_PLAN_OBJECT_VARIANTS: Readonly<Record<string, readonly string[]>>
/** Utformingene typen kan ha, i den rekkefølgen de vises; tom for en type uten utforminger. */
export declare const objectVariantsFor: (category: string | null | undefined) => readonly string[]
/** Utformingen når typen har den; ellers null (ikke oppgitt, ukjent, eller en annen types utforming). */
export declare const toFloorPlanObjectVariant: (category: string | null | undefined, variant: string | null | undefined) => string | null
/** Har typen sitt eget symbol? (Ellers tegnes den som et rektangel og en boks.) */
export declare const hasFurnitureSymbol: (category: string) => boolean
export interface FurnitureFootprint {
  category: string
  variant?: string | null
  /** Meter langs inventarets egen x-akse. */
  width: number
  /** Meter langs inventarets egen y-akse. */
  depth: number
}
/**
 * Formene symbolet består av, i den rekkefølgen de tegnes, i inventarets
 * egen ramme. Et inventar uten bredde eller dybde har ingen former.
 */
export declare const furniturePlan: (object: FurnitureFootprint) => FurnitureShape[]
/**
 * Delene 3D-formen er satt sammen av, i inventarets egen ramme, `height`
 * meter høy. Et inventar uten bredde, dybde eller høyde har ingen deler; en
 * type uten symbol er én boks.
 */
export declare const furnitureSolid: (object: FurnitureFootprint, height: number) => FurniturePart[]


/* ---------- Colours (floorPlanColors.ts) ---------- */

/**
 * Fargene i en plantegning (SIGN-1980). En gulv- eller veggfarge er DATA
 * personen har valgt, lagret som `#rrggbb` — ikke en del av appens tema.
 * Paletten under er de ferdige tonene redigeringen tilbyr; ved siden av den
 * kan personen velge en hvilken som helst farge, eller ingen (da tegnes
 * planen i temaets egne toner).
 *
 * Tonene er valgt for å ligne det som faktisk ligger på gulv og vegger:
 * hvitt og gråtoner, tre i tre toner, og noen dempede farger. Navnet på hver
 * tone står i pakkas språkfiler (`texts/editor/<språk>.json`, `tones.<key>`).
 */
export interface FloorPlanTone {
  /** Stabil nøkkel for navnet i språkfilene. */
  key: string
  /** Fargen slik den lagres: `#rrggbb` med små bokstaver. */
  hex: string
}
export declare const FLOOR_PLAN_TONES: readonly FloorPlanTone[]
/** Tonen en lagret farge er, når den er en av de ferdige. */
export declare const toneOf: (color: string | null | undefined) => FloorPlanTone | null
/** Blekket som står oppå en lys farge, og det som står oppå en mørk. */
export declare const INK_ON_LIGHT = "rgb(13 28 38)"
export declare const INK_ON_DARK = "rgb(255 255 255)"
/** Fargens lyshet slik øyet ser den (WCAG relativ luminans), 0–1. Null for noe som ikke er `#rrggbb`. */
export declare const relativeLuminance: (color: string | null | undefined) => number | null
/**
 * Blekket som leses best oppå en farge personen har valgt: mørkt på lyse
 * farger, hvitt på mørke — det av de to som gir størst kontrast. Null for
 * «ingen farge»: da gjelder temaets eget blekk.
 */
export declare const readableInk: (color: string | null | undefined) => string | null


/* ---------- What a sketch has changed, as marks (sketchMarks.ts) ---------- */

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
export declare const SKETCH_ELEMENT_TYPES: readonly ["room", "wall", "opening", "object"]
export type SketchElementType = (typeof SKETCH_ELEMENT_TYPES)[number]
export declare const toSketchElementType: (type: string | null | undefined) => SketchElementType | null
/** How an element differs from the rooms the sketch started from (`change`). */
export declare const SKETCH_CHANGES: readonly ["added", "removed", "moved", "changed"]
export type SketchChangeKind = (typeof SKETCH_CHANGES)[number]
export declare const toSketchChange: (change: string | null | undefined) => SketchChangeKind | null
/** How an element of the plan that is drawn differs from the base. */
export type FloorPlanMarkChange = 'added' | 'moved' | 'changed'
/** A base element drawn as a ghost under the plan, in the plan's own numbers (metres). */
export interface FloorPlanGhost {
  /** `sketchElementKey` of the element. */
  key: string
  /** `removed`: it is gone (dashed, the error tone). `moved`: where a moved element stood (faint, neutral). */
  change: 'removed' | 'moved'
  shape: {
    kind: 'outline'
    points: FloorPlanPoint[]
  } | {
    kind: 'line'
    of: 'wall' | 'opening'
    start: FloorPlanPoint
    end: FloorPlanPoint
  } | {
    kind: 'box'
    center: FloorPlanPoint
    width: number
    depth: number
    rotation: number
  }
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
export declare const sketchElementKey: (elementType: string, elementId: string) => string
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
/**
 * The marks for the «after» drawing of a sketch, built from the server's
 * `changes`: what is new or different is marked on the element itself, what
 * was removed is drawn as a ghost from the base rooms, and what was moved
 * gets a faint ghost where it stood.
 */
export declare const sketchMarks: (sketch: SketchLike) => FloorPlanMarks
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
export declare const SKETCH_CHANGE_TONES: readonly ["added", "moved", "changed", "removed"]
export type SketchChangeTone = (typeof SKETCH_CHANGE_TONES)[number]
/** The server's own summary of what a sketch has changed (`changeSummary`). */
export interface SketchChangeSummary {
  added: number
  moved: number
  changed: number
  removed: number
}
/** How many elements of each kind the list of differences holds. A type or a change the app does not know is not counted. */
export declare const sketchChangeCounts: (changes: readonly Pick<SketchChangeLike, "elementType" | "change">[]) => SketchChangeCounts
/**
 * How much a sketch has changed, as the person asked for it — for the
 * legend, the cards and the text read aloud. The numbers are the server's
 * own summary (`changeSummary`): it counts what was asked for, so a wall two
 * rooms share that was removed is ONE removed wall, though it is two rows in
 * `changes` (one per room). `changes` is still what the drawing marks.
 * Without a summary — an older answer — the rows are counted.
 */
export declare const sketchChangeTotals: (sketch: {
  changes: readonly Pick<SketchChangeLike, "elementType" | "change">[]
  changeSummary?: Partial<SketchChangeSummary> | null
}) => SketchChangeCounts
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
export declare const sketchMarks3d: (sketch: SketchLike) => SketchMarks3d


/* ---------- Measurements (measurements.ts) ---------- */

/**
 * Den ene formatteren for lengder, flater og volumer i Sign (SIGN-794).
 *
 * Mål lagres og sendes alltid i SI: meter, kvadratmeter og kubikkmeter, uten
 * enhet ved siden av. Her — og bare her — blir tallet til tekst for
 * brukeren: tallet skrives slik brukerens språk skriver det (desimaltegn,
 * tusenskille, mellomrom foran enheten), og enheten kommer fra `Intl`, aldri
 * fra en mal eller en språkfil.
 *
 * `Intl` har lengdeenheten (`meter`), men ingen enhet for flate eller volum
 * («square-meter» og «cubic-meter» finnes ikke i enhetslisten nettleserne
 * støtter, og gir `RangeError`). Flate og volum skrives derfor med
 * lengdeenheten fra `Intl` og potensen bak: «m» blir «m²» og «m³». Det er
 * SI-skrivemåten i alle språk plattformen har.
 *
 * Plattformen har ikke noe målesystem på firma eller bruker ennå; alt vises
 * metrisk. Kommer det (fot og tommer), er dette det ene stedet det kobles
 * inn: regn om SI-verdien og bytt enhet i `LENGTH_UNIT`. Ingen visning
 * trenger å endres.
 */
export type MeasurementQuantity = 'length' | 'area' | 'volume'
export interface FormatMeasurementOptions {
  /** Antall desimaler; standard er to for lengde og én for flate og volum. */
  fractionDigits?: number
}
/**
 * `value` er SI: meter for lengde, m² for flate, m³ for volum. Et mål som
 * ikke finnes (null, undefined, NaN) er en tom streng — aldri «0 m».
 */
export declare const formatMeasurement: (value: number | null | undefined, quantity: MeasurementQuantity, locale: string, options?: FormatMeasurementOptions) => string
export declare const formatLength: (meters: number | null | undefined, locale: string, options?: FormatMeasurementOptions) => string
export declare const formatArea: (squareMeters: number | null | undefined, locale: string, options?: FormatMeasurementOptions) => string
export declare const formatVolume: (cubicMeters: number | null | undefined, locale: string, options?: FormatMeasurementOptions) => string
/**
 * Enheten et mål vises i («m», «m²», «m³»), slik brukerens språk skriver den
 * — til etiketten bak et felt der tallet skrives uten enhet.
 */
export declare const measurementUnit: (quantity: MeasurementQuantity, locale: string) => string
/**
 * Tallet alene, uten enhet, slik det står i et felt brukeren skriver i:
 * brukerens desimaltegn, ingen tusenskille. `value` er SI, som i
 * `formatMeasurement`; et mål som ikke finnes er en tom streng.
 */
export declare const formatMeasurementInput: (value: number | null | undefined, quantity: MeasurementQuantity, locale: string, options?: FormatMeasurementOptions) => string
/**
 * Leser et tall brukeren har skrevet, slik brukerens språk skriver det:
 * språkets desimaltegn og tusenskille (hentet fra `Intl`, aldri en egen
 * liste). Et komma eller punktum som ikke kan være tusenskille i språket
 * leses som desimaltegn, så «2.4» og «2,4» gir det samme for en som skriver
 * med feil tegn. Tom tekst og alt som ikke er et tall er null — aldri 0.
 * Den ene tallparseren i Sign: `Number()` rett på det brukeren skrev er feil.
 */
export declare const parseLocaleNumber: (text: string | null | undefined, locale: string) => number | null
/**
 * Leser et mål brukeren har skrevet, og gir SI-verdien (meter, m², m³).
 * Tallet leses med `parseLocaleNumber`, med eller uten enheten bak.
 *
 * Dette er motstykket til `formatMeasurement`, og det samme ene stedet et
 * målesystem kobles inn: regn om fra brukerens enhet til SI her.
 */
export declare const parseMeasurement: (text: string | null | undefined, quantity: MeasurementQuantity, locale: string) => number | null
/**
 * Et tall med en enhet `Intl` kjenner («12 cm», «3,5 kg», «15 %»), skrevet
 * slik brukerens språk skriver det. `exponent` gir flate og volum av en
 * lengdeenhet («m²», «m³»), som i `formatMeasurement`. Til tall som ikke er
 * SI-mål fra plantegningene — tallene som ble sagt på en befaring
 * (SIGN-1983). Desimalene som finnes vises, inntil tre; ingen legges til.
 */
export declare const formatUnitValue: (value: number | null | undefined, unit: string, locale: string, options?: {
  exponent?: "" | "\u00B2" | "\u00B3"
  maximumFractionDigits?: number
}) => string
/** Enheten alene («cm», «kg», «m²»), slik brukerens språk skriver den. */
export declare const unitSymbol: (unit: string, locale: string, exponent?: "" | "\u00B2" | "\u00B3") => string
/**
 * Et rent tall slik brukerens språk skriver det, uten enhet. `grouping: false`
 * gir tallet slik det står i et felt brukeren skriver i.
 */
export declare const formatPlainNumber: (value: number | null | undefined, locale: string, options?: {
  maximumFractionDigits?: number
  grouping?: boolean
}) => string


/* ---------- Texts (floorPlanNames.ts, floorPlan3dTexts.ts, floorPlanEditorTexts.ts, textFiles.ts) ---------- */

/**
 * What the things in a plan are called (SIGN-2041): furniture, openings and
 * room types, in every language the package has — ONE source for every app
 * that draws or edits rooms. The drawing reads the names aloud, and the apps
 * use them wherever they name an element («Door in Kitchen»).
 *
 * The texts are in three sets with a file per language each
 * (`texts/names`, `texts/view3d`, `texts/editor`), so a page that only shows
 * a drawing does not carry the editor's texts.
 */
export interface FloorPlanNames {
  /** An object of a category the code does not know. */
  furniture: string
  objects: Record<FloorPlanObjectCategory, string>
  openingKinds: Record<FloorPlanOpeningKind, string>
  roomKinds: Record<FloorPlanRoomCategory, string>
  /** Per object category: the forms it comes in (`floorPlanFurniture.json`). */
  objectVariants: Record<string, Record<string, string>>
}
/** The names in the user's language (`no`, `sv`, `pt-BR`), with the source language as the reserve. */
export declare const floorPlanNames: (locale?: string | null) => FloorPlanNames

/** The texts of the 3D view (`FloorPlan3dView`, SIGN-1981) — one file per language in `texts/view3d`. */
export interface FloorPlan3dTexts {
  reset: string
  hint: string
  keyboardHint: string
  loading: string
  loadError: string
  unavailable: string
  retry: string
}
/** The texts in the user's language, with the source language as the reserve. */
export declare const floorPlan3dTexts: (locale?: string | null) => FloorPlan3dTexts

/**
 * The texts of the room editor (SIGN-1980): the toolbar and the fields for
 * what is selected — one file per language in `texts/editor`. A text with a
 * placeholder (`{room}`, `{number}`) is filled with `fillFloorPlanText`.
 * Lengths are formatted with `formatLength` on the user's locale before they
 * are put in — a text never holds a unit.
 */
export interface FloorPlanEditorTexts {
  /** `{step}`: how far one press on an arrow key moves the selection. */
  keyboardHint: string
  toolbar: string
  undo: string
  redo: string
  add: string
  onSelectedWall: string
  selectWallFirst: string
  selectRoomFirst: string
  removeAllFurniture: string
  removeRoomFurniture: string
  deleteRoom: string
  lastRoom: string
  noColor: string
  customColor: string
  delete: string
  cancel: string
  inspector: {
    title: string
    pick: string
    nothing: string
    nothingBody: string
    wall: string
    corner: string
    /** `{room}`, `{number}`, `{length}`. */
    wallItem: string
    /** `{room}`, `{number}`. */
    cornerItem: string
    /** `{room}`, `{part}`. */
    partItem: string
    cornerHint: string
    name: string
    kind: string
    noKind: string
    ceilingHeight: string
    floorColor: string
    wallColor: string
    ceilingColor: string
    wallOwnColor: string
    length: string
    width: string
    depth: string
    height: string
    sill: string
    distance: string
    turn: string
    variant: string
    noVariant: string
    elevation: string
    face: string
    faceHint: string
    wallTooShort: string
    slopedTop: string
    slopedHint: string
    /** `{end}`: the wall's end, A or B. */
    heightAt: string
    /** `{number}`. */
    bend: string
    distanceFromA: string
    addBend: string
    /** `{number}`. */
    removeBend: string
    /** `{range}`: the lowest and highest ceiling height, formatted. */
    slopedCeiling: string
  }
  door: {
    hinges: string
    left: string
    right: string
    opens: string
    inward: string
    outward: string
    /** `{room}`. */
    seenFrom: string
  }
  split: {
    action: string
    first: string
    second: string
    from: string
    to: string
    confirm: string
    refused: string
    /** `{number}`: the name a new room gets. */
    newRoomName: string
    /** `{number}`. */
    cornerSpot: string
    /** `{from}`, `{to}`, `{length}`. */
    edgeSpot: string
  }
  merge: {
    action: string
  }
  /** The names of the ready-made tones (`FLOOR_PLAN_TONES`), by key. */
  tones: Record<string, string>
}
/** The texts in the user's language, with the source language as the reserve. */
export declare const floorPlanEditorTexts: (locale?: string | null) => FloorPlanEditorTexts
/**
 * The name a new room gets when a room is split (SIGN-1982): «Room» and the
 * number the room becomes in the plan, in the user's language. The name is a
 * suggestion — it is changed in the field afterwards.
 */
export declare const newFloorPlanRoomName: (plan: FloorPlanDocument | null, locale?: string | null) => string

/** Puts the values into the placeholders of a text (`{room}`). A placeholder without a value is left as it is. */
export declare const fillFloorPlanText: (template: string, values: Record<string, string | number>) => string


/* ---------- The editor (useFloorPlanEditor.ts) ---------- */

/**
 * Redigeringen av én plantegning (SIGN-1980): planen slik den står nå, det
 * som er valgt, og angre/gjør om. Selve endringene er redigeringsreglene i
 * `support/floorPlanEditing` — her holdes de sammen med historikken, så hver
 * endring er ett steg som kan angres.
 *
 * Målene på et rom som er endret regnes på nytt av geometrien med en gang
 * (`roomMeasurements`), bare for visning: serveren regner dem ved lagring, og
 * svaret derfra er fasiten.
 *
 * `P` is the app's own plan type (SIGN-2041): the editor only reads and
 * changes `rooms`, and every other field the app has on its plan (id, name,
 * timestamps) follows along untouched.
 */
export interface FloorPlanEditor<P extends FloorPlanDocument = FloorPlanDocument> {
  /** Planen slik den står nå; null til en plan er lastet. */
  plan: ComputedRef<P | null>
  selection: Ref<FloorPlanSelection | null>
  /** Rommet det valgte hører til. */
  selectedRoom: ComputedRef<FloorPlanRoom | null>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  /** Er planen en annen enn den som sist ble lagret eller lastet? */
  dirty: ComputedRef<boolean>
  /** Starter på nytt fra `plan` (lastet, lagret eller hentet på nytt): historikken tømmes. */
  load: (plan: P) => void
  select: (selection: FloorPlanSelection | null) => void
  /** Én endring av planen. Endringer med samme `coalesceKey` rett etter hverandre blir ett steg. */
  apply: (edit: (plan: P) => P, coalesceKey?: string) => void
  /** Én endring av ett rom. */
  editRoom: (roomId: string, edit: (room: FloorPlanRoom) => FloorPlanRoom, coalesceKey?: string) => void
  undo: () => void
  redo: () => void
  /** Et hjørne, et inventar eller en åpning dras til `to`. */
  drag: (payload: {
    selection: FloorPlanSelection
    to: FloorPlanPoint
  }) => void
  /** Piltastene: det valgte hjørnet eller inventaret flyttes så mange meter. */
  nudge: (payload: {
    selection: FloorPlanSelection
    dx: number
    dy: number
  }) => void
  /** Fjerner den valgte åpningen eller det valgte inventaret; rommet det sto i blir valgt. */
  remove: (selection: FloorPlanSelection) => void
  /** Ny dør, nytt vindu eller ny åpning midt på veggen; den nye blir valgt. Uten plass på veggen skjer ingenting. */
  addOpening: (roomId: string, wallId: string, kind: FloorPlanOpeningKind) => void
  /** Nytt inventar midt i rommet; det nye blir valgt. */
  addObject: (roomId: string, category: FloorPlanObjectCategory) => void
  /** Delingen som pågår (SIGN-1982): rommet som deles, og stedet skillelinja starter når det er valgt. */
  split: Ref<FloorPlanSplit | null>
  /** Starter delingen av et rom: de to neste stedene som velges, er skillelinjas ender. */
  startSplit: (roomId: string) => void
  cancelSplit: () => void
  /**
   * Et sted for skillelinja er valgt. Det første legges på rommets omriss og
   * huskes (`started`); det andre deler rommet (`split`) — eller ikke, når
   * linja ikke går gjennom rommet (`refused`, og delingen står klar for et
   * nytt forsøk fra samme start). `name` er navnet det nye rommet får.
   */
  pickSplitPoint: (point: FloorPlanPoint, name: string) => 'started' | 'split' | 'refused' | 'idle'
  /** Deler rommet med en skillelinje mellom to steder på omrisset; det nye rommet blir valgt. Usann når rommet ikke kunne deles slik. */
  splitRoom: (roomId: string, from: FloorPlanPoint, to: FloorPlanPoint, name: string) => boolean
  /** Slår rommet sammen med et rom det møter langs en kant; rommet som består blir valgt. Usann når de ikke møtes. */
  mergeRooms: (roomId: string, otherRoomId: string) => boolean
}
export interface FloorPlanSplit {
  roomId: string
  from: FloorPlanPoint | null
}
export interface FloorPlanEditorOptions<P extends FloorPlanDocument> {
  /**
   * What is saved, as a text: two plans with the same text are the same plan,
   * and `dirty` is false. The default is the rooms as they are saved (without
   * measurements). An app that saves more than the rooms — the plan's name —
   * gives its own, so a change of that also counts.
   */
  signature?: (plan: P) => string
}
export declare const useFloorPlanEditor: <P extends FloorPlanDocument = FloorPlanDocument>(options?: FloorPlanEditorOptions<P>) => FloorPlanEditor<P>


/* ---------- The 3D view (floorPlan3d.ts, floorPlan3dRenderer.ts, floorPlan3dRuntime.ts, webgl.ts) ---------- */

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
export declare const DEFAULT_3D_MARK_TONES: {
  readonly added: "#4f8a3c"
  readonly removed: "#b4392b"
}
/** How much of the «new» tone a new element takes, and how dense a ghost is. */
export declare const ADDED_TINT = 0.6
export declare const GHOST_OPACITY = 0.3
/** Nøytrale toner for den som ikke har et tema å hente fra (tester, prøvebilder). */
export declare const DEFAULT_3D_TONES: FloorPlan3dTones
/**
 * The tones and the background of the snapshot «Make picture» sends
 * (SIGN-2014): always light, whatever theme the person has, and never with
 * the marks of what a sketch has changed. The picture is made from what the
 * snapshot shows — a dark room would be drawn dark, and the ghost of a wall
 * that is gone would be drawn as a wall. The same rule as in the Sign app.
 */
export declare const ILLUSTRATION_3D_TONES: FloorPlan3dTones
export declare const ILLUSTRATION_3D_BACKGROUND = "#ffffff"
export declare const WALL_THICKNESS = 0.1
/** Høyden på en vegg uten høyde, når ingen av rommets vegger har en. */
export declare const DEFAULT_WALL_HEIGHT = 2.4
export declare const PANE_THICKNESS = 0.02
export declare const PANE_OPACITY = 0.35
/** Takbåndet: så høyt, og så langt ut fra veggen. */
export declare const CEILING_BAND_HEIGHT = 0.06
/** Takflaten under skråtak er en hinne man ser gjennom. */
export declare const ROOF_OPACITY = 0.28
/** Dørbladet: så tykt. */
export declare const DOOR_LEAF_THICKNESS = 0.04
/** Brystningen og høyden en åpning får når den ikke har egne mål. */
export declare const OPENING_3D_DEFAULTS: Record<FloorPlanOpeningKind, {
  sill: number
  height: number
}>
/** Høyden inventar får når den ikke er oppgitt. */
export declare const OBJECT_DEFAULT_HEIGHTS: Record<FloorPlanObjectCategory, number>
/** Inventar av en type koden ikke kjenner tegnes som en lav, nøytral boks — typen gjettes ikke. */
export declare const UNKNOWN_OBJECT_HEIGHT = 0.8
/** `#rrggbb` som tre tall mellom 0 og 1; null for alt annet. */
export declare const hexToRgb: (color: string | null | undefined) => Rgb | null
/** To farger blandet: `share` av `over` oppå `base`. */
export declare const mixHex: (base: string, over: string, share: number) => string
/**
 * Deler en mangekant i trekanter (ørekutting): tre og tre punktnumre i
 * omrisset. Tåler omriss tegnet begge veier og rom med innhukk (L-form).
 * Færre enn tre punkter, eller et omriss uten flate, gir ingen trekanter.
 */
export declare const triangulatePolygon: (outline: readonly FloorPlanPoint[]) => number[]
/** Høyden veggene uten egen høyde får: medianen av rommets positive vegghøyder, ellers 2,4 m. */
export declare const fallbackWallHeight: (room: Pick<FloorPlanRoom, "walls">) => number
export declare const wallHeight: (room: Pick<FloorPlanRoom, "walls">, wall: Pick<FloorPlanWall, "height">) => number
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
export declare const wallHoles: (room: Pick<FloorPlanRoom, "walls" | "openings">, wall: FloorPlanWall, neighbours?: readonly Pick<FloorPlanRoom, "walls" | "openings">[]) => WallHole[]
/** Høyden inventaret tegnes med: den oppgitte, ellers typens vanlige. */
export declare const objectHeight: (object: Pick<FloorPlanObject, "category" | "height">) => number
/** Hvor høyt over gulvet inventarets underside er: det oppgitte, ellers står det på gulvet. */
export declare const objectElevation: (object: Pick<FloorPlanObject, "elevation">) => number
/**
 * Hele planen som flater: gulv, vegger med hull, vindusruter, inventar og
 * takbånd for hvert rom. `tones` er tonene som gjelder der personen ikke har
 * valgt farge. `options.marks` shows what a sketch has changed (SIGN-2014).
 */
export declare const buildFloorPlan3d: (plan: FloorPlanDocument, tones?: FloorPlan3dTones, options?: {
  marks?: FloorPlan3dMarks | null
}) => FloorPlan3dScene
export interface FloorPlan3dCamera {
  position: Vec3
  target: Vec3
  near: number
  far: number
}
/** Synsvinkelen loddrett, i grader. */
export declare const CAMERA_FOV = 40
/**
 * Utgangspunktet: kameraet ser ned på hele planen på skrå, forfra (planens
 * nedre kant nærmest) og litt fra siden, så langt unna at alt får plass i
 * bildet uansett om det er bredt eller høyt.
 */
export declare const fitCamera: (bounds: FloorPlan3dBounds, aspect: number, fov?: number) => FloorPlan3dCamera

/**
 * Tegner 3D-visningen av en plantegning med three.js (SIGN-1981). Fila er
 * det ENESTE stedet appen bruker three, og den lastes først når noen åpner en
 * 3D-visning (`import()` i `FloorPlan3dView`), så biblioteket aldri er med i
 * det appen starter med.
 *
 * Geometrien kommer ferdig regnet fra `floorPlan3d` (rene tall); her blir
 * den flater, lys og kamera. Det tegnes bare når noe har endret seg — ingen
 * løkke som går hele tiden — og alt gis tilbake i `dispose`: flatene,
 * materialene, kontrollene og selve WebGL-konteksten.
 */
export interface FloorPlan3dRenderer {
  /** Bytter ut det som tegnes. Første gang stilles kameraet inn på planen; siden står det der personen har satt det. */
  setScene: (scene: FloorPlan3dScene, background: string) => void
  resize: (width: number, height: number) => void
  /** Snur visningen rundt planen: `azimuth` sidelengs og `polar` opp/ned, i radianer. */
  orbit: (azimuth: number, polar: number) => void
  /** Flytter kameraet nærmere (under 1) eller lenger unna (over 1). */
  zoom: (factor: number) => void
  /** Tilbake til utgangspunktet: hele planen, sett ovenfra på skrå. */
  reset: () => void
  /** A PNG of what the camera sees now (SIGN-2014) — the snapshot «Lag bilde» sends. Rejects when nothing can be drawn. */
  snapshot: () => Promise<Blob>
  dispose: () => void
}

/**
 * What the 3D view needs from the browser (SIGN-2041): the answer to «can
 * this browser draw with WebGL?», and the renderer — three.js — which is
 * fetched the first time a 3D view is opened and is never part of what an
 * app starts with.
 *
 * The two are gathered in one object so an app's tests can replace them
 * (`vi.spyOn(floorPlan3dRuntime, 'loadRenderer')`): a test browser has no
 * WebGL, and the renderer is a chunk inside this package that a test cannot
 * reach by path. Nothing else should write to it.
 */
export declare const floorPlan3dRuntime: {
  isWebGlAvailable: () => boolean
  /** Fetches the renderer and, with it, three.js. */
  loadRenderer: () => Promise<(canvas: HTMLCanvasElement) => FloorPlan3dRenderer>
}

/**
 * Kan nettleseren tegne med WebGL? Spørres før 3D-visningen lastes
 * (SIGN-1981), så den som ikke kan vise den får beskjed uten å hente
 * tegnebiblioteket. Prøvekonteksten slippes med en gang: nettleseren har et
 * lite antall WebGL-kontekster per side.
 */
export declare const isWebGlAvailable: () => boolean


/* ---------- The components ---------- */

/**
 * Tegner én plantegning (SIGN-794) som SVG av rommenes geometri. Planens
 * tall brukes som de er — meter, x mot høyre, y nedover — inne i én gruppe
 * som skaleres til plassen komponenten har; teksten står utenfor gruppa, så
 * skriften er like stor uansett hvor stor planen er.
 *
 * Gulvet er en rolig flate, veggene tykke streker, og åpningene er skåret ut
 * av veggen: en dør har blad og slagbue inn i rommet den hører til, et vindu
 * en tynn farget strek, en åpen passasje en stiplet. Hva noe er, leses fra
 * typefeltet (`kind`, `category`) — en type tegneren ikke kjenner, får et
 * nøytralt merke og gjettes ikke.
 *
 * Mål og navn skrives bare der det er plass på skjermen: en vegg som er
 * tegnet kortere enn ca. 46 px får ikke lengde, og et rom som er tegnet
 * mindre enn ca. 56 × 34 px får ikke navn og areal. En vegg som deles med et
 * annet rom får ikke lengde i tegningen av hele planen — tegn rommet alene
 * (en plan med bare det rommet) for å få alle veggene med mål. `compact`
 * tegner uten mål og navn (miniatyren i widgeten).
 *
 * Farger (SIGN-1980): har rommet en gulvfarge, fylles gulvet med den, og en
 * vegg tegnes i sin egen farge eller rommets veggfarge. Fargene er data
 * personen har valgt og kan være hva som helst; uten dem gjelder temaets
 * toner. Navnet i rommet, dørslagene og inventaret får blekket som leses
 * best på den valgte gulvfargen (inventaret som en svak tone av det), og en
 * farget vegg får en tynn kant i blekk, så en hvit vegg synes på et hvitt
 * kort.
 *
 * `interactive` gjør tegningen til arbeidsflaten i redigeringen: et trykk
 * velger det som ligger under (hjørne foran åpning foran inventar foran vegg
 * foran rom), hjørner, inventar og åpninger kan dras, og tastaturet flytter,
 * sletter og angrer. Tegningen endrer ingenting selv — den sier hva
 * personen gjorde (`select`, `drag`, `nudge`, `remove`, `undo`, `redo`), og
 * den som eier planen bruker redigeringsreglene. Uten `interactive` er
 * tegningen et bilde, som før.
 *
 * SIGN-1982: en dør tegnes med bladet ut fra enden den er hengslet i, på
 * siden den slår mot (en dør som ikke sier noe, tegnes som før). Den valgte
 * veggen får «A» ved starten og «B» ved slutten, så høydene i feltene kan
 * leses mot tegningen. Og med `split` er tegningen i delemodus: et trykk
 * velger et sted på omrisset til rommet som deles (`splitPick`), og
 * skillelinja vises fra det første stedet til der pekeren står.
 *
 * SIGN-1987: inventaret tegnes som det det er — et toalett som et toalett,
 * en seng som en seng — med symbolet typen (og utformingen) har i
 * `floorPlanFurniture`, strukket til inventarets bredde og dybde og dreid
 * som det står. Baksiden (sisternen, hodeenden) er kanten ved −y i
 * inventarets egen ramme. Er inventaret tegnet mindre enn ca. 18 px på den
 * korteste siden, tegnes bare omrisset — detaljene ville blitt en klatt — så
 * symbolet leses også i miniatyren. En type uten symbol er et rektangel, som
 * før. Treffflaten er hele inventarets rektangel, ikke streken.
 *
 * SIGN-2014: `marks` shows what a sketch has changed, on top of the plan. The
 * mark is a thin contour AROUND the element — never paint on it — so the
 * element keeps its own look: a wall that was painted blue is seen blue,
 * with the contour saying it was changed. New is a full line in the success
 * tone, moved a dashed one and changed a dotted one in the action colour,
 * and what was removed is drawn as a dashed ghost in the error tone where it
 * stood (a moved element gets a faint ghost where it came from). `attention` pulses the
 * elements a question asks the person to choose between, and `picked`
 * outlines the ones the person has pointed at. The colours are the theme's
 * roles, and never the only carrier of meaning: the one who shows the
 * drawing gives the legend and the text read aloud. Without `marks` the
 * drawing is exactly as before.
 *
 * `interactive="pick"` makes the drawing a place to point: a press says what
 * is under it (`select`) — an opening, an object, a wall or a room, never a
 * corner — and nothing can be dragged, moved or removed.
 */
type FloorPlanDrawingProps = {
  plan: FloorPlanDocument
  /** Navnet på tegningen for skjermlesere («Plantegning: 1. etasje»). */
  label: string
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the measurements are written as that language writes them, and the furniture is named in it. */
  locale: string
  /** Uten mål og romnavn, med tynnere streker — for miniatyrer. */
  compact?: boolean
  /** Den største høyden tegningen får, i piksler. */
  maxHeight?: number
  /** Arbeidsflate i redigeringen: velg, dra og bruk tastaturet. `pick`: bare velg (SIGN-2014). */
  interactive?: boolean | 'pick'
  /** Det som er valgt (bare med `interactive`). */
  selection?: FloorPlanSelection | null
  /** Delemodus (bare med `interactive`): rommet som deles, og stedet skillelinja starter når det er valgt. */
  split?: {
    roomId: string
    from: FloorPlanPoint | null
  } | null
  /** What a sketch has changed, drawn on top of the plan (SIGN-2014). Without it nothing is marked. */
  marks?: FloorPlanMarks | null
}
export declare const FloorPlanDrawing: import("vue").DefineComponent<FloorPlanDrawingProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
  select: (selection: FloorPlanSelection | null) => any
  drag: (payload: {
    selection: FloorPlanSelection
    to: FloorPlanPoint
  }) => any
  dragEnd: (selection: FloorPlanSelection) => any
  nudge: (payload: {
    selection: FloorPlanSelection
    dx: number
    dy: number
  }) => any
  remove: (selection: FloorPlanSelection) => any
  undo: () => any
  redo: () => any
  splitPick: (point: FloorPlanPoint) => any
  splitCancel: () => any
}, string, import("vue").PublicProps, Readonly<FloorPlanDrawingProps> & Readonly<{
  onSelect?: ((selection: FloorPlanSelection | null) => any) | undefined
  onDrag?: ((payload: {
    selection: FloorPlanSelection
    to: FloorPlanPoint
  }) => any) | undefined
  onDragEnd?: ((selection: FloorPlanSelection) => any) | undefined
  onNudge?: ((payload: {
    selection: FloorPlanSelection
    dx: number
    dy: number
  }) => any) | undefined
  onRemove?: ((selection: FloorPlanSelection) => any) | undefined
  onUndo?: (() => any) | undefined
  onRedo?: (() => any) | undefined
  onSplitPick?: ((point: FloorPlanPoint) => any) | undefined
  onSplitCancel?: (() => any) | undefined
}>, {
  compact: boolean
  maxHeight: number
  interactive: boolean | "pick"
  selection: FloorPlanSelection | null
  split: {
    roomId: string
    from: FloorPlanPoint | null
  } | null
  marks: FloorPlanMarks | null
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>

/**
 * 3D-visningen av en plantegning (SIGN-1981): rommene sett ovenfra på skrå,
 * som et dukkehus uten tak, bygd av planens egne data — så den alltid
 * stemmer med det som er redigert. Dra for å snu, rull eller knip for å
 * zoome, høyreklikk-dra (eller to fingre) for å flytte; piltastene snur,
 * + og − zoomer, og Home eller 0 setter visningen tilbake.
 *
 * Geometrien regnes i `floorPlan3d` (rene tall). Tegningen gjøres av
 * three.js, som lastes først når en 3D-visning åpnes (`floorPlan3dRuntime`) —
 * biblioteket er aldri med i det appen starter med. Uten WebGL sier
 * visningen det, uten å hente biblioteket.
 *
 * Fargene er planens egne der personen har valgt; ellers tonene fra temaet,
 * lest på nytt når temaet byttes. Endres planen (en annen lagrer den),
 * bygges scenen på nytt, og kameraet står der personen har satt det.
 * Ingenting beveger seg av seg selv, så det er ingenting å dempe for
 * `prefers-reduced-motion`.
 *
 * SIGN-2014: `marks` shows what a sketch has changed — what is new is tinted
 * with the success tone, and the walls and objects that are gone stand as
 * translucent ghosts in the error tone. `snapshot()` gives a PNG of what the
 * camera sees now, WITHOUT the marks and always in light tones, whatever the
 * theme: the picture «Lag bilde» is made from shows the rooms as they will
 * be, not how they were changed.
 */
type FloorPlan3dViewProps = {
  plan: FloorPlanDocument
  /** Navnet for skjermlesere: hva som vises (planens navn og antall rom). */
  label: string
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the view's own texts. */
  locale: string
  /** What a sketch has changed (SIGN-2014). Without it nothing is marked. */
  marks?: FloorPlan3dMarks | null
}
type FloorPlan3dViewStatus = 'loading' | 'ready' | 'unavailable' | 'error'
export declare const FloorPlan3dView: import("vue").DefineComponent<FloorPlan3dViewProps, {
  snapshot: () => Promise<Blob | null>
  status: import("vue").Ref<FloorPlan3dViewStatus, FloorPlan3dViewStatus>
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<FloorPlan3dViewProps> & Readonly<{}>, {
  marks: FloorPlan3dMarks | null
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>

export declare const FloorPlanEditorWorkspace: <P extends FloorPlanDocument>(props: NonNullable<Awaited<typeof setup>>["props"], ctx?: FloorPlanPrettify<Pick<NonNullable<Awaited<typeof setup>>, "attrs" | "emit" | "slots">>, exposed?: NonNullable<Awaited<typeof setup>>["expose"], setup?: Promise<{
  props: import("vue").PublicProps & FloorPlanPrettify<{
    editor: FloorPlanEditor<P>
    /** Navnet på tegningen for skjermlesere. */
    drawingLabel: string
    /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the texts, and how the measurements are written. */
    locale: string
  } & {
    onSplitRefused?: ((message: string) => any) | undefined
    onSave?: (() => any) | undefined
  }> & (typeof globalThis extends {
    __VLS_PROPS_FALLBACK: infer P_1
  } ? P_1 : {})
  expose: (exposed: {}) => void
  attrs: any
  slots: {}
  emit: ((evt: "splitRefused", message: string) => void) & ((evt: "save") => void)
}>) => import("vue").VNode & {
  __ctx?: NonNullable<Awaited<typeof setup>>
}

export declare const FloorPlanInspector: <P extends FloorPlanDocument>(props: NonNullable<Awaited<typeof setup>>["props"], ctx?: FloorPlanPrettify<Pick<NonNullable<Awaited<typeof setup>>, "attrs" | "emit" | "slots">>, exposed?: NonNullable<Awaited<typeof setup>>["expose"], setup?: Promise<{
  props: import("vue").PublicProps & FloorPlanPrettify<{
    editor: FloorPlanEditor<P>
    /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the texts, and how the measurements are written and read. */
    locale: string
  } & {
    onSplitRefused?: (() => any) | undefined
  }> & (typeof globalThis extends {
    __VLS_PROPS_FALLBACK: infer P_1
  } ? P_1 : {})
  expose: (exposed: {}) => void
  attrs: any
  slots: {}
  emit: (evt: "splitRefused") => void
}>) => import("vue").VNode & {
  __ctx?: NonNullable<Awaited<typeof setup>>
}

/**
 * Fargevalget for et gulv eller en vegg (SIGN-1980): de ferdige tonene, en
 * fri farge og «Ingen farge». Fargen er data personen velger og lagres som
 * `#rrggbb` med små bokstaver; uten farge tegnes planen i appens egne toner.
 *
 * Tonene er knapper med navn (ikke bare farge): den valgte er merket med en
 * hake og `aria-pressed`. Den frie fargen velges i Vuetifys fargevelger; så
 * lenge den dras i, meldes hver farge som en fortsettelse (`continuous`), så
 * hele valget blir ett angresteg.
 */
type FloorPlanColorFieldProps = {
  modelValue: string | null
  label: string
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the tone names. */
  locale: string
}
export declare const FloorPlanColorField: import("vue").DefineComponent<FloorPlanColorFieldProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
  change: (color: string | null, continuous: boolean) => any
}, string, import("vue").PublicProps, Readonly<FloorPlanColorFieldProps> & Readonly<{
  onChange?: ((color: string | null, continuous: boolean) => any) | undefined
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>

/**
 * Et felt for et mål (SIGN-1980). Verdien er SI — meter, m² eller m³ — og
 * det er den som sendes ut; i feltet står tallet slik brukerens språk
 * skriver det, med enheten bak. Verdien meldes når feltet forlates eller
 * Enter trykkes, så et halvskrevet tall aldri blir en endring. Det som ikke
 * er et tall, settes tilbake til det som sto.
 */
type MeasurementFieldProps = {
  /** SI-verdien; null er «ikke målt». */
  modelValue: number | null
  label: string
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the number is written and read the way that language writes it. */
  locale: string
  quantity?: MeasurementQuantity
  /** Et tomt felt betyr «ikke målt» (null) i stedet for å settes tilbake. */
  nullable?: boolean
  disabled?: boolean
}
export declare const MeasurementField: import("vue").DefineComponent<MeasurementFieldProps, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
  "update:modelValue": (value: number | null) => any
}, string, import("vue").PublicProps, Readonly<MeasurementFieldProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: number | null) => any) | undefined
}>, {
  disabled: boolean
  quantity: MeasurementQuantity
  nullable: boolean
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>
