<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetLayoutController } from './useWidgetLayout'

/**
 * Verktøylinjen en widget får i redigeringsmodus (SIGN-1850, delt i
 * SIGN-1873): dra-håndtak (piltastene flytter for tastaturbrukere), neste
 * størrelse (bare widgeter med flere), neste høyde (bare i rutenett med
 * rader, SIGN-1903) og skjul. Mus drar hele flisen (eieren
 * kobler det), finger drar i håndtaket — så siden fortsatt kan rulles med
 * fingeren. Tekstene kommer fra kontrollerens `labels`.
 */
const props = defineProps<{
  controller: WidgetLayoutController
  widgetKey: string
}>()

const labels = computed(() => props.controller.labels.value)
const title = computed(() => props.controller.title(props.widgetKey))
const next = computed(() => props.controller.nextSize(props.widgetKey))
const nextLabel = computed(() => (next.value === null ? '' : labels.value.nextSize(labels.value.sizes[next.value])))
const nextRows = computed(() => props.controller.nextRows(props.widgetKey))
const nextRowsLabel = computed(() => (nextRows.value === null ? '' : labels.value.nextRows(nextRows.value)))

const pressHandle = (event: PointerEvent): void => {
  const tile = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-widget-key]')
  props.controller.press(event, props.widgetKey, tile)
}

const moveWithKeys = (event: KeyboardEvent): void => {
  const steps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1] }
  const step = steps[event.key]

  if (step !== undefined) {
    event.preventDefault()
    props.controller.moveBy(props.widgetKey, step[0], step[1])
  }
}
</script>

<template>
  <div class="nk-widget-tools" @pointerdown.stop>
    <button
      :aria-label="labels.move(title)"
      class="nk-widget-tool nk-widget-tool--handle"
      :title="labels.dragToMove"
      type="button"
      @keydown="moveWithKeys"
      @pointerdown="pressHandle"
    >
      <v-icon icon="mdi-drag" size="18" />
    </button>
    <button
      v-if="next !== null"
      :aria-label="nextLabel"
      class="nk-widget-tool"
      :title="nextLabel"
      type="button"
      @click="controller.cycleSize(widgetKey)"
    >
      <v-icon :icon="next === 'small' ? 'mdi-arrow-collapse' : 'mdi-arrow-expand'" size="18" />
    </button>
    <button
      v-if="nextRows !== null"
      :aria-label="nextRowsLabel"
      class="nk-widget-tool"
      data-widget-tool="rows"
      :title="nextRowsLabel"
      type="button"
      @click="controller.cycleRows(widgetKey)"
    >
      <v-icon :icon="nextRows === 1 ? 'mdi-arrow-collapse-vertical' : 'mdi-arrow-expand-vertical'" size="18" />
    </button>
    <button
      :aria-label="labels.hide(title)"
      class="nk-widget-tool"
      :title="labels.hide(title)"
      type="button"
      @click="controller.hide(widgetKey)"
    >
      <v-icon icon="mdi-eye-off-outline" size="18" />
    </button>
  </div>
</template>
