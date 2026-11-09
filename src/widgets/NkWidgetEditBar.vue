<script setup lang="ts">
import { computed, ref } from 'vue'
import NkConfirmDialog from '../components/NkConfirmDialog.vue'
import type { WidgetLayoutController } from './useWidgetLayout'

/**
 * Linjen som vises over flaten mens den tilpasses (SIGN-1850, delt i
 * SIGN-1873): et kort hint, de skjulte widgetene (trykk på en for å hente
 * den fram), «Tilbakestill» og «Ferdig». Den fester seg øverst, så «Ferdig»
 * alltid er innen rekkevidde på en lang flate. Spøkelsesetiketten som følger
 * pekeren under et drag bor også her, siden drag bare skjer i
 * redigeringsmodus. Tekstene kommer fra kontrollerens `labels`.
 */
const props = defineProps<{
  controller: WidgetLayoutController
  /** Overskrift i linjen; uten brukes `labels.editTitle` («Tilpass siden»). */
  title?: string
}>()

const labels = computed(() => props.controller.labels.value)
const confirmReset = ref(false)

const reset = (): void => {
  props.controller.reset()
  confirmReset.value = false
}
</script>

<template>
  <section aria-live="polite" class="nk-widget-editbar">
    <div class="nk-widget-editbar__text">
      <h2 class="nk-widget-editbar__title">{{ title ?? labels.editTitle }}</h2>
      <p class="nk-widget-editbar__hint">{{ labels.hint }}</p>
    </div>

    <div class="nk-widget-editbar__hidden">
      <span class="nk-widget-editbar__label">{{ labels.hidden }}:</span>
      <span v-if="controller.hiddenWidgets.value.length === 0" class="nk-widget-editbar__label">{{ labels.none }}</span>
      <v-chip
        v-for="item in controller.hiddenWidgets.value"
        :key="item.key"
        append-icon="mdi-plus"
        :data-widget-hidden="item.key"
        link
        :prepend-icon="controller.definition(item.key)?.icon"
        size="small"
        @click="controller.show(item.key)"
      >
        {{ controller.title(item.key) }}
      </v-chip>
    </div>

    <div class="nk-widget-editbar__actions">
      <v-btn :disabled="controller.isDefault.value" variant="text" @click="confirmReset = true">
        {{ labels.reset }}
      </v-btn>
      <v-btn color="primary" :loading="controller.isSaving.value" variant="flat" @click="controller.stopEditing()">
        {{ labels.done }}
      </v-btn>
    </div>

    <NkConfirmDialog
      v-model="confirmReset"
      :cancel-label="labels.cancel"
      :confirm-label="labels.reset"
      :message="labels.resetBody"
      :title="labels.resetTitle"
      @cancel="confirmReset = false"
      @confirm="reset"
    />

    <Teleport to="body">
      <div
        v-if="controller.draggingKey.value !== null"
        class="nk-widget-ghost"
        :style="{ '--nk-ghost-x': `${controller.ghostX.value}px`, '--nk-ghost-y': `${controller.ghostY.value}px` }"
      >
        <v-icon :icon="controller.definition(controller.draggingKey.value)?.icon" size="18" />
        <span>{{ controller.title(controller.draggingKey.value) }}</span>
      </div>
    </Teleport>
  </section>
</template>
