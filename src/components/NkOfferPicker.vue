<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  cadenceChoices,
  commitmentChoices,
  offerForCadence,
  offerForCommitment,
  type NkCatalogPlan,
  type NkOfferChoice,
  type NkPlanOffer,
} from '../licensing/planOffers'
import type { NkFormatMoney, NkFormatPercentLabel, NkOfferPickerLabels } from '../types/NkLicensingLabels'

/**
 * Tilbudsvelgeren (SIGN-1114, delt i SIGN-1790): to radiogrupper —
 * betalingsfrekvens og bindingstid — avledet av planens tilbud, hver med
 * justeringen i prosent og den effektive månedsprisen for kombinasjonen.
 * Kombinasjoner planen ikke selger er deaktivert. Verdien er tilbudet
 * (`NkPlanOffer`) som sendes videre som `offerId`.
 *
 * Én mulighet er ikke et valg (SIGN-829): finnes bare én frekvens eller én
 * binding, vises den som en linje, ikke som et kort.
 */
interface Props {
  plan: Pick<NkCatalogPlan, 'offers' | 'currency'>
  modelValue: NkPlanOffer | null
  labels: NkOfferPickerLabels
  formatMoney: NkFormatMoney
  formatPercentLabel: NkFormatPercentLabel
}

const props = defineProps<Props>()

const emit = defineEmits<{ 'update:modelValue': [offer: NkPlanOffer | null] }>()

const uid = useId()

const billingMonths = computed(() => props.modelValue?.billingMonths ?? null)
const commitmentMonths = computed(() => props.modelValue?.commitmentMonths ?? null)

const cadences = computed(() => (commitmentMonths.value === null ? [] : cadenceChoices(props.plan.offers, commitmentMonths.value)))
const commitments = computed(() => (billingMonths.value === null ? [] : commitmentChoices(props.plan.offers, billingMonths.value)))

const selectCadence = (months: number): void => {
  emit('update:modelValue', offerForCadence(props.plan.offers, months, commitmentMonths.value))
}

const selectCommitment = (months: number): void => {
  emit('update:modelValue', offerForCommitment(props.plan.offers, months, billingMonths.value))
}

const monthly = (choice: NkOfferChoice): string | null =>
  choice.effectiveMonthlyMinor === null ? null : props.labels.perMonth(props.formatMoney(choice.effectiveMonthlyMinor, props.plan.currency))
</script>

<template>
  <div class="nk-offer-picker">
    <div v-if="cadences.length === 1" class="nk-offer-picker__single">
      <span class="nk-offer-picker__label">{{ props.labels.billing }}</span>
      <span class="nk-offer-picker__value">{{ props.labels.billingEvery(cadences[0]!.months) }}</span>
    </div>
    <div v-else-if="cadences.length > 1">
      <p :id="`nk-offer-billing-${uid}`" class="nk-offer-picker__label">{{ props.labels.billing }}</p>
      <div class="nk-offer-picker__grid" role="radiogroup" :aria-labelledby="`nk-offer-billing-${uid}`">
        <button
          v-for="choice in cadences"
          :key="choice.months"
          type="button"
          role="radio"
          class="nk-offer-picker__choice"
          :class="{ 'nk-offer-picker__choice--selected': choice.months === billingMonths }"
          :aria-checked="choice.months === billingMonths"
          :disabled="!choice.available"
          data-test="cadence"
          @click="selectCadence(choice.months)"
        >
          <span class="nk-offer-picker__title">{{ props.labels.billingEvery(choice.months) }}</span>
          <span v-if="choice.adjustmentPercent !== 0" class="nk-offer-picker__sub">{{ props.formatPercentLabel(choice.adjustmentPercent) }}</span>
          <span v-if="monthly(choice)" class="nk-offer-picker__sub">{{ monthly(choice) }}</span>
        </button>
      </div>
    </div>

    <div v-if="commitments.length === 1" class="nk-offer-picker__single">
      <span class="nk-offer-picker__label">{{ props.labels.commitment }}</span>
      <span class="nk-offer-picker__value">{{ props.labels.commitmentFor(commitments[0]!.months) }}</span>
    </div>
    <div v-else-if="commitments.length > 1">
      <p :id="`nk-offer-commitment-${uid}`" class="nk-offer-picker__label">{{ props.labels.commitment }}</p>
      <div class="nk-offer-picker__grid" role="radiogroup" :aria-labelledby="`nk-offer-commitment-${uid}`">
        <button
          v-for="choice in commitments"
          :key="choice.months"
          type="button"
          role="radio"
          class="nk-offer-picker__choice"
          :class="{ 'nk-offer-picker__choice--selected': choice.months === commitmentMonths }"
          :aria-checked="choice.months === commitmentMonths"
          :disabled="!choice.available"
          data-test="commitment"
          @click="selectCommitment(choice.months)"
        >
          <span class="nk-offer-picker__title">{{ props.labels.commitmentFor(choice.months) }}</span>
          <span v-if="choice.adjustmentPercent !== 0" class="nk-offer-picker__sub">{{ props.formatPercentLabel(choice.adjustmentPercent) }}</span>
          <span v-if="monthly(choice)" class="nk-offer-picker__sub">{{ monthly(choice) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nk-offer-picker {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 1.5);
}

.nk-offer-picker__label {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  font-weight: 600;
  margin: 0 0 calc(var(--nk-space-unit) * 0.5);
}

.nk-offer-picker__single {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) * 1.5);
}

.nk-offer-picker__single .nk-offer-picker__label {
  margin: 0;
}

.nk-offer-picker__value {
  font-size: calc(var(--nk-text-body) * 0.9);
  font-weight: 600;
}

.nk-offer-picker__grid {
  display: grid;
  gap: var(--nk-space-unit);
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
}

/* Flatene er ugjennomsiktige: velgeren kan stå over et bånd (Sign-oppsettet),
   og ingenting skal skinne gjennom kortene. */
.nk-offer-picker__choice {
  background: var(--nk-surface);
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md);
  color: inherit;
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: calc(var(--nk-space-unit) * 0.25);
  /* Lange ord brytes inne i valget i stedet for å stikke ut av det (SIGN-1187). */
  min-width: 0;
  overflow-wrap: anywhere;
  padding: calc(var(--nk-space-unit) * 1.25) calc(var(--nk-space-unit) * 1.5);
  text-align: start;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.nk-offer-picker__choice:hover:not(:disabled) {
  border-color: var(--nk-action-primary);
}

.nk-offer-picker__choice:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.nk-offer-picker__choice:focus-visible {
  outline: 2px solid var(--nk-action-primary);
  outline-offset: 2px;
}

.nk-offer-picker__choice--selected {
  background: var(--nk-surface-soft-accent);
  border-color: var(--nk-action-primary);
  box-shadow: inset 0 0 0 1px var(--nk-action-primary);
}

.nk-offer-picker__title {
  font-weight: 700;
}

.nk-offer-picker__sub {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8);
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .nk-offer-picker__choice {
    transition: none;
  }
}
</style>
