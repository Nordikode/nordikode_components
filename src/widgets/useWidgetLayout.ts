import { computed, reactive, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import type { GridTile } from './gridLayout'
import { moveTile, placeTiles, resizeTile, sortTiles } from './gridLayout'
import { defaultLayout, defaultZoneOf, isDefaultLayout, isRows, isStoredLayout, positionsFor, resolveLayout, widgetSpan } from './layoutModel'
import type { WidgetDefinition, WidgetLabels, WidgetLayout, WidgetLayoutItem, WidgetLayoutStorage, WidgetSize, WidgetZoneKind } from './types'
import { WIDGET_ROWS } from './types'
import { useWidgetDrag, type DragPoint } from './useWidgetDrag'

/** Hvor lenge etter siste endring oppsettet skrives til lagringen. */
const SAVE_DELAY_MS = 500

export interface WidgetZoneDefinition {
  key: string
  kind: WidgetZoneKind
}

export interface UseWidgetLayoutOptions {
  /** Nøkkelen oppsettet lagres under (Sign: `sign.<flate>.layout`). */
  preferenceKey: string
  /** Widgetene flaten har — kan være en getter når tilgang avgjør hvilke som finnes. */
  definitions: MaybeRefOrGetter<readonly WidgetDefinition[]>
  /** Sonene på flaten; den første er standard. Uten: ett rutenett `main`. */
  zones?: readonly WidgetZoneDefinition[]
  /** Lagringen oppsettet bor i — appens (Sign: UI-preferansene i core). */
  storage: WidgetLayoutStorage
  /** Tekstene fra appens i18n; en getter følger språkbyttet. */
  labels: MaybeRefOrGetter<WidgetLabels>
  /** Kalles når lagringen feiler; appen viser feilen slik den pleier (toast). Oppsettet står som brukeren lot det. */
  onSaveError?: (error: unknown) => void
  /** Et eldre lagret oppsett å ta med over når nøkkelen mangler. */
  migrate?: () => Partial<WidgetLayout> | null
}

/** En synlig widget med cellene den opptar i sonens rutenett. */
export interface PlacedWidget extends GridTile {
  size: WidgetSize
  zone: string
}

/** Det et rutenett melder om seg selv, så kontrolleren kan plassere og snappe. */
export interface GridGeometry {
  columns: number
  fixedRows: boolean
  element: HTMLElement | null
  columnGap: number
  rowGap: number
  rowHeight: number
}

/** Høyden på hver rad rutenettet har nå — radene vokser med innholdet, så de er ikke like. */
const rowTracks = (element: HTMLElement): number[] =>
  getComputedStyle(element)
    .gridTemplateRows.split(/\s+/)
    .map((track) => parseFloat(track))
    .filter((track) => Number.isFinite(track) && track > 0)

/**
 * Raden hvis overkant ligger nærmest `offset` piksler under rutenettets
 * overkant. `tracks` er de radene som finnes; under dem fortsetter radene
 * med minstehøyden.
 */
export const rowAt = (offset: number, tracks: readonly number[], rowHeight: number, rowGap: number): number => {
  let top = 0
  let row = 0

  for (;;) {
    const height = tracks[row] ?? rowHeight
    const next = top + height + rowGap

    if (offset < (top + next) / 2) {
      return row
    }

    top = next
    row += 1
  }
}

const DEFAULT_ZONES: readonly WidgetZoneDefinition[] = [{ key: 'main', kind: 'grid' }]

/**
 * Kontrolleren for én flates widgetoppsett (SIGN-1850, delt i SIGN-1873):
 * hvilke widgeter som vises, i hvilken sone, hvilken størrelse de har og
 * hvor de står.
 *
 * Oppsettet bor i lagringen appen gir (`storage`; Sign: brukerens
 * UI-preferanser i core, så det følger personen mellom nettlesere og deles
 * aldri med kolleger). Hver endring gjøres med en gang og lagres like etter,
 * så ingenting går tapt om brukeren går videre mens hun tilpasser. Endrer
 * brukeren oppsettet i en annen fane, melder lagringen det gjennom
 * `current()` og kontrolleren følger etter.
 *
 * Rutenettene forteller kontrolleren hvor mange kolonner de har og om
 * de har rader (`setGrid`; `fixedRows`). Radene har en minstehøyde og vokser
 * med innholdet (SIGN-1903), og hver widget er 1–3 rader høy: størrelsens
 * standard, eller høyden brukeren har valgt (`setRows`). Med rader plasseres hver synlig widget
 * på en celle (`placedIn`), med posisjonene brukeren har lagret for det
 * kolonneantallet, og resten fylles inn; å flytte er da å flytte til en
 * celle. Uten faste rader (kolonner, smale skjermer) følger widgetene
 * listerekkefølgen, og å flytte er å ordne om.
 */
export const useWidgetLayout = (options: UseWidgetLayoutOptions) => {
  const zones = options.zones ?? DEFAULT_ZONES
  const zoneKeys = zones.map((zone) => zone.key)
  const definitions = computed(() => toValue(options.definitions))
  const labels: ComputedRef<WidgetLabels> = computed(() => toValue(options.labels))

  const layout = ref<WidgetLayout>(defaultLayout(definitions.value, zoneKeys))
  const editing = ref(false)
  const isSaving = ref(false)
  const loaded = ref(false)
  const grids = reactive<Record<string, { columns: number; fixedRows: boolean }>>({})
  const geometry: Record<string, GridGeometry> = {}
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  /** Serialisert kopi av det som sist ble lest fra eller skrevet til lagringen. */
  let synced = ''

  const definition = (key: string): WidgetDefinition | undefined => definitions.value.find((entry) => entry.key === key)

  const zoneKind = (zone: string): WidgetZoneKind => zones.find((entry) => entry.key === zone)?.kind ?? 'grid'

  const widgets = computed(() => layout.value.widgets)
  const hiddenWidgets = computed(() => widgets.value.filter((item) => !item.visible && definition(item.key) !== undefined))
  const isDefault = computed(() => isDefaultLayout(layout.value, definitions.value, zoneKeys))

  const visibleIn = (zone: string): WidgetLayoutItem[] =>
    widgets.value.filter((item) => item.visible && item.zone === zone && definition(item.key) !== undefined)

  const columnsOf = (zone: string): number => Math.max(1, grids[zone]?.columns ?? 1)

  const hasFixedRows = (zone: string): boolean => grids[zone]?.fixedRows === true

  /** Hver synlig widget i sonen med sin celle, i leserekkefølge. */
  const placedByZone: ComputedRef<Record<string, PlacedWidget[]>> = computed(() =>
    Object.fromEntries(
      zoneKeys.map((zone) => {
        const columns = columnsOf(zone)
        const stored = positionsFor(layout.value, zone, columns)?.tiles ?? {}
        const tiles = visibleIn(zone).map((item) => ({
          key: item.key,
          size: item.size,
          zone,
          ...widgetSpan(item.size, columns, definition(item.key), item.rows),
          ...stored[item.key],
        }))

        return [zone, sortTiles(placeTiles(tiles, columns))]
      }),
    ),
  )

  const placedIn = (zone: string): PlacedWidget[] => placedByZone.value[zone] ?? []

  const item = (key: string): WidgetLayoutItem | undefined => widgets.value.find((widget) => widget.key === key)

  // --- Lagring ---------------------------------------------------------------

  const save = (): void => {
    saveTimer = null

    const toStore: WidgetLayout = JSON.parse(JSON.stringify(layout.value))
    synced = JSON.stringify(toStore)
    isSaving.value = true

    options.storage
      .save(options.preferenceKey, toStore)
      .catch((error: unknown) => {
        // Oppsettet står som brukeren lot det; neste endring prøver igjen.
        options.onSaveError?.(error)
      })
      .finally(() => {
        isSaving.value = false
      })
  }

  const scheduleSave = (): void => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
    }

    saveTimer = setTimeout(save, SAVE_DELAY_MS)
  }

  /** Lagrer nå om en lagring venter. */
  const flush = (): void => {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
      save()
    }
  }

  const adopt = (stored: unknown): void => {
    layout.value = resolveLayout(stored, definitions.value, zoneKeys)
  }

  // Lagringen leses én gang, og følges deretter: en endring i en annen fane
  // kommer inn via `storage.current()` og tas i bruk her.
  const load = async (): Promise<void> => {
    let stored: unknown = null

    try {
      stored = await options.storage.load(options.preferenceKey)
    } catch {
      // Uten kontakt med lagringen brukes standardoppsettet for økten.
    }

    if (isStoredLayout(stored)) {
      synced = JSON.stringify(stored)
      adopt(stored)
    } else {
      const migrated = options.migrate?.() ?? null

      if (migrated !== null) {
        adopt(migrated)
      }
    }

    loaded.value = true
  }

  void load()

  if (options.storage.current !== undefined) {
    watch(
      () => options.storage.current?.(options.preferenceKey),
      (stored) => {
        if (!loaded.value || !isStoredLayout(stored)) {
          return
        }

        const serialised = JSON.stringify(stored)

        if (serialised === synced) {
          return
        }

        synced = serialised
        adopt(stored)
      },
    )
  }

  // Registeret kan endre seg (tilgang kommer eller går): oppsettet renses på nytt.
  watch(definitions, () => {
    adopt(layout.value)
  })

  // --- Endringer ---------------------------------------------------------------

  /**
   * Lagrer plasseringen i et rutenett for dagens kolonneantall, og legger
   * sonens widgeter i samme leserekkefølge, så kolonneantall uten egen
   * plassering (og smale skjermer) følger etter.
   */
  const storePlacement = (zone: string, tiles: readonly PlacedWidget[]): void => {
    const columns = columnsOf(zone)
    const sorted = sortTiles(tiles)
    const entry = { zone, columns, tiles: Object.fromEntries(sorted.map((tile) => [tile.key, { x: tile.x, y: tile.y }])) }
    const others = (layout.value.positions ?? []).filter((positions) => positions.zone !== zone || positions.columns !== columns)

    layout.value.positions = [...others, entry]

    const inZone = sorted.map((tile) => item(tile.key)).filter((widget): widget is WidgetLayoutItem => widget !== undefined)
    const rest = widgets.value.filter((widget) => !inZone.includes(widget))
    layout.value.widgets = [...inZone, ...rest]
  }

  /** Glemmer widgetens lagrede celler i alle rutenett — den plasseres på nytt der den kommer. */
  const forgetPositions = (key: string): void => {
    layout.value.positions = layout.value.positions
      ?.map((entry) => {
        const { [key]: _dropped, ...tiles } = entry.tiles

        return { ...entry, tiles }
      })
      .filter((entry) => Object.keys(entry.tiles).length > 0)
  }

  const hide = (key: string): void => {
    const widget = item(key)

    if (widget && widget.visible) {
      widget.visible = false
      forgetPositions(key)
      scheduleSave()
    }
  }

  const show = (key: string): void => {
    const widget = item(key)

    if (widget && !widget.visible) {
      widget.visible = true
      scheduleSave()
    }
  }

  const setSize = (key: string, size: WidgetSize): void => {
    const widget = item(key)
    const entry = definition(key)

    if (!widget || !entry || !entry.sizes.includes(size) || widget.size === size) {
      return
    }

    widget.size = size

    if (widget.visible && hasFixedRows(widget.zone)) {
      const columns = columnsOf(widget.zone)
      const span = widgetSpan(size, columns, entry, widget.rows)
      const tiles = resizeTile(placedIn(widget.zone), key, span.w, span.h, columns).map((tile) => ({
        ...tile,
        size: tile.key === key ? size : tile.size,
      }))

      storePlacement(widget.zone, tiles)
    }

    scheduleSave()
  }

  /** Neste størrelse widgeten støtter (liten → medium → stor → liten). */
  const nextSize = (key: string): WidgetSize | null => {
    const widget = item(key)
    const entry = definition(key)

    if (!widget || !entry || entry.sizes.length < 2) {
      return null
    }

    const index = entry.sizes.indexOf(widget.size)

    return entry.sizes[(index + 1) % entry.sizes.length]
  }

  const cycleSize = (key: string): void => {
    const size = nextSize(key)

    if (size !== null) {
      setSize(key, size)
    }
  }

  /** Høyden widgeten har nå i et rutenett med rader: den valgte, ellers størrelsens standard. */
  const rowsOf = (key: string): number => {
    const widget = item(key)

    return widget ? widgetSpan(widget.size, 1, definition(key), widget.rows).h : 1
  }

  /** Setter høyden i rader (1–3). Naboene dyttes ned om widgeten vokser inn i dem. */
  const setRows = (key: string, rows: number): void => {
    const widget = item(key)
    const entry = definition(key)

    if (!widget || !entry || !isRows(rows) || rowsOf(key) === rows) {
      return
    }

    widget.rows = rows

    if (widget.visible && hasFixedRows(widget.zone)) {
      const columns = columnsOf(widget.zone)
      const span = widgetSpan(widget.size, columns, entry, rows)

      storePlacement(widget.zone, resizeTile(placedIn(widget.zone), key, span.w, span.h, columns))
    }

    scheduleSave()
  }

  /** Neste høyde (1 → 2 → 3 → 1), eller null der sonen ikke har rader (kolonner, smale skjermer). */
  const nextRows = (key: string): number | null => {
    const widget = item(key)

    if (!widget || !definition(key) || zoneKind(widget.zone) !== 'grid' || !hasFixedRows(widget.zone)) {
      return null
    }

    return WIDGET_ROWS[(WIDGET_ROWS.indexOf(rowsOf(key)) + 1) % WIDGET_ROWS.length]
  }

  const cycleRows = (key: string): void => {
    const rows = nextRows(key)

    if (rows !== null) {
      setRows(key, rows)
    }
  }

  /** Flytter widgeten til sonen `zone`, bakerst, uten å lagre. True når noe endret seg. */
  const moveToZone = (key: string, zone: string): boolean => {
    const widget = item(key)

    if (!widget || widget.zone === zone || !zoneKeys.includes(zone)) {
      return false
    }

    widget.zone = zone
    forgetPositions(key)

    const list = widgets.value
    list.splice(list.indexOf(widget), 1)
    list.push(widget)

    return true
  }

  /**
   * Setter widgeten på cellen (`x`, `y`) i sonen og dytter det som står der
   * unna. Brukes under draget, så den endrer oppsettet uten å lagre.
   */
  const moveToCell = (key: string, zone: string, x: number, y: number): boolean => {
    const changedZone = moveToZone(key, zone)
    const before = placedIn(zone)
    const after = moveTile(before, key, x, y, columnsOf(zone))

    if (after === before) {
      if (changedZone) {
        storePlacement(zone, before)
      }

      return changedZone
    }

    storePlacement(zone, after)

    return true
  }

  /**
   * Flytter `key` dit `targetKey` står i listen (og inn i dens sone): før
   * den når draget går oppover, etter den når det går nedover. Brukes i
   * kolonner og på smale skjermer, der widgetene følger listerekkefølgen.
   */
  const moveTo = (key: string, targetKey: string): boolean => {
    const list = widgets.value
    const widget = item(key)
    const target = item(targetKey)

    if (!widget || !target || widget === target) {
      return false
    }

    if (widget.zone !== target.zone) {
      widget.zone = target.zone
      forgetPositions(key)
    }

    // Målets plass leses før flyttingen: dras widgeten nedover, havner den
    // etter målet; oppover, foran det.
    const from = list.indexOf(widget)
    const to = list.indexOf(target)
    list.splice(from, 1)
    list.splice(to, 0, widget)

    return true
  }

  /** Flytter en widget én celle (eller, uten faste rader, ett hakk i listen); for tastaturbrukere. */
  const moveBy = (key: string, dx: number, dy: number): void => {
    const widget = item(key)

    if (!widget) {
      return
    }

    if (hasFixedRows(widget.zone)) {
      const tile = placedIn(widget.zone).find((entry) => entry.key === key)

      if (tile && moveToCell(key, widget.zone, tile.x + dx, tile.y + dy)) {
        scheduleSave()
      }

      return
    }

    const visible = visibleIn(widget.zone)
    const index = visible.findIndex((entry) => entry.key === key)
    const target = visible[index + (dx || dy)]

    if (index >= 0 && target && moveTo(key, target.key)) {
      scheduleSave()
    }
  }

  const reset = (): void => {
    layout.value = defaultLayout(definitions.value, zoneKeys)
    scheduleSave()
  }

  const startEditing = (): void => {
    editing.value = true
  }

  const stopEditing = (): void => {
    editing.value = false
    flush()
  }

  // --- Rutenett og drag ------------------------------------------------------

  /** Kalles av rutenettet når det monteres og når bredden endrer seg. */
  const setGrid = (zone: string, grid: GridGeometry): void => {
    geometry[zone] = grid
    grids[zone] = { columns: Math.max(1, grid.columns), fixedRows: grid.fixedRows }
  }

  /** Snapper den dratte flisens øvre venstre hjørne til nærmeste celle i sonens rutenett. */
  const dropOnCell = (key: string, zone: string, point: DragPoint): boolean => {
    const grid = geometry[zone]

    if (!grid?.element || grid.rowHeight === 0) {
      return false
    }

    const rect = grid.element.getBoundingClientRect()
    const columns = columnsOf(zone)
    const columnWidth = (rect.width - grid.columnGap * (columns - 1)) / columns
    const x = Math.round((point.left - rect.left) / (columnWidth + grid.columnGap))
    const y = rowAt(point.top - rect.top, rowTracks(grid.element), grid.rowHeight, grid.rowGap)

    return moveToCell(key, zone, x, y)
  }

  const drag = useWidgetDrag({
    onMove: (key, point) => {
      const widget = item(key)
      const zone = point.zone

      if (!widget || zone === null || !zoneKeys.includes(zone)) {
        return false
      }

      if (zoneKind(zone) === 'grid' && hasFixedRows(zone)) {
        return dropOnCell(key, zone, point)
      }

      if (point.over !== null) {
        return moveTo(key, point.over)
      }

      return moveToZone(key, zone)
    },
    onDrop: () => scheduleSave(),
  })

  /** Widgetens navn: definisjonens `title`, løst opp når det er en getter; nøkkelen når widgeten er ukjent. */
  const title = (key: string): string => {
    const entry = definition(key)?.title

    if (entry === undefined) {
      return key
    }

    return typeof entry === 'function' ? entry() : entry
  }

  return {
    preferenceKey: options.preferenceKey,
    zones,
    labels,
    layout: layout as Ref<WidgetLayout>,
    editing,
    isSaving,
    loaded,
    isDefault,
    definitions,
    definition,
    title,
    widgets,
    hiddenWidgets,
    visibleIn,
    placedIn,
    columnsOf,
    hasFixedRows,
    zoneKind,
    defaultZoneOf: (key: string): string => {
      const entry = definition(key)

      return entry ? defaultZoneOf(entry, zoneKeys) : zoneKeys[0]
    },
    hide,
    show,
    setSize,
    nextSize,
    cycleSize,
    rowsOf,
    setRows,
    nextRows,
    cycleRows,
    moveToCell,
    moveTo,
    moveToZone,
    moveBy,
    reset,
    startEditing,
    stopEditing,
    scheduleSave,
    flush,
    setGrid,
    draggingKey: drag.draggingKey,
    ghostX: drag.ghostX,
    ghostY: drag.ghostY,
    press: drag.press,
  }
}

export type WidgetLayoutController = ReturnType<typeof useWidgetLayout>
