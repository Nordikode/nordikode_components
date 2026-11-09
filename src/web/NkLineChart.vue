<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { niceTicks } from './lineChartScale'

/**
 * Det delte linjediagrammet (SIGN-1873): én tidsserie eller noen få, tegnet
 * som SVG med designsystemets tokens, slik at backoffice og produktappene
 * viser utvikling over tid likt. Komponenten er Vuetify-fri og eier bare
 * tegningen: tekstene, tallformatet og fargene kommer fra appen.
 *
 * Reglene den følger (dataviz): én akse, tynne linjer (2 px), hårtynne
 * gridlinjer, ingen tall på hvert punkt — siste verdi merkes direkte,
 * resten leses i tooltipen eller tabellvisningen, som alltid finnes.
 * Hover og piltaster flytter et trådkors til nærmeste punkt og viser alle
 * seriene der. Tekst bærer aldri seriefargen.
 */

export interface NkLineChartSeries {
  key: string
  label: string
  /** Én verdi per kategori; `null` tegner et hull. */
  values: readonly (number | null)[]
  /** CSS-farge for linjen; den første serien får handlingsfargen uten. Må settes for serie to og utover. */
  color?: string
}

export interface NkLineChartLabels {
  /** Knappen som bytter til tabell («Vis som tabell»). */
  table: string
  /** Knappen som bytter tilbake («Vis som diagram»). */
  chart: string
  /** Kolonneoverskriften for kategoriene i tabellen («Periode»). */
  category: string
  /** Vist når det ikke finnes kategorier. */
  empty: string
}

const props = withDefaults(
  defineProps<{
    /** Kategoriene langs x-aksen i rekkefølge (typisk ISO-datoer). */
    categories: readonly string[]
    series: readonly NkLineChartSeries[]
    labels: NkLineChartLabels
    /** Beskrivelsen av diagrammet for skjermlesere. */
    ariaLabel: string
    /** Formatterer en verdi for akse, tooltip, tabell og sluttmerke. */
    formatValue?: (value: number) => string
    /** Formatterer en kategori for x-aksen (kort). */
    formatCategory?: (category: string, index: number) => string
    /** Formatterer en kategori for tooltip og tabell (full). */
    formatCategoryLong?: (category: string, index: number) => string
    /** Høyden på selve plottet i piksler; aksebåndet kommer i tillegg. */
    plotHeight?: number
    /** Holder forrige tegning svakere mens nye tall hentes. */
    loading?: boolean
    /** Antall gridlinjer å sikte mot. */
    gridlines?: number
  }>(),
  {
    formatValue: (value: number) => String(value),
    formatCategory: (category: string) => category,
    formatCategoryLong: undefined,
    plotHeight: 180,
    loading: false,
    gridlines: 4,
  },
)

const LINE_WIDTH = 2
const MARKER_RADIUS = 4
const RING_WIDTH = 2
const AXIS_BAND = 24
const TOP_PAD = 10
const RIGHT_PAD = 12
const CHAR_WIDTH = 7
const DEFAULT_COLOR = 'var(--nk-action-primary)'

const host = ref<HTMLElement | null>(null)
const width = ref(0)
const hovered = ref<number | null>(null)
const showTable = ref(false)
let observer: ResizeObserver | null = null

const longCategory = (category: string, index: number): string =>
  (props.formatCategoryLong ?? props.formatCategory)(category, index)

const pointCount = computed(() => props.categories.length)

const maxValue = computed(() => {
  let max = 0

  for (const entry of props.series) {
    for (const value of entry.values) {
      if (value !== null && Number.isFinite(value) && value > max) {
        max = value
      }
    }
  }

  return max
})

const ticks = computed(() => niceTicks(maxValue.value, props.gridlines))
const yMax = computed(() => ticks.value[ticks.value.length - 1] ?? 1)

const leftPad = computed(() => {
  const longest = Math.max(...ticks.value.map((tick) => props.formatValue(tick).length), 1)

  return Math.min(96, 8 + longest * CHAR_WIDTH)
})

const plotWidth = computed(() => Math.max(0, width.value - leftPad.value - RIGHT_PAD))
const totalHeight = computed(() => TOP_PAD + props.plotHeight + AXIS_BAND)

const xAt = (index: number): number => {
  if (pointCount.value <= 1) {
    return leftPad.value + plotWidth.value / 2
  }

  return leftPad.value + (plotWidth.value * index) / (pointCount.value - 1)
}

const yAt = (value: number): number => TOP_PAD + props.plotHeight - (props.plotHeight * value) / yMax.value

const colorOf = (entry: NkLineChartSeries, index: number): string => entry.color ?? (index === 0 ? DEFAULT_COLOR : 'currentColor')

interface DrawnSeries {
  key: string
  label: string
  color: string
  path: string
  area: string
  end: { x: number; y: number; value: number } | null
}

const drawn = computed<DrawnSeries[]>(() =>
  props.series.map((entry, seriesIndex) => {
    const segments: string[] = []
    let open = false
    let end: DrawnSeries['end'] = null

    entry.values.forEach((value, index) => {
      if (value === null || !Number.isFinite(value) || index >= pointCount.value) {
        open = false

        return
      }

      const x = xAt(index)
      const y = yAt(value)
      segments.push(`${open ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
      open = true
      end = { x, y, value }
    })

    const path = segments.join(' ')
    const baseline = yAt(0)
    const first = entry.values.findIndex((value) => value !== null)
    const area = path !== '' && first >= 0 && end !== null
      ? `${path} L${(end as { x: number }).x.toFixed(1)} ${baseline.toFixed(1)} L${xAt(first).toFixed(1)} ${baseline.toFixed(1)} Z`
      : ''

    return { key: entry.key, label: entry.label, color: colorOf(entry, seriesIndex), path, area, end }
  }),
)

/** Hvilke kategorier som får en etikett på x-aksen: første, siste og jevnt imellom. */
const xTicks = computed(() => {
  const count = pointCount.value

  if (count === 0) {
    return []
  }

  const room = Math.max(1, Math.floor(plotWidth.value / 72))
  const step = Math.max(1, Math.ceil((count - 1) / room))
  const indexes = new Set<number>([0, count - 1])

  for (let index = 0; index < count - 1; index += step) {
    indexes.add(index)
  }

  return [...indexes].sort((a, b) => a - b).filter((index, position, all) => {
    const previous = all[position - 1]

    return previous === undefined || xAt(index) - xAt(previous) >= 48 || index === count - 1
  })
})

const hoveredRows = computed(() => {
  const index = hovered.value

  if (index === null) {
    return []
  }

  return drawn.value.map((entry, seriesIndex) => ({
    key: entry.key,
    label: entry.label,
    color: entry.color,
    value: props.series[seriesIndex]?.values[index] ?? null,
    x: xAt(index),
    y: (() => {
      const value = props.series[seriesIndex]?.values[index]

      return value === null || value === undefined ? null : yAt(value)
    })(),
  }))
})

const tooltipStyle = computed(() => {
  const index = hovered.value

  if (index === null) {
    return {}
  }

  const x = xAt(index)
  const flip = width.value > 0 && x > width.value * 0.6

  return {
    left: `${x}px`,
    transform: flip ? 'translate(calc(-100% - 12px), 0)' : 'translate(12px, 0)',
    top: `${TOP_PAD}px`,
  }
})

const nearestIndex = (clientX: number): number | null => {
  const element = host.value

  if (element === null || pointCount.value === 0) {
    return null
  }

  const rect = element.getBoundingClientRect()
  const x = clientX - rect.left

  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < pointCount.value; index += 1) {
    const distance = Math.abs(xAt(index) - x)

    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  }

  return best
}

const onPointerMove = (event: PointerEvent): void => {
  hovered.value = nearestIndex(event.clientX)
}

const onPointerLeave = (): void => {
  hovered.value = null
}

const onKeydown = (event: KeyboardEvent): void => {
  if (pointCount.value === 0) {
    return
  }

  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    const step = event.key === 'ArrowRight' ? 1 : -1
    const current = hovered.value ?? (step > 0 ? -1 : pointCount.value)
    hovered.value = Math.min(pointCount.value - 1, Math.max(0, current + step))
  } else if (event.key === 'Home') {
    event.preventDefault()
    hovered.value = 0
  } else if (event.key === 'End') {
    event.preventDefault()
    hovered.value = pointCount.value - 1
  } else if (event.key === 'Escape') {
    hovered.value = null
  }
}

const measure = (): void => {
  const element = host.value

  if (element !== null && typeof element.getBoundingClientRect === 'function') {
    width.value = Math.round(element.getBoundingClientRect().width)
  }
}

// Plottet finnes først når det er kategorier å tegne (tallene kommer
// etter montering), så målingen følger elementet, ikke monteringen.
const observe = (element: HTMLElement | null): void => {
  observer?.disconnect()
  observer = null

  if (element === null) {
    return
  }

  measure()

  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => measure())
    observer.observe(element)
  }
}

onMounted(() => observe(host.value))

watch(host, (element) => observe(element))

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(() => props.categories.length, () => {
  hovered.value = null
})

const tableId = `nk-line-chart-table-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <figure class="nk-line-chart" :class="{ 'nk-line-chart--loading': loading, 'nk-line-chart--table': showTable }">
    <div class="nk-line-chart__toolbar">
      <slot name="toolbar" />
      <button
        :aria-expanded="showTable"
        class="nk-line-chart__toggle"
        type="button"
        @click="showTable = !showTable"
      >
        {{ showTable ? labels.chart : labels.table }}
      </button>
    </div>

    <p v-if="categories.length === 0" class="nk-line-chart__empty">{{ labels.empty }}</p>

    <div
      v-else-if="!showTable"
      ref="host"
      :aria-label="ariaLabel"
      class="nk-line-chart__plot"
      role="img"
      tabindex="0"
      @keydown="onKeydown"
      @pointerleave="onPointerLeave"
      @pointermove="onPointerMove"
    >
      <svg
        v-if="width > 0"
        aria-hidden="true"
        class="nk-line-chart__svg"
        :height="totalHeight"
        :viewBox="`0 0 ${width} ${totalHeight}`"
        :width="width"
      >
        <!-- Gridlinjer og y-etiketter: hårtynne, én tone fra flaten. -->
        <g class="nk-line-chart__grid">
          <template v-for="tick in ticks" :key="tick">
            <line :x1="leftPad" :x2="width - RIGHT_PAD" :y1="yAt(tick)" :y2="yAt(tick)" />
            <text :x="leftPad - 6" :y="yAt(tick)" dominant-baseline="middle" text-anchor="end">{{ formatValue(tick) }}</text>
          </template>
        </g>

        <!-- Fyll under en enkelt serie: en vask, aldri en blokk. -->
        <path
          v-if="drawn.length === 1 && drawn[0].area !== ''"
          class="nk-line-chart__area"
          :d="drawn[0].area"
          :style="{ fill: drawn[0].color }"
        />

        <g v-for="entry in drawn" :key="entry.key" class="nk-line-chart__series">
          <path
            v-if="entry.path !== ''"
            class="nk-line-chart__line"
            :d="entry.path"
            :stroke-width="LINE_WIDTH"
            :style="{ stroke: entry.color }"
          />
          <template v-if="entry.end !== null && hovered === null">
            <circle class="nk-line-chart__ring" :cx="entry.end.x" :cy="entry.end.y" :r="MARKER_RADIUS + RING_WIDTH" />
            <circle class="nk-line-chart__marker" :cx="entry.end.x" :cy="entry.end.y" :r="MARKER_RADIUS" :style="{ fill: entry.color }" />
            <text
              v-if="drawn.length === 1"
              class="nk-line-chart__end-label"
              :x="Math.min(entry.end.x, width - RIGHT_PAD)"
              :y="entry.end.y - 10"
              :text-anchor="entry.end.x > width - 60 ? 'end' : 'middle'"
            >
              {{ formatValue(entry.end.value) }}
            </text>
          </template>
        </g>

        <!-- Trådkorset og markørene ved pekeren. -->
        <g v-if="hovered !== null" class="nk-line-chart__hover">
          <line class="nk-line-chart__crosshair" :x1="xAt(hovered)" :x2="xAt(hovered)" :y1="TOP_PAD" :y2="TOP_PAD + plotHeight" />
          <template v-for="row in hoveredRows" :key="row.key">
            <template v-if="row.y !== null">
              <circle class="nk-line-chart__ring" :cx="row.x" :cy="row.y" :r="MARKER_RADIUS + RING_WIDTH" />
              <circle class="nk-line-chart__marker" :cx="row.x" :cy="row.y" :r="MARKER_RADIUS" :style="{ fill: row.color }" />
            </template>
          </template>
        </g>

        <!-- X-etiketter: første, siste og det som får plass imellom. -->
        <g class="nk-line-chart__axis">
          <line :x1="leftPad" :x2="width - RIGHT_PAD" :y1="yAt(0)" :y2="yAt(0)" />
          <text
            v-for="index in xTicks"
            :key="index"
            :text-anchor="index === 0 ? 'start' : index === categories.length - 1 ? 'end' : 'middle'"
            :x="xAt(index)"
            :y="TOP_PAD + plotHeight + AXIS_BAND - 6"
          >
            {{ formatCategory(categories[index], index) }}
          </text>
        </g>
      </svg>

      <div v-if="hovered !== null" aria-live="polite" class="nk-line-chart__tooltip" role="status" :style="tooltipStyle">
        <p class="nk-line-chart__tooltip-title">{{ longCategory(categories[hovered], hovered) }}</p>
        <p v-for="row in hoveredRows" :key="row.key" class="nk-line-chart__tooltip-row">
          <span aria-hidden="true" class="nk-line-chart__key" :style="{ background: row.color }" />
          <strong>{{ row.value === null ? '–' : formatValue(row.value) }}</strong>
          <span v-if="drawn.length > 1" class="nk-line-chart__tooltip-label">{{ row.label }}</span>
        </p>
      </div>
    </div>

    <table v-else :id="tableId" class="nk-line-chart__table">
      <thead>
        <tr>
          <th scope="col">{{ labels.category }}</th>
          <th v-for="entry in series" :key="entry.key" scope="col">{{ entry.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(category, index) in categories" :key="category">
          <th scope="row">{{ longCategory(category, index) }}</th>
          <td v-for="entry in series" :key="entry.key">
            {{ entry.values[index] === null || entry.values[index] === undefined ? '–' : formatValue(entry.values[index] as number) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Forklaring bare når det er mer enn én serie — én serie heter det diagrammet heter. -->
    <figcaption v-if="drawn.length > 1 && !showTable" class="nk-line-chart__legend">
      <span v-for="entry in drawn" :key="entry.key" class="nk-line-chart__legend-item">
        <span aria-hidden="true" class="nk-line-chart__key" :style="{ background: entry.color }" />
        {{ entry.label }}
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.nk-line-chart {
  color: var(--nk-text-primary);
  display: grid;
  gap: calc(var(--nk-space-unit, 4px) * 2);
  margin: 0;
  min-width: 0;
  position: relative;
}

.nk-line-chart--loading .nk-line-chart__plot {
  opacity: 0.55;
  transition: opacity 160ms ease;
}

.nk-line-chart__toolbar {
  align-items: center;
  display: flex;
  gap: var(--nk-gap-inline, 8px);
  justify-content: flex-end;
}

.nk-line-chart__toggle {
  background: transparent;
  border: 0;
  border-radius: var(--nk-radius-pill, 999px);
  color: var(--nk-link, var(--nk-action-primary));
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  padding: calc(var(--nk-space-unit, 4px) * 1) calc(var(--nk-space-unit, 4px) * 2);
}

.nk-line-chart__toggle:hover,
.nk-line-chart__toggle:focus-visible {
  background: var(--nk-surface-soft-accent);
}

.nk-line-chart__toggle:focus-visible {
  outline: 2px solid var(--nk-action-primary);
  outline-offset: 2px;
}

.nk-line-chart__plot {
  border-radius: var(--nk-radius-sm, 6px);
  min-width: 0;
  outline: none;
  position: relative;
  touch-action: pan-y;
  width: 100%;
}

.nk-line-chart__plot:focus-visible {
  outline: 2px solid var(--nk-action-primary);
  outline-offset: 2px;
}

.nk-line-chart__svg {
  display: block;
  overflow: visible;
  width: 100%;
}

.nk-line-chart__grid line,
.nk-line-chart__axis line {
  stroke: var(--nk-surface-border);
  stroke-width: 1;
}

.nk-line-chart__grid text,
.nk-line-chart__axis text {
  fill: var(--nk-text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.nk-line-chart__area {
  opacity: 0.1;
}

.nk-line-chart__line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nk-line-chart__ring {
  fill: var(--nk-surface);
}

.nk-line-chart__crosshair {
  stroke: var(--nk-text-secondary);
  stroke-width: 1;
}

.nk-line-chart__end-label {
  fill: var(--nk-text-primary);
  font-size: 12px;
  font-weight: 650;
}

.nk-line-chart__tooltip {
  background: var(--nk-surface);
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md, 10px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--nk-text-primary) 12%, transparent);
  display: grid;
  gap: 2px;
  min-width: 96px;
  padding: calc(var(--nk-space-unit, 4px) * 2) calc(var(--nk-space-unit, 4px) * 3);
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.nk-line-chart__tooltip-title {
  color: var(--nk-text-secondary);
  font-size: 0.78rem;
  margin: 0 0 2px;
  white-space: nowrap;
}

.nk-line-chart__tooltip-row {
  align-items: center;
  display: flex;
  gap: var(--nk-gap-inline, 8px);
  margin: 0;
  white-space: nowrap;
}

.nk-line-chart__tooltip-row strong {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}

.nk-line-chart__tooltip-label {
  color: var(--nk-text-secondary);
  font-size: 0.8rem;
}

.nk-line-chart__key {
  border-radius: 2px;
  display: inline-block;
  flex: 0 0 auto;
  height: 3px;
  width: 14px;
}

.nk-line-chart__legend {
  color: var(--nk-text-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8rem;
  gap: calc(var(--nk-space-unit, 4px) * 4);
}

.nk-line-chart__legend-item {
  align-items: center;
  display: inline-flex;
  gap: var(--nk-gap-inline, 8px);
}

.nk-line-chart__empty {
  color: var(--nk-text-secondary);
  font-size: 0.9rem;
  margin: 0;
  padding: calc(var(--nk-space-unit, 4px) * 6) 0;
  text-align: center;
}

.nk-line-chart__table {
  border-collapse: collapse;
  font-size: 0.85rem;
  width: 100%;
}

.nk-line-chart__table th,
.nk-line-chart__table td {
  border-bottom: 1px solid var(--nk-surface-border);
  padding: calc(var(--nk-space-unit, 4px) * 1.5) calc(var(--nk-space-unit, 4px) * 2);
  text-align: left;
}

.nk-line-chart__table td,
.nk-line-chart__table thead th:not(:first-child) {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.nk-line-chart__table thead th {
  color: var(--nk-text-secondary);
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .nk-line-chart--loading .nk-line-chart__plot {
    transition: none;
  }
}
</style>
