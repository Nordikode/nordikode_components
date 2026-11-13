import type {
  GridPosition,
  WidgetDefinition,
  WidgetLayout,
  WidgetLayoutItem,
  WidgetPositions,
  WidgetSize,
} from './types'
import { WIDGET_ROWS, WIDGET_SIZES } from './types'

/**
 * Oppsettsmodellen: gjør det som er lagret på brukeren om til et komplett,
 * gyldig oppsett mot widgetregisteret flaten har i dag. Ukjente widgeter
 * kastes, en størrelse widgeten ikke støtter faller tilbake til standard,
 * og widgeter brukeren aldri har sett legges til — så en ny widget dukker
 * opp hos alle, og en fjernet forsvinner stille.
 */

/** Rader per størrelse i et rutenett med faste rader: ett nøkkeltall, et panel, en lang liste. */
const DEFAULT_ROWS: Record<WidgetSize, number> = { small: 1, medium: 2, large: 3 }

export const isRows = (value: unknown): value is number => typeof value === 'number' && WIDGET_ROWS.includes(value)

/** Standardhøyden i rader for en størrelse: definisjonens, ellers 1/2/3 for liten/medium/stor. */
export const defaultRows = (size: WidgetSize, definition?: WidgetDefinition): number => definition?.rows?.[size] ?? DEFAULT_ROWS[size]

/**
 * Hvor mange kolonner og rader en widget spenner over i et rutenett med
 * `columns` kolonner. `rows` er høyden brukeren har valgt; uten den gjelder
 * størrelsens standard.
 */
export const widgetSpan = (size: WidgetSize, columns: number, definition?: WidgetDefinition, rows?: number): { w: number; h: number } => {
  const h = isRows(rows) ? rows : defaultRows(size, definition)

  switch (size) {
    case 'large':
      return { w: columns, h }
    case 'medium':
      // På en telefon (to kolonner) er et panel hele bredden; bare nøkkeltall står to og to.
      return { w: columns <= 2 ? columns : Math.ceil(columns / 2), h }
    default:
      return { w: 1, h }
  }
}

const isSize = (value: unknown): value is WidgetSize => typeof value === 'string' && (WIDGET_SIZES as readonly string[]).includes(value)

const isCell = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0

/**
 * Det brukeren har valgt av widgetens innstillinger, renset mot registeret:
 * bare kjente innstillinger med et gyldig valg, og aldri standardverdien —
 * så et oppsett uten egne valg er likt standardoppsettet.
 */
export const resolveSettings = (stored: unknown, definition: WidgetDefinition): Record<string, string> | undefined => {
  if (definition.settings === undefined || typeof stored !== 'object' || stored === null) {
    return undefined
  }

  const chosen: Record<string, string> = {}

  definition.settings.forEach((setting) => {
    const value = (stored as Record<string, unknown>)[setting.key]

    if (typeof value === 'string' && value !== setting.default && setting.options.some((option) => option.value === value)) {
      chosen[setting.key] = value
    }
  })

  return Object.keys(chosen).length > 0 ? chosen : undefined
}

/** Verdien hver innstilling på widgeten har nå: brukerens valg, ellers standarden. */
export const settingsOf = (definition: WidgetDefinition | undefined, item: WidgetLayoutItem | undefined): Record<string, string> => {
  const values: Record<string, string> = {}

  definition?.settings?.forEach((setting) => {
    values[setting.key] = item?.settings?.[setting.key] ?? setting.default
  })

  return values
}

export const defaultZoneOf = (definition: WidgetDefinition, zones: readonly string[]): string =>
  definition.zone !== undefined && zones.includes(definition.zone) ? definition.zone : zones[0]

const defaultItem = (definition: WidgetDefinition, zones: readonly string[]): WidgetLayoutItem => ({
  key: definition.key,
  size: definition.sizes[0],
  visible: definition.hidden !== true,
  zone: defaultZoneOf(definition, zones),
})

/** Standardoppsettet: hver widget i registerets rekkefølge, i sin sone, i sin første størrelse. */
export const defaultLayout = (definitions: readonly WidgetDefinition[], zones: readonly string[]): WidgetLayout => ({
  widgets: definitions.map((definition) => defaultItem(definition, zones)),
})

/** Beholder bare velformede posisjoner for kjente widgeter og soner. */
const resolvePositions = (stored: unknown, known: ReadonlySet<string>, zones: readonly string[]): WidgetPositions[] | undefined => {
  if (!Array.isArray(stored)) {
    return undefined
  }

  const positions: WidgetPositions[] = []
  const seen = new Set<string>()

  stored.forEach((entry: unknown) => {
    const record = entry as Partial<WidgetPositions> | null
    const zone = typeof record?.zone === 'string' ? record.zone : zones[0]
    const columns = record?.columns
    const id = `${zone}:${columns}`

    if (!zones.includes(zone) || !isCell(columns) || columns < 1 || seen.has(id) || record?.tiles === null || typeof record?.tiles !== 'object') {
      return
    }

    const tiles: Record<string, GridPosition> = {}

    Object.entries(record.tiles as Record<string, Partial<GridPosition> | null>).forEach(([key, position]) => {
      if (known.has(key) && isCell(position?.x) && isCell(position?.y)) {
        tiles[key] = { x: position.x, y: position.y }
      }
    })

    if (Object.keys(tiles).length > 0) {
      seen.add(id)
      positions.push({ zone, columns, tiles })
    }
  })

  return positions.length > 0 ? positions : undefined
}

/**
 * Gjør et lagret oppsett (av hvilken som helst form) om til et komplett.
 * Ukjente widgeter og dubletter kastes, en ukjent sone eller størrelse
 * faller tilbake til widgetens standard, og widgeter som mangler legges
 * bakerst i sin sone — synlige, med mindre registeret sier skjult. En
 * widget skilt ut av en annen (`after`) settes rett etter den i stedet.
 */
export const resolveLayout = (stored: unknown, definitions: readonly WidgetDefinition[], zones: readonly string[]): WidgetLayout => {
  const byKey = new Map(definitions.map((definition) => [definition.key, definition]))
  const widgets: WidgetLayoutItem[] = []
  const seen = new Set<string>()
  const storedWidgets = (stored as Partial<WidgetLayout> | null)?.widgets

  if (Array.isArray(storedWidgets)) {
    storedWidgets.forEach((item: unknown) => {
      const record = item as Partial<WidgetLayoutItem> | null
      const definition = typeof record?.key === 'string' ? byKey.get(record.key) : undefined

      if (definition === undefined || seen.has(definition.key)) {
        return
      }

      seen.add(definition.key)

      const settings = resolveSettings(record?.settings, definition)

      widgets.push({
        key: definition.key,
        size: isSize(record?.size) && definition.sizes.includes(record.size) ? record.size : definition.sizes[0],
        visible: record?.visible !== false,
        zone: typeof record?.zone === 'string' && zones.includes(record.zone) ? record.zone : defaultZoneOf(definition, zones),
        ...(isRows(record?.rows) ? { rows: record.rows } : {}),
        ...(settings === undefined ? {} : { settings }),
      })
    })
  }

  // Har brukeren et lagret oppsett, er en widget som mangler ny for henne.
  const hasStored = widgets.length > 0

  definitions.forEach((definition) => {
    if (seen.has(definition.key)) {
      return
    }

    seen.add(definition.key)

    // En widget skilt ut av en annen følger den: rett etter, i samme sone,
    // og skjult om den den kom fra er skjult.
    const anchor = hasStored && definition.after !== undefined ? widgets.findIndex((item) => item.key === definition.after) : -1

    if (anchor >= 0) {
      const origin = widgets[anchor]

      widgets.splice(anchor + 1, 0, { ...defaultItem(definition, zones), zone: origin.zone, visible: origin.visible && definition.hidden !== true })

      return
    }

    widgets.push(defaultItem(definition, zones))
  })

  const positions = resolvePositions((stored as Partial<WidgetLayout> | null)?.positions, seen, zones)

  return positions === undefined ? { widgets } : { widgets, positions }
}

/** Brukerens lagrede plassering i sonen ved `columns` kolonner, om den finnes. */
export const positionsFor = (layout: WidgetLayout, zone: string, columns: number): WidgetPositions | undefined =>
  layout.positions?.find((entry) => entry.zone === zone && entry.columns === columns)

export const isDefaultLayout = (layout: WidgetLayout, definitions: readonly WidgetDefinition[], zones: readonly string[]): boolean =>
  JSON.stringify(layout) === JSON.stringify(defaultLayout(definitions, zones))

/** Typevakt for det som leses fra preferansen: alt annet renses av resolveLayout. */
export const isStoredLayout = (value: unknown): value is Partial<WidgetLayout> =>
  typeof value === 'object' && value !== null && Array.isArray((value as Partial<WidgetLayout>).widgets)
