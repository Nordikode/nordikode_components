<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { WidgetLayoutController } from './useWidgetLayout'
import { widgetSpan } from './layoutModel'
import type { WidgetDefinition, WidgetSize } from './types'
import NkWidgetTools from './NkWidgetTools.vue'

/** Ett trinn i rutenettets bredde: fra `minWidth` piksler har det `columns` kolonner. */
export interface WidgetGridBreakpoint {
  minWidth: number
  columns: number
  /** Rader (fliser på celler, 1–3 rader høye) eller naturlig høyde (fliser i listerekkefølge). */
  fixedRows?: boolean
}

/**
 * Rutenettet på en widgetflate (SIGN-1850, delt i SIGN-1873). Eieren tegner selve widgeten i
 * `#widget`-slotten og får nøkkel, størrelse og definisjon; rutenettet eier
 * plassering, størrelse og redigeringsverktøyene.
 *
 * Trinnene avgjør hvor mange kolonner rutenettet har ved hver bredde, og om
 * det har rader. Med rader er hver flis 1–3 rader høy, radene vokser med
 * innholdet og fliser på samme rad er like høye (SIGN-1903); en dratt flis
 * snapper til cellen under hjørnet sitt og dytter det som står der unna.
 * Uten rader (mobil) tar den plassen til flisen under pekeren.
 */
const props = withDefaults(
  defineProps<{
    controller: WidgetLayoutController
    zone?: string
    breakpoints?: readonly WidgetGridBreakpoint[]
    /** Minstehøyden på en rad i piksler; raden vokser når innholdet trenger mer. */
    rowHeight?: number
  }>(),
  {
    zone: 'main',
    breakpoints: () => [
      { minWidth: 0, columns: 2, fixedRows: false },
      { minWidth: 760, columns: 4, fixedRows: true },
      { minWidth: 1360, columns: 6, fixedRows: true },
    ],
    rowHeight: 136,
  },
)

defineSlots<{
  widget(props: { widgetKey: string; size: WidgetSize; definition: WidgetDefinition }): unknown
}>()

// TransitionGroup gir komponentinstansen; elementet ligger på $el.
const root = ref<{ $el: HTMLElement } | null>(null)
const columns = ref(1)
const fixedRows = ref(false)
// Flisene tegnes først når bredden er målt og oppsettet lest, så siden
// ikke åpner med en flytteanimasjon fra standardoppsettet i én kolonne.
const measured = ref(false)
let observer: ResizeObserver | null = null

const tiles = computed(() => {
  if (!measured.value || !props.controller.loaded.value) {
    return []
  }

  if (fixedRows.value) {
    return props.controller.placedIn(props.zone)
  }

  return props.controller.visibleIn(props.zone).map((item) => ({
    key: item.key,
    size: item.size,
    x: 0,
    y: 0,
    ...widgetSpan(item.size, columns.value, props.controller.definition(item.key), item.rows),
  }))
})

const stepFor = (width: number): WidgetGridBreakpoint =>
  [...props.breakpoints].sort((a, b) => b.minWidth - a.minWidth).find((step) => width >= step.minWidth) ?? props.breakpoints[0]

/** Leser bredden rutenettet har fått og melder kolonneantall og radmodus til kontrolleren. */
const gridElement = (): HTMLElement | null => root.value?.$el ?? null

const readGrid = (): void => {
  const element = gridElement()

  if (element === null || typeof element.getBoundingClientRect !== 'function') {
    return
  }

  const step = stepFor(element.getBoundingClientRect().width)
  const style = getComputedStyle(element)

  columns.value = Math.max(1, step.columns)
  fixedRows.value = step.fixedRows === true

  props.controller.setGrid(props.zone, {
    columns: columns.value,
    fixedRows: fixedRows.value,
    element,
    columnGap: parseFloat(style.columnGap) || 0,
    rowGap: parseFloat(style.rowGap) || 0,
    rowHeight: props.rowHeight,
  })

  measured.value = true
}

const pressItem = (event: PointerEvent, key: string): void => {
  if (props.controller.editing.value && event.pointerType === 'mouse') {
    props.controller.press(event, key, event.currentTarget as HTMLElement)
  }
}

onMounted(() => {
  readGrid()

  const element = gridElement()

  if (element !== null && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => readGrid())
    observer.observe(element)
  }
})

watch(() => props.breakpoints, readGrid)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <TransitionGroup
    ref="root"
    class="nk-widget-grid"
    :class="{ 'nk-widget-grid--fixed': fixedRows, 'nk-widget-grid--editing': controller.editing.value }"
    :data-widget-zone="zone"
    name="nk-widget-grid"
    :style="{ '--nk-widgets-columns': columns, '--nk-widgets-row': `${rowHeight}px` }"
    tag="div"
  >
    <div
      v-for="tile in tiles"
      :key="tile.key"
      class="nk-widget-grid__item"
      :class="[
        `nk-widget-grid__item--${tile.size}`,
        {
          'nk-widget-grid__item--editing': controller.editing.value,
          'nk-widget-grid__item--dragging': controller.draggingKey.value === tile.key,
        },
      ]"
      :data-widget-key="tile.key"
      :data-widget-title="controller.title(tile.key)"
      :style="{
        '--nk-tile-x': tile.x + 1,
        '--nk-tile-y': tile.y + 1,
        '--nk-tile-w': tile.w,
        '--nk-tile-h': tile.h,
      }"
      @pointerdown="pressItem($event, tile.key)"
    >
      <div class="nk-widget-grid__widget">
        <slot name="widget" :definition="controller.definition(tile.key)!" :size="tile.size" :widget-key="tile.key" />
      </div>

      <NkWidgetTools v-if="controller.editing.value" :controller="controller" :widget-key="tile.key" />
    </div>
  </TransitionGroup>
</template>
