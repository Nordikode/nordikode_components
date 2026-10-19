<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { NkCatalogPlan, NkPlanOffer } from '../licensing/planOffers'
import type { NkQuoteLine } from '../licensing/quoteLines'
import type { NkFormatMoney, NkFormatPercentLabel, NkOfferPickerLabels, NkPlanCheckoutFormLabels } from '../types/NkLicensingLabels'
import NkOfferPicker from './NkOfferPicker.vue'
import NkQuoteSummary from './NkQuoteSummary.vue'
import NkSeatStepper from './NkSeatStepper.vue'

/**
 * Utsjekkens skjema (Prissystem 2.0, delt i SIGN-1790): plan → tilbud
 * (frekvens × bindingstid) → brukere → kampanjekode → server-priset
 * sammendrag. Eieren eier all tilstand og alle kall (forhåndsvisning,
 * kjøp, konvertering, planbytte); skjemaet viser og melder valg. Samme
 * skjema i firmaappens kjøpsdialog, app-core sin sperreside/oppsettsteg og
 * Sign-innstillingene.
 *
 * Kampanjekoden ligger bak en lenke og åpnes ved behov (SIGN-829); en
 * avvist kode åpner feltet med feilen.
 */
export interface NkPlanCheckoutPromo {
  input: string
  applied: string | null
  /** «SOMMER applied — you save 500 kr», når en kode er brukt. */
  appliedLabel: string
  error: string
  applying: boolean
}

interface Props {
  /** Planene brukeren kan velge mellom; velgeren vises når det er flere enn én. */
  plans: NkCatalogPlan[]
  selectedPlanId: string | null
  offer: NkPlanOffer | null
  seats: number
  showSeats?: boolean
  minSeats?: number
  maxSeats?: number
  /** Prislinjene under planen («1 890 kr per måned, 1 bruker inkludert»). */
  planHints?: string[]
  /** Uten kampanjeobjekt vises ingen kampanjekode (planbytte). */
  promo?: NkPlanCheckoutPromo | null
  lines: NkQuoteLine[]
  terms?: string[]
  quoteLoading?: boolean
  error?: string
  labels: NkPlanCheckoutFormLabels
  offerLabels: NkOfferPickerLabels
  formatMoney: NkFormatMoney
  formatPercentLabel: NkFormatPercentLabel
}

const props = withDefaults(defineProps<Props>(), {
  showSeats: true,
  minSeats: 1,
  maxSeats: 500,
  planHints: () => [],
  promo: null,
  terms: () => [],
  quoteLoading: false,
  error: '',
})

const emit = defineEmits<{
  'select-plan': [planId: string]
  'update:offer': [offer: NkPlanOffer | null]
  'update:seats': [seats: number]
  'update:promo-input': [value: string]
  'apply-promo': []
  'remove-promo': []
}>()

const promoOpen = ref(false)
const promoField = ref<{ focus: () => void } | null>(null)

const openPromo = async (): Promise<void> => {
  promoOpen.value = true
  await nextTick()
  promoField.value?.focus()
}

// En avvist kode (eller en som sluttet å gjelde) viser feltet med feilen;
// fjernes en brukt kode uten feil, går feltet tilbake bak lenken.
watch(
  () => [props.promo?.applied ?? null, props.promo?.error ?? ''] as const,
  ([applied, error], previous) => {
    if (error !== '') {
      promoOpen.value = true
    } else if (applied === null && previous?.[0]) {
      promoOpen.value = false
    }
  },
)

const selectedPlan = (): NkCatalogPlan | null => props.plans.find((plan) => plan.id === props.selectedPlanId) ?? null

const onSelectPlan = (id: unknown): void => {
  if (typeof id === 'string' && id !== props.selectedPlanId) emit('select-plan', id)
}
</script>

<template>
  <div class="nk-checkout-form">
    <div v-if="props.plans.length > 1" class="nk-checkout-form__block">
      <span class="nk-checkout-form__label">{{ props.labels.plan }}</span>
      <v-btn-toggle
        :aria-label="props.labels.plan"
        color="primary"
        density="comfortable"
        divided
        mandatory
        :model-value="props.selectedPlanId"
        variant="outlined"
        @update:model-value="onSelectPlan"
      >
        <v-btn v-for="plan in props.plans" :key="plan.id" color="default" size="small" :value="plan.id" variant="outlined">{{ plan.name }}</v-btn>
      </v-btn-toggle>
    </div>

    <p v-for="hint in props.planHints" :key="hint" class="nk-checkout-form__hint">{{ hint }}</p>

    <NkOfferPicker
      v-if="selectedPlan()"
      :format-money="props.formatMoney"
      :format-percent-label="props.formatPercentLabel"
      :labels="props.offerLabels"
      :model-value="props.offer"
      :plan="selectedPlan()!"
      @update:model-value="emit('update:offer', $event)"
    />

    <NkSeatStepper
      v-if="props.showSeats"
      :labels="{ fewer: props.labels.fewerSeats, more: props.labels.moreSeats }"
      :max="props.maxSeats"
      :min="props.minSeats"
      :model-value="props.seats"
      :title="props.labels.seats"
      @update:model-value="emit('update:seats', $event)"
    />

    <div v-if="props.promo" class="nk-checkout-form__promo" data-test="promo">
      <v-alert v-if="props.promo.applied" density="compact" type="success" variant="tonal">
        <div class="nk-checkout-form__promo-applied">
          <span>{{ props.promo.appliedLabel }}</span>
          <v-btn color="success" size="small" variant="text" @click="emit('remove-promo')">{{ props.labels.promoRemove }}</v-btn>
        </div>
      </v-alert>
      <button v-else-if="!promoOpen" class="nk-checkout-form__promo-link" type="button" @click="openPromo">
        {{ props.labels.promoToggle }}
      </button>
      <div v-else class="nk-checkout-form__promo-row">
        <v-text-field
          ref="promoField"
          autocapitalize="characters"
          autocomplete="off"
          density="compact"
          :error-messages="props.promo.error"
          hide-details="auto"
          :label="props.labels.promoCode"
          :model-value="props.promo.input"
          variant="outlined"
          @keyup.enter="emit('apply-promo')"
          @update:model-value="emit('update:promo-input', $event)"
        />
        <v-btn
          class="nk-checkout-form__promo-apply"
          color="default"
          :disabled="!props.promo.input.trim() || props.promo.applying"
          :loading="props.promo.applying"
          variant="outlined"
          @click="emit('apply-promo')"
        >
          {{ props.labels.promoApply }}
        </v-btn>
      </div>
    </div>

    <v-alert v-if="props.error !== ''" density="compact" type="error" variant="tonal">{{ props.error }}</v-alert>

    <v-progress-linear v-if="props.quoteLoading && props.lines.length === 0" indeterminate />

    <!-- Server-priset oppsummering — hver linje er en verdi fra licensing sin Quote. -->
    <NkQuoteSummary
      v-if="props.lines.length > 0 || props.quoteLoading"
      :calculating-label="props.labels.calculating"
      :lines="props.lines"
      :loading="props.quoteLoading"
      :terms="props.terms"
    />
  </div>
</template>

<style scoped>
.nk-checkout-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 1.75);
  text-align: start;
}

.nk-checkout-form__block {
  display: grid;
  gap: var(--nk-space-unit);
}

.nk-checkout-form__label {
  color: var(--nk-text-secondary);
  font-size: var(--nk-text-label);
  font-weight: 600;
}

.nk-checkout-form__hint {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.85);
  margin: calc(var(--nk-space-unit) * -1) 0 0;
}

.nk-checkout-form__promo-applied {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
  justify-content: space-between;
}

.nk-checkout-form__promo-link {
  background: none;
  border: 0;
  color: var(--nk-link);
  cursor: pointer;
  font: inherit;
  font-size: calc(var(--nk-text-body) * 0.85);
  padding: 0;
  text-align: start;
  text-decoration: underline;
}

.nk-checkout-form__promo-link:focus-visible {
  outline: 2px solid var(--nk-action-primary);
  outline-offset: 2px;
}

.nk-checkout-form__promo-row {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
}

.nk-checkout-form__promo-row > :first-child {
  flex: 1 1 12rem;
}

.nk-checkout-form__promo-apply {
  flex-shrink: 0;
}
</style>
