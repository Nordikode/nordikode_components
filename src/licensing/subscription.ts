import type { NkStatusChipTone } from '../types/NkStatusChipTone'
import type { NkPaymentTerms, NkPricingModel } from './planOffers'

/**
 * Abonnementet slik abonnementskortet viser det (SIGN-1790): vilkårene
 * licensing lagret ved kjøp — plan, brukere, betalingsfrekvens, bindingstid
 * og bindingsslutt, neste faktura, betalingsmåte — pluss ventende endring og
 * seter. Samme felter som `LicensingSubscription` i core; beløp er minor
 * units i `currency`.
 */
export interface NkSubscriptionSeat {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
}

export interface NkSubscriptionPendingChange {
  type: string
  planId: string | null
  offerId: string
  billingMonths: number | null
  commitmentMonths: number | null
  effectiveAt: string | null
}

export interface NkSubscriptionSummary {
  id: string
  appName: string
  status: string
  currency: string
  paidSeatCount: number
  cancelAtPeriodEnd: boolean
  isComplimentary: boolean
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  planId: string | null
  planName: string | null
  pricingModel: NkPricingModel | null
  planIncludedSeats: number | null
  apps: { appKey: string; appName: string }[]
  seatsCount: number | null
  baseAmountMinor: number | null
  seatAmountMinor: number | null
  monthlyListMinor: number | null
  billingMonths: number | null
  commitmentMonths: number | null
  commitmentEndsAt: string | null
  commitmentEndPolicy: string | null
  nextBillingAt: string | null
  paymentTerms: NkPaymentTerms | null
  cancelAt: string | null
  cancelableFrom: string | null
  pendingChange: NkSubscriptionPendingChange | null
  seats: NkSubscriptionSeat[]
}

/** Abonnementsstatus → semantisk tone (én farge, én jobb). */
export const subscriptionStatusTone: Record<string, NkStatusChipTone> = {
  trialing: 'info',
  active: 'success',
  past_due: 'error',
  suspended: 'warning',
  incomplete: 'neutral',
}

/** Statusene som er et levende abonnement — resten er historikk. */
export const LIVE_SUBSCRIPTION_STATUSES = ['incomplete', 'trialing', 'active', 'past_due', 'suspended'] as const

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Hele dager igjen av prøveperioden, rundet opp så «i dag» teller som 1 og
 * en utløpt periode gir 0. Ugyldig dato gir null.
 */
export const trialDaysLeft = (endsAt: string | null | undefined, now: Date = new Date()): number | null => {
  if (!endsAt) return null

  const end = new Date(endsAt).getTime()

  if (Number.isNaN(end)) return null

  return Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS))
}

/**
 * Prøveperioder og kostnadsfrie abonnementer har ingen betalt pool —
 * firmaet kan prøve med så mange brukere det vil.
 */
export const hasUnlimitedSeats = (subscription: Pick<NkSubscriptionSummary, 'status' | 'isComplimentary'>): boolean =>
  subscription.status === 'trialing' || subscription.isComplimentary

export const canCancelSubscription = (
  subscription: Pick<NkSubscriptionSummary, 'isComplimentary' | 'cancelAtPeriodEnd' | 'cancelAt' | 'status'>,
): boolean =>
  !subscription.isComplimentary
  && !subscription.cancelAtPeriodEnd
  && subscription.cancelAt === null
  && ['trialing', 'active', 'past_due'].includes(subscription.status)

/** Bundet: den tidligste oppsigelsesdatoen ligger etter inneværende periode. */
export const cancelBlocked = (
  subscription: Pick<NkSubscriptionSummary, 'cancelableFrom' | 'status' | 'currentPeriodEnd'>,
): boolean => {
  if (!subscription.cancelableFrom || subscription.status === 'trialing') return false

  const from = new Date(subscription.cancelableFrom).getTime()
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : Number.NaN

  return !Number.isNaN(from) && !Number.isNaN(periodEnd) && from > periodEnd
}

/** Handlingene på kortet som krever at abonnementet er betalt og i drift. */
export const canChangeTerms = (subscription: Pick<NkSubscriptionSummary, 'planId' | 'isComplimentary' | 'status'>): boolean =>
  subscription.planId !== null && !subscription.isComplimentary && ['active', 'past_due'].includes(subscription.status)
