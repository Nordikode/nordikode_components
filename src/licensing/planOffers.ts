/**
 * Plan-/tilbudskontrakten fra core (Prissystem 2.0, SIGN-1112/1114) slik
 * alle flatene leser den (SIGN-1790): firmaappen, app-core sin utsjekk og
 * Sign-innstillingene. Beløp er heltall i minste enhet i `currency`, ekskl.
 * mva; prosenter er tall. Klientene viser, de regner aldri — hver linje i en
 * forhåndsvisning kommer ferdig fra licensing sin `Quote`.
 */
export type NkPricingModel = 'flat' | 'per_seat' | 'included_seats'

export type NkPaymentTerms = 'card' | 'invoice'

export interface NkPlanCatalogApp {
  appId: string
  appKey: string
  name: string
}

export interface NkPlanOfferQuote {
  currency: string
  effectiveMonthlyMinor: number
  totalMinor: number
  subtotalMinor?: number
}

export interface NkPlanOffer {
  offerId: string
  billingMonths: number
  cadenceAdjustmentPercent: number
  commitmentMonths: number
  commitmentAdjustmentPercent: number
  commitmentEndPolicy: string
  isDefault: boolean
  quote: NkPlanOfferQuote
}

export interface NkCatalogPlan {
  id: string
  key: string
  name: string
  description?: string | null
  pricingModel: NkPricingModel
  includedSeats: number | null
  currency: string
  baseAmountMinor: number
  seatAmountMinor: number | null
  seats: number
  monthlyListMinor: number
  defaultOfferId: string
  /** Kan firmaet starte planens prøveperiode nå (SIGN-1117). Katalogen bærer feltet, utsjekken trenger det ikke. */
  trialAvailable?: boolean
  trialDays?: number | null
  apps: NkPlanCatalogApp[]
  offers: NkPlanOffer[]
}

export interface NkQuoteCadence {
  months: number
  adjustmentPercent: number
  periodListMinor: number
  adjustmentMinor: number
  amountMinor: number
}

export interface NkQuoteCommitment {
  months: number
  adjustmentPercent: number
  endPolicy: string
  adjustmentMinor: number
  amountMinor: number
}

/** Licensing sin `Quote`: alle beløp for hele betalingsperioden, ferdig regnet. */
export interface NkQuote {
  pricingModel: NkPricingModel
  includedSeats: number | null
  seats: number
  billableSeats: number
  offerId: string
  currency: string
  market: {
    currency: string
    baseAmountMinor: number
    seatAmountMinor: number | null
    monthlyListMinor: number
  }
  /** Grunnbeløpet for hele betalingsperioden, før justeringer og rabatter (SIGN-1117). */
  basePeriodMinor: number
  /** Brukerbeløpet for hele betalingsperioden, før justeringer og rabatter (SIGN-1117). */
  seatsPeriodMinor: number
  cadence: NkQuoteCadence
  commitment: NkQuoteCommitment
  subtotalMinor: number
  discounts: {
    tenantPercent: number
    tenantMinor: number
    couponMinor: number
    totalMinor: number
  }
  discountedSubtotalMinor: number
  vat: {
    mode: string
    rate: number
    amountMinor: number
  }
  totalMinor: number
  effectiveMonthlyMinor: number
}

/** Svaret fra forhåndsvisning, kjøp og prøvekonvertering (`LicensingPlanCheckoutQuote`). */
export interface NkPlanCheckoutQuote {
  plan: { id: string; key: string; name: string; pricingModel: NkPricingModel; includedSeats: number | null }
  offer: {
    offerId: string
    billingMonths: number
    cadenceAdjustmentPercent: number
    commitmentMonths: number
    commitmentAdjustmentPercent: number
    commitmentEndPolicy: string
  }
  quote: NkQuote
  seats: number
  currency: string
  subtotalMinor: number
  discountMinor: number
  vatRate: number
  vatMinor: number
  totalMinor: number
  giftCardMinor: number
  amountDueMinor: number
  paymentTerms: NkPaymentTerms
  invoiceDueDays: number | null
  commitmentEndsAt: string | null
  nextBillingAt: string | null
  paymentId: string | null
  subscriptionId: string | null
  clientSecret: string | null
  /** payment = PaymentIntent for beløpet, setup = kortet lagres for senere trekk (SIGN-1775), null = ferdig uten kort. */
  mode?: 'payment' | 'setup' | null
  publishableKey: string | null
  completed: boolean | null
  invoiceId: string | null
}

/**
 * Forhåndsvisningen av en endring (`LicensingPlanChangePreview`, SIGN-1117):
 * hva som belastes nå, når endringen gjelder, og neste periodes pristilbud.
 */
export interface NkPlanChangePreview {
  requiresPayment: boolean
  scheduled: boolean
  effectiveAt: string | null
  /** Proratert differanse for resten av perioden, eks. mva; 0 når ingenting belastes nå. */
  amountMinor: number
  vatMinor: number
  /** Det som belastes nå, inkl. mva. */
  totalMinor: number
  currency: string
  quote: NkQuote
  seats: number | null
  planId: string | null
  offerId: string | null
  upgrade: boolean | null
  commitmentEndsAt: string | null
  nextBillingAt: string | null
}

/** Ett valg i frekvens- eller bindingsveksleren, avledet av planens tilbud. */
export interface NkOfferChoice {
  months: number
  adjustmentPercent: number
  available: boolean
  /** Effektiv månedspris for kombinasjonen med det andre valget; null når den ikke selges. */
  effectiveMonthlyMinor: number | null
}

const uniqueMonths = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b)

/** Frekvensene planen tilbyr, gitt valgt bindingstid. */
export const cadenceChoices = (offers: NkPlanOffer[], commitmentMonths: number): NkOfferChoice[] =>
  uniqueMonths(offers.map((offer) => offer.billingMonths)).map((months) => {
    const match = offers.find((offer) => offer.billingMonths === months && offer.commitmentMonths === commitmentMonths)
    const any = offers.find((offer) => offer.billingMonths === months)

    return {
      months,
      adjustmentPercent: (match ?? any)?.cadenceAdjustmentPercent ?? 0,
      available: match !== undefined,
      effectiveMonthlyMinor: match?.quote.effectiveMonthlyMinor ?? null,
    }
  })

/** Bindingstidene planen tilbyr, gitt valgt frekvens. */
export const commitmentChoices = (offers: NkPlanOffer[], billingMonths: number): NkOfferChoice[] =>
  uniqueMonths(offers.map((offer) => offer.commitmentMonths)).map((months) => {
    const match = offers.find((offer) => offer.commitmentMonths === months && offer.billingMonths === billingMonths)
    const any = offers.find((offer) => offer.commitmentMonths === months)

    return {
      months,
      adjustmentPercent: (match ?? any)?.commitmentAdjustmentPercent ?? 0,
      available: match !== undefined,
      effectiveMonthlyMinor: match?.quote.effectiveMonthlyMinor ?? null,
    }
  })

export const findOffer = (offers: NkPlanOffer[], billingMonths: number, commitmentMonths: number): NkPlanOffer | null =>
  offers.find((offer) => offer.billingMonths === billingMonths && offer.commitmentMonths === commitmentMonths) ?? null

export const defaultOffer = (plan: Pick<NkCatalogPlan, 'offers' | 'defaultOfferId'>): NkPlanOffer | null =>
  plan.offers.find((offer) => offer.offerId === plan.defaultOfferId)
  ?? plan.offers.find((offer) => offer.isDefault)
  ?? plan.offers[0]
  ?? null

/** Startverdien for brukertelleren: de inkluderte brukerne, ellers 1. */
export const initialSeats = (plan: Pick<NkCatalogPlan, 'pricingModel' | 'includedSeats'>): number =>
  plan.pricingModel === 'included_seats' && plan.includedSeats !== null && plan.includedSeats > 0 ? plan.includedSeats : 1

/**
 * Nærmeste tilbud på en annen plan når brukeren bytter: samme frekvens og
 * binding når planen selger kombinasjonen, ellers planens standardtilbud.
 */
export const matchingOffer = (
  plan: Pick<NkCatalogPlan, 'offers' | 'defaultOfferId'>,
  billingMonths: number | null,
  commitmentMonths: number | null,
): NkPlanOffer | null =>
  (billingMonths !== null && commitmentMonths !== null ? findOffer(plan.offers, billingMonths, commitmentMonths) : null)
  ?? defaultOffer(plan)

/**
 * Planene en app kan kjøpes gjennom: de som inneholder appen og har minst
 * ett tilbud i markedet. Aldri en reserve til planer uten appen — et firma
 * som åpner utsjekken fra Time skal ikke få kjøpe en plan uten Time
 * (SIGN-1322). Tom liste betyr at appen ikke selges her.
 */
export const plansForApp = <T extends { apps: Array<{ appKey: string }>; offers: unknown[] }>(plans: T[], appKey: string): T[] =>
  plans.filter((plan) => plan.offers.length > 0 && plan.apps.some((app) => app.appKey === appKey))

/** Det neste tilbudet når brukeren velger en frekvens som ikke selges med dagens binding. */
export const offerForCadence = (offers: NkPlanOffer[], months: number, commitmentMonths: number | null): NkPlanOffer | null =>
  (commitmentMonths !== null ? findOffer(offers, months, commitmentMonths) : null)
  ?? offers.find((entry) => entry.billingMonths === months)
  ?? null

/** Det neste tilbudet når brukeren velger en binding som ikke selges med dagens frekvens. */
export const offerForCommitment = (offers: NkPlanOffer[], months: number, billingMonths: number | null): NkPlanOffer | null =>
  (billingMonths !== null ? findOffer(offers, billingMonths, months) : null)
  ?? offers.find((entry) => entry.commitmentMonths === months)
  ?? null
