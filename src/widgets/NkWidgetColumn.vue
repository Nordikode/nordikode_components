<script setup lang="ts">
import { onMounted } from 'vue'
import type { WidgetLayoutController } from './useWidgetLayout'
import type { WidgetDefinition, WidgetSize } from './types'
import NkWidgetTools from './NkWidgetTools.vue'

/**
 * En kolonne av widgeter (SIGN-1850, delt i SIGN-1873; høyrekolonnen i
 * saken i Sign). Widgetene følger listerekkefølgen med naturlig høyde;
 * størrelsen styrer bare hvor mye innhold hver viser. I redigeringsmodus
 * kan de dras om, byttes størrelse på og skjules — og dras over i et
 * rutenett på samme flate (og tilbake).
 */
const props = withDefaults(
  defineProps<{
    controller: WidgetLayoutController
    zone?: string
  }>(),
  { zone: 'side' },
)

defineSlots<{
  widget(props: { widgetKey: string; size: WidgetSize; definition: WidgetDefinition; settings: Record<string, string> }): unknown
  empty(): unknown
}>()

const pressItem = (event: PointerEvent, key: string): void => {
  if (props.controller.editing.value && event.pointerType === 'mouse') {
    props.controller.press(event, key, event.currentTarget as HTMLElement)
  }
}

onMounted(() => {
  props.controller.setGrid(props.zone, { columns: 1, fixedRows: false, element: null, columnGap: 0, rowGap: 0, rowHeight: 0 })
})
</script>

<template>
  <TransitionGroup
    class="nk-widget-column"
    :class="{ 'nk-widget-column--editing': controller.editing.value }"
    :data-widget-zone="zone"
    name="nk-widget-grid"
    tag="div"
  >
    <div
      v-for="item in controller.loaded.value ? controller.visibleIn(zone) : []"
      :key="item.key"
      class="nk-widget-column__item"
      :class="[`nk-widget-column__item--${item.size}`, {
        'nk-widget-column__item--editing': controller.editing.value,
        'nk-widget-column__item--dragging': controller.draggingKey.value === item.key,
      }]"
      :data-widget-key="item.key"
      :data-widget-title="controller.title(item.key)"
      @pointerdown="pressItem($event, item.key)"
    >
      <div class="nk-widget-column__widget">
        <slot name="widget" :definition="controller.definition(item.key)!" :settings="controller.settingsOf(item.key)" :size="item.size" :widget-key="item.key" />
      </div>

      <NkWidgetTools v-if="controller.editing.value" :controller="controller" :widget-key="item.key" />
    </div>

    <!-- Tom kolonne i redigeringsmodus: en slippsone, så widgeter kan dras tilbake. -->
    <div
      v-if="controller.editing.value && controller.visibleIn(zone).length === 0"
      key="__empty"
      class="nk-widget-column__empty"
    >
      <slot name="empty" />
    </div>
  </TransitionGroup>
</template>
