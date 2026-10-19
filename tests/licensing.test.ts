import { describe, expect, it, vi } from 'vitest'

import { createReloadPoller, readStripeReturn, stripStripeParams } from '../src/licensing/checkoutReturn'
import {
  cadenceChoices,
  commitmentChoices,
  defaultOffer,
  findOffer,
  initialSeats,
  matchingOffer,
  plansForApp,
  type NkCatalogPlan,
  type NkPlanChangePreview,
  type NkPlanCheckoutQuote,
  type NkPlanOffer,
} from '../src/licensing/planOffers'
import { changePreviewLines, changePreviewTerms, quoteLines, type NkQuoteLineTexts } from '../src/licensing/quoteLines'
import { canCancelSubscription, cancelBlocked, hasUnlimitedSeats, trialDaysLeft } from '../src/licensing/subscription'

// Hjelperne bak abonnementsflatene (SIGN-1790). Det som voktes: valgene
// avledes av planens tilbud uten å regne, linjene i sammendraget er verdier
// fra licensing, og Stripe-returen tolkes likt overalt.

const offer = (months: number, commitment: number, monthly = 149000): NkPlanOffer => ({
  offerId: `c${months}:t${commitment}`,
  billingMonths: months,
  cadenceAdjustmentPercent: months === 1 ? 0 : -16.67,
  commitmentMonths: commitment,
  commitmentAdjustmentPercent: commitment === 0 ? 0 : -10,
  commitmentEndPolicy: 'renew_same',
  isDefault: months === 1 && commitment === 12,
  quote: { currency: 'SEK', effectiveMonthlyMinor: monthly, totalMinor: monthly * months, subtotalMinor: monthly * months },
})

const plan: NkCatalogPlan = {
  id: 'plan-sign',
  key: 'sign',
  name: 'Sign',
  description: null,
  pricingModel: 'included_seats',
  includedSeats: 1,
  currency: 'SEK',
  baseAmountMinor: 189000,
  seatAmountMinor: 29900,
  seats: 1,
  monthlyListMinor: 189000,
  defaultOfferId: 'c1:t12',
  apps: [{ appId: 'app-sign', appKey: 'sign', name: 'Sign' }],
  // Månedlig uten binding selges ikke: bare 12 mnd med månedlig, og 12 mnd årlig.
  offers: [offer(1, 12), offer(12, 12, 125000)],
}

describe('tilbudsvalg', () => {
  it('finner standardtilbudet via defaultOfferId, så isDefault, så det første', () => {
    expect(defaultOffer(plan)?.offerId).toBe('c1:t12')
    expect(defaultOffer({ ...plan, defaultOfferId: 'finnes-ikke' })?.offerId).toBe('c1:t12')
    expect(defaultOffer({ offers: [offer(12, 0)], defaultOfferId: '' })?.offerId).toBe('c12:t0')
    expect(defaultOffer({ offers: [], defaultOfferId: '' })).toBeNull()
  })

  it('merker kombinasjoner planen ikke selger som utilgjengelige, med månedsprisen fra tilbudet', () => {
    const cadences = cadenceChoices(plan.offers, 12)
    expect(cadences.map((choice) => [choice.months, choice.available, choice.effectiveMonthlyMinor])).toEqual([
      [1, true, 149000],
      [12, true, 125000],
    ])

    const commitments = commitmentChoices([...plan.offers, offer(12, 0)], 1)
    expect(commitments.map((choice) => [choice.months, choice.available])).toEqual([
      [0, false],
      [12, true],
    ])
  })

  it('finner tilbudet for en kombinasjon og nærmeste tilbud på en annen plan', () => {
    expect(findOffer(plan.offers, 12, 12)?.offerId).toBe('c12:t12')
    expect(findOffer(plan.offers, 3, 12)).toBeNull()
    expect(matchingOffer(plan, 12, 12)?.offerId).toBe('c12:t12')
    expect(matchingOffer(plan, 3, 0)?.offerId).toBe('c1:t12')
  })

  it('starter brukertelleren på de inkluderte brukerne, ellers 1', () => {
    expect(initialSeats(plan)).toBe(1)
    expect(initialSeats({ pricingModel: 'included_seats', includedSeats: 3 })).toBe(3)
    expect(initialSeats({ pricingModel: 'per_seat', includedSeats: null })).toBe(1)
  })

  it('selger bare planer som inneholder appen og har tilbud (SIGN-1322)', () => {
    const time = { ...plan, id: 'plan-time', apps: [{ appId: 'app-time', appKey: 'time', name: 'Time' }] }
    const empty = { ...plan, id: 'plan-empty', offers: [] }
    expect(plansForApp([plan, time, empty], 'sign').map((entry) => entry.id)).toEqual(['plan-sign'])
    expect(plansForApp([time], 'sign')).toEqual([])
  })
})

const texts: NkQuoteLineTexts = {
  money: (amountMinor) => `${amountMinor / 100} kr`,
  percent: (value) => (value > 0 ? `+${value}` : String(value)),
  lineBase: 'Planpris',
  linePerSeat: (seats) => `${seats} brukere`,
  lineExtraSeats: (seats) => `${seats} ekstra brukere`,
  linePeriod: (months) => `Periode, ${months} mnd`,
  lineCadence: (percent) => `Frekvens (${percent} %)`,
  lineCommitment: (percent) => `Binding (${percent} %)`,
  discount: 'Rabatt',
  vat: (rate) => `Mva (${rate} %)`,
  giftCard: 'Gavekort',
  total: 'Totalt',
  amountDue: 'Å betale nå',
}

const checkout: NkPlanCheckoutQuote = {
  plan: { id: 'plan-sign', key: 'sign', name: 'Sign', pricingModel: 'included_seats', includedSeats: 1 },
  offer: { offerId: 'c12:t12', billingMonths: 12, cadenceAdjustmentPercent: -16.67, commitmentMonths: 12, commitmentAdjustmentPercent: 0, commitmentEndPolicy: 'renew_same' },
  quote: {
    pricingModel: 'included_seats',
    includedSeats: 1,
    seats: 3,
    billableSeats: 2,
    offerId: 'c12:t12',
    currency: 'NOK',
    market: { currency: 'NOK', baseAmountMinor: 189000, seatAmountMinor: 29900, monthlyListMinor: 248800 },
    basePeriodMinor: 2268000,
    seatsPeriodMinor: 717600,
    cadence: { months: 12, adjustmentPercent: -16.67, periodListMinor: 2985600, adjustmentMinor: -497700, amountMinor: 2487900 },
    commitment: { months: 12, adjustmentPercent: 0, endPolicy: 'renew_same', adjustmentMinor: 0, amountMinor: 2487900 },
    subtotalMinor: 2487900,
    discounts: { tenantPercent: 0, tenantMinor: 0, couponMinor: 50000, totalMinor: 50000 },
    discountedSubtotalMinor: 2437900,
    vat: { mode: 'domestic', rate: 25, amountMinor: 609475 },
    totalMinor: 3047375,
    effectiveMonthlyMinor: 203158,
  },
  seats: 3,
  currency: 'NOK',
  subtotalMinor: 2487900,
  discountMinor: 50000,
  vatRate: 25,
  vatMinor: 609475,
  totalMinor: 3047375,
  giftCardMinor: 100000,
  amountDueMinor: 2947375,
  paymentTerms: 'card',
  invoiceDueDays: null,
  commitmentEndsAt: '2027-10-19',
  nextBillingAt: '2027-10-19',
  paymentId: null,
  subscriptionId: null,
  clientSecret: null,
  publishableKey: null,
  completed: null,
  invoiceId: null,
}

describe('prissammendraget', () => {
  it('viser hver linje som en verdi fra licensing — ingenting regnes', () => {
    const lines = quoteLines(checkout, texts)
    expect(lines.map((line) => [line.key, line.label, line.amount])).toEqual([
      ['base', 'Planpris', '22680 kr'],
      ['extra', '2 ekstra brukere', '7176 kr'],
      ['period', 'Periode, 12 mnd', '29856 kr'],
      ['cadence', 'Frekvens (-16.67 %)', '-4977 kr'],
      ['discount', 'Rabatt', '-500 kr'],
      ['vat', 'Mva (25 %)', '6094.75 kr'],
      ['gift_card', 'Gavekort', '-1000 kr'],
      ['total', 'Totalt', '30473.75 kr'],
      ['due', 'Å betale nå', '29473.75 kr'],
    ])
    expect(lines.find((line) => line.key === 'total')).toMatchObject({ emphasis: true, divider: true })
  })

  it('viser per bruker-planer som én brukerlinje', () => {
    const perSeat = { ...checkout, quote: { ...checkout.quote, pricingModel: 'per_seat' as const } }
    expect(quoteLines(perSeat, texts)[0]).toMatchObject({ key: 'seats', label: '3 brukere', amount: '7176 kr' })
  })

  it('viser en endring som det som belastes nå og neste periode, med vilkårene', () => {
    const preview: NkPlanChangePreview = {
      requiresPayment: true,
      scheduled: false,
      effectiveAt: '2026-10-19',
      amountMinor: 59800,
      vatMinor: 14950,
      totalMinor: 74750,
      currency: 'NOK',
      quote: checkout.quote,
      seats: 3,
      planId: null,
      offerId: null,
      upgrade: null,
      commitmentEndsAt: '2027-10-19',
      nextBillingAt: null,
    }
    const lines = changePreviewLines(preview, { ...texts, lineProrated: 'Differanse', lineNextPeriod: (months) => `Neste ${months} mnd` })
    expect(lines.map((line) => line.key)).toEqual(['prorated', 'vat', 'due', 'next_period'])
    expect(lines[3]).toMatchObject({ label: 'Neste 12 mnd', amount: '30473.75 kr' })

    const terms = changePreviewTerms(
      { ...preview, totalMinor: 0, scheduled: true },
      {
        date: (iso) => iso,
        nothingDue: 'Ingenting nå.',
        effectiveNow: 'Nå.',
        effectiveFrom: (date) => `Fra ${date}.`,
        commitmentEnd: (date) => `Bundet til ${date}.`,
        nextBilling: (date) => `Neste ${date}.`,
      },
    )
    expect(terms).toEqual(['Ingenting nå.', 'Fra 2026-10-19.', 'Bundet til 2027-10-19.'])
  })
})

describe('abonnementet', () => {
  it('teller hele dager igjen av prøven, med i dag som 1 og utløpt som 0', () => {
    const now = new Date('2026-10-19T10:00:00Z')
    expect(trialDaysLeft('2026-10-22T10:00:00Z', now)).toBe(3)
    expect(trialDaysLeft('2026-10-19T12:00:00Z', now)).toBe(1)
    expect(trialDaysLeft('2026-10-01T00:00:00Z', now)).toBe(0)
    expect(trialDaysLeft('ikke en dato', now)).toBeNull()
    expect(trialDaysLeft(null, now)).toBeNull()
  })

  it('gir ubegrensede seter i prøveperioden og for kostnadsfrie abonnementer', () => {
    expect(hasUnlimitedSeats({ status: 'trialing', isComplimentary: false })).toBe(true)
    expect(hasUnlimitedSeats({ status: 'active', isComplimentary: true })).toBe(true)
    expect(hasUnlimitedSeats({ status: 'active', isComplimentary: false })).toBe(false)
  })

  it('tillater oppsigelse bare på levende, betalte abonnementer uten planlagt stopp', () => {
    const base = { isComplimentary: false, cancelAtPeriodEnd: false, cancelAt: null, status: 'active' }
    expect(canCancelSubscription(base)).toBe(true)
    expect(canCancelSubscription({ ...base, cancelAt: '2026-12-01' })).toBe(false)
    expect(canCancelSubscription({ ...base, isComplimentary: true })).toBe(false)
    expect(canCancelSubscription({ ...base, status: 'incomplete' })).toBe(false)
  })

  it('sperrer oppsigelsen når bindingen går lenger enn perioden', () => {
    expect(cancelBlocked({ cancelableFrom: '2027-06-01', status: 'active', currentPeriodEnd: '2026-11-19' })).toBe(true)
    expect(cancelBlocked({ cancelableFrom: '2026-11-19', status: 'active', currentPeriodEnd: '2026-11-19' })).toBe(false)
    expect(cancelBlocked({ cancelableFrom: '2027-06-01', status: 'trialing', currentPeriodEnd: '2026-11-19' })).toBe(false)
  })
})

describe('Stripe-retur', () => {
  it('leser utfallet bare når både markøren og redirect_status finnes', () => {
    expect(readStripeReturn('?checkout=return&redirect_status=succeeded')).toBe('succeeded')
    expect(readStripeReturn('?checkout=return&redirect_status=processing')).toBe('processing')
    expect(readStripeReturn('?checkout=return&redirect_status=requires_payment_method')).toBe('failed')
    expect(readStripeReturn('?redirect_status=succeeded')).toBeNull()
    expect(readStripeReturn('?checkout=return')).toBeNull()
  })

  it('stripper Stripe-nøklene og beholder resten av adressen', () => {
    expect(stripStripeParams('https://sign.nordikode.test/settings/subscription?checkout=return&payment_intent=pi_1&redirect_status=succeeded&tab=x#top'))
      .toBe('/settings/subscription?tab=x#top')
  })

  it('poller til fingeravtrykket endrer seg, og stopper ved taket', async () => {
    vi.useFakeTimers()
    let state = 'before'
    const reload = vi.fn(async () => {
      if (reload.mock.calls.length === 2) state = 'after'
    })
    const poller = createReloadPoller({ reload, fingerprint: () => state, delays: [10, 10, 10, 10] })

    poller.start()
    await vi.advanceTimersByTimeAsync(10)
    expect(reload).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10)
    expect(reload).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(50)
    expect(reload).toHaveBeenCalledTimes(2)

    const stubborn = vi.fn(async () => undefined)
    createReloadPoller({ reload: stubborn, fingerprint: () => 'same', delays: [10, 10] }).start()
    await vi.advanceTimersByTimeAsync(100)
    expect(stubborn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
