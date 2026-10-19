<script setup lang="ts">
import type { NkSeatStepperLabels } from '../types/NkLicensingLabels'

/**
 * Brukertelleren (SIGN-1790): minus, tall, pluss — delt av utsjekken og
 * «Endre antall brukere». Grensene kommer fra eieren (aldri under de
 * tildelte setene, aldri over planens tak); hintene under er ferdige
 * tekster («2 brukere inkludert», «+ 299 kr per ekstra bruker»).
 */
interface Props {
  modelValue: number
  min?: number
  max?: number
  labels: NkSeatStepperLabels
  /** Etikett over telleren; uten tekst brukes `labels` bare på knappene. */
  title?: string
  hints?: string[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  min: 1,
  max: 500,
  title: '',
  hints: () => [],
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

// Ikonene som stier: pakka kan ikke forutsette at appens ikonregister har dem.
const minusPath = 'M19,13H5V11H19V13Z'
const plusPath = 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z'

const adjust = (delta: number): void => {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, props.modelValue + delta)))
}
</script>

<template>
  <div class="nk-seat-stepper">
    <p v-if="props.title !== ''" class="nk-seat-stepper__title">{{ props.title }}</p>
    <div class="nk-seat-stepper__row" role="group" :aria-label="props.title || undefined">
      <v-btn
        :aria-label="props.labels.fewer"
        color="default"
        density="comfortable"
        :disabled="props.disabled || props.modelValue <= props.min"
        icon
        size="small"
        variant="outlined"
        @click="adjust(-1)"
      >
        <svg aria-hidden="true" class="nk-seat-stepper__icon" focusable="false" viewBox="0 0 24 24"><path :d="minusPath" /></svg>
      </v-btn>
      <span class="nk-seat-stepper__count" aria-live="polite" data-test="seat-count">{{ props.modelValue }}</span>
      <v-btn
        :aria-label="props.labels.more"
        color="default"
        density="comfortable"
        :disabled="props.disabled || props.modelValue >= props.max"
        icon
        size="small"
        variant="outlined"
        @click="adjust(1)"
      >
        <svg aria-hidden="true" class="nk-seat-stepper__icon" focusable="false" viewBox="0 0 24 24"><path :d="plusPath" /></svg>
      </v-btn>
    </div>
    <p v-for="hint in props.hints" :key="hint" class="nk-seat-stepper__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.nk-seat-stepper {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.5);
}

.nk-seat-stepper__title {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  font-weight: 600;
  margin: 0;
}

.nk-seat-stepper__row {
  align-items: center;
  display: flex;
  gap: calc(var(--nk-space-unit) * 1.5);
}

.nk-seat-stepper__icon {
  fill: currentColor;
  height: 1.25rem;
  width: 1.25rem;
}

.nk-seat-stepper__count {
  font-size: calc(var(--nk-text-body) * 1.25);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  min-width: 2rem;
  text-align: center;
}

.nk-seat-stepper__hint {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8);
  margin: 0;
}
</style>
