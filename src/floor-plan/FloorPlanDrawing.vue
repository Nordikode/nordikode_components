<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import type { FloorPlanDocument, FloorPlanPoint } from './model'
import { floorPlanBounds, measured, toFloorPlanObjectCategory, toFloorPlanOpeningKind } from './model'
import { distance, doorSwing, isSharedWall, midpoint, normalToward, readableAngle, roomCenter } from './floorPlanGeometry'
import { readableInk } from './floorPlanColors'
import { hitTest, outlineSpot, type FloorPlanSelection } from './floorPlanEditing'
import { furniturePlan, type FurnitureShape } from './floorPlanFurniture'
import { sketchElementKey, type FloorPlanGhost, type FloorPlanMarks } from './sketchMarks'
import { floorPlanNames } from './floorPlanNames'
import { formatArea, formatLength } from './measurements'

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
const props = withDefaults(
  defineProps<{
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
    split?: { roomId: string; from: FloorPlanPoint | null } | null
    /** What a sketch has changed, drawn on top of the plan (SIGN-2014). Without it nothing is marked. */
    marks?: FloorPlanMarks | null
  }>(),
  { compact: false, maxHeight: undefined, interactive: false, selection: null, split: null, marks: null },
)

const emit = defineEmits<{
  /** Et trykk i tegningen: det som ligger under, eller null for tom flate. */
  select: [selection: FloorPlanSelection | null]
  /** Et hjørne, et inventar eller en åpning dras: `to` er dit ankerpunktet (hjørnet, midten) er dratt, i planens tall. */
  drag: [payload: { selection: FloorPlanSelection; to: FloorPlanPoint }]
  /** Draget er sluppet. */
  dragEnd: [selection: FloorPlanSelection]
  /** Piltastene: flytt det valgte hjørnet eller inventaret så mange meter. */
  nudge: [payload: { selection: FloorPlanSelection; dx: number; dy: number }]
  /** Delete: fjern den valgte åpningen eller det valgte inventaret. */
  remove: [selection: FloorPlanSelection]
  undo: []
  redo: []
  /** Delemodus: et sted i tegningen er valgt for skillelinja, i planens tall. */
  splitPick: [point: FloorPlanPoint]
  /** Delemodus: Esc avbryter delingen. */
  splitCancel: []
}>()

const names = computed(() => floorPlanNames(props.locale))

/** Bredden tegningen regner med til den er målt (og i tester, der ingenting har bredde). */
const FALLBACK_WIDTH = 640
const FALLBACK_WIDTH_COMPACT = 96
const MAX_HEIGHT = 520
const MAX_HEIGHT_COMPACT = 72
/** Lufta rundt planen: plass til veggmålene på utsiden. */
const PADDING = 30
const PADDING_COMPACT = 3
const WALL_WIDTH = 4
const WALL_WIDTH_COMPACT = 1.5
const THIN_WIDTH = 1.25
const THIN_WIDTH_COMPACT = 0.75
/** Hvor langt utenfor veggen målet står. */
const WALL_LABEL_OFFSET = 13
/** Den korteste veggen, slik den er tegnet, som får lengden sin skrevet. */
const WALL_LABEL_MIN_LENGTH = 46
/** Det minste rommet, slik det er tegnet, som får navn og areal. */
const ROOM_LABEL_MIN_WIDTH = 56
const ROOM_LABEL_MIN_HEIGHT = 34
/** Omtrent hvor bredt ett tegn i romnavnet er: et navn som er bredere enn rommet, skrives ikke. */
const ROOM_LABEL_CHAR = 7.2
const ROOM_LINE_HEIGHT = 16

/** Hvor nær et hjørne, en åpning eller en vegg et trykk må være, i piksler: romsligere for en finger enn for en mus. */
const HIT_TOLERANCE = 9
const HIT_TOLERANCE_TOUCH = 18
/** Hvor langt pekeren må flytte seg før et trykk regnes som et drag. */
const DRAG_THRESHOLD = 3
/** Ett trykk på en piltast flytter én centimeter. */
const NUDGE_STEP = 0.01
const CORNER_RADIUS = 5
/** Den korteste siden et inventar må ha, slik det er tegnet, for at detaljene i symbolet skal tegnes. */
const OBJECT_DETAIL_MIN = 18

/** The drawing takes the pointer and the keyboard: as the editor's work surface, or only to point (`pick`). */
const live = computed(() => props.interactive !== false)
/** The work surface of the editor: corners, dragging and the editing keys. */
const editing = computed(() => props.interactive === true)

const host = ref<HTMLElement | null>(null)
const svgElement = ref<SVGSVGElement | null>(null)
const hostWidth = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!host.value) {
    return
  }

  hostWidth.value = host.value.clientWidth

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  observer = new ResizeObserver((entries) => {
    hostWidth.value = entries[0]?.contentRect.width ?? hostWidth.value
  })
  observer.observe(host.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})

const maskId = `floor-plan-openings-${useId()}`

const wallWidth = computed(() => (props.compact ? WALL_WIDTH_COMPACT : WALL_WIDTH))
const thinWidth = computed(() => (props.compact ? THIN_WIDTH_COMPACT : THIN_WIDTH))

/**
 * Rammen: planens ytterkant pluss luft, i piksler. Målestokken er den
 * største som får hele planen inn i bredden komponenten har og høyden den
 * får bruke.
 */
const fittedFrame = computed(() => {
  const bounds = floorPlanBounds(props.plan)

  if (bounds === null) {
    return null
  }

  const padding = props.compact ? PADDING_COMPACT : PADDING
  const availableWidth = hostWidth.value > 0 ? hostWidth.value : props.compact ? FALLBACK_WIDTH_COMPACT : FALLBACK_WIDTH
  const availableHeight = props.maxHeight ?? (props.compact ? MAX_HEIGHT_COMPACT : MAX_HEIGHT)
  // En plan uten utstrekning i én retning (én vegg) får en liten flate å stå på.
  const planWidth = Math.max(bounds.maxX - bounds.minX, 0.01)
  const planHeight = Math.max(bounds.maxY - bounds.minY, 0.01)
  const scale = Math.max(
    Math.min((availableWidth - padding * 2) / planWidth, (availableHeight - padding * 2) / planHeight),
    0.01,
  )
  const width = round(planWidth * scale + padding * 2)
  const height = round(planHeight * scale + padding * 2)

  return {
    bounds,
    scale,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    transform: `translate(${round(padding - bounds.minX * scale)} ${round(padding - bounds.minY * scale)}) scale(${round(scale, 4)})`,
    toPixels: (point: FloorPlanPoint): FloorPlanPoint => ({
      x: (point.x - bounds.minX) * scale + padding,
      y: (point.y - bounds.minY) * scale + padding,
    }),
    toPlan: (pixel: FloorPlanPoint): FloorPlanPoint => ({
      x: (pixel.x - padding) / scale + bounds.minX,
      y: (pixel.y - padding) / scale + bounds.minY,
    }),
  }
})

// Mens noe dras står rammen stille: ellers ville tegningen skalert seg om
// under pekeren hver gang planen ble større eller mindre.
const dragFrame = shallowRef<typeof fittedFrame.value>(null)
const frame = computed(() => dragFrame.value ?? fittedFrame.value)

function round(value: number, digits = 2): number {
  const factor = 10 ** digits

  return Math.round(value * factor) / factor
}

/** En strekbredde i piksler, uttrykt i planens tall (gruppa er skalert). */
const stroke = (pixels: number): number => (frame.value ? round(pixels / frame.value.scale, 5) : 0)

const rooms = computed(() =>
  props.plan.rooms.map((room) => ({
    room,
    center: roomCenter(room.outline),
    points: room.outline.map((point) => `${point.x},${point.y}`).join(' '),
    // Fargen personen har valgt for gulvet, og blekket som leses best oppå den.
    floorColor: room.floorColor ?? null,
    ink: readableInk(room.floorColor),
  })),
)

const walls = computed(() =>
  props.plan.rooms.flatMap((room) =>
    // Veggens egen farge vinner over rommets veggfarge; uten noen av dem gjelder temaets blekk.
    room.walls.map((wall) => ({ ...wall, roomId: room.id, paint: wall.color ?? room.wallColor ?? null })),
  ),
)

const paintedWalls = computed(() => walls.value.filter((wall) => wall.paint !== null))

/** En form i symbolet som `d` for en `<path>` (linjer og mangekanter). */
const pathData = (shape: Extract<FurnitureShape, { kind: 'path' }>): string =>
  `${shape.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')}${shape.closed ? ' Z' : ''}`

/** Navnet på typen, for den som holder pekeren over symbolet eller leser tegningen opp. */
const objectName = (category: string): string => {
  const known = toFloorPlanObjectCategory(category)

  return known === null ? names.value.furniture : names.value.objects[known]
}

const objects = computed(() => {
  const scale = frame.value?.scale ?? 0

  return rooms.value.flatMap(({ room, ink }) =>
    room.objects.map((object) => {
      const degrees = round((object.rotation * 180) / Math.PI, 3)
      // Så lite at detaljene ikke kan leses: bare omrisset tegnes.
      const detailed = Math.min(object.width, object.depth) * scale >= OBJECT_DETAIL_MIN

      return {
        key: `${room.id}:${object.id}`,
        roomId: room.id,
        id: object.id,
        ink,
        category: object.category,
        name: objectName(object.category),
        // Rektangelet rundt inventaret: det som markeres når inventaret er valgt.
        x: object.center.x - object.width / 2,
        y: object.center.y - object.depth / 2,
        width: object.width,
        height: object.depth,
        radius: Math.min(object.width, object.depth) * 0.18,
        transform: `rotate(${degrees} ${object.center.x} ${object.center.y})`,
        // Symbolet er regnet i inventarets egen ramme: flyttet til midtpunktet og dreid.
        frame: `translate(${object.center.x} ${object.center.y}) rotate(${degrees})`,
        shapes: furniturePlan(object)
          .filter((shape) => shape.stroke !== 'none' || shape.fill !== 'none')
          // A beam is nothing but its dashed outline, so that stays too (SIGN-2014).
          .filter((shape) => detailed || shape.stroke === 'outline' || shape.stroke === 'dashed'),
      }
    }),
  )
})

const openings = computed(() =>
  rooms.value.flatMap(({ room, center, ink }) =>
    room.openings.map((opening) => {
      const kind = toFloorPlanOpeningKind(opening.kind)

      return {
        id: `${room.id}:${opening.id}`,
        roomId: room.id,
        openingId: opening.id,
        ink,
        // Typen bestemmer tegnet; en ukjent type får det nøytrale merket.
        kind: kind ?? 'unknown',
        start: opening.start,
        end: opening.end,
        // Døra sier selv hvor den er hengslet og hvilken vei den slår; sier den ingenting, tegnes den som før.
        swing: kind === 'door' ? doorSwing(opening.start, opening.end, center, opening) : null,
      }
    }),
  ),
)

/** Stiplingen på en åpen passasje, i planens tall. */
const dashes = computed(() => `${stroke(4)} ${stroke(4)}`)

/** Maska som skjærer åpningene ut av veggene: hvitt beholder, svart fjerner. */
const mask = computed(() => {
  if (!frame.value) {
    return null
  }

  const { bounds } = frame.value
  // I redigeringen kan en vegg dras langt utenfor rammen: maska dekker alt planen kan nå.
  const margin = editing.value ? 2000 : stroke(wallWidth.value * 2 + 8)

  return {
    x: bounds.minX - margin,
    y: bounds.minY - margin,
    width: bounds.maxX - bounds.minX + margin * 2,
    height: bounds.maxY - bounds.minY + margin * 2,
    // Litt bredere enn veggen, så ingenting står igjen når skanningen ikke ligger helt på linjen.
    cut: stroke(wallWidth.value + 3),
  }
})

interface WallLabel {
  key: string
  text: string
  x: number
  y: number
  transform: string
}

/**
 * Lengden på hver yttervegg, skrevet langs veggen på utsiden av rommet. En
 * vegg som deles med et annet rom får ikke mål her (utsiden er naborommet,
 * der målet ville stått oppå inventar, dører og romnavn), og heller ikke en
 * vegg som er tegnet for kort til at tallet får plass.
 */
const wallLabels = computed<WallLabel[]>(() => {
  const drawing = frame.value

  if (!drawing || props.compact) {
    return []
  }

  return rooms.value.flatMap(({ room, center }) => {
    const others = rooms.value.filter((other) => other.room.id !== room.id).map((other) => other.room.outline)

    return room.walls.flatMap((wall) => {
      const length = distance(wall.start, wall.end)
      const outward = normalToward(wall.start, wall.end, center, true)

      if (outward === null || length * drawing.scale < WALL_LABEL_MIN_LENGTH || isSharedWall(wall.start, wall.end, center, others)) {
        return []
      }

      const anchor = drawing.toPixels(midpoint(wall.start, wall.end))
      const x = round(anchor.x + outward.x * WALL_LABEL_OFFSET)
      const y = round(anchor.y + outward.y * WALL_LABEL_OFFSET)

      return [
        {
          key: `${room.id}:${wall.id}`,
          text: formatLength(length, props.locale),
          x,
          y,
          transform: `rotate(${round(readableAngle(wall.start, wall.end))} ${x} ${y})`,
        },
      ]
    })
  })
})

interface RoomLabel {
  key: string
  name: string
  area: string
  x: number
  y: number
  /** Gulvfargen personen har valgt, og blekket som leses på den; null gir temaets farger. */
  floorColor: string | null
  ink: string | null
}

/**
 * Navnet og gulvarealet midt i rommet — bare når rommet er tegnet stort nok
 * til at begge linjene får plass. Et navn som er bredere enn rommet, skrives
 * ikke; arealet står da alene.
 */
const roomLabels = computed<RoomLabel[]>(() => {
  const drawing = frame.value

  if (!drawing || props.compact) {
    return []
  }

  return rooms.value.flatMap(({ room, center, floorColor, ink }) => {
    if (center === null) {
      return []
    }

    const xs = room.outline.map((point) => point.x)
    const ys = room.outline.map((point) => point.y)
    const roomWidth = (Math.max(...xs) - Math.min(...xs)) * drawing.scale
    const roomHeight = (Math.max(...ys) - Math.min(...ys)) * drawing.scale

    if (roomWidth < ROOM_LABEL_MIN_WIDTH || roomHeight < ROOM_LABEL_MIN_HEIGHT) {
      return []
    }

    const area = formatArea(measured(room.measurements.floorArea), props.locale)
    const name = room.name.length * ROOM_LABEL_CHAR <= roomWidth ? room.name : ''

    if (name === '' && area === '') {
      return []
    }

    const point = drawing.toPixels(center)
    const lines = (name === '' ? 0 : 1) + (area === '' ? 0 : 1)

    return [{ key: room.id, name, area, x: round(point.x), y: round(point.y - ((lines - 1) * ROOM_LINE_HEIGHT) / 2), floorColor, ink }]
  })
})

/* ------------------------------------------------------------------ */
/* Marks: what a sketch has changed (SIGN-2014)                        */
/* ------------------------------------------------------------------ */

type Overlay = {
  id: string
  /** `ghost` (a base element), `mark` (a changed element), `attention` (a candidate) or `picked` (pointed at). */
  layer: 'ghost' | 'mark' | 'attention' | 'picked'
  key: string
  /** The change for ghosts and marks; the layer itself otherwise. */
  tone: string
  shape: FloorPlanGhost['shape']
}

/** Every element of the plan that is drawn, as the shape a mark on it takes. */
const elementShapes = computed(() => {
  const shapes = new Map<string, FloorPlanGhost['shape']>()

  if (props.marks === null) {
    return shapes
  }

  for (const room of props.plan.rooms) {
    shapes.set(sketchElementKey('room', room.id), { kind: 'outline', points: room.outline })

    for (const wall of room.walls) {
      shapes.set(sketchElementKey('wall', wall.id), { kind: 'line', of: 'wall', start: wall.start, end: wall.end })
    }

    for (const opening of room.openings) {
      shapes.set(sketchElementKey('opening', opening.id), { kind: 'line', of: 'opening', start: opening.start, end: opening.end })
    }

    for (const object of room.objects) {
      shapes.set(sketchElementKey('object', object.id), { kind: 'box', center: object.center, width: object.width, depth: object.depth, rotation: object.rotation })
    }
  }

  return shapes
})

const overlays = computed<Overlay[]>(() => {
  const marks = props.marks

  if (marks === null) {
    return []
  }

  const onPlan = (layer: Overlay['layer'], key: string, tone: string): Overlay[] => {
    const shape = elementShapes.value.get(key)

    return shape === undefined ? [] : [{ id: `${layer}:${key}`, layer, key, tone, shape }]
  }

  return [
    // Ghosts first, so what stands now is drawn on top of what stood there.
    ...marks.ghosts.map((ghost): Overlay => ({ id: `ghost:${ghost.key}`, layer: 'ghost', key: ghost.key, tone: ghost.change, shape: ghost.shape })),
    ...Object.entries(marks.elements).flatMap(([key, change]) => onPlan('mark', key, change)),
    ...(marks.picked ?? []).flatMap((key) => onPlan('picked', key, 'picked')),
    ...(marks.attention ?? []).flatMap((key) => onPlan('attention', key, 'attention')),
  ]
})

const overlayClasses = (overlay: Overlay): string[] => [
  `fp-${overlay.layer}`,
  `fp-${overlay.layer}--${overlay.tone}`,
  `fp-${overlay.layer}--${overlay.shape.kind === 'line' ? overlay.shape.of : overlay.shape.kind}`,
]

/** The element's key as a data attribute named after the layer (`data-mark="wall:…"`). */
const overlayData = (overlay: Overlay): Record<string, string> => ({ [`data-${overlay.layer}`]: overlay.key })

/** How wide the line of an overlay is, in the plan's numbers. */
const overlayLineWidth = (overlay: Overlay): number => {
  const onWall = overlay.shape.kind === 'line' && overlay.shape.of === 'wall'

  if (overlay.layer === 'attention' || overlay.layer === 'picked') {
    return stroke(overlay.shape.kind === 'line' ? wallWidth.value + 4 : 2)
  }

  // A mark is a thin contour around the element, whatever the element is.
  if (overlay.layer === 'mark') {
    return stroke(props.compact ? 1 : 1.75)
  }

  if (overlay.shape.kind !== 'line') {
    return stroke(1.5)
  }

  return stroke(onWall ? wallWidth.value : Math.max(thinWidth.value * 2.4, 2))
}

/**
 * New is a full line, moved a dashed one, changed a dotted one, and removed
 * a dashed ghost: the pattern says it too, not only the colour.
 */
const overlayDashes = (overlay: Overlay): string | undefined => {
  if (overlay.layer === 'ghost') {
    return overlay.tone === 'removed' ? dashes.value : `${stroke(2)} ${stroke(3)}`
  }

  if (overlay.layer !== 'mark' || overlay.tone === 'added') {
    return undefined
  }

  return overlay.tone === 'moved' ? `${stroke(5)} ${stroke(2.5)}` : `${stroke(1.5)} ${stroke(2.5)}`
}

/** How far outside a wall or an opening its contour stands, in pixels. */
const CONTOUR_GAP = 3.5

/**
 * The contour around a wall or an opening: a narrow frame along it, a little
 * outside it on every side, so the element itself — its colour, its door —
 * is seen as it is.
 */
const overlayContour = (
  shape: Extract<FloorPlanGhost['shape'], { kind: 'line' }>,
): { x: number; y: number; width: number; height: number; rx: number; transform: string } => {
  const length = distance(shape.start, shape.end)
  const middle = midpoint(shape.start, shape.end)
  const gap = stroke(props.compact ? 1.5 : CONTOUR_GAP)
  const thickness = stroke(wallWidth.value)
  const degrees = round((Math.atan2(shape.end.y - shape.start.y, shape.end.x - shape.start.x) * 180) / Math.PI, 3)

  return {
    x: middle.x - length / 2 - gap,
    y: middle.y - thickness / 2 - gap,
    width: length + gap * 2,
    height: thickness + gap * 2,
    rx: gap,
    transform: `rotate(${degrees} ${middle.x} ${middle.y})`,
  }
}

const overlayPoints = (shape: Extract<FloorPlanGhost['shape'], { kind: 'outline' }>): string => shape.points.map((corner) => `${corner.x},${corner.y}`).join(' ')

const overlayBox = (shape: Extract<FloorPlanGhost['shape'], { kind: 'box' }>): { x: number; y: number; width: number; height: number; transform: string } => ({
  x: shape.center.x - shape.width / 2,
  y: shape.center.y - shape.depth / 2,
  width: shape.width,
  height: shape.depth,
  transform: `rotate(${round((shape.rotation * 180) / Math.PI, 3)} ${shape.center.x} ${shape.center.y})`,
})

/* ------------------------------------------------------------------ */
/* Redigeringen: valg, drag og tastatur                                */
/* ------------------------------------------------------------------ */

const selectedRoom = computed(() => (live.value && props.selection ? (rooms.value.find((entry) => entry.room.id === props.selection?.roomId) ?? null) : null))

/** Det valgte, slik det tegnes oppå planen. */
const highlight = computed(() => {
  const selection = props.selection
  const entry = selectedRoom.value

  if (!live.value || !selection || entry === null) {
    return null
  }

  switch (selection.kind) {
    case 'room':
      return { kind: 'room' as const, points: entry.points }
    case 'wall': {
      const wall = entry.room.walls.find((candidate) => candidate.id === selection.wallId)

      return wall === undefined ? null : { kind: 'line' as const, target: 'wall', start: wall.start, end: wall.end }
    }
    case 'opening': {
      const opening = entry.room.openings.find((candidate) => candidate.id === selection.openingId)

      return opening === undefined ? null : { kind: 'line' as const, target: 'opening', start: opening.start, end: opening.end }
    }
    case 'object': {
      const object = objects.value.find((candidate) => candidate.roomId === selection.roomId && candidate.id === selection.objectId)

      return object === undefined ? null : { kind: 'object' as const, object }
    }
    case 'corner':
      return null
  }
})

/** «A» ved starten og «B» ved slutten av den valgte veggen, like utenfor veggen, i piksler. */
const END_BADGE_OFFSET = 16

const wallEnds = computed(() => {
  const selection = props.selection
  const entry = selectedRoom.value
  const drawing = frame.value

  if (!drawing || !selection || selection.kind !== 'wall' || entry === null) {
    return []
  }

  const wall = entry.room.walls.find((candidate) => candidate.id === selection.wallId)
  const outward = wall === undefined ? null : normalToward(wall.start, wall.end, entry.center, true)

  if (wall === undefined || outward === null) {
    return []
  }

  return [
    { letter: 'A', at: wall.start },
    { letter: 'B', at: wall.end },
  ].map(({ letter, at }) => {
    const pixel = drawing.toPixels(at)

    return { letter, x: round(pixel.x + outward.x * END_BADGE_OFFSET), y: round(pixel.y + outward.y * END_BADGE_OFFSET) }
  })
})

/* ------------------------------------------------------------------ */
/* Delemodus: to steder på omrisset blir en skillelinje               */
/* ------------------------------------------------------------------ */

const splitRoom = computed(() => (editing.value && props.split ? (props.plan.rooms.find((room) => room.id === props.split?.roomId) ?? null) : null))

/** Stedet på omrisset pekeren står nærmest, mens den beveger seg over tegningen. */
const splitHover = ref<FloorPlanPoint | null>(null)

const splitGuide = computed(() => {
  const room = splitRoom.value

  if (room === null) {
    return null
  }

  return {
    points: room.outline.map((point) => `${point.x},${point.y}`).join(' '),
    from: props.split?.from ?? null,
    hover: splitHover.value,
  }
})

/** Håndtakene: ett i hvert hjørne av hvert rom. Det valgte er fylt. */
const corners = computed(() =>
  editing.value
    ? props.plan.rooms.flatMap((room) =>
        room.outline.map((point, index) => ({
          key: `${room.id}:${index}`,
          roomId: room.id,
          index,
          x: point.x,
          y: point.y,
          selected: props.selection?.kind === 'corner' && props.selection.roomId === room.id && props.selection.index === index,
        })),
      )
    : [],
)

/** Hvor i planen pekeren står, i meter. */
const pointerPoint = (event: PointerEvent): FloorPlanPoint | null => {
  const drawing = frame.value
  const element = svgElement.value

  if (!drawing || !element) {
    return null
  }

  const box = element.getBoundingClientRect()
  // Tegningen kan være krympet av CSS: regn om fra skjermens piksler til tegningens.
  const scaleX = box.width > 0 ? drawing.width / box.width : 1
  const scaleY = box.height > 0 ? drawing.height / box.height : 1

  return drawing.toPlan({ x: (event.clientX - box.left) * scaleX, y: (event.clientY - box.top) * scaleY })
}

/** Punktet som følger pekeren når noe dras: hjørnet selv, inventarets midte, åpningens midtpunkt. */
const anchorOf = (selection: FloorPlanSelection): FloorPlanPoint | null => {
  const room = props.plan.rooms.find((candidate) => candidate.id === selection.roomId)

  if (room === undefined) {
    return null
  }

  if (selection.kind === 'corner') {
    return room.outline[selection.index] ?? null
  }

  if (selection.kind === 'object') {
    return room.objects.find((candidate) => candidate.id === selection.objectId)?.center ?? null
  }

  if (selection.kind === 'opening') {
    const opening = room.openings.find((candidate) => candidate.id === selection.openingId)

    return opening === undefined ? null : midpoint(opening.start, opening.end)
  }

  return null
}

interface Drag {
  pointerId: number
  selection: FloorPlanSelection
  /** Der ankerpunktet sto og der pekeren sto da draget begynte. */
  anchor: FloorPlanPoint
  from: FloorPlanPoint
  moved: boolean
}

let drag: Drag | null = null

const onPointerDown = (event: PointerEvent): void => {
  if (!live.value || event.button > 0) {
    return
  }

  const drawing = frame.value
  const point = pointerPoint(event)

  if (!drawing || point === null) {
    return
  }

  // Delemodus: trykket velger et sted for skillelinja, ingenting annet.
  if (splitRoom.value !== null) {
    svgElement.value?.focus({ preventScroll: true })
    splitHover.value = outlineSpot(splitRoom.value, point)?.point ?? null
    emit('splitPick', point)

    return
  }

  const tolerance = (event.pointerType === 'touch' ? HIT_TOLERANCE_TOUCH : HIT_TOLERANCE) / drawing.scale
  // Where the drawing only picks, a corner is not something to pick — and nothing is dragged.
  const hit = hitTest(props.plan, point, tolerance, props.selection?.roomId ?? null, editing.value)

  svgElement.value?.focus({ preventScroll: true })
  emit('select', hit)

  const anchor = hit === null || !editing.value ? null : anchorOf(hit)

  if (hit === null || anchor === null) {
    return
  }

  drag = { pointerId: event.pointerId, selection: hit, anchor: { x: anchor.x, y: anchor.y }, from: point, moved: false }
  dragFrame.value = drawing
  svgElement.value?.setPointerCapture?.(event.pointerId)
}

const onPointerMove = (event: PointerEvent): void => {
  const drawing = frame.value

  if (splitRoom.value !== null) {
    const hovered = pointerPoint(event)

    splitHover.value = hovered === null ? null : (outlineSpot(splitRoom.value, hovered)?.point ?? null)

    return
  }

  if (drag === null || event.pointerId !== drag.pointerId || !drawing) {
    return
  }

  const point = pointerPoint(event)

  if (point === null) {
    return
  }

  const dx = point.x - drag.from.x
  const dy = point.y - drag.from.y

  // Et trykk med en skjelven hånd er ikke et drag.
  if (!drag.moved && Math.hypot(dx, dy) * drawing.scale < DRAG_THRESHOLD) {
    return
  }

  drag.moved = true
  event.preventDefault()
  emit('drag', { selection: drag.selection, to: { x: drag.anchor.x + dx, y: drag.anchor.y + dy } })
}

const onPointerUp = (event: PointerEvent): void => {
  if (drag === null || event.pointerId !== drag.pointerId) {
    return
  }

  const finished = drag
  drag = null
  dragFrame.value = null
  svgElement.value?.releasePointerCapture?.(event.pointerId)

  if (finished.moved) {
    emit('dragEnd', finished.selection)
  }
}

// Bare arbeidsflaten lytter: som bilde har tegningen verken peker- eller tastaturhendelser.
const listeners = computed(() =>
  live.value
    ? { keydown: onKeydown, pointerdown: onPointerDown, pointermove: onPointerMove, pointerup: onPointerUp, pointercancel: onPointerUp }
    : {},
)

const ARROWS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -NUDGE_STEP, dy: 0 },
  ArrowRight: { dx: NUDGE_STEP, dy: 0 },
  ArrowUp: { dx: 0, dy: -NUDGE_STEP },
  ArrowDown: { dx: 0, dy: NUDGE_STEP },
}

// Tastaturet i tegningen: piltastene flytter det valgte hjørnet eller
// inventaret én centimeter, Delete fjerner den valgte åpningen eller det
// valgte inventaret, Esc slipper valget, og Cmd/Ctrl+Z angrer (med Shift,
// eller Cmd/Ctrl+Y: gjør om) — snarveiene fra «Se tilbud» (SIGN-1957).
const onKeydown = (event: KeyboardEvent): void => {
  if (!live.value || event.altKey) {
    return
  }

  const selection = props.selection
  const handled = (): void => {
    event.preventDefault()
    event.stopPropagation()
  }

  // Where the drawing only picks, Esc lets go of what is picked; no key changes anything.
  if (!editing.value) {
    if (event.key === 'Escape' && !event.metaKey && !event.ctrlKey) {
      handled()
      emit('select', null)
    }

    return
  }

  if (event.metaKey || event.ctrlKey) {
    const key = event.key.toLowerCase()

    if (key === 'z' || key === 'y') {
      handled()

      if (key === 'y' || event.shiftKey) {
        emit('redo')
      } else {
        emit('undo')
      }
    }

    return
  }

  if (event.key === 'Escape' && props.split) {
    handled()
    emit('splitCancel')

    return
  }

  if (event.key === 'Escape' && selection) {
    handled()
    emit('select', null)

    return
  }

  if (!selection) {
    return
  }

  const arrow = ARROWS[event.key]

  if (arrow !== undefined && (selection.kind === 'corner' || selection.kind === 'object')) {
    handled()
    emit('nudge', { selection, ...arrow })

    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && (selection.kind === 'opening' || selection.kind === 'object')) {
    handled()
    emit('remove', selection)
  }
}
</script>

<template>
  <div ref="host" class="floor-plan" :class="{ 'floor-plan--compact': compact }">
    <!-- I redigeringen er tegningen en arbeidsflate med eget tastatur, ikke et bilde. -->
    <svg
      v-if="frame && mask"
      ref="svgElement"
      :aria-label="label"
      class="floor-plan__svg"
      :class="{ 'floor-plan__svg--interactive': live, 'floor-plan__svg--picking': live && !editing, 'floor-plan__svg--splitting': splitGuide !== null }"
      :height="frame.height"
      :role="live ? 'application' : 'img'"
      :tabindex="live ? 0 : undefined"
      :viewBox="frame.viewBox"
      :width="frame.width"
      v-on="listeners"
    >
      <g class="fp-plan" :transform="frame.transform">
        <polygon
          v-for="entry in rooms"
          :key="entry.room.id"
          class="fp-floor"
          :data-room-id="entry.room.id"
          :points="entry.points"
          :style="entry.floorColor ? { fill: entry.floorColor } : undefined"
        />

        <!-- Inventar: typens symbol i inventarets egen ramme. På en valgt gulvfarge tegnes det i blekket som leses på den. -->
        <g
          v-for="object in objects"
          :key="object.key"
          class="fp-object"
          :class="{ 'fp-object--painted': object.ink }"
          :data-category="object.category"
          :data-object-id="object.id"
          :style="object.ink ? { color: object.ink } : undefined"
          :transform="object.frame"
        >
          <title v-if="!compact">{{ object.name }}</title>
          <template v-for="(shape, index) in object.shapes" :key="index">
            <rect
              v-if="shape.kind === 'rect'"
              class="fp-object__shape"
              :class="[`fp-object__shape--${shape.fill}`, `fp-object__shape--${shape.stroke}`]"
              :height="shape.height"
              :rx="shape.radius"
              :stroke-dasharray="shape.stroke === 'dashed' ? dashes : undefined"
              :stroke-width="stroke(thinWidth)"
              :width="shape.width"
              :x="shape.x"
              :y="shape.y"
            />
            <ellipse
              v-else-if="shape.kind === 'ellipse'"
              class="fp-object__shape"
              :class="[`fp-object__shape--${shape.fill}`, `fp-object__shape--${shape.stroke}`]"
              :cx="shape.cx"
              :cy="shape.cy"
              :rx="shape.rx"
              :ry="shape.ry"
              :stroke-width="stroke(thinWidth)"
            />
            <path
              v-else
              class="fp-object__shape"
              :class="[`fp-object__shape--${shape.fill}`, `fp-object__shape--${shape.stroke}`]"
              :d="pathData(shape)"
              :stroke-width="stroke(thinWidth)"
            />
          </template>
        </g>

        <mask :id="maskId" :height="mask.height" maskUnits="userSpaceOnUse" :width="mask.width" :x="mask.x" :y="mask.y">
          <rect class="fp-mask-keep" :height="mask.height" :width="mask.width" :x="mask.x" :y="mask.y" />
          <line
            v-for="opening in openings"
            :key="opening.id"
            class="fp-mask-cut"
            :stroke-width="mask.cut"
            :x1="opening.start.x"
            :x2="opening.end.x"
            :y1="opening.start.y"
            :y2="opening.end.y"
          />
        </mask>

        <g class="fp-walls" :mask="`url(#${maskId})`">
          <!-- En farget vegg får en tynn kant i blekk under seg, så den synes også når fargen er kortets egen. -->
          <line
            v-for="wall in paintedWalls"
            :key="`casing:${wall.roomId}:${wall.id}`"
            class="fp-wall-casing"
            :stroke-width="stroke(wallWidth + 2)"
            :x1="wall.start.x"
            :x2="wall.end.x"
            :y1="wall.start.y"
            :y2="wall.end.y"
          />
          <line
            v-for="wall in walls"
            :key="`${wall.roomId}:${wall.id}`"
            class="fp-wall"
            :data-wall-id="wall.id"
            :stroke-width="stroke(wallWidth)"
            :style="wall.paint ? { stroke: wall.paint } : undefined"
            :x1="wall.start.x"
            :x2="wall.end.x"
            :y1="wall.start.y"
            :y2="wall.end.y"
          />
        </g>

        <template v-for="opening in openings" :key="opening.id">
          <!-- Dør: bladet og buen det slår. -->
          <g
            v-if="opening.kind === 'door'"
            class="fp-opening fp-opening--door"
            data-kind="door"
            :data-opening-id="opening.openingId"
            :stroke-width="stroke(thinWidth)"
            :style="opening.ink ? { stroke: opening.ink, strokeOpacity: 0.7 } : undefined"
          >
            <template v-if="opening.swing">
              <line
                class="fp-door-leaf"
                :x1="opening.swing.leaf.from.x"
                :x2="opening.swing.leaf.to.x"
                :y1="opening.swing.leaf.from.y"
                :y2="opening.swing.leaf.to.y"
              />
              <path class="fp-door-swing" :d="opening.swing.arc" />
            </template>
          </g>
          <!-- Vindu: tynn farget strek i åpningen. Passasje: stiplet. Ukjent type: nøytral strek. -->
          <line
            v-else
            class="fp-opening"
            :class="`fp-opening--${opening.kind}`"
            :data-kind="opening.kind"
            :data-opening-id="opening.openingId"
            :stroke-dasharray="opening.kind === 'opening' ? dashes : undefined"
            :stroke-width="stroke(opening.kind === 'window' ? thinWidth * 1.6 : thinWidth)"
            :x1="opening.start.x"
            :x2="opening.end.x"
            :y1="opening.start.y"
            :y2="opening.end.y"
          />
        </template>

        <!-- What a sketch has changed (SIGN-2014): ghosts of what stood there, marks on what is new or different,
             and outlines on what the person has pointed at or is asked to choose between. -->
        <g v-if="overlays.length > 0" class="fp-marks">
          <template v-for="overlay in overlays" :key="overlay.id">
            <polygon
              v-if="overlay.shape.kind === 'outline'"
              v-bind="overlayData(overlay)"
              :class="overlayClasses(overlay)"
              :points="overlayPoints(overlay.shape)"
              :stroke-dasharray="overlayDashes(overlay)"
              :stroke-width="overlayLineWidth(overlay)"
            />
            <!-- A wall or an opening that is new, moved or changed: a contour around it, so its own colour shows. -->
            <rect
              v-else-if="overlay.shape.kind === 'line' && overlay.layer === 'mark'"
              v-bind="{ ...overlayData(overlay), ...overlayContour(overlay.shape) }"
              :class="overlayClasses(overlay)"
              :stroke-dasharray="overlayDashes(overlay)"
              :stroke-width="overlayLineWidth(overlay)"
            />
            <line
              v-else-if="overlay.shape.kind === 'line'"
              v-bind="overlayData(overlay)"
              :class="overlayClasses(overlay)"
              :stroke-dasharray="overlayDashes(overlay)"
              :stroke-width="overlayLineWidth(overlay)"
              :x1="overlay.shape.start.x"
              :x2="overlay.shape.end.x"
              :y1="overlay.shape.start.y"
              :y2="overlay.shape.end.y"
            />
            <rect
              v-else
              v-bind="{ ...overlayData(overlay), ...overlayBox(overlay.shape) }"
              :class="overlayClasses(overlay)"
              :stroke-dasharray="overlayDashes(overlay)"
              :stroke-width="overlayLineWidth(overlay)"
            />
          </template>
        </g>

        <!-- Redigeringen: det valgte er markert, og hvert hjørne har et håndtak. -->
        <template v-if="live">
          <polygon v-if="highlight?.kind === 'room'" class="fp-selected fp-selected--room" :points="highlight.points" :stroke-width="stroke(2)" />
          <line
            v-else-if="highlight?.kind === 'line'"
            class="fp-selected"
            :class="`fp-selected--${highlight.target}`"
            :stroke-width="stroke(wallWidth + 4)"
            :x1="highlight.start.x"
            :x2="highlight.end.x"
            :y1="highlight.start.y"
            :y2="highlight.end.y"
          />
          <rect
            v-else-if="highlight?.kind === 'object'"
            class="fp-selected fp-selected--object"
            :height="highlight.object.height"
            :rx="highlight.object.radius"
            :stroke-width="stroke(2)"
            :transform="highlight.object.transform"
            :width="highlight.object.width"
            :x="highlight.object.x"
            :y="highlight.object.y"
          />

          <circle
            v-for="corner in corners"
            :key="corner.key"
            class="fp-corner"
            :class="{ 'fp-corner--selected': corner.selected }"
            :cx="corner.x"
            :cy="corner.y"
            :data-corner="corner.key"
            :r="stroke(corner.selected ? CORNER_RADIUS + 2 : CORNER_RADIUS)"
            :stroke-width="stroke(1.5)"
          />

          <!-- Delemodus: rommet som deles, stedet linja starter, og linja til der pekeren står. -->
          <g v-if="splitGuide" class="fp-split" data-testid="floor-plan-split">
            <polygon class="fp-split-room" :points="splitGuide.points" :stroke-width="stroke(2.5)" />
            <line
              v-if="splitGuide.from && splitGuide.hover"
              class="fp-split-line"
              :stroke-dasharray="dashes"
              :stroke-width="stroke(2)"
              :x1="splitGuide.from.x"
              :x2="splitGuide.hover.x"
              :y1="splitGuide.from.y"
              :y2="splitGuide.hover.y"
            />
            <circle v-if="splitGuide.hover" class="fp-split-spot" :cx="splitGuide.hover.x" :cy="splitGuide.hover.y" :r="stroke(5)" :stroke-width="stroke(2)" />
            <circle
              v-if="splitGuide.from"
              class="fp-split-spot fp-split-spot--set"
              :cx="splitGuide.from.x"
              :cy="splitGuide.from.y"
              data-testid="floor-plan-split-from"
              :r="stroke(5)"
              :stroke-width="stroke(2)"
            />
          </g>
        </template>
      </g>

      <!-- Den valgte veggens ender: A er starten, B er slutten — de samme bokstavene som i feltene. -->
      <g v-for="end in wallEnds" :key="end.letter" class="fp-wall-end" :data-wall-end="end.letter">
        <circle :cx="end.x" :cy="end.y" r="8" />
        <text dominant-baseline="central" text-anchor="middle" :x="end.x" :y="end.y">{{ end.letter }}</text>
      </g>

      <template v-if="!compact">
        <text
          v-for="wallLabel in wallLabels"
          :key="wallLabel.key"
          class="fp-wall-label"
          dominant-baseline="central"
          text-anchor="middle"
          :transform="wallLabel.transform"
          :x="wallLabel.x"
          :y="wallLabel.y"
        >{{ wallLabel.text }}</text>

        <!-- På en gulvfarge personen har valgt, får navnet blekket som leses på den, med kant i gulvets farge. -->
        <text
          v-for="roomLabel in roomLabels"
          :key="roomLabel.key"
          class="fp-room-label"
          :class="{ 'fp-room-label--painted': roomLabel.floorColor }"
          dominant-baseline="central"
          :style="roomLabel.floorColor && roomLabel.ink ? { fill: roomLabel.ink, stroke: roomLabel.floorColor } : undefined"
          text-anchor="middle"
          :x="roomLabel.x"
          :y="roomLabel.y"
        >
          <tspan v-if="roomLabel.name" class="fp-room-name" :x="roomLabel.x">{{ roomLabel.name }}</tspan>
          <tspan v-if="roomLabel.area" class="fp-room-area" :dy="roomLabel.name ? ROOM_LINE_HEIGHT : 0" :x="roomLabel.x">{{ roomLabel.area }}</tspan>
        </text>
      </template>
    </svg>
  </div>
</template>

<style scoped>
/* Fargene er temaets roller, så tegningen leses i lys og mørk modus:
   gulvet er kortflaten med et dryss blekk (synlig mot kortet i begge
   moduser), inventaret kortflaten selv, veggene blekket, vinduet
   handlingsfargen (som linjen i diagrammene), resten dempet blekk.
   Skriften er fast i piksler — den følger ikke målestokken. */
.floor-plan {
  display: flex;
  justify-content: center;
  min-width: 0;
  width: 100%;
}

.floor-plan__svg {
  --fp-floor: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, rgb(var(--v-theme-surface)));

  display: block;
  height: auto;
  max-width: 100%;
}

.fp-floor {
  fill: var(--fp-floor);
  stroke: none;
}

/* Inventaret: symbolet tegnes i blekket (`color`), som er temaets — eller,
   på en gulvfarge personen har valgt, det som leses på den. Kroppen er
   kortflaten selv, de myke delene (puter, rygg, skål) et dryss blekk, og
   omrisset er tydeligere enn detaljene. */
.fp-object {
  color: rgb(var(--v-theme-on-surface));
}

.fp-object__shape {
  fill: none;
  stroke: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fp-object__shape--body {
  fill: rgb(var(--v-theme-surface));
}

.fp-object__shape--soft {
  fill: color-mix(in srgb, currentColor 13%, rgb(var(--v-theme-surface)));
}

.fp-object--painted .fp-object__shape--body {
  fill: currentColor;
  fill-opacity: 0.14;
}

.fp-object--painted .fp-object__shape--soft {
  fill: currentColor;
  fill-opacity: 0.28;
}

.fp-object__shape--outline {
  stroke: currentColor;
  stroke-opacity: 0.58;
}

/* A column is solid — it carries the ceiling — and a beam is a dashed outline: it hangs above the floor (SIGN-2014). */
.fp-object__shape--solid {
  fill: currentColor;
  fill-opacity: 0.78;
}

.fp-object__shape--dashed {
  stroke: currentColor;
  stroke-linecap: butt;
  stroke-opacity: 0.7;
}

.fp-object__shape--detail {
  stroke: currentColor;
  stroke-opacity: 0.36;
}

/* Maska er ikke farge, men lysstyrke: hvitt beholder veggen, svart skjærer den bort. */
.fp-mask-keep {
  fill: white;
}

.fp-mask-cut {
  stroke: black;
  stroke-linecap: butt;
}

.fp-wall {
  stroke: rgb(var(--v-theme-on-surface));
  stroke-linecap: round;
}

.fp-wall-casing {
  stroke: rgba(var(--v-theme-on-surface), 0.55);
  stroke-linecap: round;
}

.fp-opening {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.62);
  stroke-linecap: butt;
}

.fp-opening--window {
  stroke: rgb(var(--v-theme-primary));
}

.fp-wall-label {
  fill: var(--nk-text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* Navnet står på gulvet, der det også kan gå et dørslag: en kant i gulvets
   farge holder det lesbart oppå streken. */
.fp-room-label {
  fill: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  paint-order: stroke fill;
  stroke: var(--fp-floor);
  stroke-linejoin: round;
  stroke-width: 4px;
}

.fp-room-name {
  font-weight: 700;
}

.fp-room-area {
  fill: var(--nk-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* På en valgt gulvfarge arver arealet navnets blekk, litt dempet. */
.fp-room-label--painted .fp-room-area {
  fill: inherit;
  fill-opacity: 0.8;
}

/* What a sketch has changed (SIGN-2014). The tones are the theme's roles:
   new is the success tone, moved and changed the action colour, removed the
   error tone at low strength. The line pattern says the same as the colour,
   and a mark is a contour around the element — never paint on it — so a wall
   that got a new colour shows that colour. */
.fp-marks {
  pointer-events: none;
}

.fp-ghost,
.fp-mark,
.fp-attention,
.fp-picked {
  fill: none;
  stroke-linecap: butt;
  stroke-linejoin: round;
}

.fp-ghost--removed {
  stroke: rgb(var(--v-theme-error));
  stroke-opacity: 0.6;
}

.fp-ghost--removed.fp-ghost--box,
.fp-ghost--removed.fp-ghost--outline {
  fill: rgba(var(--v-theme-error), 0.07);
}

.fp-ghost--moved {
  stroke: rgba(var(--v-theme-on-surface), 0.34);
}

.fp-mark--added {
  stroke: rgb(var(--v-theme-success));
}

.fp-mark--added.fp-mark--box,
.fp-mark--added.fp-mark--outline {
  fill: rgba(var(--v-theme-success), 0.16);
}

.fp-mark--moved,
.fp-mark--changed {
  stroke: rgb(var(--v-theme-primary));
}

/* Dots, not short dashes. */
.fp-mark--changed {
  stroke-linecap: round;
}

.fp-picked {
  stroke: rgb(var(--v-theme-primary));
  stroke-linecap: round;
  stroke-opacity: 0.55;
}

.fp-picked--box,
.fp-picked--outline {
  fill: rgba(var(--v-theme-primary), 0.1);
  stroke-opacity: 1;
}

/* The candidates of a question pulse until the person has chosen. */
.fp-attention {
  animation: fp-attention 1.4s ease-in-out infinite;
  stroke: rgb(var(--v-theme-primary));
  stroke-linecap: round;
}

.fp-attention--box,
.fp-attention--outline {
  fill: rgba(var(--v-theme-primary), 0.12);
}

@keyframes fp-attention {
  0%,
  100% {
    stroke-opacity: 0.85;
  }

  50% {
    stroke-opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fp-attention {
    animation: none;
    stroke-opacity: 0.7;
  }
}

/* Where the drawing only picks, the pointer says that something can be pointed at. */
.floor-plan__svg--picking {
  cursor: pointer;
  touch-action: manipulation;
}

/* Redigeringen: tegningen tar imot pekeren selv (ingen rulling under et
   drag), det valgte er markert i handlingsfargen, og teksten slipper
   trykkene gjennom til det som ligger under. */
.floor-plan__svg--interactive {
  cursor: default;
  overflow: visible;
  touch-action: none;
  user-select: none;
}

.floor-plan__svg--interactive:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}

.floor-plan__svg--interactive text {
  pointer-events: none;
}

.fp-selected {
  fill: none;
  pointer-events: none;
  stroke: rgb(var(--v-theme-primary));
  stroke-linecap: round;
}

.fp-selected--room {
  fill: rgba(var(--v-theme-primary), 0.1);
  stroke-linejoin: round;
}

.fp-selected--wall,
.fp-selected--opening {
  stroke-opacity: 0.55;
}

.fp-corner {
  cursor: grab;
  fill: rgb(var(--v-theme-surface));
  stroke: rgb(var(--v-theme-primary));
}

.fp-corner--selected {
  fill: rgb(var(--v-theme-primary));
}

/* A og B på den valgte veggen: små merker i handlingsfargen, med etiketten som leses på den. */
.fp-wall-end {
  pointer-events: none;
}

.fp-wall-end circle {
  fill: rgb(var(--v-theme-primary));
}

.fp-wall-end text {
  fill: rgb(var(--v-theme-on-primary));
  font-size: 10px;
  font-weight: 700;
}

/* Delemodus: pekeren velger et sted, og ingenting kan dras. */
.floor-plan__svg--splitting {
  cursor: crosshair;
}

.floor-plan__svg--splitting .fp-corner {
  cursor: crosshair;
}

.fp-split {
  pointer-events: none;
}

.fp-split-room {
  fill: rgba(var(--v-theme-primary), 0.08);
  stroke: rgb(var(--v-theme-primary));
  stroke-linejoin: round;
}

.fp-split-line {
  stroke: rgb(var(--v-theme-primary));
  stroke-linecap: round;
}

.fp-split-spot {
  fill: rgb(var(--v-theme-surface));
  stroke: rgb(var(--v-theme-primary));
}

.fp-split-spot--set {
  fill: rgb(var(--v-theme-primary));
}
</style>
