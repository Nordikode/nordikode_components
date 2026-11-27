<script setup lang="ts">
import { computed, ref } from 'vue'
import { FLOOR_PLAN_TONES, readableInk, toneOf } from './floorPlanColors'
import { normalizeColor } from './floorPlanEditing'
import { floorPlanEditorTexts } from './floorPlanEditorTexts'

/**
 * Fargevalget for et gulv eller en vegg (SIGN-1980): de ferdige tonene, en
 * fri farge og «Ingen farge». Fargen er data personen velger og lagres som
 * `#rrggbb` med små bokstaver; uten farge tegnes planen i appens egne toner.
 *
 * Tonene er knapper med navn (ikke bare farge): den valgte er merket med en
 * hake og `aria-pressed`. Den frie fargen velges i Vuetifys fargevelger; så
 * lenge den dras i, meldes hver farge som en fortsettelse (`continuous`), så
 * hele valget blir ett angresteg.
 */
const props = defineProps<{
  modelValue: string | null
  label: string
  /** The user's UI locale (`no`, `sv`, `pt-BR`): the language of the tone names. */
  locale: string
}>()

const emit = defineEmits<{
  /** `continuous` er sann mens fargevelgeren dras i. */
  change: [color: string | null, continuous: boolean]
}>()

const text = computed(() => floorPlanEditorTexts(props.locale))

const pickerOpen = ref(false)

const current = computed(() => normalizeColor(props.modelValue))
const isCustom = computed(() => current.value !== null && toneOf(current.value) === null)

const tones = computed(() =>
  FLOOR_PLAN_TONES.map((tone) => ({
    ...tone,
    name: text.value.tones[tone.key],
    selected: current.value === tone.hex,
    ink: readableInk(tone.hex) ?? undefined,
  })),
)

const pick = (color: string | null): void => {
  if (color !== current.value) {
    emit('change', color, false)
  }
}

// Fargevelgeren gir `#RRGGBB`; alt lagres med små bokstaver.
const adjust = (value: unknown): void => {
  const color = normalizeColor(typeof value === 'string' ? value.slice(0, 7) : null)

  if (color !== null && color !== current.value) {
    emit('change', color, true)
  }
}
</script>

<template>
  <fieldset class="color-field">
    <legend class="color-field-label">{{ label }}</legend>

    <div class="color-field-tones">
      <button
        v-for="tone in tones"
        :key="tone.key"
        :aria-label="tone.name"
        :aria-pressed="tone.selected"
        class="color-tone"
        :class="{ 'color-tone--selected': tone.selected }"
        :data-tone="tone.key"
        :style="{ background: tone.hex, color: tone.ink }"
        :title="tone.name"
        type="button"
        @click="pick(tone.hex)"
      >
        <v-icon v-if="tone.selected" icon="mdi-check" size="16" />
      </button>
    </div>

    <div class="color-field-actions">
      <v-menu v-model="pickerOpen" :close-on-content-click="false" location="bottom start">
        <template #activator="{ props: activator }">
          <v-btn v-bind="activator" :aria-pressed="isCustom" class="color-field-action" data-testid="color-custom" size="small" variant="text">
            <template #prepend>
              <span v-if="isCustom" aria-hidden="true" class="color-dot" :style="{ background: current ?? undefined }" />
              <v-icon v-else icon="mdi-eyedropper" size="16" />
            </template>
            {{ text.customColor }}
          </v-btn>
        </template>
        <v-color-picker
          class="color-field-picker"
          elevation="2"
          mode="hex"
          :model-value="current ?? FLOOR_PLAN_TONES[0].hex"
          :modes="['hex']"
          @update:model-value="adjust"
        />
      </v-menu>

      <v-btn
        :aria-pressed="current === null"
        class="color-field-action"
        data-testid="color-none"
        :disabled="current === null"
        size="small"
        variant="text"
        @click="pick(null)"
      >
        {{ text.noColor }}
      </v-btn>
    </div>
  </fieldset>
</template>

<style scoped>
.color-field {
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.color-field-label {
  color: var(--nk-text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: calc(var(--nk-space-unit) * 0.75);
  padding: 0;
}

.color-field-tones {
  display: grid;
  gap: calc(var(--nk-space-unit) * 0.75);
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

/* Tonen er data — fargen selv — med en hårstrek rundt, så hvitt synes på kortet. */
.color-tone {
  align-items: center;
  aspect-ratio: 1;
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-sm);
  cursor: pointer;
  display: flex;
  justify-content: center;
  min-height: calc(var(--nk-space-unit) * 4);
  padding: 0;
}

.color-tone--selected {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.color-tone:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.color-field-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) / 2);
  margin-top: calc(var(--nk-space-unit) * 0.75);
}

/* Supporting actions: neutral text, never the action colour. !important is needed against Vuetify's text-primary utility. */
.v-btn.color-field-action {
  color: var(--nk-text-secondary) !important;
}

.color-dot {
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-pill);
  display: inline-block;
  height: calc(var(--nk-space-unit) * 1.75);
  width: calc(var(--nk-space-unit) * 1.75);
}
</style>
