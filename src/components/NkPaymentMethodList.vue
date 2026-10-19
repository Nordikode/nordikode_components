<script setup lang="ts">
import type { NkPaymentMethod, NkPaymentMethodListLabels } from '../types/NkLicensingLabels'

/**
 * Kortlisten (SIGN-1790): lagrede betalingsmetoder med merke, siste fire
 * siffer, utløp og lommebok, standardmerket, og «Sett som standard»/«Fjern»
 * for den som kan. Eieren bekrefter fjerning selv (NkConfirmDialog) og
 * kaller licensing. Lommeboknavnene er varemerker og oversettes aldri.
 */
interface Props {
  methods: NkPaymentMethod[]
  canManage?: boolean
  labels: NkPaymentMethodListLabels
}

const props = withDefaults(defineProps<Props>(), { canManage: false })

const emit = defineEmits<{
  'set-default': [method: NkPaymentMethod]
  remove: [method: NkPaymentMethod]
}>()

const WALLETS: Record<string, string> = { apple_pay: 'Apple Pay', google_pay: 'Google Pay' }

const brandLabel = (method: NkPaymentMethod): string => {
  const brand = method.brand ?? ''

  return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : props.labels.card
}

/** «Visa •••• 4242» — merket og de siste fire sifrene når de finnes. */
const titleOf = (method: NkPaymentMethod): string => (method.last4 ? `${brandLabel(method)} •••• ${method.last4}` : brandLabel(method))

const walletLabel = (method: NkPaymentMethod): string | null => (method.walletType ? WALLETS[method.walletType] ?? null : null)

const expiresLabel = (method: NkPaymentMethod): string | null =>
  method.expMonth !== null && method.expYear !== null
    ? props.labels.expires(String(method.expMonth).padStart(2, '0'), String(method.expYear))
    : null
</script>

<template>
  <p v-if="props.methods.length === 0" class="nk-payment-methods__empty">{{ props.labels.empty }}</p>

  <ul v-else class="nk-payment-methods">
    <li v-for="method in props.methods" :key="method.id" class="nk-payment-methods__row" data-test="payment-method">
      <div class="nk-payment-methods__texts">
        <span class="nk-payment-methods__title">
          {{ titleOf(method) }}
          <v-chip v-if="method.isDefault" class="nk-payment-methods__default" size="small" variant="outlined">{{ props.labels.default }}</v-chip>
        </span>
        <span v-if="expiresLabel(method) || walletLabel(method)" class="nk-payment-methods__sub">
          <template v-if="expiresLabel(method)">{{ expiresLabel(method) }}</template>
          <template v-if="walletLabel(method)"> · {{ walletLabel(method) }}</template>
        </span>
      </div>
      <div v-if="props.canManage" class="nk-payment-methods__actions">
        <v-btn v-if="!method.isDefault" size="small" variant="text" @click="emit('set-default', method)">{{ props.labels.setDefault }}</v-btn>
        <v-btn color="error" size="small" variant="text" @click="emit('remove', method)">{{ props.labels.remove }}</v-btn>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.nk-payment-methods__empty {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.9);
  margin: 0;
}

/* Rolige rader skilt med hårstreker, som listene i innstillingene. */
.nk-payment-methods {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nk-payment-methods__row {
  align-items: center;
  border-top: 1px solid var(--nk-surface-border);
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) * 1.5);
  padding: calc(var(--nk-space-unit) * 1.5) calc(var(--nk-space-unit) * 0.25);
}

.nk-payment-methods__row:first-child {
  border-top: 0;
  padding-top: 0;
}

.nk-payment-methods__texts {
  display: flex;
  flex: 1 1 12rem;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.25);
  min-width: 0;
}

.nk-payment-methods__title {
  font-size: calc(var(--nk-text-body) * 0.88);
  font-weight: 600;
}

.nk-payment-methods__default {
  margin-inline-start: var(--nk-space-unit);
}

.nk-payment-methods__sub {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.78);
  line-height: 1.4;
}

.nk-payment-methods__actions {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
  max-width: 100%;
}
</style>
