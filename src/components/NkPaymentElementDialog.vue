<script setup lang="ts">
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { buildCheckoutReturnUrl } from '../licensing/checkoutReturn'
import { getStripe } from '../licensing/stripeClient'
import type { NkPaymentElementDialogLabels } from '../types/NkLicensingLabels'
import NkSheet from './NkSheet.vue'

/**
 * DEN betalingsdialogen (SIGN-95, delt i SIGN-1790): licensing har ingen
 * hostet checkout-URL, så alle betalinger (kjøp, tokenpakker, seter, retry)
 * og kort-lagring (SetupIntent) går gjennom denne — et Stripe Payment
 * Element montert med clientSecret fra backend, bekreftet med klientbygget
 * `return_url` og `redirect: 'if_required'`:
 *
 * - Kortbetaling uten redirect: suksess/underveis meldes rett tilbake her,
 *   og eieren henter fasiten på nytt (aktiveringen skjer asynkront via
 *   Stripe-webhooken i core — sannheten kommer alltid fra backend).
 * - Metoder som krever redirect (3DS/bank/wallet): Stripe sender brukeren
 *   tilbake til `returnUrl` (standard: samme side med `?checkout=return`),
 *   som eieren leser med `readStripeReturn`.
 */
interface Props {
  open: boolean
  mode: 'payment' | 'setup'
  clientSecret: string | null
  publishableKey?: string | null
  title: string
  /** Valgfri beløpslinje/forklaring over betalingsfeltet. */
  description?: string | null
  labels: NkPaymentElementDialogLabels
  /** Mørk modus for Stripe-elementet; appen vet hvilket tema som gjelder. */
  dark?: boolean
  /** Retur-URL for redirect-metoder; standard er samme side med returmarkøren. */
  returnUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  publishableKey: null,
  description: null,
  dark: false,
  returnUrl: null,
})

const emit = defineEmits<{
  close: []
  succeeded: []
  processing: []
  failed: [message: string]
}>()

const mountEl = ref<HTMLDivElement | null>(null)
const initializing = ref(false)
const confirming = ref(false)
const elementReady = ref(false)
const errorMessage = ref('')

let stripe: Stripe | null = null
let elements: StripeElements | null = null
let paymentElement: StripePaymentElement | null = null

const teardown = (): void => {
  paymentElement?.destroy()
  paymentElement = null
  elements = null
  stripe = null
  elementReady.value = false
  errorMessage.value = ''
}

const setup = async (): Promise<void> => {
  if (!props.clientSecret) return

  initializing.value = true

  try {
    stripe = await getStripe(props.publishableKey)

    // Dialogen rendrer innholdet først når den er åpen — vent til
    // monteringspunktet finnes (noen ticks) før elementet monteres.
    for (let attempt = 0; attempt < 5 && !mountEl.value; attempt++) {
      await nextTick()
    }

    if (!props.open || !mountEl.value) return

    elements = stripe.elements({
      clientSecret: props.clientSecret,
      appearance: { theme: props.dark ? 'night' : 'stripe' },
    })
    paymentElement = elements.create('payment')
    paymentElement.on('ready', () => {
      elementReady.value = true
    })
    paymentElement.mount(mountEl.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : props.labels.failed
  } finally {
    initializing.value = false
  }
}

watch(
  () => [props.open, props.clientSecret] as const,
  async ([open]) => {
    teardown()

    if (open) await setup()
  },
)

onBeforeUnmount(teardown)

const confirm = async (): Promise<void> => {
  if (!stripe || !elements || confirming.value) return

  confirming.value = true
  errorMessage.value = ''

  try {
    const confirmParams = { return_url: props.returnUrl ?? buildCheckoutReturnUrl() }

    if (props.mode === 'payment') {
      const result = await stripe.confirmPayment({ elements, confirmParams, redirect: 'if_required' })

      if (result.error) {
        errorMessage.value = result.error.message ?? props.labels.failed
        emit('failed', errorMessage.value)
        return
      }

      if (result.paymentIntent?.status === 'processing') emit('processing')
      else emit('succeeded')

      return
    }

    const result = await stripe.confirmSetup({ elements, confirmParams, redirect: 'if_required' })

    if (result.error) {
      errorMessage.value = result.error.message ?? props.labels.failed
      emit('failed', errorMessage.value)
      return
    }

    if (result.setupIntent?.status === 'processing') emit('processing')
    else emit('succeeded')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : props.labels.failed
    emit('failed', errorMessage.value)
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <!-- eager: innholdet finnes i DOM-en også lukket, så Stripe-elementet har et monteringspunkt. -->
  <NkSheet :max-width="520" :open="props.open" :title="props.title" eager @close="emit('close')">
    <p v-if="props.description" class="nk-payment-dialog__description">{{ props.description }}</p>

    <v-alert v-if="errorMessage" density="compact" type="error" variant="tonal">{{ errorMessage }}</v-alert>

    <p v-if="initializing" class="nk-payment-dialog__description">{{ props.labels.loading }}</p>

    <div ref="mountEl" class="nk-payment-dialog__element" />

    <v-btn block color="primary" data-test="confirm" :disabled="!elementReady || confirming" :loading="confirming" variant="flat" @click="confirm">
      {{ props.mode === 'payment' ? props.labels.payNow : props.labels.saveCard }}
    </v-btn>

    <div class="nk-payment-dialog__foot">
      <p class="nk-payment-dialog__secured">{{ props.labels.securedByStripe }}</p>
      <v-btn color="default" size="small" variant="text" @click="emit('close')">{{ props.labels.cancel }}</v-btn>
    </div>
  </NkSheet>
</template>

<style scoped>
.nk-payment-dialog__description {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.9);
  margin: 0;
}

.nk-payment-dialog__element {
  min-height: 2.5rem;
}

.nk-payment-dialog__foot {
  align-items: center;
  display: flex;
  gap: var(--nk-space-unit);
  justify-content: space-between;
}

.nk-payment-dialog__secured {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8);
  margin: 0;
}
</style>
