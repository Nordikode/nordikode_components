<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { formatMeasurementInput, measurementUnit, parseMeasurement, type MeasurementQuantity } from './measurements'

/**
 * Et felt for et mål (SIGN-1980). Verdien er SI — meter, m² eller m³ — og
 * det er den som sendes ut; i feltet står tallet slik brukerens språk
 * skriver det, med enheten bak. Verdien meldes når feltet forlates eller
 * Enter trykkes, så et halvskrevet tall aldri blir en endring. Det som ikke
 * er et tall, settes tilbake til det som sto.
 */
const props = withDefaults(
  defineProps<{
    /** SI-verdien; null er «ikke målt». */
    modelValue: number | null
    label: string
    /** The user's UI locale (`no`, `sv`, `pt-BR`): the number is written and read the way that language writes it. */
    locale: string
    quantity?: MeasurementQuantity
    /** Et tomt felt betyr «ikke målt» (null) i stedet for å settes tilbake. */
    nullable?: boolean
    disabled?: boolean
  }>(),
  { quantity: 'length', nullable: false, disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const display = (): string => formatMeasurementInput(props.modelValue, props.quantity, props.locale)

const text = ref(display())
const focused = ref(false)

// Verdien kan endres utenfra (angring, drag i tegningen): feltet følger med
// når brukeren ikke skriver i det.
watch([() => props.modelValue, () => props.locale], () => {
  if (!focused.value) {
    text.value = display()
  }
})

const commit = (): void => {
  const typed = text.value.trim()
  const parsed = parseMeasurement(typed, props.quantity, props.locale)

  if (typed === '' && props.nullable) {
    if (props.modelValue !== null) {
      emit('update:modelValue', null)
    }
  } else if (parsed !== null && formatMeasurementInput(parsed, props.quantity, props.locale) !== display()) {
    emit('update:modelValue', parsed)
  }

  // Det som ble skrevet erstattes av det som gjelder — også når verdien ble
  // klemt inn i et gyldig område, eller ikke var et tall.
  void nextTick(() => {
    text.value = display()
  })
}

const onBlur = (): void => {
  focused.value = false
  commit()
}
</script>

<template>
  <v-text-field
    v-model="text"
    class="measurement-field"
    density="compact"
    :disabled="disabled"
    hide-details
    inputmode="decimal"
    :label="label"
    :suffix="measurementUnit(quantity, locale)"
    @blur="onBlur"
    @focus="focused = true"
    @keydown.enter.prevent="commit"
  />
</template>
