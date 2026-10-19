import type { Stripe } from '@stripe/stripe-js'

/**
 * Stripe-klienten alle betalingsflatene deler (SIGN-1790, portert fra
 * firmaappen og app-core).
 *
 * Designbeslutning (SIGN-95): licensing har INGEN hostet checkout-URL —
 * hele flyten er PaymentIntent/SetupIntent fra core + klient-side Stripe.js
 * Payment Element med klientbygget return_url og `redirect: 'if_required'`.
 * Publishable key kommer ALLTID fra mutasjonssvaret (markedsriktig nøkkel
 * fra core) — aldri fra env i frontend. Nøkkelen huskes per sidevisning så
 * flyter uten egen nøkkel i svaret (retry av fornyelse, seter) kan
 * gjenbruke den.
 */
const stripePromiseByKey = new Map<string, Promise<Stripe | null>>()

let lastKnownKey: string | null = null

/** Husk markedets publishable key fra et intent-svar for senere flyter. */
export const rememberPublishableKey = (key: string | null | undefined): void => {
  if (key && key.trim() !== '') {
    lastKnownKey = key.trim()
  }
}

export const knownPublishableKey = (): string | null => lastKnownKey

/** Laster Stripe.js lat for gitt publishable key (cachet per nøkkel). */
export const getStripe = async (publishableKey?: string | null): Promise<Stripe> => {
  const key = (publishableKey ?? '').trim() || lastKnownKey || ''

  if (!key) {
    throw new Error('Stripe publishable key is missing.')
  }

  rememberPublishableKey(key)

  let promise = stripePromiseByKey.get(key)

  if (!promise) {
    promise = import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(key))
    stripePromiseByKey.set(key, promise)
  }

  const stripe = await promise

  if (!stripe) {
    stripePromiseByKey.delete(key)
    throw new Error('Unable to load Stripe.')
  }

  return stripe
}

export interface NkStripePaymentActionResult {
  outcome: 'succeeded' | 'processing' | 'requiresElement' | 'failed'
  message?: string
}

/**
 * Fullfører et off-session PaymentIntent som trenger on-session-hjelp, uten
 * å montere et Payment Element. Intents i `requires_action` (typisk 3DS på
 * lagret kort) fullføres via handleNextAction; intents som fortsatt trenger
 * bekreftelse eller betalingsmetode må gjennom et Payment Element i stedet
 * (`requiresElement`) — da åpner kalleren betalingsdialogen som fallback.
 */
export const completePaymentIntentAction = async (
  clientSecret: string,
  publishableKey?: string | null,
): Promise<NkStripePaymentActionResult> => {
  const stripe = await getStripe(publishableKey)
  const retrieved = await stripe.retrievePaymentIntent(clientSecret)

  if (retrieved.error) {
    return { outcome: 'failed', message: retrieved.error.message }
  }

  const status = retrieved.paymentIntent?.status ?? ''

  if (status === 'succeeded') return { outcome: 'succeeded' }
  if (status === 'processing') return { outcome: 'processing' }
  if (status === 'requires_confirmation' || status === 'requires_payment_method') return { outcome: 'requiresElement' }
  if (status !== 'requires_action') return { outcome: 'failed' }

  const result = await stripe.handleNextAction({ clientSecret })

  if (result.error) {
    return { outcome: 'failed', message: result.error.message }
  }

  const finalStatus = result.paymentIntent?.status

  if (finalStatus === 'succeeded') return { outcome: 'succeeded' }
  if (finalStatus === 'processing') return { outcome: 'processing' }

  return { outcome: 'failed' }
}
