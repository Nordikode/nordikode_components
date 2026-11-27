import { isStructuralObjectCategory } from './model'
import furniture from './floorPlanFurniture.json'

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
export type FurnitureShape =
  | { kind: 'rect'; x: number; y: number; width: number; height: number; radius: number; fill: FurnitureFill; stroke: FurnitureStroke }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: FurnitureFill; stroke: FurnitureStroke }
  | { kind: 'path'; points: { x: number; y: number }[]; closed: boolean; fill: FurnitureFill; stroke: FurnitureStroke }

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

type Coordinate = number | [number, number]
type Span = [Coordinate, Coordinate]

interface ShapeStyle {
  fill?: FurnitureFill
  stroke?: FurnitureStroke
}

type PlanEntry =
  | ({ shape: 'rect'; x: Span; y: Span; radius?: Coordinate } & ShapeStyle)
  | ({ shape: 'ellipse'; x: Span; y: Span } & ShapeStyle)
  | ({ shape: 'circle'; at: [Coordinate, Coordinate]; radius: Coordinate } & ShapeStyle)
  | ({ shape: 'path'; points: [Coordinate, Coordinate][]; closed?: boolean } & ShapeStyle)
  | ({ shape: 'divide'; x: Span; y: Span; along: 'x' | 'y'; every: number; min: number; max: number } & ShapeStyle)

type SolidEntry =
  | { part: 'box'; x: Span; y: Span; z: Span; tone?: FurnitureTone }
  | { part: 'cylinder'; x: Span; y: Span; z: Span; axis?: 'y' | 'z'; sides?: number; tone?: FurnitureTone }
  | { part: 'steps'; x: Span; y: Span; z: Span; every: number; min: number; max: number; tone?: FurnitureTone }

interface FurnitureData {
  version: number
  variants: Record<string, string[]>
  symbols: Record<string, { plan: PlanEntry[]; solid: SolidEntry[] }>
}

const DATA = furniture as unknown as FurnitureData

/** Hvor mye av utstrekningen meterne i et par `[andel, meter]` får bruke. */
const OFFSET_SHARE = 0.45
/** Så mange sider har en sylinder som ikke sier noe annet. */
const DEFAULT_SIDES = 12
/** Et ukjent inventar tegnes som før: et rektangel med hjørner rundet 18 % av den korteste siden. */
const FALLBACK_RADIUS = 0.18

/** Fire desimaler (en tidels millimeter), halve opp — samme regel som i appen, så tallene blir like. */
const round = (value: number): number => Math.floor(value * 10000 + 0.5) / 10000 + 0

/** Et tall i dataene som meter fra aksens start: andelen av `size`, pluss meterne (klemt). */
const along = (coordinate: Coordinate, size: number): number => {
  if (typeof coordinate === 'number') {
    return coordinate * size
  }

  const limit = OFFSET_SHARE * size

  return coordinate[0] * size + Math.max(-limit, Math.min(limit, coordinate[1]))
}

/** Fra–til langs en akse, minst først. */
const span = (pair: Span, size: number): [number, number] => {
  const from = along(pair[0], size)
  const to = along(pair[1], size)

  return from <= to ? [from, to] : [to, from]
}

/** Hvor mange like deler en strekning deles i: én per `every` meter, innenfor `min` og `max`. */
const parts = (length: number, every: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.floor(length / every + 0.5)))

/* ------------------------------------------------------------------ */
/* Utforminger                                                         */
/* ------------------------------------------------------------------ */

/**
 * The structural objects (SIGN-2014, contract 1.6) are drawn by code, not by
 * a symbol in the data file — the file is shared byte for byte with the Sign
 * app and stays as it is. A column is a filled square (or circle, variant
 * `round`) seen from above and a full-height box (or cylinder) in 3D; a beam
 * is a dashed rectangle seen from above (it hangs under the ceiling) and a
 * box in 3D.
 */
const STRUCTURAL_VARIANTS: Readonly<Record<string, readonly string[]>> = { column: ['square', 'round'] }

/** Utformingene hver type kan ha (`variant` på inventaret); en type som ikke står her, har ingen. */
export const FLOOR_PLAN_OBJECT_VARIANTS: Readonly<Record<string, readonly string[]>> = { ...DATA.variants, ...STRUCTURAL_VARIANTS }

/** Utformingene typen kan ha, i den rekkefølgen de vises; tom for en type uten utforminger. */
export const objectVariantsFor = (category: string | null | undefined): readonly string[] => FLOOR_PLAN_OBJECT_VARIANTS[category ?? ''] ?? []

/** Utformingen når typen har den; ellers null (ikke oppgitt, ukjent, eller en annen types utforming). */
export const toFloorPlanObjectVariant = (category: string | null | undefined, variant: string | null | undefined): string | null =>
  objectVariantsFor(category).find((known) => known === variant) ?? null

/** Symbolet for typen og utformingen: utformingens eget, ellers typens, ellers ingenting. */
const symbolFor = (category: string, variant: string | null | undefined): FurnitureData['symbols'][string] | null => {
  const known = toFloorPlanObjectVariant(category, variant)

  return (known === null ? undefined : DATA.symbols[`${category}:${known}`]) ?? DATA.symbols[category] ?? null
}

/** Har typen sitt eget symbol? (Ellers tegnes den som et rektangel og en boks.) */
export const hasFurnitureSymbol = (category: string): boolean => DATA.symbols[category] !== undefined

/* ------------------------------------------------------------------ */
/* Plantegningen: symbolet sett ovenfra                                */
/* ------------------------------------------------------------------ */

export interface FurnitureFootprint {
  category: string
  variant?: string | null
  /** Meter langs inventarets egen x-akse. */
  width: number
  /** Meter langs inventarets egen y-akse. */
  depth: number
}

/** A column or a beam seen from above: one shape over the whole footprint. */
const structuralPlan = (object: FurnitureFootprint): FurnitureShape[] => {
  const { width, depth } = object

  if (object.category === 'beam') {
    return [{ kind: 'rect', x: round(-width / 2), y: round(-depth / 2), width: round(width), height: round(depth), radius: 0, fill: 'none', stroke: 'dashed' }]
  }

  if (toFloorPlanObjectVariant(object.category, object.variant) === 'round') {
    return [{ kind: 'ellipse', cx: 0, cy: 0, rx: round(width / 2), ry: round(depth / 2), fill: 'solid', stroke: 'outline' }]
  }

  return [{ kind: 'rect', x: round(-width / 2), y: round(-depth / 2), width: round(width), height: round(depth), radius: 0, fill: 'solid', stroke: 'outline' }]
}

/**
 * Formene symbolet består av, i den rekkefølgen de tegnes, i inventarets
 * egen ramme. Et inventar uten bredde eller dybde har ingen former.
 */
export const furniturePlan = (object: FurnitureFootprint): FurnitureShape[] => {
  const { width, depth } = object

  if (!(width > 0) || !(depth > 0)) {
    return []
  }

  const shorter = Math.min(width, depth)

  if (isStructuralObjectCategory(object.category)) {
    return structuralPlan(object)
  }

  const symbol = symbolFor(object.category, object.variant)

  if (symbol === null) {
    return [
      {
        kind: 'rect',
        x: round(-width / 2),
        y: round(-depth / 2),
        width: round(width),
        height: round(depth),
        radius: round(shorter * FALLBACK_RADIUS),
        fill: 'body',
        stroke: 'outline',
      },
    ]
  }

  const shapes: FurnitureShape[] = []
  // Fra aksens start til inventarets egen ramme: origo i midten.
  const px = (value: number): number => round(value - width / 2)
  const py = (value: number): number => round(value - depth / 2)

  for (const entry of symbol.plan) {
    const fill = entry.fill ?? 'none'
    const stroke = entry.stroke ?? 'detail'

    switch (entry.shape) {
      case 'rect': {
        const [x0, x1] = span(entry.x, width)
        const [y0, y1] = span(entry.y, depth)
        const radius = Math.max(0, Math.min(entry.radius === undefined ? 0 : along(entry.radius, shorter), (x1 - x0) / 2, (y1 - y0) / 2))

        shapes.push({ kind: 'rect', x: px(x0), y: py(y0), width: round(x1 - x0), height: round(y1 - y0), radius: round(radius), fill, stroke })
        break
      }
      case 'ellipse': {
        const [x0, x1] = span(entry.x, width)
        const [y0, y1] = span(entry.y, depth)

        shapes.push({ kind: 'ellipse', cx: px((x0 + x1) / 2), cy: py((y0 + y1) / 2), rx: round((x1 - x0) / 2), ry: round((y1 - y0) / 2), fill, stroke })
        break
      }
      case 'circle': {
        const radius = round(Math.max(0, along(entry.radius, shorter)))

        shapes.push({ kind: 'ellipse', cx: px(along(entry.at[0], width)), cy: py(along(entry.at[1], depth)), rx: radius, ry: radius, fill, stroke })
        break
      }
      case 'path':
        shapes.push({
          kind: 'path',
          points: entry.points.map(([x, y]) => ({ x: px(along(x, width)), y: py(along(y, depth)) })),
          closed: entry.closed === true,
          fill,
          stroke,
        })
        break
      case 'divide': {
        const [x0, x1] = span(entry.x, width)
        const [y0, y1] = span(entry.y, depth)
        const lengthwise = entry.along === 'x'
        const count = parts(lengthwise ? x1 - x0 : y1 - y0, entry.every, entry.min, entry.max)

        for (let index = 1; index < count; index += 1) {
          const at = lengthwise ? x0 + ((x1 - x0) * index) / count : y0 + ((y1 - y0) * index) / count

          shapes.push({
            kind: 'path',
            points: lengthwise
              ? [
                  { x: px(at), y: py(y0) },
                  { x: px(at), y: py(y1) },
                ]
              : [
                  { x: px(x0), y: py(at) },
                  { x: px(x1), y: py(at) },
                ],
            closed: false,
            fill: 'none',
            stroke,
          })
        }

        break
      }
    }
  }

  return shapes
}

/* ------------------------------------------------------------------ */
/* 3D: formen satt sammen av enkle deler                               */
/* ------------------------------------------------------------------ */

/**
 * Delene 3D-formen er satt sammen av, i inventarets egen ramme, `height`
 * meter høy. Et inventar uten bredde, dybde eller høyde har ingen deler; en
 * type uten symbol er én boks.
 */
export const furnitureSolid = (object: FurnitureFootprint, height: number): FurniturePart[] => {
  const { width, depth } = object

  if (!(width > 0) || !(depth > 0) || !(height > 0)) {
    return []
  }

  const symbol = symbolFor(object.category, object.variant)
  const box = (x: [number, number], y: [number, number], z: [number, number], tone: FurnitureTone): FurniturePart => ({
    kind: 'box',
    min: [round(x[0] - width / 2), round(y[0]), round(z[0] - depth / 2)],
    max: [round(x[1] - width / 2), round(y[1]), round(z[1] - depth / 2)],
    axis: 'y',
    sides: 4,
    tone,
  })

  if (object.category === 'column' && toFloorPlanObjectVariant(object.category, object.variant) === 'round') {
    return [{ ...box([0, width], [0, height], [0, depth], 'strong'), kind: 'cylinder', sides: DEFAULT_SIDES }]
  }

  if (isStructuralObjectCategory(object.category)) {
    return [box([0, width], [0, height], [0, depth], 'strong')]
  }

  if (symbol === null) {
    return [box([0, width], [0, height], [0, depth], 'base')]
  }

  const solid: FurniturePart[] = []

  for (const entry of symbol.solid) {
    const x = span(entry.x, width)
    const y = span(entry.y, height)
    const z = span(entry.z, depth)
    const tone = entry.tone ?? 'base'

    switch (entry.part) {
      case 'box':
        solid.push(box(x, y, z, tone))
        break
      case 'cylinder':
        solid.push({ ...box(x, y, z, tone), kind: 'cylinder', axis: entry.axis ?? 'y', sides: entry.sides ?? DEFAULT_SIDES })
        break
      case 'steps': {
        // Trinnene stiger fra forsiden (lavest) til baksiden (høyest): hvert trinn er en blokk fra gulvet og opp.
        const count = parts(z[1] - z[0], entry.every, entry.min, entry.max)

        for (let index = 0; index < count; index += 1) {
          solid.push(
            box(
              x,
              [y[0], y[0] + ((y[1] - y[0]) * (index + 1)) / count],
              [z[1] - ((z[1] - z[0]) * (index + 1)) / count, z[1] - ((z[1] - z[0]) * index) / count],
              tone,
            ),
          )
        }

        break
      }
    }
  }

  return solid
}
