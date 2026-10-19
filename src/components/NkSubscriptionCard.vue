<script setup lang="ts">
import { computed } from 'vue'
import type { NkCatalogPlan } from '../licensing/planOffers'
import {
  canCancelSubscription,
  canChangeTerms,
  cancelBlocked,
  hasUnlimitedSeats,
  subscriptionStatusTone,
  trialDaysLeft,
  type NkSubscriptionSummary,
} from '../licensing/subscription'
import type { NkFormatDate, NkFormatMoney, NkSubscriptionCardTexts } from '../types/NkLicensingLabels'
import NkStatusChip from './NkStatusChip.vue'

/**
 * Abonnementskortet (SIGN-1114, delt i SIGN-1790): vilkårene licensing
 * lagret ved kjøp — plan, brukere, betalingsfrekvens, bindingstid og
 * bindingsslutt, neste faktura, betalingsmåte — pluss varslene (prøveperiode,
 * venter på betaling, feilet betaling, oppsigelse, ventende endring) og
 * handlingsraden. Samme kort i firmaappen → Abonnement og i Sign →
 * Innstillinger → Abonnement. Eieren eier dataene, rettighetene, tekstene og
 * hva som skjer når en handling velges; kortet viser og melder.
 */
interface Props {
  subscription: NkSubscriptionSummary
  /** Plankatalogen: driver «Bytt plan», «Bytt frekvens/binding» og «Velg tilbud». Tom liste skjuler dem. */
  plans?: NkCatalogPlan[]
  /** `licensing.billing.manage`: abonnementshandlingene. */
  canManage?: boolean
  /** `licensing.seats.manage`: «Administrer seter». */
  canManageSeats?: boolean
  /** En handling på dette abonnementet er underveis. */
  busy?: boolean
  texts: NkSubscriptionCardTexts
  formatMoney: NkFormatMoney
  formatDate: NkFormatDate
}

const props = withDefaults(defineProps<Props>(), {
  plans: () => [],
  canManage: false,
  canManageSeats: false,
  busy: false,
})

const emit = defineEmits<{
  'choose-offer': []
  'complete-checkout': []
  'abandon-checkout': []
  'retry-payment': []
  resume: []
  cancel: []
  'manage-seats': []
  'change-seats': []
  'change-offer': []
  'change-plan': []
}>()

const subscription = computed(() => props.subscription)
const plan = computed<NkCatalogPlan | null>(() => props.plans.find((entry) => entry.id === subscription.value.planId) ?? null)
const hasOtherPlans = computed(() => props.plans.some((entry) => entry.id !== subscription.value.planId && entry.offers.length > 0))

const title = computed(() => subscription.value.planName ?? subscription.value.appName)
const appsLabel = computed(() =>
  subscription.value.apps.length > 0 ? subscription.value.apps.map((app) => app.appName).join(' + ') : subscription.value.appName,
)

const money = (amountMinor: number): string => props.formatMoney(amountMinor, subscription.value.currency)
const notAvailable = computed(() => props.texts.notAvailable)

const seatsText = computed(() => {
  const current = subscription.value

  if (hasUnlimitedSeats(current)) return props.texts.seatsUnlimited(current.seats.length)

  const total = current.seatsCount ?? current.paidSeatCount
  const usage = props.texts.seatsUsage(current.seats.length, total)

  return current.seatsCount !== null && current.seatsCount !== current.paidSeatCount
    ? `${usage} · ${props.texts.seatsFromNextBilling(current.seatsCount)}`
    : usage
})

/**
 * Prisen slik den ble låst ved kjøp: månedslisten for firmaets brukere,
 * med prisformen som tekst — flat, per bruker, eller grunnpris + inkluderte
 * brukere og pris per ekstra. Alt fra abonnementet, ingenting regnet her.
 */
const priceText = computed(() => {
  const current = subscription.value

  if (current.isComplimentary) return props.texts.complimentary
  if (current.monthlyListMinor === null) return notAvailable.value

  const list = props.texts.monthlyList(money(current.monthlyListMinor))

  switch (current.pricingModel) {
    case 'flat':
      return `${list} · ${props.texts.modelFlat}`
    case 'per_seat':
      return current.seatAmountMinor === null ? list : `${list} · ${props.texts.modelPerUser(money(current.seatAmountMinor))}`
    case 'included_seats': {
      const parts = [list, props.texts.modelCompany(money(current.baseAmountMinor ?? 0), current.planIncludedSeats ?? 0)]

      if (current.seatAmountMinor !== null) parts.push(props.texts.modelExtraUser(money(current.seatAmountMinor)))

      return parts.join(' · ')
    }
    default:
      return list
  }
})

const billingText = computed(() =>
  subscription.value.billingMonths === null ? notAvailable.value : props.texts.billingEvery(subscription.value.billingMonths),
)

const commitmentText = computed(() => {
  const current = subscription.value

  if (current.status === 'trialing') return props.texts.commitmentTrial
  if (current.commitmentMonths === null) return notAvailable.value

  const label = props.texts.commitmentFor(current.commitmentMonths)
  const ends = props.formatDate(current.commitmentEndsAt)

  if (!ends) return label

  return `${label} · ${props.texts.commitmentUntil(ends)} · ${props.texts.endPolicy(current.commitmentEndPolicy ?? 'renew_same')}`
})

const nextBillingText = computed(() => {
  const current = subscription.value

  if (current.status === 'trialing') {
    const ends = props.formatDate(current.trialEndsAt)

    return ends ? props.texts.trialUntil(ends) : notAvailable.value
  }

  const cancelAt = props.formatDate(current.cancelAt)

  if (cancelAt) return props.texts.endsOn(cancelAt)

  const next = props.formatDate(current.nextBillingAt ?? current.currentPeriodEnd)

  return next ? props.texts.nextInvoiceOn(next) : notAvailable.value
})

const paymentTermsText = computed(() => {
  const current = subscription.value

  if (current.status === 'trialing') return props.texts.paymentTermsTrial

  return current.paymentTerms === 'invoice' ? props.texts.paymentTermsInvoice : props.texts.paymentTermsCard
})

const pendingChangeText = computed<string | null>(() => {
  const change = subscription.value.pendingChange

  if (!change) return null

  const date = props.formatDate(change.effectiveAt) ?? notAvailable.value

  if (change.type === 'plan') {
    const target = props.plans.find((entry) => entry.id === change.planId)

    return props.texts.pendingPlan(target?.name ?? change.planId ?? '', date)
  }

  return props.texts.pendingOffer(
    change.billingMonths === null ? '' : props.texts.billingEvery(change.billingMonths),
    change.commitmentMonths === null ? '' : props.texts.commitmentFor(change.commitmentMonths),
    date,
  )
})

const daysLeft = computed(() => trialDaysLeft(subscription.value.trialEndsAt))
const trialText = computed(() => (daysLeft.value === 0 ? props.texts.trialEndsToday : props.texts.trialCountdown(daysLeft.value ?? 0)))

const cancelScheduledText = computed(() =>
  props.texts.cancelScheduled(props.formatDate(subscription.value.cancelAt ?? subscription.value.currentPeriodEnd) ?? notAvailable.value),
)

/* Si opp: tidligst ved bindingsslutt — før det er knappen deaktivert med forklaring. */
const showCancel = computed(() => props.canManage && canCancelSubscription(subscription.value))
const cancelIsBlocked = computed(() => cancelBlocked(subscription.value))
const cancelCommittedText = computed(() => props.texts.cancelCommitted(props.formatDate(subscription.value.cancelableFrom) ?? ''))

const showTermActions = computed(() => props.canManage && canChangeTerms(subscription.value))

const facts = computed(() => [
  { key: 'seats', label: props.texts.seatsLabel, value: seatsText.value },
  { key: 'billing', label: props.texts.billingLabel, value: billingText.value },
  { key: 'commitment', label: props.texts.commitmentLabel, value: commitmentText.value },
  { key: 'nextInvoice', label: props.texts.nextInvoiceLabel, value: nextBillingText.value },
  { key: 'paymentTerms', label: props.texts.paymentTermsLabel, value: paymentTermsText.value },
  { key: 'price', label: props.texts.priceLabel, value: priceText.value },
])
</script>

<template>
  <article class="nk-subscription-card" data-test="subscription">
    <div class="nk-subscription-card__head">
      <div class="nk-subscription-card__texts">
        <h2 class="nk-subscription-card__title">{{ title }}</h2>
        <p v-if="subscription.planName" class="nk-subscription-card__sub">{{ appsLabel }}</p>
      </div>
      <div class="nk-subscription-card__chips">
        <NkStatusChip v-if="subscription.isComplimentary" size="sm" tone="neutral" :label="props.texts.complimentary" />
        <NkStatusChip size="sm" :tone="subscriptionStatusTone[subscription.status] ?? 'neutral'" :label="props.texts.status(subscription.status)" />
      </div>
    </div>

    <v-alert v-if="subscription.status === 'trialing' && daysLeft !== null" density="compact" type="info" variant="tonal">
      <div class="nk-subscription-card__alert">
        <span>{{ trialText }}</span>
        <v-btn v-if="props.canManage && plan" color="info" size="small" variant="text" :disabled="props.busy" @click="emit('choose-offer')">
          {{ props.texts.actions.chooseOffer }}
        </v-btn>
      </div>
    </v-alert>

    <v-alert v-if="subscription.status === 'incomplete'" density="compact" type="info" variant="tonal">
      <div class="nk-subscription-card__alert">
        <span>{{ props.texts.incompleteAlert }}</span>
        <span v-if="props.canManage" class="nk-subscription-card__alert-actions">
          <v-btn v-if="plan" color="info" size="small" variant="text" :disabled="props.busy" @click="emit('complete-checkout')">
            {{ props.texts.actions.completeCheckout }}
          </v-btn>
          <v-btn color="error" size="small" variant="text" :disabled="props.busy" @click="emit('abandon-checkout')">
            {{ props.texts.actions.abandonCheckout }}
          </v-btn>
        </span>
      </div>
    </v-alert>

    <v-alert v-if="subscription.status === 'past_due' || subscription.status === 'suspended'" density="compact" type="error" variant="tonal">
      <div class="nk-subscription-card__alert">
        <span>{{ subscription.status === 'past_due' ? props.texts.pastDueAlert : props.texts.suspendedAlert }}</span>
        <v-btn v-if="props.canManage" color="error" size="small" variant="text" :disabled="props.busy" :loading="props.busy" @click="emit('retry-payment')">
          {{ props.texts.actions.retryPayment }}
        </v-btn>
      </div>
    </v-alert>

    <v-alert v-if="subscription.cancelAt || subscription.cancelAtPeriodEnd" density="compact" type="warning" variant="tonal">
      <div class="nk-subscription-card__alert">
        <span>{{ cancelScheduledText }}</span>
        <v-btn v-if="props.canManage" color="warning" size="small" variant="text" :disabled="props.busy" @click="emit('resume')">
          {{ props.texts.actions.resume }}
        </v-btn>
      </div>
    </v-alert>

    <v-alert v-if="pendingChangeText" density="compact" type="info" variant="tonal" data-test="pending-change">{{ pendingChangeText }}</v-alert>

    <dl class="nk-subscription-card__facts">
      <div v-for="fact in facts" :key="fact.key" :data-fact="fact.key">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>

    <div v-if="props.canManageSeats || showTermActions || showCancel" class="nk-subscription-card__actions">
      <v-btn v-if="props.canManageSeats" class="nk-subscription-card__action" color="default" size="small" variant="outlined" @click="emit('manage-seats')">
        {{ props.texts.actions.manageSeats }}
      </v-btn>
      <template v-if="showTermActions">
        <v-btn
          v-if="subscription.pricingModel !== 'flat'"
          class="nk-subscription-card__action"
          color="default"
          :disabled="props.busy"
          size="small"
          variant="outlined"
          @click="emit('change-seats')"
        >
          {{ props.texts.actions.changeSeats }}
        </v-btn>
        <v-btn v-if="plan" class="nk-subscription-card__action" color="default" :disabled="props.busy" size="small" variant="outlined" @click="emit('change-offer')">
          {{ props.texts.actions.changeOffer }}
        </v-btn>
        <v-btn v-if="hasOtherPlans" class="nk-subscription-card__action" color="default" :disabled="props.busy" size="small" variant="outlined" @click="emit('change-plan')">
          {{ props.texts.actions.changePlan }}
        </v-btn>
      </template>
      <span class="nk-subscription-card__spacer" />
      <v-btn
        v-if="showCancel"
        color="error"
        data-test="cancel"
        :disabled="cancelIsBlocked || props.busy"
        size="small"
        variant="text"
        @click="emit('cancel')"
      >
        {{ props.texts.actions.cancel }}
      </v-btn>
    </div>
    <p v-if="showCancel && cancelIsBlocked" class="nk-subscription-card__hint" data-test="cancel-hint">{{ cancelCommittedText }}</p>
  </article>
</template>

<style scoped>
/* Kortflaten matcher innstillingsseksjonene: egen flate med hårstrek. */
.nk-subscription-card {
  background: var(--nk-surface);
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--nk-gap-inline);
  min-width: 0;
  padding: var(--nk-pad-card);
}

.nk-subscription-card__head {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-gap-inline);
  justify-content: space-between;
}

.nk-subscription-card__texts {
  display: grid;
  gap: calc(var(--nk-space-unit) * 0.25);
  min-width: 0;
}

.nk-subscription-card__title {
  color: var(--nk-text-title);
  font-size: var(--nk-text-body);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0;
}

.nk-subscription-card__sub {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8);
  line-height: 1.4;
  margin: 0;
}

.nk-subscription-card__chips {
  align-items: center;
  display: flex;
  gap: calc(var(--nk-space-unit) * 0.5);
}

.nk-subscription-card__alert,
.nk-subscription-card__alert-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
}

.nk-subscription-card__alert {
  justify-content: space-between;
}

/* Nøkkel/verdi-rutenettet: to kolonner når det er plass. */
.nk-subscription-card__facts {
  display: grid;
  gap: var(--nk-space-unit);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  margin: 0;
}

.nk-subscription-card__facts dt {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8);
}

.nk-subscription-card__facts dd {
  font-size: calc(var(--nk-text-body) * 0.9);
  font-weight: 500;
  margin: 0;
}

.nk-subscription-card__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
  margin-top: auto;
  padding-top: calc(var(--nk-space-unit) * 0.5);
}

.nk-subscription-card__spacer {
  flex-grow: 1;
}

/* Knapper med lang tekst (SIGN-1187): teksten brytes i stedet for å klippes. */
.v-btn.nk-subscription-card__action {
  height: auto;
  max-width: 100%;
  min-height: var(--v-btn-height);
}

.v-btn.nk-subscription-card__action :deep(.v-btn__content) {
  padding-block: calc(var(--nk-space-unit) * 0.5);
  text-align: center;
  white-space: normal;
}

.nk-subscription-card__hint {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.85);
  margin: 0;
}
</style>
