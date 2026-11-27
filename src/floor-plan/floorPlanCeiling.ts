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
export const CEILING_WALL_TOLERANCE = 0.15

const EPSILON = 1e-7

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const along = (start: CeilingPoint, end: CeilingPoint, share: number): CeilingPoint => ({
  x: start.x + (end.x - start.x) * share,
  y: start.y + (end.y - start.y) * share,
})

const segmentHit = (point: CeilingPoint, start: CeilingPoint, end: CeilingPoint): { distance: number; share: number } => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return { distance: Math.hypot(point.x - start.x, point.y - start.y), share: 0 }
  }

  const share = clamp01(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)

  return { distance: Math.hypot(point.x - (start.x + dx * share), point.y - (start.y + dy * share)), share }
}

const median = (values: number[]): number | null => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Veggens overkant når den ikke er vannrett; null for alt annet — ingen
 * overkant, færre enn to punkter, et punkt som ikke er tall, eller alle
 * punktene i samme høyde (da er veggen et rektangel, og `height` sier det).
 */
export const slopedProfile = (wall: Pick<CeilingWall, 'profile'>): readonly WallProfilePoint[] | null => {
  const profile = wall.profile

  if (profile === null || profile === undefined || profile.length < 2) {
    return null
  }

  if (!profile.every((point) => Number.isFinite(point.at) && Number.isFinite(point.height))) {
    return null
  }

  const heights = profile.map((point) => point.height)

  return Math.min(...heights) === Math.max(...heights) ? null : profile
}

export const isSlopedRoom = (room: Pick<CeilingRoom, 'walls'>): boolean => room.walls.some((wall) => slopedProfile(wall) !== null)

/** Høyden på veggens overkant `share` av veien fra start (0) til slutt (1); null for en vannrett vegg uten høyde. */
export const profileHeight = (wall: Pick<CeilingWall, 'height' | 'profile'>, share: number): number | null => {
  const profile = slopedProfile(wall)

  if (profile === null) {
    return (wall.height ?? 0) > 0 ? (wall.height as number) : null
  }

  const at = clamp01(share)

  for (let index = 0; index + 1 < profile.length; index += 1) {
    const from = profile[index]
    const to = profile[index + 1]

    if (at <= to.at || index + 2 === profile.length) {
      const span = to.at - from.at

      return span <= 0 ? to.height : from.height + (to.height - from.height) * ((at - from.at) / span)
    }
  }

  return profile[0].height
}

/** Veggens gjennomsnittshøyde langs lengden (flaten under overkanten delt på lengden); null uten høyde. */
export const meanWallHeight = (wall: Pick<CeilingWall, 'height' | 'profile'>): number | null => {
  const profile = slopedProfile(wall)

  if (profile === null) {
    return (wall.height ?? 0) > 0 ? (wall.height as number) : null
  }

  let mean = 0

  for (let index = 0; index + 1 < profile.length; index += 1) {
    mean += ((profile[index + 1].at - profile[index].at) * (profile[index].height + profile[index + 1].height)) / 2
  }

  return mean
}

/** Det laveste og det høyeste punktet på veggenes overkanter; null uten en eneste høyde. */
export const wallHeightRange = (walls: readonly Pick<CeilingWall, 'height' | 'profile'>[]): { min: number; max: number } | null => {
  const heights: number[] = []

  for (const wall of walls) {
    const profile = slopedProfile(wall)

    if (profile !== null) {
      heights.push(...profile.map((point) => point.height))
    } else if ((wall.height ?? 0) > 0) {
      heights.push(wall.height as number)
    }
  }

  return heights.length === 0 ? null : { min: Math.min(...heights), max: Math.max(...heights) }
}

/** Rommets vannrette høyde: medianen av de vannrette veggenes høyder, eller av de skrå veggenes høyeste punkt. */
export const levelHeight = (walls: readonly Pick<CeilingWall, 'height' | 'profile'>[]): number | null => {
  const level: number[] = []
  const sloped: number[] = []

  for (const wall of walls) {
    const profile = slopedProfile(wall)

    if (profile !== null) {
      sloped.push(Math.max(...profile.map((point) => point.height)))
    } else if ((wall.height ?? 0) > 0) {
      level.push(wall.height as number)
    }
  }

  return median(level.length > 0 ? level : sloped)
}

const spanAxis = (walls: readonly CeilingWall[]): [number, number] | null => {
  let sumX = 0
  let sumY = 0
  let total = 0
  let longest: [number, number] | null = null
  let longestLength = 0

  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const length = Math.hypot(dx, dy)

    if (slopedProfile(wall) === null || length <= EPSILON) {
      continue
    }

    sumX += (dx * dx - dy * dy) / length
    sumY += (2 * dx * dy) / length
    total += length

    if (length > longestLength) {
      longestLength = length
      longest = [dx / length, dy / length]
    }
  }

  if (longest === null) {
    return null
  }

  if (Math.hypot(sumX, sumY) <= 1e-6 * total) {
    return longest
  }

  const angle = Math.atan2(sumY, sumX) / 2

  return [Math.cos(angle), Math.sin(angle)]
}

interface CeilingModel {
  outline: readonly CeilingPoint[]
  walls: readonly CeilingWall[]
  /** Langs spennretningen (u) og langs mønet (t). */
  u: (point: CeilingPoint) => number
  t: (point: CeilingPoint) => number
  outlineU: number[]
  /** For hver kant i omrisset (nummeret til det første punktet): veggene som bærer den. */
  carried: Map<number, number[]>
  level: number | null
  /** Stripegrensene, sortert. */
  events: number[]
}

const ceilingModel = (room: CeilingRoom): CeilingModel | null => {
  const { outline, walls } = room
  const axis = spanAxis(walls)

  if (outline.length < 3 || axis === null) {
    return null
  }

  const [ux, uy] = axis
  const u = (point: CeilingPoint): number => point.x * ux + point.y * uy
  const t = (point: CeilingPoint): number => point.y * ux - point.x * uy
  const carried = new Map<number, number[]>()

  walls.forEach((wall, wallIndex) => {
    if (Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) <= EPSILON) {
      return
    }

    const middle = along(wall.start, wall.end, 0.5)
    let best: number | null = null
    let bestDistance = CEILING_WALL_TOLERANCE + EPSILON

    outline.forEach((start, edge) => {
      const gap = segmentHit(middle, start, outline[(edge + 1) % outline.length]).distance

      if (gap < bestDistance - EPSILON || (best === null && gap <= bestDistance)) {
        best = edge
        bestDistance = gap
      }
    })

    if (best !== null) {
      carried.set(best, [...(carried.get(best) ?? []), wallIndex])
    }
  })

  const events = outline.map(u)

  for (const wallIndexes of carried.values()) {
    for (const wallIndex of wallIndexes) {
      const wall = walls[wallIndex]

      events.push(u(wall.start), u(wall.end))

      for (const point of slopedProfile(wall) ?? []) {
        events.push(u(along(wall.start, wall.end, point.at)))
      }
    }
  }

  events.sort((left, right) => left - right)

  return { outline, walls, u, t, outlineU: outline.map(u), carried, level: levelHeight(walls), events }
}

/** Punktet på omrisskanten der spennkoordinaten er `value`. */
const onEdge = (model: CeilingModel, edge: number, value: number): CeilingPoint => {
  const next = (edge + 1) % model.outline.length
  const span = model.outlineU[next] - model.outlineU[edge]

  return along(model.outline[edge], model.outline[next], span === 0 ? 0 : clamp01((value - model.outlineU[edge]) / span))
}

/** Veggen, av dem som bærer kanten, som er nærmest punktet. */
const carrierAt = (model: CeilingModel, edge: number, point: CeilingPoint): CeilingWall | null => {
  let best: CeilingWall | null = null
  let bestDistance = CEILING_WALL_TOLERANCE + EPSILON

  for (const wallIndex of model.carried.get(edge) ?? []) {
    const wall = model.walls[wallIndex]
    const gap = segmentHit(point, wall.start, wall.end).distance

    if (gap < bestDistance - EPSILON || (best === null && gap <= bestDistance)) {
      best = wall
      bestDistance = gap
    }
  }

  return best
}

const heightOn = (model: CeilingModel, wall: CeilingWall | null, point: CeilingPoint): number => {
  if (wall === null) {
    return model.level ?? 0
  }

  return profileHeight(wall, segmentHit(point, wall.start, wall.end).share) ?? model.level ?? 0
}

/**
 * Taket som firkantede stykker. Tomt for et rom uten skråtak, og for et
 * omriss som ikke omslutter noe.
 */
export const ceilingPieces = (room: CeilingRoom): CeilingPiece[] => {
  const model = ceilingModel(room)

  if (model === null) {
    return []
  }

  const { outline, outlineU, events, t } = model
  const pieces: CeilingPiece[] = []

  for (let index = 0; index + 1 < events.length; index += 1) {
    const from = events[index]
    const to = events[index + 1]

    if (to - from <= EPSILON) {
      continue
    }

    const middle = (from + to) / 2
    const crossings: { t: number; edge: number }[] = []

    outline.forEach((_, edge) => {
      const next = (edge + 1) % outline.length

      if (outlineU[edge] < middle !== outlineU[next] < middle) {
        crossings.push({ t: t(onEdge(model, edge, middle)), edge })
      }
    })

    crossings.sort((left, right) => left.t - right.t)

    for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
      const corners = [crossings[pair].edge, crossings[pair + 1].edge].flatMap((edge): CeilingCorner[] => {
        const wall = carrierAt(model, edge, onEdge(model, edge, middle))

        return [from, to].map((value): CeilingCorner => {
          const point = onEdge(model, edge, value)

          return [point.x, point.y, heightOn(model, wall, point)]
        })
      })
      const [a1, b1, a2, b2] = corners

      pieces.push({ corners: [a1, b1, b2, a2], span: to - from })
    }
  }

  return pieces
}

const flatArea = (a: CeilingCorner, b: CeilingCorner, c: CeilingCorner): number => Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2

/**
 * Stykkene som trekanter, til å måle flaten og til å tegne den: fire per
 * stykke, fra hver side til punktet midt i stykket (snittet av de fire
 * hjørnene). En trekant uten flate på gulvet er ikke med.
 */
export const ceilingTriangles = (pieces: readonly CeilingPiece[]): [CeilingCorner, CeilingCorner, CeilingCorner][] => {
  const triangles: [CeilingCorner, CeilingCorner, CeilingCorner][] = []

  for (const { corners } of pieces) {
    const middle: CeilingCorner = [
      (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
      (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
      (corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4,
    ]

    corners.forEach((corner, index) => {
      const next = corners[(index + 1) % 4]

      if (flatArea(corner, next, middle) > 1e-12) {
        triangles.push([corner, next, middle])
      }
    })
  }

  return triangles
}

/** Takets flate i m². Et stykke som ligger i ett plan måles nøyaktig; et som vrir seg, tett på. */
export const ceilingArea = (pieces: readonly CeilingPiece[]): number => {
  let area = 0

  for (const [a, b, c] of ceilingTriangles(pieces)) {
    const p = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const q = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]

    area += Math.sqrt((p[1] * q[2] - p[2] * q[1]) ** 2 + (p[2] * q[0] - p[0] * q[2]) ** 2 + (p[0] * q[1] - p[1] * q[0]) ** 2) / 2
  }

  return area
}

/**
 * Volumet mellom gulvet og taket i m³, nøyaktig for regelen: tvers over et
 * stykke endrer både bredden (langs mønet) og snittet av de to kanthøydene
 * seg jevnt, så volumet under det er spenn ÷ 6 × (w₀m₀ + 4·w½m½ + w₁m₁).
 */
export const ceilingVolume = (pieces: readonly CeilingPiece[]): number => {
  let volume = 0

  for (const {
    corners: [a1, b1, b2, a2],
    span,
  } of pieces) {
    const widthA = Math.hypot(a2[0] - a1[0], a2[1] - a1[1])
    const widthB = Math.hypot(b2[0] - b1[0], b2[1] - b1[1])
    const meanA = (a1[2] + a2[2]) / 2
    const meanB = (b1[2] + b2[2]) / 2

    volume += (span / 6) * (widthA * meanA + 4 * ((widthA + widthB) / 2) * ((meanA + meanB) / 2) + widthB * meanB)
  }

  return volume
}

/**
 * Høyden langs linja der spennkoordinaten er `value`. Et hjørne i omrisset
 * som ligger akkurat på linja må høre til én side av den: `below` sier om
 * det regnes som under linja eller over.
 */
const heightIn = (model: CeilingModel, point: CeilingPoint, value: number, below: boolean): number | null => {
  const { outline, outlineU, t } = model
  const crossings: { t: number; height: number }[] = []
  const under = (coordinate: number): boolean => (below ? coordinate <= value : coordinate < value)

  outline.forEach((_, edge) => {
    const next = (edge + 1) % outline.length

    if (under(outlineU[edge]) !== under(outlineU[next])) {
      const hit = onEdge(model, edge, value)

      crossings.push({ t: t(hit), height: heightOn(model, carrierAt(model, edge, hit), hit) })
    }
  })

  if (crossings.length < 2) {
    return null
  }

  crossings.sort((left, right) => left.t - right.t)

  const at = t(point)
  let best: { from: (typeof crossings)[number]; to: (typeof crossings)[number]; gap: number } | null = null

  for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
    const from = crossings[pair]
    const to = crossings[pair + 1]
    // Hvor langt utenfor stykket punktet ligger; 0 når det ligger i det.
    const gap = Math.max(0, from.t - at, at - to.t)

    if (best === null || gap < best.gap - EPSILON) {
      best = { from, to, gap }
    }
  }

  if (best === null) {
    return null
  }

  const width = best.to.t - best.from.t

  return width <= EPSILON ? best.from.height : best.from.height + (best.to.height - best.from.height) * clamp01((at - best.from.t) / width)
}

/**
 * Takets høyde over et punkt i rommet. Null for et rom uten skråtak, og når
 * punktet ikke kan plasseres mot omrisset.
 */
export const ceilingHeightAt = (room: CeilingRoom, point: CeilingPoint): number | null => {
  const model = ceilingModel(room)

  if (model === null) {
    return null
  }

  const value = model.u(point)

  // Ligger punktet ytterst i rommet, finnes linja bare når hjørnene der regnes til den andre siden.
  return heightIn(model, point, value, true) ?? heightIn(model, point, value, false)
}

/** Så mange punkter kan en overkant ha. */
export const PROFILE_MAX_POINTS = 12

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}

/** Hvor langt punktet `index` ligger fra den rette linja mellom naboene, i høyde. */
const deviation = (points: readonly WallProfilePoint[], index: number): number => {
  const before = points[index - 1]
  const after = points[index + 1]
  const span = after.at - before.at
  const expected = span <= 0 ? before.height : before.height + (after.height - before.height) * ((points[index].at - before.at) / span)

  return Math.abs(points[index].height - expected)
}

/**
 * En overkant uten punkter den ikke trenger: et punkt som ligger på den
 * rette linja mellom naboene (innenfor 5 mm) tas bort, og blir det likevel
 * flere enn tolv, tas de som betyr minst bort først. Endene står alltid.
 */
export const simplifyProfile = (points: readonly WallProfilePoint[], maxPoints = PROFILE_MAX_POINTS): WallProfilePoint[] => {
  const result = [...points]

  for (;;) {
    let least: number | null = null

    for (let index = 1; index + 1 < result.length; index += 1) {
      if (least === null || deviation(result, index) < deviation(result, least)) {
        least = index
      }
    }

    if (least === null || (deviation(result, least) > 0.005 && result.length <= maxPoints)) {
      return result
    }

    result.splice(least, 1)
  }
}

/**
 * Overkanten en ny vegg fra `from` til `to` gjennom rommet får: takets høyde
 * ved hver ende og ved hver stripegrense veggen krysser, på hele
 * centimeter. Null for et rom uten skråtak og for en vegg uten lengde.
 */
export const ceilingProfileAlong = (room: CeilingRoom, from: CeilingPoint, to: CeilingPoint): WallProfilePoint[] | null => {
  const model = ceilingModel(room)

  if (model === null || Math.hypot(to.x - from.x, to.y - from.y) <= EPSILON) {
    return null
  }

  const start = model.u(from)
  const span = model.u(to) - start
  const shares = [0, 1]

  if (Math.abs(span) > EPSILON) {
    for (const event of model.events) {
      const share = (event - start) / span

      if (share > 1e-6 && share < 1 - 1e-6) {
        shares.push(share)
      }
    }
  }

  shares.sort((left, right) => left - right)

  const points: WallProfilePoint[] = []

  for (const share of shares) {
    const at = roundTo(share, 4)

    if (points.length > 0 && at <= points[points.length - 1].at) {
      continue
    }

    const height = ceilingHeightAt(room, along(from, to, share))

    if (height === null) {
      return null
    }

    points.push({ at, height: roundTo(Math.max(0, height), 2) })
  }

  return points.length < 2 ? null : simplifyProfile(points)
}
